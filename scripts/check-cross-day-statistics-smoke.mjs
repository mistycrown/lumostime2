/**
 * @file check-cross-day-statistics-smoke.mjs
 * @updated 2026-10-25: Verifies bounded SVG glyphs and title-row icons for cross-day/tag/category calendars.
 * @updated 2026-10-25: Checks independent overviews, sequence colors, narrow clock labels and cropped timeline axes.
 * @input Installed Chrome, verified Microsoft YaHei font and production CSS.
 * @output Isolated desktop/mobile browser assertions and screenshots in node_modules/.cache/cross-day-statistics-smoke.
 * @pos Development verification script
 * @updated 2026-10-25: Verifies real cross-day card editing, persistence, charts and Chinese rendering.
 * @updated 2026-10-25: Captures compact annual/all-time charts and checks four-digit boundary editing.
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
const output = path.resolve('node_modules/.cache/cross-day-statistics-smoke');
await mkdir(output, { recursive: true });
const bundle = await build({ entryPoints: ['src/components/__tests__/crossDayStatisticsRendererHarness.tsx'],
  bundle: true, platform: 'browser', format: 'iife', write: false, loader: { '.css': 'empty' },
  define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '{"DEV":false,"VITE_APP_VERSION":"test"}' } });
const cssFile = (await readdir('dist/assets')).find(file => /^index-.*\.css$/.test(file));
if (!cssFile) throw new Error('Run npm run build before browser verification');
const css = await readFile(path.join('dist/assets', cssFile));
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/test.css"><style>@font-face{font-family:VerifiedChinese;src:url(/verified-chinese.ttf)}body{margin:0;background:#fcfaf6;font-family:VerifiedChinese,sans-serif;--font-family:VerifiedChinese;--accent-color:#658176}#root{max-width:720px;margin:auto;padding:24px}@media(max-width:500px){#root{padding:20px}}</style></head><body><div id="root"></div><script src="/test.js"></script></body></html>';
const server = createServer((request, response) => {
  if (request.url === '/verified-chinese.ttf') { response.setHeader('Content-Type', 'font/collection'); createReadStream(fontPath).pipe(response); return; }
  if (request.url === '/test.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(bundle.outputFiles[0].contents); return; }
  if (request.url === '/test.css') { response.setHeader('Content-Type', 'text/css'); response.end(css); return; }
  response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const profile = await mkdtemp(path.join(os.tmpdir(), 'lumostime-cross-day-smoke-'));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--disable-background-networking', '--disable-sync', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const pending = new Map();
const errors = [];
let socket;
let sequence = 0;
const delay = () => new Promise(resolve => setTimeout(resolve, 100));
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
  pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const capture = async (name, fullPage = false) => {
  const layout = fullPage ? await send('Page.getLayoutMetrics') : null;
  const clip = layout ? { x: 0, y: 0, width: Math.ceil(layout.cssContentSize.width), height: Math.ceil(layout.cssContentSize.height), scale: 1 } : undefined;
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: fullPage, ...(clip ? { clip } : {}) });
  await writeFile(path.join(output, `${name}.png`), Buffer.from(result.data, 'base64'));
};
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await delay(); }
  }
  if (!port) throw new Error('Headless Chrome did not start');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  socket.addEventListener('message', event => {
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
  const passed = [];
  for (const [device, width, height, mobile] of [['desktop', 1000, 900, false], ['wide', 1440, 900, false], ['mobile', 390, 844, true]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    await send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
    await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/cross-day` });
    for (let attempt = 0; attempt < 100; attempt++) { if (await evaluate('Boolean(window.__crossDayHarness)')) break; await delay(); }
    passed.push({ device, checks: await evaluate('window.__crossDayHarness.run()') });
    for (const chart of ['crossDayOverview', 'crossDayTrend', 'crossDayTimeline', 'crossDayCalendar']) {
      await evaluate(`window.__crossDayHarness.prepare('${chart}')`); await capture(`${device}-${chart}`);
    }
    await evaluate('window.__crossDayHarness.prepare("crossDayTrend", "start")'); await capture(`${device}-clock`);
    await evaluate('window.__crossDayHarness.edit()'); await capture(`${device}-editor`);
    for (const range of ['year', 'all']) {
      for (const chart of ['crossDayCalendar', 'crossDayTimeline']) {
        await evaluate(`window.__crossDayHarness.prepare('${chart}', 'duration', '${range}')`);
        await capture(`${device}-${range}-${chart}`, true);
      }
    }
    await evaluate('window.__crossDayHarness.prepare("crossDayCalendar", "start", "year", true)'); await capture(`${device}-year-clock-values`, true);
    for (const source of ['tagDuration', 'categoryDuration']) {
      await evaluate(`window.__crossDayHarness.prepareDurationCalendar('${source}')`); await capture(`${device}-${source}-calendar`, true);
    }
    await evaluate('window.__crossDayHarness.prepare("crossDayTimeline", "duration", "30d")'); await capture(`${device}-scrolling-timeline`);
    await evaluate('window.__crossDayHarness.prepareDashboard()'); await capture(`${device}-dashboard`, true);
    if (mobile) {
      await evaluate('window.__crossDayHarness.prepare("crossDayTrend")');
      const point = await evaluate('(() => { const r = document.querySelector("[role=slider]").getBoundingClientRect(); return { x: r.x + r.width * (44 + 268 * 4 / 6) / 320, y: r.y + r.height / 2 }; })()');
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await delay();
      if (!await evaluate('document.querySelector("[role=status]").textContent.includes("无记录")')) throw new Error('Mobile touch failed to select missing date');
      passed.push({ device, checks: ['Native browser touch selects the correct trend date'] });
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  await writeFile(path.join(output, 'result.json'), JSON.stringify({ passed }, null, 2));
  console.log(JSON.stringify({ passed, screenshots: output }, null, 2));
} catch (error) {
  if (socket?.readyState === WebSocket.OPEN) await capture('failure').catch(() => {});
  throw error;
} finally {
  if (socket?.readyState === WebSocket.OPEN) await send('Browser.close').catch(() => {});
  chrome.kill(); await new Promise(resolve => server.close(resolve));
  const resolvedProfile = path.resolve(profile);
  if (resolvedProfile.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolvedProfile).startsWith('lumostime-cross-day-smoke-')) {
    await rm(resolvedProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
  }
}
