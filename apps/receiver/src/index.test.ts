import { describe, it, expect, vi } from 'vitest';
import receiver from './index.js';
import type { Env } from './index.js';

describe('mivra-receiver Worker', () => {
  const mockCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as ExecutionContext;

  it('should reject email if recipient mailbox is not found', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) }),
      }),
    } as unknown as D1Database;

    const mockEnv: Env = {
      DB: mockDb,
      MAIL_STORAGE: {} as R2Bucket,
      RECEIVE_QUEUE: { send: vi.fn() } as unknown as Queue,
      ENVIRONMENT: 'test',
    };

    const setReject = vi.fn();
    const mockEmailMsg = {
      from: 'sender@external.com',
      to: 'unknown@example.com',
      headers: new Headers(),
      raw: new ReadableStream(),
      rawSize: 1024,
      setReject,
    } as unknown as ForwardableEmailMessage;

    await receiver.email(mockEmailMsg, mockEnv, mockCtx);

    expect(setReject).toHaveBeenCalledWith(expect.stringContaining('Recipient address not found'));
  });

  it('should store raw email and enqueue parse job for valid recipient', async () => {
    const mailbox = {
      id: '018f0000-0000-7000-8000-000000000001',
      tenant_id: '018f0000-0000-7000-8000-000000000002',
      address: 'user@example.com',
      quota_bytes: 10000000,
      used_bytes: 0,
      status: 'active',
    };

    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mailbox),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const mockPut = vi.fn().mockResolvedValue({ key: 'test-key' });
    const mockStorage = { put: mockPut } as unknown as R2Bucket;

    const mockSend = vi.fn().mockResolvedValue(undefined);
    const mockQueue = { send: mockSend } as unknown as Queue;

    const mockEnv: Env = {
      DB: mockDb,
      MAIL_STORAGE: mockStorage,
      RECEIVE_QUEUE: mockQueue,
      ENVIRONMENT: 'test',
    };

    const headers = new Headers();
    headers.set('subject', 'Hello Mivra');
    headers.set('message-id', '<test@external.com>');

    const mockEmailMsg = {
      from: 'sender@external.com',
      to: 'User <user@example.com>',
      headers,
      raw: new ReadableStream(),
      rawSize: 2048,
      setReject: vi.fn(),
    } as unknown as ForwardableEmailMessage;

    await receiver.email(mockEmailMsg, mockEnv, mockCtx);

    expect(mockPut).toHaveBeenCalledWith(
      expect.stringContaining('tenants/018f0000-0000-7000-8000-000000000002/messages/'),
      expect.anything(),
      expect.objectContaining({
        httpMetadata: { contentType: 'message/rfc822' },
        customMetadata: expect.objectContaining({
          from: 'sender@external.com',
          to: 'User <user@example.com>',
        }),
      })
    );

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: mailbox.tenant_id,
        mailboxIds: [mailbox.id],
      })
    );
  });
});
