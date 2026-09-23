/**
 * @file uiIconAssetUtils.ts
 * @input HTTP response payloads for UI icon assets
 * @output Validated WebP blobs for persistent storage and rendering
 * @pos Utility
 * @description Normalizes Capacitor's base64 binary responses and validates downloaded icon data.
 */

const decodeBase64 = (value: string): Uint8Array => {
  const base64 = value.replace(/^data:[^;,]+;base64,/, '').replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

export const toValidatedWebpBlob = async (value: unknown): Promise<Blob> => {
  let blob: Blob;
  if (value instanceof Blob) {
    blob = value;
  } else if (typeof value === 'string') {
    blob = new Blob([decodeBase64(value)], { type: 'image/webp' });
  } else if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    blob = new Blob([value as BlobPart], { type: 'image/webp' });
  } else {
    throw new Error('UI icon response did not contain binary image data');
  }

  if (blob.size < 12) {
    throw new Error('UI icon response is too small to be a WebP image');
  }

  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const signature = String.fromCharCode(...header);
  if (signature.slice(0, 4) !== 'RIFF' || signature.slice(8, 12) !== 'WEBP') {
    throw new Error('UI icon response is not a valid WebP image');
  }

  return blob;
};
