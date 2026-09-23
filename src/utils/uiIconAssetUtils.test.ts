/**
 * @file uiIconAssetUtils.test.ts
 * @input Base64, Blob, and malformed UI icon payloads
 * @output Regression coverage for native response decoding and WebP validation
 * @pos Unit Test
 */

import { describe, expect, it } from 'vitest';
import { toValidatedWebpBlob } from './uiIconAssetUtils';

const webpBytes = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50
]);

describe('toValidatedWebpBlob', () => {
  it('decodes Capacitor base64 responses into binary WebP data', async () => {
    const base64 = btoa(String.fromCharCode(...webpBytes));
    const blob = await toValidatedWebpBlob(base64);

    expect(blob.type).toBe('image/webp');
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(webpBytes);
  });

  it('accepts WebP Blob responses', async () => {
    const blob = await toValidatedWebpBlob(new Blob([webpBytes], { type: 'image/webp' }));

    expect(blob.size).toBe(12);
  });

  it('rejects base64 text that is not an image', async () => {
    await expect(toValidatedWebpBlob(btoa('not an image'))).rejects.toThrow('not a valid WebP');
  });
});
