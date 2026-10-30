/**
 * Cursor-based pagination utilities for list APIs.
 */

export interface CursorPayload {
  createdAt: string;
  id: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Encodes timestamp and ID into an opaque base64url cursor.
 */
export function encodeCursor(createdAt: string, id: string): string {
  const payload: CursorPayload = { createdAt, id };
  const jsonStr = JSON.stringify(payload);
  const binary = new TextEncoder().encode(jsonStr);
  let str = '';
  for (let i = 0; i < binary.length; i++) {
    str += String.fromCharCode(binary[i]);
  }
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decodes an opaque base64url cursor back into timestamp and ID.
 */
export function decodeCursor(cursor?: string | null): CursorPayload | null {
  if (!cursor) return null;
  try {
    let base64 = cursor.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const jsonStr = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(jsonStr) as CursorPayload;

    if (typeof parsed.createdAt === 'string' && typeof parsed.id === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Wraps a fetched array of items (queried with limit + 1) into a PaginatedResult.
 */
export function paginateResults<T extends { id: string; created_at?: string; createdAt?: string }>(
  items: T[],
  limit: number
): PaginatedResult<T> {
  const hasMore = items.length > limit;
  const slicedItems = hasMore ? items.slice(0, limit) : items;

  let nextCursor: string | null = null;
  if (hasMore && slicedItems.length > 0) {
    const lastItem = slicedItems[slicedItems.length - 1];
    const createdAt = lastItem.created_at ?? lastItem.createdAt ?? new Date().toISOString();
    nextCursor = encodeCursor(createdAt, lastItem.id);
  }

  return {
    items: slicedItems,
    nextCursor,
    hasMore,
  };
}
