/**
 * @file test-todo-occurrence.mjs
 * @input Todo occurrence renderer harness and production CSS
 * @output Disposable Electron test results and mobile/desktop screenshots
 * @pos Test runner
 * @updated 2026-10-16: Checks actual recurring completion interactions with a verified Chinese font.
 */
import { build } from 'esbuild';
import { copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-todo-occurrence-'));
const mocks = {
  PrivacyContext: 'export const usePrivacy = () => ({ isPrivacyMode: false, hideSensitiveContent: false });',
  ToastContext: 'export const useToast = () => ({ addToast: () => {} });',
  AIChatWindowContext: 'export const useAIChatWindow = () => ({ openAIChat: () => {}, unreadCount: 0 });',
  useBackgroundDisplay: 'export const useBackgroundDisplay = () => ({ backgroundUrl: null, hasBackground: false, panelOverlayOpacity: 0.5, useReducedEffects: true });',
  useCardBackground: 'export const useCardBackground = () => ({ active: false, style: {} });',
  ...Object.fromEntries(['IconRenderer', 'UIIcon', 'FloatingButton', 'UnreadCountBadge', 'DataCollectionSelector', 'ScopeAssociation', 'TagAssociation', 'DetailTimelineCard', 'TimelineImage'].map((name) => [name, `export const ${name} = () => null;`]))
};
await build({
  entryPoints: ['src/components/__tests__/todoOccurrenceHarness.tsx'], bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'isolated-todo-contexts', setup(builder) {
    builder.onResolve({ filter: /\/(PrivacyContext|ToastContext|AIChatWindowContext|useBackgroundDisplay|useCardBackground|IconRenderer|UIIcon|FloatingButton|UnreadCountBadge|DataCollectionSelector|ScopeAssociation|TagAssociation|DetailTimelineCard|TimelineImage)$/ }, (args) => ({ path: args.path.split('/').pop(), namespace: 'todo-test' }));
    builder.onLoad({ filter: /.*/, namespace: 'todo-test' }, (args) => ({ contents: mocks[args.path], loader: 'js' }));
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
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 2) console.error(message); });
  await win.loadFile(path.join(__dirname, 'index.html'));
  const captured = new Set();
  for (let i = 0; i < 400; i++) {
    const capture = await win.webContents.executeJavaScript('window.__todoOccurrenceCapture');
    if (capture && !captured.has(capture.name)) {
      win.setContentSize(capture.width, capture.height);
      await win.webContents.executeJavaScript('document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))');
      const file = path.join(__dirname, capture.name + '.png');
      await fs.writeFile(file, (await win.webContents.capturePage()).toPNG());
      console.log('SCREENSHOT=' + file);
      captured.add(capture.name);
      await win.webContents.executeJavaScript('window.__todoOccurrenceCaptured = true');
    }
    const result = await win.webContents.executeJavaScript('window.__todoOccurrenceResult');
    if (result) { console.log(JSON.stringify(result, null, 2)); app.exit(result.error ? 1 : 0); return; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Todo occurrence renderer timeout');
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
