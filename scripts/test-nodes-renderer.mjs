/**
 * @file test-nodes-renderer.mjs
 * @updated 2026-10-08: Repaints hidden renderer frames before capturing Markdown previews.
 * @updated 2026-10-07: Drives native mouse/touch input for capsule drag and category ordering.
 * @input Real node React renderer harness and production CSS from npm run build
 * @output Offline interaction results and verified-font mobile/desktop screenshots
 * @pos Test Runner
 * @updated 2026-10-06: Runs node regressions in a hidden, disposable Electron profile.
 */
import { build } from 'esbuild';
import { access, copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-nodes-'));
const mocks = path.resolve('src/components/__tests__/nodeRendererMocks.tsx');
const adapters = ['SettingsContext', 'CategoryScopeContext', 'NavigationContext', 'AIChatWindowContext', 'aiService'];
await access('C:/Windows/Fonts/msyh.ttc');
await build({
  entryPoints: ['src/components/__tests__/nodeRendererHarness.tsx'], bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '{"DEV":false,"VITE_APP_VERSION":"test"}' },
  plugins: [{ name: 'offline-node-adapters', setup(builder) {
    builder.onResolve({ filter: /.*/ }, (args) => adapters.includes(path.basename(args.path)) ? { path: mocks } : undefined);
  } }]
});
const css = (await readdir('dist/assets')).find((file) => file.startsWith('index-') && file.endsWith('.css'));
if (!css) throw new Error('Run npm run build before renderer verification');
await copyFile(path.join('dist/assets', css), path.join(directory, 'test.css'));
await copyFile('C:/Windows/Fonts/msyh.ttc', path.join(directory, 'chinese.ttc'));
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><meta charset="utf-8"><link rel="stylesheet" href="test.css"><style>@font-face{font-family:VerifiedChinese;src:url(chinese.ttc)}body,.font-serif{font-family:VerifiedChinese,"Microsoft YaHei",serif}body{margin:0;background:#faf9f6;--app-safe-area-top:0px}#root{height:100vh}</style><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
setTimeout(() => { console.error('Node renderer exceeded 60 seconds'); app.exit(1); }, 60000);
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 390, height: 844, webPreferences: { contextIsolation: true, backgroundThrottling: false, offscreen: true } });
  await win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.debugger.attach('1.3');
  for (let i = 0; i < 550; i++) {
    const pointer = await win.webContents.executeJavaScript('window.__nodeRendererPointer');
    if (pointer) {
      if (pointer.pointerType === 'touch') {
        const type = { down: 'touchStart', move: 'touchMove', up: 'touchEnd', cancel: 'touchCancel' }[pointer.phase];
        await win.webContents.debugger.sendCommand('Input.dispatchTouchEvent', { type, touchPoints: ['up', 'cancel'].includes(pointer.phase) ? [] : [{ x: pointer.x, y: pointer.y, id: 1 }] });
      } else {
        if (pointer.phase === 'down') win.webContents.sendInputEvent({ type: 'mouseMove', x: pointer.x, y: pointer.y });
        win.webContents.sendInputEvent({ type: { down: 'mouseDown', move: 'mouseMove', up: 'mouseUp' }[pointer.phase], x: pointer.x, y: pointer.y, button: 'left', clickCount: 1 });
      }
      await win.webContents.executeJavaScript('window.__nodeRendererPointer = null');
    }
    const capture = await win.webContents.executeJavaScript('window.__nodeRendererCapture');
    if (capture) {
      if (capture.endsWith('-desktop')) win.setSize(1100, 900);
      await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
      win.webContents.invalidate();
      await new Promise(resolve => setTimeout(resolve, 100));
      const screenshot = path.join(__dirname, capture + '.png');
      await fs.writeFile(screenshot, (await win.webContents.capturePage()).toPNG());
      console.log('NODE_SCREENSHOT=' + screenshot);
      await win.webContents.executeJavaScript('window.__nodeRendererCapture = null');
    }
    const result = await win.webContents.executeJavaScript('window.__nodeRendererResult');
    if (result) {
      console.log(JSON.stringify(result, null, 2));
      if (result.error) console.log('NODE_RENDERER_TEXT=' + await win.webContents.executeJavaScript('document.body.innerText'));
      app.exit(result.error ? 1 : 0); return;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Node renderer timeout');
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
