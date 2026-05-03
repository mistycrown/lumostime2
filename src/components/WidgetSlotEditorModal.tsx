/**
 * @file WidgetSlotEditorModal.tsx
 * @input Widget slot draft plus category/check/todo/scope sources and save handler
 * @output Slot editor modal for timer, daily-check, and shortcut widget slots
 * @pos Component
 * @description Unified widget slot editor that lets each slot choose its own type, icon mode, source binding, and background color.
 * @updated 2026-05-03: Rewrote the file in UTF-8, cleaned all mojibake copy, and let daily UI icon mode follow the currently selected daily item.
 * @updated 2026-05-03: Added an explicit "follow default UI icon" action inside the UI icon picker so daily widget bindings expose the fallback entry more clearly.
 * @updated 2026-05-03: Moved timer icon-style editing below tag, todo, and scope binding so the source comes first.
 * @updated 2026-05-03: Added timer background-color selection and a shared default-color reset for timer, daily, and shortcut slots.
 * @updated 2026-05-03: Restored action-aware shortcut default colors so preview and saved slots stay aligned with shortcut metadata.
 * @updated 2026-04-25: Added supporter-gated widget UI icon mode while keeping emoji-only editing as the fallback path.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { COLOR_OPTIONS } from '../constants';
import { useCustomColors } from '../hooks/useCustomColors';
import { normalizeCustomColorHex } from '../services/customColorGroupService';
import { uiIconService } from '../services/uiIconService';
import { DEFAULT_DAILY_WIDGET_COLOR } from '../services/widgetService';
import {
  DEFAULT_SHORTCUT_WIDGET_COLOR,
  SHORTCUT_WIDGET_ACTION_OPTIONS,
  ShortcutWidgetAction,
  getShortcutWidgetActionColor,
  getShortcutWidgetActionEmoji,
  getShortcutWidgetActionLabel
} from '../services/widgetShortcutService';
import { Category, CheckTemplate, Scope, TodoCategory, TodoItem } from '../types';
import { getColorHexForCharts, getWidgetSlotFillColor } from '../utils/colorAdapterUtils';
import { getEligibleNfcDailyCheckItems } from '../utils/dailyCheckUtils';
import { normalizeHexColor } from '../utils/colorUtils';
import { CustomSelect } from './CustomSelect';
import { IconRenderer } from './IconRenderer';
import { ScopeAssociation } from './ScopeAssociation';
import { TagAssociation } from './TagAssociation';
import { TodoAssociation } from './TodoAssociation';
import { UIIconSelector } from './UIIconSelector';

export type WidgetSlotType = 'timer' | 'daily' | 'shortcut' | null;
export type WidgetSlotIconMode = 'emoji' | 'uiIcon';

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
  iconMode: WidgetSlotIconMode;
  uiIcon: string | null;
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
  canUseUiIcon: boolean;
  onClose: () => void;
  onSave: (draft: WidgetSlotEditorDraft) => void;
}

const EMOJI_INPUT_MAX_LENGTH = 8;

const SLOT_TYPE_OPTIONS: Array<{ value: Exclude<WidgetSlotType, null>; label: string }> = [
  { value: 'timer', label: '计时器' },
  { value: 'daily', label: '日课' },
  { value: 'shortcut', label: '快捷方式' }
];

const ICON_MODE_OPTIONS: Array<{ value: WidgetSlotIconMode; label: string }> = [
  { value: 'emoji', label: 'Emoji' },
  { value: 'uiIcon', label: 'UI Icon' }
];

const normalizeCustomIcon = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, EMOJI_INPUT_MAX_LENGTH) : null;
};

const resolveUiIconFromEmoji = (value?: string | null): string | null => {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith('ui:')) {
    return normalized;
  }

  const mapped = uiIconService.convertEmojiToUIIcon(normalized);
  return mapped.startsWith('ui:') ? mapped : null;
};

const applyIconSupportRules = (
  draft: WidgetSlotEditorDraft | null,
  canUseUiIcon: boolean
): WidgetSlotEditorDraft | null => {
  if (!draft) {
    return draft;
  }

  if (canUseUiIcon) {
    return draft;
  }

  return {
    ...draft,
    iconMode: 'emoji',
    uiIcon: null
  };
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
      backgroundColor: null
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
  canUseUiIcon,
  onClose,
  onSave
}) => {
  const [localDraft, setLocalDraft] = useState<WidgetSlotEditorDraft | null>(
    applyIconSupportRules(draft, canUseUiIcon)
  );
  const customColors = useCustomColors();

  useEffect(() => {
    setLocalDraft(applyIconSupportRules(draft, canUseUiIcon));
  }, [canUseUiIcon, draft]);

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

  const updateDraft = (updater: (draftState: WidgetSlotEditorDraft) => WidgetSlotEditorDraft) => {
    setLocalDraft((previousDraft) => {
      if (!previousDraft) {
        return previousDraft;
      }
      return updater(previousDraft);
    });
  };

  const setDraftField = <K extends keyof WidgetSlotEditorDraft>(
    key: K,
    value: WidgetSlotEditorDraft[K]
  ) => {
    updateDraft((previousDraft) => ({
      ...previousDraft,
      [key]: value
    }));
  };

  const defaultEmojiIcon = (() => {
    if (localDraft.slotType === 'timer') {
      return selectedActivity?.icon || selectedCategory?.icon || '•';
    }
    if (localDraft.slotType === 'daily') {
      return selectedDailyItem?.icon || '✓';
    }
    if (localDraft.slotType === 'shortcut') {
      return getShortcutWidgetActionEmoji(localDraft.shortcutAction) || '•';
    }
    return '•';
  })();

  const defaultUiIcon = (() => {
    if (localDraft.slotType === 'timer') {
      return selectedActivity?.uiIcon
        || selectedCategory?.uiIcon
        || resolveUiIconFromEmoji(selectedActivity?.icon || selectedCategory?.icon || null);
    }
    if (localDraft.slotType === 'daily') {
      return selectedDailyItem?.uiIcon || resolveUiIconFromEmoji(selectedDailyItem?.icon || null);
    }
    if (localDraft.slotType === 'shortcut') {
      return resolveUiIconFromEmoji(getShortcutWidgetActionEmoji(localDraft.shortcutAction));
    }
    return null;
  })();

  const canApplyDefaultUiIcon = Boolean(defaultUiIcon);

  const setIconMode = (nextMode: WidgetSlotIconMode) => {
    updateDraft((previousDraft) => ({
      ...previousDraft,
      iconMode: nextMode,
      customIcon: nextMode === 'emoji' ? previousDraft.customIcon : null,
      uiIcon: nextMode === 'uiIcon' ? (previousDraft.uiIcon || defaultUiIcon) : null
    }));
  };

  const effectiveIcon =
    canUseUiIcon && localDraft.iconMode === 'uiIcon' && localDraft.uiIcon
      ? localDraft.uiIcon
      : normalizeCustomIcon(localDraft.customIcon || '') || defaultEmojiIcon;

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
      return selectedDailyItem?.category || '选择后会显示对应日课项目';
    }
    if (localDraft.slotType === 'shortcut') {
      return '点击后会直接执行对应的快捷动作';
    }
    return '这个槽位可以配置成计时器、日课或快捷方式';
  })();

  const defaultBackgroundColor = (() => {
    if (localDraft.slotType === 'timer') {
      return getColorHexForCharts(selectedActivity?.color || selectedCategory?.themeColor || '') || DEFAULT_DAILY_WIDGET_COLOR;
    }
    if (localDraft.slotType === 'daily') {
      return DEFAULT_DAILY_WIDGET_COLOR;
    }
    if (localDraft.slotType === 'shortcut') {
      return getShortcutWidgetActionColor(localDraft.shortcutAction) || DEFAULT_SHORTCUT_WIDGET_COLOR;
    }
    return '#FFFFFF';
  })();

  const effectiveColor = (() => {
    if (localDraft.slotType === 'timer') {
      return normalizeHexColor(localDraft.backgroundColor || '') || defaultBackgroundColor;
    }
    if (localDraft.slotType === 'daily') {
      return normalizeHexColor(localDraft.backgroundColor || '') || defaultBackgroundColor;
    }
    if (localDraft.slotType === 'shortcut') {
      return normalizeHexColor(localDraft.backgroundColor || '') || defaultBackgroundColor;
    }
    return '#FFFFFF';
  })();

  const previewFillColor = (() => {
    if (localDraft.slotType === 'timer' || localDraft.slotType === 'daily' || localDraft.slotType === 'shortcut') {
      return getWidgetSlotFillColor(effectiveColor, false);
    }
    return '#FFFFFF';
  })();

  const canSaveSlotType =
    localDraft.slotType === 'timer'
      ? Boolean((localDraft.categoryId || selectedCategoryId) && localDraft.activityId)
      : localDraft.slotType === 'daily'
        ? Boolean(localDraft.checkTemplateId && localDraft.checkItemId)
        : localDraft.slotType === 'shortcut'
          ? Boolean(localDraft.shortcutAction)
          : false;

  const hasValidIconSelection =
    !canUseUiIcon
    || localDraft.iconMode === 'emoji'
    || Boolean(localDraft.uiIcon);

  const handleSave = () => {
    if (!canSaveSlotType || !hasValidIconSelection || !localDraft.slotType) {
      return;
    }

    const nextIconMode: WidgetSlotIconMode =
      canUseUiIcon && localDraft.iconMode === 'uiIcon' ? 'uiIcon' : 'emoji';
    const nextUiIcon = nextIconMode === 'uiIcon' ? localDraft.uiIcon : null;
    const nextCustomIcon = nextIconMode === 'emoji'
      ? normalizeCustomIcon(localDraft.customIcon || '')
      : null;

    if (localDraft.slotType === 'timer') {
      onSave({
        ...localDraft,
        categoryId: localDraft.categoryId || selectedCategoryId || null,
        customIcon: nextCustomIcon,
        iconMode: nextIconMode,
        uiIcon: nextUiIcon,
        backgroundColor: normalizeHexColor(localDraft.backgroundColor || '') || defaultBackgroundColor,
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
        customIcon: nextCustomIcon,
        iconMode: nextIconMode,
        uiIcon: nextUiIcon,
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
        customIcon: nextCustomIcon,
        iconMode: nextIconMode,
        uiIcon: nextUiIcon,
        backgroundColor: normalizeHexColor(localDraft.backgroundColor || '') || defaultBackgroundColor,
        categoryId: null,
        activityId: null,
        linkedTodoId: null,
        scopeIds: null,
        checkTemplateId: null,
        checkItemId: null
      });
    }
  };

  const renderEmojiInput = (
    placeholder: string,
    resetLabel: string
  ) => (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Emoji</span>
        <button
          type="button"
          onClick={() => setDraftField('customIcon', null)}
          className="text-xs font-medium text-stone-400 transition-colors hover:text-stone-700"
        >
          {resetLabel}
        </button>
      </div>
      <input
        value={localDraft.customIcon || ''}
        onChange={(event) => setDraftField('customIcon', event.target.value)}
        placeholder={placeholder}
        maxLength={EMOJI_INPUT_MAX_LENGTH}
        className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-4 text-center text-3xl outline-none transition-colors focus:border-stone-400"
      />
    </div>
  );

  const renderUiIconSection = () => (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3 px-1">
        <div>
          <h3 className="text-sm font-bold text-stone-800">UI icon</h3>
        </div>
        {canApplyDefaultUiIcon && (
          <button
            type="button"
            onClick={() => {
              updateDraft((previousDraft) => ({
                ...previousDraft,
                iconMode: 'uiIcon',
                uiIcon: defaultUiIcon,
                customIcon: null
              }));
            }}
            className="shrink-0 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-medium text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-800"
          >
            跟随默认 UI Icon
          </button>
        )}
      </div>
      <UIIconSelector
        currentIcon={defaultEmojiIcon}
        currentUiIcon={localDraft.uiIcon || undefined}
        onSelectDual={(_, uiIcon) => {
          updateDraft((previousDraft) => ({
            ...previousDraft,
            iconMode: uiIcon ? 'uiIcon' : 'emoji',
            uiIcon: uiIcon || null,
            customIcon: null
          }));
        }}
      />
    </div>
  );

  const renderIconModeSection = () => (
    <div>
      <div className="mb-3 px-1">
        <h3 className="text-sm font-bold text-stone-800">图标样式</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {ICON_MODE_OPTIONS.map((option) => {
          const isActive = localDraft.iconMode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setIconMode(option.value)}
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
  );

  const renderBackgroundColorSection = () => (
    <div>
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-sm font-bold text-stone-800">背景颜色</h3>
        <button
          type="button"
          onClick={() => setDraftField('backgroundColor', null)}
          className="text-xs font-medium text-stone-400 transition-colors hover:text-stone-700"
        >
          使用默认颜色
        </button>
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
              className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-105 ${
                isActive ? 'border-stone-800' : 'border-white'
              }`}
              style={{ backgroundColor: normalized }}
            />
          );
        })}
      </div>
    </div>
  );

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
              className={`flex h-24 w-24 items-center justify-center border border-stone-200 leading-none shadow-[0_10px_24px_rgba(15,23,42,0.08)] sm:h-28 sm:w-28 md:h-32 md:w-32 ${
                localDraft.slotType === 'shortcut' ? 'rounded-[28px]' : 'rounded-full'
              }`}
              style={{
                backgroundColor: previewFillColor,
                containerType: 'size'
              } as React.CSSProperties}
            >
              <IconRenderer key={effectiveIcon} icon={effectiveIcon} size="56cqmin" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-widest text-stone-400">Preview</div>
              <div className="mt-2 truncate text-xl font-bold text-stone-800">{effectiveTitle}</div>
              <div className="mt-1 text-sm leading-6 text-stone-500">{effectiveSubtitle}</div>
              {canUseUiIcon && (
                <div className="mt-2 text-xs font-medium text-stone-400">
                  {localDraft.iconMode === 'uiIcon' ? '当前使用 UI icon 渲染' : '当前使用 emoji 渲染'}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 px-1">
              <h3 className="text-sm font-bold text-stone-800">槽位类型</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {SLOT_TYPE_OPTIONS.map((option) => {
                const isActive = localDraft.slotType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateDraft((previousDraft) => clearTypeSpecificFields(previousDraft, option.value))}
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

          {canUseUiIcon && localDraft.slotType && localDraft.slotType !== 'timer' && renderIconModeSection()}

          {localDraft.slotType === 'timer' && (
            <>
              <div>
                <div className="mb-4 px-1">
                  <h3 className="text-sm font-bold text-stone-800">标签</h3>
                </div>
                <TagAssociation
                  categories={categories}
                  selectedCategoryId={selectedCategoryId}
                  selectedActivityId={localDraft.activityId || ''}
                  onCategorySelect={(categoryId) => {
                    updateDraft((previousDraft) => ({
                      ...previousDraft,
                      categoryId,
                      activityId: previousDraft.categoryId === categoryId ? previousDraft.activityId : null
                    }));
                  }}
                  onActivitySelect={(activityId) => {
                    updateDraft((previousDraft) => ({
                      ...previousDraft,
                      categoryId: previousDraft.categoryId || selectedCategoryId || null,
                      activityId: activityId || null
                    }));
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

              {canUseUiIcon && renderIconModeSection()}

              {localDraft.iconMode === 'emoji'
                ? renderEmojiInput(selectedActivity?.icon || selectedCategory?.icon || '⏱', '跟随标签图标')
                : renderUiIconSection()}

              {renderBackgroundColorSection()}
            </>
          )}

          {localDraft.slotType === 'daily' && (
            <>
              <div>
                <div className="mb-4 px-1">
                  <h3 className="text-sm font-bold text-stone-800">绑定手动日课</h3>
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
                      icon: (item.icon || item.uiIcon)
                        ? <IconRenderer icon={item.icon || ''} uiIcon={item.uiIcon} size={16} />
                        : undefined,
                      label: item.manualMode === 'count'
                        ? `${item.category} / ${item.content}（目标 ${item.targetCount} 次）`
                        : `${item.category} / ${item.content}`
                    }))}
                    onChange={(checkItemId) => {
                      const nextItem = manualItems.find((item) => item.checkItemId === checkItemId);
                      if (!nextItem) {
                        return;
                      }
                      updateDraft((previousDraft) => ({
                        ...previousDraft,
                        checkTemplateId: nextItem.checkTemplateId,
                        checkItemId: nextItem.checkItemId,
                        label: nextItem.content,
                        uiIcon: previousDraft.iconMode === 'uiIcon'
                          ? (nextItem.uiIcon || resolveUiIconFromEmoji(nextItem.icon || null))
                          : previousDraft.uiIcon
                      }));
                    }}
                    placeholder="请选择一个手动日课"
                  />
                )}
              </div>

              {localDraft.iconMode === 'emoji'
                ? renderEmojiInput(selectedDailyItem?.icon || '✓', '跟随日课图标')
                : renderUiIconSection()}


              {renderBackgroundColorSection()}
            </>
          )}

          {localDraft.slotType === 'shortcut' && (
            <>
              <div>
                <div className="mb-4 px-1">
                  <h3 className="text-sm font-bold text-stone-800">快捷动作</h3>
                </div>
                <CustomSelect
                  value={localDraft.shortcutAction || ''}
                  options={SHORTCUT_WIDGET_ACTION_OPTIONS.map((item) => ({
                    value: item.value,
                    label: item.label
                  }))}
                  onChange={(value) => {
                    const nextAction = value as ShortcutWidgetAction;
                    updateDraft((previousDraft) => ({
                      ...previousDraft,
                      shortcutAction: nextAction,
                      label: getShortcutWidgetActionLabel(nextAction),
                      backgroundColor: (() => {
                        const currentColor = normalizeHexColor(previousDraft.backgroundColor || '');
                        const previousDefaultColor = getShortcutWidgetActionColor(previousDraft.shortcutAction);
                        if (!currentColor || currentColor === previousDefaultColor.toUpperCase()) {
                          return getShortcutWidgetActionColor(nextAction);
                        }
                        return previousDraft.backgroundColor;
                      })()
                    }));
                  }}
                  placeholder="选择一个快捷动作"
                />
              </div>

              {localDraft.iconMode === 'emoji'
                ? renderEmojiInput(getShortcutWidgetActionEmoji(localDraft.shortcutAction), '使用动作默认 emoji')
                : renderUiIconSection()}


              {renderBackgroundColorSection()}
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
            disabled={!canSaveSlotType || !hasValidIconSelection}
            className="w-full rounded-2xl bg-stone-800 px-4 py-3 text-sm font-bold text-white transition-all active:scale-[0.99] disabled:opacity-40"
          >
            保存槽位
          </button>
        </div>
      </div>
    </div>
  );
};
