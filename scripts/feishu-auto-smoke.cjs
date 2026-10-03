/**
 * @file feishu-auto-smoke.cjs
 * @input Built-in Electron Chromium, Vite and the UTF-8 renderer fixture.
 * @output First-install/UI/IndexedDB/lifecycle smoke checks and optional captured settings screenshot.
 * @pos Isolated verification; all API responses are simulated and all windows remain hidden.
 */
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'lumos-feishu-auto-smoke-')));
app.commandLine.appendSwitch('disable-gpu');
app.on('window-all-closed', () => {});
let server;
let window;
const references = new Map();
const calls = [];
let offline = false;
const waitFor = async (predicate, label, timeout = 20000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${label}`);
};
const evaluate = (code) => window.webContents.executeJavaScript(code, true);
app.whenReady().then(async () => {
  const { createServer } = await import('vite');
  const apiMiddleware = (request, response) => {
    const action = request.url.split('?')[0];
    response.setHeader('Content-Type', 'application/json');
    if (action === '/status') return response.end(JSON.stringify({ configured: true, status: 'connected',
      accountId: 'smoke-account', userName: '测试账号', calendarId: 'main', calendars: [{ id: 'main', name: '主日历' }], categoryCalendars: [] }));
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      response.setHeader('Content-Type', 'application/json');
      const input = body ? JSON.parse(body) : {};
      if (input.operation === 'catalog') return response.end(JSON.stringify({ records: [...references.values()] }));
      if (offline) { response.statusCode = 503; return response.end(JSON.stringify({ error: '网络暂不可用' })); }
      calls.push(input);
      const results = [];
      for (const record of input.records || []) {
        const existed = references.has(record.id);
        references.set(record.id, { id: record.id, startTime: record.startTime, categoryIds: [record.categoryId] });
        results.push({ id: record.id, status: existed ? 'updated' : 'created' });
      }
      for (const id of input.deleteIds || []) { references.delete(id); results.push({ id, status: 'deleted' }); }
      response.end(JSON.stringify({ results, calendars: [] }));
    });
  };
  const htmlMiddleware = async (request, response) => {
    const html = await server.transformIndexHtml('/__feishu-auto-smoke', '<html><head><meta charset="UTF-8"></head><body><div id="root"></div><script type="module" src="/scripts/feishu-auto-smoke.tsx"></script></body></html>');
    response.setHeader('Content-Type', 'text/html'); response.end(html);
  };
  server = await createServer({ configFile: false, root: process.cwd(), logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, hmr: false, watch: null }, esbuild: { jsx: 'automatic' },
    plugins: [{ name: 'feishu-smoke-fixtures', configureServer(vite) {
      vite.middlewares.use('/api/feishu', apiMiddleware);
      vite.middlewares.use('/__feishu-auto-smoke', htmlMiddleware);
    } }] });
  await server.listen();
  const address = server.httpServer.address();
  window = new BrowserWindow({ show: false, width: 430, height: 900,
    webPreferences: { partition: 'feishu-auto-smoke', backgroundThrottling: false, contextIsolation: true, sandbox: true } });
  const errors = [];
  window.webContents.on('console-message', (event) => {
    if (event.level === 'error') { errors.push(event.message); console.error('[renderer]', event.message); }
  });
  console.log('Smoke: loading isolated settings fixture');
  const fixtureUrl = `http://127.0.0.1:${address.port}/__feishu-auto-smoke`;
  await Promise.race([window.loadURL(`${fixtureUrl}?fresh=1`),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Smoke fixture load timed out')), 30000))]);
  console.log('Smoke: verifying first-install persistence');
  await waitFor(() => evaluate('Boolean(window.smoke?.ready)'), 'first-install readiness');
  await waitFor(() => evaluate('window.smoke.persisted().then(s => Array.isArray(s.logs) && Array.isArray(s.todos))'), 'missing datasets initialized');
  assert.equal(await evaluate('window.smoke.usesFallbackSeedData'), true, 'seed data must remain protected during the first launch');
  assert.equal(calls.length, 0, 'initializing a fresh install must not write to Feishu');
  await evaluate('window.smoke.prepareEmptyDataset()');
  await window.loadURL(fixtureUrl);
  console.log('Smoke: waiting for providers');
  await waitFor(() => evaluate('Boolean(window.smoke?.ready && document.querySelector("#feishu-auto-sync") && !document.querySelector("#feishu-auto-sync").disabled)'), 'settings readiness');
  assert.match(await evaluate('document.body.innerText'), /自动同步/);
  assert.equal(await evaluate('window.smoke.verifyAtomicRollback()'), true, 'failed IndexedDB batches must roll back all writes');
  await evaluate('document.querySelector("#feishu-auto-sync").click()');
  await waitFor(() => evaluate('document.querySelector("#feishu-auto-sync").checked'), 'enable');
  assert.equal(calls.length, 0, 'enabling must not upload old history');
  console.log('Smoke: enabled, testing CRUD outside settings');
  await evaluate('window.smoke.setShow(false); window.smoke.add("new-record", "首次记录")');
  await waitFor(() => references.has('new-record'), 'create outside settings');
  await evaluate('window.smoke.edit("new-record", "修改后")');
  await waitFor(() => calls.some((batch) => batch.records?.some((record) => record.title === '修改后')), 'update');
  await evaluate('window.smoke.remove("new-record")');
  await waitFor(() => !references.has('new-record'), 'delete');
  offline = true;
  console.log('Smoke: testing offline persistence and reload');
  await evaluate('window.smoke.add("offline-record", "离线记录")');
  await waitFor(() => evaluate('window.smoke.state().then(s => s.accounts[0].tasks.some(t => t.id === "offline-record" && t.attempts > 0))'), 'durable offline queue');
  offline = false;
  window.webContents.reload();
  await waitFor(() => evaluate('Boolean(window.smoke?.ready)'), 'reload');
  await waitFor(() => references.has('offline-record'), 'recovery after reload');
  await waitFor(() => evaluate('window.smoke.state().then(s => s.accounts[0].tasks.length === 0)'), 'acknowledgement');
  await waitFor(() => evaluate('Boolean(document.querySelector("#feishu-auto-sync")?.checked)'), 'persisted switch');
  if (process.env.FEISHU_SMOKE_SCREENSHOT) {
    assert.ok(fs.existsSync('C:\\Windows\\Fonts\\msyh.ttc'), 'verified Chinese font must exist');
    await evaluate('document.querySelector(".font-serif").style.fontFamily = "Microsoft YaHei"');
    fs.writeFileSync(process.env.FEISHU_SMOKE_SCREENSHOT, (await window.webContents.capturePage()).toPNG());
  }
  console.log('Smoke: testing disable and resume');
  await evaluate('document.querySelector("#feishu-auto-sync").click()');
  await waitFor(() => evaluate('!document.querySelector("#feishu-auto-sync").checked'), 'disable');
  const before = calls.length;
  await evaluate('window.smoke.add("paused-record", "暂停期间")');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  assert.equal(calls.length, before, 'disabled synchronization must not write');
  await waitFor(() => evaluate('!document.querySelector("#feishu-auto-sync").disabled'), 'reenable availability');
  await evaluate('document.querySelector("#feishu-auto-sync").click()');
  await waitFor(() => evaluate('document.querySelector("#feishu-auto-sync").checked'), 'reenabled switch');
  await waitFor(() => references.has('paused-record'), 'resume disabled queue');
  assert.deepEqual(errors.filter((message) => /Uncaught|TypeError|ReferenceError/.test(message)), []);
  console.log(JSON.stringify({ result: 'PASS', checks: ['first-install persistence', 'seed protection', 'settings switch', 'atomic IndexedDB rollback', 'create outside settings', 'edit', 'delete', 'IndexedDB offline queue', 'reload recovery', 'disable/resume'], batches: calls.length }));
}).catch(async (error) => {
  console.error(error);
  if (window && !window.isDestroyed()) {
    console.error('Smoke diagnostics:', await evaluate('({ ready: window.smoke?.ready, text: document.body.innerText.slice(0, 3000), visibility: document.visibilityState })').catch(() => 'renderer unavailable'));
  }
  process.exitCode = 1;
}).finally(async () => {
  window?.destroy(); await server?.close(); app.exit(process.exitCode || 0);
});
