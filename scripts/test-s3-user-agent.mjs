/**
 * @file test-s3-user-agent.mjs
 * @input Real settings view, S3 SDK, Electron preload/main bridge and a local HTTP fixture
 * @output Header/binary/error/UI persistence smoke checks and a mobile screenshot in a temporary directory
 * @updated 2026-10-30: Exercises the full custom User-Agent path without cloud credentials or user profiles.
 * @updated 2026-10-30: Rejects requests missing any header included in the SDK signature.
 */
import { build } from 'esbuild';
import { mkdtemp, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-s3-user-agent-'));
const sourcePath = (file) => JSON.stringify(path.join(root, file));
await build({
  stdin: { contents: `
    import React, { useState } from 'react';
    import { createRoot } from 'react-dom/client';
    import { S3SyncSettingsView } from ${sourcePath('src/views/settings/S3SyncSettingsView.tsx')};
    import { compatibleS3Service } from ${sourcePath('src/services/compatibleS3Service.ts')};
    window.__s3Harness = { service: compatibleS3Service, toasts: [] };
    function Harness() {
      const [config, setConfig] = useState(compatibleS3Service.getConfig());
      return <S3SyncSettingsView onBack={() => {}} onToast={(type, message) => window.__s3Harness.toasts.push({type, message})}
        s3Config={null} setS3Config={() => {}} compatibleS3Config={config} setCompatibleS3Config={setConfig}
        onS3SyncUpload={async () => {}} onS3SyncDownload={async () => {}}
        onCompatibleS3SyncUpload={async () => {}} onCompatibleS3SyncDownload={async () => {}} />;
    }
    createRoot(document.getElementById('root')).render(<Harness />);
  `, loader: 'tsx', resolveDir: root },
  bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'renderer.js'),
  define: { 'process.env.NODE_ENV': '"production"' }
});
await build({ entryPoints: [path.join(root, 'electron/preload.ts')], bundle: true, platform: 'node', format: 'cjs', external: ['electron'], outfile: path.join(directory, 'preload.cjs') });
const css = (await readdir(path.join(root, 'dist/assets'))).find((name) => name.startsWith('index-') && name.endsWith('.css'));
await writeFile(path.join(directory, 'index.html'), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><link rel="stylesheet" href="${path.join(root, 'dist/assets', css).replaceAll('\\', '/')}"><style>body{font-family:'Microsoft YaHei',sans-serif}</style><body><div id="root"></div><script src="renderer.js"></script></body></html>`, 'utf8');

await build({
  stdin: { contents: `
    import { app, BrowserWindow } from 'electron';
    import http from 'node:http';
    import { createHash, createHmac } from 'node:crypto';
    import path from 'node:path';
    import { pathToFileURL } from 'node:url';
    import { writeFile } from 'node:fs/promises';
    import { registerCompatibleS3Request, sendCompatibleS3Request } from ${sourcePath('electron/compatibleS3Request.ts')};
    const directory = ${JSON.stringify(directory)};
    app.setPath('userData', path.join(directory, 'profile'));
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const check = (value, message) => { if (!value) throw new Error(message); };
    const objects = new Map();
    const seen = [];
    const hash = value => createHash('sha256').update(value).digest('hex');
    const hmac = (key, value) => createHmac('sha256', key).update(value).digest();
    const escape = value => encodeURIComponent(value).replace(/[!'()*]/g, char => '%' + char.charCodeAt(0).toString(16).toUpperCase());
    const verifySignature = (req, body, names) => {
      const auth = req.headers.authorization || '';
      const scope = /Credential=([^, ]+)/.exec(auth)?.[1].split('/');
      if (!scope || scope[0] !== 'test-key') return false;
      const url = new URL(req.url, 'http://localhost');
      const query = Array.from(url.searchParams, ([key, value]) => [escape(key), escape(value)]).sort((a,b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0).map(([key,value])=>key+'='+value).join('&');
      const canonicalHeaders = names.map(name => name + ':' + String(req.headers[name]).trim().replace(/\\s+/g, ' ') + '\\n').join('');
      const payloadHash = req.headers['x-amz-content-sha256'] || hash(body);
      if (payloadHash !== 'UNSIGNED-PAYLOAD' && payloadHash !== hash(body)) return false;
      const canonical = [req.method, url.pathname, query, canonicalHeaders, names.join(';'), payloadHash].join('\\n');
      const scopeText = scope.slice(1).join('/');
      const toSign = ['AWS4-HMAC-SHA256', req.headers['x-amz-date'], scopeText, hash(canonical)].join('\\n');
      let key = 'AWS4test-secret';
      for (const part of scope.slice(1)) key = hmac(key, part);
      return createHmac('sha256', key).update(toSign).digest('hex') === /Signature=([a-f0-9]+)/.exec(auth)?.[1];
    };
    const server = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        const body = Buffer.concat(chunks);
        seen.push({ method: req.method, url: req.url, headers: req.headers, body });
        const signedHeaders = /SignedHeaders=([^, ]+)/.exec(req.headers.authorization || '')?.[1].split(';') || [];
        const missingHeaders = signedHeaders.filter(name => req.headers[name] === undefined);
        if (missingHeaders.length) {
          console.error('MISSING_SIGNED_HEADERS=' + missingHeaders.join(','));
          res.writeHead(401, { 'Content-Type': 'application/xml' });
          res.end('<Error><Code>SignatureDoesNotMatch</Code><Message>Signed headers missing</Message></Error>');
          return;
        }
        if (signedHeaders.length && !verifySignature(req, body, signedHeaders)) {
          console.error('INVALID_SIGV4=' + req.method + ' ' + req.url);
          res.writeHead(401, { 'Content-Type': 'application/xml' });
          res.end('<Error><Code>SignatureDoesNotMatch</Code><Message>Invalid canonical request or signature</Message></Error>');
          return;
        }
        if (req.headers['user-agent'] !== 'S3Drive') {
          res.writeHead(401, { 'Content-Type': 'application/xml' });
          res.end('<Error><Code>Unauthorized</Code><Message>Client rejected</Message></Error>');
          return;
        }
        const key = new URL(req.url, 'http://localhost').pathname;
        if (req.method === 'PUT') objects.set(key, body);
        if (req.headers['if-none-match'] === '"v1"') { res.writeHead(304); res.end(); return; }
        res.writeHead(200, { ETag: '"v1"', 'Content-Type': key.endsWith('.json') ? 'application/json' : 'application/octet-stream' });
        res.end(req.method === 'GET' ? (objects.get(key) || Buffer.from('{}')) : undefined);
      });
    });
    let window;
    app.whenReady().then(async () => {
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      const endpoint = 'http://127.0.0.1:' + server.address().port;
      window = new BrowserWindow({ show: false, width: 420, height: 960, webPreferences: { preload: path.join(directory, 'preload.cjs'), contextIsolation: true, sandbox: true } });
      const rendererUrl = pathToFileURL(path.join(directory, 'index.html')).href;
      registerCompatibleS3Request(() => window, rendererUrl);
      await window.loadFile(path.join(directory, 'index.html'));
      const evaluate = code => window.webContents.executeJavaScript(code);
      const click = async text => { await evaluate('Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === ' + JSON.stringify(text) + ').click()'); await wait(80); };
      const setInput = async (label, value) => {
        await evaluate('(() => { const input = Array.from(document.querySelectorAll("label")).find(l => l.textContent.trim() === ' + JSON.stringify(label) + ').querySelector("input"); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ' + JSON.stringify(value) + '); input.dispatchEvent(new Event("input", {bubbles: true})); })()');
        await wait(50);
      };
      const identityValue = () => evaluate('Array.from(document.querySelectorAll("label")).find(l => l.textContent.includes("User-Agent")).querySelector("input").value');
      await wait(150);
      await click('兼容 S3');
      check(await identityValue() === '', 'Identity must default to empty');
      await setInput('Endpoint', 'https://s3.cstcloud.cn');
      check(await evaluate('document.querySelector("input[placeholder=S3Drive]")?.value === ""'), 'Data Capsule should hint without auto-fill');
      await setInput('User-Agent（可选）', 'S3Drive');
      await setInput('Endpoint', endpoint);
      check(await identityValue() === 'S3Drive', 'Changing endpoint overwrote identity');
      for (const [label, value] of [['Bucket', 'bucket'], ['Region', 'us-east-1'], ['Access Key ID', 'test-key'], ['Secret Access Key', 'test-secret']]) await setInput(label, value);
      await window.reload();
      await wait(300);
      await click('兼容 S3');
      check(await identityValue() === 'S3Drive', 'Draft did not survive reload');
      const beforeInvalid = seen.length;
      await setInput('User-Agent（可选）', 'bad' + String.fromCharCode(0) + 'value');
      await click('保存并连接');
      check(seen.length === beforeInvalid, 'Invalid identity sent a request');
      await setInput('User-Agent（可选）', ' S3Drive ');
      await click('保存并连接');
      for (let i=0; i<100; i++) { if (await evaluate('!!document.querySelector(".sync-connected-status")')) break; await wait(50); }
      check(await evaluate('!!document.querySelector(".sync-connected-status")'), 'Settings did not connect: ' + await evaluate('JSON.stringify(window.__s3Harness.toasts)'));
      check(seen.at(-1).headers['user-agent'] === 'S3Drive', 'Server did not receive the standard User-Agent');
      check(await evaluate('localStorage.getItem("lumos_compatible_s3_user_agent") === "S3Drive"'), 'Identity was not persisted/trimmed');
      const result = await evaluate('(async () => { const service = window.__s3Harness.service; const backup = {logs: [], timestamp: 2}; await service.uploadData(backup); const first = await service.downloadData("lumostime_backup.json", {conditional: true}); const second = await service.downloadData("lumostime_backup.json", {conditional: true}); await service.uploadImage("test.jpg", new Uint8Array([0,128,255]).buffer); const image = Array.from(new Uint8Array(await service.downloadImage("test.jpg"))); return {first, second, image}; })()');
      check(result.first.timestamp === 2 && result.second.timestamp === 2, 'Backup round trip or conditional GET failed');
      check(JSON.stringify(result.image) === '[0,128,255]', 'Binary image bytes changed');
      check(seen.filter(item => item.method === 'PUT').every(item => item.headers.authorization?.startsWith('AWS4-HMAC-SHA256')), 'Signed upload header missing');
      check(seen.some(item => item.headers['if-none-match'] === '"v1"'), 'Conditional request header missing');
      await evaluate('window.__s3Harness.service.saveConfig({...window.__s3Harness.service.getConfig(), userAgent: "OtherApp"})');
      const denied = await evaluate('window.__s3Harness.service.checkConnection()');
      check(!denied.success && denied.message.includes('HTTP 401') && denied.message.includes('User-Agent'), '401 lost actionable diagnostics');
      await evaluate('window.__s3Harness.service.saveConfig({...window.__s3Harness.service.getConfig(), userAgent: "S3Drive"})');
      await window.reload();
      await wait(300);
      await click('兼容 S3');
      await click('断开连接');
      check(await identityValue() === 'S3Drive', 'Saved identity missing after restart/disconnect');
      await evaluate('Array.from(document.querySelectorAll("label")).find(l=>l.textContent.includes("User-Agent")).scrollIntoView({block:"center"})');
      await wait(200);
      await window.webContents.capturePage();
      await wait(200);
      const screenshot = path.join(directory, 's3-user-agent-mobile.png');
      await writeFile(screenshot, (await window.webContents.capturePage()).toPNG());
      const plain = await sendCompatibleS3Request({ url: endpoint + '/bucket', method: 'HEAD', headers: {}, userAgent: '' });
      check(plain.status === 401 && seen.at(-1).headers['user-agent'] !== 'S3Drive', 'Identity leaked to unrelated requests');
      const ui = await evaluate('({width: innerWidth, scrollWidth: document.documentElement.scrollWidth})');
      check(ui.scrollWidth <= ui.width, 'Mobile layout overflows horizontally');
      console.log('S3_USER_AGENT_SMOKE=passed: real Electron UA, full SigV4 verification, signed upload/download, binary images, conditional GET, 401, draft/save/reload and mobile layout');
      console.log('SCREENSHOT=' + screenshot);
      server.close(); window.destroy(); app.exit(0);
    }).catch(error => { console.error(error); server.close(); window?.destroy(); app.exit(1); });
  `, resolveDir: root },
  bundle: true, platform: 'node', format: 'cjs', external: ['electron'], outfile: path.join(directory, 'main.cjs')
});
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
const timeout = setTimeout(() => { child.kill(); process.exitCode = 1; }, 90_000);
child.on('exit', (code) => { clearTimeout(timeout); process.exitCode = code ?? 1; });
child.on('error', (error) => { clearTimeout(timeout); console.error(error); process.exitCode = 1; });
