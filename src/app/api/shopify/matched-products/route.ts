import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';
import { ensureFreshToken, ShopifyTokenError } from '@/lib/shopify/token';
import { getProductsBySkus } from '@/lib/services/product.service';
import type { MatchedProductDTO } from '@/types/api';

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  variants: Array<{ id: number; sku: string | null; price: string | null }>;
  images: Array<{ src: string }>;
}

/**
 * GET /api/shopify/matched-products
 *
 * Fetches all products from the client's Shopify store,
 * extracts SKUs, matches them against our catalog (PRODUITS.SKU_EURO),
 * and returns merged results.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, { requireConfirmed: true });
  if (!isAuthResult(authResult)) {
    return authResult;
  }

  try {
    // 1. Get a fresh Shopify token
    let accessToken: string;
    let fullDomain: string;
    let shopDomain: string;
    try {
      const tokenResult = await ensureFreshToken(authResult.user.id);
      accessToken = tokenResult.accessToken;
      fullDomain = tokenResult.fullDomain;
      shopDomain = tokenResult.shopDomain;
    } catch (tokenError) {
      if (tokenError instanceof ShopifyTokenError) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, (tokenError as ShopifyTokenError).message, 400);
      }
      console.error('[matched-products] Token error:', tokenError);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur de configuration Shopify', 500);
    }

    // 2. Fetch ALL products from Shopify (paginated, max 250/page)
    const shopifyProducts = await fetchAllShopifyProducts(fullDomain, accessToken);

    // 3. Extract unique SKUs from Shopify variants
    const skuToShopifyMap = new Map<string, { product: ShopifyProduct; price: string | null }>();
    for (const product of shopifyProducts) {
      for (const variant of product.variants) {
        if (variant.sku && variant.sku.trim()) {
          const normalizedSku = variant.sku.trim().toUpperCase();
          if (!skuToShopifyMap.has(normalizedSku)) {
            skuToShopifyMap.set(normalizedSku, { product, price: variant.price ?? null });
          }
        }
      }
    }

    const shopifySkus = Array.from(skuToShopifyMap.keys());

    if (shopifySkus.length === 0) {
      return successResponse({ products: [], count: 0, shopifyProductCount: shopifyProducts.length });
    }


    // 4. Match SKUs against our catalog
    const localProducts = await getProductsBySkus(shopifySkus, authResult.priceCategory);

    // 5. Check which are already in shopify_listings (imported via our platform)
    const adminClient = createSupabaseAdminClient() as any;
    const localProductIds = localProducts.map((p) => p.id);

    let importedIds = new Set<number>();
    if (localProductIds.length > 0) {
      const { data: listings } = await adminClient
        .from('shopify_listings')
        .select('local_product_id')
        .eq('user_id', authResult.user.id)
        .in('local_product_id', localProductIds);

      importedIds = new Set((listings || []).map((l: { local_product_id: number }) => l.local_product_id));
    }

    // 6. Build response
    const now = new Date().toISOString();
    const matched: MatchedProductDTO[] = localProducts.map((localProduct) => {
      const normalizedSku = (localProduct.skuEuro || '').trim().toUpperCase();
      const entry = skuToShopifyMap.get(normalizedSku);

      return {
        localProduct,
        shopifyProductId: entry ? entry.product.id.toString() : '',
        shopifyProductTitle: entry ? entry.product.title : '',
        shopifyProductUrl: entry
          ? `https://${shopDomain}.myshopify.com/admin/products/${entry.product.id}`
          : null,
        shopifyPrice: entry?.price ?? null,
        source: importedIds.has(localProduct.id) ? 'imported' as const : 'matched' as const,
        syncedAt: now,
      };
    });

    return successResponse({
      products: matched,
      count: matched.length,
      shopifyProductCount: shopifyProducts.length,
    });
  } catch (error) {
    console.error('[matched-products] Unexpected error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}

/**
 * Fetches all products from a Shopify store using cursor-based pagination.
 */
async function fetchAllShopifyProducts(
  fullDomain: string,
  accessToken: string
): Promise<ShopifyProduct[]> {
  const allProducts: ShopifyProduct[] = [];
  let nextPageUrl: string | null =
    `https://${fullDomain}/admin/api/2024-01/products.json?limit=250&fields=id,title,handle,variants,images&variant_fields=id,sku,price`;

  const maxPages = 20; // Safety limit: 20 * 250 = 5000 products max
  let page = 0;

  while (nextPageUrl && page < maxPages) {
    page++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(nextPageUrl, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`[fetchAllShopifyProducts] Shopify returned ${response.status} on page ${page}`);
        break;
      }

      const data = await response.json();
      if (data.products && Array.isArray(data.products)) {
        allProducts.push(...data.products);
      }

      // Parse Link header for next page
      nextPageUrl = parseLinkHeader(response.headers.get('link'));
    } catch (err) {
      clearTimeout(timeoutId);
      console.error(`[fetchAllShopifyProducts] Error on page ${page}:`, err);
      break;
    }
  }

  return allProducts;
}

/**
 * Parses the Shopify Link header to extract the "next" page URL.
 */
function parseLinkHeader(linkHeader: string | null): string | null {
  if (!linkHeader) return null;

  const parts = linkHeader.split(',');
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}
