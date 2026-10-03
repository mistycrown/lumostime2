/**
 * @file feishuConnection.ts
 * @input Main-window IPC calls and the build-time unified service origin.
 * @output JSON API responses through the main process HttpOnly cookie session.
 * @pos Electron integration bridge; no Feishu credentials are exposed to the renderer.
 * @updated 2026-10-03: Supports a trusted local personal-app executor before any remote service transport.
 */
import { ipcMain, type BrowserWindow } from 'electron';

export function getFeishuRequestUrl(root: string, action: unknown): string {
  if (!['status', 'connect', 'calendar', 'test', 'import', 'disconnect'].includes(String(action))) throw new Error('Invalid Feishu action');
  if (!root) throw new Error('飞书连接服务尚未开通，请联系 LumosTime 服务维护者。');
  const url = new URL(root);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
    || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid Feishu service origin');
  return `${url.origin}/api/feishu/${action}`;
}

export function registerFeishuConnection(getWindow: () => BrowserWindow | null, serviceRoot: string, rendererUrl: string,
  localFactory?: () => (action: unknown, body: unknown) => Promise<{ status: number; data: unknown }>) {
  let local: ReturnType<NonNullable<typeof localFactory>> | undefined;
  ipcMain.handle('feishu:request', async (event, action: unknown, body: unknown) => {
    const main = getWindow();
    const source = event.senderFrame?.url;
    if (!main || event.sender !== main.webContents || event.senderFrame !== main.webContents.mainFrame
      || !source || source.split(/[?#]/)[0] !== rendererUrl.split(/[?#]/)[0]) throw new Error('Unauthorized Feishu caller');
    if (!['status', 'connect', 'calendar', 'test', 'import', 'disconnect'].includes(String(action))) throw new Error('Invalid Feishu action');
    const content = JSON.stringify(body ?? {});
    if (Buffer.byteLength(content, 'utf8') > (action === 'import' ? 256 * 1024 : 4096)) throw new Error('Feishu request too large');
    if (localFactory) {
      local ??= localFactory();
      return local(action, body);
    }
    if (!serviceRoot) return {
      status: action === 'status' ? 200 : 503,
      data: action === 'status'
        ? { configured: false, status: 'disconnected', error: '飞书连接服务尚未开通，请联系 LumosTime 服务维护者。' }
        : { error: '飞书连接服务尚未开通。' }
    };
    const url = getFeishuRequestUrl(serviceRoot, action);
    const response = await event.sender.session.fetch(url, {
      method: action === 'status' ? 'GET' : 'POST', credentials: 'include', redirect: 'error',
      headers: { 'Content-Type': 'application/json', 'X-Lumos-Feishu-Client': '1' },
      body: action === 'status' ? undefined : content, signal: AbortSignal.timeout(40000)
    });
    return { status: response.status, data: await response.json().catch(() => null) };
  });
}
