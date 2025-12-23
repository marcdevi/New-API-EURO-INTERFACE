import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';
import { shopifyConfigSchema } from '@/lib/schemas';
import { encryptToken, securityLog, getClientIp } from '@/lib/security';
import { checkRateLimit } from '@/lib/ratelimit';
import type { ShopifyConfigDTO } from '@/types/api';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, { requireConfirmed: true });

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  try {
    const adminClient = createSupabaseAdminClient() as any;
    const { data, error } = await adminClient
      .from('shopify_config')
      .select('shop_domain, access_token, created_at')
      .eq('id', authResult.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[Shopify] Config GET error:', error);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur lors de la récupération', 500);
    }

    const config: ShopifyConfigDTO = {
      shopDomain: data?.shop_domain || null,
      configured: !!(data?.access_token),
      updatedAt: data?.created_at || new Date().toISOString(),
    };

    return successResponse(config);
  } catch (error) {
    console.error('[Shopify] Config GET unexpected error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  const rateLimitResult = await checkRateLimit(`shopify:config:${ip}`);
  if (!rateLimitResult.success) {
    securityLog('RATE_LIMITED', { ip, route: '/api/shopify/config' });
    return errorResponse(ErrorCodes.RATE_LIMITED, 'Trop de requêtes, réessayez plus tard', 429);
  }

  const authResult = await requireAuth(request, { requireConfirmed: true });

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Corps de requête invalide', 400);
    }

    const validation = shopifyConfigSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validation.error.errors.map((e) => e.message).join(', '),
        400
      );
    }

    const { shopDomain, accessToken } = validation.data;

    const fullDomain = shopDomain.includes('.') ? shopDomain : `${shopDomain}.myshopify.com`;
    const shopifyUrl = `https://${fullDomain}/admin/api/2024-01/shop.json`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const shopRes = await fetch(shopifyUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!shopRes.ok) {
        securityLog('SHOPIFY_VALIDATION_FAILED', {
          userId: authResult.user.id,
          ip,
          reason: `Shopify returned ${shopRes.status}`,
        });
        return errorResponse(
          ErrorCodes.SHOPIFY_ERROR,
          'Token ou domaine invalide (accès refusé par Shopify)',
          401
        );
      }

      const shopData = await shopRes.json();
      if (!shopData?.shop) {
        return errorResponse(ErrorCodes.SHOPIFY_ERROR, 'Réponse inattendue de Shopify', 500);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if ((fetchError as Error).name === 'AbortError') {
        return errorResponse(ErrorCodes.SHOPIFY_ERROR, 'Timeout: Shopify ne répond pas', 504);
      }
      console.error('[Shopify] Validation fetch error:', fetchError);
      return errorResponse(ErrorCodes.SHOPIFY_ERROR, 'Connexion impossible au domaine', 502);
    }

    const encryptedToken = encryptToken(accessToken);

    // NOTE: la BDD legacy utilise la colonne `access_token` (pas `access_token_encrypted`).
    // On y stocke quand même une valeur chiffrée (AES-256-GCM) pour ne jamais stocker le token en clair.
    const adminClient = createSupabaseAdminClient() as any;
    const { error } = await adminClient.from('shopify_config').upsert({
      id: authResult.user.id,
      shop_domain: shopDomain,
      access_token: encryptedToken,
    });

    if (error) {
      console.error('[Shopify] Config save error:', error);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur lors de la sauvegarde', 500);
    }

    securityLog('SHOPIFY_CONFIG_SAVED', {
      userId: authResult.user.id,
      ip,
    });

    return successResponse({ 
      message: 'Configuration Shopify enregistrée avec succès',
      shopDomain,
      configured: true,
    });
  } catch (error) {
    console.error('[Shopify] Config POST unexpected error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}
