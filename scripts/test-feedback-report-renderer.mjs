/**
 * @file test-feedback-report-renderer.mjs
 * @input Real feedback dialog component and built application CSS
 * @output Isolated Electron UI smoke checks and screenshots in a temporary folder
 * @pos Test Runner
 * @updated 2026-10-05: Exercises persistence, clipboard copying, failed copying and dismissal.
 */
import { build } from 'esbuild';
import { copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-feedback-report-'));
await build({
  stdin: {
    contents: `import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { flushSync } from 'react-dom';
      import { FeedbackReportModal } from './src/components/FeedbackReportModal';
      import { runRegisteredHardwareBackHandler } from './src/utils/hardwareBackHandlerStack';
      const root = createRoot(document.getElementById('root'));
      window.mountReceipt = (userId = 'lumos001') => flushSync(() => root.render(
        <FeedbackReportModal key={userId} eventId="1234567890abcdef1234567890abcdef" userId={userId}
          onClose={() => root.render(null)} />));
      window.hardwareBack = runRegisteredHardwareBackHandler;
      window.mountReceipt();`,
    resolveDir: process.cwd(), loader: 'tsx'
  },
  bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"' }
});
const css = (await readdir('dist/assets')).find((name) => name.endsWith('.css'));
if (!css) throw new Error('Run npm run build before the renderer smoke test');
await copyFile(path.join('dist/assets', css), path.join(directory, 'test.css'));
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="test.css"></head><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow, clipboard } = require('electron');
const { writeFile } = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = (condition, message) => { if (!condition) throw new Error(message); };
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 390, height: 844,
    webPreferences: { contextIsolation: true, backgroundThrottling: false, offscreen: true } });
  const evaluate = code => window.webContents.executeJavaScript(code, true);
  await window.loadFile(path.join(__dirname, 'index.html'));
  await delay(3500);
  check(await evaluate('!!document.querySelector("[role=dialog]")'), 'Receipt auto-dismissed');
  check(await evaluate('document.activeElement.getAttribute("role") === "dialog"'), 'Missing initial dialog focus');
  check(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Mobile overflow');
  await evaluate('Array.from(document.querySelectorAll("button")).find(b => b.getAttribute("aria-label") === "复制反馈 ID").click()');
  await delay(150);
  check(clipboard.readText() === '1234567890abcdef1234567890abcdef', 'Feedback ID copy mismatch');
  await evaluate('Array.from(document.querySelectorAll("button")).find(b => b.getAttribute("aria-label") === "复制用户编号").click()');
  await delay(150);
  check(clipboard.readText() === 'lumos001', 'User ID copy mismatch');
  await evaluate('Array.from(document.querySelectorAll("button")).find(b => b.textContent === "复制反馈信息").click()');
  await delay(150);
  check(clipboard.readText().split(String.fromCharCode(13)).join('') === '反馈 ID：1234567890abcdef1234567890abcdef\\n用户编号：lumos001', 'Combined copy mismatch');
  check(await evaluate('!!document.querySelector("[role=dialog]")'), 'Copy dismissed receipt');
  const screenshot = path.join(__dirname, 'feedback-mobile.png');
  await writeFile(screenshot, (await window.webContents.capturePage()).toPNG());
  console.log('MOBILE_SCREENSHOT=' + screenshot);
  await evaluate('document.querySelector("[role=dialog]").dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true}))');
  await delay(100);
  check(await evaluate('!document.querySelector("[role=dialog]")'), 'Escape did not close');
  await evaluate('window.mountReceipt("1234567890123456")');
  await delay(100);
  await evaluate('Object.defineProperty(navigator, "clipboard", {value: {writeText: () => Promise.reject(new Error("denied"))}, configurable: true}); document.execCommand = () => false; Array.from(document.querySelectorAll("button")).find(b => b.getAttribute("aria-label") === "复制用户编号").click()');
  await delay(150);
  check(await evaluate('!!document.querySelector("[role=alert]") && !!document.querySelector("[role=dialog]")'), 'Copy failure did not retain receipt');
  check(await evaluate('window.hardwareBack()'), 'Hardware back did not consume overlay');
  await delay(100);
  check(await evaluate('!document.querySelector("[role=dialog]")'), 'Hardware back did not close');
  await evaluate('window.mountReceipt()');
  await delay(100);
  await evaluate('Array.from(document.querySelectorAll("button")).find(b => b.textContent === "关闭").click()');
  await delay(100);
  check(await evaluate('!document.querySelector("[role=dialog]")'), 'Close did not dismiss');
  console.log('Feedback renderer: persistence, mobile layout, clipboard, failure, Escape, back and close passed');
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
