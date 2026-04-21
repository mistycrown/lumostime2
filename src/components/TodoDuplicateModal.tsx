/**
 * @file TodoDuplicateModal.tsx
 * @input open state, source todo, duplicate cleanup options, confirm/close callbacks
 * @output Lightweight quick-edit modal for creating a copied todo
 * @pos Component (Modal)
 * @description Opens before duplication is committed so the user can rename the copy and optionally clear dates, tags, or scopes with a more concise layout.
 * @updated 2026-04-20: Added quick-copy editing flow for todo duplication.
 * @updated 2026-04-21: Simplified helper copy in the duplicate modal so the sheet feels lighter.
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, CalendarDays, Tag, Layers3, X } from 'lucide-react';
import { TodoDuplicateOptions, TodoItem } from '../types';

interface TodoDuplicateModalProps {
  isOpen: boolean;
  todo: TodoItem | null;
  onClose: () => void;
  onConfirm: (options: TodoDuplicateOptions) => void;
}

const buildDefaultTitle = (todo: TodoItem) => `${todo.title} 副本`;

export const TodoDuplicateModal: React.FC<TodoDuplicateModalProps> = ({
  isOpen,
  todo,
  onClose,
  onConfirm
}) => {
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState('');
  const [clearDates, setClearDates] = useState(true);
  const [clearTags, setClearTags] = useState(false);
  const [clearScopes, setClearScopes] = useState(false);

  useEffect(() => {
    if (!isOpen || !todo) {
      return;
    }

    setTitle(buildDefaultTitle(todo));
    setClearDates(true);
    setClearTags(false);
    setClearScopes(false);

    window.setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 0);
  }, [isOpen, todo]);

  const trimmedTitle = useMemo(() => title.trim(), [title]);

  if (!isOpen || !todo) return null;

  const handleConfirm = () => {
    if (!trimmedTitle) return;

    onConfirm({
      title: trimmedTitle,
      clearDates,
      clearTags,
      clearScopes
    });
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-[rgba(15,23,42,0.18)] px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[28rem] overflow-hidden rounded-[2rem] border border-stone-200 bg-[#faf8f3] shadow-[0_28px_80px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-stone-200 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-stone-400">Quick Copy</div>
              <div className="mt-1 text-xl font-semibold tracking-tight text-stone-800">复制待办</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-stone-400 transition-colors hover:bg-white hover:text-stone-600"
              title="关闭"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div>
            <label htmlFor="todo-duplicate-title" className="mb-2 block text-sm font-medium text-stone-700">
              副本标题
            </label>
            <input
              id="todo-duplicate-title"
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleConfirm();
                }
              }}
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 outline-none transition-colors placeholder:text-stone-300 focus:border-stone-400"
              placeholder="请输入副本标题"
            />
          </div>

          <div className="space-y-3">
            <OptionRow
              icon={<CalendarDays size={16} className="text-stone-400" />}
              title="清除日期信息"
              checked={clearDates}
              onChange={setClearDates}
            />
            <OptionRow
              icon={<Tag size={16} className="text-stone-400" />}
              title="清除标签信息"
              checked={clearTags}
              onChange={setClearTags}
            />
            <OptionRow
              icon={<Layers3 size={16} className="text-stone-400" />}
              title="清除领域信息"
              checked={clearScopes}
              onChange={setClearScopes}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-stone-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-stone-500 transition-colors hover:bg-white hover:text-stone-700"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!trimmedTitle}
            className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            <Copy size={16} />
            创建副本
          </button>
        </div>
      </div>
    </div>
  );
};

const OptionRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}> = ({ icon, title, checked, onChange }) => (
  <label className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 cursor-pointer transition-colors hover:border-stone-300 hover:bg-white">
    <div className="flex min-w-0 items-center gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100">
        {icon}
      </div>
      <div className="min-w-0 text-sm font-medium text-stone-700">{title}</div>
    </div>

    <span className="relative inline-flex items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span className="h-6 w-11 rounded-full bg-stone-200 transition-colors peer-checked:bg-stone-900 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-stone-300" />
      <span className="pointer-events-none absolute left-[2px] top-[2px] h-5 w-5 rounded-full border border-stone-300 bg-white transition-transform peer-checked:translate-x-5 peer-checked:border-white" />
    </span>
  </label>
);
