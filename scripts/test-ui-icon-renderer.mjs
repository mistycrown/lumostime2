/**
 * @file test-ui-icon-renderer.mjs
 * @input Real UI icon React harness, installed Electron/esbuild, optional --baseline <git-ref>
 * @output Isolated renderer verification and a temporary screenshot
 * @pos Test Runner
 * @updated 2026-10-05: Tests delayed image hydration and same-theme replacement with a disposable profile.
 */
import { build } from 'esbuild';
import { copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-ui-icon-'));
const mocks = path.join(root, 'src/components/__tests__/uiIconRendererMocks.ts');
const baselineIndex = process.argv.indexOf('--baseline');
const baselineRef = baselineIndex >= 0 ? process.argv[baselineIndex + 1] : undefined;
if (baselineIndex >= 0 && !baselineRef) throw new Error('--baseline requires a git reference');
const baseline = Boolean(baselineRef);
await build({
  entryPoints: [path.join(root, 'src/components/__tests__/uiIconRendererHarness.tsx')],
  bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'isolated-ui-icon-adapters', setup(builder) {
    builder.onResolve({ filter: /.*/ }, (args) => {
      if (['imageService', 'SettingsContext'].includes(path.basename(args.path))) return { path: mocks };
    });
    if (baseline) {
      builder.onLoad({ filter: /[\\/](uiIconService|UIIcon|IconRenderer|UIIconSelector|UiThemeButton)\.tsx?$/ }, (args) => ({
        contents: execFileSync('git', ['show', `${baselineRef}:${path.relative(root, args.path).replaceAll('\\', '/')}`], { encoding: 'utf8' }),
        loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path)
      }));
    }
  } }]
});
const css = (await readdir(path.join(root, 'dist/assets'))).find((file) => file.endsWith('.css'));
if (css) await copyFile(path.join(root, 'dist/assets', css), path.join(directory, 'test.css'));
// Skip the old preview's infinite error retry so the baseline reaches the hydration assertion.
await writeFile(path.join(directory, 'index.html'), `<!doctype html><html><meta charset="utf-8"><link rel="stylesheet" href="test.css"><body style="font-family:Microsoft YaHei;padding:30px"><div id="root"></div><script>window.__uiIconBaseline=${baseline};</script><script src="test.js"></script></body></html>`, 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
setTimeout(() => { console.error('UI icon renderer exceeded 30 seconds'); app.exit(1); }, 30000);
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 900, height: 700, webPreferences: { contextIsolation: true, backgroundThrottling: false, offscreen: true } });
  await window.loadFile(path.join(__dirname, 'index.html'));
  let result;
  for (let i = 0; i < 200; i++) {
    result = await window.webContents.executeJavaScript('window.__uiIconTestResult');
    if (result) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.log(JSON.stringify(result || { error: 'UI icon renderer timeout' }, null, 2));
  await new Promise(resolve => setTimeout(resolve, 300));
  const screenshot = path.join(__dirname, 'ui-icon-renderer.png');
  await fs.writeFile(screenshot, (await window.webContents.capturePage()).toPNG());
  console.log('RENDERER_SCREENSHOT=' + screenshot);
  app.exit(result && !result.error ? 0 : 1);
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
