/**
 * @file NodeMergePanel.tsx
 * @input Current node, shared node metadata and a pending-editor commit callback
 * @output Searchable two-node merge with an explicit primary choice
 * @pos Component (Node Details)
 * @updated 2026-10-07: Adds primary selection, merge preview, cancellation and record retargeting.
 */
import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, GitMerge, Search, X } from 'lucide-react';
import type { NoteNode } from '../types';
import { useNodes } from '../contexts/NodeContext';
import { useToast } from '../contexts/ToastContext';
import { registerHardwareBackHandler } from '../utils/hardwareBackHandlerStack';

export const NodeMergePanel: React.FC<{ node: NoteNode; onBeforeMerge: () => void }> = ({ node, onBeforeMerge }) => {
  const { nodes, index, merge } = useNodes();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [otherId, setOtherId] = useState('');
  const [primaryId, setPrimaryId] = useState(node.id);
  const other = nodes.find((item) => item.id === otherId && item.id !== node.id);
  const primary = primaryId === node.id ? node : other;
  const source = primaryId === node.id ? other : node;
  const candidates = nodes.filter((item) => item.id !== node.id && [item.name, ...item.aliases].some((name) => name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  const cancel = () => { setOpen(false); setOtherId(''); setQuery(''); setPrimaryId(node.id); };
  useEffect(() => {
    if (!open) return;
    return registerHardwareBackHandler(() => { setOpen(false); setOtherId(''); setQuery(''); setPrimaryId(node.id); return true; });
  }, [open, node.id]);
  if (!open) return <button type="button" disabled={nodes.length < 2} onClick={() => setOpen(true)} className="flex items-center gap-2 py-2 text-xs text-stone-500 hover:text-stone-900 disabled:opacity-30"><GitMerge size={14} />合并节点</button>;
  return <section aria-label="合并节点" className="border-y border-stone-200 py-4" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); cancel(); } }}>
    <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold text-stone-900">合并节点</h2><button type="button" aria-label="取消合并节点" onClick={cancel} className="p-1 text-stone-400"><X size={15} /></button></div>
    <div className="mb-3 flex items-center gap-2 border-b border-stone-200 pb-2"><Search size={14} className="shrink-0 text-stone-400" /><input aria-label="搜索待合并节点" placeholder="搜索名称或别名" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs text-stone-700 outline-none placeholder:text-stone-400" /></div>
    <div className="mb-5 flex max-h-48 flex-wrap gap-2 overflow-y-auto py-1">
      {candidates.map((item) => <button key={item.id} type="button" aria-label={`选择待合并节点：${item.name}`} aria-pressed={otherId === item.id} onClick={() => { setOtherId(item.id); setPrimaryId(node.id); }} className={`max-w-full rounded-full border px-3 py-2 text-xs ${otherId === item.id ? 'border-stone-700 text-stone-900' : 'border-stone-200 text-stone-500 hover:border-stone-400'}`}><span className="break-words">{item.name}</span></button>)}
      {!candidates.length && <p className="py-2 text-xs text-stone-400">没有找到节点</p>}
    </div>
    {other && <>
      <h3 className="mb-2 text-xs font-medium text-stone-500">主节点</h3>
      <div role="radiogroup" aria-label="选择主节点" className="mb-4 flex flex-wrap gap-2" onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault(); const nextId = primaryId === node.id ? other.id : node.id; setPrimaryId(nextId);
        [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-primary-id]')].find((button) => button.dataset.primaryId === nextId)?.focus();
      }}>
        {[node, other].map((item) => <button key={item.id} type="button" role="radio" data-primary-id={item.id} tabIndex={primaryId === item.id ? 0 : -1} aria-label={`主节点：${item.name}`} aria-checked={primaryId === item.id} onClick={() => setPrimaryId(item.id)} className={`flex max-w-full items-center gap-2 rounded-full border px-3 py-2 text-xs ${primaryId === item.id ? 'border-stone-700 bg-stone-800 text-[#faf9f6]' : 'border-stone-200 text-stone-500'}`}><span className="break-words">{item.name}</span>{primaryId === item.id && <Check size={12} className="shrink-0" />}</button>)}
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-stone-500"><span className="break-words">{source?.name}</span><ArrowRight size={13} className="shrink-0" /><span className="break-words font-medium text-stone-800">{primary?.name}</span><span className="ml-auto font-mono text-[10px]">{new Set([...(index.get(node.id)?.logs || []), ...(index.get(other.id)?.logs || [])].map((log) => log.id)).size} 条记录</span></div>
    </>}
    <div className="flex items-center gap-4"><button type="button" aria-label="确认合并节点" disabled={!source || !primary} onClick={() => {
      if (!source || !primary) return;
      try { onBeforeMerge(); merge(source.id, primary.id); cancel(); addToast('success', '节点已合并'); }
      catch (error) { addToast('error', error instanceof Error ? error.message : '合并失败'); }
    }} className="border-b border-stone-700 py-1 text-xs font-semibold text-stone-800 disabled:border-stone-200 disabled:text-stone-300">确认合并</button><button type="button" onClick={cancel} className="py-1 text-xs text-stone-400 hover:text-stone-700">取消</button></div>
  </section>;
};
