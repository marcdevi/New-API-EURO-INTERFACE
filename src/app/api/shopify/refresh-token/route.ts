import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/security';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, { requireConfirmed: true });

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  const baseUrl = process.env.API_BASE_URL;
  const secretKey = process.env.API_SECRET_KEY;

  if (!baseUrl || !secretKey) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Configuration API manquante', 500);
  }

  const adminClient = createSupabaseAdminClient() as any;
  const { data: config } = await adminClient
    .from('shopify_config')
    .select('shop_domain, auth_method, client_id, client_secret_encrypted')
    .eq('id', authResult.user.id)
    .single();

  if (!config?.shop_domain) {
    return errorResponse(ErrorCodes.NOT_FOUND, 'Configuration Shopify introuvable', 404);
  }

  if (config.auth_method !== 'oauth') {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Le renouvellement est disponible uniquement en mode OAuth', 400);
  }

  if (!config.client_id || !config.client_secret_encrypted) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Credentials OAuth introuvables, veuillez les resaisir', 400);
  }

  let clientSecret: string;
  try {
    clientSecret = decryptToken(config.client_secret_encrypted);
  } catch {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur de déchiffrement des credentials', 500);
  }

  try {
    const res = await fetch(`${baseUrl}/api/shopify/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        shop_domain: config.shop_domain,
        client_id: config.client_id,
        client_secret: clientSecret,
      }),
    });

    const text = await res.text();
    let data: { error?: string; success?: boolean; token_error?: string } = {};
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[refresh-token] Non-JSON response from external API:', text.substring(0, 200));
    }

    if (!res.ok) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, data.error || `Erreur API externe (${res.status})`, res.status as 400 | 500);
    }

    return successResponse({ message: 'Token Shopify renouvelé avec succès' });
  } catch (err) {
    console.error('[refresh-token] Proxy error:', err);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Impossible de contacter l\'API externe', 502);
  }
}
