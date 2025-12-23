import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';
import { cartAddSchema, cartRemoveSchema } from '@/lib/schemas';
import { getProductsByIds } from '@/lib/services/product.service';
import type { CartItemDTO } from '@/types/api';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, { requireConfirmed: true });

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  try {
    const adminClient = createSupabaseAdminClient() as any;
    const { data, error } = await adminClient
      .from('panier_dropshipping')
      .select('product_id, added_at')
      .eq('user_id', authResult.user.id)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('[Cart] GET error:', error);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur lors de la récupération du panier', 500);
    }

    const productIds = (data || []).map((item: { product_id: number }) => item.product_id);
    
    if (productIds.length === 0) {
      return successResponse({ items: [], count: 0 });
    }

    const products = await getProductsByIds(productIds, authResult.priceCategory);

    const items: CartItemDTO[] = (data || [])
      .map((item: { product_id: number; added_at?: string | null }) => {
        const product = products.find((p) => p.id === item.product_id);
        return {
          productId: item.product_id,
          product: product!,
          addedAt: item.added_at ?? new Date().toISOString(),
        };
      })
      .filter((item: CartItemDTO) => item.product);

    return successResponse({ items, count: items.length });
  } catch (error) {
    console.error('[Cart] GET unexpected error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}

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

    const validation = cartAddSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validation.error.errors.map((e) => e.message).join(', '),
        400
      );
    }

    const adminClient = createSupabaseAdminClient() as any;
    
    const nowIso = new Date().toISOString();
    const insertData = validation.data.productIds.map((productId) => ({
      user_id: authResult.user.id,
      product_id: productId,
      added_at: nowIso,
    }));

    const { error } = await adminClient
      .from('panier_dropshipping')
      .upsert(insertData, { onConflict: 'user_id,product_id' });

    if (error) {
      console.error('[Cart] POST error:', error);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur lors de l\'ajout au panier', 500);
    }

    return successResponse({ 
      message: `${validation.data.productIds.length} produit(s) ajouté(s) au panier` 
    });
  } catch (error) {
    console.error('[Cart] POST unexpected error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}

export async function DELETE(request: NextRequest) {
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

    const validation = cartRemoveSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validation.error.errors.map((e) => e.message).join(', '),
        400
      );
    }

    const adminClient = createSupabaseAdminClient() as any;
    
    const { error } = await adminClient
      .from('panier_dropshipping')
      .delete()
      .eq('user_id', authResult.user.id)
      .in('product_id', validation.data.productIds);

    if (error) {
      console.error('[Cart] DELETE error:', error);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur lors de la suppression', 500);
    }

    return successResponse({ 
      message: `${validation.data.productIds.length} produit(s) supprimé(s) du panier` 
    });
  } catch (error) {
    console.error('[Cart] DELETE unexpected error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}
