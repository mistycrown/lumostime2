/**
 * @file test-share-export-renderer.mjs
 * @input Actual ShareView, production CSS, synthetic PNG/JPEG/WebP Blob images and isolated storage adapters
 * @output Renderer assertions and Chinese-font-verified preview/export PNGs in a disposable directory
 * @pos Test Runner
 * @updated 2026-10-12: Verifies single-photo book-page availability, title/node text and circular photo exports.
 * @updated 2026-10-12: Checks that film-story uses an untinted blurred photo without shadows or darkened export corners.
 * @updated 2026-10-12: Verifies independent text/photo entrances, paper/film layouts and every mode's actual export.
 * @updated 2026-10-12: Checks deepened palette colors, film-story blur/no-image exports and photo-first framed layout.
 * @updated 2026-10-12: Verifies framed photo geometry, original aspect ratios, top-aligned node text and complete image exports.
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
const mount = async (images, key, decodeImages = true, note = log.note) => {
  root.render(<ShareView key={key} log={{ ...log, images, note }} onBack={() => {}} onToast={(type, message) => { toast = { type, message }; }}/>);
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
  await mount([], 'empty'); check(!button('无缝长图') && !button('边框长图'), 'Long-image mode appears without photos');
  check(button('纯文字').getAttribute('aria-selected') === 'true' && button('图文').disabled, 'Empty record does not enter text mode');
  check(button('经典') && !button('摄影日记'), 'Text mode contains photo templates');
  check(!button('圆影书页'), 'Single-photo template appears without photos');
  button('变迁').click(); await wait();
  const themeButtons = [...document.querySelector('section').querySelectorAll('button')];
  const filmColors = new Set();
  for (const [index, themeButton] of themeButtons.entries()) {
    themeButton.click(); await wait();
    const card = document.querySelector('p.font-serif').parentElement;
    const color = getComputedStyle(card).backgroundColor;
    const channels = color.match(/\\d+/g).slice(0, 3).map(Number);
    const base = [1, 3, 5].map(offset => parseInt(SHARE_THEMES[index].primaryColor.slice(offset, offset + 2), 16));
    check(channels.every((value, channel) => value <= base[channel]) && channels.some((value, channel) => value < base[channel]), 'Film card does not deepen the selected theme');
    check(channels.reduce((a, b) => a + b) > base.reduce((a, b) => a + b) * 0.65, 'Film card loses the base color');
    check(!document.querySelector('img'), 'No-image film card has a photo background');
    check(card.getBoundingClientRect().width === card.parentElement.getBoundingClientRect().width, 'No-image film card still has background gutters');
    filmColors.add(color);
  }
  check(filmColors.size === 9, 'Selected palette colors do not affect the film card');
  await capture('film-story-no-image-mobile'); toast = null; downloaded = null;
  document.querySelector('button[title="保存"]').click();
  await until(() => { if(toast?.type === 'error') throw new Error('No-image film export failed'); return downloaded && toast?.type === 'success'; }, 'No-image film export failed');
  window.__filmTextExport = downloaded;

  await mount(photos.slice(0,1), 'single'); check(!button('无缝长图') && !button('边框长图'), 'Long-image mode appears with one photo');
  check(button('图文').getAttribute('aria-selected') === 'true' && button('摄影日记') && !button('经典'), 'Photo record does not enter photography mode');
  const diaryImage = document.querySelector('img[alt="照片 1"]');
  const diaryCard = diaryImage.parentElement.parentElement;
  check(diaryImage.getBoundingClientRect().left > diaryCard.getBoundingClientRect().left, 'Photography diary lacks paper margins');
  check(diaryCard.querySelector('p').getBoundingClientRect().top > diaryImage.getBoundingClientRect().bottom, 'Diary caption precedes the photo');
  await capture('photo-diary-mobile'); toast = null; downloaded = null;
  document.querySelector('button[title="保存"]').click();
  await until(() => { if(toast?.type === 'error') throw new Error('Diary export failed: ' + toast.message); return downloaded && toast?.type === 'success'; }, 'Diary export failed');
  window.__diaryExport = downloaded;
  button('纯文字').click(); await wait();
  check(!document.querySelector('img') && button('经典') && !button('摄影日记'), 'Text entrance retains photos or photo templates');
  button('古韵').click(); await wait();
  button('图文').click(); await wait();
  check(button('摄影日记').getAttribute('aria-pressed') === 'true', 'Photo template choice was not preserved');
  button('纯文字').click(); await wait();
  check(button('古韵').getAttribute('aria-pressed') === 'true', 'Text template choice was not preserved');
  button('图文').click(); await wait();
  passed.push('Text and photo entrances isolate their templates/photos and preserve independent selections');
  check(button('圆影书页'), 'Single photo does not offer the circular book page');
  const bookNote = '#思考与心智模型#和[[朋友丨小林]]在［［杭州］］散步。\\n停下来，看见光落在树叶上的样子。\\n\\n把生活里的片刻写下来，也把那些细小的感受留下来。\\n一张照片，一页文字，慢慢读，也慢慢想。';
  await mount(photos.slice(0,1), 'single', true, bookNote);
  button('圆影书页').click(); await wait();
  const circleImage = document.querySelector('img[alt="照片 1"]');
  const circleFrame = circleImage.parentElement;
  const bookPage = circleFrame.parentElement;
  const bookCard = bookPage.parentElement;
  const circleBounds = circleImage.getBoundingClientRect();
  check(Math.abs(circleBounds.width - circleBounds.height) < 1 && parseFloat(getComputedStyle(circleFrame).borderRadius) >= circleBounds.width / 2, 'Photo is not circular: ' + JSON.stringify(circleBounds));
  check(getComputedStyle(circleImage).objectFit === 'cover', 'Circular photo is stretched');
  check(bookPage.querySelector('h2').textContent === '思考与心智模型', 'Record title is missing');
  check(getComputedStyle(bookPage.querySelector('p')).textAlign === 'center' && bookPage.querySelectorAll('span.underline').length === 2, 'Book-page typography or node text is missing');
  await capture('circle-note-mobile'); toast = null; downloaded = null;
  document.querySelector('button[title="保存"]').click();
  await until(() => { if(toast?.type === 'error') throw new Error('Book page export failed: ' + toast.message); return downloaded && toast?.type === 'success'; }, 'Book page export failed');
  const circleExport = new Image(); circleExport.src = downloaded; await circleExport.decode();
  const circleCanvas = document.createElement('canvas'); circleCanvas.width = circleExport.naturalWidth; circleCanvas.height = circleExport.naturalHeight;
  const circleContext = circleCanvas.getContext('2d'); circleContext.drawImage(circleExport, 0, 0);
  const bookBounds = bookCard.getBoundingClientRect();
  const circlePixel = circleContext.getImageData(Math.round((circleBounds.left - bookBounds.left + circleBounds.width / 2) * 2), Math.round((circleBounds.top - bookBounds.top + circleBounds.height / 2) * 2), 1, 1).data;
  check([245,234,216].every((value, channel) => Math.abs(circlePixel[channel] - value) < 5), 'Circular export lost the photo');
  const maskedPixel = circleContext.getImageData(Math.round((circleBounds.left - bookBounds.left + 1) * 2), Math.round((circleBounds.top - bookBounds.top + 1) * 2), 1, 1).data;
  check([245,245,240].every((value, channel) => Math.abs(maskedPixel[channel] - value) < 5), 'Circular clipping was lost in the PNG');
  window.__circleNoteExport = downloaded;
  await mount(photos, 'single');
  check(!button('圆影书页') && button('摄影日记').getAttribute('aria-pressed') === 'true', 'Adding photos keeps a single-image layout selected');
  await mount(photos.slice(0,1), 'single');
  passed.push('Single-photo book page renders its title/node text, exports a circular crop and falls back when more photos are added');
  button('变迁').click(); await wait();
  await Promise.all([...document.images].map(image => image.decode()));
  const filmBackground = document.querySelector('img[aria-hidden="true"]');
  check(filmBackground?.src === photos[0] && getComputedStyle(filmBackground).filter.includes('blur'), 'Film background is not the blurred first photo');
  const filmPhoto = document.querySelector('img[alt="照片 1"]');
  const filmCard = filmPhoto.parentElement.parentElement;
  const filmBounds = filmCard.parentElement.getBoundingClientRect();
  check(getComputedStyle(filmCard).boxShadow === 'none', 'Film card casts a gradient-like shadow over its photo background');
  check(!filmCard.parentElement.querySelector('div.absolute'), 'Film background still has a tint overlay');
  const backgroundBounds = filmBackground.getBoundingClientRect();
  check(backgroundBounds.top <= filmBounds.top - 53 && backgroundBounds.bottom >= filmBounds.bottom + 53
    && backgroundBounds.left <= filmBounds.left - 53 && backgroundBounds.right >= filmBounds.right + 53, 'Blur edges do not extend beyond all four sides of the background crop');
  check(filmCard.getBoundingClientRect().left > filmBounds.left, 'Photo film card lacks background gutters');
  check(Math.abs(filmPhoto.height / filmPhoto.width - filmPhoto.naturalHeight / filmPhoto.naturalWidth) < 0.01, 'Film photo is cropped');
  await capture('film-story-photo-mobile'); toast = null; downloaded = null;
  document.querySelector('button[title="保存"]').click();
  await until(() => { if(toast?.type === 'error') throw new Error('Photo film export failed: ' + toast.message); return downloaded && toast?.type === 'success'; }, 'Photo film export failed');
  const filmExport = new Image(); filmExport.src = downloaded; await filmExport.decode();
  const filmCanvas = document.createElement('canvas'); filmCanvas.width = filmExport.naturalWidth; filmCanvas.height = filmExport.naturalHeight;
  const filmContext = filmCanvas.getContext('2d'); filmContext.drawImage(filmExport, 0, 0);
  const filmRect = filmPhoto.getBoundingClientRect();
  const filmPixel = filmContext.getImageData(Math.round((filmRect.left - filmBounds.left + 5) * 2), Math.round((filmRect.top - filmBounds.top + filmRect.height / 2) * 2), 1, 1).data;
  check([174,197,178].every((value, channel) => Math.abs(filmPixel[channel] - value) < 5), 'Film export lost the sharp foreground photo');
  for (const [x, y] of [[8, 8], [filmCanvas.width - 9, 8], [8, filmCanvas.height - 9], [filmCanvas.width - 9, filmCanvas.height - 9]]) {
    const pixel = filmContext.getImageData(x, y, 1, 1).data;
    check([174,197,178].every((value, channel) => Math.abs(pixel[channel] - value) < 8), 'Film export darkens a blurred photo corner');
  }
  window.__filmPhotoExport = downloaded;
  passed.push('Film card deepens all nine themes, omits the background without photos and exports blur with sharp foreground pixels');
  await mount([photos[0]], 'photos-only', true, '');
  check(!document.querySelector('p') && !document.body.textContent.includes('这是一段美好的时光记录'), 'Photo-only records have an invented caption');
  button('纯文字').click(); await wait();
  check(document.body.textContent.includes('这是一段美好的时光记录'), 'Text fallback was removed');
  passed.push('Photo-only records keep their captions empty while text mode retains its existing fallback');
  await mount([photos[0], 'missing'], 'missing'); check(!button('无缝长图') && !button('边框长图'), 'Unavailable image incorrectly enables long-image mode');
  await mount(photos, 'multiple'); check(button('无缝长图') && button('边框长图'), 'Multi-image record lacks long-image modes');
  check(!button('圆影书页'), 'Single-photo book page appears in multi-image mode');
  button('无缝长图').click(); await wait();
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
  check(button('无缝长图').classList.contains('bg-stone-100'), 'Long-image mode does not show selection');
  await capture('long-image-mobile');
  // A previous failed export stays in the library's resource cache even after cacheBust is disabled.
  let cachedFailure;
  try { await toPng(host, { cacheBust: true, skipFonts: true }); } catch(error) { cachedFailure = error; }
  check(cachedFailure, 'Failed-resource cache scenario was not reproduced');
  await wait();
  toast = null; downloaded = null;
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
  button('边框长图').click(); await wait();
  const framedImages = [...document.querySelectorAll('img[alt^="照片"]')];
  await Promise.all(framedImages.map(image => image.decode()));
  const framedCard = framedImages[0].parentElement.parentElement.parentElement;
  check(framedImages.length === 3 && framedImages.every((image, index) => image.src === photos[index]), 'Framed layout lost photo order');
  framedImages.forEach(image => {
    const rect = image.getBoundingClientRect();
    const paperPadding = parseFloat(getComputedStyle(image.parentElement).paddingLeft);
    check(paperPadding >= 12 && image.parentElement.querySelector('figcaption'), 'Paper frame or caption missing');
    check(getComputedStyle(image.parentElement).backgroundColor !== getComputedStyle(framedCard).backgroundColor, 'Paper frames blend into the surround');
    check(rect.left > framedCard.getBoundingClientRect().left && rect.right < framedCard.getBoundingClientRect().right, 'Framed photo lacks outer margins');
    check(Math.abs(rect.height / rect.width - image.naturalHeight / image.naturalWidth) < 0.01, 'Framed photo aspect ratio changed');
  });
  check(framedCard.querySelector('p').getBoundingClientRect().top > framedImages.at(-1).getBoundingClientRect().bottom, 'Framed notes are not below the photos');
  check(framedImages[0].getBoundingClientRect().top - framedCard.getBoundingClientRect().top <= 24, 'Framed photos still have a leading header band');
  check(framedCard.querySelectorAll('span.underline').length === 2, 'Framed layout lost node labels');
  check(button('无缝长图').getBoundingClientRect().top === button('边框长图').getBoundingClientRect().top, 'Long-image options are not in the same selector row');
  await capture('framed-long-image-mobile'); toast = null; downloaded = null;
  document.querySelector('button[title="保存"]').click();
  await until(() => { if(toast?.type === 'error') throw new Error('Framed export failed: ' + toast.message); return downloaded && toast?.type === 'success'; }, 'Framed export failed');
  const framedExport = new Image(); framedExport.src = downloaded; await framedExport.decode();
  check(framedExport.naturalHeight > 2 * framedCard.clientHeight - 2, 'Framed long-image export is clipped');
  const framedCanvas = document.createElement('canvas'); framedCanvas.width = framedExport.naturalWidth; framedCanvas.height = framedExport.naturalHeight;
  const framedContext = framedCanvas.getContext('2d'); framedContext.drawImage(framedExport, 0, 0);
  framedImages.forEach((image, index) => {
    const rect = image.getBoundingClientRect(); const card = framedCard.getBoundingClientRect();
    const pixel = framedContext.getImageData(Math.round((rect.left - card.left + 5) * 2), Math.round((rect.top - card.top + rect.height / 2) * 2), 1, 1).data;
    check(expectedColors[index].every((value, channel) => Math.abs(pixel[channel] - value) < 5), 'Framed export lost photo pixels');
  });
  window.__framedLongImageExport = downloaded;
  passed.push('Framed photos preserve order/ratios, bottom-aligned node text and all exported pixels without a header band');
  button('无缝长图').click(); await wait();
  await capture('long-image-desktop');
  button('边框长图').click(); await wait(); await capture('framed-long-image-desktop');
  button('胶片长图').click(); await wait();
  const stripPhotos = [...document.querySelectorAll('img[alt^="照片"]')];
  const stripCard = stripPhotos[0].parentElement.parentElement;
  check(stripPhotos.length === 3 && stripCard.textContent.includes('LUMOS · 400'), 'Film frames or markings missing');
  check(stripCard.querySelectorAll('figure').length === 3 && stripCard.querySelector('p').getBoundingClientRect().top > stripPhotos.at(-1).getBoundingClientRect().bottom, 'Film story geometry is incorrect');
  await capture('film-strip-desktop');
  for (const [mode, layouts] of [['纯文字', ['经典', '古韵', '现代', '分割', '变迁', '玻璃']], ['图文', ['摄影日记', '变迁', '无缝长图', '边框长图', '胶片长图', '胶片长图']]]) {
    button(mode).click(); await wait();
    for (const layout of layouts) {
      button(layout).click(); await wait(); toast = null; downloaded = null;
      if(mode === '纯文字') check(!document.querySelector('img'), 'Text mode contains photographs');
      document.querySelector('button[title="保存"]').click();
      await until(() => { if(toast?.type === 'error') throw new Error(layout + ': ' + toast.message); return downloaded && toast?.type === 'success'; }, layout + ': save failed');
      const image = new Image(); image.src = downloaded; await image.decode();
      check(image.naturalWidth > 0 && image.naturalHeight > 0, layout + ': invalid export');
      if(mode === '图文' && layout === '胶片长图') window.__filmStripExport = downloaded;
    }
  }
  passed.push('All six text and five photo layouts export, including repeated PNG/JPEG/WebP exports');
  button('纯文字').click(); await wait(); button('经典').click(); await wait(); check(!document.querySelector('img'), 'Cannot switch back to classic');
  button('图文').click(); await wait();
  button('无缝长图').click(); await wait(); check(document.querySelectorAll('img[alt^="照片"]').length === 3, 'Cannot return to long-image mode');
  button('边框长图').click(); await wait();
  await mount([], 'multiple'); check(!button('无缝长图') && !button('边框长图') && !document.querySelector('img'), 'Removing photos keeps the long-image mode or stale photos');
  check(button('图文').disabled && button('纯文字').getAttribute('aria-selected') === 'true', 'Removing photos keeps the photo entrance active');
  const dataUrls = await Promise.all(photos.map(async url => {
    const blob = await (await fetch(url)).blob();
    return new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); });
  }));
  await mount(photos, 'revoked'); button('无缝长图').click(); await wait();
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
  await mount(untypedUrls, 'untyped'); button('无缝长图').click(); await wait(); toast = null; downloaded = null;
  document.querySelector('button[title="保存"]').click();
  await until(() => { if(toast?.type === 'error') throw new Error('Untyped Blob export failed: ' + toast.message); return downloaded && toast?.type === 'success'; }, 'Untyped Blob export failed');
  passed.push('Missing and generic Blob MIME types do not break image embedding');

  await mount(dataUrls, 'inline'); button('无缝长图').click(); await wait(); toast = null; downloaded = null;
  document.querySelector('button[title="保存"]').click();
  await until(() => { if(toast?.type === 'error') throw new Error('Data URL export failed'); return downloaded && toast?.type === 'success'; }, 'Data URL export failed');
  passed.push('Native-style inline raster images also export without cache-busting');
  await mount([...dataUrls, 'data:image/png;base64,aW52YWxpZA=='], 'broken', false);
  await until(() => [...document.images].every(image => image.complete), 'Broken image did not finish loading');
  button('无缝长图').click(); await wait(); toast = null; downloaded = null;
  document.querySelector('button[title="保存"]').click();
  await until(() => toast?.type === 'error', 'Broken image silently exported');
  check(toast.message.includes('第 4 张图片') && !downloaded, 'Broken image was omitted without a useful error');
  check(!document.querySelector('[aria-hidden="true"] img'), 'Failed export leaked its snapshot');
  check(!document.querySelector('button[title="保存"]').disabled, 'Failed export left saving disabled');
  passed.push('Invalid images fail explicitly and restore the save button without leaking snapshots');
  root.render(<article style={{ width: 358 }}><TemplateRenderer mode="photo" content={{ body: '十二张照片全部保留。', images: Array.from({length:12}, (_, index) => dataUrls[index % 3]), date: '2026年10月12日', activity: '', domain: '' }} theme={SHARE_THEMES[0]} templateId="long-image"/></article>);
  await wait(); check(document.querySelectorAll('img').length === 12, 'Long-image mode silently truncates photos');
  root.render(<article style={{ width: 358 }}><TemplateRenderer mode="photo" content={{ body: '十二张照片全部保留。', images: Array.from({length:12}, (_, index) => dataUrls[index % 3]), date: '2026年10月12日', activity: '', domain: '' }} theme={SHARE_THEMES[0]} templateId="framed-long-image"/></article>);
  await wait(); check(document.querySelectorAll('img').length === 12, 'Framed mode silently truncates photos');
  for (const templateId of ['photo-diary', 'film-story', 'film-strip']) {
    root.render(<article style={{ width: 358 }}><TemplateRenderer mode="photo" content={{ body: '十二张照片全部保留。', images: Array.from({length:12}, (_, index) => dataUrls[index % 3]), date: '2026年10月12日', activity: '', domain: '' }} theme={SHARE_THEMES[0]} templateId={templateId}/></article>);
    await wait(); check(document.querySelectorAll('img[alt^="照片"]').length === 12, templateId + ' silently truncates photos');
  }
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
  const framedExport = await window.webContents.executeJavaScript('window.__framedLongImageExport');
  if(framedExport) await fs.writeFile(path.join(__dirname, 'framed-long-image-export.png'), Buffer.from(framedExport.split(',')[1], 'base64'));
  for (const [key, name] of [['__filmTextExport', 'film-story-no-image-export'], ['__filmPhotoExport', 'film-story-photo-export'], ['__diaryExport', 'photo-diary-export'], ['__filmStripExport', 'film-strip-export'], ['__circleNoteExport', 'circle-note-export']]) {
    const exported = await window.webContents.executeJavaScript('window.' + key);
    if(exported) await fs.writeFile(path.join(__dirname, name + '.png'), Buffer.from(exported.split(',')[1], 'base64'));
  }
  console.log(JSON.stringify({ ...result, directory: __dirname }, null, 2));
  app.exit(result && !result.error ? 0 : 1);
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', code => { process.exitCode = code ?? 1; });
child.on('error', error => { console.error(error); process.exitCode = 1; });
