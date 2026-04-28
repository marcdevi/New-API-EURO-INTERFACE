import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';
import { shopifyImportSchema } from '@/lib/schemas';
import { securityLog, getClientIp } from '@/lib/security';
import { checkRateLimit } from '@/lib/ratelimit';
import { ensureFreshToken, ShopifyTokenError } from '@/lib/shopify/token';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  const rateLimitResult = await checkRateLimit(`shopify:import:${ip}`);
  if (!rateLimitResult.success) {
    securityLog('RATE_LIMITED', { ip, route: '/api/shopify/import' });
    return errorResponse(ErrorCodes.RATE_LIMITED, 'Trop de requêtes, réessayez plus tard', 429);
  }

  const authResult = await requireAuth(request, { requireConfirmed: true });

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    console.error('[Shopify] API_BASE_URL not configured');
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'API externe non configurée', 500);
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Corps de requête invalide', 400);
    }

    const validation = shopifyImportSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validation.error.errors.map((e) => e.message).join(', '),
        400
      );
    }

    let accessToken: string;
    let shopDomain: string;
    try {
      const tokenResult = await ensureFreshToken(authResult.user.id);
      accessToken = tokenResult.accessToken;
      shopDomain = tokenResult.fullDomain;
    } catch (tokenError: unknown) {
      if (tokenError instanceof ShopifyTokenError) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, tokenError.message, 400);
      }
      console.error('[Shopify] Token error:', tokenError);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur de configuration Shopify', 500);
    }

    const adminClient = createSupabaseAdminClient() as any;

    const selectedProducts = validation.data.products;
    const newProductIds = selectedProducts.map((p: { id: number; price: number }) => p.id);

    const upstreamRes = await fetch(`${baseUrl}/api/bulk-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopDomain,
        accessToken,
        selectedProducts,
        userId: authResult.user.id,
      }),
    });

    const upstreamData = await upstreamRes.json().catch(() => null);

    if (!upstreamRes.ok) {
      console.error('[Shopify] Upstream bulk-import error:', upstreamData);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        upstreamData?.error || `Erreur API externe (${upstreamRes.status})`,
        502
      );
    }

    const listings = newProductIds.map((productId) => ({
      user_id: authResult.user.id,
      local_product_id: productId,
      pushed_at: new Date().toISOString(),
    }));

    const { error: listingsError } = await adminClient
      .from('shopify_listings')
      .upsert(listings, { onConflict: 'user_id,local_product_id' });

    if (listingsError) {
      console.error('[Shopify] Listings save error:', listingsError);
    }

    const { error: cartError } = await adminClient
      .from('panier_dropshipping')
      .delete()
      .eq('user_id', authResult.user.id)
      .in('product_id', newProductIds);

    if (cartError) {
      console.error('[Shopify] Cart cleanup error:', cartError);
    }

    securityLog('SHOPIFY_IMPORT_QUEUED', {
      userId: authResult.user.id,
      ip,
      details: { queued: newProductIds.length, skipped: 0, jobId: upstreamData?.jobId },
    });

    return successResponse({
      message: `${newProductIds.length} produit(s) envoyé(s) à la file d'import`,
      queued: newProductIds.length,
      skipped: 0,
      jobId: upstreamData?.jobId,
      status: upstreamData?.status || 'queued',
    });
  } catch (error) {
    console.error('[Shopify] Import unexpected error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}
