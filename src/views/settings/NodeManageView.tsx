/**
 * @file NodeManageView.tsx
 * @input Node metadata, category order and shared pointer drag lifecycle
 * @output Wrapping capsules for drag classification and node/category ordering
 * @pos View (Settings / Nodes)
 * @updated 2026-10-07: Adds touch/mouse dragging, edge scrolling and accessible move controls.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronLeft, GripVertical, Search, X } from 'lucide-react';
import { NodeCategoryCreator } from '../../components/NodeCategoryCreator';
import { NodeCategorySelect } from '../../components/NodeCategorySelect';
import { useNodes } from '../../contexts/NodeContext';
import { usePrivacy } from '../../contexts/PrivacyContext';
import { usePointerDrag } from '../../hooks/usePointerDrag';
import { getNodeCategoryId } from '../../utils/nodeUtils';
import { registerHardwareBackHandler } from '../../utils/hardwareBackHandlerStack';

type DragItem = { kind: 'node' | 'category'; id: string; name: string };
type DropTarget = { categoryId: string; targetId?: string; after: boolean };
const resolveIntent = () => 'drag' as const;

export const NodeManageView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { nodes, nodeCategories, moveNode, reorderCategory } = useNodes();
  const { isPrivacyMode } = usePrivacy();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [active, setActive] = useState<DragItem | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const activeRef = useRef<DragItem | null>(null);
  const scroll = useRef<HTMLElement>(null);
  const selected = nodes.find((node) => node.id === selectedId);
  const groups = [...nodeCategories, { id: '', name: '未分类' }];
  const search = query.trim().toLocaleLowerCase();
  const clear = useCallback(() => { activeRef.current = null; setActive(null); setTarget(null); }, []);
  useEffect(() => registerHardwareBackHandler(() => { if (activeRef.current) clear(); else onBack(); return true; }), [clear, onBack]);
  const locate = useCallback((x: number, y: number): DropTarget | null => {
    const source = activeRef.current;
    if (!source) return null;
    const element = document.elementFromPoint(x, y);
    const group = element?.closest<HTMLElement>('[data-node-group]');
    if (!group || !scroll.current?.contains(group)) return null;
    const categoryId = group.dataset.nodeGroup!;
    if (source.kind === 'category') {
      if (!categoryId || categoryId === source.id) return null;
      return { categoryId, after: y >= group.getBoundingClientRect().top + group.getBoundingClientRect().height / 2 };
    }
    const capsule = element?.closest<HTMLElement>('[data-node-capsule]');
    if (capsule?.dataset.nodeCapsule === source.id) return null;
    if (capsule) {
      const rect = capsule.getBoundingClientRect();
      return { categoryId, targetId: capsule.dataset.nodeCapsule, after: x >= rect.left + rect.width / 2 };
    }
    // Empty zones accept a node; whitespace among wrapped rows uses the next visual capsule.
    const next = [...group.querySelectorAll<HTMLElement>('[data-node-capsule]')].find((item) => {
      if (item.dataset.nodeCapsule === source.id) return false;
      const rect = item.getBoundingClientRect();
      return y < rect.top || (y <= rect.bottom && x < rect.left + rect.width / 2);
    });
    return { categoryId, targetId: next?.dataset.nodeCapsule, after: false };
  }, []);
  const preview = useCallback((x: number, y: number) => {
    const next = locate(x, y);
    setTarget((previous) => previous?.categoryId === next?.categoryId && previous?.targetId === next?.targetId && previous?.after === next?.after ? previous : next);
    return Boolean(next);
  }, [locate]);
  const onSelect = useCallback(() => {
    const item = activeRef.current;
    if (item?.kind === 'node') setSelectedId((previous) => previous === item.id ? null : item.id);
    clear();
  }, [clear]);
  const onDrop = useCallback((x: number, y: number) => {
    const item = activeRef.current;
    const drop = locate(x, y);
    if (!item || !drop) return false;
    if (item.kind === 'node') {
      moveNode(item.id, drop.categoryId, drop.targetId, drop.after);
      setSelectedId(item.id);
      setAnnouncement(`${item.name}已移至${nodeCategories.find((category) => category.id === drop.categoryId)?.name || '未分类'}`);
    } else {
      reorderCategory(item.id, drop.categoryId, drop.after);
      setAnnouncement(`${item.name}分类顺序已调整`);
    }
    return true;
  }, [locate, moveNode, reorderCategory, nodeCategories]);
  const { beginDrag, dragFeedback, isDragging } = usePointerDrag({ threshold: 6, resolveIntent, onSelect, onDragMove: preview, onDragEnd: clear, onDrop });
  const feedbackRef = useRef(dragFeedback);
  feedbackRef.current = dragFeedback;
  useEffect(() => {
    if (!isDragging || !active) return;
    let frame: number;
    const tick = () => {
      const point = feedbackRef.current;
      const area = scroll.current;
      if (point && area) {
        const rect = area.getBoundingClientRect();
        const direction = point.y < rect.top + 56 ? -1 : point.y > rect.bottom - 56 ? 1 : 0;
        if (direction && point.x >= rect.left && point.x <= rect.right) { area.scrollTop += direction * 9; preview(point.x, point.y); }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isDragging, active, preview]);
  const start = (event: React.PointerEvent<HTMLElement>, item: DragItem) => {
    if (beginDrag(event)) { activeRef.current = item; setActive(item); }
  };
  const moveSelected = (direction: -1 | 1) => {
    if (!selected) return;
    const categoryId = getNodeCategoryId(selected, nodeCategories);
    const siblings = nodes.filter((node) => getNodeCategoryId(node, nodeCategories) === categoryId);
    const neighbour = siblings[siblings.findIndex((node) => node.id === selected.id) + direction];
    if (neighbour) { moveNode(selected.id, categoryId, neighbour.id, direction === 1); setAnnouncement(`${selected.name}顺序已调整`); }
  };
  const siblings = selected ? nodes.filter((node) => getNodeCategoryId(node, nodeCategories) === getNodeCategoryId(selected, nodeCategories)) : [];
  const selectedIndex = siblings.findIndex((node) => node.id === selectedId);
  return <div className="fixed inset-0 z-[60] flex flex-col bg-[#faf9f6] pt-[env(safe-area-inset-top)]" data-testid="node-management" onPointerCancel={clear} onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); if (activeRef.current) clear(); else onBack(); } }}>
    <header className="flex shrink-0 items-center gap-3 border-b border-stone-200 px-6 py-4">
      <button type="button" aria-label="返回节点列表" onClick={onBack} className="-ml-2 p-2 text-stone-500 hover:text-stone-900"><ChevronLeft size={22} /></button>
      <h1 className="text-xl font-bold tracking-wide text-stone-900">管理节点</h1><span className="ml-auto font-mono text-xs text-stone-400">{nodes.length}</span>
    </header>
    <main ref={scroll} className="min-h-0 flex-1 overflow-y-auto px-7 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center gap-3 border-b border-stone-300 pb-3"><Search size={16} className="shrink-0 text-stone-400" /><input aria-label="搜索管理节点" placeholder="搜索名称或别名" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400" /></div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-stone-400">{nodeCategories.length} 个分类</span><NodeCategoryCreator /></div>
        {selected && <div className="sticky top-0 z-10 mb-5 flex flex-wrap items-center gap-3 border-y border-stone-200 bg-[#faf9f6] py-3" data-testid="node-move-controls">
          <span className={`max-w-24 truncate text-xs font-medium text-stone-800 ${isPrivacyMode ? 'blur-sm' : ''}`}>{selected.name}</span>
          <NodeCategorySelect value={getNodeCategoryId(selected, nodeCategories)} label="移动选中节点到分类" onChange={(categoryId) => moveNode(selected.id, categoryId)} />
          <div className="ml-auto flex items-center gap-1"><button type="button" aria-label="节点向前移动" disabled={selectedIndex <= 0} onClick={() => moveSelected(-1)} className="p-2 text-stone-600 disabled:opacity-25"><ArrowLeft size={15} /></button><button type="button" aria-label="节点向后移动" disabled={selectedIndex >= siblings.length - 1} onClick={() => moveSelected(1)} className="p-2 text-stone-600 disabled:opacity-25"><ArrowRight size={15} /></button><button type="button" aria-label="取消选择节点" onClick={() => setSelectedId(null)} className="p-2 text-stone-400"><X size={14} /></button></div>
        </div>}
        {groups.map((group, groupIndex) => {
          const members = nodes.filter((node) => getNodeCategoryId(node, nodeCategories) === group.id);
          const visible = members.filter((node) => [node.name, ...node.aliases].some((name) => name.toLocaleLowerCase().includes(search)));
          return <section key={group.id || 'uncategorized'} data-node-group={group.id} className={`mb-7 border-t pt-3 transition-colors ${target?.categoryId === group.id ? 'border-stone-700 bg-stone-100/50' : 'border-stone-200'} ${isDragging && active?.kind === 'category' && active.id === group.id ? 'opacity-40' : ''}`}>
            <div className="mb-3 flex items-center gap-2">
              {group.id && <button type="button" aria-label={`拖动分类：${group.name}`} onPointerDown={(event) => start(event, { kind: 'category', id: group.id, name: group.name })} className="-ml-1 touch-none cursor-grab p-1 text-stone-400 active:cursor-grabbing"><GripVertical size={15} /></button>}
              <h2 className="min-w-0 break-words text-xs font-semibold text-stone-700">{group.name}</h2><span className="font-mono text-[10px] text-stone-400">{visible.length}</span>
              {group.id && <div className="ml-auto flex gap-1"><button type="button" aria-label={`上移分类：${group.name}`} disabled={groupIndex === 0} onClick={() => reorderCategory(group.id, nodeCategories[groupIndex - 1].id)} className="p-1.5 text-stone-400 disabled:opacity-20"><ArrowUp size={13} /></button><button type="button" aria-label={`下移分类：${group.name}`} disabled={groupIndex === nodeCategories.length - 1} onClick={() => reorderCategory(group.id, nodeCategories[groupIndex + 1].id, true)} className="p-1.5 text-stone-400 disabled:opacity-20"><ArrowDown size={13} /></button></div>}
            </div>
            <div className="flex min-h-12 flex-wrap content-start gap-2 pb-3">
              {visible.map((node) => <button key={node.id} type="button" data-node-capsule={node.id} aria-label={`管理节点：${node.name}`} aria-pressed={selectedId === node.id}
                onPointerDown={(event) => start(event, { kind: 'node', id: node.id, name: node.name })} onClick={(event) => { if (event.detail === 0 && !activeRef.current) setSelectedId((previous) => previous === node.id ? null : node.id); }}
                className={`max-w-full touch-none select-none rounded-full border px-3.5 py-2 text-xs leading-4 transition-colors cursor-grab active:cursor-grabbing ${selectedId === node.id ? 'border-stone-700 bg-stone-800 text-[#faf9f6]' : 'border-stone-300 text-stone-700 hover:border-stone-500'} ${isDragging && active?.id === node.id ? 'opacity-30' : ''} ${target?.targetId === node.id ? target.after ? 'border-r-[3px] border-r-stone-900' : 'border-l-[3px] border-l-stone-900' : ''}`}>
                <span className={`break-words ${isPrivacyMode ? 'blur-sm' : ''}`}>{node.name}</span>
              </button>)}
              {!visible.length && <span className="py-2 text-xs text-stone-400">{search ? '没有找到节点' : '暂无节点'}</span>}
            </div>
          </section>;
        })}
      </div>
    </main>
    <span role="status" className="sr-only">{announcement}</span>
    {isDragging && active && dragFeedback && <div aria-hidden="true" className={`pointer-events-none fixed z-[270] max-w-[min(14rem,calc(100vw-1rem))] truncate rounded-full border bg-[#faf9f6] px-4 py-2 text-xs text-stone-800 shadow-sm ${dragFeedback.isTarget ? 'border-stone-700' : 'border-stone-300'} ${isPrivacyMode ? 'blur-sm' : ''}`} style={{ left: Math.max(8, Math.min(dragFeedback.x + 12, window.innerWidth - 232)), top: Math.max(8, Math.min(dragFeedback.y - 42, window.innerHeight - 40)) }}>{active.name}</div>}
  </div>;
};
