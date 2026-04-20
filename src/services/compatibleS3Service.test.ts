/**
 * @file compatibleS3Service.test.ts
 * @description Regression tests for the compatible S3 service.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();

vi.mock('@aws-sdk/client-s3', () => {
  class MockS3Client {
    send = sendMock;
  }

  class MockHeadBucketCommand {
    input: Record<string, unknown>;

    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }

  class MockGetObjectCommand {
    input: Record<string, unknown>;

    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }

  class MockPutObjectCommand {
    input: Record<string, unknown>;

    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }

  class MockHeadObjectCommand {
    input: Record<string, unknown>;

    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }

  class MockDeleteObjectCommand {
    input: Record<string, unknown>;

    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }

  class MockListObjectsV2Command {
    input: Record<string, unknown>;

    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }

  return {
    S3Client: MockS3Client,
    HeadBucketCommand: MockHeadBucketCommand,
    GetObjectCommand: MockGetObjectCommand,
    PutObjectCommand: MockPutObjectCommand,
    HeadObjectCommand: MockHeadObjectCommand,
    DeleteObjectCommand: MockDeleteObjectCommand,
    ListObjectsV2Command: MockListObjectsV2Command
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

describe('CompatibleS3Service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', createLocalStorageMock());
  });

  it('persists config and reconnects from localStorage', async () => {
    const { CompatibleS3Service } = await import('./compatibleS3Service');
    const service = new CompatibleS3Service();

    service.saveConfig({
      bucketName: 'bucket-a',
      region: 'cn-east-1',
      endpoint: 'https://s3.cn-east-1.qiniucs.com',
      accessKeyId: 'ak-1',
      secretAccessKey: 'sk-1',
      forcePathStyle: true
    });

    const restored = new CompatibleS3Service();

    expect(restored.getConfig()).toEqual({
      bucketName: 'bucket-a',
      region: 'cn-east-1',
      endpoint: 'https://s3.cn-east-1.qiniucs.com',
      accessKeyId: 'ak-1',
      secretAccessKey: 'sk-1',
      forcePathStyle: true
    });
  });

  it('checks connection with head bucket', async () => {
    sendMock.mockResolvedValueOnce({});

    const { CompatibleS3Service } = await import('./compatibleS3Service');
    const service = new CompatibleS3Service();

    service.saveConfig({
      bucketName: 'bucket-b',
      region: 'us-east-1',
      endpoint: 'https://example.com',
      accessKeyId: 'ak-2',
      secretAccessKey: 'sk-2',
      forcePathStyle: false
    });

    const result = await service.checkConnection();

    expect(result).toEqual({ success: true });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].input).toEqual({
      Bucket: 'bucket-b'
    });
  });

  it('adds https to endpoints that omit the protocol', async () => {
    const { CompatibleS3Service } = await import('./compatibleS3Service');
    const service = new CompatibleS3Service();

    service.saveConfig({
      bucketName: 'bucket-protocol',
      region: 'cn-north-1',
      endpoint: 's3.cn-north-1.qiniucs.com',
      accessKeyId: 'ak-protocol',
      secretAccessKey: 'sk-protocol',
      forcePathStyle: true
    });

    expect(service.getConfig()).toEqual({
      bucketName: 'bucket-protocol',
      region: 'cn-north-1',
      endpoint: 'https://s3.cn-north-1.qiniucs.com',
      accessKeyId: 'ak-protocol',
      secretAccessKey: 'sk-protocol',
      forcePathStyle: true
    });
  });

  it('parses JSON data downloaded from compatible S3', async () => {
    sendMock.mockResolvedValueOnce({
      Body: {
        transformToString: async () => JSON.stringify({
          logs: [],
          todos: [],
          categories: [],
          timestamp: 2
        })
      }
    });

    const { CompatibleS3Service } = await import('./compatibleS3Service');
    const service = new CompatibleS3Service();

    service.saveConfig({
      bucketName: 'bucket-c',
      region: 'cn-east-1',
      endpoint: 'https://s3.cn-east-1.qiniucs.com',
      accessKeyId: 'ak-3',
      secretAccessKey: 'sk-3',
      forcePathStyle: true
    });

    const data = await service.downloadData();

    expect(data).toEqual({
      logs: [],
      todos: [],
      categories: [],
      timestamp: 2
    });
    expect(sendMock.mock.calls[0][0].input).toEqual(expect.objectContaining({
      Bucket: 'bucket-c',
      Key: 'lumostime_backup.json',
      ResponseCacheControl: 'no-cache, no-store, must-revalidate',
      ResponseContentType: 'application/json'
    }));
  });

  it('uploads image bodies as Uint8Array for browser-safe transport', async () => {
    sendMock.mockResolvedValueOnce({});

    const { CompatibleS3Service } = await import('./compatibleS3Service');
    const service = new CompatibleS3Service();

    service.saveConfig({
      bucketName: 'bucket-d',
      region: 'cn-east-1',
      endpoint: 'https://s3.cn-east-1.qiniucs.com',
      accessKeyId: 'ak-4',
      secretAccessKey: 'sk-4',
      forcePathStyle: true
    });

    await service.uploadImage('demo.jpg', new Blob(['abc'], { type: 'image/jpeg' }));

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].input).toEqual(expect.objectContaining({
      Bucket: 'bucket-d',
      Key: 'images/demo.jpg',
      ContentType: 'image/jpeg',
      Body: expect.any(Uint8Array)
    }));
  });
});
