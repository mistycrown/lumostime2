/**
 * @file TodoParentPickerModal.tsx
 * @input Current todo, todo collection, categories and selection callbacks
 * @output Searchable, category-filtered main-task selection dialog
 * @pos Component
 * @description Lets quick actions associate an existing leaf task with a valid main task.
 * @updated 2026-10-04: Added the main-task picker with category switching, search and back dismissal.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { TodoCategory, TodoItem } from '../types';
import { registerHardwareBackHandler } from '../utils/hardwareBackHandlerStack';
import { getTodoParentCandidates } from '../utils/todoParentLinkUtils';

interface TodoParentPickerModalProps {
  todo: TodoItem;
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  onSelect: (parentTodoId: string) => void;
  onClose: () => void;
}

export const TodoParentPickerModal: React.FC<TodoParentPickerModalProps> = ({
  todo, todos, todoCategories, onSelect, onClose
}) => {
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const candidates = useMemo(
    () => getTodoParentCandidates(todo, todos, categoryId, search),
    [todo, todos, categoryId, search]
  );
  const categoryNames = useMemo(
    () => new Map(todoCategories.map((category) => [category.id, category.name])),
    [todoCategories]
  );

  useEffect(() => registerHardwareBackHandler(() => {
    onClose();
    return true;
  }), [onClose]);

  return (
    <div
      className="absolute inset-0 z-[131] flex items-center justify-center bg-[rgba(15,23,42,0.08)] px-4 py-12"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="todo-parent-picker-title"
        className="flex max-h-full w-full max-w-[26rem] flex-col rounded-[1.75rem] border border-stone-200 bg-[#faf9f6] p-4 shadow-[0_22px_60px_rgba(15,23,42,0.18)]"
      >
        <div className="mb-4 flex items-center justify-between gap-3 px-1">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-stone-400">Link Main Task</div>
            <h2 id="todo-parent-picker-title" className="mt-1 text-base font-medium text-stone-800">关联到主任务</h2>
          </div>
          <button type="button" autoFocus aria-label="关闭主任务选择" onClick={onClose} className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700">
            <X size={18} />
          </button>
        </div>

        <label className="flex shrink-0 items-center gap-2 rounded-xl border border-stone-200 bg-white/80 px-3 py-2.5">
          <Search size={16} className="shrink-0 text-stone-400" />
          <input
            type="search"
            aria-label="搜索主任务"
            placeholder="搜索主任务"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-400"
          />
        </label>

        <div className="my-3 flex shrink-0 gap-2 overflow-x-auto pb-1" aria-label="主任务分类">
          {[{ id: '', name: '全部' }, ...todoCategories].map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${categoryId === category.id
                ? 'border-stone-500 text-stone-800'
                : 'border-stone-200 text-stone-500 hover:border-stone-400'}`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain border-t border-stone-200">
          {candidates.map((candidate) => {
            const isCurrent = candidate.id === todo.parentTodoId;
            return (
              <button
                key={candidate.id}
                type="button"
                disabled={isCurrent}
                onClick={() => onSelect(candidate.id)}
                className="flex w-full items-center justify-between gap-3 border-b border-stone-200/70 px-1 py-3 text-left text-stone-700 transition-colors hover:bg-white/80 disabled:text-stone-400"
              >
                <span className="min-w-0">
                  <span className="block break-words text-sm leading-6">{candidate.title}</span>
                  {categoryNames.get(candidate.categoryId) && (
                    <span className="mt-0.5 block text-[11px] text-stone-400">{categoryNames.get(candidate.categoryId)}</span>
                  )}
                </span>
                {isCurrent && <Check size={16} aria-label="当前主任务" className="shrink-0" />}
              </button>
            );
          })}
          {candidates.length === 0 && (
            <div className="py-10 text-center text-sm text-stone-400">{search.trim() ? '未找到匹配的主任务' : '暂无可关联的主任务'}</div>
          )}
        </div>
      </div>
    </div>
  );
};
