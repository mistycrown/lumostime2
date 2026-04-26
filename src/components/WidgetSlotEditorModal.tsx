/**
 * @file WidgetSlotEditorModal.tsx
 * @input Unified widget slot draft, category/check/todo/scope sources, save handler
 * @output Slot editor modal that lets users choose a slot type before editing slot-specific fields
 * @pos Component
 * @description Unifies timer, daily, and shortcut widget slot editing into a single modal so each slot can choose its own behavior type.
 * @updated 2026-04-18: Added slot-type-first editing flow for mixed widget templates.
 * @updated 2026-04-25: Added supporter-gated widget UI icon mode while keeping emoji-only editing as the fallback path.
 * @updated 2026-04-25: Added quick-apply UI icon defaults so widget slots can inherit tag and shortcut UI icons with one tap.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { COLOR_OPTIONS } from '../constants';
import { useCustomColors } from '../hooks/useCustomColors';
import { normalizeCustomColorHex } from '../services/customColorGroupService';
import { uiIconService } from '../services/uiIconService';
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
import { Category, CheckTemplate, Scope, TodoCategory, TodoItem } from '../types';
import { getWidgetSlotFillColor } from '../utils/colorAdapterUtils';
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

  const updateDraft = (updater: (draft: WidgetSlotEditorDraft) => WidgetSlotEditorDraft) => {
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
      return selectedActivity?.icon || selectedCategory?.icon || '\u2022';
    }
    if (localDraft.slotType === 'daily') {
      return selectedDailyItem?.icon || '\u2022';
    }
    if (localDraft.slotType === 'shortcut') {
      return getShortcutWidgetActionEmoji(localDraft.shortcutAction) || '\u2022';
    }
    return '\u2022';
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

  const defaultUiIconApplyLabel = (() => {
    if (localDraft.slotType === 'timer') {
      return '跟随标签 UI Icon';
    }
    if (localDraft.slotType === 'daily') {
      return '跟随日课 UI Icon';
    }
    if (localDraft.slotType === 'shortcut') {
      return '使用动作默认 UI Icon';
    }
    return '快速应用默认 UI Icon';
  })();

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
      return '点击后会直接执行应用内快捷动作';
    }
    return '这个槽位可以配置成计时器、日课或快捷方式';
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

  const previewFillColor = (() => {
    if (localDraft.slotType === 'daily' || localDraft.slotType === 'shortcut') {
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

  const renderUiIconSection = (description: string) => (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3 px-1">
        <div>
          <h3 className="text-sm font-bold text-stone-800">UI icon</h3>
          <p className="mt-1 text-xs text-stone-400">{description}</p>
        </div>
        {defaultUiIcon && (
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
            {defaultUiIconApplyLabel}
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
              <p className="mt-1 text-xs text-stone-400">先决定这个槽位是计时器、日课还是快捷方式。</p>
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

          {canUseUiIcon && (
            <div>
              <div className="mb-3 px-1">
                <h3 className="text-sm font-bold text-stone-800">图标样式</h3>
                <p className="mt-1 text-xs text-stone-400">已输入兑换码并启用 UI 主题后，可以切换为本地 UI icon 渲染。</p>
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
          )}

          {localDraft.slotType === 'timer' && (
            <>
              {localDraft.iconMode === 'emoji'
                ? renderEmojiInput(selectedActivity?.icon || selectedCategory?.icon || '⏰', '跟随标签图标')
                : renderUiIconSection('选择后会使用当前 UI 主题下的本地图标资源渲染桌面小组件。')}

              <div>
                <div className="mb-4 px-1">
                  <h3 className="text-sm font-bold text-stone-800">标签</h3>
                  <p className="mt-1 text-xs text-stone-400">这是槽位的主活动，会决定开始和停止时的归属。</p>
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
                      updateDraft((previousDraft) => ({
                        ...previousDraft,
                        checkTemplateId: nextItem.checkTemplateId,
                        checkItemId: nextItem.checkItemId,
                        label: nextItem.content
                      }));
                    }}
                    placeholder="请选择一个手动日课"
                  />
                )}
              </div>

              {localDraft.iconMode === 'emoji'
                ? renderEmojiInput(selectedDailyItem?.icon || '✓', '跟随日课图标')
                : renderUiIconSection('选择后会把当前 UI 主题图标同步到桌面小组件。')}

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
                        className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-105 ${
                          isActive ? 'border-stone-800' : 'border-white'
                        }`}
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
                    updateDraft((previousDraft) => ({
                      ...previousDraft,
                      shortcutAction: nextAction,
                      label: getShortcutWidgetActionLabel(nextAction),
                      backgroundColor: previousDraft.backgroundColor || getShortcutWidgetActionColor(nextAction)
                    }));
                  }}
                  placeholder="选择一个快捷动作"
                />
              </div>

              {localDraft.iconMode === 'emoji'
                ? renderEmojiInput(getShortcutWidgetActionEmoji(localDraft.shortcutAction), '使用动作默认 emoji')
                : renderUiIconSection('快捷方式也可以改成当前 UI 主题的图标资源显示。')}

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
                        className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-105 ${
                          isActive ? 'border-stone-800' : 'border-white'
                        }`}
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
