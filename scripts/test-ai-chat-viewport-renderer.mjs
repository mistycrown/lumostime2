/**
 * @file test-ai-chat-viewport-renderer.mjs
 * @input Real viewport-hook browser harness and installed Electron/esbuild
 * @output Offline regression results in an isolated temporary browser profile
 * @pos Test Runner
 * @updated 2026-10-09: Verifies conversation and keyboard scrolling with real DOM layout.
 */
import { build } from 'esbuild';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-ai-chat-viewport-'));
await build({
  entryPoints: [path.resolve('src/components/__tests__/aiChatViewportRendererHarness.tsx')],
  bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"' }
});
await writeFile(path.join(directory, 'index.html'), `<!doctype html><html><meta charset="utf-8"><style>body{margin:0;background:#fdfbf7;font-family:Arial,sans-serif}header{padding:12px;box-sizing:border-box}</style><body><div id="root"></div><script src="test.js"></script></body></html>`, 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
setTimeout(() => { console.error('Chat viewport renderer exceeded 45 seconds'); app.exit(1); }, 45000);
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 1000, height: 900,
    webPreferences: { contextIsolation: true, backgroundThrottling: false, offscreen: true } });
  await window.loadFile(path.join(__dirname, 'index.html'));
  let result;
  for (let i = 0; i < 400; i++) {
    result = await window.webContents.executeJavaScript('window.__aiChatViewportResult');
    if (result) break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  console.log(JSON.stringify(result || { error: 'Renderer timeout' }, null, 2));
  app.exit(result && !result.error ? 0 : 1);
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
