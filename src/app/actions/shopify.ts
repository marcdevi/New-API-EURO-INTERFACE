'use server';

import { SaveCredentialsInput, SaveCredentialsResult } from '@/types/shopify';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/security';

export async function saveShopifyConfigToDB(
  shopDomain: string
): Promise<SaveCredentialsResult> {
  if (!shopDomain) {
    return { success: false, error: 'Le domaine Shopify est requis' };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Utilisateur non authentifié' };
    }

    const { error } = await supabase
      .from('shopify_config')
      .upsert(
        { id: user.id, shop_domain: shopDomain } as any,
        { onConflict: 'id' }
      );

    if (error) {
      console.error('[saveShopifyConfigToDB] Supabase error:', error);
      return { success: false, error: `Erreur base de données: ${error.message}` };
    }

    console.log('[saveShopifyConfigToDB] Saved shop_domain:', shopDomain, 'for user:', user.id);
    return { success: true };
  } catch (err) {
    console.error('[saveShopifyConfigToDB] Unexpected error:', err);
    return { success: false, error: 'Erreur inattendue lors de la sauvegarde' };
  }
}

export async function saveOAuthCredentials(
  input: SaveCredentialsInput
): Promise<SaveCredentialsResult> {
  const { shop_domain, client_id, client_secret } = input;

  if (!shop_domain || !client_id || !client_secret) {
    return { success: false, error: 'Tous les champs sont requis' };
  }

  const baseUrl = process.env.API_BASE_URL;
  const secretKey = process.env.API_SECRET_KEY;

  if (!baseUrl || !secretKey) {
    return { success: false, error: 'Configuration API manquante' };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn('[saveOAuthCredentials] UNAUTHORIZED_ACCESS', {
        action: 'saveOAuthCredentials',
        reason: 'No valid session',
        shop_domain
      });
      return { success: false, error: 'Utilisateur non authentifié' };
    }

    // 1. Delegate token generation to the external API
    const externalRes = await fetch(`${baseUrl}/api/shopify/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({ shop_domain, client_id, client_secret }),
    });

    if (!externalRes.ok) {
      const body = await externalRes.json().catch(() => ({ error: 'Erreur inconnue' }));
      console.error('[saveOAuthCredentials] External API error:', body);
      return {
        success: false,
        error: body.error || `Erreur API externe (${externalRes.status}). Vérifiez vos credentials.`,
      };
    }

    // 2. Save credentials locally (encrypted) without doing the OAuth exchange here
    const adminClient = createSupabaseAdminClient() as any;

    const { error: saveError } = await adminClient.from('shopify_config').upsert({
      id: user.id,
      shop_domain,
      client_id,
      client_secret_encrypted: encryptToken(client_secret),
      auth_method: 'oauth',
    });

    if (saveError) {
      console.error('[saveOAuthCredentials] Supabase save error:', saveError);
      return { success: false, error: `Erreur lors de la sauvegarde locale : ${saveError.message}` };
    }

    console.log('[saveOAuthCredentials] OAuth configured for user:', user.id, 'domain:', shop_domain);
    return { success: true };
  } catch (error) {
    console.error('[saveOAuthCredentials] Unexpected error:', error);
    return { success: false, error: `Erreur inattendue : ${error instanceof Error ? error.message : 'Erreur inconnue'}` };
  }
}
