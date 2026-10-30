/**
 * @file compatibleS3DesktopTransport.test.ts
 * @input Signed URLs, binary views and modern/legacy abort signals
 * @output Wire-format and cancellation regression coverage
 * @updated 2026-10-30: Verifies SDK query encoding and listener cleanup across bridge outcomes.
 */
import { expect, it, vi } from 'vitest';
import { HttpRequest } from '@smithy/protocol-http';
import { DesktopCompatibleS3RequestHandler } from './compatibleS3DesktopTransport';

const requestMessage = () => new HttpRequest({ protocol: 'https:', hostname: 's3.example.com', port: 9443, path: '/bucket/a%20b', method: 'PUT', headers: { authorization: 'signed' }, query: { 'response-content-disposition': 'inline; filename="a b"', 'x-id': 'GetObject' } });
const response = { status: 200, headers: {}, data: new Uint8Array([0, 255]) };

it('preserves escaped signed paths/queries and the exact binary-view slice', async () => {
  const request = vi.fn().mockResolvedValue(response);
  const handler = new DesktopCompatibleS3RequestHandler({ request }, 'S3Drive');
  const input = requestMessage();
  input.body = new Uint8Array([99, 0, 255, 99]).subarray(1, 3);
  const result = await handler.handle(input);
  expect(request).toHaveBeenCalledWith(expect.objectContaining({
    url: 'https://s3.example.com:9443/bucket/a%20b?response-content-disposition=inline%3B%20filename%3D%22a%20b%22&x-id=GetObject',
    body: new Uint8Array([0, 255]), userAgent: 'S3Drive'
  }));
  expect(new Uint8Array(await result.response.body.arrayBuffer())).toEqual(response.data);
});

it('does not send requests for a signal already aborted', async () => {
  const request = vi.fn();
  const controller = new AbortController();
  controller.abort();
  const handler = new DesktopCompatibleS3RequestHandler({ request }, 'S3Drive');
  await expect(handler.handle(requestMessage(), { abortSignal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  expect(request).not.toHaveBeenCalled();
});

it('cleans up modern abort listeners and accepts a late bridge response after cancellation', async () => {
  let finish: (value: typeof response) => void;
  const request = vi.fn(() => new Promise<typeof response>(resolve => { finish = resolve; }));
  const controller = new AbortController();
  const remove = vi.spyOn(controller.signal, 'removeEventListener');
  const handler = new DesktopCompatibleS3RequestHandler({ request }, 'S3Drive');
  const result = handler.handle(requestMessage(), { abortSignal: controller.signal });
  await vi.waitFor(() => expect(request).toHaveBeenCalled());
  controller.abort();
  await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  finish!(response);
  expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
});

it('restores legacy SDK onabort handlers after a bridge error', async () => {
  const previous = vi.fn();
  const signal = { aborted: false, onabort: previous };
  const request = vi.fn().mockRejectedValue(new Error('offline'));
  const handler = new DesktopCompatibleS3RequestHandler({ request }, 'S3Drive');
  await expect(handler.handle(requestMessage(), { abortSignal: signal })).rejects.toThrow('offline');
  expect(signal.onabort).toBe(previous);
});
