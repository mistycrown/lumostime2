/**
 * @file WidgetSlotEditorModal.tsx
 * @input Unified widget slot draft, category/check/todo/scope sources, save handler
 * @output Slot editor modal that lets users choose a slot type before editing slot-specific fields
 * @pos Component
 * @description Unifies timer, daily, and shortcut widget slot editing into a single modal so each slot can choose its own behavior type.
 * @updated 2026-04-18: Added slot-type-first editing flow for mixed widget templates.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { COLOR_OPTIONS } from '../constants';
import { useCustomColors } from '../hooks/useCustomColors';
import { Category, CheckTemplate, Scope, TodoCategory, TodoItem } from '../types';
import { getEligibleNfcDailyCheckItems } from '../utils/dailyCheckUtils';
import { normalizeHexColor } from '../utils/colorUtils';
import { normalizeCustomColorHex } from '../services/customColorGroupService';
import {
  DEFAULT_DAILY_WIDGET_COLOR
} from '../services/widgetService';
import {
  DEFAULT_SHORTCUT_WIDGET_COLOR,
  SHORTCUT_WIDGET_ACTION_OPTIONS,
  ShortcutWidgetAction,
  getShortcutWidgetActionColor,
  getShortcutWidgetActionEmoji,
  getShortcutWidgetActionLabel
} from '../services/widgetShortcutService';
import { IconRenderer } from './IconRenderer';
import { CustomSelect } from './CustomSelect';
import { TagAssociation } from './TagAssociation';
import { TodoAssociation } from './TodoAssociation';
import { ScopeAssociation } from './ScopeAssociation';

export type WidgetSlotType = 'timer' | 'daily' | 'shortcut' | null;

export interface WidgetSlotEditorDraft {
  slotIndex: number;
  slotType: WidgetSlotType;
  categoryId: string | null;
  activityId: string | null;
  linkedTodoId: string | null;
  scopeIds: string[] | null;
  checkTemplateId: string | null;
  checkItemId: string | null;
  shortcutAction: ShortcutWidgetAction | null;
  label: string | null;
  customIcon: string | null;
  backgroundColor: string | null;
}

interface WidgetSlotEditorModalProps {
  isOpen: boolean;
  draft: WidgetSlotEditorDraft | null;
  categories: Category[];
  checkTemplates: CheckTemplate[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  scopes: Scope[];
  onClose: () => void;
  onSave: (draft: WidgetSlotEditorDraft) => void;
}

const EMOJI_INPUT_MAX_LENGTH = 8;

const SLOT_TYPE_OPTIONS: Array<{ value: Exclude<WidgetSlotType, null>; label: string }> = [
  { value: 'timer', label: '计时器' },
  { value: 'daily', label: '日课' },
  { value: 'shortcut', label: '快捷方式' }
];

const normalizeCustomIcon = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, EMOJI_INPUT_MAX_LENGTH) : null;
};

const clearTypeSpecificFields = (
  draft: WidgetSlotEditorDraft,
  nextType: WidgetSlotType
): WidgetSlotEditorDraft => {
  const baseDraft: WidgetSlotEditorDraft = {
    ...draft,
    slotType: nextType,
    categoryId: null,
    activityId: null,
    linkedTodoId: null,
    scopeIds: null,
    checkTemplateId: null,
    checkItemId: null,
    shortcutAction: null,
    label: null,
    backgroundColor: null
  };

  if (nextType === 'daily') {
    return {
      ...baseDraft,
      backgroundColor: draft.backgroundColor || DEFAULT_DAILY_WIDGET_COLOR
    };
  }

  if (nextType === 'shortcut') {
    return {
      ...baseDraft,
      backgroundColor: draft.backgroundColor || DEFAULT_SHORTCUT_WIDGET_COLOR
    };
  }

  return baseDraft;
};

export const WidgetSlotEditorModal: React.FC<WidgetSlotEditorModalProps> = ({
  isOpen,
  draft,
  categories,
  checkTemplates,
  todos,
  todoCategories,
  scopes,
  onClose,
  onSave
}) => {
  const [localDraft, setLocalDraft] = useState<WidgetSlotEditorDraft | null>(draft);
  const customColors = useCustomColors();

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

  const manualItems = useMemo(() => getEligibleNfcDailyCheckItems(checkTemplates), [checkTemplates]);
  const selectedDailyItem = useMemo(
    () => manualItems.find((item) => item.checkItemId === localDraft?.checkItemId) ?? null,
    [localDraft?.checkItemId, manualItems]
  );
  const selectedShortcutMeta = useMemo(
    () => SHORTCUT_WIDGET_ACTION_OPTIONS.find((item) => item.value === localDraft?.shortcutAction) || null,
    [localDraft?.shortcutAction]
  );

  const colorOptions = useMemo(() => {
    const deduped = new Set<string>();
    const values = [
      DEFAULT_DAILY_WIDGET_COLOR,
      DEFAULT_SHORTCUT_WIDGET_COLOR,
      ...SHORTCUT_WIDGET_ACTION_OPTIONS.map((item) => item.defaultColor),
      ...COLOR_OPTIONS.map((item) => item.lightHex),
      ...customColors.map((item) => item.color)
    ];

    return values.filter((value) => {
      const normalized = normalizeCustomColorHex(value);
      if (!normalized || deduped.has(normalized)) {
        return false;
      }
      deduped.add(normalized);
      return true;
    });
  }, [customColors]);

  if (!isOpen || !localDraft) {
    return null;
  }

  const setDraftField = <K extends keyof WidgetSlotEditorDraft>(
    key: K,
    value: WidgetSlotEditorDraft[K]
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

  const effectiveIcon = (() => {
    if (localDraft.slotType === 'timer') {
      return normalizeCustomIcon(localDraft.customIcon || '')
        || selectedActivity?.icon
        || selectedCategory?.icon
        || '\u2022';
    }
    if (localDraft.slotType === 'daily') {
      return normalizeCustomIcon(localDraft.customIcon || '') || selectedDailyItem?.icon || '\u2022';
    }
    if (localDraft.slotType === 'shortcut') {
      return normalizeCustomIcon(localDraft.customIcon || '')
        || getShortcutWidgetActionEmoji(localDraft.shortcutAction)
        || '\u2022';
    }
    return normalizeCustomIcon(localDraft.customIcon || '') || '\u2022';
  })();

  const effectiveTitle = (() => {
    if (localDraft.slotType === 'timer') {
      return selectedActivity?.name || '未配置计时器';
    }
    if (localDraft.slotType === 'daily') {
      return selectedDailyItem?.content || '未绑定日课';
    }
    if (localDraft.slotType === 'shortcut') {
      return selectedShortcutMeta?.label || '未配置快捷方式';
    }
    return '先选择槽位类型';
  })();

  const effectiveSubtitle = (() => {
    if (localDraft.slotType === 'timer') {
      return selectedCategory?.name || '请选择一个标签';
    }
    if (localDraft.slotType === 'daily') {
      return selectedDailyItem?.category || '选择后会显示对应日课项';
    }
    if (localDraft.slotType === 'shortcut') {
      return '点击后会直接执行应用内快捷动作';
    }
    return '这个槽位可以配置为计时器、日课或快捷方式';
  })();

  const effectiveColor = (() => {
    if (localDraft.slotType === 'daily') {
      return normalizeHexColor(localDraft.backgroundColor || '') || DEFAULT_DAILY_WIDGET_COLOR;
    }
    if (localDraft.slotType === 'shortcut') {
      return normalizeHexColor(localDraft.backgroundColor || '')
        || getShortcutWidgetActionColor(localDraft.shortcutAction)
        || DEFAULT_SHORTCUT_WIDGET_COLOR;
    }
    return '#FFFFFF';
  })();

  const canSave =
    localDraft.slotType === 'timer'
      ? Boolean((localDraft.categoryId || selectedCategoryId) && localDraft.activityId)
      : localDraft.slotType === 'daily'
        ? Boolean(localDraft.checkTemplateId && localDraft.checkItemId)
        : localDraft.slotType === 'shortcut'
          ? Boolean(localDraft.shortcutAction)
          : false;

  const handleSave = () => {
    if (!canSave || !localDraft.slotType) {
      return;
    }

    if (localDraft.slotType === 'timer') {
      onSave({
        ...localDraft,
        categoryId: localDraft.categoryId || selectedCategoryId || null,
        customIcon: normalizeCustomIcon(localDraft.customIcon || ''),
        backgroundColor: null,
        checkTemplateId: null,
        checkItemId: null,
        shortcutAction: null,
        label: null
      });
      return;
    }

    if (localDraft.slotType === 'daily' && selectedDailyItem) {
      onSave({
        ...localDraft,
        checkTemplateId: selectedDailyItem.checkTemplateId,
        checkItemId: selectedDailyItem.checkItemId,
        customIcon: normalizeCustomIcon(localDraft.customIcon || ''),
        backgroundColor: normalizeHexColor(localDraft.backgroundColor || '') || DEFAULT_DAILY_WIDGET_COLOR,
        categoryId: null,
        activityId: null,
        linkedTodoId: null,
        scopeIds: null,
        shortcutAction: null,
        label: selectedDailyItem.content
      });
      return;
    }

    if (localDraft.slotType === 'shortcut' && localDraft.shortcutAction) {
      onSave({
        ...localDraft,
        shortcutAction: localDraft.shortcutAction,
        label: getShortcutWidgetActionLabel(localDraft.shortcutAction),
        customIcon: normalizeCustomIcon(localDraft.customIcon || ''),
        backgroundColor:
          normalizeHexColor(localDraft.backgroundColor || '')
          || getShortcutWidgetActionColor(localDraft.shortcutAction)
          || DEFAULT_SHORTCUT_WIDGET_COLOR,
        categoryId: null,
        activityId: null,
        linkedTodoId: null,
        scopeIds: null,
        checkTemplateId: null,
        checkItemId: null
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/30 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-[#fdfbf7] shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <div className="text-sm font-bold text-stone-800">槽位 {localDraft.slotIndex + 1}</div>
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
              className={`flex h-24 w-24 items-center justify-center border border-stone-200 leading-none shadow-[0_10px_24px_rgba(15,23,42,0.08)] sm:h-28 sm:w-28 md:h-32 md:w-32 ${localDraft.slotType === 'shortcut' ? 'rounded-[28px]' : 'rounded-full'}`}
              style={{
                backgroundColor: localDraft.slotType === 'timer' || localDraft.slotType === null ? '#FFFFFF' : effectiveColor,
                containerType: 'size'
              } as React.CSSProperties}
            >
              <IconRenderer icon={effectiveIcon} size="56cqmin" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-widest text-stone-400">Preview</div>
              <div className="mt-2 truncate text-xl font-bold text-stone-800">{effectiveTitle}</div>
              <div className="mt-1 text-sm leading-6 text-stone-500">{effectiveSubtitle}</div>
            </div>
          </div>

          <div>
            <div className="mb-3 px-1">
              <h3 className="text-sm font-bold text-stone-800">槽位类型</h3>
              <p className="mt-1 text-xs text-stone-400">先决定这个槽位是计时器、日课还是快捷方式。</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {SLOT_TYPE_OPTIONS.map((option) => {
                const isActive = localDraft.slotType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLocalDraft((previous) => previous ? clearTypeSpecificFields(previous, option.value) : previous)}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-all ${
                      isActive
                        ? 'border-stone-800 bg-stone-800 text-white shadow-sm'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {localDraft.slotType === 'timer' && (
            <>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Emoji</span>
                  <button
                    type="button"
                    onClick={() => setDraftField('customIcon', null)}
                    className="text-xs font-medium text-stone-400 transition-colors hover:text-stone-700"
                  >
                    跟随标签图标
                  </button>
                </div>
                <input
                  value={localDraft.customIcon || ''}
                  onChange={(event) => setDraftField('customIcon', event.target.value)}
                  placeholder={selectedActivity?.icon || selectedCategory?.icon || '⏱️'}
                  maxLength={EMOJI_INPUT_MAX_LENGTH}
                  className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-4 text-center text-3xl outline-none transition-colors focus:border-stone-400"
                />
              </div>

              <div>
                <div className="mb-4 px-1">
                  <h3 className="text-sm font-bold text-stone-800">标签</h3>
                  <p className="mt-1 text-xs text-stone-400">这是槽位的主活动，会决定开始和停止时的标签归属。</p>
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
            </>
          )}

          {localDraft.slotType === 'daily' && (
            <>
              <div>
                <div className="mb-4 px-1">
                  <h3 className="text-sm font-bold text-stone-800">绑定手动日课</h3>
                  <p className="mt-1 text-xs text-stone-400">这里只显示手动日课，自动日课暂时不能加入到小组件里。</p>
                </div>

                {manualItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-4 py-8 text-center text-sm text-stone-400">
                    还没有可绑定的手动日课
                  </div>
                ) : (
                  <CustomSelect
                    value={localDraft.checkItemId || ''}
                    options={manualItems.map((item) => ({
                      value: item.checkItemId,
                      label: item.manualMode === 'count'
                        ? `${item.category} / ${item.content}（目标 ${item.targetCount} 次）`
                        : `${item.category} / ${item.content}`
                    }))}
                    onChange={(checkItemId) => {
                      const nextItem = manualItems.find((item) => item.checkItemId === checkItemId);
                      if (!nextItem) {
                        return;
                      }
                      setLocalDraft((previousDraft) => {
                        if (!previousDraft) {
                          return previousDraft;
                        }
                        return {
                          ...previousDraft,
                          checkTemplateId: nextItem.checkTemplateId,
                          checkItemId: nextItem.checkItemId,
                          label: nextItem.content
                        };
                      });
                    }}
                    placeholder="请选择一个手动日课"
                  />
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Emoji</span>
                  <button
                    type="button"
                    onClick={() => setDraftField('customIcon', null)}
                    className="text-xs font-medium text-stone-400 transition-colors hover:text-stone-700"
                  >
                    跟随日课图标
                  </button>
                </div>
                <input
                  value={localDraft.customIcon || ''}
                  onChange={(event) => setDraftField('customIcon', event.target.value)}
                  placeholder={selectedDailyItem?.icon || '✅'}
                  maxLength={EMOJI_INPUT_MAX_LENGTH}
                  className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-4 text-center text-3xl outline-none transition-colors focus:border-stone-400"
                />
              </div>

              <div>
                <div className="mb-3 px-1">
                  <h3 className="text-sm font-bold text-stone-800">背景颜色</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {colorOptions.map((color) => {
                    const normalized = normalizeCustomColorHex(color) || DEFAULT_DAILY_WIDGET_COLOR;
                    const isActive = normalized === effectiveColor.toUpperCase();
                    return (
                      <button
                        key={normalized}
                        type="button"
                        onClick={() => setDraftField('backgroundColor', normalized)}
                        className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-105 ${isActive ? 'border-stone-800' : 'border-white'}`}
                        style={{ backgroundColor: normalized }}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {localDraft.slotType === 'shortcut' && (
            <>
              <div>
                <div className="mb-4 px-1">
                  <h3 className="text-sm font-bold text-stone-800">快捷动作</h3>
                  <p className="mt-1 text-xs text-stone-400">选择点击这个槽位后要打开或执行的应用内入口。</p>
                </div>
                <CustomSelect
                  value={localDraft.shortcutAction || ''}
                  options={SHORTCUT_WIDGET_ACTION_OPTIONS.map((item) => ({
                    value: item.value,
                    label: item.label
                  }))}
                  onChange={(value) => {
                    const nextAction = value as ShortcutWidgetAction;
                    setLocalDraft((previousDraft) => {
                      if (!previousDraft) {
                        return previousDraft;
                      }
                      return {
                        ...previousDraft,
                        shortcutAction: nextAction,
                        label: getShortcutWidgetActionLabel(nextAction),
                        backgroundColor: previousDraft.backgroundColor || getShortcutWidgetActionColor(nextAction)
                      };
                    });
                  }}
                  placeholder="选择一个快捷动作"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Emoji</span>
                  <button
                    type="button"
                    onClick={() => setDraftField('customIcon', null)}
                    className="text-xs font-medium text-stone-400 transition-colors hover:text-stone-700"
                  >
                    使用动作默认 emoji
                  </button>
                </div>
                <input
                  value={localDraft.customIcon || ''}
                  onChange={(event) => setDraftField('customIcon', event.target.value)}
                  placeholder={getShortcutWidgetActionEmoji(localDraft.shortcutAction)}
                  maxLength={EMOJI_INPUT_MAX_LENGTH}
                  className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-4 text-center text-3xl outline-none transition-colors focus:border-stone-400"
                />
              </div>

              <div>
                <div className="mb-3 px-1">
                  <h3 className="text-sm font-bold text-stone-800">背景颜色</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {colorOptions.map((color) => {
                    const normalized = normalizeCustomColorHex(color) || DEFAULT_SHORTCUT_WIDGET_COLOR;
                    const isActive = normalized === effectiveColor.toUpperCase();
                    return (
                      <button
                        key={normalized}
                        type="button"
                        onClick={() => setDraftField('backgroundColor', normalized)}
                        className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-105 ${isActive ? 'border-stone-800' : 'border-white'}`}
                        style={{ backgroundColor: normalized }}
                      />
                    );
                  })}
                </div>
              </div>

              {selectedShortcutMeta && (
                <div className="rounded-3xl border border-stone-200 bg-white px-4 py-4">
                  <div className="text-sm font-semibold text-stone-800">{selectedShortcutMeta.label}</div>
                  <div className="mt-1 text-xs leading-5 text-stone-500">{selectedShortcutMeta.description}</div>
                </div>
              )}
            </>
          )}
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
