/**
 * @file cloudImageConsistencyService.test.ts
 * @input Local image manifests/files and mocked COS, compatible S3 and WebDAV inventories
 * @output Regression coverage for local-authoritative cloud image synchronization
 * @pos Test (Cloud Image Consistency)
 * @updated 2026-10-26: Covers missing uploads, extra deletions, grouped manifests, failed transfers and retries.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cloudImageConsistencyService } from './cloudImageConsistencyService';
import { imageService } from './imageService';
import { s3Service } from './s3Service';
import { compatibleS3Service } from './compatibleS3Service';
import { webdavService } from './webdavService';
import { Capacitor } from '@capacitor/core';
import type { ImageManifestGroups, ImageManifestUpload } from './imageManifest';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: vi.fn(() => false) } }));
vi.mock('./imageService', () => ({ imageService: {
  getReferencedImagesList: vi.fn(), getReferencedImageManifest: vi.fn(), listImages: vi.fn(), readImage: vi.fn()
} }));
vi.mock('./s3Service', () => ({ s3Service: {
  getConfig: vi.fn(), downloadImageList: vi.fn(), getDirectoryContents: vi.fn(),
  uploadImage: vi.fn(), deleteImage: vi.fn(), uploadImageList: vi.fn()
} }));
vi.mock('./compatibleS3Service', () => ({ compatibleS3Service: {
  getConfig: vi.fn(), downloadImageList: vi.fn(), getDirectoryContents: vi.fn(),
  uploadImage: vi.fn(), deleteImage: vi.fn(), uploadImageList: vi.fn()
} }));
vi.mock('./webdavService', () => ({ webdavService: {
  getConfig: vi.fn(), downloadImageList: vi.fn(), getDirectoryContents: vi.fn(),
  uploadImage: vi.fn(), deleteImage: vi.fn(), uploadImageList: vi.fn()
} }));

const providers = [s3Service, compatibleS3Service, webdavService];
let cloudFiles: Set<string>;
let cloudManifest: string[];
const localGroups: ImageManifestGroups = {
  content: ['photo.jpg', 'thumb_photo.jpg'], theme: ['theme.webp']
};
const localFiles = [...localGroups.content, ...localGroups.theme];

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('localStorage', { getItem: () => null });
  cloudFiles = new Set(['photo.jpg', 'unused.jpg']);
  cloudManifest = ['photo.jpg', 'unused.jpg', 'stale.jpg'];
  vi.mocked(imageService.getReferencedImagesList).mockReturnValue(localFiles);
  vi.mocked(imageService.getReferencedImageManifest).mockReturnValue(localGroups);
  vi.mocked(imageService.listImages).mockResolvedValue([...localFiles, 'unreferenced-local.jpg']);
  vi.mocked(imageService.readImage).mockResolvedValue(new Blob(['image']));
  providers.forEach((provider) => {
    vi.mocked(provider.getConfig).mockReturnValue(null);
    vi.mocked(provider.downloadImageList).mockImplementation(async () => ({ images: [...cloudManifest], timestamp: 1 }));
    vi.mocked(provider.getDirectoryContents).mockImplementation(async () => [...cloudFiles].map((name) => (
      provider === webdavService ? { type: 'file', basename: name } : { Key: `images/${name}` }
    )));
    vi.mocked(provider.uploadImage).mockImplementation(async (name) => { cloudFiles.add(name); return true; });
    vi.mocked(provider.deleteImage).mockImplementation(async (name) => { cloudFiles.delete(name); return true; });
    vi.mocked(provider.uploadImageList).mockImplementation(async (manifest: ImageManifestUpload) => {
      cloudManifest = Array.isArray(manifest) ? manifest : [...manifest.content, ...manifest.theme];
      return true;
    });
  });
  vi.mocked(s3Service.getConfig).mockReturnValue({} as any);
});

afterEach(() => vi.unstubAllGlobals());

describe('local-authoritative cloud image synchronization', () => {
  it.each(['COS', 'compatible S3', 'WebDAV'])('uploads missing files and deletes only cloud extras on %s', async (name) => {
    const provider = providers[['COS', 'compatible S3', 'WebDAV'].indexOf(name)];
    vi.mocked(s3Service.getConfig).mockReturnValue(null);
    vi.mocked(provider.getConfig).mockReturnValue({} as any);
    const preview = await cloudImageConsistencyService.generateReport([]);
    expect(preview.analysis.localManifestMissingCloudFiles).toEqual(['theme.webp', 'thumb_photo.jpg']);
    expect(preview.analysis.cloudFilesExtraEntries).toEqual(['unused.jpg']);
    expect(preview.report).toContain('待补传云端文件数：2');
    expect(provider.uploadImage).not.toHaveBeenCalled();
    expect(provider.deleteImage).not.toHaveBeenCalled();

    const result = await cloudImageConsistencyService.repairUsingLocalState([]);
    expect(result).toMatchObject({ success: true, uploaded: ['theme.webp', 'thumb_photo.jpg'], deleted: ['unused.jpg'], errors: [], unresolved: [] });
    expect(result.message).toContain('补传 2 个，删除 1 个');
    expect(provider.uploadImageList).toHaveBeenCalledWith(localGroups);
    expect(provider.uploadImage).not.toHaveBeenCalledWith('unreferenced-local.jpg', expect.anything());
    expect([...cloudFiles].sort()).toEqual([...localFiles].sort());
    const after = await cloudImageConsistencyService.analyze([]);
    expect(after.message).toBe('本地与云端图片状态一致');

    vi.mocked(provider.uploadImage).mockClear();
    vi.mocked(provider.deleteImage).mockClear();
    expect((await cloudImageConsistencyService.repairUsingLocalState([])).success).toBe(true);
    expect(provider.uploadImage).not.toHaveBeenCalled();
    expect(provider.deleteImage).not.toHaveBeenCalled();
  });

  it('uses actual cloud files even when the cloud manifest claims missing files already exist', async () => {
    cloudFiles = new Set(['photo.jpg']);
    cloudManifest = [...localFiles];
    expect((await cloudImageConsistencyService.repairUsingLocalState([])).uploaded).toEqual(['theme.webp', 'thumb_photo.jpg']);
  });

  it.each(['false', 'throw'])('keeps unsuccessful uploads unresolved and retries them (%s)', async (failure) => {
    if (failure === 'false') vi.mocked(s3Service.uploadImage).mockResolvedValueOnce(false);
    else vi.mocked(s3Service.uploadImage).mockRejectedValueOnce(new Error('offline'));
    const result = await cloudImageConsistencyService.repairUsingLocalState([]);
    expect(result.success).toBe(false);
    expect(result.uploaded).toEqual(['thumb_photo.jpg']);
    expect(result.unresolved).toEqual(['theme.webp']);
    expect(result.errors[0]).toContain('补传失败：theme.webp');
    expect(s3Service.uploadImageList).toHaveBeenLastCalledWith({ content: localGroups.content, theme: [] });
    const retry = await cloudImageConsistencyService.repairUsingLocalState([]);
    expect(retry.success).toBe(true);
    expect(retry.uploaded).toEqual(['theme.webp']);
  });

  it('reports missing local files without attempting to upload them', async () => {
    vi.mocked(imageService.listImages).mockResolvedValue(['photo.jpg']);
    const result = await cloudImageConsistencyService.repairUsingLocalState([]);
    expect(result.success).toBe(false);
    expect(result.unresolved).toEqual(['theme.webp', 'thumb_photo.jpg']);
    expect(s3Service.uploadImage).not.toHaveBeenCalled();
  });

  it('does not report success when a listed image exists only in the cloud', async () => {
    cloudFiles = new Set(localFiles);
    vi.mocked(imageService.listImages).mockResolvedValue(['photo.jpg']);
    const result = await cloudImageConsistencyService.repairUsingLocalState([]);
    expect(result.success).toBe(false);
    expect(result.unresolved).toEqual(['theme.webp', 'thumb_photo.jpg']);
    expect(s3Service.deleteImage).not.toHaveBeenCalled();
  });

  it.each(['false', 'throw'])('reports unsuccessful manifest writes (%s)', async (failure) => {
    if (failure === 'false') vi.mocked(s3Service.uploadImageList).mockResolvedValueOnce(false);
    else vi.mocked(s3Service.uploadImageList).mockRejectedValueOnce(new Error('offline'));
    const result = await cloudImageConsistencyService.repairUsingLocalState([]);
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('更新云端图片列表失败');
  });

  it('reports failed deletion and retries the remaining cloud extra', async () => {
    vi.mocked(s3Service.deleteImage).mockResolvedValueOnce(false);
    const result = await cloudImageConsistencyService.repairUsingLocalState([]);
    expect(result.success).toBe(false);
    expect(result.deleted).toEqual([]);
    expect(result.errors).toContain('删除云端多余文件失败：unused.jpg');
    const retry = await cloudImageConsistencyService.repairUsingLocalState([]);
    expect(retry.success).toBe(true);
    expect(retry.deleted).toEqual(['unused.jpg']);
  });

  it('rewrites a stale manifest without reuploading existing files', async () => {
    cloudFiles = new Set(localFiles);
    const result = await cloudImageConsistencyService.repairUsingLocalState([]);
    expect(result.success).toBe(true);
    expect(s3Service.uploadImage).not.toHaveBeenCalled();
    expect(s3Service.deleteImage).not.toHaveBeenCalled();
    expect(s3Service.uploadImageList).toHaveBeenCalledWith(localGroups);
  });

  it('synchronizes an empty local manifest without uploading local unreferenced files', async () => {
    vi.mocked(imageService.getReferencedImagesList).mockReturnValue([]);
    vi.mocked(imageService.getReferencedImageManifest).mockReturnValue({ content: [], theme: [] });
    const result = await cloudImageConsistencyService.repairUsingLocalState([]);
    expect(result.success).toBe(true);
    expect([...cloudFiles]).toEqual([]);
    expect(s3Service.uploadImage).not.toHaveBeenCalled();
    expect(s3Service.uploadImageList).toHaveBeenCalledWith({ content: [], theme: [] });
  });

  it('stops before mutation when reading the cloud inventory fails', async () => {
    vi.mocked(s3Service.getDirectoryContents).mockRejectedValue(new Error('offline'));
    expect((await cloudImageConsistencyService.repairUsingLocalState([])).success).toBe(false);
    expect(s3Service.uploadImage).not.toHaveBeenCalled();
    expect(s3Service.deleteImage).not.toHaveBeenCalled();
    expect(s3Service.uploadImageList).not.toHaveBeenCalled();
  });

  it('does not mutate disconnected or ambiguous providers', async () => {
    vi.mocked(s3Service.getConfig).mockReturnValue(null);
    expect((await cloudImageConsistencyService.repairUsingLocalState([])).success).toBe(false);
    vi.mocked(s3Service.getConfig).mockReturnValue({} as any);
    vi.mocked(webdavService.getConfig).mockReturnValue({} as any);
    expect((await cloudImageConsistencyService.repairUsingLocalState([])).success).toBe(false);
    expect(s3Service.uploadImageList).not.toHaveBeenCalled();
  });

  it('keeps the existing unsupported native WebDAV inventory guard', async () => {
    vi.mocked(s3Service.getConfig).mockReturnValue(null);
    vi.mocked(webdavService.getConfig).mockReturnValue({} as any);
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const result = await cloudImageConsistencyService.repairUsingLocalState([]);
    expect(result.success).toBe(false);
    expect(result.message).toContain('WebDAV 不支持读取远程 images 目录');
    expect(webdavService.uploadImage).not.toHaveBeenCalled();
  });
});
