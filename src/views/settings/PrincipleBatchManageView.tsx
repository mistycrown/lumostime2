/**
 * @file PrincipleBatchManageView.tsx
 * @input Principle/group drafts and commit/cancel callbacks
 * @output Batch moves and mouse/touch ordering with explicit save/cancel
 * @updated 2026-10-18: Adds compact group management using the shared pointer drag lifecycle.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronRight, GripVertical, Search, X } from 'lucide-react';
import { CustomSelect } from '../../components/CustomSelect';
import { usePointerDrag } from '../../hooks/usePointerDrag';
import { registerHardwareBackHandler } from '../../utils/hardwareBackHandlerStack';
import { movePrinciplesToGroup, reorderPrincipleGroups, type PrincipleGroup } from '../../utils/principleGroupUtils';
import type { Principle } from './PrincipleLibraryView';

interface PrincipleBatchManageViewProps {
  principles: Principle[];
  groups: PrincipleGroup[];
  onSave: (principles: Principle[], groups: PrincipleGroup[]) => void;
  onCancel: () => void;
}
type DragItem = { kind: 'principle' | 'group'; id: string; ids: string[]; title: string };
type DropTarget = { groupId: string; targetId?: string; after: boolean };
const resolveIntent = () => 'drag' as const;

export const PrincipleBatchManageView: React.FC<PrincipleBatchManageViewProps> = ({ principles: initialPrinciples, groups: initialGroups, onSave, onCancel }) => {
  const [principles, setPrinciples] = useState(() => initialPrinciples.map((item) => (
    item.groupId && !initialGroups.some((group) => group.id === item.groupId) ? { ...item, groupId: undefined } : item
  )));
  const [groups, setGroups] = useState(initialGroups);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<DragItem | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const activeRef = useRef<DragItem | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const clear = useCallback(() => { activeRef.current = null; setActive(null); setTarget(null); }, []);
  useEffect(() => registerHardwareBackHandler(() => {
    if (activeRef.current) clear(); else onCancel();
    return true;
  }), [clear, onCancel]);

  const locate = useCallback((x: number, y: number): DropTarget | null => {
    const item = activeRef.current;
    if (!item) return null;
    const element = document.elementFromPoint(x, y);
    const section = element?.closest<HTMLElement>('[data-principle-batch-group]');
    if (!section || !scrollRef.current?.contains(section)) return null;
    const groupId = section.dataset.principleBatchGroup || '';
    if (item.kind === 'group') {
      if (!groupId || groupId === item.id) return null;
      const rect = section.getBoundingClientRect();
      return { groupId, after: y > rect.top + rect.height / 2 };
    }
    const row = element?.closest<HTMLElement>('[data-principle-batch-row]');
    const targetId = row?.dataset.principleBatchRow;
    if (targetId && item.ids.includes(targetId)) return null;
    const rect = row?.getBoundingClientRect();
    return { groupId, targetId, after: Boolean(rect && y > rect.top + rect.height / 2) };
  }, []);
  const preview = useCallback((x: number, y: number) => {
    const next = locate(x, y);
    setTarget((previous) => previous?.groupId === next?.groupId && previous?.targetId === next?.targetId && previous?.after === next?.after ? previous : next);
    return Boolean(next);
  }, [locate]);
  const onDrop = useCallback((x: number, y: number) => {
    const source = activeRef.current;
    const destination = locate(x, y);
    if (!source || !destination) return false;
    if (source.kind === 'group') {
      setGroups((previous) => reorderPrincipleGroups(previous, source.id, destination.groupId, destination.after));
      setAnnouncement('分组顺序已调整');
    } else {
      setPrinciples((previous) => movePrinciplesToGroup(previous, source.ids, destination.groupId || undefined, destination.targetId, destination.after));
      setCollapsed((previous) => { const next = new Set(previous); next.delete(destination.groupId); return next; });
      setAnnouncement(`已移动 ${source.ids.length} 条原则`);
    }
    return true;
  }, [locate]);
  const { beginDrag, dragFeedback, isDragging } = usePointerDrag({
    threshold: 6, resolveIntent, onSelect: clear, onDragMove: preview, onDragEnd: clear, onDrop
  });
  const feedbackRef = useRef(dragFeedback);
  feedbackRef.current = dragFeedback;
  useEffect(() => {
    if (!isDragging) return;
    let frame: number;
    const tick = () => {
      const point = feedbackRef.current;
      const area = scrollRef.current;
      if (point && area) {
        const rect = area.getBoundingClientRect();
        const direction = point.y < rect.top + 56 ? -1 : point.y > rect.bottom - 56 ? 1 : 0;
        if (direction && point.x >= rect.left && point.x <= rect.right) {
          area.scrollTop += direction * 9;
          preview(point.x, point.y);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isDragging, preview]);
  const startDrag = (event: React.PointerEvent<HTMLElement>, item: DragItem) => {
    if (beginDrag(event)) { activeRef.current = item; setActive(item); }
  };
  const search = query.trim().toLocaleLowerCase();
  const visiblePrinciples = principles.filter((item) => !search || `${item.title} ${item.frontText}`.toLocaleLowerCase().includes(search));
  const allSelected = visiblePrinciples.length > 0 && visiblePrinciples.every((item) => selected.has(item.id));
  const toggle = (id: string) => setSelected((previous) => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const moveSelected = (groupId: string) => {
    setPrinciples((previous) => movePrinciplesToGroup(previous, [...selected], groupId || undefined));
    setCollapsed((previous) => { const next = new Set(previous); next.delete(groupId); return next; });
    setAnnouncement(`已移动 ${selected.size} 条原则`);
    setSelected(new Set());
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#faf9f6] pt-[var(--app-safe-area-top,0px)]" data-testid="principle-batch-management" onPointerCancel={clear} onKeyDown={(event) => {
      if (event.key === 'Escape') { if (activeRef.current) clear(); else onCancel(); }
    }}>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-stone-200 px-4">
        <button type="button" aria-label="取消批量管理" onClick={onCancel} className="p-1 text-stone-500"><X size={22} /></button>
        <h1 className="flex-1 text-lg font-bold text-stone-800">批量管理原则</h1>
        <button type="button" aria-label="保存批量修改" onClick={() => onSave(principles, groups)} className="p-1 text-stone-600"><Check size={22} /></button>
      </header>
      <div className="space-y-3 border-b border-stone-200 px-4 py-3">
        <div className="flex items-center gap-2 border-b border-stone-300">
          <Search size={16} className="text-stone-400" />
          <input aria-label="搜索原则" placeholder="搜索原则" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-sm text-stone-800 outline-none" />
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setSelected((previous) => {
            const next = new Set(previous);
            visiblePrinciples.forEach((item) => allSelected ? next.delete(item.id) : next.add(item.id));
            return next;
          })} className="shrink-0 py-2 text-xs text-stone-600">{allSelected ? '取消全选' : '全选'}</button>
          <span className="shrink-0 text-xs text-stone-400">已选 {selected.size}</span>
          <CustomSelect ariaLabel="批量移动到分组" value="__choose__" placeholder="移动到分组" disabled={!selected.size} onChange={moveSelected} options={[
            { value: '', label: '未分组' }, ...groups.map((group) => ({ value: group.id, label: group.name }))
          ]} className="min-w-0 flex-1" renderDropdownInPortal />
        </div>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        {[...groups, { id: '', name: '未分组' }].map((group, groupIndex) => {
          const items = visiblePrinciples.filter((item) => (item.groupId || '') === group.id);
          const siblings = principles.filter((item) => (item.groupId || '') === group.id);
          const isGroupTarget = isDragging && target?.groupId === group.id;
          return (
            <section key={group.id} data-principle-batch-group={group.id} className={`my-4 min-h-20 border-b border-stone-200 pb-3 ${isGroupTarget && !target.targetId ? 'bg-stone-100' : ''} ${isGroupTarget && active?.kind === 'group' ? target.after ? 'border-b-2 border-b-stone-800' : 'border-t-2 border-t-stone-800' : ''}`}>
              <div className="flex items-center gap-1 py-2">
                {group.id && <button type="button" aria-label={`拖动分组：${group.name}`} onPointerDown={(event) => startDrag(event, { kind: 'group', id: group.id, ids: [], title: group.name })} className="touch-none cursor-grab p-1 text-stone-400 active:cursor-grabbing"><GripVertical size={16} /></button>}
                <button type="button" aria-label={`折叠分组：${group.name}`} aria-expanded={!collapsed.has(group.id)} onClick={() => setCollapsed((previous) => {
                  const next = new Set(previous); if (next.has(group.id)) next.delete(group.id); else next.add(group.id); return next;
                })} className="flex min-w-0 flex-1 items-center gap-1 text-left text-sm font-bold text-stone-700">
                  {collapsed.has(group.id) ? <ChevronRight size={15} /> : <ChevronDown size={15} />}<span className="truncate">{group.name}</span><span className="ml-1 font-mono text-xs font-normal text-stone-400">{items.length}</span>
                </button>
                {group.id && <>
                  <button type="button" aria-label={`${group.name}分组上移`} disabled={groupIndex === 0} onClick={() => setGroups(reorderPrincipleGroups(groups, group.id, groups[groupIndex - 1].id))} className="p-1 text-stone-400 disabled:opacity-25"><ArrowUp size={14} /></button>
                  <button type="button" aria-label={`${group.name}分组下移`} disabled={groupIndex === groups.length - 1} onClick={() => setGroups(reorderPrincipleGroups(groups, group.id, groups[groupIndex + 1].id, true))} className="p-1 text-stone-400 disabled:opacity-25"><ArrowDown size={14} /></button>
                </>}
              </div>
              {!collapsed.has(group.id) && <div>
                {items.map((item) => {
                  const index = siblings.findIndex((sibling) => sibling.id === item.id);
                  const isRowTarget = isDragging && target?.targetId === item.id;
                  return <div key={item.id} data-principle-batch-row={item.id} className={`flex items-center gap-2 border-b border-stone-100 py-3 last:border-b-0 ${selected.has(item.id) ? 'bg-stone-100/60' : ''} ${isDragging && active?.ids.includes(item.id) ? 'opacity-30' : ''} ${isRowTarget ? target.after ? 'border-b-2 border-b-stone-800' : 'border-t-2 border-t-stone-800' : ''}`}>
                    <button type="button" aria-label={`拖动原则：${item.title}`} onPointerDown={(event) => startDrag(event, {
                      kind: 'principle', id: item.id, ids: selected.has(item.id) ? [...selected] : [item.id], title: selected.has(item.id) && selected.size > 1 ? `${selected.size} 条原则` : item.title
                    })} className="shrink-0 touch-none cursor-grab p-1 text-stone-400 active:cursor-grabbing"><GripVertical size={16} /></button>
                    <button type="button" aria-label={`选择原则：${item.title}`} aria-pressed={selected.has(item.id)} onClick={() => toggle(item.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left text-sm text-stone-700">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-stone-300">{selected.has(item.id) && <Check size={12} />}</span><span className="truncate">{item.title}</span>
                    </button>
                    <button type="button" aria-label={`${item.title}上移`} disabled={index === 0} onClick={() => setPrinciples(movePrinciplesToGroup(principles, [item.id], item.groupId, siblings[index - 1].id))} className="p-1 text-stone-400 disabled:opacity-25"><ArrowUp size={14} /></button>
                    <button type="button" aria-label={`${item.title}下移`} disabled={index === siblings.length - 1} onClick={() => setPrinciples(movePrinciplesToGroup(principles, [item.id], item.groupId, siblings[index + 1].id, true))} className="p-1 text-stone-400 disabled:opacity-25"><ArrowDown size={14} /></button>
                  </div>;
                })}
                {!items.length && <p className="py-4 text-xs text-stone-400">{search ? '无匹配原则' : '暂无原则'}</p>}
              </div>}
            </section>
          );
        })}
      </div>
      <div role="status" className="sr-only">{announcement}</div>
      {isDragging && dragFeedback && active && <div className="pointer-events-none fixed z-[260] max-w-56 truncate rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 shadow-lg" style={{ left: Math.max(8, Math.min(dragFeedback.x + 12, window.innerWidth - 200)), top: Math.max(8, Math.min(dragFeedback.y - 44, window.innerHeight - 48)) }}>{active.title}</div>}
    </div>
  );
};
