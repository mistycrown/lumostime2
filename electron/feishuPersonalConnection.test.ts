/**
 * @file feishuPersonalConnection.test.ts
 * @input Temporary desktop userData, secure-storage API fixtures and official registration responses.
 * @output Verification of private credential persistence, restart and insecure-storage rejection.
 * @pos Desktop personal connection boundary tests; OS encryption itself is not mocked as live verification.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('electron', () => ({ app: { getPath: vi.fn(), once: vi.fn() }, safeStorage: {
  isEncryptionAvailable: vi.fn(), getSelectedStorageBackend: vi.fn(), encryptString: vi.fn(), decryptString: vi.fn()
} }));
import { app, safeStorage } from 'electron';
import { createPersonalFeishuExecutor } from './feishuPersonalConnection';

let directory: string;
beforeEach(() => {
  vi.clearAllMocks();
  directory = mkdtempSync(join(tmpdir(), 'lumos-feishu-desktop-'));
  vi.mocked(app.getPath).mockReturnValue(directory);
  vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
  vi.mocked(safeStorage.getSelectedStorageBackend).mockReturnValue('gnome_libsecret');
  vi.mocked(safeStorage.encryptString).mockImplementation((value) => Buffer.from(`fixture:${value}`));
  vi.mocked(safeStorage.decryptString).mockImplementation((value) => value.toString().slice(8));
});
const closeStores = () => {
  for (const [, listener] of vi.mocked(app.once).mock.calls) (listener as () => void)();
  vi.mocked(app.once).mockClear();
};
afterEach(() => { closeStores(); rmSync(directory, { recursive: true, force: true }); vi.unstubAllGlobals(); });

it('preserves the encrypted pending installation over restart without exposing device codes or generating another app', async () => {
  const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ device_code: 'private-device-code', user_code: 'USER-CODE',
    verification_uri_complete: 'https://open.feishu.cn/page/launcher?user_code=USER-CODE', interval: 5, expires_in: 3600 })));
  vi.stubGlobal('fetch', fetchFn);
  const execute = createPersonalFeishuExecutor();
  expect((await execute('status', undefined)).data).toMatchObject({ configured: true, connectionMode: 'personal' });
  const started = await execute('connect', {});
  expect(started.status).toBe(200);
  expect(JSON.stringify(started.data)).not.toContain('private-device-code');
  const database = readFileSync(join(directory, 'feishu/personal.sqlite'));
  expect(database.includes(Buffer.from('private-device-code'))).toBe(false);
  expect(safeStorage.encryptString).toHaveBeenCalledTimes(1);
  closeStores();
  const restored = createPersonalFeishuExecutor();
  expect((await restored('status', undefined)).data).toMatchObject({ status: 'pending', phase: 'create' });
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(safeStorage.decryptString).toHaveBeenCalledTimes(1);
  expect(safeStorage.encryptString).toHaveBeenCalledTimes(1);
});

it('refuses unavailable or plaintext system credential storage', () => {
  vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);
  expect(() => createPersonalFeishuExecutor()).toThrow('安全存储');
  vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
  vi.mocked(safeStorage.getSelectedStorageBackend).mockReturnValue('basic_text');
  expect(() => createPersonalFeishuExecutor()).toThrow('安全存储');
  expect(safeStorage.encryptString).not.toHaveBeenCalled();
});

it('does not replace a key when the existing OS-encrypted key cannot be decrypted', () => {
  const execute = createPersonalFeishuExecutor();
  expect(execute).toBeTypeOf('function');
  closeStores();
  const keyPath = join(directory, 'feishu/key.enc');
  writeFileSync(keyPath, 'invalid-key');
  vi.mocked(safeStorage.decryptString).mockImplementation(() => { throw new Error('OS key unavailable'); });
  expect(() => createPersonalFeishuExecutor()).toThrow('安全存储');
  expect(readFileSync(keyPath, 'utf8')).toBe('invalid-key');
  expect(safeStorage.encryptString).toHaveBeenCalledTimes(1);
});
