/**
 * @file TodoExecutionTagPicker.tsx
 * @input Selected labels, all tasks and task-save callback
 * @output Compact selected chips and a reusable label management modal
 * @pos Component (Todo editor)
 * @updated 2026-10-29: Replaces the inline popover with a portal modal and persistent library.
 * @updated 2026-10-29: Supports a custom quick-action trigger and nested back-handler state.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { TodoExecutionTag, TodoItem } from '../types';
import { normalizeTodoExecutionTags } from '../utils/todoExecutionTags';
import { resolveExecutionTags } from '../utils/todoExecutionLibrary';
import { useTodoExecutionLibrary } from '../hooks/useTodoExecutionLibrary';
import { TodoExecutionTagModal } from './TodoExecutionTagModal';

interface TodoExecutionTagPickerProps {
  executionTags?: TodoExecutionTag[];
  onChange: (nextTags: TodoExecutionTag[]) => void;
  todos?: TodoItem[];
  currentTodoId?: string;
  onSaveTodo?: (todo: TodoItem) => void;
  disabled?: boolean;
  renderTrigger?: (open: () => void, isOpen: boolean, selectedTags: TodoExecutionTag[]) => React.ReactNode;
  onOpenChange?: (isOpen: boolean) => void;
}

const EMPTY_TODOS: TodoItem[] = [];

export const TodoExecutionTagPicker: React.FC<TodoExecutionTagPickerProps> = ({
  executionTags, onChange, todos = EMPTY_TODOS, currentTodoId, onSaveTodo, disabled = false, renderTrigger, onOpenChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeModal = useCallback(() => setIsOpen(false), []);
  const discoveryTodos = useMemo(() => [...todos, { executionTags }], [todos, executionTags]);
  const library = useTodoExecutionLibrary(discoveryTodos);
  const selectedTags = useMemo(() => resolveExecutionTags(executionTags, library), [executionTags, library]);

  useEffect(() => { onOpenChange?.(isOpen); }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (JSON.stringify(selectedTags) !== JSON.stringify(normalizeTodoExecutionTags(executionTags))) onChange(selectedTags);
  }, [selectedTags, executionTags, onChange]);

  return (
    <div>
      {renderTrigger ? renderTrigger(() => setIsOpen(true), isOpen, selectedTags) : <div className="flex flex-wrap items-center gap-2">
        {selectedTags.map((tag) => (
          <span key={tag.id} className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-600">
            <span>{tag.name}</span>
            <button type="button" aria-label={`移除${tag.name}`} disabled={disabled}
              onClick={() => onChange(selectedTags.filter((candidate) => candidate.id !== tag.id))}
              className="rounded-full text-stone-400 hover:text-stone-700 disabled:opacity-50"><X size={12} /></button>
          </span>
        ))}
        <button type="button" disabled={disabled} aria-expanded={isOpen} aria-haspopup="dialog"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-stone-300 px-2.5 py-1 text-xs text-stone-500 hover:border-stone-500 hover:text-stone-700 disabled:opacity-50">
          <Plus size={13} /><span>{selectedTags.length ? '添加' : '添加执行标签'}</span>
        </button>
      </div>}
      {isOpen && !disabled && <TodoExecutionTagModal library={library} selectedTags={selectedTags}
        todos={todos} currentTodoId={currentTodoId} onSaveTodo={onSaveTodo}
        onChange={onChange} onClose={closeModal} />}
    </div>
  );
};
