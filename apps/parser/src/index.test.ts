import { describe, it, expect, vi } from 'vitest';
import parser from './index.js';
import type { Env } from './index.js';
import type { ReceiveQueueMessage } from '@mivra/domain';

describe('mivra-parser Worker', () => {
  const mockCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as ExecutionContext;

  it('should process queue message and extract body parts', async () => {
    const rawEml = 'Subject: Test Notification\r\nFrom: sys@example.com\r\n\r\nHello World Message Body';

    const mockRun = vi.fn().mockResolvedValue({ success: true });
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ run: mockRun }),
      }),
    } as unknown as D1Database;

    const mockGet = vi.fn().mockResolvedValue({
      text: vi.fn().mockResolvedValue(rawEml),
    });
    const mockPut = vi.fn().mockResolvedValue({ key: 'sample' });
    const mockStorage = { get: mockGet, put: mockPut } as unknown as R2Bucket;

    const mockEnv: Env = {
      DB: mockDb,
      MAIL_STORAGE: mockStorage,
      ENVIRONMENT: 'test',
    };

    const ack = vi.fn();
    const retry = vi.fn();

    const batch = {
      queue: 'mivra-receive-queue',
      messages: [
        {
          id: 'msg-1',
          timestamp: new Date(),
          body: {
            messageId: '018f0000-0000-7000-8000-000000000001',
            tenantId: '018f0000-0000-7000-8000-000000000002',
            mailboxIds: ['018f0000-0000-7000-8000-000000000003'],
            r2RawKey: 'tenants/018f0000-0000-7000-8000-000000000002/messages/018f0000-0000-7000-8000-000000000001/raw.eml',
            receivedAt: new Date().toISOString(),
          } as ReceiveQueueMessage,
          ack,
          retry,
        },
      ],
      ackAll: vi.fn(),
      retryAll: vi.fn(),
    } as unknown as MessageBatch<ReceiveQueueMessage>;

    await parser.queue(batch, mockEnv, mockCtx);

    expect(mockGet).toHaveBeenCalledWith(
      'tenants/018f0000-0000-7000-8000-000000000002/messages/018f0000-0000-7000-8000-000000000001/raw.eml'
    );
    expect(mockPut).toHaveBeenCalledTimes(2); // body.txt and body.html
    expect(ack).toHaveBeenCalled();
    expect(retry).not.toHaveBeenCalled();
  });
});
