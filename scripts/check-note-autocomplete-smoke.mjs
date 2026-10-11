/**
 * @file check-note-autocomplete-smoke.mjs
 * @updated 2026-10-11: Checks real log-modal first-tap positioning during delayed keyboard movement and respects manual navigation at desktop/mobile widths.
 * @updated 2026-10-11: Checks review guide completion at desktop/mobile widths, with native touch and screenshots.
 * @updated 2026-10-10: Checks system text zoom separately from CSS text inflation using native caret pixels.
 * @input Installed Chrome, production CSS and real note-editor regression harness
 * @output Browser checks and desktop/mobile screenshots in node_modules/.cache/note-autocomplete-smoke
 * @pos Development verification script
 * @updated 2026-10-09: Runs an isolated browser bundle without development reloads or user browser data.
 * @updated 2026-10-09: Measures actual mobile caret pixels against the ghost text, including fractional widths and mixed Chinese/English wrapping.
 */
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import sharp from 'sharp';

const chromePath = process.env.NOTE_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const fontPath = 'C:/Windows/Fonts/msyh.ttc';
await access(chromePath);
await access(fontPath);
const profile = await mkdtemp(path.join(os.tmpdir(), 'lumostime-note-smoke-'));
const output = path.resolve('node_modules/.cache/note-autocomplete-smoke');
await mkdir(output, { recursive: true });
const bundle = await build({
  entryPoints: ['src/components/__tests__/noteAutocompleteRendererHarness.tsx'], bundle: true,
  platform: 'browser', format: 'iife', write: false, loader: { '.css': 'empty' },
  define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '{"DEV":false,"VITE_APP_VERSION":"test"}' }
});
const cssFile = (await readdir('dist/assets')).find((file) => /^index-.*\.css$/.test(file));
if (!cssFile) throw new Error('Run npm run build before browser verification');
const css = await readFile(path.join('dist/assets', cssFile));
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/test.css"><style>@font-face{font-family:VerifiedChinese;src:url(/verified-chinese.ttf)}body{margin:0;background:#faf9f6;font-family:VerifiedChinese,sans-serif;--font-family:VerifiedChinese;--accent-color:#78716c}</style></head><body><div id="root"></div><script src="/test.js"></script></body></html>';
const server = createServer((request, response) => {
  if (request.url === '/verified-chinese.ttf') {
    response.setHeader('Content-Type', 'font/collection'); createReadStream(fontPath).pipe(response); return;
  }
  if (request.url === '/test.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(bundle.outputFiles[0].contents); return; }
  if (request.url === '/test.css') { response.setHeader('Content-Type', 'text/css'); response.end(css); return; }
  if (request.url !== '/note-autocomplete-smoke') { response.statusCode = 404; response.end(); return; }
  response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/note-autocomplete-smoke`;
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--disable-background-networking', '--disable-sync', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
const pending = new Map();
let sequence = 0;
const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 60000);
  pending.set(id, { resolve, reject, timer });
  socket.send(JSON.stringify({ id, method, params }));
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
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await delay(); }
  }
  if (!port) throw new Error('Headless Chrome did not start');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') console.error(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') console.error(message.params.args.map((arg) => arg.value || arg.description || '').join(' '));
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
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
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate('Boolean(window.__noteAutocompleteHarness)')) break;
    await delay();
  }
  const passed = await evaluate('window.__noteAutocompleteHarness.run()');
  passed.push(await evaluate('window.__noteAutocompleteHarness.runNoteFocus()'));
  passed.push((await evaluate('window.__noteAutocompleteHarness.runReview()')).at(-1));
  await capture('desktop');
  // Real Tab input exercises focus routing in addition to the harness's synthetic IME events.
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await delay();
  if (!await evaluate('document.querySelector("textarea").value.endsWith("论文") && document.activeElement === document.querySelector("textarea")')) throw new Error('Real Tab did not accept inline completion');
  passed.push('Real browser Tab accepts completion without moving focus');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  passed.push(await evaluate('window.__noteAutocompleteHarness.runNoteFocus()'));
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' });
  const mobileGeometry = await evaluate('window.__noteAutocompleteHarness.prepareMobileCase()');
  await capture('mobile-wrap');
  const pixels = await sharp(path.join(output, 'mobile-wrap.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const caretPixels = [];
  for (let y = Math.ceil(mobileGeometry.input.top); y < mobileGeometry.input.top + mobileGeometry.input.height; y += 1) {
    for (let x = Math.ceil(mobileGeometry.input.left); x < mobileGeometry.input.left + mobileGeometry.input.width; x += 1) {
      const offset = (y * pixels.info.width + x) * 4;
      if (pixels.data[offset] > 200 && pixels.data[offset + 1] < 80 && pixels.data[offset + 2] < 80) caretPixels.push({ x, y });
    }
  }
  if (!caretPixels.length) throw new Error('Native caret was not visible in the mobile screenshot');
  const caretLeft = Math.min(...caretPixels.map((point) => point.x));
  const caretTop = Math.min(...caretPixels.map((point) => point.y));
  console.log(JSON.stringify({ mobileGeometry, nativeCaret: { left: caretLeft, top: caretTop } }));
  if (Math.abs(caretLeft - mobileGeometry.suffix.left) > 3 || Math.abs(caretTop - mobileGeometry.suffix.top) > mobileGeometry.fontSize / 2) throw new Error('Mobile ghost text does not follow the actual native caret');
  passed.push('Mobile wrap fixture at 110% WebView text zoom aligns with actual textarea caret pixels');
  await evaluate('window.__noteAutocompleteHarness.restoreTextZoom()');
  await evaluate('window.__noteAutocompleteHarness.renderEditor()');
  await evaluate('window.__noteAutocompleteHarness.setText("今天修改论")');
  await capture('mobile');
  const button = await evaluate('(() => { const r = document.querySelector("[aria-label=接受备注补全]").getBoundingClientRect(); return { x:r.x+r.width/2,y:r.y+r.height/2 }; })()');
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [button] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await delay(300);
  if (!await evaluate('document.querySelector("textarea").value.endsWith("论文") && document.activeElement === document.querySelector("textarea")')) throw new Error('Real touch acceptance lost text or focus');
  passed.push('Mobile touch button accepts completion and preserves editor focus');
  passed.push((await evaluate('window.__noteAutocompleteHarness.runReview()')).at(-1));
  await evaluate('window.__noteAutocompleteHarness.renderReview()');
  await evaluate('window.__noteAutocompleteHarness.setText("今天修改论")');
  await capture('review-mobile');
  const reviewButton = await evaluate('(() => { const r = document.querySelector("[aria-label=接受备注补全]").getBoundingClientRect(); return { x:r.x+r.width/2,y:r.y+r.height/2 }; })()');
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [reviewButton] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await delay(300);
  if (!await evaluate('document.querySelector("textarea").value === "今天修改论文" && document.activeElement === document.querySelector("textarea")')) throw new Error('Review touch completion did not update the answer');
  passed.push('Review guide native mobile touch accepts completion and keeps answer focus');
  await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 760, deviceScaleFactor: 1, mobile: false });
  await evaluate('window.__noteAutocompleteHarness.renderReview()');
  await evaluate('window.__noteAutocompleteHarness.setText("今天修改论")');
  await capture('review-desktop');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await delay();
  if (!await evaluate('document.querySelector("textarea").value === "今天修改论文" && document.activeElement === document.querySelector("textarea")')) throw new Error('Review native Tab lost the answer or focus');
  passed.push('Review guide native desktop Tab accepts completion and keeps answer focus');
  await writeFile(path.join(output, 'result.json'), JSON.stringify({ passed }, null, 2));
  console.log(JSON.stringify({ passed, screenshots: output }, null, 2));
} catch (error) {
  if (socket?.readyState === WebSocket.OPEN) {
    await capture('failure');
    console.error(await evaluate('JSON.stringify({passed:window.__noteAutocompleteHarness?.passed,body:document.body.innerText.slice(0,1500),value:document.querySelector("textarea")?.value,draft:document.querySelector("[data-draft]")?.textContent,ghost:document.querySelector("[data-note-completion-suffix]")?.textContent,focused:document.activeElement?.tagName})'));
  }
  throw error;
} finally {
  if (socket?.readyState === WebSocket.OPEN) await send('Browser.close').catch(() => {});
  chrome.kill();
  await new Promise((resolve) => server.close(resolve));
  const resolvedProfile = path.resolve(profile);
  if (resolvedProfile.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolvedProfile).startsWith('lumostime-note-smoke-')) {
    await rm(resolvedProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
  }
}
