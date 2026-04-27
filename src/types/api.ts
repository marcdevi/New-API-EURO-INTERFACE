export type ApiResponse<T> =
  | { success: true; data: T; timestamp: string }
  | { success: false; error: { code: string; message: string }; timestamp: string };

export interface ProductDTO {
  id: number;
  nom: string;
  skuEuro: string | null;
  description: string | null;
  images: string[];
  category: { id: number; name: string } | null;
  prices: Record<string, number | null>;
  displayPrice: string;
  dropshippingAllowed: boolean;
  colis: {
    poids: number | null;
    longueur: number | null;
    largeur: number | null;
    hauteur: number | null;
  } | null;
}

export interface ProfileDTO {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  siret: string | null;
  vatNumber: string | null;
  companyPhone: string | null;
  confirmed: boolean;
  rejected: boolean;
  isAdmin: boolean;
  priceCategory: string;
}

export interface ShopifyConfigDTO {
  shopDomain: string | null;
  configured: boolean;
  updatedAt: string;
}

export interface CartItemDTO {
  productId: number;
  product: ProductDTO;
  addedAt: string;
}

export interface ShopifyListingDTO {
  localProductId: number;
  shopifyProductId: string | null;
  shopifyVariantId: string | null;
  pushedAt: string;
  product: ProductDTO;
}

export interface MatchedProductDTO {
  localProduct: ProductDTO;
  shopifyProductId: string;
  shopifyProductTitle: string;
  shopifyProductUrl: string | null;
  shopifyPrice: string | null;
  source: 'imported' | 'matched';
  syncedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ImportJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  successCount: number;
  failedCount: number;
  errors: Array<{ productId: number; error: string }>;
  completedAt?: string;
}
