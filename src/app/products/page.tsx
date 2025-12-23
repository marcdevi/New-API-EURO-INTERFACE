'use client';

import { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/products/ProductCard';
import ProductDetailModal from '@/components/products/ProductDetailModal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { ProductDTO } from '@/types/api';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

interface Category {
  id: number;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cartProductIds, setCartProductIds] = useState<Set<number>>(new Set());
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [priceCategory, setPriceCategory] = useState<'dropshipping' | 'A' | 'C' | 'D' | 'remise'>('D');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectAllPagesLoading, setSelectAllPagesLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | 'all'>('all');
  const [sort, setSort] = useState<'price_asc' | 'price_desc' | undefined>();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const pageSize = 20;

  const getDisplayPrice = useCallback(
    (product: ProductDTO) => {
      if (priceCategory === 'dropshipping') return '0.00 €';
      const key = priceCategory === 'remise' ? 'Prix_remise' : `Prix_${priceCategory}`;
      const raw = product.prices?.[key];
      const value = typeof raw === 'number' ? raw : null;
      return value !== null ? `${value.toFixed(2)} €` : 'Prix indisponible';
    },
    [priceCategory]
  );

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/products/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search: search || undefined,
          categoryId: categoryId !== 'all' ? categoryId : undefined,
          sort,
          page,
          pageSize,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProducts(data.data.products);
        setTotalPages(data.data.pagination.totalPages);
        setTotal(data.data.pagination.total);
      } else {
        setError(data.error?.message || 'Erreur lors du chargement');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, sort, page, pageSize]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data.categories);
      }
    } catch {
      console.error('Échec du chargement des catégories');
    }
  };

  const fetchCart = async () => {
    try {
      const response = await fetch('/api/cart');
      const data = await response.json();
      if (data.success) {
        const ids = new Set<number>(
          data.data.items.map((item: { productId: number }) => item.productId as number)
        );
        setCartProductIds(ids);
      }
    } catch {
      console.error('Échec du chargement du panier');
    }
  };

  useEffect(() => {
    fetchCategories();
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

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleAddToCart = async (productIds: number[]) => {
    try {
      setError('');

      const chunkSize = 100;
      for (let i = 0; i < productIds.length; i += chunkSize) {
        const chunk = productIds.slice(i, i + chunkSize);

        const response = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds: chunk }),
        });

        const data = await response.json();
        if (!data.success) {
          setError(data.error?.message || 'Erreur lors de l\'ajout au panier');
          return;
        }

        setCartProductIds((prev) => {
          const newSet = new Set(prev);
          chunk.forEach((id) => newSet.add(id));
          return newSet;
        });
      }

      setSelectedProducts(new Set());
    } catch {
      console.error('Échec de l\'ajout au panier');
    }
  };

  const toggleProductSelection = (productId: number) => {
    setSelectedProducts((prev) => {
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
    const availableProducts = products.filter((p) => !cartProductIds.has(p.id));
    setSelectedProducts(new Set(availableProducts.map((p) => p.id)));
  };

  const selectAllPages = async () => {
    setSelectAllPagesLoading(true);
    try {
      setError('');
      const response = await fetch('/api/products/ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search: search || undefined,
          categoryId: categoryId !== 'all' ? categoryId : undefined,
          sort,
          // requis par le schéma partagé, mais pas utilisé pour cette route
          page: 1,
          pageSize: 100,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        setError(data.error?.message || 'Erreur lors du chargement');
        return;
      }

      const ids: number[] = (data.data?.ids || []) as number[];
      setSelectedProducts(new Set(ids.filter((id) => !cartProductIds.has(id))));
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSelectAllPagesLoading(false);
    }
  };

  const deselectAll = () => {
    setSelectedProducts(new Set());
  };

  const handleViewDetails = (productId: number) => {
    setSelectedProductId(productId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProductId(null);
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Catalogue produits</h1>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <Input
                    id="search"
                    placeholder="Rechercher un produit..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value === 'all' ? 'all' : parseInt(e.target.value));
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Toutes les catégories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <select
                value={sort || ''}
                onChange={(e) => {
                  setSort(e.target.value as 'price_asc' | 'price_desc' | undefined);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Tri par défaut</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
              </select>

              {/*<Button type="submit">
                <Filter size={20} className="mr-2" />
                Filtrer
              </Button>*/}
            </form>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-center font-semibold text-lg text-primary-700 mb-2">
              Choisissez votre catégorie de prix pour Shopify
            </h3>
            <p className="text-center text-gray-600 mb-4">
              Ce prix sera automatiquement utilisé pour tous les produits envoyés vers votre boutique Shopify.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              {([
                { key: 'dropshipping', label: 'Prix nul' },
                { key: 'A', label: 'Prix HT' },
                { key: 'C', label: 'Prix HT ×2' },
                { key: 'D', label: 'Prix HT ×2.5' },
                { key: 'remise', label: 'Prix remisé' },
              ] as const).map((opt) => {
                const selected = priceCategory === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={async () => {
                      setPriceCategory(opt.key);
                      try {
                        localStorage.setItem('shopifyPriceCategory', opt.key);
                      } catch {
                        // ignore
                      }
                      setPage(1);
                      fetchProducts();
                    }}
                    className={
                      selected
                        ? 'px-4 py-3 rounded-lg border-2 border-primary-600 bg-primary-50 text-primary-700 font-semibold'
                        : 'px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-700'
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedProducts.size > 0 && (
            <div className="bg-primary-50 rounded-lg p-4 mb-6 flex items-center justify-between">
              <span className="font-medium">
                {selectedProducts.size} produit(s) sélectionné(s)
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={deselectAll}>
                  Tout désélectionner
                </Button>
                <Button size="sm" onClick={() => handleAddToCart(Array.from(selectedProducts))}>
                  Ajouter au panier
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow animate-pulse">
                  <div className="aspect-square bg-gray-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-5 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Aucun produit trouvé
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <p className="text-gray-600">{total} produit(s) trouvé(s)</p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Tout sélectionner
                  </Button>
                  <Button variant="ghost" size="sm" onClick={selectAllPages} isLoading={selectAllPagesLoading}>
                    Tout sélectionner (toutes les pages)
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={{ ...product, displayPrice: getDisplayPrice(product) }}
                    isSelected={selectedProducts.has(product.id)}
                    isInCart={cartProductIds.has(product.id)}
                    onSelect={() => toggleProductSelection(product.id)}
                    onAddToCart={() => handleAddToCart([product.id])}
                    onViewDetails={() => handleViewDetails(product.id)}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <Button
                    variant="secondary"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft size={20} />
                    Précédent
                  </Button>
                  <span className="text-gray-600">
                    Page {page} sur {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Suivant
                    <ChevronRight size={20} />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <ProductDetailModal
        productId={selectedProductId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </MainLayout>
  );
}
