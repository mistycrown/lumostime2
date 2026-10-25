/**
 * @file compatibleS3Service.native.test.ts
 * @input Mock native HTTP responses and the real S3 SDK with its browser body collector
 * @output Native backup, binary download and service-error deserialization regression coverage
 * @pos Test (Cloud Sync)
 * @updated 2026-10-25: Reproduces native string responses being read as streams during safety-backup verification.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { streamCollector } from '@smithy/fetch-http-handler';
import type { S3Client } from '@aws-sdk/client-s3';

const { sendRequest } = vi.hoisted(() => ({ sendRequest: vi.fn() }));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@awesome-cordova-plugins/http', () => ({ HTTP: { sendRequest } }));

const configured = async () => {
  const { CompatibleS3Service } = await import('./compatibleS3Service');
  const service = new CompatibleS3Service();
  service.saveConfig({
    bucketName: 'test-bucket',
    region: 'cn-beijing',
    endpoint: 'https://oss-cn-beijing.aliyuncs.com',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    forcePathStyle: false
  });
  // Vitest runs in Node; use the browser collector selected by the production WebView bundle.
  const client = (service as unknown as { client: S3Client }).client;
  client.config.streamCollector = streamCollector;
  return service;
};

describe('CompatibleS3Service native SDK transport', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key)
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('uploads and reads back a local safety backup through the real SDK', async () => {
    const service = await configured();
    const backup = { logs: [{ note: '\u672c\u5730\u5b89\u5168\u5907\u4efd' }], todos: [], categories: [], timestamp: 2 };
    const filename = 'backups/local_backup_2026-10-25.json';
    sendRequest.mockResolvedValueOnce({ status: 200, headers: {}, data: null })
      .mockResolvedValueOnce({ status: 200, headers: {}, data: new TextEncoder().encode(JSON.stringify(backup)).buffer });

    expect(await service.uploadData(backup, filename)).toBe(true);
    expect(await service.downloadData(filename)).toEqual(backup);
    expect(sendRequest.mock.calls.map(([, options]) => options.method)).toEqual(['put', 'get']);
    expect(sendRequest.mock.calls[1][0]).not.toContain('response-content-type');
  });

  it('accepts successful JSON responses returned as text by the native bridge', async () => {
    const service = await configured();
    const backup = { logs: [], timestamp: 2 };
    sendRequest.mockResolvedValueOnce({ status: 200, headers: {}, data: JSON.stringify(backup) });

    expect(await service.downloadData()).toEqual(backup);
  });

  it('preserves native XML error details instead of failing on getReader', async () => {
    const service = await configured();
    sendRequest.mockRejectedValueOnce({
      status: 400,
      headers: { 'content-type': 'application/xml', 'x-oss-request-id': 'test-request' },
      error: '<Error><Code>InvalidRequest</Code><Message>Can not override response header on content-type</Message></Error>'
    });

    await expect(service.downloadData('backups/local_backup.json')).rejects.toMatchObject({
      name: 'InvalidRequest',
      message: 'Can not override response header on content-type',
      $metadata: { httpStatusCode: 400 }
    });
    expect(sendRequest).toHaveBeenCalledTimes(1);
  });

  it.each(['blob', 'view'] as const)('preserves image bytes returned as a %s', async (kind) => {
    const service = await configured();
    const bytes = new Uint8Array([0, 128, 255]);
    const padded = new Uint8Array([99, ...bytes, 99]);
    const data = kind === 'blob' ? new Blob([bytes]) : new DataView(padded.buffer, 1, bytes.length);
    sendRequest.mockResolvedValueOnce({ status: 200, headers: {}, data });

    expect(new Uint8Array(await service.downloadImage('photo.jpg'))).toEqual(bytes);
  });

  it('propagates native network errors without attempting SDK deserialization', async () => {
    const service = await configured();
    const error = { status: -2, error: 'connection failed' };
    sendRequest.mockRejectedValueOnce(error);

    await expect(service.downloadData()).rejects.toMatchObject(error);
    expect(sendRequest).toHaveBeenCalledTimes(1);
  });
});
