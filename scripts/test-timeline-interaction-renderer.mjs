/**
 * @file test-timeline-interaction-renderer.mjs
 * @input Actual timeline canvas harness, production CSS and native Chromium input
 * @output First-tap and gesture regression results plus Chinese-font-verified screenshots
 * @pos Test Runner
 * @updated 2026-10-12: Checks touch/mouse opening and delayed compatibility clicks in isolated Electron storage.
 */
import { build } from 'esbuild';
import { access, copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-timeline-input-'));
await access('C:/Windows/Fonts/msyh.ttc');
await build({ entryPoints: ['src/components/__tests__/timelineInteractionRendererHarness.tsx'], bundle: true,
  platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '{"DEV":false}' } });
const css = (await readdir('dist/assets')).find(file => file.startsWith('index-') && file.endsWith('.css'));
if (!css) throw new Error('Run npm run build before renderer verification');
await copyFile(path.join('dist/assets', css), path.join(directory, 'test.css'));
await copyFile('C:/Windows/Fonts/msyh.ttc', path.join(directory, 'chinese.ttc'));
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><meta charset="utf-8"><link rel="stylesheet" href="test.css"><style>@font-face{font-family:VerifiedChinese;src:url(chinese.ttc)}body{font-family:VerifiedChinese,"Microsoft YaHei",sans-serif;margin:0;--app-safe-area-top:0px}#root{height:100vh}</style><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.setPath('userData', path.join(__dirname, 'profile'));
setTimeout(() => app.exit(1), 60000);
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 390, height: 844, webPreferences: { backgroundThrottling: false, offscreen: true } });
  await win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.debugger.attach('1.3');
  for (let i = 0; i < 500; i++) {
    const input = await win.webContents.executeJavaScript('window.__timelineInput');
    if (input) {
      if (input.type === 'touch') {
        for (const [index, point] of input.points.entries()) {
          await win.webContents.debugger.sendCommand('Input.dispatchTouchEvent', { type: index === 0 ? 'touchStart' : 'touchMove', touchPoints: [{ ...point, id: 1 }] });
          await wait(index === 0 && input.holdMs ? input.holdMs : 25);
        }
        await win.webContents.debugger.sendCommand('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else if (input.type === 'pinch') {
        for (const [index, frame] of input.frames.entries()) {
          await win.webContents.debugger.sendCommand('Input.dispatchTouchEvent', { type: index === 0 ? 'touchStart' : 'touchMove', touchPoints: frame.map((point, id) => ({ ...point, id: id + 1 })) });
          await wait(40);
        }
        await win.webContents.debugger.sendCommand('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent', { type: 'mousePressed', ...input.point, button: 'left', clickCount: 1 });
        await wait(25);
        await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent', { type: 'mouseReleased', ...input.point, button: 'left', clickCount: 1 });
      }
      await win.webContents.executeJavaScript('window.__timelineInput = undefined');
    }
    const capture = await win.webContents.executeJavaScript('window.__timelineCapture');
    if (capture) {
      await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
      await fs.writeFile(path.join(__dirname, capture + '.png'), (await win.webContents.capturePage()).toPNG());
      await win.webContents.executeJavaScript('window.__timelineCapture = undefined');
    }
    const result = await win.webContents.executeJavaScript('window.__timelineResult');
    if (result) { console.log(JSON.stringify({ ...result, directory: __dirname }, null, 2)); app.exit(result.error ? 1 : 0); return; }
    await wait(50);
  }
  throw new Error('Timeline renderer timeout');
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', code => { process.exitCode = code ?? 1; });
child.on('error', error => { console.error(error); process.exitCode = 1; });
