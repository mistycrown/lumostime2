/**
 * @file test-principle-groups.mjs
 * @input Principle group renderer harness, product CSS and verified Chinese font
 * @output Isolated Chromium interaction checks and mobile light/dark screenshots
 * @updated 2026-10-18: Adds reproducible principle library and scene group verification.
 */
import { build } from 'esbuild';
import { copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-principle-groups-'));
const mocks = {
  DataContext: 'export const useData = () => ({ todos: [], todoCategories: [] });',
  CategoryScopeContext: 'export const useCategoryScope = () => ({ categories: [] });',
  ReviewContext: 'export const useReview = () => ({ checkTemplates: [] });',
  ToastContext: 'export const useToast = () => ({ addToast: () => {} });',
  SettingsContext: 'export const useSettings = () => ({ sceneCardTimerMode: "realtime" }); export const useOptionalSettings = () => null;',
  useCardBackground: 'export const useCardBackground = () => ({ style: {}, active: false });',
  uiIconService: 'export const uiIconService = { isCustomTheme: () => false };',
  ...Object.fromEntries(['TagAssociation', 'TodoAssociation', 'CheckItemAssociation', 'TagMultipleAssociation', 'IconRenderer', 'AppSelector', 'CardStatsBadge']
    .map((name) => [name, `export const ${name} = () => null;`])),
  UIIconSelector: 'export const UIIconSelectorCompact = () => null;'
};
await build({
  entryPoints: ['src/components/__tests__/principleGroupsHarness.tsx'], bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '{}' },
  plugins: [{ name: 'isolated-principle-contexts', setup(builder) {
    builder.onResolve({ filter: new RegExp(`/(${Object.keys(mocks).join('|')})$`) },
      (args) => ({ path: args.path.split('/').pop(), namespace: 'principle-test' }));
    builder.onLoad({ filter: /.*/, namespace: 'principle-test' }, (args) => ({ contents: mocks[args.path], loader: 'js' }));
  } }]
});
const stylesheet = (await readdir('dist/assets')).find((name) => name.startsWith('index-') && name.endsWith('.css'));
if (!stylesheet) throw new Error('Run npm run build before renderer verification');
await copyFile(path.join('dist/assets', stylesheet), path.join(directory, 'app.css'));
await copyFile('C:/Windows/Fonts/msyh.ttc', path.join(directory, 'chinese.ttc'));
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><meta charset="utf-8"><link rel="stylesheet" href="app.css"><style>@font-face{font-family:VerifiedChinese;src:url(chinese.ttc)}body{font-family:VerifiedChinese,"Microsoft YaHei",sans-serif;--font-family:VerifiedChinese;--app-safe-area-top:0px;background:#f5f1ec}</style><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 390, height: 844, webPreferences: { backgroundThrottling: false, offscreen: true } });
  const errors = [];
  win.webContents.on('console-message', (event) => { if (event.level === 'error') errors.push(event.message); });
  await win.loadFile(path.join(__dirname, 'index.html'));
  const captured = new Set();
  for (let i = 0; i < 300; i++) {
    const capture = await win.webContents.executeJavaScript('window.__principleCapture');
    if (capture && !captured.has(capture)) {
      await win.webContents.executeJavaScript('document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))');
      await new Promise(resolve => setTimeout(resolve, 350));
      const file = path.join(__dirname, capture + '.png');
      await fs.writeFile(file, (await win.webContents.capturePage()).toPNG());
      console.log('SCREENSHOT=' + file);
      captured.add(capture);
      await win.webContents.executeJavaScript('window.__principleCaptured = true');
    }
    const result = await win.webContents.executeJavaScript('window.__principleResult');
    if (result) {
      console.log(JSON.stringify({ ...result, rendererErrors: errors }, null, 2));
      if (result.error) console.log(await win.webContents.executeJavaScript('document.body.innerText'));
      app.exit(result.error || errors.length ? 1 : 0); return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Principle groups renderer timeout');
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
