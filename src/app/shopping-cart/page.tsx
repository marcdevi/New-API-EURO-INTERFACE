'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import type { CartItemDTO } from '@/types/api';
import { Trash2, Upload, CheckCircle, AlertCircle } from 'lucide-react';

export default function ShoppingCartPage() {
  const [cartItems, setCartItems] = useState<CartItemDTO[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [priceCategory, setPriceCategory] = useState<'dropshipping' | 'A' | 'C' | 'D' | 'remise'>('D');
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    imported?: number;
    failed?: number;
  } | null>(null);

  const getDisplayPrice = (item: CartItemDTO) => {
    if (priceCategory === 'dropshipping') return '0.00 €';
    const key = priceCategory === 'remise' ? 'Prix_remise' : `Prix_${priceCategory}`;
    const raw = item.product.prices?.[key];
    const value = typeof raw === 'number' ? raw : null;
    return value !== null ? `${value.toFixed(2)} €` : 'Prix indisponible';
  };

  const fetchCart = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cart');
      const data = await response.json();
      if (data.success) {
        setCartItems(data.data.items);
      }
    } catch {
      console.error('Échec du chargement du panier');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('shopifyPriceCategory');
      if (
        stored === 'dropshipping' ||
        stored === 'A' ||
        stored === 'C' ||
        stored === 'D' ||
        stored === 'remise'
      ) {
        setPriceCategory(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleRemove = async (productIds: number[]) => {
    if (productIds.length === 0) return;
    setRemoving(true);
    try {
      const chunkSize = 100;
      const removedIds: number[] = [];

      for (let i = 0; i < productIds.length; i += chunkSize) {
        const chunk = productIds.slice(i, i + chunkSize);

        const response = await fetch('/api/cart', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds: chunk }),
        });

        const data = await response.json();
        if (!data.success) {
          console.error('Échec de la suppression du panier');
          return;
        }

        removedIds.push(...chunk);
      }

      setCartItems((prev) => prev.filter((item) => !removedIds.includes(item.productId)));
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        removedIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    } catch {
      console.error('Échec de la suppression du panier');
    } finally {
      setRemoving(false);
    }
  };

  const handleImport = async () => {
    const itemsToImport = selectedItems.size > 0
      ? cartItems.filter((item) => selectedItems.has(item.productId))
      : cartItems;

    if (itemsToImport.length === 0) return;

    const productsWithPrices = itemsToImport.map((item) => ({
      id: item.productId,
      price: (() => {
        const raw = getDisplayPrice(item);
        return parseFloat(raw.replace(' €', '').replace(',', '.')) || 0;
      })(),
    }));

    setImporting(true);
    setImportResult(null);

    try {
      const chunkSize = 100;
      let totalQueued = 0;
      let totalSkipped = 0;

      for (let i = 0; i < productsWithPrices.length; i += chunkSize) {
        const chunk = productsWithPrices.slice(i, i + chunkSize);

        const response = await fetch('/api/shopify/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products: chunk }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          setImportResult({
            success: false,
            message: data.error?.message || `Erreur lors de l'import (${response.status})`,
          });
          return;
        }
        totalQueued += data.data.queued || 0;
        totalSkipped += data.data.skipped || 0;
      }

      setImportResult({
        success: true,
        message: totalQueued > 0
          ? `${totalQueued} produit(s) envoyé(s) à la file d'import Shopify${totalSkipped > 0 ? ` (${totalSkipped} déjà importé(s))` : ''}`
          : `Tous les produits sont déjà importés (${totalSkipped})`,
        imported: totalQueued,
        failed: 0,
      });

      fetchCart();
      setSelectedItems(new Set());
    } catch {
      setImportResult({
        success: false,
        message: 'Erreur de connexion',
      });
    } finally {
      setImporting(false);
    }
  };

  const toggleSelection = (productId: number) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedItems(new Set(cartItems.map((item) => item.productId)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Panier</h1>

          {importResult && (
            <div
              className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${
                importResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {importResult.success ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
              <div>
                <p className="font-medium">{importResult.message}</p>
                {importResult.imported !== undefined && (
                  <p className="text-sm">
                    {importResult.imported} importé(s), {importResult.failed || 0} échoué(s)
                  </p>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
              <p className="mt-4 text-gray-500">Chargement...</p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 mb-4">Votre panier est vide</p>
              <Link
                href="/products"
                className="inline-block px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Parcourir le catalogue
              </Link>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <div>
                    {selectedItems.size > 0 ? (
                      <p className="text-gray-600">
                        {selectedItems.size} produit(s) sélectionné(s) pour l&apos;import
                      </p>
                    ) : (
                      <p className="text-gray-600">
                        Tous les produits seront importés
                      </p>
                    )}
                  </div>

                  <div className="flex gap-4">
                    {selectedItems.size > 0 && (
                      <Button
                        variant="danger"
                        onClick={() => handleRemove(Array.from(selectedItems))}
                        isLoading={removing}
                      >
                        <Trash2 size={20} className="mr-2" />
                        Supprimer ({selectedItems.size})
                      </Button>
                    )}
                    <Button onClick={handleImport} isLoading={importing}>
                      <Upload size={20} className="mr-2" />
                      Importer vers Shopify
                    </Button>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow mb-6">
                <div className="p-4 border-b flex justify-between items-center">
                  <span className="font-medium">{cartItems.length} produit(s)</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                      Tout sélectionner
                    </Button>
                    {selectedItems.size > 0 && (
                      <Button variant="ghost" size="sm" onClick={deselectAll}>
                        Désélectionner
                      </Button>
                    )}
                  </div>
                </div>

                <div className="divide-y">
                  {cartItems.map((item) => (
                    <div
                      key={item.productId}
                      className={`p-4 flex items-center gap-4 ${
                        selectedItems.has(item.productId) ? 'bg-primary-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.productId)}
                        onChange={() => toggleSelection(item.productId)}
                        className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      />

                      <div className="relative w-20 h-20 flex-shrink-0">
                        <Image
                          src={item.product.images[0] || '/images/placeholder.png'}
                          alt={item.product.nom}
                          fill
                          className="object-cover rounded"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{item.product.nom}</h3>
                        <p className="text-sm text-gray-500">{item.product.skuEuro}</p>
                        <p className="text-primary-600 font-semibold">{getDisplayPrice(item)}</p>
                      </div>

                      <button
                        onClick={() => handleRemove([item.productId])}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
