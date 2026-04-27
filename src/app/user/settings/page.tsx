import MainLayout from '@/components/layout/MainLayout';
import { ConnectionStatusBadge } from '@/components/shopify/ConnectionStatusBadge';
import { ShopifySettingsTabs } from '@/components/shopify/ShopifySettingsTabs';
import { RefreshTokenButton } from '@/components/shopify/RefreshTokenButton';
import { getShopifyConfig } from '@/lib/api/shopify';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface ShopifyConfigRow {
  shop_domain: string | null;
}

export default async function SettingsPage() {
  console.log('[SettingsPage] Starting to load...');
  
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.log('[SettingsPage] No authenticated user');
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 py-10 px-4">
          <div className="mx-auto max-w-2xl">
            <p className="text-red-600">Vous devez être connecté pour accéder à cette page.</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  const result = await supabase
    .from('shopify_config')
    .select('shop_domain')
    .eq('id', user.id)
    .maybeSingle();
  
  const shopifyConfigRow = result.data as ShopifyConfigRow | null;
  const shopDomain = shopifyConfigRow?.shop_domain ?? null;
  console.log('[SettingsPage] User shop_domain from DB:', shopDomain);
  
  const config = shopDomain ? await getShopifyConfig(shopDomain) : null;
  console.log('[SettingsPage] Config loaded:', config);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="mx-auto max-w-2xl space-y-8">
          <h1 className="text-3xl font-bold text-gray-900">Paramètres Shopify</h1>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">Statut de connexion</h2>
            <ConnectionStatusBadge authMethod={config?.auth_method ?? null} />
          </section>

          {config?.auth_method === 'oauth' && (
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Renouvellement du token</h2>
              <RefreshTokenButton />
            </section>
          )}

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Configuration Shopify</h2>
            <ShopifySettingsTabs key={config?.shop_domain ?? 'no-config'} existingConfig={config} />
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
