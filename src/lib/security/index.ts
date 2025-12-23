import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

function getEncryptionKey(): Buffer | null {
  const key = process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    return null;
  }
  return scryptSync(key, 'eurodesign-salt', 32);
}

export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  // Rétrocompatibilité: si pas de clé valide, on stocke en clair.
  if (!key) return plaintext;
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptToken(encryptedData: string): string {
  const parts = encryptedData.split(':');
  
  // Si ça ne ressemble pas au format iv:tag:cipher => on considère que c'est un token en clair (legacy).
  if (parts.length !== 3) {
    return encryptedData;
  }
  
  const key = getEncryptionKey();
  // Si pas de clé valide, on ne peut pas déchiffrer => fallback legacy.
  // (Si des tokens sont réellement chiffrés, il faudra fournir la clé pour les déchiffrer.)
  if (!key) {
    return encryptedData;
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function sanitizeString(input: string, maxLength = 255): string {
  if (typeof input !== 'string') return '';
  
  let sanitized = input.trim().replace(/[\x00-\x1F\x7F]/g, '');
  
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export interface SecurityLogEntry {
  timestamp: string;
  event: string;
  userId?: string;
  ip?: string;
  route?: string;
  reason?: string;
  details?: Record<string, unknown>;
}

export function securityLog(
  event: string,
  details: Omit<SecurityLogEntry, 'timestamp' | 'event'>
): void {
  const logEntry: SecurityLogEntry = {
    timestamp: new Date().toISOString(),
    event,
    ...details,
  };

  if (process.env.NODE_ENV === 'production') {
    console.log('[SECURITY]', JSON.stringify(logEntry));
  } else {
    console.log('[SECURITY]', logEntry);
  }
}

export function detectSuspiciousPatterns(input: string): boolean {
  const suspiciousPatterns = [
    /\.\.\//,
    /<script/i,
    /union.*select/i,
    /eval\(/i,
    /exec\(/i,
    /\$\{.*\}/,
    /javascript:/i,
    /on\w+\s*=/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(input));
}

export function isValidShopifyDomain(domain: string): boolean {
  if (typeof domain !== 'string') return false;
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]?(\.myshopify\.com)?$/;
  return domainRegex.test(domain) && domain.length <= 100;
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}
