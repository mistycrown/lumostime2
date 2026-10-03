/**
 * @file nativeStore.test.ts
 * @input Native snapshots and the existing desktop SQLite adapter.
 * @output Storage parity, restart recovery, corruption rejection and session isolation checks.
 * @pos Feishu platform-adapter regression tests.
 */
import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { OAuthStore } from '../../../server/feishu/oauthStore';
import { NativeConnectionStore } from './nativeStore';
import { tokenHash } from './crypto';

it('matches SQLite session/value semantics and restores credentials and ledgers over restart', () => {
  const desktop = new OAuthStore(':memory:', randomBytes(32).toString('base64'));
  try {
    for (let store of [desktop, new NativeConnectionStore(null)]) {
      const connection = { status: 'pending' as const, pendingUntil: Date.now() + 60000, application: { id: 'private-app', secret: 'private-secret' } };
      const token = store.create(connection);
      const id = tokenHash(token);
      const state = store.addState(id, 'verifier', Date.now() + 60000);
      expect(store.claimState(state)).toEqual({ session: id, verifier: 'verifier' });
      expect(store.claimState(state)).toBeNull();
      store.setValue('installation', 'session', token);
      store.setValue('import_ledger', 'ledger-1', { record: { id: 'log-1' } }, 'account-1');
      store.setValue('import_ledger', 'legacy', { record: { id: 'old-log' } });
      store.setValue('import_ledger', 'other', { record: { id: 'other-log' } }, 'account-2');
      expect(store.listValues('import_ledger', 'account-1')).toHaveLength(1);
      expect(store.listValueEntries('import_ledger', 'account-1')).toHaveLength(2);
      const clone = store.get(id)!;
      clone.application!.secret = 'changed';
      expect(store.get(id)?.application?.secret).toBe('private-secret');
      if (store instanceof NativeConnectionStore) store = new NativeConnectionStore(store.serialize());
      expect(store.getValue('installation', 'session')).toBe(token);
      expect(store.get(id)).toEqual(connection);
      store.delete(id);
      expect(store.save(id, { status: 'connected' })).toBe(false);
      expect(store.get(id)).toBeNull();
    }
  } finally { desktop.close(); }
});

it('refuses malformed or unsupported snapshots instead of silently replacing existing state', () => {
  for (const text of ['', '{', '{}', JSON.stringify({ version: 2, sessions: [], states: [], values: [] }),
    JSON.stringify({ version: 1, sessions: [{ id: 'x', expires: 1, connection: { status: 'wrong' } }], states: [], values: [] })]) {
    expect(() => new NativeConnectionStore(text)).toThrow('无法读取');
  }
});
