/**
 * @file WidgetSlotConfigModal.tsx
 * @input Widget slot draft, category/todo/scope sources, save handler
 * @output Slot configuration modal for widget timer templates
 * @pos Component
 * @description Lets the user configure a widget timer slot by choosing its activity tag, associated todo, scopes, and optional emoji override.
 * @updated 2026-04-17: Improved slot preview icon scaling on larger screens so tablet modals stay proportional.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Category, Scope, TodoCategory, TodoItem } from '../types';
import { IconRenderer } from './IconRenderer';
import { ScopeAssociation } from './ScopeAssociation';
import { TagAssociation } from './TagAssociation';
import { TodoAssociation } from './TodoAssociation';

export interface WidgetSlotConfigDraft {
  slotIndex: number;
  categoryId: string | null;
  activityId: string | null;
  linkedTodoId: string | null;
  scopeIds: string[] | null;
  customIcon: string | null;
}

interface WidgetSlotConfigModalProps {
  isOpen: boolean;
  draft: WidgetSlotConfigDraft | null;
  categories: Category[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  scopes: Scope[];
  onClose: () => void;
  onSave: (draft: WidgetSlotConfigDraft) => void;
}

const EMOJI_INPUT_MAX_LENGTH = 8;

const normalizeCustomIcon = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, EMOJI_INPUT_MAX_LENGTH) : null;
};

export const WidgetSlotConfigModal: React.FC<WidgetSlotConfigModalProps> = ({
  isOpen,
  draft,
  categories,
  todos,
  todoCategories,
  scopes,
  onClose,
  onSave
}) => {
  const [localDraft, setLocalDraft] = useState<WidgetSlotConfigDraft | null>(draft);

  useEffect(() => {
    setLocalDraft(draft);
  }, [draft]);

  const selectedCategoryId = localDraft?.categoryId || categories[0]?.id || '';
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) || categories[0],
    [categories, selectedCategoryId]
  );
  const selectedActivity = useMemo(
    () => selectedCategory?.activities.find((activity) => activity.id === localDraft?.activityId),
    [localDraft?.activityId, selectedCategory]
  );
  const effectiveIcon = normalizeCustomIcon(localDraft?.customIcon || '')
    || selectedActivity?.icon
    || selectedCategory?.icon
    || '\u2022';
  const canSave = Boolean((localDraft?.categoryId || selectedCategoryId) && localDraft?.activityId);

  if (!isOpen || !localDraft) {
    return null;
  }

  const setDraftField = <K extends keyof WidgetSlotConfigDraft>(
    key: K,
    value: WidgetSlotConfigDraft[K]
  ) => {
    setLocalDraft((previousDraft) => {
      if (!previousDraft) {
        return previousDraft;
      }
      return {
        ...previousDraft,
        [key]: value
      };
    });
  };

  const handleSave = () => {
    if (!localDraft || !canSave) {
      return;
    }

    onSave({
      ...localDraft,
      categoryId: localDraft.categoryId || selectedCategoryId || null,
      customIcon: normalizeCustomIcon(localDraft.customIcon || '')
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/30 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-[#fdfbf7] shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <div>
            <div className="text-sm font-bold text-stone-800">槽位 {localDraft.slotIndex + 1}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <div className="flex items-center gap-4 px-1">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full border border-stone-200 bg-white/80 leading-none shadow-[0_10px_24px_rgba(15,23,42,0.08)] sm:h-28 sm:w-28 md:h-32 md:w-32"
              style={{ containerType: 'size' } as React.CSSProperties}
            >
              <IconRenderer icon={effectiveIcon} size="58cqmin" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-widest text-stone-400">Preview</div>
              <div className="mt-2 truncate text-xl font-bold text-stone-800">
                {selectedActivity?.name || '未配置标签'}
              </div>
              <div className="mt-1 text-sm text-stone-500">
                {selectedCategory?.name || '请选择一个标签'}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Emoji</span>
              <button
                type="button"
                onClick={() => setDraftField('customIcon', null)}
                className="text-xs font-medium text-stone-400 transition-colors hover:text-stone-700"
              >
                跟随标签默认图标
              </button>
            </div>
            <input
              value={localDraft.customIcon || ''}
              onChange={(event) => setDraftField('customIcon', event.target.value)}
              placeholder={selectedActivity?.icon || selectedCategory?.icon || '🙂'}
              maxLength={EMOJI_INPUT_MAX_LENGTH}
              className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-4 text-center text-3xl outline-none transition-colors focus:border-stone-400"
            />
            <p className="mt-2 text-xs leading-5 text-stone-400">
              留空时会自动使用标签自己的图标；你也可以输入一个 emoji 覆盖它。
            </p>
          </div>

          <div>
            <div className="mb-4 px-1">
              <h3 className="text-sm font-bold text-stone-800">标签</h3>
              <p className="mt-1 text-xs text-stone-400">
                这是槽位的主活动，会决定开始和停止记时时的标签归属。
              </p>
            </div>
            <TagAssociation
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              selectedActivityId={localDraft.activityId || ''}
              onCategorySelect={(categoryId) => {
                setLocalDraft((previousDraft) => {
                  if (!previousDraft) {
                    return previousDraft;
                  }
                  return {
                    ...previousDraft,
                    categoryId,
                    activityId: previousDraft.categoryId === categoryId ? previousDraft.activityId : null
                  };
                });
              }}
              onActivitySelect={(activityId) => {
                setLocalDraft((previousDraft) => {
                  if (!previousDraft) {
                    return previousDraft;
                  }
                  return {
                    ...previousDraft,
                    categoryId: previousDraft.categoryId || selectedCategoryId || null,
                    activityId: activityId || null
                  };
                });
              }}
            />
          </div>

          <TodoAssociation
            todos={todos}
            todoCategories={todoCategories}
            linkedTodoId={localDraft.linkedTodoId || undefined}
            onChange={(todoId) => setDraftField('linkedTodoId', todoId || null)}
          />

          <ScopeAssociation
            scopes={scopes}
            selectedScopeIds={localDraft.scopeIds || undefined}
            onSelect={(scopeIds) => setDraftField('scopeIds', scopeIds || null)}
          />
        </div>

        <div className="border-t border-stone-100 bg-white px-5 py-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="w-full rounded-2xl bg-stone-800 px-4 py-3 text-sm font-bold text-white transition-all active:scale-[0.99] disabled:opacity-40"
          >
            保存槽位
          </button>
        </div>
      </div>
    </div>
  );
};
