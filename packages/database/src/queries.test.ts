import { describe, it, expect, vi } from 'vitest';
import { queries } from './queries.js';

describe('Database Queries', () => {
  it('should find user by OIDC issuer and subject', async () => {
    const mockFirst = vi.fn().mockResolvedValue({
      id: '018f0000-0000-7000-8000-000000000001',
      email: 'user@example.com',
      oidc_issuer: 'https://auth.example.com',
      oidc_subject: 'sub-123',
    });
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDb = { prepare: mockPrepare } as unknown as D1Database;

    const user = await queries.findUserByOidc(mockDb, 'https://auth.example.com', 'sub-123');

    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM users WHERE oidc_issuer = ?'));
    expect(mockBind).toHaveBeenCalledWith('https://auth.example.com', 'sub-123');
    expect(user?.email).toBe('user@example.com');
  });

  it('should list mailbox messages with pagination cursor', async () => {
    const mockAll = vi.fn().mockResolvedValue({
      results: [
        {
          id: '018f0000-0000-7000-8000-000000000002',
          mailbox_id: 'mbx-1',
          subject: 'Test Subject',
          folder: 'inbox',
        },
      ],
    });
    const mockBind = vi.fn().mockReturnValue({ all: mockAll });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDb = { prepare: mockPrepare } as unknown as D1Database;

    const results = await queries.listMailboxMessages(mockDb, 'mbx-1', 'inbox', 10, '2026-01-01T00:00:00.000Z');

    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('AND mm.created_at < ?'));
    expect(mockBind).toHaveBeenCalledWith('mbx-1', 'inbox', '2026-01-01T00:00:00.000Z', 10);
    expect(results).toHaveLength(1);
    expect(results[0].subject).toBe('Test Subject');
  });
});
