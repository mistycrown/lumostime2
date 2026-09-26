/**
 * @file achievementBottleIconPackZipService.test.ts
 * @input Synthetic icon-pack ZIP archives
 * @output Regression coverage for supported images, sorting, and validation
 * @pos Test (Achievement Bottle Assets)
 */
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { parseAchievementBottleIconPackZip } from './achievementBottleIconPackZipService';

describe('parseAchievementBottleIconPackZip', () => {
  it('collects PNG and WebP frames recursively in natural archive-path order', async () => {
    const zip = new JSZip();
    zip.file('frames/10.webp', 'ten');
    zip.file('frames/2.png', 'two');
    zip.file('frames/1.PNG', 'one');
    zip.file('frames/readme.txt', 'ignore');
    zip.file('__MACOSX/._hidden.webp', 'ignore');
    const source = new File([await zip.generateAsync({ type: 'blob' })], 'Comet Pack.zip');

    const parsed = await parseAchievementBottleIconPackZip(source);

    expect(parsed.name).toBe('Comet Pack');
    expect(parsed.images.map((image) => image.archivePath)).toEqual([
      'frames/1.PNG',
      'frames/2.png',
      'frames/10.webp'
    ]);
    expect(parsed.images.map((image) => image.blob.type)).toEqual([
      'image/png',
      'image/png',
      'image/webp'
    ]);
  });

  it('rejects archives without supported images', async () => {
    const zip = new JSZip();
    zip.file('readme.txt', 'no images');
    const source = await zip.generateAsync({ type: 'blob' });

    await expect(parseAchievementBottleIconPackZip(source)).rejects.toThrow('PNG 或 WebP');
  });
});
