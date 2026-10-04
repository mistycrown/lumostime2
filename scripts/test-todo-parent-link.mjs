/**
 * @file test-todo-parent-link.mjs
 * @input Real todo parent-link renderer harness and production CSS from npm run build
 * @output Interaction results and temporary narrow-screen screenshots
 * @pos Test Runner
 * @updated 2026-10-04: Runs main-task association regressions in a disposable Electron profile.
 */
import { build } from 'esbuild';
import { copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-parent-link-'));
await build({
  entryPoints: ['src/components/__tests__/todoParentLinkHarness.tsx'], bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'isolated-icon', setup(builder) {
    builder.onResolve({ filter: /\/IconRenderer$/ }, () => ({ path: 'icon', namespace: 'test' }));
    builder.onLoad({ filter: /^icon$/, namespace: 'test' }, () => ({ contents: 'export const IconRenderer = () => null;', loader: 'js' }));
  } }]
});
const stylesheet = (await readdir('dist/assets')).find((name) => name.startsWith('index-') && name.endsWith('.css'));
if (!stylesheet) throw new Error('Run npm run build before renderer verification');
await copyFile(path.join('dist/assets', stylesheet), path.join(directory, 'app.css'));
await copyFile('C:/Windows/Fonts/msyh.ttc', path.join(directory, 'chinese.ttc'));
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><meta charset="utf-8"><link rel="stylesheet" href="app.css"><style>@font-face{font-family:VerifiedChinese;src:url(chinese.ttc)}body{font-family:VerifiedChinese,"Microsoft YaHei",sans-serif;--app-safe-area-top:0px}</style><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 390, height: 844, webPreferences: { backgroundThrottling: false } });
  await win.loadFile(path.join(__dirname, 'index.html'));
  const captured = new Set();
  for (let i = 0; i < 300; i++) {
    const capture = await win.webContents.executeJavaScript('window.__todoParentLinkCapture');
    if (capture && !captured.has(capture)) {
      await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
      const file = path.join(__dirname, capture + '.png');
      await fs.writeFile(file, (await win.webContents.capturePage()).toPNG());
      console.log('SCREENSHOT=' + file);
      captured.add(capture);
      await win.webContents.executeJavaScript('window.__todoParentLinkCaptured = true');
    }
    const result = await win.webContents.executeJavaScript('window.__todoParentLinkResult');
    if (result) { console.log(JSON.stringify(result, null, 2)); app.exit(result.error ? 1 : 0); return; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Parent association renderer timeout');
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
