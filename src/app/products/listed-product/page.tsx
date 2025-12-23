'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import MainLayout from '@/components/layout/MainLayout';
import type { ShopifyListingDTO } from '@/types/api';
import { ExternalLink } from 'lucide-react';

export default function ListedProductsPage() {
  const [listings, setListings] = useState<ShopifyListingDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopDomain, setShopDomain] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listingsRes, configRes] = await Promise.all([
          fetch('/api/shopify/listings'),
          fetch('/api/shopify/config'),
        ]);

        const listingsData = await listingsRes.json();
        const configData = await configRes.json();

        if (listingsData.success) {
          setListings(listingsData.data.listings);
        }

        if (configData.success) {
          setShopDomain(configData.data.shopDomain);
        }
      } catch {
        console.error('Échec du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getShopifyUrl = (shopifyProductId: string | null) => {
    if (!shopDomain || !shopifyProductId) return null;
    return `https://${shopDomain}.myshopify.com/admin/products/${shopifyProductId}`;
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Mes produits Shopify</h1>
          <p className="text-gray-600 mb-8">
            Produits importés dans votre boutique Shopify
          </p>

          {loading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
              <p className="mt-4 text-gray-500">Chargement...</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 mb-4">Aucun produit importé</p>
              <p className="text-sm text-gray-400">
                Ajoutez des produits à votre panier et importez-les vers Shopify
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prix
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Importé le
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {listings.map((listing) => (
                    <tr key={listing.localProductId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 flex-shrink-0">
                            <Image
                              src={listing.product.images[0] || '/images/placeholder.png'}
                              alt={listing.product.nom}
                              fill
                              sizes="48px"
                              className="object-cover rounded"
                            />
                          </div>
                          <span className="font-medium truncate max-w-xs">
                            {listing.product.nom}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {listing.product.skuEuro || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                        {listing.product.displayPrice}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(listing.pushedAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getShopifyUrl(listing.shopifyProductId) ? (
                          <a
                            href={getShopifyUrl(listing.shopifyProductId)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary-500 hover:text-primary-600"
                          >
                            Voir sur Shopify
                            <ExternalLink size={16} />
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
