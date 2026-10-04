/**
 * @file test-buffered-editors.mjs
 * @input Real buffered editor React regression harness
 * @output Isolated Electron renderer regression results
 * @pos Test Runner
 */
import { build } from 'esbuild';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-editor-test-'));
const mocks = path.resolve('src/hooks/__tests__/bufferedEditorMocks.tsx');
const adapters = new Set(['NavigationContext', 'SettingsContext', 'AIChatWindowContext', 'ToastContext', 'IconRenderer', 'UIIcon', 'UIIconSelector', 'FloatingButton', 'CheckItemStreakBadge', 'CountInputModal', 'NarrativeStyleSelectionModal', 'AIQuoteGenerator', 'MoodPicker', 'StatsView', 'TodoAssociation', 'ScopeAssociation', 'FocusScoreSelector', 'MoodScoreSelector', 'ImmersiveTimer', 'ReactionComponents', 'RecommendedNoteTemplates', 'ActivityAttributeFields']);
await build({
  entryPoints: ['src/hooks/__tests__/bufferedEditorHarness.tsx'], bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'editor-adapters', setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => {
      if (args.path === '@capacitor/app' || args.path === '@capacitor/core' || adapters.has(path.basename(args.path))) return { path: mocks };
    });
  } }]
});
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><meta charset="utf-8"><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { backgroundThrottling: false } });
  win.webContents.on('console-message', event => { if (event.level === 'error') console.error(event.message); });
  await win.loadFile(path.join(__dirname, 'index.html'));
  for (let i = 0; i < 600; i++) {
    const result = await win.webContents.executeJavaScript('window.__bufferedEditorResult');
    if (result) { console.log(JSON.stringify(result, null, 2)); app.exit(result.error ? 1 : 0); return; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Editor regression timeout');
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', code => { process.exitCode = code ?? 1; });
child.on('error', error => { console.error(error); process.exitCode = 1; });
