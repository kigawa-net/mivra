import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor, paginateResults } from './pagination.js';
import { formatErrorResponse } from './errors.js';
import { NotFoundError, ValidationError } from '@mivra/domain';

describe('API Package', () => {
  describe('Pagination Cursor', () => {
    it('should encode and decode cursor correctly', () => {
      const timestamp = '2026-10-30T12:00:00.000Z';
      const id = '018f0000-0000-7000-8000-000000000001';

      const cursor = encodeCursor(timestamp, id);
      expect(typeof cursor).toBe('string');

      const decoded = decodeCursor(cursor);
      expect(decoded).toEqual({ createdAt: timestamp, id });
    });

    it('should return null for invalid cursor', () => {
      expect(decodeCursor(null)).toBeNull();
      expect(decodeCursor('invalid-cursor-string')).toBeNull();
    });

    it('should paginate items with nextCursor when hasMore is true', () => {
      const items = [
        { id: '1', created_at: '2026-10-30T10:00:00.000Z' },
        { id: '2', created_at: '2026-10-30T09:00:00.000Z' },
        { id: '3', created_at: '2026-10-30T08:00:00.000Z' },
      ];

      const paginated = paginateResults(items, 2);
      expect(paginated.items).toHaveLength(2);
      expect(paginated.hasMore).toBe(true);
      expect(paginated.nextCursor).not.toBeNull();

      const decoded = decodeCursor(paginated.nextCursor);
      expect(decoded?.id).toBe('2');
    });

    it('should indicate hasMore=false when items fit within limit', () => {
      const items = [
        { id: '1', created_at: '2026-10-30T10:00:00.000Z' },
      ];

      const paginated = paginateResults(items, 2);
      expect(paginated.items).toHaveLength(1);
      expect(paginated.hasMore).toBe(false);
      expect(paginated.nextCursor).toBeNull();
    });
  });

  describe('Error Response Formatter', () => {
    it('should format DomainError with custom status code', async () => {
      const err = new NotFoundError('Mailbox', 'mbx-123');
      const res = formatErrorResponse(err);

      expect(res.status).toBe(404);
      const data = (await res.json()) as { success: boolean; error: { code: string; details: { identifier: string } } };
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.details.identifier).toBe('mbx-123');
    });

    it('should format ValidationError with 400', async () => {
      const err = new ValidationError('Invalid inputs', { email: ['Invalid email format'] });
      const res = formatErrorResponse(err);

      expect(res.status).toBe(400);
      const data = (await res.json()) as { success: boolean; error: { code: string } };
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
