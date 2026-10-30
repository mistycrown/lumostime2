/**
 * @file compatibleS3Service.desktop.test.ts
 * @input Real S3 SDK and isolated preload transport responses
 * @output Signed desktop backup/image/error and default-transport coverage
 * @updated 2026-10-30: Verifies per-connection identity through the real SDK.
 * @updated 2026-10-30: Reproduces unknown JSON gateway errors and preserves actionable download diagnostics.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { streamCollector } from '@smithy/fetch-http-handler';
import type { S3Client } from '@aws-sdk/client-s3';
import type { CompatibleS3Service as CompatibleS3ServiceType } from './compatibleS3Service';
import { DesktopCompatibleS3RequestHandler } from './compatibleS3DesktopTransport';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));

const request = vi.fn();
let CompatibleS3Service: typeof import('./compatibleS3Service').CompatibleS3Service;
const config = { bucketName: 'bucket', region: 'us-east-1', endpoint: 'https://s3.example.com', accessKeyId: 'test-ak', secretAccessKey: 'test-sk', forcePathStyle: true };
const clientOf = (service: CompatibleS3ServiceType) => (service as unknown as { client: S3Client }).client;
function configured(userAgent?: string) {
  const service = new CompatibleS3Service();
  service.saveConfig({ ...config, userAgent });
  clientOf(service).config.streamCollector = streamCollector;
  return service;
}

describe('S3 desktop SDK transport', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
    vi.stubGlobal('window', { compatibleS3Connection: { request } });
    ({ CompatibleS3Service } = await import('./compatibleS3Service'));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('preserves SDK transport for old and empty configurations', () => {
    for (const value of [undefined, '', '   ']) {
      const service = configured(value);
      expect(clientOf(service).config.requestHandler).not.toBeInstanceOf(DesktopCompatibleS3RequestHandler);
      expect(service.getConfig()).not.toHaveProperty('userAgent');
    }
    expect(request).not.toHaveBeenCalled();
  });

  it('round-trips signed backups, conditional reads and binary images with the configured identity', async () => {
    const service = configured(' S3Drive ');
    const backup = { logs: [], timestamp: 2 };
    request.mockResolvedValueOnce({ status: 200, headers: {}, data: new Uint8Array() })
      .mockResolvedValueOnce({ status: 200, headers: { etag: '"v1"' }, data: new TextEncoder().encode(JSON.stringify(backup)) })
      .mockResolvedValueOnce({ status: 304, headers: {}, data: new Uint8Array() })
      .mockResolvedValueOnce({ status: 200, headers: {}, data: new Uint8Array([0, 128, 255]) });
    await service.uploadData(backup);
    expect(await service.downloadData('lumostime_backup.json', { conditional: true })).toEqual(backup);
    expect(await service.downloadData('lumostime_backup.json', { conditional: true })).toEqual(backup);
    expect(new Uint8Array(await service.downloadImage('photo.jpg'))).toEqual(new Uint8Array([0, 128, 255]));
    for (const [message] of request.mock.calls) {
      expect(message.userAgent).toBe('S3Drive');
      expect(message.headers.authorization).toContain('AWS4-HMAC-SHA256 Credential=test-ak/');
    }
    expect(JSON.parse(new TextDecoder().decode(request.mock.calls[0][0].body))).toEqual(backup);
    expect(request.mock.calls[2][0].headers['if-none-match']).toBe('"v1"');
    expect(request.mock.calls[1][0].url).toContain('response-cache-control=no-cache%2C%20no-store%2C%20must-revalidate');
  });

  it('retains HTTP 401 with an actionable configuration message', async () => {
    const service = configured('S3Drive');
    request.mockResolvedValue({ status: 401, headers: { 'content-type': 'application/xml' }, data: new TextEncoder().encode('<Error><Code>Unauthorized</Code><Message>Denied</Message></Error>') });
    await expect(service.downloadData()).rejects.toMatchObject({ $metadata: { httpStatusCode: 401 }, message: expect.stringContaining('User-Agent') });
    expect(await service.checkConnection()).toEqual({ success: false, message: expect.stringContaining('HTTP 401') });
  });

  it('does not silently ignore a custom identity in an unsupported browser', async () => {
    vi.stubGlobal('window', {});
    const service = configured('S3Drive');
    expect(await service.checkConnection()).toEqual({ success: false, message: expect.stringContaining('桌面端或手机端') });
    expect(request).not.toHaveBeenCalled();
  });

  it('recovers a JSON download error hidden by the SDK XML deserializer without logging credentials or the full body', async () => {
    const service = configured('S3Drive');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      request.mockResolvedValue({ status: 400, headers: { 'content-type': 'application/json' }, data: new TextEncoder().encode(JSON.stringify({
        code: 'InvalidArgument', message: 'Response override rejected for test-ak and test-sk',
        path: '/private-backup-path', unrelated: 'private-server-field'
      })) });
      await expect(service.downloadData()).rejects.toMatchObject({
        name: 'InvalidArgument', $metadata: { httpStatusCode: 400 }, message: expect.stringContaining('HTTP 400')
      });
      const diagnostics = JSON.stringify(log.mock.calls);
      expect(diagnostics).toContain('GetObject');
      expect(diagnostics).toContain('Response override rejected');
      for (const text of ['test-ak', 'test-sk', 'private-backup-path', 'private-server-field']) expect(diagnostics).not.toContain(text);
    } finally {
      log.mockRestore();
    }
  });

  it('keeps the status visible for an empty download error response', async () => {
    const service = configured('S3Drive');
    request.mockResolvedValue({ status: 403, headers: {}, data: new Uint8Array() });
    await expect(service.downloadData()).rejects.toMatchObject({ $metadata: { httpStatusCode: 403 }, message: expect.stringContaining('HTTP 403') });
  });

  it('does not let SDK retries or a new service instance bypass Data Capsule Retry-After', async () => {
    const service = new CompatibleS3Service();
    service.saveConfig({ ...config, endpoint: 'https://s3.cstcloud.cn', userAgent: 'S3Drive' });
    clientOf(service).config.streamCollector = streamCollector;
    request.mockResolvedValue({ status: 429, headers: { 'retry-after': '120' }, data: new Uint8Array() });
    await expect(service.downloadData()).rejects.toMatchObject({
      $metadata: { httpStatusCode: 429, attempts: 1 }, retryAfterMs: expect.any(Number),
      message: expect.stringContaining('120 秒后重试')
    });
    const restored = new CompatibleS3Service();
    await expect(restored.downloadData()).rejects.toMatchObject({
      status: 429, message: expect.stringContaining('秒后重试')
    });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
