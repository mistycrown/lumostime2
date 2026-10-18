/**
 * @file test-app-awareness.mjs
 * @input App-awareness renderer harness and built product stylesheet
 * @output Hidden Chromium interaction checks and light/dark screenshots with verified Chinese font
 * @pos Verification launcher; Android APIs and unrelated startup services are simulated
 * @updated 2026-10-18: Verifies master switch lifecycle using real React settings and runtime hooks.
 */
import { build } from 'esbuild';
import { copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-awareness-'));
const mocks = {
  '@capacitor/core': `export * from ${JSON.stringify(path.resolve('node_modules/@capacitor/core/dist/index.js').replaceAll('\\', '/'))}; export const Capacitor = { getPlatform: () => "android", isNativePlatform: () => true };`,
  '@capacitor/app': 'export const App = { addListener: async () => ({ remove() {} }) };',
  '@capawesome/capacitor-android-edge-to-edge-support': 'export const EdgeToEdge = { enable: async () => {}, getInsets: async () => ({ top: 0, bottom: 0 }) };',
  AppUsagePlugin: `export default {
    getAppRules: async () => ({ rules: {} }), syncAppAwarenessBindings: async () => {}, syncAppAwarenessTemplates: async () => {},
    checkAccessibilityPermission: async () => ({ granted: true }), getInstalledApps: async () => ({ apps: [] }),
    consumePendingAppAwarenessStart: async () => ({ hasPending: false }), consumePendingAppAwarenessFinish: async () => ({ hasPending: false }),
    cancelAppAwarenessWorkflow: async () => {}, showAppAwarenessOverlay: async () => {}, hideAppAwarenessOverlay: async () => {}
  };`,
  FocusNotificationPlugin: 'export default { checkFloatingPermission: async () => ({ granted: true }), setSideBubbleEnabled: async () => {} };',
  ToastContext: 'const addToast = () => {}; export const useToast = () => ({ addToast });',
  CategoryScopeContext: 'const categories = []; export const useCategoryScope = () => ({ categories });',
  SessionContext: 'const activeSessions = [{ id: "session" }]; const setActiveSessions = () => {}; export const useSession = () => ({ activeSessions, setActiveSessions });',
  DataContext: 'export const useData = () => ({ logs: [], setLogs() {} });',
  updateService: 'export const UpdateService = { checkNeedsUpdate: async () => false };',
  backgroundService: 'export const backgroundService = { init() {} };',
  fontService: 'export const fontService = { setFont() {}, initializeFont: async () => {} };',
  uiIconService: 'export const uiIconService = { setTheme() {} };',
  colorSchemeService: 'export const colorSchemeService = { setScheme() {} };',
  dataRepairService: 'export const dataRepairService = { repairAll: async () => ({ success: true, repairedCount: 0 }) };',
  dualIconMigrationService: 'export const dualIconMigrationService = { migrateAll: async () => ({ success: true }) };',
  resetDataTool: 'export const initResetDataTool = () => {};',
  appearanceBackupService: 'export const APPEARANCE_RESTORED_EVENT = "test:appearance";',
  ...Object.fromEntries(['TagAssociation', 'ScopeAssociation', 'TodoAssociation'].map((name) => [name, `export const ${name} = () => null;`]))
};
await build({
  entryPoints: ['src/views/__tests__/appAwarenessHarness.tsx'], bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '{}' },
  plugins: [{ name: 'android-awareness-simulation', setup(builder) {
    builder.onResolve({ filter: /.*/ }, (args) => {
      if (path.isAbsolute(args.path)) return { path: args.path, namespace: 'file' };
      const key = Object.hasOwn(mocks, args.path) ? args.path : args.path.split('/').pop();
      return Object.hasOwn(mocks, key) ? { path: key, namespace: 'awareness-test' } : undefined;
    });
    builder.onLoad({ filter: /.*/, namespace: 'awareness-test' }, (args) => ({ contents: mocks[args.path], loader: 'js', resolveDir: process.cwd() }));
  } }]
});
const stylesheet = (await readdir('dist/assets')).find((name) => name.startsWith('index-') && name.endsWith('.css'));
if (!stylesheet) throw new Error('Run npm run build first');
await copyFile(path.join('dist/assets', stylesheet), path.join(directory, 'app.css'));
await copyFile('C:/Windows/Fonts/msyh.ttc', path.join(directory, 'chinese.ttc'));
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><meta charset="utf-8"><link rel="stylesheet" href="app.css"><style>@font-face{font-family:VerifiedChinese;src:url(chinese.ttc)}:root{--app-safe-area-top:0px;--font-family:VerifiedChinese}body{font-family:VerifiedChinese,"Microsoft YaHei",sans-serif}</style><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 390, height: 844, webPreferences: { backgroundThrottling: false, offscreen: true } });
  const errors = [];
  win.webContents.on('console-message', (event) => { if (event.level === 'error') errors.push(event.message); });
  await win.loadFile(path.join(__dirname, 'index.html'));
  for (let i = 0; i < 150; i++) {
    const result = await win.webContents.executeJavaScript('window.__awarenessResult');
    if (result) {
      for (const mode of ['light', 'dark']) {
        await win.webContents.executeJavaScript('document.documentElement.setAttribute("data-theme-mode", "' + mode + '"); document.documentElement.setAttribute("data-custom-appearance-enabled", "' + (mode !== 'dark') + '"); document.fonts.ready');
        await new Promise(resolve => setTimeout(resolve, 250));
        const file = path.join(__dirname, mode + '.png');
        await fs.writeFile(file, (await win.webContents.capturePage()).toPNG());
        console.log('SCREENSHOT=' + file);
      }
      console.log(JSON.stringify({ ...result, rendererErrors: errors }));
      app.exit(result.error || errors.length ? 1 : 0); return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('App-awareness renderer timeout');
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
