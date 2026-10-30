/**
 * Email address parsing, validation, and formatting helpers.
 */

export interface ParsedAddress {
  address: string;
  displayName: string | null;
  localPart: string;
  domain: string;
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validates standard email address format.
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

/**
 * Extracts domain part from an email address in lowercase.
 */
export function extractDomain(email: string): string | null {
  const atIndex = email.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === email.length - 1) return null;
  return email.slice(atIndex + 1).toLowerCase().trim();
}

/**
 * Parses full name and address header (e.g. `John Doe <john@example.com>` or `john@example.com`).
 */
export function parseEmailAddress(raw: string): ParsedAddress | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Format: "Display Name" <email@domain.com> or Display Name <email@domain.com>
  const angleMatch = trimmed.match(/^(?:"?([^"<]*)"?\s*)?<([^>]+)>$/);
  if (angleMatch) {
    const displayName = angleMatch[1]?.trim() || null;
    const address = angleMatch[2].trim().toLowerCase();
    if (!isValidEmail(address)) return null;

    const [localPart, domain] = address.split('@');
    return { address, displayName, localPart, domain };
  }

  // Format: email@domain.com
  const cleanAddr = trimmed.toLowerCase();
  if (isValidEmail(cleanAddr)) {
    const [localPart, domain] = cleanAddr.split('@');
    return { address: cleanAddr, displayName: null, localPart, domain };
  }

  return null;
}

/**
 * Formats a display name and email address into RFC 5322 string.
 */
export function formatEmailAddress(address: string, displayName?: string | null): string {
  const cleanAddress = address.trim().toLowerCase();
  if (!displayName || !displayName.trim()) {
    return cleanAddress;
  }
  const cleanName = displayName.trim().replace(/"/g, '\\"');
  return `"${cleanName}" <${cleanAddress}>`;
}
