/**
 * @file test-share-font-renderer.mjs
 * @input Actual ShareView, redemption hook, font storage/service and production CSS
 * @output Native Chromium checks and Chinese-font-verified font selector/export screenshots
 * @updated 2026-10-12: Checks unlock gating, scrollable/truncated font capsules and builtin/uploaded PNG parity.
 */
import { createRequire } from 'node:module';
import { access, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const workspace = process.cwd();
const require = createRequire(path.join(workspace, 'package.json'));
const { build } = require('esbuild');
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-share-font-'));
await access('C:/Windows/Fonts/msyh.ttc');
await build({
  stdin: { resolveDir: workspace, loader: 'tsx', contents: `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ShareView } from './src/views/ShareView';
import { fontService } from './src/services/fontService';
import { customFontStorageService } from './src/services/customFontStorageService';
const root = createRoot(document.getElementById('root'));
const passed = [];
const wait = (ms = 60) => new Promise(resolve => setTimeout(resolve, ms));
const check = (value, message) => { if (!value) throw new Error(message); };
const until = async (condition, message) => { for (let i = 0; i < 250; i++) { if (condition()) return; await wait(); } throw new Error(message); };
const button = label => [...document.querySelectorAll('button')].find(item => item.textContent === label);
const save = () => document.querySelector('button[title="保存"]');
const fonts = () => document.querySelector('section[aria-label="分享字体"]');
const primaryFamily = family => family.split(',')[0].replace(/["']/g, '').trim();
const matchesFont = (card, family) => [...card.querySelectorAll('h2,p,span')].every(item => primaryFamily(getComputedStyle(item).fontFamily) === primaryFamily(family));
let toast, downloaded;
HTMLAnchorElement.prototype.click = function () { downloaded = this.href; };
const log = { id: 'font-share', categoryId: 'reading', activityId: 'books', title: '夏日书页', note: '在[[杭州]]读一本旧书。\\n把字句和风景一起留下。', images: [], startTime: new Date(2026, 9, 12, 9).getTime(), endTime: new Date(2026, 9, 12, 10).getTime(), duration: 3600 };
const mount = async images => {
  root.render(<ShareView key={images.length} log={{ ...log, images }} onBack={() => {}} onToast={(type, message) => { toast = { type, message }; }} />);
  await wait();
  await until(() => save() && !save().disabled, 'Share view failed to load');
};
const choose = async item => { item.click(); await wait(); await until(() => !save().disabled, 'Font failed to load'); };
const capture = async name => { window.__fontCapture = name; await until(() => !window.__fontCapture, 'Screenshot timeout'); };
const exportCard = async () => {
  downloaded = null; toast = null; save().click();
  await until(() => { if (toast?.type === 'error') throw new Error(toast.message); return downloaded && toast?.type === 'success'; }, 'Font export timed out');
  const image = new Image(); image.src = downloaded; await image.decode();
  const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
  return { url: downloaded, width: canvas.width, height: canvas.height, pixels: context.getImageData(0, 0, canvas.width, canvas.height).data };
};
const compare = (a, b) => {
  check(a.width === b.width && a.height === b.height, 'Uploaded font changes exported geometry relative to the same builtin font');
  let differences = 0;
  for (let i = 0; i < a.pixels.length; i++) if (Math.abs(a.pixels[i] - b.pixels[i]) > 4) differences++;
  check(differences < a.pixels.length * 0.002, 'Uploaded font glyphs differ from the identical builtin font in the saved PNG: ' + differences);
};
async function run() {
  await document.fonts.load('16px VerifiedChinese', '分享卡片夏日书页杭州');
  check(document.fonts.check('16px VerifiedChinese', '分享卡片夏日书页杭州'), 'Verified Chinese font unavailable');
  const blob = await (await fetch('/fonts/LXGWWenKaiLite-Regular.woff2')).blob();
  const imported = await fontService.addCustomFont(blob, '我的手帐导入字体', 'share-note.woff2');
  check(imported.success, 'Actual uploaded font registration failed');
  await mount([]); await wait();
  check(!fonts(), 'Locked share view exposes premium font controls');
  passed.push('Unredeemed records keep the existing share controls');
  window.__shareUnlocked = true; window.dispatchEvent(new Event('share-font-status'));
  await until(() => fonts()?.querySelectorAll('button').length === 7, 'Unlock did not load builtin and uploaded fonts');
  const custom = fonts().querySelector('button[title="我的手帐导入字体"]');
  check(custom.textContent === '我的手帐…', 'Uploaded font label does not truncate after four characters');
  check(fonts().querySelector('button[title="霞鹜新致宋"]').textContent === '霞鹜新致…', 'Builtin font label does not truncate');
  const scroller = custom.parentElement;
  check(scroller.scrollWidth > scroller.clientWidth && getComputedStyle(scroller).overflowX === 'auto', 'Font capsules do not scroll horizontally');
  scroller.scrollLeft = scroller.scrollWidth; check(scroller.scrollLeft > 0, 'Font row cannot reach imported fonts');
  check(getComputedStyle(custom).whiteSpace === 'nowrap', 'Font capsule labels wrap');
  passed.push('Redemption updates expose six builtins plus stored uploads in a horizontally scrolling capsule row');
  await choose(button('现代'));
  await choose(fonts().querySelector('button[title="霞鹜文楷"]'));
  const builtin = await exportCard();
  await choose(custom);
  const preview = document.querySelector('.share-card-selected-font');
  const family = fontService.getAllFonts().find(font => font.id === imported.fontId).fontFamily;
  check(matchesFont(preview, family), 'Template or node typography overrides the selected font');
  check(fontService.getCurrentFont() === 'default' && localStorage.getItem('lumostime_font_family') === null, 'Share selection changed the global app font');
  await capture('fonts-mobile');
  const uploaded = await exportCard(); compare(builtin, uploaded);
  window.__shareFontExport = uploaded.url;
  passed.push('Builtin and imported copies of the same font save matching Chinese glyphs while preserving the global font');
  for (const label of ['经典', '古韵', '分割', '变迁', '玻璃', '方格手帐']) {
    await choose(button(label));
    const card = document.querySelector('.share-card-selected-font');
    check(matchesFont(card, family), label + ' overrides the selected font');
  }
  await choose(button('默认')); check(!document.querySelector('.share-card-selected-font'), 'Default does not restore template typography');
  await choose(custom);
  const canvas = document.createElement('canvas'); canvas.width = 300; canvas.height = 200;
  const context = canvas.getContext('2d'); context.fillStyle = '#c6baa4'; context.fillRect(0, 0, 300, 200);
  await mount([canvas.toDataURL(), canvas.toDataURL()]);
  await until(() => fonts()?.querySelectorAll('button').length === 7, 'Photo font catalog failed to load');
  const photoCustom = fonts().querySelector('button[title="我的手帐导入字体"]');
  await choose(photoCustom);
  for (const label of ['摄影日记', '变迁', '无缝长图', '边框长图', '胶片长图']) {
    await choose(button(label));
    const card = document.querySelector('.share-card-selected-font');
    check(matchesFont(card, family), label + ' overrides the selected font');
  }
  await choose(button('摄影日记')); await exportCard();
  passed.push('Text and photo templates retain selected fonts across layout changes, and default restores original typography');
  await capture('fonts-desktop');
  await customFontStorageService.deleteFont(imported.fontId);
  downloaded = null; toast = null; save().click();
  await until(() => toast?.type === 'error', 'Missing uploaded font silently exported');
  check(!downloaded && toast.message.includes('字体'), 'Missing font did not produce a useful error');
  await until(() => !save().disabled, 'Missing font leaves saving disabled');
  check(!document.querySelector('div[aria-hidden="true"][style]'), 'Missing font leaks the snapshot');
  window.__shareUnlocked = false; window.dispatchEvent(new Event('share-font-status'));
  await until(() => !fonts() && !document.querySelector('.share-card-selected-font'), 'Relocking leaves font controls or overrides active');
  passed.push('Unavailable font files fail cleanly, and removing redemption resets the selector');
  window.__fontResult = { passed };
}
run().catch(error => { window.__fontResult = { passed, error: error.stack || String(error) }; });
` },
  bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'share-font-adapters', setup(builder) {
    builder.onResolve({ filter: /\/(CategoryScopeContext|imageService|redemptionService)$/ }, args => ({ path: args.path, namespace: 'share-font' }));
    builder.onLoad({ filter: /.*/, namespace: 'share-font' }, args => ({ loader: 'js', contents: args.path.endsWith('CategoryScopeContext')
      ? "export const useCategoryScope = () => ({ categories: [{ id: 'reading', activities: [{ id: 'books', name: '阅读' }] }] });"
      : args.path.endsWith('redemptionService')
        ? "export const SPONSORSHIP_STATUS_UPDATED_EVENT = 'share-font-status'; export class RedemptionService { async isVerified() { return { isVerified: Boolean(window.__shareUnlocked) }; } }"
        : "export const imageService = { getImageUrl: async reference => reference };" }));
  } }]
});
const css = (await readdir(path.join(workspace, 'dist/assets'))).filter(file => file.endsWith('.css'));
if (!css.length) throw new Error('Run npm run build before font verification');
await writeFile(path.join(directory, 'test.css'), (await Promise.all(css.map(file => readFile(path.join(workspace, 'dist/assets', file), 'utf8')))).join('\n'), 'utf8');
await writeFile(path.join(directory, 'index.html'), `<!doctype html><html><meta charset="utf-8"><link rel="stylesheet" href="test.css"><link rel="stylesheet" href="/fonts/fonts.css"><style>@font-face{font-family:VerifiedChinese;src:local('Microsoft YaHei')}body,*{font-family:VerifiedChinese!important}</style><body><div id="root"></div><script src="test.js"></script></body></html>`, 'utf8');
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const base = relative.startsWith('fonts/') ? path.join(workspace, 'public') : directory;
    const filename = path.resolve(base, relative || 'index.html');
    if (!filename.startsWith(base + path.sep)) { response.writeHead(403).end(); return; }
    const types = { '.css': 'text/css', '.html': 'text/html', '.js': 'application/javascript', '.woff2': 'font/woff2' };
    response.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
    response.end(await readFile(filename));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
setTimeout(() => app.exit(1), 90000);
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 390, height: 844, webPreferences: { contextIsolation: true, backgroundThrottling: false, offscreen: true } });
  await window.loadURL(${JSON.stringify(url)});
  let result;
  for (let i = 0; i < 1000; i++) {
    const capture = await window.webContents.executeJavaScript('window.__fontCapture');
    if (capture) {
      if (capture.endsWith('desktop')) window.setSize(1000, 900);
      await new Promise(resolve => setTimeout(resolve, 180));
      await fs.writeFile(path.join(__dirname, capture + '.png'), (await window.webContents.capturePage()).toPNG());
      await window.webContents.executeJavaScript('window.__fontCapture = null');
    }
    result = await window.webContents.executeJavaScript('window.__fontResult');
    if (result) break;
    await new Promise(resolve => setTimeout(resolve, 70));
  }
  const exported = await window.webContents.executeJavaScript('window.__shareFontExport');
  if (exported) await fs.writeFile(path.join(__dirname, 'uploaded-font-export.png'), Buffer.from(exported.split(',')[1], 'base64'));
  console.log(JSON.stringify({ ...result, directory: __dirname }, null, 2));
  app.exit(result && !result.error ? 0 : 1);
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', code => { server.close(); process.exitCode = code ?? 1; });
child.on('error', error => { console.error(error); server.close(); process.exitCode = 1; });
