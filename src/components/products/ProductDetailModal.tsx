'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Package, Ruler, Weight } from 'lucide-react';
import type { ProductDTO } from '@/types/api';

interface ProductDetailModalProps {
  productId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductDetailModal({ productId, isOpen, onClose }: ProductDetailModalProps) {
  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!isOpen || !productId) {
      setProduct(null);
      setCurrentImageIndex(0);
      setError('');
      return;
    }

    const fetchProduct = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/products/${productId}`);
        const data = await response.json();

        if (data.success) {
          setProduct(data.data);
        } else {
          setError(data.error?.message || 'Erreur lors du chargement du produit');
        }
      } catch {
        setError('Erreur de connexion');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, isOpen]);

  if (!isOpen) return null;

  const handlePrevImage = () => {
    if (!product || product.images.length === 0) return;
    setCurrentImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (!product || product.images.length === 0) return;
    setCurrentImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            {loading ? 'Chargement...' : product?.nom || 'Détails du produit'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Fermer"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg">
              {error}
            </div>
          )}

          {!loading && !error && product && (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {product.images.length > 0 ? (
                    <>
                      <Image
                        src={product.images[currentImageIndex]}
                        alt={`${product.nom} - Image ${currentImageIndex + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      {product.images.length > 1 && (
                        <>
                          <button
                            onClick={handlePrevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-75 hover:bg-opacity-100 p-2 rounded-full transition-all"
                            aria-label="Image précédente"
                          >
                            <ChevronLeft size={24} />
                          </button>
                          <button
                            onClick={handleNextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-75 hover:bg-opacity-100 p-2 rounded-full transition-all"
                            aria-label="Image suivante"
                          >
                            <ChevronRight size={24} />
                          </button>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                            {currentImageIndex + 1} / {product.images.length}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <Package size={64} />
                    </div>
                  )}
                </div>

                {product.images.length > 1 && (
                  <div className="mt-4 grid grid-cols-5 gap-2">
                    {product.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          idx === currentImageIndex ? 'border-primary-500' : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <Image
                          src={img}
                          alt={`Miniature ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="100px"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{product.nom}</h3>
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">SKU:</span> {product.skuEuro || 'Non disponible'}
                  </p>
                  {product.category && (
                    <p className="text-sm text-gray-500 mt-1">
                      <span className="font-medium">Catégorie:</span> {product.category.name}
                    </p>
                  )}
                </div>

                <div className="border-t border-b border-gray-200 py-4">
                  <p className="text-3xl font-bold text-primary-600">{product.displayPrice}</p>
                  {/* {product.prices && (
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      {product.prices.Prix_A !== null && (
                        <p>Prix A: {product.prices.Prix_A.toFixed(2)} €</p>
                      )}
                      {product.prices.Prix_C !== null && (
                        <p>Prix C: {product.prices.Prix_C.toFixed(2)} €</p>
                      )}
                      {product.prices.Prix_D !== null && (
                        <p>Prix D: {product.prices.Prix_D.toFixed(2)} €</p>
                      )}
                      {product.prices.Prix_remise !== null && (
                        <p>Prix remise: {product.prices.Prix_remise.toFixed(2)} €</p>
                      )}
                    </div>
                  )} */}
                </div>

                {product.description && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{product.description}</p>
                  </div>
                )}

                {product.colis && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Informations colis</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {product.colis.poids !== null && (
                        <div className="flex items-center gap-2 text-sm">
                          <Weight size={18} className="text-gray-500" />
                          <span className="text-gray-700">
                            <span className="font-medium">Poids:</span> {product.colis.poids} kg
                          </span>
                        </div>
                      )}
                      {product.colis.longueur !== null && (
                        <div className="flex items-center gap-2 text-sm">
                          <Ruler size={18} className="text-gray-500" />
                          <span className="text-gray-700">
                            <span className="font-medium">Long.:</span> {product.colis.longueur} cm
                          </span>
                        </div>
                      )}
                      {product.colis.largeur !== null && (
                        <div className="flex items-center gap-2 text-sm">
                          <Ruler size={18} className="text-gray-500" />
                          <span className="text-gray-700">
                            <span className="font-medium">Larg.:</span> {product.colis.largeur} cm
                          </span>
                        </div>
                      )}
                      {product.colis.hauteur !== null && (
                        <div className="flex items-center gap-2 text-sm">
                          <Ruler size={18} className="text-gray-500" />
                          <span className="text-gray-700">
                            <span className="font-medium">Haut.:</span> {product.colis.hauteur} cm
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {product.dropshippingAllowed && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800 font-medium">
                      ✓ Dropshipping autorisé
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
