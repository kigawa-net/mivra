import { describe, it, expect } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
  serializeSessionCookie,
  parseSessionCookie,
} from './session.js';
import {
  hasGlobalRoleAtLeast,
  canReadMailbox,
  canSendMailbox,
  canManageTenant,
} from './roles.js';

describe('Auth Package', () => {
  const secretKey = 'test-secret-key-for-mivra-session-token-test';

  describe('Session Token & Cookie Management', () => {
    it('should create and verify encrypted session token', async () => {
      const sessionData = {
        userId: '018f0000-0000-7000-8000-000000000001',
        email: 'user@example.com',
        role: 'mailbox_owner' as const,
        tenantId: '018f0000-0000-7000-8000-000000000002',
      };

      const token = await createSessionToken(sessionData, secretKey, 3600);
      expect(typeof token).toBe('string');

      const verified = await verifySessionToken(token, secretKey);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(sessionData.userId);
      expect(verified?.email).toBe(sessionData.email);
      expect(verified?.role).toBe(sessionData.role);
      expect(verified?.tenantId).toBe(sessionData.tenantId);
    });

    it('should reject token with incorrect secret', async () => {
      const sessionData = {
        userId: '018f0000-0000-7000-8000-000000000001',
        email: 'user@example.com',
        role: 'viewer' as const,
      };

      const token = await createSessionToken(sessionData, secretKey, 3600);
      const verified = await verifySessionToken(token, 'different-secret-key');
      expect(verified).toBeNull();
    });

    it('should reject expired session token', async () => {
      const sessionData = {
        userId: '018f0000-0000-7000-8000-000000000001',
        email: 'user@example.com',
        role: 'viewer' as const,
      };

      // Set negative TTL so it is already expired
      const token = await createSessionToken(sessionData, secretKey, -10);
      const verified = await verifySessionToken(token, secretKey);
      expect(verified).toBeNull();
    });

    it('should serialize and parse session cookie header', () => {
      const cookieStr = serializeSessionCookie('mivra_session', 'sample.token.value', 86400);
      expect(cookieStr).toContain('mivra_session=sample.token.value');
      expect(cookieStr).toContain('HttpOnly');
      expect(cookieStr).toContain('Secure');
      expect(cookieStr).toContain('SameSite=Lax');

      const parsed = parseSessionCookie('other=123; mivra_session=sample.token.value; foo=bar', 'mivra_session');
      expect(parsed).toBe('sample.token.value');
    });
  });

  describe('Role-based Authorization', () => {
    it('should correctly check role hierarchy', () => {
      expect(hasGlobalRoleAtLeast('platform_admin', 'tenant_admin')).toBe(true);
      expect(hasGlobalRoleAtLeast('mailbox_owner', 'tenant_admin')).toBe(false);
      expect(hasGlobalRoleAtLeast('mailbox_member', 'mailbox_member')).toBe(true);
    });

    it('should verify mailbox read permissions', () => {
      expect(canReadMailbox('platform_admin', null)).toBe(true);
      expect(canReadMailbox('viewer', 'member')).toBe(true);
      expect(canReadMailbox('viewer', null)).toBe(false);
    });

    it('should verify mailbox send permissions', () => {
      expect(canSendMailbox('viewer', 'member')).toBe(true);
      expect(canSendMailbox('viewer', 'viewer')).toBe(false);
      expect(canSendMailbox('viewer', null)).toBe(false);
    });

    it('should verify tenant management permissions', () => {
      expect(canManageTenant('platform_admin')).toBe(true);
      expect(canManageTenant('tenant_admin')).toBe(true);
      expect(canManageTenant('mailbox_owner')).toBe(false);
    });
  });
});
