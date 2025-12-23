import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';
import { shopifyImportSchema } from '@/lib/schemas';
import { decryptToken, securityLog, getClientIp } from '@/lib/security';
import { checkRateLimit } from '@/lib/ratelimit';
import { getProductsByIds } from '@/lib/services/product.service';

interface ShopifyProductPayload {
  product: {
    title: string;
    body_html: string;
    vendor: string;
    product_type: string;
    status: string;
    variants: Array<{
      price: string;
      sku: string;
      inventory_management: string;
    }>;
    images?: Array<{ src: string; position: number }>;
  };
}

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

    const adminClient = createSupabaseAdminClient() as any;

    const { data: shopifyConfig, error: configError } = await adminClient
      .from('shopify_config')
      .select('shop_domain, access_token')
      .eq('id', authResult.user.id)
      .single();

    if (configError || !shopifyConfig?.access_token) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Configuration Shopify non trouvée. Veuillez configurer votre boutique.',
        400
      );
    }

    let accessToken: string;
    try {
      // NOTE: en BDD legacy, la colonne s'appelle `access_token`.
      // On y stocke une valeur chiffrée (AES-256-GCM) et on déchiffre ici.
      accessToken = decryptToken(shopifyConfig.access_token);
    } catch (decryptError) {
      console.error('[Shopify] Token decryption error:', decryptError);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur de configuration', 500);
    }

    const fullDomain = shopifyConfig.shop_domain?.includes('.')
      ? shopifyConfig.shop_domain
      : `${shopifyConfig.shop_domain}.myshopify.com`;

    const { data: existingListings } = await adminClient
      .from('shopify_listings')
      .select('local_product_id')
      .eq('user_id', authResult.user.id)
      .in('local_product_id', validation.data.productIds);

    const existingIds = new Set((existingListings || []).map((l: any) => l.local_product_id));
    const newProductIds = validation.data.productIds.filter((id) => !existingIds.has(id));

    if (newProductIds.length === 0) {
      return successResponse({
        message: 'Tous les produits sont déjà importés',
        imported: 0,
        skipped: validation.data.productIds.length,
        errors: [],
      });
    }

    const products = await getProductsByIds(newProductIds, authResult.priceCategory);

    const results: Array<{
      productId: number;
      success: boolean;
      shopifyProductId?: string;
      shopifyVariantId?: string;
      error?: string;
    }> = [];

    for (const product of products) {
      try {
        const price = parseFloat(product.displayPrice.replace(' €', '').replace(',', '.')) || 0;

        const payload: ShopifyProductPayload = {
          product: {
            title: product.nom,
            body_html: product.description || '',
            vendor: 'Eurodesign',
            product_type: product.category?.name || 'Général',
            status: 'active',
            variants: [
              {
                price: price.toFixed(2),
                sku: product.skuEuro || product.id.toString(),
                inventory_management: 'shopify',
              },
            ],
          },
        };

        if (product.images.length > 0) {
          payload.product.images = product.images.map((url, index) => ({
            src: url,
            position: index + 1,
          }));
        }

        const shopifyUrl = `https://${fullDomain}/admin/api/2024-01/products.json`;
        const response = await fetch(shopifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          results.push({
            productId: product.id,
            success: true,
            shopifyProductId: data.product.id.toString(),
            shopifyVariantId: data.product.variants[0]?.id?.toString(),
          });
        } else {
          const errorText = await response.text();
          console.error(`[Shopify] Import error for product ${product.id}:`, errorText);
          results.push({
            productId: product.id,
            success: false,
            error: `Shopify error: ${response.status}`,
          });
        }
      } catch (productError) {
        console.error(`[Shopify] Import exception for product ${product.id}:`, productError);
        results.push({
          productId: product.id,
          success: false,
          error: 'Erreur lors de l\'import',
        });
      }
    }

    const successfulImports = results.filter((r) => r.success);
    if (successfulImports.length > 0) {
      const listings = successfulImports.map((r) => ({
        user_id: authResult.user.id,
        local_product_id: r.productId,
        shopify_product_id: r.shopifyProductId || null,
        shopify_variant_id: r.shopifyVariantId || null,
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
        .in('product_id', successfulImports.map((r) => r.productId));

      if (cartError) {
        console.error('[Shopify] Cart cleanup error:', cartError);
      }
    }

    securityLog('SHOPIFY_IMPORT_COMPLETED', {
      userId: authResult.user.id,
      ip,
      details: {
        requested: validation.data.productIds.length,
        imported: successfulImports.length,
        failed: results.filter((r) => !r.success).length,
      },
    });

    return successResponse({
      message: `${successfulImports.length} produit(s) importé(s) avec succès`,
      imported: successfulImports.length,
      skipped: existingIds.size,
      failed: results.filter((r) => !r.success).length,
      errors: results.filter((r) => !r.success).map((r) => ({
        productId: r.productId,
        error: r.error || 'Erreur inconnue',
      })),
    });
  } catch (error) {
    console.error('[Shopify] Import unexpected error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}
