-- Add OAuth credential columns to shopify_config
-- Allows automatic token refresh without user intervention

ALTER TABLE shopify_config
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS client_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS auth_method TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Index for quick lookup of expired tokens (useful for future batch refresh)
CREATE INDEX IF NOT EXISTS idx_shopify_config_token_expires
  ON shopify_config (token_expires_at)
  WHERE token_expires_at IS NOT NULL;

COMMENT ON COLUMN shopify_config.client_id IS 'Shopify OAuth client ID (public, not sensitive)';
COMMENT ON COLUMN shopify_config.client_secret_encrypted IS 'Shopify OAuth client secret, encrypted with AES-256-GCM';
COMMENT ON COLUMN shopify_config.auth_method IS 'manual = access token saisi directement, oauth = client credentials flow';
COMMENT ON COLUMN shopify_config.token_expires_at IS 'Expiration estimee du access_token (NULL = pas d expiration connue)';
