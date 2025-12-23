import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';
import { productSearchSchema } from '@/lib/schemas';
import { searchProducts } from '@/lib/services/product.service';

export async function POST(request: NextRequest) {
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

    const validation = productSearchSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validation.error.errors.map((e) => e.message).join(', '),
        400
      );
    }

    const { products, total } = await searchProducts({
      ...validation.data,
      priceCategory: authResult.priceCategory,
    });

    const totalPages = Math.ceil(total / validation.data.pageSize);

    return successResponse({
      products,
      pagination: {
        total,
        page: validation.data.page,
        pageSize: validation.data.pageSize,
        totalPages,
      },
    });
  } catch (error) {
    console.error('[Products] Search error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur lors de la recherche', 500);
  }
}
