/**
 * @file DesktopTodoQuickEditorPopover.tsx
 * @input Shared desktop quick-editor model, anchor position, and save/open callbacks
 * @output Reusable inline todo quick editor for desktop widget surfaces
 * @pos Component (desktop widget quick editor)
 * @description Renders a lightweight popover beside the click point so desktop widgets can edit todo titles inline, review schedule metadata, and inspect one-level hierarchy context without opening the full app detail immediately.
 * @updated 2026-05-17: 优化了 inline 模式下的最大高度限制和 flex 伸缩布局，解决子任务条目过多时由于外层未限高导致无法在 Electron 独立窗口中滚动显示的问题。
 * @updated 2026-05-17: Added viewport-clamped scrolling so the quick editor fits inside the dedicated transparent editor window without clipping its own content.
 * @updated 2026-05-17: Added first-pass desktop widget quick-editor popover with inline title save, schedule summary, hierarchy-aware list rendering, and outside-click dismissal.
 * @updated 2026-05-17: Tightened text container line-height and space offsets between titles and schedule metadata.
 * @updated 2026-05-17: Added a quick toggle-complete action button right of the external-link button in the popover header.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Circle, ExternalLink, ListTree } from 'lucide-react';
import type { DesktopTodoQuickEditorModel } from '../utils/desktopTodoQuickEditorUtils';

interface DesktopTodoQuickEditorPopoverProps {
  anchor: { x: number; y: number };
  isDark: boolean;
  model: DesktopTodoQuickEditorModel;
  inline?: boolean;
  onClose: () => void;
  onOpenDetail: (todoId: string) => void;
  onSaveTitle: (todoId: string, title: string) => void | Promise<void>;
  onSaveNote: (todoId: string, note: string) => void | Promise<void>;
  onSelectTodo?: (todoId: string) => void;
  onToggleComplete?: (todoId: string, isCompleted: boolean) => void | Promise<void>;
}

const POPOVER_WIDTH_PX = 280;
const VIEWPORT_MARGIN_PX = 12;
const ANCHOR_OFFSET_PX = 10;

export const DesktopTodoQuickEditorPopover: React.FC<DesktopTodoQuickEditorPopoverProps> = ({
  anchor,
  isDark,
  model,
  inline = false,
  onClose,
  onOpenDetail,
  onSaveTitle,
  onSaveNote,
  onSelectTodo,
  onToggleComplete
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const lastSubmittedTitleRef = useRef(model.todo.title);
  const lastSubmittedNoteRef = useRef(model.todo.note || '');
  const [draftTitle, setDraftTitle] = useState(model.todo.title);
  const [draftNote, setDraftNote] = useState(model.todo.note || '');
  const [position, setPosition] = useState(() => ({
    left: anchor.x + ANCHOR_OFFSET_PX,
    top: anchor.y + ANCHOR_OFFSET_PX
  }));

  useEffect(() => {
    setDraftTitle(model.todo.title);
    setDraftNote(model.todo.note || '');
    lastSubmittedTitleRef.current = model.todo.title;
    lastSubmittedNoteRef.current = model.todo.note || '';
  }, [model.todo.id, model.todo.note, model.todo.title]);

  useLayoutEffect(() => {
    const element = rootRef.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width - VIEWPORT_MARGIN_PX;
    const maxTop = window.innerHeight - rect.height - VIEWPORT_MARGIN_PX;
    const nextLeft = Math.min(
      Math.max(VIEWPORT_MARGIN_PX, anchor.x + ANCHOR_OFFSET_PX),
      Math.max(VIEWPORT_MARGIN_PX, maxLeft)
    );
    const nextTop = Math.min(
      Math.max(VIEWPORT_MARGIN_PX, anchor.y + ANCHOR_OFFSET_PX),
      Math.max(VIEWPORT_MARGIN_PX, maxTop)
    );

    setPosition((current) => (
      current.left === nextLeft && current.top === nextTop
        ? current
        : { left: nextLeft, top: nextTop }
    ));
  }, [anchor.x, anchor.y, draftNote, draftTitle, model]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const commitTitle = () => {
    const nextTitle = draftTitle.trim();
    if (!nextTitle || nextTitle === lastSubmittedTitleRef.current) {
      setDraftTitle(model.todo.title);
      return;
    }

    lastSubmittedTitleRef.current = nextTitle;
    void onSaveTitle(model.todo.id, nextTitle);
  };

  const commitNote = () => {
    const nextNote = draftNote;
    if (nextNote === lastSubmittedNoteRef.current) {
      return;
    }

    lastSubmittedNoteRef.current = nextNote;
    void onSaveNote(model.todo.id, nextNote);
  };

  const showList = model.items.length > 0 && (model.mode === 'children' || model.mode === 'siblings');
  const showNote = !showList;

  if (typeof document === 'undefined' && !inline) {
    return null;
  }

  const content = (
    <div
      ref={rootRef}
      className={`${inline ? 'relative w-full max-h-full flex flex-col' : 'fixed w-[280px]'} z-[300] rounded-xl border shadow-2xl ${
        isDark
          ? 'border-stone-800 bg-stone-950 text-stone-100 shadow-black/80'
          : 'border-stone-200 bg-[#faf9f6] text-stone-900 shadow-stone-300/40'
      }`}
      style={inline ? undefined : {
        left: `${position.left}px`,
        top: `${position.top}px`,
        width: `${POPOVER_WIDTH_PX}px`,
        maxHeight: `calc(100vh - ${VIEWPORT_MARGIN_PX * 2}px)`
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className={`${inline ? 'max-h-full flex-1 min-h-0' : 'max-h-[calc(100vh-24px)]'} space-y-3 overflow-y-auto p-3.5`}>
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <input
              type="text"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onBlur={commitTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitTitle();
                  (event.currentTarget as HTMLInputElement).blur();
                }
              }}
              className={`min-w-0 flex-1 bg-transparent text-[13px] font-semibold outline-none ${
                isDark
                  ? 'text-stone-100 placeholder-stone-600'
                  : 'text-stone-900 placeholder-stone-400'
              }`}
              placeholder="任务标题"
            />
            <button
              type="button"
              onClick={() => onOpenDetail(model.todo.id)}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                isDark
                  ? 'text-stone-400 hover:bg-stone-800 hover:text-white'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
              }`}
              aria-label="打开完整详情"
              title="打开完整详情"
            >
              <ExternalLink size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (onToggleComplete) {
                  onToggleComplete(model.todo.id, !model.todo.isCompleted);
                }
              }}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                isDark
                  ? 'text-stone-400 hover:bg-stone-800'
                  : 'text-stone-500 hover:bg-stone-100'
              }`}
              aria-label={model.todo.isCompleted ? '取消完成' : '标记为完成'}
              title={model.todo.isCompleted ? '取消完成' : '标记为完成'}
            >
              {model.todo.isCompleted ? (
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle size={14} className="text-stone-400 hover:text-emerald-600 dark:text-stone-500 dark:hover:text-emerald-400 transition-colors" />
              )}
            </button>
          </div>

          {model.parentTitle && (
            onSelectTodo && model.parentTodoId ? (
              <button
                type="button"
                onClick={() => onSelectTodo(model.parentTodoId!)}
                className={`text-[10px] tracking-[0.1em] transition ${
                  isDark
                    ? 'text-stone-500 hover:text-stone-300'
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                @{model.parentTitle}
              </button>
            ) : (
              <div className={`text-[10px] tracking-[0.1em] ${
                isDark ? 'text-stone-500' : 'text-stone-400'
              }`}>
                @{model.parentTitle}
              </div>
            )
          )}

          {model.scheduleSummary && (
            <div className={`text-[11px] leading-4 ${
              isDark ? 'text-stone-400' : 'text-stone-500'
            }`}>
              {model.scheduleSummary}
            </div>
          )}
        </div>

        {showList && (
          <section className="space-y-2">
            <div className={`flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] ${
              isDark ? 'text-stone-500' : 'text-stone-400'
            }`}>
              <ListTree size={11} />
              <span>{model.sectionTitle}</span>
            </div>
            <div className="space-y-1">
              {model.items.map((item) => {
                const rowClassName = item.isCurrent
                  ? isDark
                    ? 'border-stone-700 bg-stone-900/80 text-stone-100'
                    : 'border-stone-300 bg-white text-stone-900'
                  : isDark
                  ? 'border-stone-900 bg-stone-900/30 text-stone-300 hover:border-stone-800 hover:bg-stone-900/60'
                  : 'border-stone-200 bg-white/70 text-stone-700 hover:border-stone-300 hover:bg-white';

                const content = (
                  <div
                    className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-[12px] transition ${rowClassName}`}
                  >
                    <span className={`truncate ${item.isCompleted ? 'line-through opacity-60' : ''}`}>
                      {item.title}
                    </span>
                    {item.isCurrent && (
                      <span className={`shrink-0 text-[10px] ${
                        isDark ? 'text-stone-500' : 'text-stone-400'
                      }`}>
                        当前
                      </span>
                    )}
                  </div>
                );

                if (!onSelectTodo) {
                  return (
                    <div key={item.id}>
                      {content}
                    </div>
                  );
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTodo(item.id)}
                    className="block w-full"
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {showNote && (
          <section className="space-y-2">
            <div className={`rounded-lg border ${
              isDark
                ? 'border-stone-900 bg-stone-900/30'
                : 'border-stone-200 bg-white/70'
            }`}>
              <textarea
                value={draftNote}
                onChange={(event) => setDraftNote(event.target.value)}
                onBlur={commitNote}
                rows={4}
                className={`min-h-[84px] w-full resize-none bg-transparent px-2.5 py-2 text-[12px] leading-5 outline-none ${
                  isDark
                    ? 'text-stone-300 placeholder-stone-600'
                    : 'text-stone-600 placeholder-stone-400'
                }`}
                placeholder=""
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return createPortal(content, document.body);
};
