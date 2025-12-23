'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Check } from 'lucide-react';
import type { ProductDTO } from '@/types/api';

interface ProductCardProps {
  product: ProductDTO;
  isSelected?: boolean;
  isInCart?: boolean;
  onSelect?: () => void;
  onAddToCart?: () => void;
  onViewDetails?: () => void;
}

export default function ProductCard({
  product,
  isSelected = false,
  isInCart = false,
  onSelect,
  onAddToCart,
  onViewDetails,
}: ProductCardProps) {
  const imageUrl = product.images[0] || '/images/placeholder.png';

  return (
    <div
      className={`
        bg-white rounded-lg shadow-md overflow-hidden transition-all
        ${isSelected ? 'ring-2 ring-primary-500' : ''}
        ${onSelect ? 'cursor-pointer' : ''}
      `}
      onClick={onSelect}
    >
      <div className="relative aspect-square">
        <Image
          src={imageUrl}
          alt={product.nom}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
        />
        {onSelect && (
          <div className="absolute top-2 left-2">
            <div
              className={`
                w-6 h-6 rounded border-2 flex items-center justify-center
                ${isSelected ? 'bg-primary-500 border-primary-500' : 'bg-white border-gray-300'}
              `}
            >
              {isSelected && <Check size={16} className="text-white" />}
            </div>
          </div>
        )}
        {isInCart && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
            Dans le panier
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-medium text-gray-900 truncate" title={product.nom}>
          {product.nom}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {product.skuEuro || <span className="italic">SKU indisponible</span>}
        </p>
        <p className="text-lg font-semibold text-primary-600 mt-2">
          {product.displayPrice}
        </p>

        <div className="mt-4 flex gap-2">
          {onViewDetails ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              className="flex-1 text-center py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              Voir plus
            </button>
          ) : (
            <Link
              href={`/products/${product.id}`}
              className="flex-1 text-center py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              Voir plus
            </Link>
          )}
          {onAddToCart && !isInCart && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart();
              }}
              className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              title="Ajouter au panier"
            >
              <ShoppingCart size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
