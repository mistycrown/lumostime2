/**
 * @file crypto.test.ts
 * @input Existing Node SHA-256 identities and UTF-8 fixtures.
 * @output Compatibility checks for desktop/mobile account IDs, source markers and credentials.
 * @pos Shared Feishu primitive regression tests.
 */
import { createHash } from 'node:crypto';
import { expect, it, vi } from 'vitest';
// Use the actual browser polyfill: unlike Node Buffer it does not support the base64url encoding name.
vi.mock('buffer', async () => ({ Buffer: (await import('buffer/')).Buffer }));
import { basicCredentials, opaqueToken, randomUUID, sha256Base64Url, tokenHash } from './crypto';

it('preserves existing Node hashes and UTF-8 authorization encoding', () => {
  for (const text of ['', 'feishu-primary:calendar-1', 'category:account:工作', 'sync:account:log-1']) {
    expect(tokenHash(text)).toBe(createHash('sha256').update(text).digest('hex'));
    expect(sha256Base64Url(text)).toBe(createHash('sha256').update(text).digest('base64url'));
    expect(basicCredentials(text)).toBe(Buffer.from(text, 'utf8').toString('base64'));
  }
  expect(opaqueToken()).toMatch(/^[\w-]{43}$/);
  expect(randomUUID()).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
});
