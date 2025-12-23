'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Settings, ShoppingCart, Package } from 'lucide-react';

interface ShopifyConfig {
  shopDomain: string | null;
  configured: boolean;
}

interface Profile {
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export default function HomePage() {
  const supabase = createSupabaseClient();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shopifyConfig, setShopifyConfig] = useState<ShopifyConfig | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data, error } = await (supabase as any)
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setProfile({
            firstName: (data as any).first_name,
            lastName: (data as any).last_name,
            email: (data as any).email,
          });
        }

        try {
          const cfgRes = await fetch('/api/shopify/config', { credentials: 'include' });
          if (cfgRes.ok) {
            const payload = await cfgRes.json();
            if (payload?.success) {
              setShopifyConfig({
                shopDomain: payload.data?.shopDomain ?? null,
                configured: !!payload.data?.configured,
              });
            }
          }
        } catch {
          // ignore
        }

        try {
          const cartRes = await fetch('/api/cart', { credentials: 'include' });
          if (cartRes.ok) {
            const payload = await cartRes.json();
            if (payload?.success) {
              setCartCount(payload.data?.count ?? 0);
            }
          }
        } catch {
          // ignore
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [supabase]);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="bg-gray-50 py-16 px-4">
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-4xl font-bold text-center mb-4">Eurodesign Pro</h1>
            <p className="text-xl text-center text-gray-600 mb-8">
              Plateforme B2B dédiée aux professionnels du mobilier et de l&apos;agencement.
              Créez un compte pour accéder à notre catalogue privé, sélectionner vos produits,
              et automatiser vos ventes avec Shopify.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">🛍️ Catalogue privé</h3>
                <p className="text-gray-600 text-sm">
                  Accédez à des milliers de références professionnelles réservées aux membres validés.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">🔗 Synchronisation Shopify</h3>
                <p className="text-gray-600 text-sm">
                  Importez automatiquement vos produits sélectionnés dans votre boutique Shopify.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">📈 Tarifs actualisés</h3>
                <p className="text-gray-600 text-sm">
                  Bénéficiez de prix pros et de mises à jour automatiques sur les stocks.
                </p>
              </div>
            </div>

            <div className="text-center">
              <p className="text-lg mb-4">
                🔐 Créez votre compte professionnel gratuitement
              </p>
              <div className="flex justify-center gap-4">
                <Link
                  href="/user/sign-up"
                  className="px-6 py-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
                >
                  Créer un compte
                </Link>
                <Link
                  href="/user/sign-in"
                  className="px-6 py-3 bg-gray-100 text-primary-500 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Se connecter
                </Link>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const displayName = profile
    ? profile.firstName && profile.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : profile.email
    : 'Utilisateur';

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-center mb-2">Tableau de bord</h1>
            <p className="text-center text-gray-600 mb-8">
              Bonjour <strong>{displayName}</strong> !
            </p>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Settings className="text-primary-500" size={24} />
                  <h3 className="font-semibold text-lg">Connexion Shopify</h3>
                </div>
                {shopifyConfig?.configured ? (
                  <>
                    <p className="text-gray-600 mb-2">
                      <strong>Domaine :</strong> {shopifyConfig.shopDomain}.myshopify.com
                    </p>
                    <Link href="/user/settings" className="text-primary-500 hover:underline">
                      🔧 Modifier la configuration
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-red-500 mb-2">❌ Non configuré</p>
                    <Link href="/user/settings" className="text-primary-500 hover:underline">
                      ➕ Configurer maintenant
                    </Link>
                  </>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ShoppingCart className="text-primary-500" size={24} />
                  <h3 className="font-semibold text-lg">Panier</h3>
                </div>
                <p className="text-gray-600 mb-2">
                  {cartCount > 0
                    ? `🛒 ${cartCount} produit${cartCount > 1 ? 's' : ''} dans votre panier`
                    : '🕘 Aucun produit dans le panier'}
                </p>
                <Link href="/shopping-cart" className="text-primary-500 hover:underline">
                  🛍️ Voir le panier
                </Link>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="text-primary-500" size={24} />
                  <h3 className="font-semibold text-lg">Actions rapides</h3>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/products"
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    Parcourir le catalogue
                  </Link>
                  <Link
                    href="/products/listed-product"
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Mes produits Shopify
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
