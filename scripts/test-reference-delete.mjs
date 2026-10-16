/**
 * @file test-reference-delete.mjs
 * @input Real deletion dialog renderer harness and production CSS from npm run build
 * @output Isolated Electron interaction results and responsive screenshots in a temporary folder
 * @pos Test Runner
 * @updated 2026-10-16: Verifies searchable parent-child migration with an explicitly loaded Chinese font.
 */
import { build } from 'esbuild';
import { copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-reference-delete-'));
await build({
  entryPoints: ['src/components/__tests__/referenceDeleteHarness.tsx'], bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"' }
});
const stylesheet = (await readdir('dist/assets')).find((name) => name.startsWith('index-') && name.endsWith('.css'));
if (!stylesheet) throw new Error('Run npm run build before renderer verification');
await copyFile(path.join('dist/assets', stylesheet), path.join(directory, 'app.css'));
await copyFile('C:/Windows/Fonts/msyh.ttc', path.join(directory, 'chinese.ttc'));
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><meta charset="utf-8"><link rel="stylesheet" href="app.css"><style>@font-face{font-family:VerifiedChinese;src:url(chinese.ttc)}body{font-family:VerifiedChinese,"Microsoft YaHei",sans-serif;background:#e7e5e4}</style><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 390, height: 844, webPreferences: { backgroundThrottling: false } });
  await win.loadFile(path.join(__dirname, 'index.html'));
  const captured = new Set();
  for (let i = 0; i < 400; i++) {
    const capture = await win.webContents.executeJavaScript('window.__referenceDeleteCapture');
    if (capture && !captured.has(capture.name)) {
      win.setContentSize(capture.width, capture.height);
      await win.webContents.executeJavaScript('document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))');
      const file = path.join(__dirname, capture.name + '.png');
      await fs.writeFile(file, (await win.webContents.capturePage()).toPNG());
      console.log('SCREENSHOT=' + file);
      captured.add(capture.name);
      await win.webContents.executeJavaScript('window.__referenceDeleteCaptured = true');
    }
    const result = await win.webContents.executeJavaScript('window.__referenceDeleteResult');
    if (result) { console.log(JSON.stringify(result, null, 2)); app.exit(result.error ? 1 : 0); return; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Deletion migration renderer timeout');
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
