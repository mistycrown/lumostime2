/**
 * @file test-feedback-report-renderer.mjs
 * @input Real feedback dialog component and built application CSS
 * @output Isolated Electron UI smoke checks and screenshots in a temporary folder
 * @pos Test Runner
 * @updated 2026-10-25: Covers automatic report delivery, retry, queued errors and verified Chinese rendering.
 */
import { build } from 'esbuild';
import { access, copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-feedback-report-'));
// Verify the installed Chinese font before generating any screenshot assets.
await access('C:/Windows/Fonts/msyh.ttc');
await build({
  stdin: {
    contents: `import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { flushSync } from 'react-dom';
      import { FeedbackReportModal } from './src/components/FeedbackReportModal';
      import { ToastProvider, useToast } from './src/contexts/ToastContext';
      import { runRegisteredHardwareBackHandler } from './src/utils/hardwareBackHandlerStack';
      const root = createRoot(document.getElementById('root'));
      window.mountReceipt = (userId = 'lumos001') => flushSync(() => root.render(
        <FeedbackReportModal key={userId} eventId="1234567890abcdef1234567890abcdef" userId={userId}
          onClose={() => root.render(null)} />));
      window.hardwareBack = runRegisteredHardwareBackHandler;
      const ErrorTrigger = () => {
        const { addToast } = useToast();
        React.useEffect(() => {
          window.showReportedError = (id = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa') => addToast('error', 'Import failed: invalid JSON\\n错误编号：' + id);
        }, [addToast]);
        return null;
      };
      window.mountErrors = () => flushSync(() => root.render(<ToastProvider><ErrorTrigger /></ToastProvider>));
      window.mountReceipt();`,
    resolveDir: process.cwd(), loader: 'tsx'
  },
  bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{
    name: 'isolated-report-delivery',
    setup(plugin) {
      plugin.onLoad({ filter: /[\\/]services[\\/]errorReporting\.ts$/ }, () => ({
        contents: `
          window.reportRequests = [];
          export const getErrorReportUserId = () => 'lumos001';
          const pending = (kind) => {
            window.reportRequests.push(kind);
            return new Promise(resolve => { window.completeReport = resolve; });
          };
          export const waitForErrorReport = () => pending('initial');
          export const retryErrorReport = () => pending('retry');`,
        loader: 'js'
      }));
    }
  }]
});
const css = (await readdir('dist/assets')).find((name) => /^index-.*\.css$/.test(name));
if (!css) throw new Error('Run npm run build before the renderer smoke test');
await copyFile(path.join('dist/assets', css), path.join(directory, 'test.css'));
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="test.css"><style>@font-face{font-family:ReceiptChinese;src:local("Microsoft YaHei")}body,.font-serif{font-family:ReceiptChinese,serif}</style></head><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
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
  check(await evaluate('document.fonts.load("16px ReceiptChinese", "错误日志用户编号复制").then(fonts => fonts.length > 0)'), 'Verified Chinese font did not load');
  await delay(3500);
  check(await evaluate('!!document.querySelector("[role=dialog]")'), 'Receipt auto-dismissed');
  check(await evaluate('document.activeElement.getAttribute("role") === "dialog"'), 'Missing initial dialog focus');
  check(await evaluate('getComputedStyle(document.querySelector("[role=dialog]")).borderRadius !== "0px"'), 'Main application stylesheet is missing');
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
  await evaluate('window.originalClipboard = navigator.clipboard; window.originalExecCommand = document.execCommand; Object.defineProperty(navigator, "clipboard", {value: {writeText: () => Promise.reject(new Error("denied"))}, configurable: true}); document.execCommand = () => false; Array.from(document.querySelectorAll("button")).find(b => b.getAttribute("aria-label") === "复制用户编号").click()');
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
  // Restore clipboard behavior after the deliberate failure scenario.
  await evaluate('Object.defineProperty(navigator, "clipboard", {value: window.originalClipboard, configurable: true}); document.execCommand = window.originalExecCommand; window.mountErrors()');
  await delay(100);
  await evaluate('window.showReportedError()');
  await delay(100);
  check(await evaluate('document.querySelector("[role=dialog]").textContent.includes("错误报告发送中")'), 'Missing pending automatic receipt');
  check(await evaluate('!document.body.textContent.includes("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")'), 'Undelivered ID was displayed');
  check(await evaluate('document.body.textContent.includes("lumos001") && document.body.textContent.includes("Import failed: invalid JSON")'), 'Missing error or identity');
  await evaluate('window.showReportedError()');
  await delay(100);
  check(await evaluate('window.reportRequests.length === 1'), 'Duplicate receipt started another upload');
  await evaluate('window.completeReport({status:"sent", eventId:"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", userId:"lumos001"})');
  await delay(100);
  check(await evaluate('document.body.textContent.includes("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")'), 'Delivered ID was hidden');
  await evaluate('Array.from(document.querySelectorAll("button")).find(b => b.textContent === "复制反馈信息").click()');
  await delay(150);
  check(clipboard.readText().includes('错误信息：Import failed: invalid JSON') && clipboard.readText().includes('用户编号：lumos001'), 'Automatic combined copy mismatch: ' + JSON.stringify(clipboard.readText()));
  await delay(3100);
  check(await evaluate('!!document.querySelector("[role=dialog]")'), 'Automatic receipt auto-dismissed');
  const automaticScreenshot = path.join(__dirname, 'automatic-error-mobile.png');
  await writeFile(automaticScreenshot, (await window.webContents.capturePage()).toPNG());
  console.log('AUTOMATIC_SCREENSHOT=' + automaticScreenshot);
  await evaluate('window.showReportedError("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"); window.hardwareBack()');
  await delay(100);
  check(await evaluate('document.querySelectorAll("[role=dialog]").length === 1 && document.body.textContent.includes("错误报告发送中")'), 'Queued receipt was lost');
  await evaluate('window.completeReport({status:"failed"})');
  await delay(100);
  check(await evaluate('document.body.textContent.includes("错误报告发送失败") && !document.body.textContent.includes("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")'), 'Failed upload displayed a receipt ID');
  await evaluate('Array.from(document.querySelectorAll("button")).find(b => b.textContent === "重新上传").click()');
  await delay(100);
  check(await evaluate('window.reportRequests.at(-1) === "retry" && document.body.textContent.includes("错误报告发送中")'), 'Retry did not start');
  await evaluate('window.completeReport({status:"sent", eventId:"cccccccccccccccccccccccccccccccc", userId:"lumos010"})');
  await delay(100);
  check(await evaluate('document.body.textContent.includes("cccccccccccccccccccccccccccccccc") && document.body.textContent.includes("lumos010")'), 'Retry receipt did not update both IDs');
  check(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Automatic receipt overflows mobile layout');
  console.log('Feedback renderer: persistence, mobile layout, clipboard, failure, Escape, back and close passed');
  console.log('Automatic reports: pending/sent/failed, retry, identity, copying, duplicate suppression and queue passed');
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
