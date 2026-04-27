import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { encryptToken, decryptToken } from '@/lib/security';

const TOKEN_LIFETIME_MS = 23 * 60 * 60 * 1000; // 23h (marge de sécurité sur les 24-48h Shopify)

export interface FreshTokenResult {
  accessToken: string;
  shopDomain: string;
  fullDomain: string;
}

/**
 * Ensures a valid (non-expired) Shopify access token is available for the given user.
 *
 * - If the current token is still valid → returns it.
 * - If expired AND client_id + client_secret are stored → exchanges for a new token via Shopify OAuth.
 * - If no credentials available → throws with a user-friendly message.
 */
export async function ensureFreshToken(userId: string): Promise<FreshTokenResult> {
  const adminClient = createSupabaseAdminClient() as any;

  const { data: config, error } = await adminClient
    .from('shopify_config')
    .select('shop_domain, access_token, client_id, client_secret_encrypted, auth_method, token_expires_at')
    .eq('id', userId)
    .single();

  if (error || !config) {
    throw new ShopifyTokenError('Configuration Shopify non trouvée. Veuillez configurer votre boutique.');
  }

  if (!config.shop_domain) {
    throw new ShopifyTokenError('Domaine Shopify non configuré.');
  }

  const fullDomain = config.shop_domain.includes('.')
    ? config.shop_domain
    : `${config.shop_domain}.myshopify.com`;

  // Check if current token is still valid
  const now = new Date();
  const expiresAt = config.token_expires_at ? new Date(config.token_expires_at) : null;
  const tokenIsValid = config.access_token && (!expiresAt || expiresAt > now);

  if (tokenIsValid) {
    try {
      const accessToken = decryptToken(config.access_token);
      return { accessToken, shopDomain: config.shop_domain, fullDomain };
    } catch {
      console.error('[ensureFreshToken] Failed to decrypt existing token, attempting refresh');
    }
  }

  // Token expired or missing — attempt refresh via OAuth client credentials
  if (!config.client_id || !config.client_secret_encrypted) {
    throw new ShopifyTokenError(
      'Votre token Shopify a expiré. Veuillez reconfigurer votre connexion dans les paramètres.'
    );
  }

  let clientSecret: string;
  try {
    clientSecret = decryptToken(config.client_secret_encrypted);
  } catch {
    throw new ShopifyTokenError('Erreur de déchiffrement des credentials OAuth. Veuillez les resaisir.');
  }

  // Exchange client credentials for a new access token
  const newToken = await exchangeClientCredentials(fullDomain, config.client_id, clientSecret);

  // Persist new token
  const encryptedToken = encryptToken(newToken);
  const newExpiresAt = new Date(Date.now() + TOKEN_LIFETIME_MS).toISOString();

  const { error: updateError } = await adminClient
    .from('shopify_config')
    .update({
      access_token: encryptedToken,
      token_expires_at: newExpiresAt,
    })
    .eq('id', userId);

  if (updateError) {
    console.error('[ensureFreshToken] Failed to persist refreshed token:', updateError);
    // Still return the token — it's valid even if we couldn't persist it
  }

  console.log(`[ensureFreshToken] Token refreshed for user ${userId}, expires ${newExpiresAt}`);

  return { accessToken: newToken, shopDomain: config.shop_domain, fullDomain };
}

/**
 * Exchanges Shopify client credentials for a new access token.
 */
async function exchangeClientCredentials(
  fullDomain: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const url = `https://${fullDomain}/admin/oauth/access_token`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[exchangeClientCredentials] Shopify returned ${response.status}: ${body}`);
      throw new ShopifyTokenError(
        `Shopify a refusé le renouvellement du token (${response.status}). Vérifiez vos credentials.`
      );
    }

    const data = await response.json();
    if (!data.access_token) {
      throw new ShopifyTokenError('Réponse Shopify inattendue : pas de access_token');
    }

    return data.access_token;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof ShopifyTokenError) throw err;
    if ((err as Error).name === 'AbortError') {
      throw new ShopifyTokenError('Timeout : Shopify ne répond pas au renouvellement du token.');
    }
    throw new ShopifyTokenError(`Erreur réseau lors du renouvellement : ${(err as Error).message}`);
  }
}

export class ShopifyTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShopifyTokenError';
  }
}
