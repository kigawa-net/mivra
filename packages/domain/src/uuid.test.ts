import { describe, it, expect } from 'vitest';
import { generateUuidV7, isUuidV7, extractTimestampFromUuidV7 } from './uuid.js';

describe('UUIDv7 Generator', () => {
  it('should generate valid UUIDv7 format', () => {
    const id = generateUuidV7();
    expect(isUuidV7(id)).toBe(true);
  });

  it('should generate monotonically increasing IDs over time', () => {
    const t1 = 1700000000000;
    const t2 = 1700000001000;
    const id1 = generateUuidV7(t1);
    const id2 = generateUuidV7(t2);

    expect(id1 < id2).toBe(true);
    expect(extractTimestampFromUuidV7(id1)).toBe(t1);
    expect(extractTimestampFromUuidV7(id2)).toBe(t2);
  });

  it('should maintain monotonicity within same millisecond', () => {
    const t = 1700000000000;
    const ids = Array.from({ length: 10 }, () => generateUuidV7(t));

    for (let i = 0; i < ids.length - 1; i++) {
      expect(ids[i] < ids[i + 1]).toBe(true);
    }
  });

  it('should reject invalid UUIDs', () => {
    expect(isUuidV7('invalid-uuid')).toBe(false);
    expect(isUuidV7('00000000-0000-4000-8000-000000000000')).toBe(false); // v4, not v7
  });
});
