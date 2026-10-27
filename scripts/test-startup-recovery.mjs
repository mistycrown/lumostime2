/**
 * @file test-startup-recovery.mjs
 * @input Real UUID compatibility, app-awareness initialization, root boundary and built app
 * @output Hidden Chromium startup/retry checks and a mobile recovery screenshot
 * @pos Renderer regression runner
 * @updated 2026-10-27: Simulates missing randomUUID and provider crashes without sending Sentry events.
 */
import { build } from 'esbuild';
import { access, copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-startup-recovery-'));
await access('dist/index.html');
await access('C:/Windows/Fonts/msyh.ttc');
await copyFile('C:/Windows/Fonts/msyh.ttc', path.join(directory, 'chinese.ttc'));
await build({
  stdin: {
    contents: `
      import './src/utils/cryptoCompatibility';
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { AppErrorBoundary } from './src/components/AppErrorBoundary';
      import { appAwarenessService } from './src/services/appAwarenessService';
      const Probe = () => {
        const [templates] = React.useState(() => appAwarenessService.getTemplates());
        if (location.search.includes('crash') && !sessionStorage.getItem('recovered')) {
          throw new Error('simulated-provider-failure');
        }
        return <div data-ready="true">Templates loaded: {templates.length}</div>;
      };
      createRoot(document.getElementById('root')).render(
        <AppErrorBoundary><Probe /></AppErrorBoundary>
      );`,
    resolveDir: process.cwd(),
    loader: 'tsx'
  },
  bundle: true,
  platform: 'browser',
  format: 'iife',
  outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{
    name: 'isolated-startup-diagnostics',
    setup(builder) {
      builder.onLoad({ filter: /[\\/]services[\\/]errorReporting\.ts$/ }, () => ({
        contents: `
          window.startupReports = [];
          export const reportException = (error, context) => {
            window.startupReports.push({ message: error.message, context });
            if (location.search.includes('report-failure')) throw new Error('report unavailable');
            return location.search.includes('report-disabled') ? null : 'pending-event';
          };
          export const waitForErrorReport = () => new Promise(resolve => { window.finishStartupReport = resolve; });`,
        loader: 'js'
      }));
      builder.onLoad({ filter: /[\\/]services[\\/]startupDiagnostics\.ts$/ }, () => ({
        contents: 'export const markStartupStage = stage => { window.startupStage = stage; };',
        loader: 'js'
      }));
    }
  }]
});
const stylesheet = (await readdir('dist/assets')).find((name) => /^index-.*\.css$/.test(name));
if (!stylesheet) throw new Error('Run npm run build before the renderer test');
await copyFile(path.join('dist/assets', stylesheet), path.join(directory, 'app.css'));
await writeFile(path.join(directory, 'index.html'), `<!doctype html>
<html><head><meta charset="utf-8"><link rel="stylesheet" href="app.css">
<style>@font-face{font-family:VerifiedChinese;src:url(chinese.ttc)}body,.font-serif{font-family:VerifiedChinese,sans-serif}</style>
</head><body><div id="loading-screen">Loading</div><div id="root"></div>
<script>Object.defineProperty(crypto,'randomUUID',{value:undefined,writable:true,configurable:true});</script>
<script src="test.js"></script></body></html>`, 'utf8');
await writeFile(path.join(directory, 'legacy-preload.cjs'), `
Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true, writable: true });
window.__legacyUUIDRemoved = typeof crypto.randomUUID === 'undefined';
window.addEventListener('lumostime:app-ready', () => { window.__legacyAppReady = true; });
`, 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const { writeFile } = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
app.setPath('userData', path.join(__dirname, 'profile'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = (condition, message) => { if (!condition) throw new Error(message); };
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 390, height: 844,
    webPreferences: { backgroundThrottling: false, offscreen: true } });
  const evaluate = code => win.webContents.executeJavaScript(code, true);
  const load = async search => {
    await win.loadFile(path.join(__dirname, 'index.html'), { search });
    await delay(200);
  };
  await load('');
  check(await evaluate('typeof crypto.randomUUID === "function" && !!document.querySelector("[data-ready]")'), 'Legacy startup failed');
  await load('?crash');
  check(await evaluate('!!document.querySelector("[role=alert]") && !document.getElementById("loading-screen")'), 'Provider failure left a splash or blank screen');
  check(await evaluate('window.startupStage === "render_error" && window.startupReports.length === 1'), 'Missing root diagnostic');
  check(await evaluate('!document.body.textContent.includes("pending-event")'), 'Unconfirmed error ID was displayed');
  await evaluate('window.finishStartupReport({status:"sent",eventId:"1234567890abcdef1234567890abcdef"})');
  await delay(100);
  check(await evaluate('document.body.textContent.includes("1234567890abcdef1234567890abcdef")'), 'Delivered error ID is missing');
  check(await evaluate('document.fonts.load("16px VerifiedChinese", "应用加载失败错误编号重试").then(fonts => fonts.length > 0)'), 'Chinese font failed to load');
  check(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Recovery screen overflows mobile width');
  const screenshot = path.join(__dirname, 'startup-recovery-mobile.png');
  await writeFile(screenshot, (await win.webContents.capturePage()).toPNG());
  console.log('SCREENSHOT=' + screenshot);
  // A healthy next attempt must work through the actual retry button and page reload.
  await evaluate('sessionStorage.setItem("recovered", "true")');
  const reloaded = new Promise(resolve => win.webContents.once('did-finish-load', resolve));
  await evaluate('document.querySelector("button").click()');
  await reloaded;
  await delay(200);
  check(await evaluate('!!document.querySelector("[data-ready]") && !document.querySelector("[role=alert]")'), 'Retry did not recover');
  await evaluate('sessionStorage.removeItem("recovered")');
  for (const mode of ['?crash&report-failure', '?crash&report-disabled']) {
    await load(mode);
    check(await evaluate('!!document.querySelector("[role=alert] button") && !document.getElementById("loading-screen")'), 'Diagnostic failure prevented recovery: ' + mode);
  }
  await load('?crash');
  await evaluate('window.finishStartupReport({status:"failed"})');
  await delay(100);
  check(await evaluate('!document.body.textContent.includes("pending-event") && !!document.querySelector("button")'), 'Failed delivery produced a false receipt');
  console.log('PASS: legacy UUID startup, provider crash, verified receipt, retry, reporting disabled/failed');

  // Exercise the real production entry point with native randomUUID removed before imports.
  const product = new BrowserWindow({ show: false, width: 390, height: 844,
    webPreferences: { preload: path.join(__dirname, 'legacy-preload.cjs'), sandbox: false,
      contextIsolation: false, backgroundThrottling: false, offscreen: true } });
  win.destroy();
  product.webContents.session.webRequest.onBeforeRequest({ urls: ['https://*.ingest.sentry.io/*', 'https://*.ingest.us.sentry.io/*', 'https://*.ingest.de.sentry.io/*'] }, (_details, callback) => callback({ cancel: true }));
  await product.loadURL(pathToFileURL(${JSON.stringify(path.resolve('dist/index.html'))}).href);
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    ready = await product.webContents.executeJavaScript('window.__legacyAppReady === true');
    if (ready) break;
    await delay(100);
  }
  check(await product.webContents.executeJavaScript('window.__legacyUUIDRemoved === true && typeof crypto.randomUUID === "function"'), 'Production entry failed to install UUID compatibility');
  check(ready, 'Production app did not finish startup');
  console.log('PASS: full production app reached app-ready without native randomUUID');
  await writeFile(path.join(__dirname, 'passed.json'), JSON.stringify({ passed: true }));
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
const timeout = setTimeout(() => { child.kill(); process.exitCode = 1; }, 60_000);
child.on('exit', async (code) => {
  clearTimeout(timeout);
  try {
    await access(path.join(directory, 'passed.json'));
    process.exitCode = code ?? 1;
  } catch {
    process.exitCode = 1;
  }
});
child.on('error', (error) => { clearTimeout(timeout); console.error(error); process.exitCode = 1; });
