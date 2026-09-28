/**
 * @file customStickerZipService.test.ts
 * @input Synthetic ZIP archives containing sticker files
 * @output Regression coverage for sticker ZIP grouping and truncation
 * @pos Test (Custom Sticker Import)
 * @description Verifies folder grouping, image filtering, deterministic selection, and MIME preservation.
 */
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { parseCustomStickerZip } from './customStickerZipService';

const createZipBlob = async (): Promise<Blob> => {
  const zip = new JSZip();
  zip.file('animals/cat-10.png', 'cat-10');
  zip.file('animals/cat-2.png', 'cat-2');
  zip.file('animals/readme.txt', 'ignore');
  zip.file('plants/01.webp', 'plant');
  zip.file('root.png', 'root');
  return zip.generateAsync({ type: 'blob' });
};

describe('parseCustomStickerZip', () => {
  it('groups images by direct parent folder and adds root images as a ZIP-named group', async () => {
    const groups = await parseCustomStickerZip(await createZipBlob());

    const groupsByName = new Map(groups.map((group) => [group.name, group]));
    expect(groupsByName.get('animals')?.images.map((image) => image.label)).toEqual(['cat-2', 'cat-10']);
    expect(groupsByName.get('plants')?.images).toHaveLength(1);
    expect(groupsByName.get('plants')?.images[0].blob.type).toBe('image/webp');
    expect(groupsByName.get('贴纸')?.images.map((image) => image.label)).toEqual(['root']);
  });

  it('uses the ZIP filename for a root-level sticker group', async () => {
    const zip = new JSZip();
    zip.file('01.png', 'one');
    const blob = await zip.generateAsync({ type: 'blob' });
    Object.defineProperty(blob, 'name', { value: '_16.zip' });

    const [group] = await parseCustomStickerZip(blob as File);

    expect(group.name).toBe('_16');
    expect(group.images).toHaveLength(1);
  });

  it('keeps only the first 16 sorted images and reports truncation', async () => {
    const zip = new JSZip();
    for (let index = 1; index <= 17; index += 1) {
      zip.file(`set/${String(index).padStart(2, '0')}.png`, `image-${index}`);
    }

    const [group] = await parseCustomStickerZip(await zip.generateAsync({ type: 'blob' }));

    expect(group.images).toHaveLength(16);
    expect(group.images[0].label).toBe('01');
    expect(group.images[15].label).toBe('16');
    expect(group.truncatedCount).toBe(1);
  });
});
