import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';
import { ensureFreshToken, ShopifyTokenError } from '@/lib/shopify/token';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, { requireConfirmed: true });

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  try {
    const { accessToken, shopDomain } = await ensureFreshToken(authResult.user.id);

    return successResponse({
      shopDomain,
      accessToken,
    });
  } catch (err) {
    if (err instanceof ShopifyTokenError) {
      return errorResponse(ErrorCodes.NOT_FOUND, err.message, 404);
    }
    console.error('[Shopify] Credentials GET error:', err);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}
