/**
 * R2 Upload helper utilities.
 */

export interface R2UploadOptions {
  contentType?: string;
  customMetadata?: Record<string, string>;
  sha256?: string;
}

export async function putR2Object(
  bucket: R2Bucket,
  key: string,
  value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
  options?: R2UploadOptions
): Promise<R2Object> {
  const httpMetadata: R2HTTPMetadata = {
    contentType: options?.contentType ?? 'application/octet-stream',
  };

  const r2Object = await bucket.put(key, value, {
    httpMetadata,
    customMetadata: options?.customMetadata,
    sha256: options?.sha256,
  });

  if (!r2Object) {
    throw new Error(`Failed to upload object to R2 at key: ${key}`);
  }

  return r2Object;
}
