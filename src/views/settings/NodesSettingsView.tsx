/**
 * @file NodesSettingsView.tsx
 * @input Persisted nodes and text-derived node index
 * @output Searchable node directory with recent/count/name sorting and detail navigation
 * @pos View (Settings / Content)
 * @updated 2026-10-06: Added the print-inspired node directory.
 */
import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useNodes } from '../../contexts/NodeContext';
import { usePrivacy } from '../../contexts/PrivacyContext';

export const NodesSettingsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { nodes, index, openNode } = useNodes();
  const { isPrivacyMode } = usePrivacy();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'recent' | 'count' | 'name'>('recent');
  const visibleNodes = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return nodes.filter((node) => [node.name, ...node.aliases].some((name) => name.toLocaleLowerCase().includes(search)))
      .sort((a, b) => {
        const aEntry = index.get(a.id);
        const bEntry = index.get(b.id);
        const difference = sort === 'recent' ? (bEntry?.latestAt || 0) - (aEntry?.latestAt || 0)
          : sort === 'count' ? (bEntry?.logs.length || 0) - (aEntry?.logs.length || 0) : 0;
        return difference || a.name.localeCompare(b.name, 'zh-CN');
      });
  }, [nodes, index, query, sort]);
  return <div className="fixed inset-0 z-50 flex flex-col bg-[#faf9f6] pt-[env(safe-area-inset-top)]">
    <header className="flex shrink-0 items-center gap-3 border-b border-stone-200 px-6 py-4">
      <button type="button" aria-label="返回设置" onClick={onBack} className="-ml-2 p-2 text-stone-500 hover:text-stone-900"><ChevronLeft size={22} /></button>
      <h1 className="text-xl font-bold tracking-wide text-stone-900">节点</h1>
      <span className="ml-auto font-mono text-xs text-stone-400">{nodes.length}</span>
    </header>
    <main className="min-h-0 flex-1 overflow-y-auto px-7 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-7">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 border-b border-stone-300 pb-3">
          <Search size={16} className="shrink-0 text-stone-400" />
          <input aria-label="搜索节点" placeholder="搜索名称或别名" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400" />
        </div>
        <div className="mb-3 mt-6 flex items-center gap-5 text-xs">
          {([['recent', '最近使用'], ['count', '记录数量'], ['name', '名称']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={sort === value} onClick={() => setSort(value)} className={`py-2 ${sort === value ? 'font-semibold text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}>{label}</button>)}
          <span className="ml-auto font-mono text-stone-400">{visibleNodes.length}</span>
        </div>
        <div className="divide-y divide-stone-200 border-y border-stone-200">
          {visibleNodes.map((node) => {
            const entry = index.get(node.id);
            return <button type="button" key={node.id} onClick={() => openNode(node.name)} className="group flex w-full items-center gap-3 py-3 text-left">
              <span aria-hidden="true" className="font-serif text-sm text-stone-300">[[]]</span>
              <div className={`min-w-0 flex-1 ${isPrivacyMode ? 'blur-sm select-none' : ''}`}>
                <h2 className="break-words text-sm font-medium leading-5 text-stone-900">{node.name}</h2>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-4 text-stone-400">
                  <span>{entry?.logs.length || 0} 条记录</span>
                  {Boolean(entry?.latestAt) && <span>最近出现：{new Date(entry!.latestAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</span>}
                </div>
              </div>
              <ChevronRight size={16} className="shrink-0 text-stone-300 group-hover:text-stone-700" />
            </button>;
          })}
        </div>
        {!visibleNodes.length && <p className="py-16 text-center text-sm leading-7 text-stone-400">{query ? '没有找到节点' : <>暂无节点<br />在记录备注中写下 [[名称]]，保存后即可创建</>}</p>}
      </div>
    </main>
  </div>;
};
