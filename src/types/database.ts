export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          company_name: string | null;
          siret: string | null;
          vat_number: string | null;
          company_phone: string | null;
          confirmed: boolean;
          rejected: boolean;
          is_admin: boolean;
          price_category: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          company_name?: string | null;
          siret?: string | null;
          vat_number?: string | null;
          company_phone?: string | null;
          confirmed?: boolean;
          rejected?: boolean;
          is_admin?: boolean;
          price_category?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          company_name?: string | null;
          siret?: string | null;
          vat_number?: string | null;
          company_phone?: string | null;
          confirmed?: boolean;
          rejected?: boolean;
          is_admin?: boolean;
          price_category?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      shopify_config: {
        Row: {
          id: string;
          shop_domain: string | null;
          access_token_encrypted: string | null;
          client_id: string | null;
          client_secret_encrypted: string | null;
          auth_method: string | null;
          token_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          shop_domain?: string | null;
          access_token_encrypted?: string | null;
          client_id?: string | null;
          client_secret_encrypted?: string | null;
          auth_method?: string | null;
          token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_domain?: string | null;
          access_token_encrypted?: string | null;
          client_id?: string | null;
          client_secret_encrypted?: string | null;
          auth_method?: string | null;
          token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      panier_dropshipping: {
        Row: {
          id: number;
          user_id: string;
          product_id: number;
          added_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          product_id: number;
          added_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          product_id?: number;
          added_at?: string;
        };
      };
      shopify_listings: {
        Row: {
          id: number;
          user_id: string;
          local_product_id: number;
          shopify_product_id: string | null;
          shopify_variant_id: string | null;
          pushed_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          local_product_id: number;
          shopify_product_id?: string | null;
          shopify_variant_id?: string | null;
          pushed_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          local_product_id?: number;
          shopify_product_id?: string | null;
          shopify_variant_id?: string | null;
          pushed_at?: string;
        };
      };
      PRODUITS: {
        Row: {
          id: number;
          nom: string;
          description: string | null;
          SKU_EURO: string | null;
          categorie: number | null;
          activite: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          nom: string;
          description?: string | null;
          SKU_EURO?: string | null;
          categorie?: number | null;
          activite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          nom?: string;
          description?: string | null;
          SKU_EURO?: string | null;
          categorie?: number | null;
          activite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      CATEGORIES: {
        Row: {
          id: number;
          categorie_nom: string;
        };
        Insert: {
          id?: number;
          categorie_nom: string;
        };
        Update: {
          id?: number;
          categorie_nom?: string;
        };
      };
      IMAGES_PRODUITS: {
        Row: {
          id: number;
          produit_id: number;
          image_url: string;
        };
        Insert: {
          id?: number;
          produit_id: number;
          image_url: string;
        };
        Update: {
          id?: number;
          produit_id?: number;
          image_url?: string;
        };
      };
      PRIX: {
        Row: {
          id: number;
          produit_id: number;
          Prix_A: number | null;
          Prix_C: number | null;
          Prix_D: number | null;
          Prix_remise: number | null;
        };
        Insert: {
          id?: number;
          produit_id: number;
          Prix_A?: number | null;
          Prix_C?: number | null;
          Prix_D?: number | null;
          Prix_remise?: number | null;
        };
        Update: {
          id?: number;
          produit_id?: number;
          Prix_A?: number | null;
          Prix_C?: number | null;
          Prix_D?: number | null;
          Prix_remise?: number | null;
        };
      };
      CONF_PRODUITS: {
        Row: {
          id: number;
          produit_id: number;
          dropshipping: boolean;
        };
        Insert: {
          id?: number;
          produit_id: number;
          dropshipping?: boolean;
        };
        Update: {
          id?: number;
          produit_id?: number;
          dropshipping?: boolean;
        };
      };
      COLIS: {
        Row: {
          id: number;
          produit_id: number;
          poids: number | null;
          longueur: number | null;
          largeur: number | null;
          hauteur: number | null;
        };
        Insert: {
          id?: number;
          produit_id: number;
          poids?: number | null;
          longueur?: number | null;
          largeur?: number | null;
          hauteur?: number | null;
        };
        Update: {
          id?: number;
          produit_id?: number;
          poids?: number | null;
          longueur?: number | null;
          largeur?: number | null;
          hauteur?: number | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
