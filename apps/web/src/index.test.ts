import { describe, it, expect, vi } from 'vitest';
import worker from './index.js';
import type { Env } from './routes.js';
import { createSessionToken } from '@mivra/auth';

describe('mivra-web Worker', () => {
  const secret = 'test-session-secret-key-1234567890';
  const mockEnv: Env = {
    DB: {} as D1Database,
    MAIL_STORAGE: {} as R2Bucket,
    SEND_QUEUE: { send: vi.fn() } as unknown as Queue,
    ENVIRONMENT: 'test',
    KEYCLOAK_ISSUER_URL: 'http://localhost:8080/realms/mivra',
    KEYCLOAK_CLIENT_ID: 'mivra-web',
    COOKIE_NAME: 'mivra_session',
    SESSION_SECRET: secret,
  };
  const mockCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as ExecutionContext;

  it('should respond to health check request', async () => {
    const req = new Request('https://mail.example.com/health');
    const res = await worker.fetch(req, mockEnv, mockCtx);

    expect(res.status).toBe(200);
    const data = (await res.json()) as { status: string; service: string };
    expect(data.status).toBe('healthy');
    expect(data.service).toBe('mivra-web');
  });

  it('should reject unauthenticated /api/v1/me request with 401', async () => {
    const req = new Request('https://mail.example.com/api/v1/me');
    const res = await worker.fetch(req, mockEnv, mockCtx);

    expect(res.status).toBe(401);
    const data = (await res.json()) as { success: boolean; error: { code: string } };
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('should authenticate valid session cookie on /api/v1/me', async () => {
    const token = await createSessionToken(
      {
        userId: '018f0000-0000-7000-8000-000000000001',
        email: 'user@example.com',
        role: 'mailbox_owner',
      },
      secret
    );

    const mockFirst = vi.fn().mockResolvedValue({
      id: '018f0000-0000-7000-8000-000000000001',
      email: 'user@example.com',
      name: 'User One',
      role: 'mailbox_owner',
      status: 'active',
    });
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ first: mockFirst }),
      }),
    } as unknown as D1Database;

    const envWithDb: Env = { ...mockEnv, DB: mockDb };
    const req = new Request('https://mail.example.com/api/v1/me', {
      headers: { Cookie: `mivra_session=${token}` },
    });

    const res = await worker.fetch(req, envWithDb, mockCtx);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { success: boolean; data: { email: string } };
    expect(data.success).toBe(true);
    expect(data.data.email).toBe('user@example.com');
  });
});
