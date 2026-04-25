/**
 * @file TodoScheduleAssignModal.tsx
 * @input selected date, todo pool, todo/activity categories, assignment type, callbacks
 * @output Lightweight modal for assigning or quickly creating todos for a specific week-view day
 * @pos Component (Modal)
 * @description Lets users assign unfinished todos to a selected day as either Arrange or Due, or create a linked todo, without leaving the week schedule view.
 * @updated 2026-04-25: Hid unfinished subtasks from the schedule assignment picker whenever their parent todo is completed, using the full todo source so completed parents can still suppress orphan child rows.
 * @updated 2026-04-20 18:21: Fixed the schedule assign modal to a stable three-quarter viewport height and kept the inner content scrollable.
 * @updated 2026-04-20: Sorted assignable todos so items without a current date appear first and dated items follow in chronological order.
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { X, CalendarDays, Flag } from 'lucide-react';
import { Category, TodoCategory, TodoItem } from '../types';
import { IconRenderer } from './IconRenderer';
import { parseDateKey } from '../utils/todoScheduleUtils';
import { isIncompleteSubtaskHiddenByCompletedParent } from '../utils/todoHierarchyUtils';
import { CustomSelect } from './CustomSelect';
import { TagAssociation } from './TagAssociation';

interface TodoScheduleAssignModalProps {
  isOpen: boolean;
  dateLabel: string;
  assignType: 'scheduled' | 'deadline';
  onAssignTypeChange: (type: 'scheduled' | 'deadline') => void;
  todos: TodoItem[];
  allTodos?: TodoItem[];
  todoCategories: TodoCategory[];
  activityCategories: Category[];
  onAssign: (todo: TodoItem) => void;
  onCreate: (todo: Partial<TodoItem>) => void;
  onClose: () => void;
}

const ASSIGN_TYPE_OPTIONS = [
  { value: 'scheduled' as const, label: 'Arrange', Icon: CalendarDays },
  { value: 'deadline' as const, label: 'Due', Icon: Flag }
];

const formatStatusDate = (value?: string): string | null => {
  if (!value) return null;
  const parsed = parseDateKey(value);
  if (!parsed) return value;
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
};

const getStatusDateValue = (todo: TodoItem, type: 'scheduled' | 'deadline'): string | undefined => (
  type === 'scheduled' ? todo.scheduledDate : todo.deadlineDate
);

export const getVisibleScheduleAssignTodos = (
  todos: TodoItem[],
  sourceTodos: TodoItem[],
  selectedCategoryId: string,
  activeType: 'scheduled' | 'deadline' | 'new',
  assignType: 'scheduled' | 'deadline'
): TodoItem[] => {
  const nextTodos = selectedCategoryId === 'all'
    ? [...todos]
    : todos.filter((todo) => todo.categoryId === selectedCategoryId);

  const visibleTodos = nextTodos.filter((todo) => !isIncompleteSubtaskHiddenByCompletedParent(sourceTodos, todo));

  visibleTodos.sort((left, right) => {
    const leftDate = getStatusDateValue(left, activeType === 'new' ? assignType : activeType);
    const rightDate = getStatusDateValue(right, activeType === 'new' ? assignType : activeType);

    if (!leftDate && !rightDate) {
      return left.title.localeCompare(right.title, 'zh-CN');
    }
    if (!leftDate) return -1;
    if (!rightDate) return 1;

    const dateCompare = leftDate.localeCompare(rightDate);
    if (dateCompare !== 0) return dateCompare;

    return left.title.localeCompare(right.title, 'zh-CN');
  });

  return visibleTodos;
};

export const TodoScheduleAssignModal: React.FC<TodoScheduleAssignModalProps> = ({
  isOpen,
  dateLabel,
  assignType,
  onAssignTypeChange,
  todos,
  allTodos,
  todoCategories,
  activityCategories,
  onAssign,
  onCreate,
  onClose
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'scheduled' | 'deadline' | 'new'>(assignType);
  const [newTitle, setNewTitle] = useState('');
  const [newTodoCategoryId, setNewTodoCategoryId] = useState<string>(todoCategories[0]?.id || '');
  const [newLinkedCategoryId, setNewLinkedCategoryId] = useState<string>(activityCategories[0]?.id || '');
  const [newLinkedActivityId, setNewLinkedActivityId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedCategoryId('all');
      setActiveTab(assignType);
      setNewTitle('');
      setNewTodoCategoryId(todoCategories[0]?.id || '');
      setNewLinkedCategoryId(activityCategories[0]?.id || '');
      setNewLinkedActivityId('');
    }
  }, [isOpen, assignType, dateLabel, todoCategories, activityCategories]);

  useEffect(() => {
    if (activeTab !== 'new') {
      onAssignTypeChange(activeTab);
    }
  }, [activeTab, onAssignTypeChange]);

  const filteredTodos = useMemo(() => {
    return getVisibleScheduleAssignTodos(
      todos,
      allTodos || todos,
      selectedCategoryId,
      activeTab,
      assignType
    );
  }, [activeTab, allTodos, assignType, selectedCategoryId, todos]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[125] flex items-end justify-center bg-[rgba(15,23,42,0.12)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-12 backdrop-blur-sm md:items-center md:pb-4"
      onClick={onClose}
      >
      <div
        className="flex h-[75vh] max-h-[75vh] w-full max-w-[28rem] flex-col overflow-hidden rounded-[2rem] border border-stone-200 bg-[#faf9f6] shadow-[0_26px_70px_rgba(15,23,42,0.14)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-stone-200 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-400">Schedule</div>
              <div className="mt-1 text-lg font-medium text-stone-800">{dateLabel}</div>
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

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[...ASSIGN_TYPE_OPTIONS, { value: 'new' as const, label: 'New', Icon: CalendarDays }].map(({ value, label, Icon }) => {
              const isSelected = activeTab === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveTab(value)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                    isSelected
                      ? 'text-white'
                      : 'bg-white/70 text-stone-500 border-stone-200 hover:border-stone-300'
                  }`}
                  style={isSelected ? {
                    backgroundColor: 'var(--accent-color)',
                    borderColor: 'var(--accent-color)'
                  } : undefined}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {activeTab !== 'new' && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('all')}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                selectedCategoryId === 'all'
                  ? 'text-white'
                  : 'bg-white/70 text-stone-500 border-stone-200 hover:border-stone-300'
              }`}
              style={selectedCategoryId === 'all' ? {
                backgroundColor: 'var(--accent-color)',
                borderColor: 'var(--accent-color)'
              } : undefined}
            >
              全部
            </button>
            {todoCategories.map((category) => {
              const isSelected = selectedCategoryId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    isSelected
                      ? 'text-white'
                      : 'bg-white/70 text-stone-500 border-stone-200 hover:border-stone-300'
                  }`}
                  style={isSelected ? {
                    backgroundColor: 'var(--accent-color)',
                    borderColor: 'var(--accent-color)'
                  } : undefined}
                >
                  {category.name}
                </button>
              );
            })}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {activeTab === 'new' ? (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone-400">任务名称</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="输入任务名称..."
                  className="w-full rounded-xl border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-700 outline-none transition-colors focus:border-stone-300"
                />
              </div>

              <CustomSelect
                label="待办分类"
                value={newTodoCategoryId}
                options={todoCategories.map((category) => ({
                  value: category.id,
                  label: category.name
                }))}
                onChange={setNewTodoCategoryId}
                placeholder="选择分类"
              />

              {activityCategories.length > 0 && (
                <div className="rounded-2xl border border-stone-200 bg-white/60 px-4 py-4">
                  <div className="mb-3 text-xs uppercase tracking-[0.16em] text-stone-400">关联标签</div>
                  <TagAssociation
                    categories={activityCategories}
                    selectedCategoryId={newLinkedCategoryId}
                    selectedActivityId={newLinkedActivityId}
                    onCategorySelect={setNewLinkedCategoryId}
                    onActivitySelect={setNewLinkedActivityId}
                  />
                </div>
              )}

              <button
                type="button"
                disabled={!newTitle.trim() || !newTodoCategoryId}
                onClick={() => {
                  onCreate({
                    title: newTitle.trim(),
                    categoryId: newTodoCategoryId,
                    linkedCategoryId: newLinkedCategoryId || undefined,
                    linkedActivityId: newLinkedActivityId || undefined
                  });
                  setNewTitle('');
                  setNewLinkedActivityId('');
                }}
                className={`w-full rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                  newTitle.trim() && newTodoCategoryId
                    ? 'text-white'
                    : 'cursor-not-allowed bg-stone-200 text-stone-400'
                }`}
                style={newTitle.trim() && newTodoCategoryId ? {
                  backgroundColor: 'var(--accent-color)'
                } : undefined}
              >
                快速新建任务
              </button>
            </div>
          ) : filteredTodos.length > 0 ? (
            <div className="space-y-2">
              {filteredTodos.map((todo) => {
                const category = todoCategories.find((item) => item.id === todo.categoryId);
                const currentStatus = activeTab === 'scheduled'
                  ? formatStatusDate(todo.scheduledDate)
                  : formatStatusDate(todo.deadlineDate);
                const statusLabel = activeTab === 'scheduled'
                  ? (currentStatus ? `Arrange: ${currentStatus}` : 'Arrange: none')
                  : (currentStatus ? `Due: ${currentStatus}` : 'Due: none');

                return (
                  <button
                    key={todo.id}
                    type="button"
                    onClick={() => onAssign(todo)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-left transition-colors hover:border-stone-300 hover:bg-white"
                  >
                    <span className="shrink-0 text-stone-400">
                      <IconRenderer
                        icon={category?.icon || '•'}
                        uiIcon={category?.uiIcon}
                        className="text-sm"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-stone-700">{todo.title}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-stone-400">
                        <span className="truncate">{category?.name || 'Todo'}</span>
                        <span className="shrink-0 text-stone-300">·</span>
                        <span className="truncate">{statusLabel}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-sm italic text-stone-400">
              No available tasks in this category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
