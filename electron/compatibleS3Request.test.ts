/**
 * @file compatibleS3Request.test.ts
 * @input Electron request and caller fixtures
 * @output Header, body, caller, redirect and failure regression coverage
 * @updated 2026-10-30: Covers the native S3 network boundary.
 */
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('electron', () => ({ ipcMain: { handle: vi.fn() }, net: { request: vi.fn() } }));
import { ipcMain, net } from 'electron';
import { registerCompatibleS3Request, sendCompatibleS3Request } from './compatibleS3Request';

const message = { url: 'https://s3.example.com/bucket/key?x-id=GetObject', method: 'GET', headers: { authorization: 'AWS4-HMAC-SHA256 test' } };
let request: EventEmitter & { setHeader: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; abort: ReturnType<typeof vi.fn> };
let response: EventEmitter & { headers: Record<string, string | string[]>; statusCode: number };

describe('Electron S3 boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    request = Object.assign(new EventEmitter(), { setHeader: vi.fn(), end: vi.fn(), abort: vi.fn() });
    response = Object.assign(new EventEmitter(), { statusCode: 401, headers: { 'Content-Type': 'application/xml', 'set-cookie': ['private'] } });
    vi.mocked(net.request).mockReturnValue(request as any);
  });
  afterEach(() => vi.useRealTimers());
  const finish = () => {
    request.emit('response', response);
    response.emit('data', Buffer.from([0, 128, 255]));
    response.emit('end');
  };

  it('sets the real User-Agent, preserves signed headers/body and excludes cookies and proxy headers', async () => {
    const result = sendCompatibleS3Request({ ...message, method: 'PUT', userAgent: ' S3Drive ', body: new Uint8Array([1, 255]), headers: { ...message.headers, Host: 's3.example.com', 'Content-Length': '2', Cookie: 'private', 'Proxy-Authorization': 'private', Connection: 'keep-alive', 'User-Agent': 'untrusted', 'x-amz-date': 'signed-date' } });
    expect(net.request).toHaveBeenCalledWith(expect.objectContaining({ redirect: 'error', credentials: 'omit', useSessionCookies: false, url: message.url }));
    expect(request.setHeader.mock.calls).toEqual([['authorization', message.headers.authorization], ['x-amz-date', 'signed-date'], ['User-Agent', 'S3Drive']]);
    expect(request.end).toHaveBeenCalledWith(Buffer.from([1, 255]));
    finish();
    expect(await result).toEqual({ status: 401, headers: { 'content-type': 'application/xml' }, data: new Uint8Array([0, 128, 255]) });
  });

  it('does not set a blank identity', async () => {
    const result = sendCompatibleS3Request({ ...message, userAgent: '   ' });
    finish();
    await result;
    expect(request.setHeader).not.toHaveBeenCalledWith('User-Agent', expect.anything());
  });

  it('rejects invalid identity, schemes, credentials, methods and signed header injection before requesting', async () => {
    for (const input of [
      { ...message, userAgent: 'S3Drive\r\nCookie: x' },
      { ...message, url: 'file:///local' },
      { ...message, url: 'https://user:pass@example.com/' },
      { ...message, method: 'CONNECT' },
      { ...message, headers: { authorization: 'signed\r\ninjected' } }
    ]) await expect(sendCompatibleS3Request(input)).rejects.toThrow();
    expect(net.request).not.toHaveBeenCalled();
  });

  it('rejects network errors and timeouts instead of reporting successful empty data', async () => {
    const networkFailure = sendCompatibleS3Request(message);
    request.emit('error', new Error('connection failed'));
    await expect(networkFailure).rejects.toThrow('connection failed');
    vi.useFakeTimers();
    const timeout = sendCompatibleS3Request({ ...message, timeout: 50 });
    const check = expect(timeout).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(50);
    await check;
    expect(request.abort).toHaveBeenCalled();
  });

  it('authorizes only the expected main frame before using the network', async () => {
    const frame = { url: 'file:///app/index.html' };
    const sender = { mainFrame: frame };
    registerCompatibleS3Request(() => ({ webContents: sender }) as any, frame.url);
    const handle = vi.mocked(ipcMain.handle).mock.calls[0][1];
    await expect(handle({ sender: {}, senderFrame: frame } as any, message)).rejects.toThrow('Unauthorized');
    await expect(handle({ sender, senderFrame: { ...frame } } as any, message)).rejects.toThrow('Unauthorized');
    frame.url = 'https://remote.example.com/';
    await expect(handle({ sender, senderFrame: frame } as any, message)).rejects.toThrow('Unauthorized');
    expect(net.request).not.toHaveBeenCalled();
    frame.url = 'file:///app/index.html';
    const result = handle({ sender, senderFrame: frame } as any, message);
    finish();
    expect((await result).status).toBe(401);
  });

  it('also permits the known AI app window sharing the sync lifecycle, but rejects its subframes', async () => {
    const frame = { url: 'file:///app/index.html?window=desktop-ai' };
    const sender = { mainFrame: frame };
    registerCompatibleS3Request(() => null, 'file:///app/index.html', () => ({ webContents: sender }) as any);
    const handle = vi.mocked(ipcMain.handle).mock.calls[0][1];
    await expect(handle({ sender, senderFrame: { ...frame } } as any, message)).rejects.toThrow('Unauthorized');
    expect(net.request).not.toHaveBeenCalled();
    const result = handle({ sender, senderFrame: frame } as any, message);
    finish();
    expect((await result).status).toBe(401);
  });
});
