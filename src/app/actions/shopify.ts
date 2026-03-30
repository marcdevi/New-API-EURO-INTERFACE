'use server';

import { SaveCredentialsInput, SaveCredentialsResult } from '@/types/shopify';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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

    const baseUrl = process.env.API_BASE_URL;
    const secretKey = process.env.API_SECRET_KEY;

    console.log('[saveOAuthCredentials] Sending credentials for domain:', shop_domain);

    const res = await fetch(`${baseUrl}/api/shopify/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({ shop_domain, client_id, client_secret }),
    });

    console.log('[saveOAuthCredentials] Response:', {
      status: res.status,
      ok: res.ok,
      statusText: res.statusText
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erreur API' }));
      console.log('[saveOAuthCredentials] API returned error status:', res.status);

      // Build a user-friendly message, prioritising token_error details for 422
      let userMessage = err.error ?? `Erreur ${res.status}`;
      if (res.status === 422 && err.token_error) {
        // Common case: the Shopify shop does not exist or credentials are wrong
        userMessage = `Échec de la connexion Shopify : Shopify OAuth échoué (404)` //${err.token_error};
      }

      return { success: false, error: userMessage };
    }

    return { success: true };
  } catch (error) {
    console.error('[saveOAuthCredentials] Network error:', error);
    return { success: false, error: `Impossible de joindre l'API: ${error instanceof Error ? error.message : 'Erreur inconnue'}` };
  }
}
