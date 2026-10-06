/**
 * @file test-ai-log-attributes-renderer.mjs
 * @input AI log renderer harness, production CSS, and installed Electron/esbuild
 * @output Offline renderer assertions and screenshots in an isolated temporary directory
 * @pos Test Runner
 * @updated 2026-10-06: Verifies AI attribute results without touching saved user data.
 */
import { build } from 'esbuild';
import { access, copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-ai-log-attributes-'));
await access('C:/Windows/Fonts/msyh.ttc');
await build({
  entryPoints: [path.join(root, 'src/components/__tests__/aiLogAttributesRendererHarness.tsx')],
  bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"' }
});
const css = (await readdir(path.join(root, 'dist/assets'))).find((file) => file.endsWith('.css'));
if (!css) throw new Error('Run npm run build before renderer verification');
await copyFile(path.join(root, 'dist/assets', css), path.join(directory, 'test.css'));
await writeFile(path.join(directory, 'index.html'), `<!doctype html><html><meta charset="utf-8"><link rel="stylesheet" href="test.css"><style>@font-face{font-family:VerifiedChinese;src:local('Microsoft YaHei')}body,.font-serif{font-family:VerifiedChinese!important}body{background:#fdfbf7}</style><body><div id="root"></div><script src="test.js"></script></body></html>`, 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
setTimeout(() => { console.error('AI log renderer exceeded 60 seconds'); app.exit(1); }, 60000);
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 1000, height: 800, webPreferences: { contextIsolation: true, backgroundThrottling: false, offscreen: true } });
  await window.loadFile(path.join(__dirname, 'index.html'));
  let result;
  for (let i = 0; i < 550; i++) {
    const capture = await window.webContents.executeJavaScript('window.__aiLogAttributesCapture');
    if (capture) {
      if (capture.endsWith('-mobile')) window.setSize(390, 844);
      await new Promise(resolve => setTimeout(resolve, 180));
      const screenshot = path.join(__dirname, capture + '.png');
      await fs.writeFile(screenshot, (await window.webContents.capturePage()).toPNG());
      console.log('RENDERER_SCREENSHOT=' + screenshot);
      await window.webContents.executeJavaScript('window.__aiLogAttributesCapture = null');
    }
    result = await window.webContents.executeJavaScript('window.__aiLogAttributesResult');
    if (result) break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  console.log(JSON.stringify(result || { error: 'Renderer timeout' }, null, 2));
  app.exit(result && !result.error ? 0 : 1);
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
