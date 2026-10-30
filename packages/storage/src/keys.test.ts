import { describe, it, expect } from 'vitest';
import { StorageKeys } from './keys.js';

describe('Storage Keys', () => {
  const tenantId = '018f0000-0000-7000-8000-000000000001';
  const messageId = '018f0000-0000-7000-8000-000000000002';
  const attachmentId = '018f0000-0000-7000-8000-000000000003';
  const sendJobId = '018f0000-0000-7000-8000-000000000004';

  it('should generate expected raw message key', () => {
    const key = StorageKeys.rawMessage(tenantId, messageId);
    expect(key).toBe(`tenants/${tenantId}/messages/${messageId}/raw.eml`);
  });

  it('should generate expected parsed text and html keys', () => {
    expect(StorageKeys.messageBodyText(tenantId, messageId)).toBe(
      `tenants/${tenantId}/messages/${messageId}/body.txt`
    );
    expect(StorageKeys.messageBodyHtml(tenantId, messageId)).toBe(
      `tenants/${tenantId}/messages/${messageId}/body.html`
    );
  });

  it('should generate expected attachment key', () => {
    const key = StorageKeys.attachment(tenantId, messageId, attachmentId);
    expect(key).toBe(
      `tenants/${tenantId}/messages/${messageId}/attachments/${attachmentId}`
    );
  });

  it('should generate expected outbound message key', () => {
    const key = StorageKeys.outboundRawMessage(tenantId, sendJobId);
    expect(key).toBe(`tenants/${tenantId}/outbound/${sendJobId}/raw.eml`);
  });

  it('should parse message keys accurately', () => {
    const parsed = StorageKeys.parseKey(`tenants/${tenantId}/messages/${messageId}/raw.eml`);
    expect(parsed).toEqual({
      tenantId,
      type: 'message',
      id: messageId,
      part: 'raw',
    });

    const parsedAttach = StorageKeys.parseKey(
      `tenants/${tenantId}/messages/${messageId}/attachments/${attachmentId}`
    );
    expect(parsedAttach).toEqual({
      tenantId,
      type: 'message',
      id: messageId,
      part: 'attachment',
      attachmentId,
    });
  });
});
