import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';
import { getProductsByIds } from '@/lib/services/product.service';
import type { ShopifyListingDTO } from '@/types/api';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, { requireConfirmed: true });

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  try {
    const adminClient = createSupabaseAdminClient() as any;
    const { data, error } = await adminClient
      .from('shopify_listings')
      .select('*')
      .eq('user_id', authResult.user.id)
      .order('pushed_at', { ascending: false });

    if (error) {
      console.error('[Shopify] Listings GET error:', error);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur lors de la récupération', 500);
    }

    const productIds = (data || []).map((item: any) => item.local_product_id);

    if (productIds.length === 0) {
      return successResponse({ listings: [], count: 0 });
    }

    const products = await getProductsByIds(productIds, authResult.priceCategory);

    const listings: ShopifyListingDTO[] = (data || []).map((item: any) => {
      const product = products.find((p) => p.id === item.local_product_id);
      return {
        localProductId: item.local_product_id,
        shopifyProductId: item.shopify_product_id ?? item.shopify_product ?? item.product_shopify_id ?? null,
        shopifyVariantId: item.shopify_variant_id ?? item.shopify_variant ?? item.variant_shopify_id ?? null,
        pushedAt: item.pushed_at,
        product: product!,
      };
    }).filter((item: ShopifyListingDTO) => item.product);

    return successResponse({ listings, count: listings.length });
  } catch (error) {
    console.error('[Shopify] Listings GET unexpected error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}
