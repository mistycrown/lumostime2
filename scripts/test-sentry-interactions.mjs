/**
 * @file test-sentry-interactions.mjs
 * @input Real React retry/back hooks with isolated native/navigation adapters
 * @output Hidden Chromium interaction checks for Dream retry and review back navigation
 * @pos Renderer regression runner
 * @updated 2026-10-27: Exercises Sentry-reported callbacks through actual React renders and button clicks.
 */
import { build } from 'esbuild';
import { access, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-sentry-interactions-'));
const mocks = {
  '@capacitor/app': `export const App = {
    addListener: async (_event, handler) => { window.nativeBack = handler; return { remove() {} }; },
    exitApp: () => { window.events.push(['exit']); }
  };`,
  NavigationContext: 'export const useNavigation = () => window.navigation;',
  AIChatWindowContext: 'export const useAIChatWindow = () => ({ isAIChatOpen: false, handleAIChatBack: () => false });',
  dreamService: 'export const dreamService = {};'
};
await build({
  stdin: {
    contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { flushSync } from 'react-dom';
      import { useAIBackfillChatRetry } from './src/components/ai-chat/useAIBackfillChatRetry';
      import { useHardwareBackButton } from './src/hooks/useHardwareBackButton';
      const root = createRoot(document.getElementById('root'));
      let sequence = 0;
      const Probe = ({ options, message }) => {
        useHardwareBackButton();
        const retry = useAIBackfillChatRetry(options);
        return <><button id="retry" onClick={() => retry(message)}>Retry</button>
          <button id="back" onClick={() => window.nativeBack()}>Back</button></>;
      };
      window.mountScenario = (scenario) => {
        window.events = [];
        const calls = window.events;
        window.navigation = { isSettingsOpen: true, settingsSubmenu: 'main',
          isWeeklyReviewOpen: scenario === 'weekly', isMonthlyReviewOpen: scenario === 'monthly' };
        for (const name of ['setIsWeeklyReviewOpen', 'setCurrentWeeklyReviewStart', 'setCurrentWeeklyReviewEnd',
          'setCurrentWeeklyReviewInitialTab', 'setIsMonthlyReviewOpen', 'setCurrentMonthlyReviewStart',
          'setCurrentMonthlyReviewEnd', 'setCurrentMonthlyReviewInitialTab', 'setIsSettingsOpen']) {
          window.navigation[name] = value => calls.push([name, value]);
        }
        const options = {
          activeSession: { id: 'session' }, isLoading: scenario === 'loading',
          retryingMessageIdRef: { current: null },
          getLocalDateStr: date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-'),
          resetAssistantPartRevealState: id => calls.push(['reset', id]),
          resolveRetrySourceUserMessageId: () => 'user-message',
          handleDreamCommand: (...args) => calls.push(['dream', ...args]),
          handleSend: (...args) => calls.push(['send', ...args]),
          addToast: (...args) => calls.push(['toast', ...args])
        };
        window.retryLock = options.retryingMessageIdRef;
        const message = { id: 'assistant-message', role: 'assistant',
          retryInput: scenario === 'ordinary' ? 'repeat this' : 'dream',
          dreamRetryYearMonth: scenario === 'invalid' ? '202613' : '202610' };
        // Deliberately omit a parser option, matching the real modal coordinator.
        flushSync(() => root.render(<Probe key={++sequence} options={options} message={message} />));
      };
      window.mountScenario('dream');`,
    resolveDir: process.cwd(),
    loader: 'tsx'
  },
  bundle: true,
  platform: 'browser',
  format: 'iife',
  outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' },
  plugins: [{
    name: 'isolated-native-hooks',
    setup(builder) {
      builder.onResolve({ filter: /.*/ }, (args) => {
        const key = Object.hasOwn(mocks, args.path) ? args.path : args.path.split('/').pop();
        if (Object.hasOwn(mocks, key)) return { path: key, namespace: 'hook-mock' };
      });
      builder.onLoad({ filter: /.*/, namespace: 'hook-mock' }, (args) => ({ contents: mocks[args.path], loader: 'js' }));
    }
  }]
});
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><meta charset="utf-8"><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const { writeFile } = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
const delay = () => new Promise(resolve => setTimeout(resolve, 100));
const check = (value, message) => { if (!value) throw new Error(message); };
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { backgroundThrottling: false, offscreen: true } });
  const errors = [];
  win.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
  const evaluate = code => win.webContents.executeJavaScript(code, true);
  await win.loadFile(path.join(__dirname, 'index.html'));
  await delay();
  await evaluate('document.getElementById("retry").click()');
  await delay();
  let events = await evaluate('window.events');
  const dream = events.find(event => event[0] === 'dream');
  check(dream && dream[2].yearMonth === '202610' && dream[2].startDate === '2026-10-01' && dream[2].endDate === '2026-10-31', 'Dream retry lost the selected month');
  check(dream[4].replaceMessageId === 'assistant-message' && dream[4].retrySourceUserMessageId === 'user-message', 'Dream retry lost original message identity');
  check(events.filter(event => event[0] === 'dream').length === 1, 'Dream retry sent twice');
  check(await evaluate('window.retryLock.current === null'), 'Retry lock was not released');
  await evaluate('window.mountScenario("ordinary"); document.getElementById("retry").click()');
  await delay();
  events = await evaluate('window.events');
  check(events.some(event => event[0] === 'send' && event[1] === 'repeat this') && !events.some(event => event[0] === 'dream'), 'Ordinary retry changed behavior');
  await evaluate('window.mountScenario("invalid"); document.getElementById("retry").click()');
  await delay();
  events = await evaluate('window.events');
  check(events.some(event => event[0] === 'toast') && !events.some(event => event[0] === 'dream'), 'Invalid Dream month was sent');
  check(await evaluate('window.retryLock.current === null'), 'Invalid month left retry locked');
  await evaluate('window.mountScenario("loading"); document.getElementById("retry").click()');
  await delay();
  check((await evaluate('window.events')).length === 0, 'Retry sent while loading');
  for (const period of ['weekly', 'monthly']) {
    await evaluate('window.mountScenario(' + JSON.stringify(period) + ')');
    await delay();
    await evaluate('document.getElementById("back").click()');
    events = await evaluate('window.events');
    const capitalized = period[0].toUpperCase() + period.slice(1);
    check(JSON.stringify(events) === JSON.stringify([
      ['setIs' + capitalized + 'ReviewOpen', false],
      ['setCurrent' + capitalized + 'ReviewStart', null],
      ['setCurrent' + capitalized + 'ReviewEnd', null],
      ['setCurrent' + capitalized + 'ReviewInitialTab', null]
    ]), period + ' back failed to clear the period or closed underlying Settings');
  }
  check(errors.length === 0, 'Renderer errors: ' + errors.join('; '));
  console.log('PASS: Dream retry, selected month, message identity, ordinary retry, invalid month, loading guard, weekly/monthly native back');
  await writeFile(path.join(__dirname, 'passed.json'), JSON.stringify({ passed: true }));
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
const timeout = setTimeout(() => { child.kill(); process.exitCode = 1; }, 30_000);
child.on('exit', async (code) => {
  clearTimeout(timeout);
  try { await access(path.join(directory, 'passed.json')); process.exitCode = code ?? 1; }
  catch { process.exitCode = 1; }
});
child.on('error', (error) => { clearTimeout(timeout); console.error(error); process.exitCode = 1; });
