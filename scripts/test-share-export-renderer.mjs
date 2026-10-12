/**
 * @file test-share-export-renderer.mjs
 * @input Actual ShareView, production CSS, synthetic PNG/JPEG/WebP Blob images and isolated storage adapters
 * @output Renderer assertions and Chinese-font-verified preview/export PNGs in a disposable directory
 * @pos Test Runner
 * @updated 2026-10-12: Reproduces broken Blob cache-busting and checks every share layout's real save action.
 * @updated 2026-10-12: Checks recovery when the image exporter has cached a previous resource failure.
 * @updated 2026-10-12: Covers revoked Blob URLs, missing MIME types, intact preview pixels and invalid-image rejection.
 */
import { createRequire } from 'node:module';
import { access, copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const require = createRequire(path.join(root, 'package.json'));
const { build } = require('esbuild');
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-long-image-'));
await access('C:/Windows/Fonts/msyh.ttc');
await build({
  stdin: { resolveDir: root, loader: 'tsx', contents: `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { toPng } from 'html-to-image';
import { ShareView } from './src/views/ShareView';
import { TemplateRenderer } from './src/components/ShareCard/TemplateRenderer';
import { SHARE_THEMES } from './src/components/ShareCard/constants';
const root = createRoot(document.getElementById('root'));
const wait = (ms = 60) => new Promise(resolve => setTimeout(resolve, ms));
const check = (value, message) => { if (!value) throw new Error(message); };
const until = async (condition, message) => { for(let i = 0; i < 200; i++) { if(condition()) return; await wait(); } throw new Error(message); };
let photos = [];
const log = { id: 'synthetic-share', categoryId: 'reading', activityId: 'books', note: '#周末散步#和[[朋友丨小林]]在［［杭州］］散步。\\n把沿途的风景留下来。', startTime: new Date(2026,9,12,9).getTime(), endTime: new Date(2026,9,12,10).getTime(), duration: 3600 };
const button = text => [...document.querySelectorAll('button')].find(button => button.textContent === text);
const passed = [];
let toast;
let downloaded;
HTMLAnchorElement.prototype.click = function() { downloaded = this.href; };
const mount = async (images, key, decodeImages = true) => {
  root.render(<ShareView key={key} log={{ ...log, images }} onBack={() => {}} onToast={(type, message) => { toast = { type, message }; }}/>);
  await wait();
  await until(() => document.querySelector('button[title="保存"]') && !document.querySelector('button[title="保存"]').disabled, 'Share preview never loaded');
  if (decodeImages) await Promise.all([...document.images].map(image => image.decode()));
};
const capture = async name => { window.__longImageCapture = name; await until(() => !window.__longImageCapture, 'Screenshot timeout'); };
async function run() {
  photos = await Promise.all([['image/png', 160, '#aec5b2'], ['image/jpeg', 320, '#d9af94'], ['image/webp', 640, '#92a7bd']].map(async ([type, height, fill]) => {
    const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = height;
    const context = canvas.getContext('2d'); context.fillStyle = fill; context.fillRect(0, 0, 400, height);
    context.fillStyle = '#f5ead8'; context.beginPath(); context.arc(200, height / 2, 65, 0, Math.PI * 2); context.fill();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, type));
    return URL.createObjectURL(blob);
  }));
  await document.fonts.load('16px VerifiedChinese', '分享卡片长图杭州朋友');
  check(document.fonts.check('16px VerifiedChinese', '分享卡片长图杭州朋友'), 'Chinese font unavailable');
  await mount([], 'empty'); check(!button('长图'), 'Long-image mode appears without photos');
  await mount(photos.slice(0,1), 'single'); check(!button('长图'), 'Long-image mode appears with one photo');
  await mount([photos[0], 'missing'], 'missing'); check(!button('长图'), 'Unavailable image incorrectly enables long-image mode');
  await mount(photos, 'multiple'); check(button('长图'), 'Multi-image record lacks long-image mode');
  button('长图').click(); await wait();
  const images = [...document.querySelectorAll('img[alt^="照片"]')];
  check(images.length === 3 && images.every((image, index) => image.src === photos[index]), 'Long-image mode lost/reordered photos');
  const host = images[0].parentElement.parentElement;
  images.forEach((image, index) => {
    const rect = image.getBoundingClientRect();
    const card = host.getBoundingClientRect();
    check(Math.abs(rect.width - card.width) < 1 && Math.abs(rect.left - card.left) < 1, 'Photo is not edge-to-edge');
    check(Math.abs(rect.height / rect.width - image.naturalHeight / image.naturalWidth) < 0.01, 'Photo is cropped or distorted');
    if(index) check(Math.abs(rect.top - images[index - 1].getBoundingClientRect().bottom) < 1, 'Gap between stacked photos');
  });
  check(host.textContent.includes('和朋友在杭州散步。') && !host.textContent.includes('[['), 'Node labels do not render');
  check(host.querySelectorAll('span.underline').length === 2, 'Node underline styling lost');
  check(!host.textContent.includes('周末散步'), 'Share title removal regressed');
  check(button('长图').classList.contains('bg-stone-100'), 'Long-image mode does not show selection');
  await capture('long-image-mobile');
  // A previous failed export stays in the library's resource cache even after cacheBust is disabled.
  let cachedFailure;
  try { await toPng(host, { cacheBust: true, skipFonts: true }); } catch(error) { cachedFailure = error; }
  check(cachedFailure, 'Failed-resource cache scenario was not reproduced');
  await wait();
  document.querySelector('button[title="保存"]').click();
  await until(() => { if(toast?.type === 'error') throw new Error('Long-image download failed: ' + toast.message); return downloaded && toast?.type === 'success'; }, 'Long-image download failed');
  const exported = new Image(); exported.src = downloaded; await exported.decode();
  check(exported.naturalHeight > 2 * host.clientHeight - 2 && exported.naturalWidth === host.clientWidth * 2, 'PNG export clipped the scrollable long image');
  const canvas = document.createElement('canvas'); canvas.width = exported.naturalWidth; canvas.height = exported.naturalHeight;
  const context = canvas.getContext('2d'); context.drawImage(exported, 0, 0);
  const expectedColors = [[174,197,178], [217,175,148], [146,167,189]];
  images.forEach((image, index) => {
    const rect = image.getBoundingClientRect();
    const pixel = context.getImageData(10, Math.round((rect.top - host.getBoundingClientRect().top + rect.height / 2) * 2), 1, 1).data;
    check(expectedColors[index].every((value, channel) => Math.abs(pixel[channel] - value) < 5), 'Saved PNG lost photo ' + index);
  });
  window.__longImageExport = downloaded;
  check(images.every((image, index) => image.src === photos[index]), 'Export mutated preview image URLs');
  check(!document.querySelector('[aria-hidden="true"] img'), 'Export snapshot leaked into the document');
  passed.push('Recovers cached image failures without refetching or losing photo pixels');
  passed.push('Real ShareView enables long-image mode only with multiple available photos');
  passed.push('Original ratios, full card width, seamless record-order stacking and node text preserved');
  passed.push('Real save action exports the complete long PNG at 2x resolution');
  await capture('long-image-desktop');
  for (const layout of ['经典', '古韵', '现代', '分割', '变迁', '玻璃', '长图', '长图']) {
    button(layout).click(); await wait(); toast = null; downloaded = null;
    document.querySelector('button[title="保存"]').click();
    await until(() => { if(toast?.type === 'error') throw new Error(layout + ': ' + toast.message); return downloaded && toast?.type === 'success'; }, layout + ': save failed');
    const image = new Image(); image.src = downloaded; await image.decode();
    check(image.naturalWidth > 0 && image.naturalHeight > 0, layout + ': invalid export');
  }
  passed.push('All seven layouts save PNG/JPEG/WebP Blob images, including repeated exports');
  button('经典').click(); await wait(); check(!document.querySelector('img[alt^="照片"]'), 'Cannot switch back to classic');
  button('长图').click(); await wait(); check(document.querySelectorAll('img[alt^="照片"]').length === 3, 'Cannot return to long-image mode');
  await mount([], 'multiple'); check(!button('长图') && !document.querySelector('img'), 'Removing photos keeps the long-image mode or stale photos');
  const dataUrls = await Promise.all(photos.map(async url => {
    const blob = await (await fetch(url)).blob();
    return new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); });
  }));
  await mount(photos, 'revoked'); button('长图').click(); await wait();
  await Promise.all([...document.images].map(image => image.decode()));
  photos.forEach(url => URL.revokeObjectURL(url));
  toast = null; downloaded = null;
  const originalFetch = window.fetch;
  window.fetch = (url, ...args) => String(url).startsWith('blob:') ? Promise.reject(new Error('Blob resources no longer readable')) : originalFetch(url, ...args);
  try {
    document.querySelector('button[title="保存"]').click();
    await until(() => { if(toast?.type === 'error') throw new Error('Revoked Blob export failed: ' + toast.message); return downloaded && toast?.type === 'success'; }, 'Revoked Blob export failed');
    const image = new Image(); image.src = downloaded; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    const previewImages = [...document.querySelectorAll('img[alt^="照片"]')];
    const top = previewImages[0].parentElement.parentElement.getBoundingClientRect().top;
    previewImages.forEach((image, index) => {
      const rect = image.getBoundingClientRect();
      const pixel = context.getImageData(10, Math.round((rect.top - top + rect.height / 2) * 2), 1, 1).data;
      check(expectedColors[index].every((value, channel) => Math.abs(pixel[channel] - value) < 5), 'Revoked Blob lost photo pixels');
    });
  } finally { window.fetch = originalFetch; }
  passed.push('Already-loaded photos still export after Blob revocation and blocked refetches');

  const untypedUrls = await Promise.all(dataUrls.map(async (url, index) => {
    const response = await fetch(url);
    return URL.createObjectURL(new Blob([await response.arrayBuffer()], { type: index === 1 ? 'application/octet-stream' : '' }));
  }));
  await mount(untypedUrls, 'untyped'); button('长图').click(); await wait(); toast = null; downloaded = null;
  document.querySelector('button[title="保存"]').click();
  await until(() => { if(toast?.type === 'error') throw new Error('Untyped Blob export failed: ' + toast.message); return downloaded && toast?.type === 'success'; }, 'Untyped Blob export failed');
  passed.push('Missing and generic Blob MIME types do not break image embedding');

  await mount(dataUrls, 'inline'); button('长图').click(); await wait(); toast = null; downloaded = null;
  document.querySelector('button[title="保存"]').click();
  await until(() => { if(toast?.type === 'error') throw new Error('Data URL export failed'); return downloaded && toast?.type === 'success'; }, 'Data URL export failed');
  passed.push('Native-style inline raster images also export without cache-busting');
  await mount([...dataUrls, 'data:image/png;base64,aW52YWxpZA=='], 'broken', false);
  await until(() => [...document.images].every(image => image.complete), 'Broken image did not finish loading');
  button('长图').click(); await wait(); toast = null; downloaded = null;
  document.querySelector('button[title="保存"]').click();
  await until(() => toast?.type === 'error', 'Broken image silently exported');
  check(toast.message.includes('第 4 张图片') && !downloaded, 'Broken image was omitted without a useful error');
  check(!document.querySelector('[aria-hidden="true"] img'), 'Failed export leaked its snapshot');
  check(!document.querySelector('button[title="保存"]').disabled, 'Failed export left saving disabled');
  passed.push('Invalid images fail explicitly and restore the save button without leaking snapshots');
  root.render(<article style={{ width: 358 }}><TemplateRenderer content={{ body: '十二张照片全部保留。', images: Array.from({length:12}, (_, index) => dataUrls[index % 3]), date: '2026年10月12日', activity: '', domain: '' }} theme={SHARE_THEMES[0]} templateId="long-image"/></article>);
  await wait(); check(document.querySelectorAll('img').length === 12, 'Long-image mode silently truncates photos');
  passed.push('Switching layouts works, and records with more than nine photos keep every image');
  window.__longImageResult = { passed };
}
run().catch(error => { window.__longImageResult = { passed, error: error.stack || String(error) }; });
` },
  bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'isolated-share-adapters', setup(builder) {
    builder.onResolve({ filter: /\/(CategoryScopeContext|imageService)$/ }, args => ({ path: args.path, namespace: 'share-smoke' }));
    builder.onLoad({ filter: /.*/, namespace: 'share-smoke' }, args => ({ contents: args.path.endsWith('CategoryScopeContext')
      ? "export const useCategoryScope = () => ({ categories: [{ id: 'reading', activities: [{ id: 'books', name: '阅读' }] }] });"
      : "export const imageService = { getImageUrl: async reference => reference === 'missing' ? null : reference };", loader: 'js' }));
  } }]
});
const css = (await readdir(path.join(root, 'dist/assets'))).find(file => file.endsWith('.css'));
if (!css) throw new Error('Run npm run build before renderer verification');
await copyFile(path.join(root, 'dist/assets', css), path.join(directory, 'test.css'));
await writeFile(path.join(directory, 'index.html'), `<!doctype html><html><meta charset="utf-8"><link rel="stylesheet" href="test.css"><style>@font-face{font-family:VerifiedChinese;src:local('Microsoft YaHei')}body,*{font-family:VerifiedChinese!important}</style><body><div id="root"></div><script src="test.js"></script></body></html>`, 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
setTimeout(() => app.exit(1), 60000);
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 390, height: 844, webPreferences: { contextIsolation: true, backgroundThrottling: false, offscreen: true } });
  await window.loadFile(path.join(__dirname, 'index.html'));
  let result;
  for (let i = 0; i < 600; i++) {
    const capture = await window.webContents.executeJavaScript('window.__longImageCapture');
    if (capture) {
      if(capture.endsWith('desktop')) window.setSize(1000, 900);
      await new Promise(resolve => setTimeout(resolve, 180));
      await fs.writeFile(path.join(__dirname, capture + '.png'), (await window.webContents.capturePage()).toPNG());
      await window.webContents.executeJavaScript('window.__longImageCapture = null');
    }
    result = await window.webContents.executeJavaScript('window.__longImageResult');
    if(result) break;
    await new Promise(resolve => setTimeout(resolve, 70));
  }
  const exported = await window.webContents.executeJavaScript('window.__longImageExport');
  if(exported) await fs.writeFile(path.join(__dirname, 'long-image-export.png'), Buffer.from(exported.split(',')[1], 'base64'));
  console.log(JSON.stringify({ ...result, directory: __dirname }, null, 2));
  app.exit(result && !result.error ? 0 : 1);
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', code => { process.exitCode = code ?? 1; });
child.on('error', error => { console.error(error); process.exitCode = 1; });
