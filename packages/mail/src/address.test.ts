import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  extractDomain,
  parseEmailAddress,
  formatEmailAddress,
} from './address.js';
import { generateMessageId, normalizeMessageId } from './message-id.js';

describe('Mail Package', () => {
  describe('Address Utilities', () => {
    it('should validate valid and invalid email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('first.last+tag@sub.domain.org')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
    });

    it('should extract lowercase domain from email', () => {
      expect(extractDomain('user@EXAMPLE.COM')).toBe('example.com');
      expect(extractDomain('invalid')).toBeNull();
    });

    it('should parse addresses with display names and angles', () => {
      const parsed = parseEmailAddress('Jane Doe <jane@example.com>');
      expect(parsed).toEqual({
        displayName: 'Jane Doe',
        address: 'jane@example.com',
        localPart: 'jane',
        domain: 'example.com',
      });

      const simple = parseEmailAddress('simple@example.com');
      expect(simple).toEqual({
        displayName: null,
        address: 'simple@example.com',
        localPart: 'simple',
        domain: 'example.com',
      });
    });

    it('should format address with display name', () => {
      expect(formatEmailAddress('user@example.com', 'Alice Smith')).toBe(
        '"Alice Smith" <user@example.com>'
      );
      expect(formatEmailAddress('user@example.com')).toBe('user@example.com');
    });
  });

  describe('Message-ID Utilities', () => {
    it('should generate compliant Message-ID header', () => {
      const msgId = generateMessageId('example.com');
      expect(msgId).toMatch(/^<[0-9a-f-]+@example\.com>$/);

      const normalized = normalizeMessageId(msgId);
      expect(normalized).not.toBeNull();
      expect(normalized?.endsWith('@example.com')).toBe(true);
      expect(normalized?.startsWith('<')).toBe(false);
    });
  });
});
