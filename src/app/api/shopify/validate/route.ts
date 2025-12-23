import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';
import { shopifyConfigSchema } from '@/lib/schemas';
import { securityLog, getClientIp } from '@/lib/security';
import { checkRateLimit } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  const rateLimitResult = await checkRateLimit(`shopify:validate:${ip}`);
  if (!rateLimitResult.success) {
    securityLog('RATE_LIMITED', { ip, route: '/api/shopify/validate' });
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
        return successResponse({ valid: false, error: 'Token ou domaine invalide' });
      }

      const shopData = await shopRes.json();
      if (!shopData?.shop) {
        return successResponse({ valid: false, error: 'Réponse inattendue de Shopify' });
      }

      securityLog('SHOPIFY_VALIDATION_SUCCESS', {
        userId: authResult.user.id,
        ip,
      });

      return successResponse({ 
        valid: true, 
        shopName: shopData.shop.name,
        shopDomain: shopData.shop.domain,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if ((fetchError as Error).name === 'AbortError') {
        return successResponse({ valid: false, error: 'Timeout: Shopify ne répond pas' });
      }
      console.error('[Shopify] Validation fetch error:', fetchError);
      return successResponse({ valid: false, error: 'Connexion impossible au domaine' });
    }
  } catch (error) {
    console.error('[Shopify] Validate unexpected error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}
