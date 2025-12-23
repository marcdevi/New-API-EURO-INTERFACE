import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';
import { getProductById } from '@/lib/services/product.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, { requireConfirmed: true });

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  try {
    const productId = parseInt(params.id, 10);

    if (isNaN(productId) || productId <= 0) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'ID produit invalide', 400);
    }

    const product = await getProductById(productId, authResult.priceCategory);

    if (!product) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Produit non trouvé', 404);
    }

    return successResponse(product);
  } catch (error) {
    console.error('[Products] GetById error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}
