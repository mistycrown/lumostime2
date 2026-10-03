/**
 * @file feishu-runtime.test.ts
 * @input A temporary service-only directory and disposable test credentials.
 * @output Real HTTP startup verification without node_modules or Feishu API calls.
 * @pos Deployment runtime smoke test; does not verify live user authorization.
 */
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { expect, it } from 'vitest';

it('starts from service files alone and preserves the pending cookie session', async () => {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  const cwd = mkdtempSync(join(tmpdir(), 'lumos-feishu-runtime-'));
  mkdirSync(join(cwd, 'scripts'));
  writeFileSync(join(cwd, 'package.json'), '{"type":"module"}', 'utf8');
  for (const script of ['run-feishu-server.mjs', 'feishu-server-env.mjs']) {
    cpSync(join(process.cwd(), 'scripts', script), join(cwd, 'scripts', script));
  }
  cpSync(join(process.cwd(), 'server/feishu'), join(cwd, 'server/feishu'), {
    recursive: true, filter: (path) => !path.endsWith('.test.ts')
  });
  const child = spawn(process.execPath, ['--experimental-sqlite', '--experimental-strip-types', 'scripts/run-feishu-server.mjs', '--production'], {
    cwd, windowsHide: true, stdio: 'ignore', env: {
      ...process.env, FEISHU_APP_ID: 'cli_runtime_fixture', FEISHU_APP_SECRET: 'test-only-secret',
      FEISHU_REDIRECT_URI: `http://127.0.0.1:${port}/api/feishu/callback`,
      FEISHU_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
      FEISHU_DATABASE_PATH: join(cwd, 'data/oauth.sqlite'), FEISHU_HOST: '127.0.0.1', FEISHU_PORT: String(port),
      FEISHU_ALLOWED_ORIGINS: '', FEISHU_OAUTH_SCOPES: 'calendar:calendar offline_access'
    }
  });
  const closed = new Promise<void>((resolve) => { child.once('exit', () => resolve()); child.once('error', () => resolve()); });
  try {
    const endpoint = `http://127.0.0.1:${port}/api/feishu`;
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        const response = await fetch(`${endpoint}/status`, { signal: AbortSignal.timeout(500) });
        expect(await response.json()).toMatchObject({ configured: true, status: 'disconnected' });
        ready = true;
        break;
      } catch { if (child.exitCode !== null) break; await delay(100); }
    }
    expect(ready).toBe(true);
    const response = await fetch(`${endpoint}/connect`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lumos-Feishu-Client': '1' }, body: '{}'
    });
    expect(response.status).toBe(200);
    const authorization = new URL((await response.json()).authorizeUrl);
    expect(authorization.origin).toBe('https://accounts.feishu.cn');
    expect(authorization.searchParams.get('prompt')).toBe('consent');
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    const pending = await fetch(`${endpoint}/status`, { headers: { Cookie: cookie } });
    expect(await pending.json()).toMatchObject({ configured: true, status: 'pending' });
  } finally {
    child.kill();
    await closed;
    rmSync(cwd, { recursive: true, force: true });
  }
}, 15000);
