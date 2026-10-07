/**
 * @file NodeCategoryCreator.tsx
 * @input Node category store and optional callback after creation
 * @output Compact inline category creation form for node directory and details
 * @pos Component (Nodes)
 * @updated 2026-10-07: Adds user-created categories with duplicate-name validation.
 */
import React, { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import type { NodeCategory } from '../types';
import { useNodes } from '../contexts/NodeContext';
import { useToast } from '../contexts/ToastContext';

export const NodeCategoryCreator: React.FC<{ nodeId?: string; onCreated?: (category: NodeCategory) => void }> = ({ nodeId, onCreated }) => {
  const { addCategory } = useNodes();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="flex shrink-0 items-center gap-1 py-2 text-xs text-stone-500 hover:text-stone-900"><Plus size={13} />新建分类</button>;
  return <form className="flex min-w-0 items-center gap-1 border-b border-stone-300" onSubmit={(event) => {
    event.preventDefault();
    try {
      const category = addCategory(name, nodeId);
      onCreated?.(category);
      setName('');
      setOpen(false);
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : '新建分类失败');
    }
  }}>
    <input autoFocus aria-label="新分类名称" placeholder="分类名称" value={name} onChange={(event) => setName(event.target.value)} className="w-28 min-w-0 bg-transparent py-2 text-xs text-stone-700 outline-none" />
    <button type="submit" aria-label="保存分类" disabled={!name.trim()} className="p-2 text-stone-600 disabled:opacity-30"><Check size={14} /></button>
    <button type="button" aria-label="取消新建分类" onClick={() => { setName(''); setOpen(false); }} className="p-2 text-stone-400"><X size={14} /></button>
  </form>;
};
