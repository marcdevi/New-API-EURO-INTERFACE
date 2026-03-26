import { ShopifyConfig } from '@/types/shopify';

export async function getShopifyConfig(shopDomain?: string): Promise<ShopifyConfig | null> {
  const baseUrl = process.env.API_BASE_URL;
  const secretKey = process.env.API_SECRET_KEY;
  const domain = shopDomain ?? process.env.DEFAULT_SHOP_DOMAIN;
  
  console.log('[getShopifyConfig] Config check:', {
    baseUrl,
    hasSecretKey: !!secretKey,
    domain,
    url: domain ? `${baseUrl}/api/shopify/config/${encodeURIComponent(domain)}` : null
  });
  
  if (!domain) {
    console.log('[getShopifyConfig] No domain provided');
    return null;
  }

  try {
    const res = await fetch(
      `${baseUrl}/api/shopify/config/${encodeURIComponent(domain)}`,
      {
        headers: { Authorization: `Bearer ${secretKey}` },
        cache: 'no-store',
      }
    );

    console.log('[getShopifyConfig] Response:', {
      status: res.status,
      ok: res.ok,
      statusText: res.statusText
    });

    if (res.status === 404) {
      console.log('[getShopifyConfig] Config not found (404)');
      return null;
    }
    
    if (!res.ok) {
      const errorText = await res.text();
      console.log('[getShopifyConfig] Error response body:', errorText);
      throw new Error(`Erreur API config: ${res.status} - ${errorText}`);
    }
    
    const data = await res.json();
    console.log('[getShopifyConfig] Success:', data);
    return data as ShopifyConfig;
  } catch (err) {
    console.error('[getShopifyConfig] Network error:', err);
    return null;
  }
}
