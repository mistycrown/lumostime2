/**
 * @file test-focus-images-renderer.mjs
 * @input Real timer attachment harness, production CSS, and installed Electron/esbuild
 * @output Isolated lifecycle checks and desktop/mobile screenshots in a temporary directory
 * @pos Test Runner
 * @updated 2026-11-01: Resizes both empty and populated attachment screenshot checkpoints.
 * @updated 2026-11-01: Verifies timer photos without using saved user data or a real camera.
 */
import { build } from 'esbuild';
import { access, copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-focus-images-'));
await access('C:/Windows/Fonts/msyh.ttc');
const platformMocks = path.resolve('src/components/__tests__/focusImagesMocks.ts');
const editorMocks = path.resolve('src/hooks/__tests__/bufferedEditorMocks.tsx');
const adapters = new Set(['SettingsContext', 'ToastContext', 'IconRenderer', 'UIIcon', 'TodoAssociation', 'ScopeAssociation', 'FocusScoreSelector', 'MoodScoreSelector', 'ImmersiveTimer', 'ReactionComponents', 'RecommendedNoteTemplates', 'ActivityAttributeFields']);
await build({
  entryPoints: ['src/components/__tests__/focusImagesHarness.tsx'], bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '{}' },
  plugins: [{ name: 'focus-image-adapters', setup(builder) {
    builder.onResolve({ filter: /.*/ }, (args) => {
      if (path.basename(args.path) === 'ToastContext') return { path: platformMocks };
      if (['@capacitor/core', '@capacitor/camera', '@capacitor/filesystem'].includes(args.path)) return { path: platformMocks };
      if (adapters.has(path.basename(args.path))) return { path: editorMocks };
    });
  } }]
});
const css = (await readdir('dist/assets')).find((file) => file.startsWith('index-') && file.endsWith('.css'));
if (!css) throw new Error('Run npm run build first');
await copyFile(path.join('dist/assets', css), path.join(directory, 'test.css'));
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><meta charset="utf-8"><link rel="stylesheet" href="test.css"><style>@font-face{font-family:VerifiedChinese;src:local("Microsoft YaHei")}body,.font-serif{font-family:VerifiedChinese!important}</style><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1000, height: 850, webPreferences: { backgroundThrottling: false, offscreen: true } });
  win.webContents.on('console-message', event => { if (event.level === 'error' || event.message.startsWith('TEST_TOAST error')) console.error('RENDERER', event.message); });
  await win.loadFile(path.join(__dirname, 'index.html'));
  for (let i = 0; i < 500; i++) {
    const capture = await win.webContents.executeJavaScript('window.__focusImagesCapture');
    if (capture) {
      win.setSize(capture.endsWith('mobile') ? 390 : 1000, capture.endsWith('mobile') ? 844 : 850);
      await new Promise(resolve => setTimeout(resolve, 180));
      const screenshot = path.join(__dirname, capture + '.png');
      await fs.writeFile(screenshot, (await win.webContents.capturePage()).toPNG());
      console.log('RENDERER_SCREENSHOT=' + screenshot);
      await win.webContents.executeJavaScript('window.__focusImagesCapture = null');
    }
    const result = await win.webContents.executeJavaScript('window.__focusImagesResult');
    if (result) { console.log(JSON.stringify(result, null, 2)); app.exit(result.error ? 1 : 0); return; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timer photo renderer timeout');
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
