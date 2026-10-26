/**
 * @file test-ai-todo-reminders-renderer.mjs
 * @input Offline chat reminder harness, built CSS and verified Microsoft YaHei font
 * @output Disposable hidden Electron smoke checks and screenshots
 * @pos Verification launcher
 * @updated 2026-10-26: Tests reminder results without network calls or user profile access.
 */
import { build } from 'esbuild';
import { access, copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-ai-todo-reminders-'));
await access('C:/Windows/Fonts/msyh.ttc');
await build({
  entryPoints: ['src/components/__tests__/aiTodoReminderRendererHarness.tsx'], bundle: true, platform: 'browser', format: 'iife',
  outfile: path.join(directory, 'test.js'), define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '{}' },
  plugins: [{ name: 'offline-reminder-renderer', setup(builder) {
    builder.onResolve({ filter: /\/NodeContext$/ }, () => ({ path: 'nodes', namespace: 'offline' }));
    builder.onResolve({ filter: /\/ActivityAttributeSummary$/ }, () => ({ path: 'attributes', namespace: 'offline' }));
    builder.onLoad({ filter: /.*/, namespace: 'offline' }, ({ path: name }) => ({
      contents: name === 'nodes' ? 'export const useOptionalNodes = () => null;' : 'export const ActivityAttributeSummary = () => null;', loader: 'js'
    }));
  } }]
});
const css = (await readdir('dist/assets')).find((file) => file.startsWith('index-') && file.endsWith('.css'));
if (!css) throw new Error('Run npm run build first');
await copyFile(path.join('dist/assets', css), path.join(directory, 'test.css'));
await copyFile('C:/Windows/Fonts/msyh.ttc', path.join(directory, 'chinese.ttc'));
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><meta charset="utf-8"><link rel="stylesheet" href="test.css"><style>@font-face{font-family:VerifiedChinese;src:url(chinese.ttc)}body{font-family:VerifiedChinese,"Microsoft YaHei",serif;margin:0;background:#faf9f6}</style><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
setTimeout(() => { console.error('Reminder renderer timeout'); app.exit(1); }, 60000);
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1000, height: 800, webPreferences: { backgroundThrottling: false, offscreen: true } });
  await win.loadFile(path.join(__dirname, 'index.html'));
  for (let i = 0; i < 550; i++) {
    const capture = await win.webContents.executeJavaScript('window.__aiTodoCapture');
    if (capture) {
      win.setContentSize(capture.endsWith('-mobile') ? 390 : 1000, capture.endsWith('-mobile') ? 844 : 800);
      await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
      await new Promise(resolve => setTimeout(resolve, 150));
      const screenshot = path.join(__dirname, capture + '.png');
      await fs.writeFile(screenshot, (await win.webContents.capturePage()).toPNG());
      console.log('SCREENSHOT=' + screenshot);
      await win.webContents.executeJavaScript('window.__aiTodoCapture = null');
    }
    const result = await win.webContents.executeJavaScript('window.__aiTodoResult');
    if (result) { console.log(JSON.stringify(result)); app.exit(result.error ? 1 : 0); return; }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Reminder renderer timeout');
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
