import type { UserRole } from './roles.js';

export interface SessionData {
  userId: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  issuedAt: number;
  expiresAt: number;
}

const DEFAULT_TTL_SECONDS = 86400 * 7; // 7 days

/**
 * Derives a CryptoKey for AES-GCM from a secret string using SHA-256.
 */
async function deriveKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  return await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts and serializes session data into a compact base64url-encoded token.
 */
export async function createSessionToken(
  session: Omit<SessionData, 'issuedAt' | 'expiresAt'>,
  secretKey: string,
  ttlSeconds = DEFAULT_TTL_SECONDS
): Promise<string> {
  const now = Date.now();
  const data: SessionData = {
    ...session,
    issuedAt: now,
    expiresAt: now + ttlSeconds * 1000,
  };

  const key = await deriveKey(secretKey);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(data));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );

  // Combine IV (12 bytes) + Ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return uint8ArrayToBase64Url(combined);
}

/**
 * Decrypts and validates a session token. Returns null if invalid or expired.
 */
export async function verifySessionToken(
  token: string,
  secretKey: string
): Promise<SessionData | null> {
  try {
    const combined = base64UrlToUint8Array(token);
    if (combined.length < 12 + 16) {
      return null;
    }

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const key = await deriveKey(secretKey);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    const data: SessionData = JSON.parse(dec.decode(decrypted));

    if (Date.now() > data.expiresAt) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Generates Set-Cookie header value for the session.
 */
export function serializeSessionCookie(
  cookieName: string,
  token: string,
  maxAgeSeconds = DEFAULT_TTL_SECONDS,
  path = '/'
): string {
  return `${cookieName}=${token}; Path=${path}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

/**
 * Parses session token from Request Cookie header.
 */
export function parseSessionCookie(
  cookieHeader: string | null | undefined,
  cookieName: string
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToUint8Array(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
