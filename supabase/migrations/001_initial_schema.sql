-- Eurodesign Pro Database Schema
-- Initial migration for core tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  siret TEXT,
  vat_number TEXT,
  company_phone TEXT,
  confirmed BOOLEAN DEFAULT FALSE,
  rejected BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  price_category TEXT DEFAULT 'A',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopify configuration table (encrypted token storage)
CREATE TABLE IF NOT EXISTS shopify_config (
  id UUID PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
  shop_domain TEXT,
  access_token_encrypted TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopping cart table
CREATE TABLE IF NOT EXISTS panier_dropshipping (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL,
  produit_sku TEXT,
  image TEXT,
  nom TEXT,
  prix_dropshipping DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Shopify listings table (tracks imported products)
CREATE TABLE IF NOT EXISTS shopify_listings (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  local_product_id INTEGER NOT NULL,
  shopify_product_id TEXT,
  shopify_variant_id TEXT,
  pushed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, local_product_id)
);

-- Categories table
CREATE TABLE IF NOT EXISTS "CATEGORIES" (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS "PRODUITS" (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  sku_euro TEXT,
  category_id INTEGER REFERENCES "CATEGORIES"(id),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product images table
CREATE TABLE IF NOT EXISTS "IMAGES_PRODUITS" (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES "PRODUITS"(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER DEFAULT 0
);

-- Product prices table (supports multiple price categories)
CREATE TABLE IF NOT EXISTS "PRIX" (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES "PRODUITS"(id) ON DELETE CASCADE,
  price_category TEXT NOT NULL DEFAULT 'A',
  prix DECIMAL(10, 2) NOT NULL,
  prix_promo DECIMAL(10, 2),
  UNIQUE(product_id, price_category)
);

-- Product configuration table
CREATE TABLE IF NOT EXISTS "CONF_PRODUITS" (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES "PRODUITS"(id) ON DELETE CASCADE,
  poids DECIMAL(10, 3),
  dimensions TEXT,
  couleur TEXT,
  materiau TEXT
);

-- Packages table
CREATE TABLE IF NOT EXISTS "COLIS" (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES "PRODUITS"(id) ON DELETE CASCADE,
  poids DECIMAL(10, 3),
  longueur DECIMAL(10, 2),
  largeur DECIMAL(10, 2),
  hauteur DECIMAL(10, 2),
  nombre_colis INTEGER DEFAULT 1
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_confirmed ON profiles(confirmed);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_panier_user_id ON panier_dropshipping(user_id);
CREATE INDEX IF NOT EXISTS idx_shopify_listings_user_id ON shopify_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_produits_category ON "PRODUITS"(category_id);
CREATE INDEX IF NOT EXISTS idx_produits_active ON "PRODUITS"(active);
CREATE INDEX IF NOT EXISTS idx_images_product_id ON "IMAGES_PRODUITS"(product_id);
CREATE INDEX IF NOT EXISTS idx_prix_product_id ON "PRIX"(product_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopify_config_updated_at
  BEFORE UPDATE ON shopify_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_produits_updated_at
  BEFORE UPDATE ON "PRODUITS"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
