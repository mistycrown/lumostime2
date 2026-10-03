/**
 * @file feishuNativeConnection.ts
 * @input Explicit Feishu actions, native encrypted persistence and native HTTP.
 * @output Safe connection status and manual calendar results using the desktop execution core.
 * @pos Android local executor; secrets remain internal and never enter UI state or browser storage.
 */
import { FeishuNative, type FeishuNativePlugin } from '../plugins/FeishuNativePlugin';
import { NativeConnectionStore } from './feishu/nativeStore';
import { PersonalFeishuService } from './feishu/personalService';
import { CalendarTestError } from './feishu/calendarTest';
import { nativeFeishuFetch } from './feishu/nativeHttp';

interface Result { status: number; data: any }
export const createNativeFeishuExecutor = (bridge: FeishuNativePlugin, fetchFn: typeof fetch = nativeFeishuFetch) => {
  let loaded: Promise<{ store: NativeConnectionStore; service: PersonalFeishuService; flush: () => Promise<void> }> | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  const load = () => {
    loaded ??= (async () => {
      let snapshot: string | null;
      try { ({ snapshot } = await bridge.read()); }
      catch { throw new CalendarTestError('无法读取飞书本机安全存储，请检查手机状态后重试。', 503); }
      const store = new NativeConnectionStore(snapshot);
      let persisted = store.revision;
      const flush = async () => {
        if (persisted === store.revision) return;
        const revision = store.revision;
        try { await bridge.write({ snapshot: store.serialize() }); }
        catch { throw new CalendarTestError('无法保存飞书本机连接，已停止后续操作，请检查手机安全存储后重试。', 503, true); }
        persisted = revision;
      };
      // Write pending/uncertain ledgers before every provider request, including within a batch.
      const durableFetch: typeof fetch = async (input, init) => { await flush(); return fetchFn(input, init); };
      return { store, flush, service: new PersonalFeishuService(store, undefined, durableFetch) };
    })().catch((error) => { loaded = undefined; throw error; });
    return loaded;
  };

  const execute = async (action: unknown, body: unknown): Promise<Result> => {
    try {
      if (!['status', 'connect', 'calendar', 'test', 'import', 'disconnect'].includes(String(action))) throw new CalendarTestError('操作无效。', 400);
      if (new TextEncoder().encode(JSON.stringify(body ?? {})).length > (action === 'import' ? 256 * 1024 : 4096)) throw new CalendarTestError('飞书请求过大。', 400);
      const { store, service, flush } = await load();
      // A failed save from a previous request must succeed before any new operation starts.
      await flush();
      const token = store.getValue<string>('installation', 'session') || undefined;
      let data: unknown;
      try {
        if (action === 'status') data = await service.readStatus(token);
        else if (action === 'connect') {
          const result = await service.startConnection(token);
          store.setValue('installation', 'session', result.sessionToken);
          data = { authorizeUrl: result.authorizeUrl };
        } else if (action === 'disconnect') {
          service.disconnect(token); store.removeValue('installation', 'session'); data = { ok: true };
        } else if (action === 'test') data = await service.test(token, body);
        else if (action === 'import') data = await service.importLogs(token, body);
        else {
          await service.selectCalendar(token, (body as any)?.calendarId); data = service.status(token);
        }
      } finally { await flush(); }
      return { status: 200, data };
    } catch (error) {
      return { status: error instanceof CalendarTestError ? error.status : 503,
        data: { error: error instanceof CalendarTestError ? error.message : '飞书本机连接暂不可用，请检查手机安全存储后重试。' } };
    }
  };

  // Serialize polling, token refresh and imports so snapshots cannot overwrite newer credentials.
  return (action: unknown, body?: unknown): Promise<Result> => {
    const result = queue.then(() => execute(action, body));
    queue = result.catch(() => undefined);
    return result;
  };
};

const request = createNativeFeishuExecutor(FeishuNative);
export const requestNativeFeishu = (action: unknown, body?: unknown): Promise<Result> => request(action, body);
