/**
 * @file compatibleS3Request.ts
 * @input Trusted main-frame requests containing signed S3 HTTP messages
 * @output Cookie-free HTTP responses with a configurable standard User-Agent
 * @updated 2026-10-30: Adds a validated Electron network bridge with bounded requests and no redirects.
 */
import { ipcMain, net, type BrowserWindow } from 'electron';
import { normalizeS3UserAgent, type DesktopS3Request, type DesktopS3Response } from '../src/utils/compatibleS3Transport';

const MAX_BYTES = 256 * 1024 * 1024;
// Electron derives Host and Content-Length from the URL/body; setting either is forbidden.
const ALLOWED_HEADERS = /^(authorization|content-type|content-md5|cache-control|if-none-match|if-match|range|x-amz-[a-z0-9-]+)$/i;

export async function sendCompatibleS3Request(input: DesktopS3Request): Promise<DesktopS3Response> {
  if (!input || typeof input.url !== 'string' || typeof input.method !== 'string') throw new Error('Invalid S3 request');
  const url = new URL(input.url);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) throw new Error('Invalid S3 URL');
  if (!['GET', 'HEAD', 'PUT', 'POST', 'DELETE'].includes(input.method)) throw new Error('Invalid S3 method');
  const userAgent = normalizeS3UserAgent(input.userAgent);
  if (input.body !== undefined && (!(input.body instanceof Uint8Array) || input.body.byteLength > MAX_BYTES)) throw new Error('Invalid S3 body');
  if (!input.headers || typeof input.headers !== 'object' || Array.isArray(input.headers)) throw new Error('Invalid S3 headers');
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(input.headers)) {
    if (!ALLOWED_HEADERS.test(name)) continue;
    if (typeof value !== 'string' || /[\r\n\0]/.test(value)) throw new Error('Invalid S3 header');
    headers[name] = value;
  }
  const timeout = typeof input.timeout === 'number' && Number.isFinite(input.timeout) && input.timeout > 0
    ? Math.min(input.timeout, 300_000) : 60_000;

  return new Promise((resolve, reject) => {
    const request = net.request({ url: input.url, method: input.method, redirect: 'error', credentials: 'omit', useSessionCookies: false });
    const timer = setTimeout(() => {
      fail(Object.assign(new Error('S3 request timed out'), { name: 'TimeoutError' }));
      request.abort();
    }, timeout);
    const fail = (error: Error) => { clearTimeout(timer); reject(error); };
    request.on('error', fail);
    request.on('abort', () => fail(Object.assign(new Error('S3 request aborted'), { name: 'AbortError' })));
    request.on('response', (response) => {
      const chunks: Buffer[] = [];
      let size = 0;
      response.on('error', fail);
      response.on('aborted', () => fail(new Error('S3 response interrupted')));
      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BYTES) {
          fail(new Error('S3 response too large'));
          request.abort();
          return;
        }
        chunks.push(Buffer.from(chunk));
      });
      response.on('end', () => {
        clearTimeout(timer);
        const responseHeaders: Record<string, string> = {};
        for (const [name, value] of Object.entries(response.headers)) {
          if (name.toLowerCase() === 'set-cookie' || value === undefined) continue;
          responseHeaders[name.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
        }
        resolve({ status: response.statusCode, headers: responseHeaders, data: new Uint8Array(Buffer.concat(chunks)) });
      });
    });
    try {
      for (const [name, value] of Object.entries(headers)) request.setHeader(name, value);
      if (userAgent) request.setHeader('User-Agent', userAgent);
      request.end(input.body === undefined ? undefined : Buffer.from(input.body));
    } catch (error) {
      fail(error instanceof Error ? error : new Error('S3 request failed'));
      request.abort();
    }
  });
}

export function registerCompatibleS3Request(getWindow: () => BrowserWindow | null, rendererUrl: string,
  getAIWindow: () => BrowserWindow | null = () => null): void {
  ipcMain.handle('compatible-s3:request', async (event, input: DesktopS3Request) => {
    const caller = [getWindow(), getAIWindow()].find((window) => window && event.sender === window.webContents);
    const source = event.senderFrame?.url;
    if (!caller || event.senderFrame !== caller.webContents.mainFrame
      || !source || source.split(/[?#]/)[0] !== rendererUrl.split(/[?#]/)[0]) throw new Error('Unauthorized S3 caller');
    return sendCompatibleS3Request(input);
  });
}
