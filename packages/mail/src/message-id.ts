import { generateUuidV7 } from '@mivra/domain';

/**
 * Message-ID utilities conforming to RFC 5322 Section 3.6.4.
 */

/**
 * Generates an RFC 5322 compliant Message-ID header value using UUIDv7 and domain.
 * Format: `<{uuidv7}@{domain}>`
 */
export function generateMessageId(domain: string): string {
  const cleanDomain = domain.trim().toLowerCase().replace(/^@+/, '');
  const id = generateUuidV7();
  return `<${id}@${cleanDomain}>`;
}

/**
 * Normalizes and extracts raw identifier from a Message-ID header string (removing `< >`).
 */
export function normalizeMessageId(headerValue?: string | null): string | null {
  if (!headerValue) return null;
  const match = headerValue.trim().match(/^<?([^>]+)>?$/);
  return match ? match[1].trim() : headerValue.trim();
}
