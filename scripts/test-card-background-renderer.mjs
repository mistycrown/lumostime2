/**
 * @file test-card-background-renderer.mjs
 * @input Real card-background React harness and optional --smoke-url local preview
 * @output Isolated Electron regression results and screenshots in a temporary folder
 * @pos Test Runner
 * @updated 2026-10-05: Uses a disposable profile to exercise image decoding and asynchronous UI updates.
 */
import { build } from 'esbuild';
import { copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-card-background-'));
const mocks = path.join(root, 'src/hooks/__tests__/cardBackgroundRendererMocks.ts');
const smokeIndex = process.argv.indexOf('--smoke-url');
const smokeUrl = smokeIndex >= 0 ? process.argv[smokeIndex + 1] : null;
if (smokeUrl && !/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(smokeUrl)) throw new Error('Smoke URL must be a local preview origin');
await build({
  entryPoints: [path.join(root, 'src/hooks/__tests__/cardBackgroundRendererHarness.tsx')],
  bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'isolated-card-image-adapters', setup(builder) {
    builder.onResolve({ filter: /.*/ }, (args) => {
      if (['imageService', 'appearanceBackupService', 'settingsImageReferenceService'].includes(path.basename(args.path))) return { path: mocks };
    });
  } }]
});
let stylesheet = '';
try {
  const css = (await readdir(path.join(root, 'dist/assets'))).find((file) => file.endsWith('.css'));
  if (css) {
    await copyFile(path.join(root, 'dist/assets', css), path.join(directory, 'test.css'));
    stylesheet = '<link rel="stylesheet" href="test.css">';
  }
} catch { /* Rendering assertions can also run before the first production build. */ }
await writeFile(path.join(directory, 'index.html'), `<!doctype html><html><meta charset="utf-8">${stylesheet}<body style="padding:30px"><div id="root"></div><script src="test.js"></script></body></html>`, 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 1200, height: 850, webPreferences: { contextIsolation: true, backgroundThrottling: false, offscreen: true } });
  await window.loadFile(path.join(__dirname, 'index.html'));
  let result;
  for (let i = 0; i < 600; i++) {
    result = await window.webContents.executeJavaScript('window.__cardBackgroundTestResult');
    if (result) break;
    await delay(100);
  }
  console.log(JSON.stringify(result || { error: 'Card renderer test timeout' }, null, 2));
  await delay(250);
  console.log('RENDERER_TEXT=' + await window.webContents.executeJavaScript('document.body.innerText'));
  const screenshot = path.join(__dirname, 'card-background-renderer.png');
  await fs.writeFile(screenshot, (await window.webContents.capturePage()).toPNG());
  console.log('RENDERER_SCREENSHOT=' + screenshot);
  if (!result || result.error) { app.exit(1); return; }
  const smokeUrl = ${JSON.stringify(smokeUrl)};
  if (smokeUrl) {
    const errors = [];
    window.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
    await window.loadURL(smokeUrl);
    await delay(6000);
    const text = await window.webContents.executeJavaScript('document.body.innerText');
    if (errors.length || text.includes('应用启动失败') || text.includes('加载本地数据超时') || text.length < 30) {
      throw new Error('Production smoke failed: ' + JSON.stringify(errors) + text);
    }
    const productionScreenshot = path.join(__dirname, 'production-smoke.png');
    await fs.writeFile(productionScreenshot, (await window.webContents.capturePage()).toPNG());
    console.log('SMOKE_SCREENSHOT=' + productionScreenshot);
    console.log('SMOKE_TEXT=' + text.slice(0, 500));
  }
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
