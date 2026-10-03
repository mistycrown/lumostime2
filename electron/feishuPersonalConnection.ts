/**
 * @file feishuPersonalConnection.ts
 * @input Trusted Feishu IPC actions and the operating system's secure credential storage.
 * @output Local personal-app connection and durable calendar imports without a remote server.
 * @pos Electron main process; application secrets and user tokens never reach the renderer.
 * @updated 2026-10-03: Uses the same personal authorization and calendar core as Android.
 */
import { app, safeStorage } from 'electron';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { OAuthStore } from '../server/feishu/oauthStore';
import { PersonalFeishuService } from '../src/services/feishu/personalService';
import { CalendarTestError } from '../src/services/feishu/calendarTest';

export function createPersonalFeishuExecutor() {
  if (!safeStorage.isEncryptionAvailable() || safeStorage.getSelectedStorageBackend?.() === 'basic_text') {
    throw new Error('系统安全存储不可用，暂时无法保存飞书连接。');
  }
  const directory = join(app.getPath('userData'), 'feishu');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const keyPath = join(directory, 'key.enc');
  let key: string;
  try { key = safeStorage.decryptString(readFileSync(keyPath)); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('无法读取飞书安全存储，请检查系统登录状态。');
    key = randomBytes(32).toString('base64');
    writeFileSync(keyPath, safeStorage.encryptString(key), { mode: 0o600, flag: 'wx' });
  }
  const store = new OAuthStore(join(directory, 'personal.sqlite'), key);
  const service = new PersonalFeishuService(store);
  app.once('will-quit', () => store.close());
  return async (action: unknown, body: unknown) => {
    const token = store.getValue<string>('installation', 'session') || undefined;
    try {
      let data: unknown;
      if (action === 'status') data = await service.readStatus(token);
      else if (action === 'connect') {
        const result = await service.startConnection(token);
        store.setValue('installation', 'session', result.sessionToken);
        data = { authorizeUrl: result.authorizeUrl };
      } else if (action === 'disconnect') {
        service.disconnect(token); store.removeValue('installation', 'session'); data = { ok: true };
      } else if (action === 'test') data = await service.test(token, body);
      else if (action === 'import') data = await service.importLogs(token, body);
      else if (action === 'calendar') {
        await service.selectCalendar(token, (body as any)?.calendarId); data = service.status(token);
      } else throw new CalendarTestError('操作无效。', 400);
      return { status: 200, data };
    } catch (error) {
      return { status: error instanceof CalendarTestError ? error.status : 500,
        data: { error: error instanceof CalendarTestError ? error.message : '飞书操作暂未完成，请稍后重试。' } };
    }
  };
}
