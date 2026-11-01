/**
 * @file test-timer-concurrency-renderer.mjs
 * @input Real timer/settings/widget-sync harness and production CSS
 * @output Isolated renderer checks and preferences screenshots in a temporary directory
 * @pos Verification launcher
 * @updated 2026-11-01: Exercises timer switching with synthetic platform adapters and a verified Chinese font.
 */
import { build } from 'esbuild';
import { copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-timer-concurrency-'));
const adapters = path.resolve('src/hooks/__tests__/timerConcurrencyAdapters.tsx');
const mockModules = {
  fontService: 'export const fontService = { setFont() {} };',
  appearanceBackupService: 'export const APPEARANCE_RESTORED_EVENT = "test:appearance";',
  imageService: 'export const imageService = { addToReferencedList() {} };'
};
await build({
  entryPoints: ['src/hooks/__tests__/timerConcurrencyHarness.tsx'], bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '{}' },
  plugins: [{ name: 'isolated-timer-platform', setup(builder) {
    builder.onResolve({ filter: /.*/ }, (args) => {
      const name = path.basename(args.path);
      if (['@capacitor/core', '@capacitor/app'].includes(args.path) || ['WidgetBridgePlugin', 'CategoryScopeContext', 'DataContext', 'ReviewContext'].includes(name)) return { path: adapters };
      if (Object.hasOwn(mockModules, name)) return { path: name, namespace: 'timer-mocks' };
    });
    builder.onLoad({ filter: /.*/, namespace: 'timer-mocks' }, (args) => ({ contents: mockModules[args.path], loader: 'js' }));
  } }]
});
const css = (await readdir('dist/assets')).find((name) => name.startsWith('index-') && name.endsWith('.css'));
if (!css) throw new Error('Run npm run build first');
await copyFile(path.join('dist/assets', css), path.join(directory, 'app.css'));
await copyFile('C:/Windows/Fonts/msyh.ttc', path.join(directory, 'chinese.ttc'));
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><meta charset="utf-8"><link rel="stylesheet" href="app.css"><style>@font-face{font-family:VerifiedChinese;src:url(chinese.ttc)}body{font-family:VerifiedChinese,sans-serif;--font-family:VerifiedChinese;--app-safe-area-top:0px}</style><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 390, height: 844, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = [];
  win.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
  await win.loadFile(path.join(__dirname, 'index.html'));
  for (let i = 0; i < 300; i++) {
    if (await win.webContents.executeJavaScript('window.__timerConcurrencyCapture')) {
      await win.webContents.executeJavaScript('document.fonts.ready');
      await fs.writeFile(path.join(__dirname, 'mobile.png'), (await win.webContents.capturePage()).toPNG());
      win.setSize(1000, 900);
      await win.webContents.executeJavaScript('document.documentElement.setAttribute("data-theme-mode", "dark"); document.querySelector("[role=switch]").scrollIntoView({block:"center"})');
      await new Promise(resolve => setTimeout(resolve, 250));
      await fs.writeFile(path.join(__dirname, 'desktop-dark.png'), (await win.webContents.capturePage()).toPNG());
      console.log('SCREENSHOTS=' + __dirname);
      await win.webContents.executeJavaScript('window.__timerConcurrencyCapture = null');
    }
    const result = await win.webContents.executeJavaScript('window.__timerConcurrencyResult');
    if (result) { console.log(JSON.stringify({ ...result, errors }, null, 2)); app.exit(result.error || errors.length ? 1 : 0); return; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timer renderer timed out');
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, windowsHide: true, stdio: 'inherit' });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
