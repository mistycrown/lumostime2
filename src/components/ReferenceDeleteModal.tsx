/**
 * @file ReferenceDeleteModal.tsx
 * @input Deleted reference metadata, hierarchical targets, and decision handlers
 * @output Migration or unlink confirmation dialog with a searchable target picker
 * @description Shared confirmation UI for scope and todo deletion reference handling.
 * @updated 2026-10-16: Replaces the flat dropdown with a searchable, collapsible parent-child picker.
 * @updated 2026-10-16: Collapses subtasks by default and expands matching groups only while searching.
 */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, ChevronDown, ChevronRight, Search, Trash2, Unlink, X } from 'lucide-react';
import type { ReferenceDeleteAction, ReferenceDeleteImpact } from '../utils/referenceDeletion';
import { getReferenceDeleteTargetGroups, type ReferenceDeleteTarget } from '../utils/referenceDeleteTargets';
import { registerHardwareBackHandler } from '../utils/hardwareBackHandlerStack';

interface ReferenceDeleteModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  targetLabel: string;
  sourceName: string;
  impact: ReferenceDeleteImpact;
  targets: ReferenceDeleteTarget[];
  onClose: () => void;
  onConfirm: (decision: { action: ReferenceDeleteAction; targetId?: string }) => void;
}

export const ReferenceDeleteModal: React.FC<ReferenceDeleteModalProps> = ({
  isOpen, title, description, targetLabel, sourceName, impact, targets, onClose, onConfirm
}) => {
  const [action, setAction] = useState<ReferenceDeleteAction>('unlink');
  const [targetId, setTargetId] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const targetButton = useRef<HTMLButtonElement>(null);
  const pickerBackButton = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const groups = useMemo(() => getReferenceDeleteTargetGroups(targets, search), [targets, search]);
  const selectedTarget = targets.find((target) => target.id === targetId && target.selectable !== false);
  const selectedParent = targets.find((target) => target.id === selectedTarget?.parentId);
  const selectedLabel = selectedTarget
    ? `${selectedParent ? `${selectedParent.name} / ` : ''}${selectedTarget.icon || ''}${selectedTarget.name}`
    : '';
  const resultCount = groups.reduce((count, group) => count + (group.target.selectable === false ? 0 : 1) + group.children.length, 0);

  useEffect(() => {
    setAction('unlink');
    setTargetId('');
    setPickerOpen(false);
    setSearch('');
    setExpandedIds([]);
  }, [isOpen, sourceName]);

  const closePicker = () => {
    setPickerOpen(false);
    requestAnimationFrame(() => targetButton.current?.focus());
  };

  useEffect(() => {
    if (pickerOpen) pickerBackButton.current?.focus();
  }, [pickerOpen]);

  useEffect(() => {
    if (!isOpen) return;
    return registerHardwareBackHandler(() => {
      if (pickerOpen) closePicker();
      else onClose();
      return true;
    });
  }, [isOpen, pickerOpen, onClose]);

  if (!isOpen) return null;

  const selectTarget = (target: ReferenceDeleteTarget) => {
    setTargetId(target.id);
    closePicker();
  };
  const renderTarget = (target: ReferenceDeleteTarget, parentName?: string) => (
    <button
      type="button"
      disabled={target.selectable === false}
      aria-label={`选择${targetLabel}：${parentName ? `${parentName} / ` : ''}${target.name}`}
      aria-pressed={target.id === selectedTarget?.id}
      onClick={() => selectTarget(target)}
      className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-3 text-left text-sm transition-colors disabled:text-stone-400 ${target.id === selectedTarget?.id ? 'bg-stone-100 font-medium text-stone-900' : 'text-stone-700 enabled:hover:bg-stone-50'}`}
    >
      {target.icon && <span className="shrink-0">{target.icon}</span>}
      <span className="min-w-0 flex-1 break-words">{target.name}</span>
      {target.id === selectedTarget?.id && <Check size={16} className="shrink-0" />}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
          event.stopPropagation();
          if (pickerOpen) closePicker();
          else onClose();
        }
        if (event.key === 'Tab') {
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input'));
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={`flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-stone-200 bg-[#fdfbf7] shadow-2xl ${pickerOpen ? 'h-[min(34rem,75dvh)]' : ''}`}>
        {pickerOpen ? (
          <>
            <div className="shrink-0 border-b border-stone-200 p-5 pb-4">
              <div className="mb-4 flex items-center gap-3">
                <button ref={pickerBackButton} type="button" aria-label="返回删除确认" onClick={closePicker} className="-ml-2 rounded-lg p-2 text-stone-500 hover:bg-stone-100"><ArrowLeft size={20} /></button>
                <h2 id={titleId} className="flex-1 font-bold text-stone-800">选择迁移{targetLabel}</h2>
                <span aria-live="polite" className="text-xs tabular-nums text-stone-400">{resultCount} 项</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 focus-within:border-stone-400">
                <Search size={16} className="shrink-0 text-stone-400" />
                <input ref={searchInput} type="search" aria-label={`搜索${targetLabel}`} placeholder={`搜索${targetLabel}`} value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent py-3 text-sm text-stone-700 outline-none placeholder:text-stone-400 [&::-webkit-search-cancel-button]:appearance-none" />
                {search && <button type="button" aria-label="清空搜索" onClick={() => { setSearch(''); searchInput.current?.focus(); }} className="-mr-2 p-2 text-stone-400 hover:text-stone-700"><X size={16} /></button>}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">
              {groups.map(({ target, children }) => {
                const expanded = Boolean(search.trim()) || expandedIds.includes(target.id);
                return (
                  <div key={target.id} className="border-b border-stone-100 py-1 last:border-0">
                    <div className="flex items-center">
                      {children.length > 0 && (
                        <button type="button" aria-label={`${expanded ? '收起' : '展开'}${target.name}的子任务`} aria-expanded={expanded} disabled={Boolean(search.trim())} onClick={() => setExpandedIds((ids) => ids.includes(target.id) ? ids.filter((id) => id !== target.id) : [...ids, target.id])} className="flex h-11 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 enabled:hover:bg-stone-100">
                          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      )}
                      {renderTarget(target)}
                      {children.length > 0 && <span className="shrink-0 px-2 text-xs tabular-nums text-stone-400">{children.length}</span>}
                    </div>
                    {expanded && children.length > 0 && (
                      <div className="mb-2 ml-4 border-l border-stone-200 pl-4">
                        {children.map((child) => <div key={child.id} className="flex">{renderTarget(child, target.name)}</div>)}
                      </div>
                    )}
                  </div>
                );
              })}
              {groups.length === 0 && <p role="status" className="py-12 text-center text-sm text-stone-400">{search.trim() ? `没有匹配的${targetLabel}` : `暂无可迁移的${targetLabel}`}</p>}
            </div>
          </>
        ) : (
          <>
            <div className="flex shrink-0 items-start gap-3 border-b border-stone-100 p-5">
              <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={20} />
              <div>
                <h2 id={titleId} className="font-bold text-stone-800">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-stone-500">{description}</p>
              </div>
            </div>
            <div className="min-h-0 space-y-4 overflow-y-auto p-5">
              <div className="rounded-xl border border-stone-200 bg-white p-3">
                <div className="flex items-center gap-2 text-sm font-bold text-stone-800"><Trash2 size={15} className="shrink-0 text-red-300" />{sourceName}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-stone-400">
                  <span>历史记录 {impact.logs}</span><span>当前计时 {impact.activeSessions}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" aria-pressed={action === 'migrate'} onClick={() => setAction('migrate')} className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${action === 'migrate' ? 'border-stone-800 bg-stone-800 text-white' : 'border-stone-200 text-stone-600'}`}>迁移关联</button>
                <button type="button" aria-pressed={action === 'unlink'} onClick={() => setAction('unlink')} className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${action === 'unlink' ? 'border-stone-800 bg-stone-800 text-white' : 'border-stone-200 text-stone-600'}`}><Unlink size={14} className="mr-1 inline" />取消关联</button>
              </div>
              {action === 'migrate' && (
                <button ref={targetButton} type="button" aria-haspopup="dialog" onClick={() => { setSearch(''); setPickerOpen(true); }} className="flex w-full items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-left text-sm text-stone-700">
                  <span className={`min-w-0 break-words ${selectedTarget ? 'text-stone-800' : 'text-stone-400'}`}>{selectedLabel || `选择${targetLabel}`}</span>
                  <ChevronRight size={16} className="shrink-0" />
                </button>
              )}
            </div>
            <div className="flex shrink-0 gap-3 border-t border-stone-100 bg-white p-4">
              <button type="button" autoFocus onClick={onClose} className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-600">取消</button>
              <button type="button" disabled={action === 'migrate' && !selectedTarget} onClick={() => onConfirm({ action, targetId: action === 'migrate' ? selectedTarget?.id : undefined })} className="flex-1 rounded-xl bg-stone-900 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">确定删除</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
