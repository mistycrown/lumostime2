/**
 * @file syncUtils.test.ts
 * @input Mock cloud services and local sync payloads
 * @output Regression coverage for main-backup upload verification
 * @pos Test
 * @description Ensures cloud uploads are only reported as successful after the canonical main backup can be read back with the exact payload that was just written.
 * @updated 2026-06-21: Added write-after-read main backup verification coverage.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

const { storage } = vi.hoisted(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear()
  });
  return { storage };
});

import { downloadWithBackup, uploadDataToCloud } from './syncUtils';

vi.mock('../services/imageService', () => ({
  imageService: {
    buildReferencedImagesList: vi.fn(() => []),
    updateReferencedImagesList: vi.fn()
  }
}));

vi.mock('../services/appearanceBackupService', () => ({
  appearanceBackupService: {
    getReferencedImageFilenames: vi.fn(() => [])
  }
}));

vi.mock('../services/syncService', () => ({
  syncService: {
    uploadImages: vi.fn(),
    downloadImages: vi.fn()
  }
}));

vi.mock('../services/webdavService', () => ({
  webdavService: {}
}));

vi.mock('../services/s3Service', () => ({
  s3Service: {}
}));

vi.mock('../services/compatibleS3Service', () => ({
  compatibleS3Service: {}
}));

const createMockCloudService = (downloadData: ReturnType<typeof vi.fn>) => ({
  uploadData: vi.fn(async () => true),
  downloadData,
  downloadImageList: vi.fn(async () => ({ images: [], timestamp: 0 })),
  uploadImageList: vi.fn(async () => true),
  getDirectoryContents: vi.fn(async () => [])
});

const buildValidPayload = (timestamp: number) => ({
  logs: [{ id: 'log-1', startTime: timestamp, endTime: timestamp + 1 }],
  todos: [],
  categories: [{ id: 'cat-1', name: 'Category', activities: [] }],
  timestamp,
  version: '1.0.0'
});

describe('uploadDataToCloud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.clear();
  });

  test('fails when the main backup read after upload is stale', async () => {
    const cloud = createMockCloudService(vi.fn(async () => buildValidPayload(1)));

    const result = await uploadDataToCloud(cloud as any, buildValidPayload(10));

    expect(result.success).toBe(false);
    expect(result.message).toContain('did not verify');
    expect(cloud.uploadImageList).not.toHaveBeenCalled();
  });

  test('succeeds only after the uploaded main backup verifies', async () => {
    let uploadedData: any;
    const cloud = createMockCloudService(vi.fn(async () => uploadedData));
    cloud.uploadData.mockImplementation(async (data: any) => {
      uploadedData = data;
      return true;
    });

    vi.spyOn(Date, 'now').mockReturnValueOnce(10);

    const result = await uploadDataToCloud(cloud as any, buildValidPayload(10));

    expect(result.success).toBe(true);
    expect(cloud.uploadData).toHaveBeenCalledWith(expect.objectContaining({ timestamp: 10 }), 'lumostime_backup.json');
    expect(cloud.downloadData).toHaveBeenCalledWith('lumostime_backup.json');
  });
});

describe('downloadWithBackup', () => {
  test('does not restore from cloud when the local safety backup fails', async () => {
    const cloud = createMockCloudService(vi.fn(async () => buildValidPayload(20)));
    cloud.uploadData.mockRejectedValueOnce(new Error('backup write failed'));

    const result = await downloadWithBackup(cloud as any, buildValidPayload(10));

    expect(result.success).toBe(false);
    expect(result.message).toContain('已停止恢复');
    expect(cloud.downloadData).not.toHaveBeenCalled();
  });
});
