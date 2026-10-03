/**
 * @file FeishuAutoSyncPanel.tsx
 * @input Current Feishu connection, hydrated-data readiness and manual-operation state.
 * @output Local automatic-sync switch, queue status, last success and retry action.
 * @pos Feishu settings; the global app hook owns scheduling.
 */
import React, { useEffect, useState } from 'react';
import type { FeishuConnectionStatus } from '../services/feishuCalendarClient';
import { feishuAutoSyncService, FEISHU_AUTO_RUNTIME_EVENT } from '../services/feishuAutoSyncService';
import { feishuAutoSyncStore, FEISHU_AUTO_CHANGED_EVENT } from '../services/feishuAutoSyncStore';
import { emptyFeishuAutoState, type FeishuAutoState } from '../utils/feishuAutoSyncState';

export const FeishuAutoSyncPanel: React.FC<{ connection: FeishuConnectionStatus | null; ready: boolean; busy: boolean }> = ({ connection, ready, busy }) => {
  const [state, setState] = useState<FeishuAutoState>(emptyFeishuAutoState);
  const [working, setWorking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      setSyncing(feishuAutoSyncService.syncing);
      void feishuAutoSyncStore.read().then((state) => { if (!cancelled) setState(state); })
        .catch((error) => { if (!cancelled) setError(error instanceof Error ? error.message : '自动同步状态读取失败。'); });
    };
    window.addEventListener(FEISHU_AUTO_CHANGED_EVENT, refresh);
    window.addEventListener(FEISHU_AUTO_RUNTIME_EVENT, refresh);
    refresh();
    return () => { cancelled = true; window.removeEventListener(FEISHU_AUTO_CHANGED_EVENT, refresh); window.removeEventListener(FEISHU_AUTO_RUNTIME_EVENT, refresh); };
  }, []);
  useEffect(() => {
    if (connection?.status === 'connected') {
      void feishuAutoSyncService.identifyAccount(connection.accountId).catch((error) => setError(error.message));
      void feishuAutoSyncService.refreshConnection().catch(() => undefined);
    }
  }, [connection?.status, connection?.accountId]);
  const account = state.accounts.find((item) => item.accountId === (connection?.accountId || state.activeAccountId));
  const enabled = Boolean(account?.enabled);
  const pending = account?.tasks.length || 0;
  const blocked = account?.tasks.some((task) => task.blocked);
  const message = error || account?.tasks.find((task) => task.blocked)?.error || account?.error;
  const perform = async (action: () => Promise<void>) => {
    setWorking(true); setError('');
    try { await action(); } catch (error) { setError(error instanceof Error ? error.message : '自动同步设置失败。'); }
    finally { setWorking(false); }
  };
  return <section className="border-t border-stone-200 pt-5 space-y-3" aria-label="自动同步设置">
    <div className="flex items-center justify-between gap-4">
      <label htmlFor="feishu-auto-sync" className="font-bold text-stone-600">自动同步</label>
      <input id="feishu-auto-sync" type="checkbox" role="switch" checked={enabled}
        disabled={busy || working || !ready || !enabled && connection?.status !== 'connected'}
        onChange={(event) => { const checked = event.target.checked; void perform(() => feishuAutoSyncService.setEnabled(checked)); }}
        className="h-5 w-5 accent-stone-800 cursor-pointer disabled:opacity-50" />
    </div>
    <div className="flex items-center justify-between gap-4 text-sm text-stone-500">
      <span role="status">{!enabled ? '已关闭' : connection?.status !== 'connected' ? '需要重新连接' : syncing ? '同步中…' : blocked ? `同步受阻 · ${pending} 条` : pending ? `待同步 ${pending} 条` : '已同步'}</span>
      <button type="button" disabled={busy || working || syncing || !enabled || !ready || connection?.status !== 'connected'}
        onClick={() => void perform(() => feishuAutoSyncService.retryPending())}
        className="text-stone-700 underline underline-offset-4 disabled:opacity-40">立即同步</button>
    </div>
    {account?.lastSuccessAt && <p className="text-xs text-stone-400">最近同步 {new Date(account.lastSuccessAt).toLocaleString('zh-CN')}</p>}
    {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
  </section>;
};
