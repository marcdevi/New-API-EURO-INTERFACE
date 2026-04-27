'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import MainLayout from '@/components/layout/MainLayout';
import type { MatchedProductDTO } from '@/types/api';
import { ExternalLink, RefreshCw, Upload, CheckCircle } from 'lucide-react';

type FilterMode = 'all' | 'imported' | 'matched';

export default function ListedProductsPage() {
  const [products, setProducts] = useState<MatchedProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [shopifyProductCount, setShopifyProductCount] = useState(0);

  const fetchMatchedProducts = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/shopify/matched-products');
      const data = await res.json();

      if (data.success) {
        setProducts(data.data.products);
        setShopifyProductCount(data.data.shopifyProductCount || 0);
      } else {
        setError(data.error?.message || 'Erreur lors du chargement');
      }
    } catch {
      setError('Impossible de contacter le serveur');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchMatchedProducts();
      setLoading(false);
    };
    load();
  }, [fetchMatchedProducts]);

  const handleSync = async () => {
    setSyncing(true);
    await fetchMatchedProducts();
    setSyncing(false);
  };

  const filteredProducts = products.filter((p) => {
    if (filter === 'all') return true;
    return p.source === filter;
  });

  const importedCount = products.filter((p) => p.source === 'imported').length;
  const matchedCount = products.filter((p) => p.source === 'matched').length;

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold">Mes produits Shopify</h1>
              <p className="text-gray-600 mt-1">
                Produits de votre boutique correspondant à notre catalogue
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Synchronisation...' : 'Synchroniser'}
            </button>
          </div>

          {/* Stats */}
          {!loading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Total correspondances</p>
                <p className="text-2xl font-bold text-gray-900">{products.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <p className="text-sm text-gray-500">Détectés par SKU</p>
                </div>
                <p className="text-2xl font-bold text-green-600">{matchedCount}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          {!loading && !error && products.length > 0 && (
            <div className="flex gap-2 mb-6">
              {(['all', 'imported', 'matched'] as FilterMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilter(mode)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    filter === mode
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border'
                  }`}
                >
                  {mode === 'all' && `Tous (${products.length})`}
                  {mode === 'imported' && `Importés (${importedCount})`}
                  {mode === 'matched' && `Détectés (${matchedCount})`}
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
              <p className="mt-4 text-gray-500">Synchronisation avec Shopify...</p>
              <p className="mt-1 text-xs text-gray-400">Cela peut prendre quelques secondes</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={handleSync}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                Réessayer
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 mb-2">
                {filter !== 'all'
                  ? 'Aucun produit dans cette catégorie'
                  : 'Aucun produit de notre catalogue détecté dans votre boutique Shopify'}
              </p>
              {shopifyProductCount > 0 && (
                <p className="text-sm text-gray-400">
                  {shopifyProductCount} produit(s) trouvé(s) sur Shopify, mais aucun SKU ne correspond à notre catalogue
                </p>
              )}
              <p className="text-sm text-gray-400 mt-2">
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
                      Prix Shopify
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    {/*<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>*/}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map((item) => (
                    <tr key={item.localProduct.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 flex-shrink-0">
                            <Image
                              src={item.localProduct.images[0] || '/images/placeholder.png'}
                              alt={item.localProduct.nom}
                              fill
                              sizes="48px"
                              className="object-cover rounded"
                              unoptimized
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="font-medium truncate block max-w-xs">
                              {item.localProduct.nom}
                            </span>
                            {item.shopifyProductTitle && item.shopifyProductTitle !== item.localProduct.nom && (
                              <span className="text-xs text-gray-400 truncate block max-w-xs">
                                Shopify : {item.shopifyProductTitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.localProduct.skuEuro || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                        {item.shopifyPrice ? `${parseFloat(item.shopifyPrice).toFixed(2)} €` : item.localProduct.displayPrice}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.source === 'imported' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            <Upload size={12} />
                            Importé
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle size={12} />
                            Détecté (SKU)
                          </span>
                        )}
                      </td>
                      {/*<td className="px-6 py-4 whitespace-nowrap">
                        {item.shopifyProductUrl ? (
                          <a
                            href={item.shopifyProductUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary-500 hover:text-primary-600 text-sm"
                          >
                            Voir sur Shopify
                            <ExternalLink size={14} />
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>*/}
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
