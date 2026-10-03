/**
 * @file FeishuConnectionPanel.tsx
 * @input Connection availability/status, busy flag and explicit user actions.
 * @output An always-visible connect button until connected, including offline/unconfigured states.
 * @pos Feishu settings presentation.
 */
import React from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import type { FeishuConnectionStatus } from '../services/feishuCalendarClient';

export function FeishuConnectionPanel({ connection, busy, onConnect, onDisconnect }: {
  connection: FeishuConnectionStatus | null;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  if (connection?.status === 'connected') return <div className="flex items-center justify-between gap-3 text-sm">
    <span className="flex items-center gap-2 text-green-700"><CheckCircle2 size={18} />已连接 · {connection.userName}</span>
    <button disabled={busy} onClick={onDisconnect} className="text-stone-500 underline disabled:opacity-50">断开连接</button>
  </div>;
  if (connection?.status === 'pending') return <div className="flex items-center justify-between gap-3 text-sm text-stone-600">
    <span role="status" className="flex gap-2 items-center"><Loader2 size={16} className="animate-spin" />等待飞书授权，完成后请返回</span>
    <button disabled={busy} onClick={onDisconnect} className="underline disabled:opacity-50">取消</button>
  </div>;
  return <div className="space-y-4">
    <button onClick={onConnect} disabled={busy} className="w-full py-3 rounded-xl bg-stone-800 text-white text-sm disabled:opacity-50">
      {busy ? '正在连接…' : connection?.status === 'expired' || connection?.status === 'error' ? '重新连接飞书' : '连接飞书'}
    </button>
    {connection?.configured === false && <p role="status" className="text-sm text-stone-500">LumosTime 的飞书连接服务尚未开通，暂时无法授权。开通由 LumosTime 维护者完成，你无需创建应用或填写配置。</p>}
  </div>;
}
