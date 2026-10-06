/**
 * @file test-custom-presets-renderer.mjs
 * @input Real React theme-preset harness and isolated appearance adapters
 * @output Renderer regression results in a disposable Electron profile
 * @pos Test Runner
 * @updated 2026-10-06: Verifies saved themes survive re-entry, restores and first-sync decisions.
 */
import { build } from 'esbuild';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-custom-presets-'));
const mocks = path.join(root, 'src/hooks/__tests__/customPresetsRendererMocks.ts');
await build({
  entryPoints: [path.join(root, 'src/hooks/__tests__/customPresetsRendererHarness.tsx')],
  bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'isolated-preset-adapters', setup(builder) {
    builder.onResolve({ filter: /.*/ }, (args) => {
      if (['SettingsContext', 'appearanceBackupService', 'themeSnapshotService'].includes(path.basename(args.path))) {
        return { path: mocks };
      }
    });
  } }]
});
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><meta charset="utf-8"><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
  await window.loadFile(path.join(__dirname, 'index.html'));
  let result;
  for (let i = 0; i < 300; i++) {
    result = await window.webContents.executeJavaScript('window.__customPresetsTestResult');
    if (result) break;
    await delay(100);
  }
  console.log(JSON.stringify(result || { error: 'Preset renderer test timeout' }, null, 2));
  app.exit(!result || result.error ? 1 : 0);
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
