/**
 * @file NodeCategorySelect.tsx
 * @input Node categories, selected category and change callback
 * @output Searchable, keyboard-accessible print-style category picker
 * @pos Component (Nodes)
 * @updated 2026-10-07: Replaces native category dropdowns in node views.
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useNodes } from '../contexts/NodeContext';

export const NodeCategorySelect: React.FC<{ value: string; onChange: (value: string) => void; label: string; includeAll?: boolean }> = ({ value, onChange, label, includeAll }) => {
  const { nodeCategories } = useNodes();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const options = [...(includeAll ? [{ id: 'all', name: '全部分类' }] : []), { id: '', name: '未分类' }, ...nodeCategories];
  const visible = options.filter((option) => option.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const close = () => { setOpen(false); setQuery(''); trigger.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) { setOpen(false); setQuery(''); } };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  return <div ref={container} className="relative min-w-0 max-w-full" onKeyDown={(event) => {
    if (open && event.key === 'Escape') { event.stopPropagation(); close(); }
    if (open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const buttons = [...container.current!.querySelectorAll<HTMLButtonElement>('[role="option"]')];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = index < 0 ? (event.key === 'ArrowDown' ? 0 : buttons.length - 1) : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
    }
  }}>
    <button ref={trigger} type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => { setQuery(''); setOpen(!open); }} className="flex max-w-full items-center gap-3 rounded-full border border-stone-200 bg-transparent px-3.5 py-2 text-xs text-stone-700 transition-colors hover:border-stone-400 focus-visible:outline focus-visible:outline-1 focus-visible:outline-stone-500">
      <span className="truncate">{options.find((option) => option.id === value)?.name || '未分类'}</span><ChevronDown size={13} className={`shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="absolute left-0 top-full z-[250] mt-2 w-56 max-w-[calc(100vw-3.5rem)] border border-stone-200 bg-[#faf9f6] p-2 shadow-[0_8px_24px_rgba(28,25,23,0.08)]">
      <div className="mb-1 flex items-center gap-2 border-b border-stone-200 px-2 pb-2 pt-1"><Search size={13} className="text-stone-400" /><input aria-label="搜索节点分类" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索分类" className="min-w-0 flex-1 bg-transparent text-xs text-stone-700 outline-none placeholder:text-stone-400" /></div>
      <div id={id} role="listbox" aria-label={label} className="max-h-52 overflow-y-auto">
        {visible.map((option) => <button key={option.id} type="button" role="option" aria-selected={option.id === value} data-category-value={option.id}
          onClick={() => { onChange(option.id); close(); }} className={`flex w-full items-center justify-between gap-3 px-2 py-2.5 text-left text-xs hover:bg-stone-100 focus:bg-stone-100 focus:outline-none ${option.id === value ? 'font-semibold text-stone-900' : 'text-stone-600'}`}>
          <span className="min-w-0 break-words">{option.name}</span>{option.id === value && <Check size={13} className="shrink-0" />}
        </button>)}
        {!visible.length && <p className="px-2 py-3 text-xs text-stone-400">没有找到分类</p>}
      </div>
    </div>}
  </div>;
};
