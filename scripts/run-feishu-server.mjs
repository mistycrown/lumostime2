/**
 * @file run-feishu-server.mjs
 * @input Server environment/.env.local and optional FEISHU_PORT/FEISHU_HOST.
 * @output The persistent OAuth connection service on 127.0.0.1:3003 by default.
 * @pos Standalone server script (Node 22.12+ with type stripping and SQLite).
 * @description Loads server-only credentials without logging or including them in frontend bundles.
 * @updated 2026-10-03: Personal-app mode without shared app credentials; persistent development key and HTTPS production cookie origin.
 */
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { loadFeishuServerEnv } from './feishu-server-env.mjs';
import { createFeishuHandler } from '../server/feishu/httpApi.ts';
import { FeishuOAuthService } from '../server/feishu/oauthService.ts';
import { OAuthStore } from '../server/feishu/oauthStore.ts';
import { PersonalFeishuService } from '../server/feishu/personalService.ts';

if (process.argv.includes('--production')) process.env.NODE_ENV = 'production';
const production = process.env.NODE_ENV === 'production';
loadFeishuServerEnv(process.cwd(), production ? 'production' : 'development');
const port = Number(process.env.FEISHU_PORT || process.env.PORT || 3003);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid Feishu service port');
const host = process.env.FEISHU_HOST || (production ? '0.0.0.0' : '127.0.0.1');
let store;
let service = null;
const shared = process.env.FEISHU_CONNECTION_MODE === 'shared'
  || process.env.FEISHU_CONNECTION_MODE !== 'personal' && Boolean(process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET);
if (!production && !process.env.FEISHU_TOKEN_ENCRYPTION_KEY) {
  const directory = resolve('.feishu-data');
  const keyPath = resolve(directory, 'local.key');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  try { process.env.FEISHU_TOKEN_ENCRYPTION_KEY = readFileSync(keyPath, 'utf8').trim(); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const key = randomBytes(32).toString('base64');
    try { writeFileSync(keyPath, key, { encoding: 'utf8', flag: 'wx', mode: 0o600 }); }
    catch (failure) { if (failure.code !== 'EEXIST') throw failure; }
    process.env.FEISHU_TOKEN_ENCRYPTION_KEY = readFileSync(keyPath, 'utf8').trim();
  }
}
const required = shared ? ['FEISHU_APP_ID', 'FEISHU_APP_SECRET', 'FEISHU_REDIRECT_URI', 'FEISHU_TOKEN_ENCRYPTION_KEY'] : ['FEISHU_TOKEN_ENCRYPTION_KEY'];
if (required.every((key) => process.env[key])) {
  const publicOrigin = process.env.FEISHU_PUBLIC_ORIGIN
    || (process.env.FEISHU_SERVICE_DOMAIN ? `https://${process.env.FEISHU_SERVICE_DOMAIN}` : `http://localhost:${port}`);
  if (production && !shared && new URL(publicOrigin).protocol !== 'https:') {
    throw new Error('Personal Feishu production service requires HTTPS FEISHU_PUBLIC_ORIGIN or FEISHU_SERVICE_DOMAIN');
  }
  store = new OAuthStore(resolve(process.env.FEISHU_DATABASE_PATH || '.feishu-data/oauth.sqlite'), process.env.FEISHU_TOKEN_ENCRYPTION_KEY);
  service = shared ? new FeishuOAuthService({
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
    redirectUri: process.env.FEISHU_REDIRECT_URI,
    scopes: process.env.FEISHU_OAUTH_SCOPES
  }, store) : new PersonalFeishuService(store, publicOrigin);
} else if (production) {
  throw new Error(`Feishu OAuth service configuration is incomplete: ${required.filter((key) => !process.env[key]).join(', ')}`);
}
const origins = (process.env.FEISHU_ALLOWED_ORIGINS || (production ? '' : 'http://localhost:3002,http://127.0.0.1:3002')).split(',').map((value) => value.trim()).filter(Boolean);
if (origins.includes('null') || origins.includes('*')) throw new Error('Feishu app origins must be explicit HTTP(S) origins');
const handler = createFeishuHandler(service, origins);
const server = createServer((req, res) => {
  if (!req.url?.startsWith('/api/feishu/')) {
    res.statusCode = 404;
    res.end();
    return;
  }
  void handler(req, res);
});
server.requestTimeout = 10000;
server.listen(port, host, () => console.log(`Feishu OAuth API: http://${host}:${port}${service ? '' : ' (not configured)'}`));
const shutdown = () => server.close(() => { store?.close(); process.exit(0); });
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
// The development launcher owns an IPC channel; losing its parent must not leave an orphan API.
if (process.send) process.once('disconnect', shutdown);
