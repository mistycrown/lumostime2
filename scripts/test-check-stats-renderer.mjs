/**
 * @file test-check-stats-renderer.mjs
 * @input Statistics renderer fixture and production CSS
 * @output Native touch regression checks and screenshots with a verified Chinese font
 * @pos Test Runner
 * @updated 2026-10-11: Verifies annual check scrolling and navigation in a hidden disposable Electron window.
 */
import { build } from 'esbuild';
import { access, copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-check-stats-'));
await access('C:/Windows/Fonts/msyh.ttc');
await build({
  entryPoints: ['src/components/__tests__/checkStatsRendererHarness.tsx'], bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '{"DEV":false}' },
  plugins: [{ name: 'isolated-stats-platform', setup(builder) {
    builder.onResolve({ filter: /\/(PrivacyContext|NavigationContext|SettingsContext|ChronoPrintView|IconRenderer)$/ }, args => ({ path: path.basename(args.path), namespace: 'test' }));
    builder.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents: {
      PrivacyContext: 'export const usePrivacy = () => ({ isPrivacyMode: false });',
      NavigationContext: 'export const useNavigation = () => ({ setIsExportViewOpen: () => {} });',
      SettingsContext: 'export const useSettings = () => ({ scheduleStyle: "timeline" });',
      ChronoPrintView: 'export const ChronoPrintView = () => null;',
      IconRenderer: 'export const IconRenderer = () => null;'
    }[args.path], loader: 'js' }));
  } }]
});
const css = (await readdir('dist/assets')).find(file => file.startsWith('index-') && file.endsWith('.css'));
if (!css) throw new Error('Run npm run build before renderer verification');
await copyFile(path.join('dist/assets', css), path.join(directory, 'test.css'));
await copyFile('C:/Windows/Fonts/msyh.ttc', path.join(directory, 'chinese.ttc'));
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><meta charset="utf-8"><link rel="stylesheet" href="test.css"><style>@font-face{font-family:VerifiedChinese;src:url(chinese.ttc)}body{font-family:VerifiedChinese,"Microsoft YaHei",sans-serif;margin:0;background:#faf9f6;--app-safe-area-top:0px}#root{height:100vh}</style><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
setTimeout(() => { console.error('Statistics renderer exceeded 60 seconds'); app.exit(1); }, 60000);
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 390, height: 844, webPreferences: { backgroundThrottling: false, offscreen: true } });
  await win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.debugger.attach('1.3');
  for (let i = 0; i < 500; i++) {
    const swipe = await win.webContents.executeJavaScript('window.__checkStatsTouch');
    if (swipe) {
      for (let index = 0; index < swipe.length; index++) {
        await win.webContents.debugger.sendCommand('Input.dispatchTouchEvent', { type: index === 0 ? 'touchStart' : 'touchMove', touchPoints: [{ ...swipe[index], id: 1 }] });
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      await win.webContents.debugger.sendCommand('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await win.webContents.executeJavaScript('window.__checkStatsTouch = undefined');
    }
    const capture = await win.webContents.executeJavaScript('window.__checkStatsCapture');
    if (capture) {
      if (capture.endsWith('-desktop')) win.setSize(1100, 900);
      await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
      win.webContents.invalidate();
      await new Promise(resolve => setTimeout(resolve, 100));
      const screenshot = path.join(__dirname, capture + '.png');
      await fs.writeFile(screenshot, (await win.webContents.capturePage()).toPNG());
      console.log('CHECK_STATS_SCREENSHOT=' + screenshot);
      await win.webContents.executeJavaScript('window.__checkStatsCapture = undefined');
    }
    const result = await win.webContents.executeJavaScript('window.__checkStatsResult');
    if (result) {
      console.log(JSON.stringify(result, null, 2));
      app.exit(result.error ? 1 : 0); return;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Statistics renderer timeout');
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', code => { process.exitCode = code ?? 1; });
child.on('error', error => { console.error(error); process.exitCode = 1; });
