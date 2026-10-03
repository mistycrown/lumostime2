/**
 * @file feishuConnection.test.ts
 * @input Electron frame and session transport fixtures.
 * @output Coverage for trusted callers, restricted destinations and cookie-safe responses.
 * @pos Desktop Feishu bridge tests.
 */
import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('electron', () => ({ ipcMain: { handle: vi.fn() } }));
import { ipcMain } from 'electron';
import { getFeishuRequestUrl, registerFeishuConnection } from './feishuConnection';

beforeEach(() => vi.clearAllMocks());

it('runs personal connection locally only after caller and payload validation', async () => {
  const frame = { url: 'file:///app/index.html' };
  const sender = { mainFrame: frame, session: { fetch: vi.fn() } };
  const execute = vi.fn().mockResolvedValue({ status: 200, data: { configured: true, status: 'disconnected', connectionMode: 'personal' } });
  const factory = vi.fn(() => execute);
  registerFeishuConnection(() => ({ webContents: sender }) as any, '', frame.url, factory);
  const handle = vi.mocked(ipcMain.handle).mock.calls[0][1];
  await expect(handle({ sender: {}, senderFrame: frame } as any, 'status')).rejects.toThrow('Unauthorized');
  expect(factory).not.toHaveBeenCalled();
  expect((await handle({ sender, senderFrame: frame } as any, 'status')).data).toMatchObject({ connectionMode: 'personal' });
  await handle({ sender, senderFrame: frame } as any, 'status');
  expect(factory).toHaveBeenCalledTimes(1);
  expect(sender.session.fetch).not.toHaveBeenCalled();
  await expect(handle({ sender, senderFrame: frame } as any, 'test', { value: 'x'.repeat(5000) })).rejects.toThrow('too large');
});

it('restricts the bridge to the configured service origin and known actions', () => {
  expect(getFeishuRequestUrl('https://connect.example', 'test')).toBe('https://connect.example/api/feishu/test');
  for (const root of ['', 'http://remote.example', 'https://user:password@example.com', 'https://example.com/other']) {
    expect(() => getFeishuRequestUrl(root, 'status')).toThrow();
  }
  expect(() => getFeishuRequestUrl('https://connect.example', 'https://evil.example')).toThrow();
});

it('uses main-process cookie fetch and returns only JSON, without response cookie headers', async () => {
  const frame = { url: 'file:///app/index.html' };
  const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ configured: true, status: 'pending' }), { headers: { 'Set-Cookie': 'secret-cookie' } }));
  const sender = { mainFrame: frame, session: { fetch: fetchFn } };
  registerFeishuConnection(() => ({ webContents: sender }) as any, 'https://connect.example', frame.url);
  const handle = vi.mocked(ipcMain.handle).mock.calls[0][1];
  const result = await handle({ sender, senderFrame: frame } as any, 'connect', {});
  expect(fetchFn).toHaveBeenCalledWith('https://connect.example/api/feishu/connect', expect.objectContaining({ credentials: 'include', redirect: 'error', method: 'POST' }));
  expect(result).toEqual({ status: 200, data: { configured: true, status: 'pending' } });
  expect(JSON.stringify(result)).not.toContain('secret-cookie');
});

it('rejects other windows, child frames, remote navigation and oversized requests before fetching', async () => {
  const frame = { url: 'file:///app/index.html' };
  const fetchFn = vi.fn();
  const sender = { mainFrame: frame, session: { fetch: fetchFn } };
  registerFeishuConnection(() => ({ webContents: sender }) as any, 'https://connect.example', frame.url);
  const handle = vi.mocked(ipcMain.handle).mock.calls[0][1];
  await expect(handle({ sender: {}, senderFrame: frame } as any, 'status')).rejects.toThrow('Unauthorized');
  await expect(handle({ sender, senderFrame: { ...frame } } as any, 'status')).rejects.toThrow('Unauthorized');
  frame.url = 'https://evil.example/';
  await expect(handle({ sender, senderFrame: frame } as any, 'status')).rejects.toThrow('Unauthorized');
  frame.url = 'file:///app/index.html';
  await expect(handle({ sender, senderFrame: frame } as any, 'test', { oversized: 'x'.repeat(5000) })).rejects.toThrow('too large');
  expect(fetchFn).not.toHaveBeenCalled();
});

it('shows an unavailable service without asking the desktop user to enter configuration', async () => {
  const frame = { url: 'file:///app/index.html' };
  const sender = { mainFrame: frame, session: { fetch: vi.fn() } };
  registerFeishuConnection(() => ({ webContents: sender }) as any, '', frame.url);
  const handle = vi.mocked(ipcMain.handle).mock.calls[0][1];
  expect((await handle({ sender, senderFrame: frame } as any, 'status')).data).toMatchObject({ configured: false, status: 'disconnected' });
  expect(sender.session.fetch).not.toHaveBeenCalled();
});

it('returns malformed upstream responses as unavailable data rather than IPC transport failures', async () => {
  const frame = { url: 'file:///app/index.html' };
  const sender = { mainFrame: frame, session: { fetch: vi.fn().mockResolvedValue(new Response('', { status: 502 })) } };
  registerFeishuConnection(() => ({ webContents: sender }) as any, 'https://connect.example', frame.url);
  const handle = vi.mocked(ipcMain.handle).mock.calls[0][1];
  expect(await handle({ sender, senderFrame: frame } as any, 'connect', {})).toEqual({ status: 502, data: null });
});
