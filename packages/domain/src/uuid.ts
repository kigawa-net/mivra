/**
 * UUIDv7 implementation conforming to RFC 9562.
 * UUIDv7 encodes a 48-bit Unix timestamp (in milliseconds) at the beginning,
 * followed by version 7 (0b0111) and variant 1 (0b10), ensuring time-ordered sortability.
 */

let lastTimestamp = -1;
let sequenceCounter = 0;

/**
 * Generates a standard RFC 9562 UUIDv7 string.
 * Supports monotonic sequence counting within the same millisecond.
 */
export function generateUuidV7(timestampMs?: number): string {
  let now = timestampMs ?? Date.now();

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  if (timestampMs !== undefined) {
    sequenceCounter = (sequenceCounter + 1) & 0x0fff;
  } else {
    if (now > lastTimestamp) {
      lastTimestamp = now;
      sequenceCounter = ((bytes[6] << 8) | bytes[7]) & 0x03ff;
    } else {
      now = lastTimestamp;
      sequenceCounter = (sequenceCounter + 1) & 0x0fff;
      if (sequenceCounter === 0) {
        now = ++lastTimestamp;
      }
    }
  }

  // timestamp (48 bits / 6 bytes)
  bytes[0] = (now / 0x10000000000) & 0xff;
  bytes[1] = (now / 0x100000000) & 0xff;
  bytes[2] = (now / 0x1000000) & 0xff;
  bytes[3] = (now / 0x10000) & 0xff;
  bytes[4] = (now / 0x100) & 0xff;
  bytes[5] = now & 0xff;

  // version 7 (4 bits) + 12-bit sequence
  bytes[6] = 0x70 | ((sequenceCounter >> 8) & 0x0f);
  bytes[7] = sequenceCounter & 0xff;

  // variant (2 bits: 0b10) + remaining random bits
  bytes[8] = 0x80 | (bytes[8] & 0x3f);

  // Format to standard 8-4-4-4-12 hex string
  return formatUuid(bytes);
}

/**
 * Validates whether a given string is a valid UUIDv7 format.
 */
export function isUuidV7(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Extracts the Unix timestamp in milliseconds from a UUIDv7.
 */
export function extractTimestampFromUuidV7(uuid: string): number {
  if (!isUuidV7(uuid)) {
    throw new Error(`Invalid UUIDv7: ${uuid}`);
  }
  const cleanHex = uuid.replace(/-/g, '').slice(0, 12);
  return parseInt(cleanHex, 16);
}

function formatUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
