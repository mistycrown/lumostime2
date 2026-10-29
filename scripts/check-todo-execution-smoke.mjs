/**
 * @file check-todo-execution-smoke.mjs
 * @updated 2026-10-29: Checks real execution views and reusable label management at both viewport widths.
 * @input Installed Chrome, production CSS and real todo/picker harness
 * @output Browser checks and screenshots in node_modules/.cache/todo-execution-smoke
 * @pos Development verification script
 */
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';

const chromePath = process.env.NOTE_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const fontPath = 'C:/Windows/Fonts/msyh.ttc';
await access(chromePath); await access(fontPath);
const output = path.resolve('node_modules/.cache/todo-execution-smoke');
await mkdir(output, { recursive: true });
const bundle = await build({
  entryPoints: ['src/components/__tests__/todoExecutionRendererHarness.tsx'], bundle: true,
  platform: 'browser', format: 'iife', write: false, loader: { '.css': 'empty', '.md': 'text' },
  plugins: [{ name: 'isolate-ai-chat-host', setup(builder) {
    builder.onResolve({ filter: /AIChatWindowContext$/ }, () => ({ path: 'ai-chat-host', namespace: 'execution-smoke' }));
    builder.onLoad({ filter: /.*/, namespace: 'execution-smoke' }, () => ({ contents: 'export const useAIChatWindow = () => ({ openAIChat() {}, unreadCount: 0 }); export const AIChatWindowProvider = ({ children }) => children;', loader: 'js' }));
  } }],
  define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '{"DEV":false,"VITE_APP_VERSION":"test"}' }
});
const profile = await mkdtemp(path.join(os.tmpdir(), 'lumostime-execution-smoke-'));
const cssFile = (await readdir('dist/assets')).find((file) => /^index-.*\.css$/.test(file));
if (!cssFile) throw new Error('Run npm run build before browser verification');
const css = await readFile(path.join('dist/assets', cssFile));
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/test.css"><style>@font-face{font-family:VerifiedChinese;src:url(/verified-chinese.ttf)}body{margin:0;background:#faf9f6;font-family:VerifiedChinese,sans-serif;--font-family:VerifiedChinese;--accent-color:#78716c}</style></head><body><div id="root"></div><script src="/test.js"></script></body></html>';
const server = createServer((request, response) => {
  if (request.url === '/verified-chinese.ttf') { response.setHeader('Content-Type', 'font/collection'); createReadStream(fontPath).pipe(response); return; }
  if (request.url === '/test.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(bundle.outputFiles[0].contents); return; }
  if (request.url === '/test.css') { response.setHeader('Content-Type', 'text/css'); response.end(css); return; }
  response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/dictionary-smoke`;
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--disable-background-networking', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-sync', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
let sequence = 0;
const pending = new Map();
const errors = [];
const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 60000);
  pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const capture = async (name) => {
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(path.join(output, `${name}.png`), Buffer.from(result.data, 'base64'));
};
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await delay(); }
  }
  if (!port) throw new Error('Headless Chrome did not start');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (!message.id) return;
    const request = pending.get(message.id); if (!request) return;
    clearTimeout(request.timer); pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
  });
  socket.addEventListener('close', () => {
    for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error('Browser closed')); }
    pending.clear();
  });
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 760, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  await send('Page.bringToFront');
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate('Boolean(window.__todoExecutionHarness)')) break;
    await delay();
  }
  const passed = await evaluate('window.__todoExecutionHarness.run()');
  await evaluate('window.__todoExecutionHarness.prepare()'); await capture('desktop');
  await evaluate("window.__todoExecutionHarness.prepare('select')"); await capture('desktop-modal');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });
  passed.push(...await evaluate('window.__todoExecutionHarness.run()'));
  await evaluate('window.__todoExecutionHarness.prepare()'); await capture('mobile');
  await evaluate("window.__todoExecutionHarness.prepare('manage')"); await capture('mobile-manage');
  await evaluate("window.__todoExecutionHarness.prepare('quick')"); await capture('mobile-quick-actions');
  if (errors.length) throw new Error(errors.join('\n'));
  passed.push('Desktop and mobile execution views and portal modals fit their viewports');
  await writeFile(path.join(output, 'result.json'), JSON.stringify({ passed }, null, 2));
  console.log(JSON.stringify({ passed, screenshots: output }, null, 2));
} catch (error) {
  if (errors.length) console.error(errors.join('\n'));
  if (socket?.readyState === WebSocket.OPEN) await capture('failure').catch(() => {});
  throw error;
} finally {
  if (socket?.readyState === WebSocket.OPEN) await send('Browser.close').catch(() => {});
  chrome.kill(); await new Promise((resolve) => server.close(resolve));
  const resolvedProfile = path.resolve(profile);
  if (resolvedProfile.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolvedProfile).startsWith('lumostime-execution-smoke-')) {
    await rm(resolvedProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
  }
}
