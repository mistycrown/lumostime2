/**
 * @file uiIconZipService.test.ts
 * @input Synthetic UI icon ZIP archives
 * @output Regression coverage for strict 96-image UI icon imports
 * @pos Test (UI Icon Import)
 * @description Verifies required numbering, duplicate detection, image formats, and nested archive paths.
 */
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { parseUIIconZip } from './uiIconZipService';

const addRequiredImages = (zip: JSZip, directory = ''): void => {
  for (let index = 1; index <= 96; index += 1) {
    const number = String(index).padStart(2, '0');
    zip.file(`${directory}${number}.${index % 2 === 0 ? 'webp' : 'png'}`, `image-${number}`);
  }
};

describe('parseUIIconZip', () => {
  it('accepts one numbered PNG or WebP image for every icon, including nested files', async () => {
    const zip = new JSZip();
    addRequiredImages(zip, 'icons/');
    zip.file('README.txt', 'ignored');

    const parsed = await parseUIIconZip(await zip.generateAsync({ type: 'blob' }));

    expect(parsed.images).toHaveLength(96);
    expect(parsed.images.map((image) => image.number)).toEqual(
      Array.from({ length: 96 }, (_, index) => String(index + 1).padStart(2, '0'))
    );
    expect(parsed.images[1].blob.type).toBe('image/webp');
  });

  it('rejects archives with missing numbered images', async () => {
    const zip = new JSZip();
    addRequiredImages(zip);
    zip.remove('96.webp');

    await expect(parseUIIconZip(await zip.generateAsync({ type: 'blob' }))).rejects.toThrow('缺少：96');
  });

  it('rejects duplicate icon numbers across directories', async () => {
    const zip = new JSZip();
    addRequiredImages(zip);
    zip.file('duplicate/01.png', 'duplicate');

    await expect(parseUIIconZip(await zip.generateAsync({ type: 'blob' }))).rejects.toThrow('编号 01 存在重复图片');
  });

  it('rejects unnumbered and unsupported image formats', async () => {
    const unnumberedZip = new JSZip();
    addRequiredImages(unnumberedZip);
    unnumberedZip.file('icons/cover.png', 'cover');
    await expect(parseUIIconZip(await unnumberedZip.generateAsync({ type: 'blob' }))).rejects.toThrow('必须按 01 至 96 编号');

    const jpegZip = new JSZip();
    addRequiredImages(jpegZip);
    jpegZip.file('icons/97.jpg', 'jpeg');
    await expect(parseUIIconZip(await jpegZip.generateAsync({ type: 'blob' }))).rejects.toThrow('仅支持 PNG 或 WebP');
  });
});
