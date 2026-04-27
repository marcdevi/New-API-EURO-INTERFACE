import { z } from 'zod';

export const emailSchema = z
  .string()
  .email('Email invalide')
  .max(254, 'Email trop long');

export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .max(128, 'Le mot de passe est trop long')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre');

export const siretSchema = z
  .string()
  .regex(/^[0-9]{14}$/, 'Le SIRET doit contenir exactement 14 chiffres')
  .transform((val) => val.replace(/\s/g, ''));

export const vatNumberSchema = z
  .string()
  .regex(/^[A-Z]{2}[A-Z0-9]{2,13}$/, 'Format de TVA intracommunautaire invalide')
  .transform((val) => val.replace(/\s/g, '').toUpperCase());

export const phoneSchema = z
  .string()
  .regex(/^[+]?[0-9\s.-]{6,20}$/, 'Format de téléphone invalide');

export const shopifyDomainSchema = z
  .string()
  .min(1, 'Le domaine Shopify est requis')
  .max(100, 'Le domaine est trop long')
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]?(\.myshopify\.com)?$/,
    'Format de domaine Shopify invalide'
  )
  .transform((val) => val.replace('.myshopify.com', ''));

export const shopifyTokenSchema = z
  .string()
  .min(10, 'Token trop court')
  .max(100, 'Token trop long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Format de token invalide');

export const uuidSchema = z.string().uuid('UUID invalide');

export const productIdSchema = z.number().int().positive('ID produit invalide');

export const productIdsSchema = z
  .array(productIdSchema)
  .min(1, 'Au moins un produit requis')
  .max(100, 'Maximum 100 produits par requête');

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
});

export const productSearchSchema = z.object({
  search: z.string().max(100).optional(),
  categoryId: z.union([z.number().int().positive(), z.literal('all')]).optional(),
  sort: z.enum(['price_asc', 'price_desc']).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
  excludeIds: z.array(z.number().int().positive()).optional(),
});

export const createProfileSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  companyName: z.string().min(1).max(255),
  siret: siretSchema,
  vatNumber: vatNumberSchema.optional(),
  phone: phoneSchema,
  shopifyDomain: shopifyDomainSchema.optional(),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  companyName: z.string().min(1).max(255).optional(),
  siret: siretSchema.optional(),
  vatNumber: vatNumberSchema.optional(),
  phone: phoneSchema.optional(),
  priceCategory: z.enum(['dropshipping', 'A', 'C', 'D', 'remise']).optional(),
});

export const shopifyConfigSchema = z.object({
  shopDomain: shopifyDomainSchema,
  accessToken: shopifyTokenSchema,
});

export const confirmProfileSchema = z.object({
  userId: uuidSchema,
});

export const rejectProfileSchema = z.object({
  userId: uuidSchema,
});

export const setAdminSchema = z.object({
  userId: uuidSchema,
  isAdmin: z.boolean(),
});

export const toggleAccountSchema = z.object({
  userId: uuidSchema,
  enable: z.boolean(),
});

export const cartAddSchema = z.object({
  productIds: productIdsSchema,
});

export const cartRemoveSchema = z.object({
  productIds: productIdsSchema,
});

export const shopifyImportSchema = z.object({
  products: z.array(
    z.object({
      id: z.number().int().positive(),
      price: z.number().min(0),
    })
  ).min(1, 'Au moins un produit requis'),
});

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ProductSearchInput = z.infer<typeof productSearchSchema>;
export type ShopifyConfigInput = z.infer<typeof shopifyConfigSchema>;
export type CartAddInput = z.infer<typeof cartAddSchema>;
export type CartRemoveInput = z.infer<typeof cartRemoveSchema>;
export type ShopifyImportInput = z.infer<typeof shopifyImportSchema>;
