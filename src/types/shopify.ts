export type AuthMethod = 'manual' | 'oauth' | null;

export interface ShopifyConfig {
  shop_domain: string;
  auth_method: AuthMethod;
  client_id: string | null;
  has_secret: boolean;
  token_expires_at: string | null;
  created_at: string;
}

export interface SaveCredentialsInput {
  shop_domain: string;
  client_id: string;
  client_secret: string;
}

export interface SaveCredentialsResult {
  success: boolean;
  error?: string;
}
