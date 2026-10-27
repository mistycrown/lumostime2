/**
 * @file webdavService.test.ts
 * @updated 2026-10-27: Covers missing/existing download directories, creation races and real filesystem failures.
 * @input Native HTTP/filesystem adapters and a local WebDAV server rejecting invalid paths
 * @output Regression coverage for canonical backup/image paths, UTF-8 uploads, and fresh reads
 * @pos Test (Cloud Sync)
 * @updated 2026-10-10: Covers Nutstore-compatible native uploads and real WebDAV client requests.
 * @updated 2026-10-11: Covers idempotent DELETE 404 and retained failures with a real WebDAV client.
 * @updated 2026-10-22: Covers real conditional GETs, native 304s and full verification reads.
 */
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebDAVRequestQueue } from './webdavRequestQueue';

const adapters = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  sendRequest: vi.fn(),
  setDataSerializer: vi.fn(),
  downloadFile: vi.fn(),
  stat: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  deleteFile: vi.fn()
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: adapters.isNativePlatform } }));
vi.mock('@awesome-cordova-plugins/http', () => ({
  HTTP: { sendRequest: adapters.sendRequest, setDataSerializer: adapters.setDataSerializer }
}));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    downloadFile: adapters.downloadFile,
    stat: adapters.stat,
    mkdir: adapters.mkdir,
    readFile: adapters.readFile,
    deleteFile: adapters.deleteFile
  },
  Directory: { Data: 'DATA' },
  Encoding: { UTF8: 'utf8' }
}));

let WebDAVService: typeof import('./webdavService').WebDAVService;
// Bypass the app's Electron-renderer alias when running a Node test server.
const { createServer } = process.getBuiltinModule('node:http') as typeof import('node:http');
let server: Server;
let serverUrl: string;
const requests: { method: string; path: string; cacheControl?: string; ifNoneMatch?: string; body: string }[] = [];
let unavailable = false;
let backupEtag = '"backup-v1"';
const backup = { timestamp: 123, notes: '坚果云同步测试' };
const freshReadHeaders = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

beforeAll(async () => {
  vi.stubGlobal('localStorage', { getItem: () => null });
  ({ WebDAVService } = await import('./webdavService'));
  server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const path = request.url || '';
    requests.push({
      method: request.method || '',
      path,
      cacheControl: request.headers['cache-control'],
      ifNoneMatch: request.headers['if-none-match'],
      body: Buffer.concat(chunks).toString('utf8')
    });
    // Reject both actual queries and query text encoded into a filename by the SDK.
    if (decodeURIComponent(path).includes('?')) {
      response.writeHead(400).end('the nutstore path is not valid');
      return;
    }
    if (unavailable) {
      response.writeHead(503, { 'Retry-After': '120' }).end();
    } else if (request.method === 'DELETE') {
      response.writeHead(path.endsWith('missing.webp') ? 404 : 500).end();
    } else if (request.method === 'PROPFIND') {
      response.writeHead(207, { 'Content-Type': 'application/xml' });
      response.end(`<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"><d:response>
        <d:href>${path}</d:href><d:propstat><d:prop>
        <d:resourcetype/><d:getcontentlength>100</d:getcontentlength>
        <d:getlastmodified>Fri, 09 Oct 2026 09:31:49 GMT</d:getlastmodified>
        </d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>
        </d:response></d:multistatus>`);
    } else if (request.method === 'PUT') {
      response.writeHead(201).end();
    } else if (path.endsWith('.webp')) {
      response.writeHead(200, { 'Content-Type': 'image/webp' }).end(Buffer.from([1, 2, 3]));
    } else {
      if (request.headers['if-none-match'] === backupEtag) {
        response.writeHead(304, { ETag: backupEtag }).end();
        return;
      }
      response.writeHead(200, { 'Content-Type': 'application/json', ETag: backupEtag });
      response.end(JSON.stringify(path.endsWith('lumostime_images.json')
        ? { images: ['photo.webp'], timestamp: 123 }
        : backup));
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  serverUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/dav/Lumostime`;
});

beforeEach(() => {
  vi.resetAllMocks();
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value)
  });
  requests.length = 0;
  unavailable = false;
  backupEtag = '"backup-v1"';
  adapters.isNativePlatform.mockReturnValue(false);
  adapters.sendRequest.mockImplementation(async (url: string, options: any) => {
    if (url.includes('?')) throw { status: 400, error: 'the nutstore path is not valid' };
    if (options.method === 'get') return { status: 200, data: JSON.stringify(backup), headers: { etag: backupEtag } };
    return { status: 201 };
  });
  adapters.downloadFile.mockResolvedValue({ path: 'temp/download.json' });
  adapters.stat.mockResolvedValue({ type: 'directory' });
  adapters.mkdir.mockResolvedValue(undefined);
  adapters.readFile.mockResolvedValue({ data: JSON.stringify(backup) });
  adapters.deleteFile.mockResolvedValue(undefined);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

const configure = (url: string) => {
  const service = new WebDAVService();
  service.saveConfig({ url, username: 'test-user', password: 'test-password' });
  // Path/transport tests omit real-time pacing; the queue suite verifies its timing.
  (service as any).requestQueue = new WebDAVRequestQueue();
  return service;
};

describe('native WebDAV paths', () => {
  it.each(['backup', 'manifest', 'image'])('creates a missing parent before a native %s download', async (kind) => {
    adapters.isNativePlatform.mockReturnValue(true);
    const service = configure('https://dav.jianguoyun.com/dav/Lumostime');
    const directories = new Set<string>();
    adapters.stat.mockImplementation(async ({ path }) => {
      if (!directories.has(path)) throw new Error('ENOENT');
      return { type: 'directory' };
    });
    adapters.mkdir.mockImplementation(async ({ path }) => { directories.add(path); });
    adapters.downloadFile.mockImplementation(async ({ path }) => {
      if (!directories.has(path.slice(0, path.lastIndexOf('/')))) throw new Error('ENOENT');
      return { path };
    });
    adapters.readFile.mockResolvedValue({ data: JSON.stringify({ images: ['photo.webp'], timestamp: 123 }) });

    if (kind === 'backup') await service.downloadData('backups/safety.json');
    else if (kind === 'manifest') await service.downloadImageList();
    else await service.downloadImage('photo.webp');

    expect(adapters.mkdir).toHaveBeenCalledWith({
      path: kind === 'image' ? 'images' : 'temp', directory: 'DATA', recursive: true
    });
    expect(adapters.mkdir.mock.invocationCallOrder[0]).toBeLessThan(adapters.downloadFile.mock.invocationCallOrder[0]);
  });

  it('reuses an existing download directory without calling mkdir', async () => {
    adapters.isNativePlatform.mockReturnValue(true);
    await configure('https://example.test/dav').downloadData('backups/safety.json');
    expect(adapters.stat).toHaveBeenCalledWith({ path: 'temp', directory: 'DATA' });
    expect(adapters.mkdir).not.toHaveBeenCalled();
  });

  it('accepts concurrent directory creation only after verifying the directory', async () => {
    adapters.isNativePlatform.mockReturnValue(true);
    adapters.stat.mockRejectedValueOnce(new Error('ENOENT')).mockResolvedValue({ type: 'directory' });
    adapters.mkdir.mockRejectedValueOnce(new Error('already exists'));
    await expect(configure('https://example.test/dav').downloadData('backups/safety.json')).resolves.toEqual(backup);
    expect(adapters.stat).toHaveBeenCalledTimes(2);
  });

  it.each(['missing', 'file'])('does not download when directory creation fails and the path is %s', async (kind) => {
    adapters.isNativePlatform.mockReturnValue(true);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    if (kind === 'missing') adapters.stat.mockRejectedValue(new Error('ENOENT'));
    else adapters.stat.mockResolvedValue({ type: 'file' });
    adapters.mkdir.mockRejectedValue(new Error('permission denied'));
    await expect(configure('https://example.test/dav').downloadData('backups/safety.json')).rejects.toThrow('permission denied');
    expect(adapters.downloadFile).not.toHaveBeenCalled();
  });

  it('blocks native backup reads after a manifest PUT resolves with status 503', async () => {
    adapters.isNativePlatform.mockReturnValue(true);
    const service = configure('https://dav.jianguoyun.com/dav/Lumostime');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    adapters.sendRequest.mockResolvedValueOnce({ status: 503, headers: { 'retry-after': '120' } });

    await expect(service.uploadImageList(['photo.webp'])).rejects.toMatchObject({ status: 503 });
    await expect(service.downloadData()).rejects.toMatchObject({ status: 503 });
    expect(adapters.sendRequest).toHaveBeenCalledTimes(1);
    expect(adapters.downloadFile).not.toHaveBeenCalled();
  });

  it.each(['', '/'])('uploads UTF-8 backups and image manifests with base URL suffix "%s"', async (suffix) => {
    adapters.isNativePlatform.mockReturnValue(true);
    const baseUrl = 'https://dav.jianguoyun.com/dav/Lumostime';
    const service = configure(`${baseUrl}${suffix}`);

    expect(await service.uploadData(backup)).toBe(true);
    expect(await service.uploadData(backup, 'backups/safety.json')).toBe(true);
    expect(await service.uploadImageList(['photo.webp'])).toBe(true);
    expect(adapters.sendRequest.mock.calls.map(([url]) => url)).toEqual([
      `${baseUrl}/lumostime_backup.json`,
      `${baseUrl}/backups/safety.json`,
      `${baseUrl}/lumostime_images.json`
    ]);
    const options = adapters.sendRequest.mock.calls[0][1];
    expect(options.method).toBe('put');
    expect(JSON.parse(new TextDecoder().decode(options.data))).toEqual(backup);
    expect(options.headers['Content-Type']).toBe('application/json; charset=utf-8');
    const manifest = JSON.parse(new TextDecoder().decode(adapters.sendRequest.mock.calls[2][1].data));
    expect(manifest.images).toEqual(['photo.webp']);
  });

  it('downloads native backups, manifests and images with canonical URLs and cache control', async () => {
    adapters.isNativePlatform.mockReturnValue(true);
    const baseUrl = 'https://dav.jianguoyun.com/dav/Lumostime';
    const service = configure(baseUrl);
    expect(await service.downloadData()).toEqual(backup);
    adapters.readFile.mockResolvedValue({ data: JSON.stringify({ images: ['photo.webp'], timestamp: 123 }) });
    expect(await service.downloadImageList()).toEqual({ images: ['photo.webp'], timestamp: 123 });
    await service.downloadImage('photo.webp');

    expect(adapters.downloadFile.mock.calls.map(([options]) => options.url)).toEqual([
      `${baseUrl}/lumostime_images.json`,
      `${baseUrl}/images/photo.webp`
    ]);
    expect(adapters.sendRequest.mock.calls[0]).toEqual([`${baseUrl}/lumostime_backup.json`, expect.objectContaining({
      method: 'get', responseType: 'text', headers: expect.objectContaining(freshReadHeaders)
    })]);
    for (const [options] of adapters.downloadFile.mock.calls) {
      expect(options.headers).toMatchObject(freshReadHeaders);
      expect(options.headers.Authorization).toMatch(/^Basic /);
    }
  });

  it.each(['resolve', 'reject'])('handles native %s 304 without downloading a file body', async mode => {
    adapters.isNativePlatform.mockReturnValue(true);
    const service = configure('https://dav.jianguoyun.com/dav/Lumostime');
    expect(await service.downloadData()).toEqual(backup);
    if (mode === 'resolve') adapters.sendRequest.mockResolvedValueOnce({ status: 304, data: '' });
    else adapters.sendRequest.mockRejectedValueOnce({ status: 304, error: '' });
    expect(await service.downloadData('lumostime_backup.json', { conditional: true })).toEqual(backup);
    expect(adapters.sendRequest.mock.calls[1][1].headers['If-None-Match']).toBe(backupEtag);
    expect(adapters.downloadFile).not.toHaveBeenCalled();
  });
});

describe('Web/Electron real WebDAV requests', () => {
  it('revalidates with one conditional GET and keeps default verification unconditional', async () => {
    const service = configure(serverUrl);
    expect(await service.downloadData('lumostime_backup.json', { conditional: true })).toEqual(backup);
    expect(await service.downloadData('lumostime_backup.json', { conditional: true })).toEqual(backup);
    backupEtag = '"backup-v2"';
    expect(await service.downloadData('lumostime_backup.json', { conditional: true })).toEqual(backup);
    await service.downloadData();
    expect(requests.map(({ method, ifNoneMatch }) => [method, ifNoneMatch])).toEqual([
      ['GET', undefined], ['GET', '"backup-v1"'], ['GET', '"backup-v1"'], ['GET', undefined]
    ]);
  });

  it('invalidates before uploads and config changes', async () => {
    const service = configure(serverUrl);
    await service.downloadData();
    await service.uploadData(backup);
    await service.downloadData('lumostime_backup.json', { conditional: true });
    service.saveConfig({ url: serverUrl, username: 'another', password: 'test-password' });
    await service.downloadData('lumostime_backup.json', { conditional: true });
    expect(requests.every(request => !request.ifNoneMatch)).toBe(true);
  });

  it('shares a 503 cooldown between manifest uploads and subsequent backup reads', async () => {
    const service = configure(serverUrl);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    unavailable = true;

    await expect(service.uploadImageList(['photo.webp'])).rejects.toMatchObject({ status: 503 });
    await expect(service.downloadData()).rejects.toMatchObject({ status: 503 });
    await expect(service.downloadImageList()).rejects.toMatchObject({ status: 503 });
    await expect(service.getDirectoryContents('/images')).rejects.toMatchObject({ status: 503 });
    expect(requests).toHaveLength(1);
  });

  it('treats an already absent image as deleted without reporting an error', async () => {
    const service = configure(serverUrl);
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await service.deleteImage('missing.webp')).toBe(true);
    expect(requests.map(({ method, path }) => `${method} ${path}`)).toEqual([
      'DELETE /dav/Lumostime/images/missing.webp'
    ]);
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('reports real server deletion failures for later retry', async () => {
    const service = configure(serverUrl);
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await service.deleteImage('failure.webp')).toBe(false);
    expect(errorLog).toHaveBeenCalled();
  });

  it('uploads then reads backups, image manifests, images and metadata using valid resource paths', async () => {
    const service = configure(serverUrl);
    expect(await service.uploadData(backup)).toBe(true);
    expect(await service.uploadImageList(['photo.webp'])).toBe(true);
    expect(await service.downloadData()).toEqual(backup);
    expect(await service.downloadImageList()).toEqual({ images: ['photo.webp'], timestamp: 123 });
    const image = await service.downloadImage('photo.webp');
    expect(Array.from(new Uint8Array(image))).toEqual([1, 2, 3]);
    expect(await service.statFile()).toEqual(new Date('2026-10-09T09:31:49Z'));

    expect(requests.map(({ method, path }) => `${method} ${path}`)).toEqual([
      'PUT /dav/Lumostime/lumostime_backup.json',
      'PUT /dav/Lumostime/lumostime_images.json',
      'GET /dav/Lumostime/lumostime_backup.json',
      'GET /dav/Lumostime/lumostime_images.json',
      'GET /dav/Lumostime/images/photo.webp',
      'PROPFIND /dav/Lumostime/lumostime_backup.json'
    ]);
    expect(JSON.parse(requests[0].body)).toEqual(backup);
    for (const request of requests.filter(({ method }) => method !== 'PUT')) {
      expect(request.cacheControl).toBe(freshReadHeaders['Cache-Control']);
    }
  });
});
