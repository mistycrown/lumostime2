/**
 * @file s3Service.test.ts
 * @description Regression tests for COS data download behavior.
 * @updated 2026-10-22: Covers conditional COS responses and full verification reads.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getObjectMock = vi.fn();
const headBucketMock = vi.fn();
const putObjectMock = vi.fn();

vi.mock('cos-js-sdk-v5', () => {
  const COSMock = vi.fn(function MockCOS(this: Record<string, unknown>) {
    this.getObject = getObjectMock;
    this.headBucket = headBucketMock;
    this.putObject = putObjectMock;
  });

  return {
    default: COSMock
  };
});

type LocalStorageMock = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const createLocalStorageMock = (): LocalStorageMock => {
  const store = new Map<string, string>();

  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    }
  };
};

describe('S3Service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', createLocalStorageMock());
  });

  it('uses exact response ETags, accepts resolved/rejected 304s and bypasses cache for verification', async () => {
    const { S3Service } = await import('./s3Service');
    const service = new S3Service();
    service.saveConfig({ bucketName: 'bucket-1234567890', region: 'ap-beijing', secretId: 'id', secretKey: 'key' });
    const body = { logs: [{ note: '文字' }] };
    getObjectMock.mockImplementationOnce((_params, callback) => callback(null, { Body: JSON.stringify(body), headers: { ETag: '"v1"' }, statusCode: 200 }))
      .mockImplementationOnce((_params, callback) => callback(null, { statusCode: 304 }))
      .mockImplementationOnce((_params, callback) => callback({ statusCode: 304 }))
      .mockImplementationOnce((_params, callback) => callback(null, { Body: JSON.stringify(body), headers: { etag: '"v1"' } }));
    for (let i = 0; i < 3; i++) expect(await service.downloadData('lumostime_backup.json', { conditional: true })).toEqual(body);
    await service.downloadData();
    expect(getObjectMock.mock.calls.map(([params]) => params.IfNoneMatch)).toEqual([undefined, '"v1"', '"v1"', undefined]);
  });

  it('clears cached ETags before uploads even when the response is lost', async () => {
    const { S3Service } = await import('./s3Service');
    const service = new S3Service();
    service.saveConfig({ bucketName: 'bucket-1234567890', region: 'ap-beijing', secretId: 'id', secretKey: 'key' });
    getObjectMock.mockImplementation((_params, callback) => callback(null, { Body: '{"logs":[]}', headers: { etag: '"v1"' } }));
    putObjectMock.mockImplementation((_params, callback) => callback(new Error('lost response')));
    await service.downloadData('lumostime_backup.json', { conditional: true });
    await expect(service.uploadData({ logs: [] })).rejects.toThrow('lost response');
    await service.downloadData('lumostime_backup.json', { conditional: true });
    expect(getObjectMock.mock.calls.map(([params]) => params.IfNoneMatch)).toEqual([undefined, undefined]);
  });

  it('adds cache-busting query params when downloading JSON data from COS', async () => {
    getObjectMock.mockImplementation((_params, callback) => {
      callback(null, {
        Body: JSON.stringify({
          logs: [],
          todos: [],
          categories: [],
          timestamp: 1
        })
      });
    });

    const { S3Service } = await import('./s3Service');
    const service = new S3Service();

    service.saveConfig({
      bucketName: 'bucket-1234567890',
      region: 'ap-beijing',
      secretId: 'secret-id',
      secretKey: 'secret-key'
    });

    await service.downloadData();

    expect(getObjectMock).toHaveBeenCalledTimes(1);
    expect(getObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'bucket-1234567890',
        Region: 'ap-beijing',
        Key: 'lumostime_backup.json',
        DataType: 'text',
        Query: expect.objectContaining({
          _: expect.any(String)
        }),
        ResponseCacheControl: 'no-cache, no-store, must-revalidate'
      }),
      expect.any(Function)
    );
  });

  it('uploads JSON data with no-cache metadata for the canonical main backup', async () => {
    putObjectMock.mockImplementation((_params, callback) => {
      callback(null, {});
    });

    const { S3Service } = await import('./s3Service');
    const service = new S3Service();

    service.saveConfig({
      bucketName: 'bucket-1234567890',
      region: 'ap-beijing',
      secretId: 'secret-id',
      secretKey: 'secret-key'
    });

    await service.uploadData({
      logs: [],
      todos: [],
      categories: [],
      timestamp: 3
    });

    expect(putObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'bucket-1234567890',
        Region: 'ap-beijing',
        Key: 'lumostime_backup.json',
        CacheControl: 'no-cache, no-store, must-revalidate'
      }),
      expect.any(Function)
    );
  });
});
