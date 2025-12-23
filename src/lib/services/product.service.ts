import { createSupabaseAdminClient } from '@/lib/supabase/server';
import type { ProductDTO } from '@/types/api';

interface RawProduct {
  id: number;
  nom: string;
  description: string | null;
  SKU_EURO: string | null;
  categorie: number | null;
  IMAGES_PRODUITS: Array<{ image_url: string }>;
  PRIX: {
    Prix_A: number | null;
    Prix_C: number | null;
    Prix_D: number | null;
    Prix_remise: number | null;
  } | Array<{
    Prix_A: number | null;
    Prix_C: number | null;
    Prix_D: number | null;
    Prix_remise: number | null;
  }>;
  CONF_PRODUITS: Array<{ dropshipping: boolean }> | { dropshipping: boolean };
  COLIS: Array<Record<string, unknown>>;
  CATEGORIES: { id: number; categorie_nom: string } | null;
}

export function transformProduct(raw: RawProduct, priceCategory: string): ProductDTO {
  // PRIX peut être un objet ou un array selon la requête Supabase
  const prixData = Array.isArray(raw.PRIX) ? raw.PRIX[0] : raw.PRIX;
  const prix = prixData || {};
  
  const colis = raw.COLIS?.[0] || null;
  
  // CONF_PRODUITS peut être un objet ou un array
  const confData = Array.isArray(raw.CONF_PRODUITS) ? raw.CONF_PRODUITS[0] : raw.CONF_PRODUITS;
  const conf = confData;

  const prices: Record<string, number | null> = {
    Prix_A: prix.Prix_A ?? null,
    Prix_C: prix.Prix_C ?? null,
    Prix_D: prix.Prix_D ?? null,
    Prix_remise: prix.Prix_remise ?? null,
  };

  let displayPrice = 'Prix indisponible';
  if (priceCategory === 'dropshipping') {
    displayPrice = '0.00 €';
  } else {
    const priceKey = `Prix_${priceCategory}`;
    const price = prices[priceKey];
    if (price !== null && price !== undefined) {
      displayPrice = `${price.toFixed(2)} €`;
    }
  }

  return {
    id: raw.id,
    nom: raw.nom,
    skuEuro: raw.SKU_EURO,
    description: raw.description,
    images: raw.IMAGES_PRODUITS?.map((img) => img.image_url) || [],
    category: raw.CATEGORIES
      ? { id: raw.CATEGORIES.id, name: raw.CATEGORIES.categorie_nom }
      : null,
    prices,
    displayPrice,
    dropshippingAllowed: conf?.dropshipping ?? false,
    colis: colis
      ? {
          // Schéma réel: poids_total / poids_colis_1 / long_colis1 / larg_colis1 / haut_colis1
          poids:
            (colis as any).poids_total ??
            (colis as any).poids_colis_1 ??
            (colis as any).poids_colis_2 ??
            (colis as any).poids_colis_3 ??
            (colis as any).poids_colis_4 ??
            null,
          longueur:
            (colis as any).long_colis1 ??
            (colis as any).long_colis2 ??
            (colis as any).long_colis3 ??
            (colis as any).long_colis4 ??
            (colis as any).longueur ??
            null,
          largeur:
            (colis as any).larg_colis1 ??
            (colis as any).larg_colis2 ??
            (colis as any).larg_colis3 ??
            (colis as any).larg_colis4 ??
            (colis as any).largeur ??
            null,
          hauteur:
            (colis as any).haut_colis1 ??
            (colis as any).haut_colis2 ??
            (colis as any).haut_colis3 ??
            (colis as any).haut_colis4 ??
            (colis as any).hauteur ??
            null,
        }
      : null,
  };
}

export async function searchProducts(params: {
  search?: string;
  categoryId?: number | 'all';
  sort?: 'price_asc' | 'price_desc';
  page: number;
  pageSize: number;
  excludeIds?: number[];
  priceCategory: string;
}): Promise<{ products: ProductDTO[]; total: number }> {
  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from('PRODUITS')
    .select(
      `
      id,
      nom,
      description,
      SKU_EURO,
      categorie,
      IMAGES_PRODUITS(image_url),
      PRIX(Prix_A, Prix_C, Prix_D, Prix_remise),
      CONF_PRODUITS(dropshipping),
      COLIS(*),
      CATEGORIES(id, categorie_nom)
    `,
      { count: 'exact' }
    )
    .eq('activite', true);

  if (params.search) {
    const sanitizedSearch = params.search
      .replace(/[%_\\]/g, '\\$&')
      .replace(/['"`;]/g, '')
      .substring(0, 100);
    query = query.or(`nom.ilike.%${sanitizedSearch}%,SKU_EURO.ilike.%${sanitizedSearch}%`);
  }

  if (params.categoryId && params.categoryId !== 'all') {
    query = query.eq('categorie', params.categoryId);
  }

  if (params.excludeIds && params.excludeIds.length > 0) {
    query = query.not('id', 'in', `(${params.excludeIds.join(',')})`);
  }

  const offset = (params.page - 1) * params.pageSize;
  query = query.range(offset, offset + params.pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[ProductService] Search error:', error);
    throw new Error('Erreur lors de la recherche de produits');
  }

  let products = (data || []).map((raw) =>
    transformProduct(raw as unknown as RawProduct, params.priceCategory)
  );

  if (params.sort === 'price_asc') {
    products.sort((a, b) => {
      const priceA = parseFloat(a.displayPrice) || 0;
      const priceB = parseFloat(b.displayPrice) || 0;
      return priceA - priceB;
    });
  } else if (params.sort === 'price_desc') {
    products.sort((a, b) => {
      const priceA = parseFloat(a.displayPrice) || 0;
      const priceB = parseFloat(b.displayPrice) || 0;
      return priceB - priceA;
    });
  }

  return {
    products,
    total: count || 0,
  };
}

export async function searchProductIds(params: {
  search?: string;
  categoryId?: number | 'all';
  sort?: 'price_asc' | 'price_desc';
  excludeIds?: number[];
  priceCategory: string;
}): Promise<number[]> {
  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from('PRODUITS')
    .select('id')
    .eq('activite', true);

  if (params.search) {
    const sanitizedSearch = params.search
      .replace(/[%_\\]/g, '\\$&')
      .replace(/['"`;]/g, '')
      .substring(0, 100);
    query = query.or(`nom.ilike.%${sanitizedSearch}%,SKU_EURO.ilike.%${sanitizedSearch}%`);
  }

  if (params.categoryId && params.categoryId !== 'all') {
    query = query.eq('categorie', params.categoryId);
  }

  if (params.excludeIds && params.excludeIds.length > 0) {
    query = query.not('id', 'in', `(${params.excludeIds.join(',')})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[ProductService] SearchIds error:', error);
    throw new Error('Erreur lors de la recherche de produits');
  }

  // tri (optionnel) : ici on reste simple (pas de tri DB), mais on garde la signature
  // car /api/products/search gère déjà l'ordre côté client.
  return (data || []).map((row: any) => row.id).filter((id: any) => typeof id === 'number');
}

export async function getProductById(
  id: number,
  priceCategory: string
): Promise<ProductDTO | null> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('PRODUITS')
    .select(
      `
      id,
      nom,
      description,
      SKU_EURO,
      categorie,
      IMAGES_PRODUITS(image_url),
      PRIX(Prix_A, Prix_C, Prix_D, Prix_remise),
      CONF_PRODUITS(dropshipping),
      COLIS(*),
      CATEGORIES(id, categorie_nom)
    `
    )
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return transformProduct(data as unknown as RawProduct, priceCategory);
}

export async function getProductsByIds(
  ids: number[],
  priceCategory: string
): Promise<ProductDTO[]> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('PRODUITS')
    .select(
      `
      id,
      nom,
      description,
      SKU_EURO,
      categorie,
      IMAGES_PRODUITS(image_url),
      PRIX(Prix_A, Prix_C, Prix_D, Prix_remise),
      CONF_PRODUITS(dropshipping),
      COLIS(*),
      CATEGORIES(id, categorie_nom)
    `
    )
    .in('id', ids);

  if (error) {
    console.error('[ProductService] GetByIds error:', error);
    throw new Error('Erreur lors de la récupération des produits');
  }

  return (data || []).map((raw) =>
    transformProduct(raw as unknown as RawProduct, priceCategory)
  );
}
