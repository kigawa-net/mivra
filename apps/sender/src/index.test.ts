import { describe, it, expect, vi } from 'vitest';
import sender from './index.js';
import type { Env } from './index.js';
import type { SendQueueMessage } from '@mivra/domain';

describe('mivra-sender Worker', () => {
  const mockCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as ExecutionContext;

  it('should process outbound send job and record delivery event', async () => {
    const sendJob = {
      id: '018f0000-0000-7000-8000-000000000001',
      tenant_id: '018f0000-0000-7000-8000-000000000002',
      mailbox_id: '018f0000-0000-7000-8000-000000000003',
      status: 'queued',
    };

    const mockRun = vi.fn().mockResolvedValue({ success: true });
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(sendJob),
          run: mockRun,
        }),
      }),
    } as unknown as D1Database;

    const mockEnv: Env = {
      DB: mockDb,
      MAIL_STORAGE: {} as R2Bucket,
      ENVIRONMENT: 'test',
      AWS_REGION: 'us-east-1',
    };

    const ack = vi.fn();
    const retry = vi.fn();

    const batch = {
      queue: 'mivra-send-queue',
      messages: [
        {
          id: 'send-msg-1',
          timestamp: new Date(),
          body: {
            sendJobId: sendJob.id,
            tenantId: sendJob.tenant_id,
            mailboxId: sendJob.mailbox_id,
            queuedAt: new Date().toISOString(),
          } as SendQueueMessage,
          ack,
          retry,
        },
      ],
      ackAll: vi.fn(),
      retryAll: vi.fn(),
    } as unknown as MessageBatch<SendQueueMessage>;

    await sender.queue(batch, mockEnv, mockCtx);

    expect(mockRun).toHaveBeenCalled();
    expect(ack).toHaveBeenCalled();
    expect(retry).not.toHaveBeenCalled();
  });
});
