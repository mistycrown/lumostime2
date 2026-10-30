/**
 * @file compatibleS3DesktopTransport.ts
 * @input AWS SDK signed requests and the preload S3 bridge
 * @output Smithy responses from cookie-free desktop HTTP requests
 * @updated 2026-10-30: Sends custom User-Agent through Electron while preserving signed URLs and binary bodies.
 */
import { HttpRequest, HttpResponse } from '@smithy/protocol-http';
import { buildQueryString } from '@smithy/querystring-builder';
import type { HttpHandlerOptions } from '@smithy/types';
import type { DesktopS3Bridge, DesktopS3Response } from '../utils/compatibleS3Transport';

export class DesktopCompatibleS3RequestHandler {
  constructor(private bridge: DesktopS3Bridge, private userAgent: string) {}

  destroy() {}
  updateHttpClientConfig() {}
  httpHandlerConfigs() { return {}; }

  async handle(request: HttpRequest, options: HttpHandlerOptions = {}): Promise<{ response: HttpResponse }> {
    const signal = options.abortSignal;
    const abortError = () => Object.assign(new Error('S3 request aborted'), { name: 'AbortError' });
    if (signal?.aborted) throw abortError();
    const query = buildQueryString(request.query);
    const port = request.port ? `:${request.port}` : '';
    const url = `${request.protocol}//${request.hostname}${port}${request.path}${query ? `?${query}` : ''}`;
    let body: Uint8Array | undefined;
    if (request.body !== undefined && request.body !== null) {
      if (typeof request.body === 'string') body = new TextEncoder().encode(request.body);
      else if (request.body instanceof Blob) body = new Uint8Array(await request.body.arrayBuffer());
      else if (request.body instanceof ArrayBuffer) body = new Uint8Array(request.body);
      else if (ArrayBuffer.isView(request.body)) body = new Uint8Array(request.body.buffer, request.body.byteOffset, request.body.byteLength);
      else throw new Error('Unsupported S3 request body');
    }
    if (signal?.aborted) throw abortError();
    const result = await new Promise<DesktopS3Response>((resolve, reject) => {
      const modernSignal = signal && 'addEventListener' in signal ? signal as AbortSignal : undefined;
      const previousAbort = signal?.onabort;
      const cleanup = () => {
        modernSignal?.removeEventListener('abort', abort);
        if (!modernSignal && signal?.onabort === abort) signal.onabort = previousAbort;
      };
      const abort = () => { cleanup(); reject(abortError()); };
      if (modernSignal) modernSignal.addEventListener('abort', abort, { once: true });
      else if (signal) signal.onabort = abort;
      Promise.resolve().then(() => this.bridge.request({
        url, method: request.method, headers: request.headers, body, userAgent: this.userAgent, timeout: options.requestTimeout
      })).then((value) => { cleanup(); resolve(value); }, (error) => { cleanup(); reject(error); });
    });
    return { response: new HttpResponse({ statusCode: result.status, headers: result.headers, body: new Blob([result.data]) }) };
  }
}
