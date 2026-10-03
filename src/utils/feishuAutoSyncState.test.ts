/**
 * @file feishuAutoSyncState.test.ts
 * @input Account baselines, rapid edits, deletions, replacement snapshots and stale responses.
 * @output Regression coverage for final-intent merging and version/account isolation.
 * @pos Automatic synchronization state tests.
 */
import { expect, it } from 'vitest';
import type { Log } from '../types';
import { acknowledgeFeishuTask, collectFeishuLogChanges, collectFeishuProjection, emptyFeishuAutoState, observeFeishuLogs } from './feishuAutoSyncState';

const log = (id = 'a', title = '工作'): Log => ({ id, title, categoryId: 'work', activityId: 'write', startTime: 1000, endTime: 61000, duration: 60 });
const fixture = () => {
  const state = emptyFeishuAutoState();
  state.activeAccountId = 'account-a';
  state.accounts.push({ accountId: 'account-a', enabled: true, sequence: 0, observed: observeFeishuLogs([log()]), tasks: [], references: [] });
  collectFeishuProjection(state.accounts[0], 'a', 'original');
  return { state, account: state.accounts[0] };
};

it('does not enqueue untouched historical logs', () => {
  const { state, account } = fixture();
  collectFeishuLogChanges(state, [log()]);
  collectFeishuProjection(account, 'a', 'original');
  expect(account.tasks).toEqual([]);
});
it('coalesces edits into the latest revision and preserves explicit deletion', () => {
  const { state, account } = fixture();
  collectFeishuLogChanges(state, [log('a', 'v2')]);
  collectFeishuLogChanges(state, [log('a', 'v3')]);
  expect(account.tasks).toHaveLength(1);
  expect(account.tasks[0].revision).toBe(2);
  collectFeishuLogChanges(state, []);
  expect(account.tasks[0]).toMatchObject({ operation: 'delete', revision: 3, categoryIds: ['work'], startTime: 1000 });
});
it('ignores image-only edits without consuming already queued content changes', () => {
  const { state, account } = fixture();
  collectFeishuLogChanges(state, [{ ...log(), images: ['photo.webp'] }]);
  collectFeishuProjection(account, 'a', 'original');
  expect(account.tasks).toEqual([]);
  collectFeishuLogChanges(state, [log('a', 'v2')]);
  collectFeishuProjection(account, 'a', 'v2');
  collectFeishuLogChanges(state, [{ ...log('a', 'v2'), images: ['photo.webp'] }]);
  collectFeishuProjection(account, 'a', 'v2');
  // The queue still has an unsent content revision, even when another raw-only edit arrives.
  expect(account.tasks).toHaveLength(1);
});
it('retains a newer edit after an old upload succeeds', () => {
  const { state, account } = fixture();
  collectFeishuLogChanges(state, [log('a', 'v2')]);
  const sent = { ...account.tasks[0] };
  collectFeishuLogChanges(state, [log('a', 'v3')]);
  acknowledgeFeishuTask(account, sent, 10);
  expect(account.tasks).toHaveLength(1);
  expect(account.tasks[0].revision).toBeGreaterThan(sent.revision);
});
it('retains uncertainty when creation is followed by deletion', () => {
  const { state, account } = fixture();
  collectFeishuLogChanges(state, [log(), log('new')]);
  account.tasks[0].sent = true;
  collectFeishuLogChanges(state, [log()]);
  expect(account.tasks[0]).toMatchObject({ id: 'new', operation: 'delete', sent: true });
});
it('pauses and clears old intentions when the whole dataset is replaced', () => {
  const { state, account } = fixture();
  collectFeishuLogChanges(state, [log('a', 'changed')]);
  collectFeishuLogChanges(state, [], true);
  expect(account.enabled).toBe(false);
  expect(account.tasks).toEqual([]);
  expect(account.observed).toEqual([]);
});
it('keeps account projections and successful acknowledgements independent', () => {
  const { state, account } = fixture();
  state.accounts.push({ ...structuredClone(account), accountId: 'account-b' });
  collectFeishuLogChanges(state, [log('a', 'changed')]);
  collectFeishuProjection(account, 'a', 'new-a');
  expect(state.accounts[1].observed[0].projection).toBe('original');
  acknowledgeFeishuTask(account, account.tasks[0], 10);
  expect(state.accounts[1].tasks).toHaveLength(1);
});
