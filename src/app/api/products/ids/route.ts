import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';
import { productSearchSchema } from '@/lib/schemas';
import { searchProductIds } from '@/lib/services/product.service';

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

    // On réutilise le schéma existant pour garder les mêmes filtres (search/category/sort)
    // mais ici on renvoie uniquement les IDs.
    const validation = productSearchSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validation.error.errors.map((e) => e.message).join(', '),
        400
      );
    }

    const ids = await searchProductIds({
      ...validation.data,
      priceCategory: authResult.priceCategory,
    });

    return successResponse({ ids, count: ids.length });
  } catch (error) {
    console.error('[Products] Ids error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur lors de la récupération des IDs', 500);
  }
}
