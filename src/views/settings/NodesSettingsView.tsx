/**
 * @file NodesSettingsView.tsx
 * @updated 2026-10-07: Matches the search-page header spacing, title size and shared top safe area.
 * @updated 2026-10-07: Uses a searchable category picker and adds capsule management with manual ordering.
 * @updated 2026-10-07: Groups compact node rows by user-created categories and an uncategorized fallback.
 * @input Persisted nodes and text-derived node index
 * @output Searchable node directory with recent/count/name sorting and detail navigation
 * @pos View (Settings / Content)
 * @updated 2026-10-06: Added the print-inspired node directory.
 */
import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import { useNodes } from '../../contexts/NodeContext';
import { usePrivacy } from '../../contexts/PrivacyContext';
import { NodeCategoryCreator } from '../../components/NodeCategoryCreator';
import { NodeCategorySelect } from '../../components/NodeCategorySelect';
import { NodeManageView } from './NodeManageView';
import { getNodeCategoryId } from '../../utils/nodeUtils';

export const NodesSettingsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { nodes, nodeCategories, index, openNode } = useNodes();
  const { isPrivacyMode } = usePrivacy();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'manual' | 'recent' | 'count' | 'name'>('manual');
  const [managing, setManaging] = useState(false);
  const [categoryId, setCategoryId] = useState('all');
  const visibleNodes = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return nodes.filter((node) => (categoryId === 'all' || getNodeCategoryId(node, nodeCategories) === categoryId)
      && [node.name, ...node.aliases].some((name) => name.toLocaleLowerCase().includes(search)))
      .sort((a, b) => {
        if (sort === 'manual') return 0;
        const aEntry = index.get(a.id);
        const bEntry = index.get(b.id);
        const difference = sort === 'recent' ? (bEntry?.latestAt || 0) - (aEntry?.latestAt || 0)
          : sort === 'count' ? (bEntry?.logs.length || 0) - (aEntry?.logs.length || 0) : 0;
        return difference || a.name.localeCompare(b.name, 'zh-CN');
      });
  }, [nodes, nodeCategories, categoryId, index, query, sort]);
  const groups = [...nodeCategories, { id: '', name: '未分类' }]
    .filter((category) => categoryId === 'all' || category.id === categoryId)
    .map((category) => ({ ...category, nodes: visibleNodes.filter((node) => getNodeCategoryId(node, nodeCategories) === category.id) }))
    .filter((group) => group.nodes.length > 0 || (categoryId !== 'all' && !query.trim()));
  if (managing) return <NodeManageView onBack={() => { setManaging(false); setSort('manual'); }} />;
  return <div className="fixed inset-0 z-50 flex flex-col bg-[#faf9f6] pt-[var(--app-safe-area-top,0px)]">
    <header className="flex shrink-0 items-center gap-3 border-b border-stone-100 bg-[#faf9f6]/80 px-4 pb-3 pt-4 backdrop-blur-md">
      <button type="button" aria-label="返回设置" onClick={onBack} className="p-1 text-stone-400 hover:text-stone-600"><ChevronLeft size={24} /></button>
      <h1 className="text-lg font-bold text-stone-800">节点</h1>
      <span className="ml-auto font-mono text-xs text-stone-400">{nodes.length}</span>
      <button type="button" aria-label="管理节点分类与排序" onClick={() => setManaging(true)} className="p-1 text-stone-500 hover:text-stone-900"><SlidersHorizontal size={18} /></button>
    </header>
    <main className="min-h-0 flex-1 overflow-y-auto px-7 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-7">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 border-b border-stone-300 pb-3">
          <Search size={16} className="shrink-0 text-stone-400" />
          <input aria-label="搜索节点" placeholder="搜索名称或别名" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400" />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <NodeCategorySelect label="筛选节点分类" value={categoryId} onChange={setCategoryId} includeAll />
          <NodeCategoryCreator />
        </div>
        <div className="mb-3 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {([['manual', '手动排序'], ['recent', '最近使用'], ['count', '记录数量'], ['name', '名称']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={sort === value} onClick={() => setSort(value)} className={`py-2 ${sort === value ? 'font-semibold text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}>{label}</button>)}
          <span className="ml-auto font-mono text-stone-400">{visibleNodes.length}</span>
        </div>
        {(nodes.length > 0 || nodeCategories.length > 0) && groups.map((group) => <section key={group.id || 'uncategorized'} className="mb-7">
          <h3 className="mb-2 flex items-center justify-between text-xs font-medium text-stone-500"><span>{group.name}</span><span className="font-mono text-[10px] text-stone-400">{group.nodes.length}</span></h3>
          <div className="divide-y divide-stone-200 border-y border-stone-200">
          {group.nodes.map((node) => {
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
          {!group.nodes.length && <p className="py-4 text-xs text-stone-400">{query ? '没有找到节点' : '暂无节点'}</p>}
        </section>)}
        {(groups.length === 0 || (!nodes.length && !nodeCategories.length)) && <p className="py-16 text-center text-sm leading-7 text-stone-400">{query ? '没有找到节点' : <>暂无节点<br />在记录备注中写下 [[名称]]，保存后即可创建</>}</p>}
      </div>
    </main>
  </div>;
};
