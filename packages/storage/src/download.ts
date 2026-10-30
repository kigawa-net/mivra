/**
 * R2 Download helper utilities.
 */

export async function getR2Object(
  bucket: R2Bucket,
  key: string
): Promise<R2ObjectBody | null> {
  return await bucket.get(key);
}

export async function getR2ObjectText(
  bucket: R2Bucket,
  key: string
): Promise<string | null> {
  const obj = await bucket.get(key);
  if (!obj) return null;
  return await obj.text();
}

export async function getR2ObjectArrayBuffer(
  bucket: R2Bucket,
  key: string
): Promise<ArrayBuffer | null> {
  const obj = await bucket.get(key);
  if (!obj) return null;
  return await obj.arrayBuffer();
}

export async function deleteR2Object(
  bucket: R2Bucket,
  key: string
): Promise<void> {
  await bucket.delete(key);
}
