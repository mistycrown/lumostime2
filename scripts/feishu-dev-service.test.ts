/**
 * @file feishu-dev-service.test.ts
 * @input Development command arguments, service availability and owned child-process fixtures.
 * @output Coverage for automatic startup, existing-service reuse and cleanup ownership.
 * @pos Feishu development launcher tests.
 */
import { EventEmitter } from 'node:events';
import { expect, it, vi } from 'vitest';
import { shouldStartFeishuDevService, startFeishuDevService } from './feishu-dev-service.mjs';

const status = () => new Response(JSON.stringify({ configured: false, status: 'disconnected' }));
const child = () => Object.assign(new EventEmitter(), { exitCode: null, signalCode: null, kill: vi.fn() });

it('starts a local service only for development without a configured remote service', () => {
  expect(shouldStartFeishuDevService([], {})).toBe(true);
  for (const command of ['build', 'preview', '--help', '--version']) expect(shouldStartFeishuDevService([command], {})).toBe(false);
  expect(shouldStartFeishuDevService([], { VITE_FEISHU_SERVICE_URL: 'https://connect.example' })).toBe(false);
});

it('reuses a ready API without owning or stopping its process', async () => {
  const spawnProcess = vi.fn();
  const stop = await startFeishuDevService({ cwd: process.cwd(), environment: {}, spawnProcess, fetchStatus: vi.fn().mockResolvedValue(status()) });
  stop();
  expect(spawnProcess).not.toHaveBeenCalled();
});

it('starts the API before Vite and stops only the owned child exactly once', async () => {
  const api = child();
  const spawnProcess = vi.fn(() => api);
  const fetchStatus = vi.fn().mockRejectedValueOnce(new Error('not running')).mockResolvedValue(status());
  const before = process.listenerCount('exit');
  const stop = await startFeishuDevService({ cwd: process.cwd(), environment: { FEISHU_PORT: '3099' }, spawnProcess, fetchStatus });
  expect(fetchStatus).toHaveBeenCalledWith('http://127.0.0.1:3099/api/feishu/status', expect.anything());
  expect(spawnProcess.mock.calls[0][1]).toContain('--experimental-sqlite');
  expect(spawnProcess.mock.calls[0][2].stdio).toContain('ipc');
  stop();
  stop();
  expect(api.kill).toHaveBeenCalledTimes(1);
  expect(process.listenerCount('exit')).toBe(before);
});

it('fails cleanly when the child exits before serving the API', async () => {
  const api = Object.assign(child(), { exitCode: 1 });
  const before = process.listenerCount('exit');
  await expect(startFeishuDevService({ cwd: process.cwd(), environment: {}, spawnProcess: vi.fn(() => api),
    fetchStatus: vi.fn().mockRejectedValue(new Error('not running')) })).rejects.toThrow('did not become ready');
  expect(api.kill).not.toHaveBeenCalled();
  expect(process.listenerCount('exit')).toBe(before);
});
