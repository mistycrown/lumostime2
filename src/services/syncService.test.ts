/**
 * @file syncService.test.ts
 * @input Local image deletion records, backup references, and cloud image inventories
 * @output Regression coverage for safe image deletion during backup uploads
 * @pos Test (Cloud Sync)
 * @updated 2026-10-11: Covers empty clouds, restored references, unknown inventories, and deletion retries.
 * @updated 2026-10-11: Ensures unavailable storage stops remaining batches instead of continuing transfers.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { syncService, type StorageService } from './syncService';
import { imageService } from './imageService';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock('@capacitor/filesystem', () => ({ Filesystem: {}, Directory: { Data: 'DATA' } }));
vi.mock('./webdavService', () => ({ webdavService: {} }));
vi.mock('./s3Service', () => ({ s3Service: {} }));
vi.mock('./compatibleS3Service', () => ({ compatibleS3Service: {} }));
vi.mock('./imageService', () => ({
  imageService: {
    listImages: vi.fn(),
    readImage: vi.fn(),
    getDeletedImages: vi.fn(),
    clearDeletedImages: vi.fn()
  }
}));

let pendingDeletions: string[];
const createStorageService = () => ({
  deleteImage: vi.fn().mockResolvedValue(true),
  uploadImage: vi.fn().mockResolvedValue(true)
});

beforeEach(() => {
  vi.resetAllMocks();
  pendingDeletions = ['old.webp', 'thumb_old.webp'];
  vi.mocked(imageService.listImages).mockResolvedValue(['new.webp']);
  vi.mocked(imageService.readImage).mockResolvedValue(new ArrayBuffer(3));
  vi.mocked(imageService.getDeletedImages).mockImplementation(() => [...pendingDeletions]);
  vi.mocked(imageService.clearDeletedImages).mockImplementation((filenames) => {
    pendingDeletions = pendingDeletions.filter((filename) => !filenames.includes(filename));
  });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('image deletion during backup upload', () => {
  it('uploads into an empty cloud without deleting historical originals or thumbnails', async () => {
    const service = createStorageService();
    const onProgress = vi.fn();

    const result = await syncService.uploadImages(service as unknown as StorageService, onProgress, ['new.webp'], []);

    expect(service.deleteImage).not.toHaveBeenCalled();
    expect(service.uploadImage).toHaveBeenCalledWith('new.webp', expect.any(ArrayBuffer));
    expect(result).toMatchObject({ uploaded: 1, deletedRemote: 0, errors: [] });
    expect(pendingDeletions).toEqual([]);
    expect(onProgress.mock.calls.flat().some((message) => message.includes('同步删除'))).toBe(false);
  });

  it('only deletes pending files that exist in the current cloud inventory', async () => {
    const service = createStorageService();

    const result = await syncService.uploadImages(service as unknown as StorageService, undefined, ['new.webp'], ['old.webp']);

    expect(service.deleteImage.mock.calls).toEqual([['old.webp']]);
    expect(result.deletedRemote).toBe(1);
    expect(pendingDeletions).toEqual([]);
  });

  it.each([true, false])('protects restored references when the image exists remotely: %s', async (exists) => {
    const service = createStorageService();
    pendingDeletions = ['new.webp'];

    const result = await syncService.uploadImages(
      service as unknown as StorageService, undefined, ['new.webp'], exists ? ['new.webp'] : []
    );

    expect(service.deleteImage).not.toHaveBeenCalled();
    expect(result.uploaded).toBe(exists ? 0 : 1);
    expect(pendingDeletions).toEqual([]);
  });

  it('does not consume deletion records when the cloud inventory is unknown', async () => {
    const service = createStorageService();

    await syncService.uploadImages(service as unknown as StorageService, undefined, ['new.webp']);

    expect(service.deleteImage).not.toHaveBeenCalled();
    expect(pendingDeletions).toEqual(['old.webp', 'thumb_old.webp']);
  });

  it('retains both false and rejected deletions and retries them on the next upload', async () => {
    const service = createStorageService();
    service.deleteImage.mockResolvedValueOnce(false).mockRejectedValueOnce(new Error('network unavailable'));
    const inventory = ['old.webp', 'thumb_old.webp'];

    const first = await syncService.uploadImages(service as unknown as StorageService, undefined, [], inventory);
    expect(first.deletedRemote).toBe(0);
    expect(pendingDeletions).toEqual(inventory);

    const retry = await syncService.uploadImages(service as unknown as StorageService, undefined, [], inventory);
    expect(retry.deletedRemote).toBe(2);
    expect(service.deleteImage).toHaveBeenCalledTimes(4);
    expect(pendingDeletions).toEqual([]);
  });

  it.each([2, 5])('stops after a 503 in a batch of %s pending uploads', async count => {
    const service = createStorageService();
    const files = Array.from({ length: count }, (_, index) => `photo_${index}.webp`);
    pendingDeletions = [];
    vi.mocked(imageService.listImages).mockResolvedValue(files);
    service.uploadImage.mockRejectedValue({ status: 503 });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(syncService.uploadImages(service as unknown as StorageService, undefined, files, []))
      .rejects.toMatchObject({ status: 503 });
    expect(service.uploadImage).toHaveBeenCalledTimes(Math.min(3, count));
  });
});
