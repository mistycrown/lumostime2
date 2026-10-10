/**
 * @file webdavService.test.ts
 * @input Native HTTP/filesystem adapters and a local WebDAV server rejecting invalid paths
 * @output Regression coverage for canonical backup/image paths, UTF-8 uploads, and fresh reads
 * @pos Test (Cloud Sync)
 * @updated 2026-10-10: Covers Nutstore-compatible native uploads and real WebDAV client requests.
 */
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const adapters = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  sendRequest: vi.fn(),
  setDataSerializer: vi.fn(),
  downloadFile: vi.fn(),
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
const requests: { method: string; path: string; cacheControl?: string; body: string }[] = [];
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
      body: Buffer.concat(chunks).toString('utf8')
    });
    // Reject both actual queries and query text encoded into a filename by the SDK.
    if (decodeURIComponent(path).includes('?')) {
      response.writeHead(400).end('the nutstore path is not valid');
      return;
    }
    if (request.method === 'PROPFIND') {
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
      response.writeHead(200, { 'Content-Type': 'application/json' });
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
  adapters.isNativePlatform.mockReturnValue(false);
  adapters.sendRequest.mockImplementation(async (url: string) => {
    if (url.includes('?')) throw { status: 400, error: 'the nutstore path is not valid' };
    return { status: 201 };
  });
  adapters.downloadFile.mockResolvedValue({ path: 'temp/download.json' });
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
  return service;
};

describe('native WebDAV paths', () => {
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
      `${baseUrl}/lumostime_backup.json`,
      `${baseUrl}/lumostime_images.json`,
      `${baseUrl}/images/photo.webp`
    ]);
    for (const [options] of adapters.downloadFile.mock.calls) {
      expect(options.headers).toMatchObject(freshReadHeaders);
      expect(options.headers.Authorization).toMatch(/^Basic /);
    }
  });
});

describe('Web/Electron real WebDAV requests', () => {
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
