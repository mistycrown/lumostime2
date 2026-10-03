/**
 * @file check-feishu-personal.mjs
 * @input Public Feishu registration endpoint; no application credentials.
 * @output Sanitized real registration readiness, never codes, tokens or secrets.
 * @pos Maintainer network diagnostic; does not create an app or a calendar event.
 */
import { randomBytes } from 'node:crypto';
import { PersonalFeishuService } from '../server/feishu/personalService.ts';
import { OAuthStore } from '../server/feishu/oauthStore.ts';

const store = new OAuthStore(':memory:', randomBytes(32).toString('base64'));
const service = new PersonalFeishuService(store);
let session;
try {
  const started = await service.startConnection();
  session = started.sessionToken;
  const status = await service.readStatus(session);
  const page = new URL(started.authorizeUrl);
  console.log(JSON.stringify({ configured: status.configured, status: status.status, phase: status.phase,
    confirmationOrigin: page.origin, confirmationPath: page.pathname }));
  if (status.status !== 'pending' || status.phase !== 'create') process.exitCode = 1;
} catch {
  console.error('Personal Feishu registration could not be reached. No app or calendar was created.');
  process.exitCode = 1;
} finally {
  service.disconnect(session);
  store.close();
}
