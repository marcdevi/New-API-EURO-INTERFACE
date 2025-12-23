-- Eurodesign Pro RLS Policies
-- Row Level Security for all tables

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE panier_dropshipping ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CATEGORIES" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PRODUITS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IMAGES_PRODUITS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PRIX" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CONF_PRODUITS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "COLIS" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    -- Prevent users from modifying admin/confirmed status
    is_admin = (SELECT is_admin FROM profiles WHERE user_id = auth.uid()) AND
    confirmed = (SELECT confirmed FROM profiles WHERE user_id = auth.uid()) AND
    rejected = (SELECT rejected FROM profiles WHERE user_id = auth.uid())
  );

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- Service role can insert profiles (for registration)
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (TRUE);

-- ============================================
-- SHOPIFY_CONFIG POLICIES
-- ============================================

-- Users can read their own Shopify config
CREATE POLICY "Users can read own shopify config"
  ON shopify_config FOR SELECT
  USING (id = auth.uid());

-- Users can insert their own Shopify config
CREATE POLICY "Users can insert own shopify config"
  ON shopify_config FOR INSERT
  WITH CHECK (id = auth.uid());

-- Users can update their own Shopify config
CREATE POLICY "Users can update own shopify config"
  ON shopify_config FOR UPDATE
  USING (id = auth.uid());

-- ============================================
-- PANIER_DROPSHIPPING POLICIES
-- ============================================

-- Users can read their own cart
CREATE POLICY "Users can read own cart"
  ON panier_dropshipping FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert into their own cart
CREATE POLICY "Users can insert into own cart"
  ON panier_dropshipping FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own cart
CREATE POLICY "Users can update own cart"
  ON panier_dropshipping FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete from their own cart
CREATE POLICY "Users can delete from own cart"
  ON panier_dropshipping FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- SHOPIFY_LISTINGS POLICIES
-- ============================================

-- Users can read their own listings
CREATE POLICY "Users can read own listings"
  ON shopify_listings FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own listings
CREATE POLICY "Users can insert own listings"
  ON shopify_listings FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own listings
CREATE POLICY "Users can update own listings"
  ON shopify_listings FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================
-- PRODUCT CATALOG POLICIES (Read-only for confirmed users)
-- ============================================

-- Confirmed users can read categories
CREATE POLICY "Confirmed users can read categories"
  ON "CATEGORIES" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND confirmed = TRUE
    )
  );

-- Confirmed users can read products
CREATE POLICY "Confirmed users can read products"
  ON "PRODUITS" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND confirmed = TRUE
    )
  );

-- Confirmed users can read product images
CREATE POLICY "Confirmed users can read product images"
  ON "IMAGES_PRODUITS" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND confirmed = TRUE
    )
  );

-- Confirmed users can read prices
CREATE POLICY "Confirmed users can read prices"
  ON "PRIX" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND confirmed = TRUE
    )
  );

-- Confirmed users can read product config
CREATE POLICY "Confirmed users can read product config"
  ON "CONF_PRODUITS" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND confirmed = TRUE
    )
  );

-- Confirmed users can read packages
CREATE POLICY "Confirmed users can read packages"
  ON "COLIS" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND confirmed = TRUE
    )
  );

-- ============================================
-- ADMIN POLICIES FOR CATALOG MANAGEMENT
-- ============================================

-- Admins can manage categories
CREATE POLICY "Admins can manage categories"
  ON "CATEGORIES" FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- Admins can manage products
CREATE POLICY "Admins can manage products"
  ON "PRODUITS" FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- Admins can manage product images
CREATE POLICY "Admins can manage product images"
  ON "IMAGES_PRODUITS" FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- Admins can manage prices
CREATE POLICY "Admins can manage prices"
  ON "PRIX" FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- Admins can manage product config
CREATE POLICY "Admins can manage product config"
  ON "CONF_PRODUITS" FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- Admins can manage packages
CREATE POLICY "Admins can manage packages"
  ON "COLIS" FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );
