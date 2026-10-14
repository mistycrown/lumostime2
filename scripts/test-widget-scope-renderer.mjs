/**
 * @file test-widget-scope-renderer.mjs
 * @input Real widget editor harness, Electron, production CSS and verified Chinese font
 * @output Scope association checks and screenshots under node_modules/.cache/widget-scope-smoke
 * @pos Test runner
 * @updated 2026-10-14: Verifies widget scope preferences in an isolated renderer.
 */
import { build } from 'esbuild';
import { copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import path from 'node:path';
const require = createRequire(import.meta.url);
const directory = path.resolve('node_modules/.cache/widget-scope-smoke');
await mkdir(directory, { recursive: true });
await build({ entryPoints: ['src/components/__tests__/widgetScopeRendererHarness.tsx'], bundle: true, platform: 'browser', format: 'iife',
  outfile: path.join(directory, 'test.js'), define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '{"DEV":false}' },
  plugins: [{ name: 'isolated-settings', setup(builder) {
    builder.onResolve({ filter: /.*/ }, (args) => ['SettingsContext', 'imageService'].includes(path.basename(args.path))
      ? { path: args.path, namespace: 'widget-adapter' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'widget-adapter' }, () => ({ contents:
      "export const useSettings = () => ({ emojiStyle: 'native' }); export const useOptionalSettings = useSettings; export const imageService = { getImageUrl: async () => null };", loader: 'ts' }));
  } }] });
const css = (await readdir('dist/assets')).find((file) => /^index-.*\.css$/.test(file));
await copyFile(path.join('dist/assets', css), path.join(directory, 'test.css'));
await copyFile('C:/Windows/Fonts/msyh.ttc', path.join(directory, 'chinese.ttc'));
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><meta charset="utf-8"><link rel="stylesheet" href="test.css"><style>@font-face{font-family:VerifiedChinese;src:url(chinese.ttc)}body{font-family:VerifiedChinese,sans-serif;--font-family:VerifiedChinese;--accent-color:#78716c}</style><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
setTimeout(() => app.exit(1), 30000);
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 430, height: 960, webPreferences: { contextIsolation: true, backgroundThrottling: false, offscreen: true } });
  await win.loadFile(path.join(__dirname, 'index.html'));
  const passed = await win.webContents.executeJavaScript('window.runWidgetScopeSmoke()');
  await win.webContents.executeJavaScript('Array.from(document.querySelectorAll("h3")).find(element => element.textContent === "建议关联").scrollIntoView({block:"center"})');
  await win.webContents.executeJavaScript('new Promise(resolve => setTimeout(resolve, 200))');
  await fs.writeFile(path.join(__dirname, 'mobile.png'), (await win.webContents.capturePage()).toPNG());
  win.setSize(1000, 960);
  await win.webContents.executeJavaScript('new Promise(resolve => setTimeout(resolve, 200))');
  await fs.writeFile(path.join(__dirname, 'desktop.png'), (await win.webContents.capturePage()).toPNG());
  console.log(JSON.stringify({ passed, screenshots: __dirname }, null, 2));
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, windowsHide: true, stdio: 'inherit' });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
