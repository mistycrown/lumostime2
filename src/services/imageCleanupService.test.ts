/**
 * @file imageCleanupService.test.ts
 * @input Theme originals, obsolete thumbnails, content references, and cloud inventories
 * @output Regression coverage for settings image cleanup and report generation
 * @pos Test (Image Cleanup)
 * @updated 2026-10-11: Protects retained files while cleaning obsolete theme thumbnails on Web/Electron.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { imageCleanupService } from './imageCleanupService';
import { imageService } from './imageService';
import { webdavService } from './webdavService';
import { getSettingsReferencedImages } from './settingsImageReferenceService';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock('./imageService', () => ({ imageService: {
  listImages: vi.fn(), getReferencedImageManifest: vi.fn(), deleteSingleImage: vi.fn(), deleteImage: vi.fn()
} }));
vi.mock('./webdavService', () => ({ webdavService: {
  getConfig: vi.fn(), getDirectoryContents: vi.fn(), deleteImage: vi.fn()
} }));
vi.mock('./settingsImageReferenceService', () => ({ getSettingsReferencedImages: vi.fn() }));

let files: Set<string>;
const logs = [{ images: ['photo.jpg'] }] as any;
const todos = [{ coverImage: 'cover.jpg' }] as any;

beforeEach(() => {
  vi.resetAllMocks();
  files = new Set(['theme.webp', 'thumb_theme.webp', 'theme-only.webp', 'photo.jpg', 'thumb_photo.jpg', 'cover.jpg', 'thumb_cover.jpg']);
  vi.mocked(getSettingsReferencedImages).mockReturnValue(new Set(['theme.webp', 'theme-only.webp']));
  vi.mocked(imageService.listImages).mockImplementation(async () => [...files]);
  vi.mocked(imageService.getReferencedImageManifest).mockReturnValue({
    content: ['photo.jpg', 'thumb_photo.jpg', 'cover.jpg', 'thumb_cover.jpg'],
    theme: ['theme.webp', 'theme-only.webp']
  });
  vi.mocked(imageService.deleteSingleImage).mockImplementation(async filename => { files.delete(filename); });
  vi.mocked(imageService.deleteImage).mockImplementation(async filename => { files.delete(filename); files.delete(`thumb_${filename}`); });
  vi.mocked(webdavService.getConfig).mockReturnValue(null);
  vi.mocked(webdavService.getDirectoryContents).mockResolvedValue([]);
  vi.mocked(webdavService.deleteImage).mockResolvedValue(true);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('settings image cleanup', () => {
  it('finds obsolete theme thumbnails while preserving photo and cover thumbnails', async () => {
    const result = await imageCleanupService.checkUnreferencedImages(logs, todos);
    expect(result.unreferencedImages).toEqual(['thumb_theme.webp']);
    expect(result.obsoleteThemeThumbnails).toEqual(['thumb_theme.webp']);
    expect(result.orphanedOriginals).not.toContain('theme-only.webp');
    expect(result.referencedImages).toBe(6);
  });

  it('cleans a theme thumbnail individually and reports no remaining candidates', async () => {
    const result = await imageCleanupService.cleanupUnreferencedImages(logs, { deleteRemote: false }, todos);
    expect(result).toMatchObject({ deletedLocal: 1, deletedRemote: 0, errors: [] });
    expect(imageService.deleteSingleImage).toHaveBeenCalledWith('thumb_theme.webp');
    expect(imageService.deleteImage).not.toHaveBeenCalled();
    expect(files.has('theme.webp')).toBe(true);
    expect((await imageCleanupService.checkUnreferencedImages(logs, todos)).unreferencedImages).toEqual([]);
  });

  it('lists obsolete theme thumbnails in the report without a missing-thumbnail warning for theme originals', async () => {
    const report = await imageCleanupService.generateCleanupReport(logs, todos);
    expect(report).toContain('待清理文件数**: 1');
    expect(report).toContain('多余的主题缩略图 (1 个)');
    expect(report).not.toContain('缺少缩略图的原图');
  });

  it('does not delete files during a preview', async () => {
    const result = await imageCleanupService.cleanupUnreferencedImages(logs, { dryRun: true }, todos);
    expect(result.unreferencedImages).toEqual(['thumb_theme.webp']);
    expect(imageService.deleteSingleImage).not.toHaveBeenCalled();
    expect(imageService.deleteImage).not.toHaveBeenCalled();
  });

  it('skips DELETE requests when the cloud image folder is empty', async () => {
    vi.mocked(webdavService.getConfig).mockReturnValue({ url: 'https://example.test/dav', username: 'test', password: 'test' });
    const result = await imageCleanupService.cleanupUnreferencedImages(logs, {}, todos);
    expect(result.deletedLocal).toBe(1);
    expect(result.deletedRemote).toBe(0);
    expect(webdavService.deleteImage).not.toHaveBeenCalled();
  });

  it('deletes only the obsolete thumbnail remotely when it exists', async () => {
    vi.mocked(webdavService.getConfig).mockReturnValue({ url: 'https://example.test/dav', username: 'test', password: 'test' });
    vi.mocked(webdavService.getDirectoryContents).mockResolvedValue([
      { type: 'file', basename: 'theme.webp' }, { type: 'file', basename: 'thumb_theme.webp' }
    ]);
    const result = await imageCleanupService.cleanupUnreferencedImages(logs, {}, todos);
    expect(result).toMatchObject({ deletedLocal: 1, deletedRemote: 1, errors: [] });
    expect(vi.mocked(webdavService.deleteImage).mock.calls).toEqual([['thumb_theme.webp']]);
  });

  it('preserves a thumbnail still referenced directly when its original is unused', async () => {
    files = new Set(['original.jpg', 'thumb_original.jpg']);
    vi.mocked(getSettingsReferencedImages).mockReturnValue(new Set());
    const result = await imageCleanupService.cleanupUnreferencedImages([{ images: ['thumb_original.jpg'] }] as any, { deleteRemote: false });
    expect(result.unreferencedImages).toEqual(['original.jpg']);
    expect(imageService.deleteSingleImage).toHaveBeenCalledWith('original.jpg');
    expect(imageService.deleteImage).not.toHaveBeenCalled();
    expect(files.has('thumb_original.jpg')).toBe(true);
  });
});
