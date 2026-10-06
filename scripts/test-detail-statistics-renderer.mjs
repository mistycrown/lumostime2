/**
 * @file test-detail-statistics-renderer.mjs
 * @input Real detail-statistics React harness, production CSS, and installed Electron/esbuild.
 * @output Offline renderer assertions and desktop/mobile screenshots in a disposable temp directory.
 * @pos Test Runner
 * @updated 2026-10-06: Verifies actual card interactions without accessing the user's saved app profile.
 */
import { build } from 'esbuild';
import { access, copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-detail-statistics-'));
await access('C:/Windows/Fonts/msyh.ttc');
const mocks = path.join(root, 'src/components/__tests__/detailStatisticsRendererMocks.tsx');
const adapters = ['SettingsContext', 'NavigationContext', 'useSponsorshipUnlocked', 'useChartPaletteSequences', 'useCustomColors', 'useGoalStatus', 'DetailTimelineCard', 'IconRenderer', 'UIIconSelector', 'GoalCard', 'MajorGoalCard', 'GoalBatchManageView', 'NoteTemplateManager', 'AssociatedTodoList', 'ConfirmModal'];
await build({
  entryPoints: [path.join(root, 'src/components/__tests__/detailStatisticsRendererHarness.tsx')],
  bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'offline-detail-adapters', setup(builder) {
    builder.onResolve({ filter: /.*/ }, (args) => adapters.includes(path.basename(args.path)) ? { path: mocks } : undefined);
  } }]
});
const css = (await readdir(path.join(root, 'dist/assets'))).find((file) => file.endsWith('.css'));
if (!css) throw new Error('Run npm run build before renderer verification');
await copyFile(path.join(root, 'dist/assets', css), path.join(directory, 'test.css'));
await writeFile(path.join(directory, 'index.html'), `<!doctype html><html><meta charset="utf-8"><link rel="stylesheet" href="test.css"><style>@font-face{font-family:VerifiedChinese;src:local('Microsoft YaHei')}body,.font-serif{font-family:VerifiedChinese!important}body{padding:24px;background:#fdfbf7}</style><body><div id="root"></div><script src="test.js"></script></body></html>`, 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
setTimeout(() => { console.error('Detail statistics renderer exceeded 60 seconds'); app.exit(1); }, 60000);
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 1000, height: 900, webPreferences: { contextIsolation: true, backgroundThrottling: false, offscreen: true } });
  await window.loadFile(path.join(__dirname, 'index.html'));
  let result;
  for (let i = 0; i < 550; i++) {
    const capture = await window.webContents.executeJavaScript('window.__detailStatisticsCapture');
    if (capture) {
      if (capture.endsWith('-mobile')) window.setSize(390, 844);
      await new Promise(resolve => setTimeout(resolve, 180));
      const screenshot = path.join(__dirname, capture + '.png');
      await fs.writeFile(screenshot, (await window.webContents.capturePage()).toPNG());
      console.log('RENDERER_SCREENSHOT=' + screenshot);
      await window.webContents.executeJavaScript('window.__detailStatisticsCapture = null');
    }
    result = await window.webContents.executeJavaScript('window.__detailStatisticsResult');
    if (result) break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  console.log(JSON.stringify(result || { error: 'Renderer timeout' }, null, 2));
  if (!result || result.error) console.log('RENDERER_TEXT=' + await window.webContents.executeJavaScript('document.body.innerText'));
  app.exit(result && !result.error ? 0 : 1);
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
