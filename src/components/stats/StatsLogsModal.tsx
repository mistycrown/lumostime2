/**
 * @file StatsLogsModal.tsx
 * @input Chart-filtered logs, selected category/activity, review date and privacy mode
 * @output Read-only daily log dialog with chronological records and matching totals
 * @pos Component (Statistics)
 * @description Displays daily statistic records in an editorial timeline with focus and Android back handling.
 * @updated 2026-10-17: Adds category/activity log details with portal rendering and scroll locking.
 */
import React, { useEffect, useId, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { Category, Log } from '../../types';
import { IconRenderer } from '../IconRenderer';
import { formatDuration, getHexColor } from '../../utils/chartUtils';
import { registerHardwareBackHandler } from '../../utils/hardwareBackHandlerStack';

export interface StatsLogSelection {
  categoryId: string;
  activityId?: string;
}

interface StatsLogsModalProps {
  selection: StatsLogSelection;
  logs: Log[];
  categories: Category[];
  date: Date;
  isPrivacyMode: boolean;
  onClose: () => void;
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const StatsLogsModal: React.FC<StatsLogsModalProps> = ({
  selection, logs, categories, date, isPrivacyMode, onClose
}) => {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const category = categories.find(item => item.id === selection.categoryId);
  const activity = category?.activities.find(item => item.id === selection.activityId);
  const entity = activity || category;
  const color = getHexColor(activity?.color || category?.themeColor || '#a8a29e');
  const selectedLogs = useMemo(() => logs
    .filter(log => log.categoryId === selection.categoryId
      && (!selection.activityId || log.activityId === selection.activityId))
    .sort((a, b) => a.startTime - b.startTime || a.id.localeCompare(b.id)),
  [logs, selection.categoryId, selection.activityId]);
  const totalSeconds = selectedLogs.reduce((total, log) => total + Math.max(0, (log.endTime - log.startTime) / 1000), 0);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const unregister = registerHardwareBackHandler(() => {
      onClose();
      return true;
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      } else if (event.key === 'Tab') {
        // Close is the only interactive control in this read-only dialog.
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      unregister();
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-stone-900/30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,var(--app-safe-area-top,0px))] backdrop-blur-[3px] sm:items-center sm:p-6"
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
      onTouchStart={event => event.stopPropagation()}
      onTouchMove={event => event.stopPropagation()}
      onTouchEnd={event => event.stopPropagation()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] border border-stone-200/80 bg-[#faf9f6] shadow-[0_24px_80px_rgba(28,25,23,0.18)] animate-in fade-in slide-in-from-bottom-4 duration-200"
      >
        <header className="shrink-0 px-6 pb-5 pt-6 sm:px-8 sm:pt-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <time className="font-mono text-[11px] tracking-[0.16em] text-stone-400">
              {date.getFullYear()} / {String(date.getMonth() + 1).padStart(2, '0')} / {String(date.getDate()).padStart(2, '0')}
            </time>
            <button ref={closeRef} type="button" aria-label="关闭记录明细" onClick={onClose} className="-mr-2 rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-stone-400">
              <X size={18} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <IconRenderer icon={entity?.icon || '◷'} uiIcon={entity?.uiIcon} size={23} />
            <div className="min-w-0">
              {activity && <p className="mb-1 text-[11px] text-stone-400">{category?.name}</p>}
              <h2 id={titleId} className="break-words font-serif text-xl font-semibold text-stone-800">{entity?.name || '记录明细'}</h2>
            </div>
          </div>
          <div className="mt-6 flex items-end justify-between gap-3">
            <p className="font-mono text-2xl tracking-tight text-stone-800">{formatDuration(totalSeconds)}</p>
            <p className="pb-0.5 text-xs text-stone-400">{selectedLogs.length} 条记录</p>
          </div>
          <div className="mt-4 h-[2px] w-10 rounded-full" style={{ backgroundColor: color }} />
        </header>

        <div className="min-h-0 overflow-y-auto overscroll-contain border-t border-stone-200/70 px-6 pb-5 sm:px-8">
          {selectedLogs.length === 0 ? (
            <p className="py-12 text-center text-sm text-stone-400">暂无记录</p>
          ) : (
            <ol>
              {selectedLogs.map(log => {
                const logActivity = category?.activities.find(item => item.id === log.activityId);
                return (
                  <li key={log.id} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 border-b border-stone-200/60 py-5 last:border-b-0">
                    <div className="pt-0.5 font-mono text-[11px] leading-5">
                      <time className="block text-stone-600">{formatTime(log.startTime)}</time>
                      <span className="my-1.5 block h-4 w-px bg-stone-200" />
                      <time className="block text-stone-400">{formatTime(log.endTime)}</time>
                    </div>
                    <div className="min-w-0">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-stone-700">
                          <IconRenderer icon={logActivity?.icon || category?.icon || '◷'} uiIcon={logActivity?.uiIcon} size={13} />
                          <span className="break-words">{logActivity?.name || '未命名标签'}</span>
                        </div>
                        <span className="shrink-0 pt-0.5 font-mono text-[10px] text-stone-400">{formatDuration(Math.max(0, (log.endTime - log.startTime) / 1000))}</span>
                      </div>
                      {(log.title || log.note) && (
                        <div className={isPrivacyMode ? 'blur-sm select-none' : ''}>
                          {log.title && <p className="mb-1 break-words text-sm font-medium leading-6 text-stone-700">{log.title}</p>}
                          {log.note && <p className="whitespace-pre-wrap break-words text-[13px] leading-6 text-stone-500">{log.note}</p>}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>
    </div>,
    document.body
  );
};
