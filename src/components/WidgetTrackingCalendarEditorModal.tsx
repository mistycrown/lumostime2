/**
 * @file WidgetTrackingCalendarEditorModal.tsx
 * @input Tracking-calendar draft, category/scope/daily sources, save handler
 * @output Modal editor for the dedicated 2x2 tracking calendar widget template
 * @pos Component
 * @description Lets the user pick one tracked target plus icon/color options for the dedicated monthly tracking widget.
 * @updated 2026-05-01: Added the first tracking-calendar editor so dedicated 2x2 calendar widgets can follow tags, scopes, or daily checks.
 * @updated 2026-05-01: Cleaned all localized copy and aligned the preview wording with the new tracking-calendar visual design.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { COLOR_OPTIONS } from '../constants';
import { useCustomColors } from '../hooks/useCustomColors';
import { normalizeCustomColorHex } from '../services/customColorGroupService';
import { UIIconType, uiIconService } from '../services/uiIconService';
import { WidgetTrackingCalendarSourceType } from '../services/widgetService';
import { Category, CheckTemplate, Scope } from '../types';
import { normalizeHexColor } from '../utils/colorUtils';
import { getEligibleNfcDailyCheckItems } from '../utils/dailyCheckUtils';
import { CustomSelect } from './CustomSelect';
import { IconRenderer } from './IconRenderer';
import { TagAssociation } from './TagAssociation';
import { UIIconSelector } from './UIIconSelector';

export type WidgetTrackingCalendarIconMode = 'emoji' | 'uiIcon';

export interface WidgetTrackingCalendarEditorDraft {
  sourceType: WidgetTrackingCalendarSourceType | null;
  categoryId: string | null;
  activityId: string | null;
  scopeId: string | null;
  checkTemplateId: string | null;
  checkItemId: string | null;
  label: string | null;
  customIcon: string | null;
  iconMode: WidgetTrackingCalendarIconMode;
  uiIcon: string | null;
  backgroundColor: string | null;
}

interface WidgetTrackingCalendarEditorModalProps {
  isOpen: boolean;
  draft: WidgetTrackingCalendarEditorDraft | null;
  categories: Category[];
  checkTemplates: CheckTemplate[];
  scopes: Scope[];
  canUseUiIcon: boolean;
  onClose: () => void;
  onSave: (draft: WidgetTrackingCalendarEditorDraft) => void;
}

const EMOJI_INPUT_MAX_LENGTH = 8;

const SOURCE_OPTIONS: Array<{ value: WidgetTrackingCalendarSourceType; label: string }> = [
  { value: 'tag', label: '标签' },
  { value: 'scope', label: '领域' },
  { value: 'daily', label: '日课' }
];

const ICON_MODE_OPTIONS: Array<{ value: WidgetTrackingCalendarIconMode; label: string }> = [
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
  draft: WidgetTrackingCalendarEditorDraft | null,
  canUseUiIcon: boolean
): WidgetTrackingCalendarEditorDraft | null => {
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
  draft: WidgetTrackingCalendarEditorDraft,
  nextType: WidgetTrackingCalendarSourceType
): WidgetTrackingCalendarEditorDraft => ({
  ...draft,
  sourceType: nextType,
  categoryId: null,
  activityId: null,
  scopeId: null,
  checkTemplateId: null,
  checkItemId: null,
  label: null,
  backgroundColor: null
});

export const WidgetTrackingCalendarEditorModal: React.FC<WidgetTrackingCalendarEditorModalProps> = ({
  isOpen,
  draft,
  categories,
  checkTemplates,
  scopes,
  canUseUiIcon,
  onClose,
  onSave
}) => {
  const [localDraft, setLocalDraft] = useState<WidgetTrackingCalendarEditorDraft | null>(
    applyIconSupportRules(draft, canUseUiIcon)
  );
  const customColors = useCustomColors();

  useEffect(() => {
    setLocalDraft(applyIconSupportRules(draft, canUseUiIcon));
  }, [canUseUiIcon, draft]);

  const manualItems = useMemo(() => getEligibleNfcDailyCheckItems(checkTemplates), [checkTemplates]);
  const selectedCategoryId = localDraft?.categoryId || categories[0]?.id || '';
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) || categories[0],
    [categories, selectedCategoryId]
  );
  const selectedActivity = useMemo(
    () => selectedCategory?.activities.find((activity) => activity.id === localDraft?.activityId),
    [localDraft?.activityId, selectedCategory]
  );
  const selectedScope = useMemo(
    () => scopes.find((scope) => scope.id === localDraft?.scopeId) || null,
    [localDraft?.scopeId, scopes]
  );
  const selectedDailyItem = useMemo(
    () => manualItems.find((item) => item.checkItemId === localDraft?.checkItemId) || null,
    [localDraft?.checkItemId, manualItems]
  );

  const colorOptions = useMemo(() => {
    const deduped = new Set<string>();
    const values = [
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

  const updateDraft = (
    updater: (draftState: WidgetTrackingCalendarEditorDraft) => WidgetTrackingCalendarEditorDraft
  ) => {
    setLocalDraft((previousDraft) => {
      if (!previousDraft) {
        return previousDraft;
      }
      return updater(previousDraft);
    });
  };

  const setDraftField = <K extends keyof WidgetTrackingCalendarEditorDraft>(
    key: K,
    value: WidgetTrackingCalendarEditorDraft[K]
  ) => {
    updateDraft((previousDraft) => ({
      ...previousDraft,
      [key]: value
    }));
  };

  const defaultEmojiIcon = (() => {
    if (localDraft.sourceType === 'tag') {
      return selectedActivity?.icon || selectedCategory?.icon || '•';
    }
    if (localDraft.sourceType === 'scope') {
      return selectedScope?.icon || '•';
    }
    if (localDraft.sourceType === 'daily') {
      return selectedDailyItem?.icon || '•';
    }
    return '•';
  })();

  const defaultUiIcon = (() => {
    if (localDraft.sourceType === 'tag') {
      return selectedActivity?.uiIcon
        || selectedCategory?.uiIcon
        || resolveUiIconFromEmoji(selectedActivity?.icon || selectedCategory?.icon || null);
    }
    if (localDraft.sourceType === 'scope') {
      return selectedScope?.uiIcon || resolveUiIconFromEmoji(selectedScope?.icon || null);
    }
    if (localDraft.sourceType === 'daily') {
      return selectedDailyItem?.uiIcon || resolveUiIconFromEmoji(selectedDailyItem?.icon || null);
    }
    return null;
  })();

  const effectiveTitle = (() => {
    if (localDraft.sourceType === 'tag') {
      return selectedActivity?.name || '未选择标签';
    }
    if (localDraft.sourceType === 'scope') {
      return selectedScope?.name || '未选择领域';
    }
    if (localDraft.sourceType === 'daily') {
      return selectedDailyItem?.content || '未选择日课';
    }
    return '先选择追踪对象';
  })();

  const effectiveSubtitle = (() => {
    if (localDraft.sourceType === 'tag') {
      return selectedCategory?.name || '请选择一个标签';
    }
    if (localDraft.sourceType === 'scope') {
      return '当天有记录关联到这个领域时点亮';
    }
    if (localDraft.sourceType === 'daily') {
      return '当天这个日课完成时点亮';
    }
    return '可以追踪标签、领域或日课';
  })();

  const effectiveColor = normalizeHexColor(localDraft.backgroundColor || '') || null;
  const effectiveEmojiIcon = normalizeCustomIcon(localDraft.customIcon || '') || defaultEmojiIcon;
  const effectiveUiIcon =
    canUseUiIcon && localDraft.iconMode === 'uiIcon' ? (localDraft.uiIcon || undefined) : undefined;
  const parsedEffectiveUiIcon = effectiveUiIcon ? uiIconService.parseIconString(effectiveUiIcon) : null;
  const effectiveUiIconSrc =
    parsedEffectiveUiIcon?.isUIIcon
      ? uiIconService.getIconPathWithFallback(parsedEffectiveUiIcon.value as UIIconType).primary
      : null;

  const canSave =
    localDraft.sourceType === 'tag'
      ? Boolean((localDraft.categoryId || selectedCategoryId) && localDraft.activityId)
      : localDraft.sourceType === 'scope'
        ? Boolean(localDraft.scopeId)
        : localDraft.sourceType === 'daily'
          ? Boolean(localDraft.checkItemId)
          : false;

  const hasValidIconSelection =
    !canUseUiIcon
    || localDraft.iconMode === 'emoji'
    || Boolean(localDraft.uiIcon);

  const handleSave = () => {
    if (!canSave || !hasValidIconSelection || !localDraft.sourceType) {
      return;
    }

    const nextIconMode: WidgetTrackingCalendarIconMode =
      canUseUiIcon && localDraft.iconMode === 'uiIcon' ? 'uiIcon' : 'emoji';

    if (localDraft.sourceType === 'tag') {
      onSave({
        ...localDraft,
        categoryId: localDraft.categoryId || selectedCategoryId || null,
        label: selectedActivity?.name || null,
        customIcon: nextIconMode === 'emoji' ? normalizeCustomIcon(localDraft.customIcon || '') : null,
        iconMode: nextIconMode,
        uiIcon: nextIconMode === 'uiIcon' ? localDraft.uiIcon : null,
        backgroundColor: effectiveColor,
        scopeId: null,
        checkTemplateId: null,
        checkItemId: null
      });
      return;
    }

    if (localDraft.sourceType === 'scope') {
      onSave({
        ...localDraft,
        label: selectedScope?.name || null,
        customIcon: nextIconMode === 'emoji' ? normalizeCustomIcon(localDraft.customIcon || '') : null,
        iconMode: nextIconMode,
        uiIcon: nextIconMode === 'uiIcon' ? localDraft.uiIcon : null,
        backgroundColor: effectiveColor,
        categoryId: null,
        activityId: null,
        checkTemplateId: null,
        checkItemId: null
      });
      return;
    }

    onSave({
      ...localDraft,
      checkTemplateId: selectedDailyItem?.checkTemplateId || null,
      checkItemId: selectedDailyItem?.checkItemId || null,
      label: selectedDailyItem?.content || null,
      customIcon: nextIconMode === 'emoji' ? normalizeCustomIcon(localDraft.customIcon || '') : null,
      iconMode: nextIconMode,
      uiIcon: nextIconMode === 'uiIcon' ? localDraft.uiIcon : null,
      backgroundColor: effectiveColor,
      categoryId: null,
      activityId: null,
      scopeId: null
    });
  };

  const renderEmojiInput = (placeholder: string, resetLabel: string) => (
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

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/30 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-[#fdfbf7] shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <div className="text-sm font-bold text-stone-800">追踪对象</div>
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
              className="flex h-24 w-24 items-center justify-center rounded-full border border-stone-200 bg-white leading-none shadow-[0_10px_24px_rgba(15,23,42,0.08)] sm:h-28 sm:w-28 md:h-32 md:w-32"
              style={{ backgroundColor: effectiveColor || '#FFFFFF', containerType: 'size' } as React.CSSProperties}
            >
              {effectiveUiIconSrc ? (
                <img
                  src={effectiveUiIconSrc}
                  alt=""
                  className="h-[56cqmin] w-[56cqmin] object-contain"
                />
              ) : (
                <IconRenderer
                  key={effectiveEmojiIcon}
                  icon={effectiveEmojiIcon}
                  size="56cqmin"
                />
              )}
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
              <h3 className="text-sm font-bold text-stone-800">追踪类型</h3>
              <p className="mt-1 text-xs text-stone-400">选择这个月历要追踪标签、领域还是日课。</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {SOURCE_OPTIONS.map((option) => {
                const isActive = localDraft.sourceType === option.value;
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
                <p className="mt-1 text-xs text-stone-400">输入兑换码并启用 UI 主题后，可以切换成 UI icon。</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {ICON_MODE_OPTIONS.map((option) => {
                  const isActive = localDraft.iconMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        updateDraft((previousDraft) => ({
                          ...previousDraft,
                          iconMode: option.value,
                          customIcon: option.value === 'emoji' ? previousDraft.customIcon : null,
                          uiIcon: option.value === 'uiIcon' ? (previousDraft.uiIcon || defaultUiIcon) : null
                        }));
                      }}
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

          {localDraft.sourceType === 'tag' && (
            <>
              {localDraft.iconMode === 'emoji'
                ? renderEmojiInput(selectedActivity?.icon || selectedCategory?.icon || '🏷️', '跟随标签图标')
                : renderUiIconSection('标签可以直接跟随活动或分类自带的 UI icon。')}

              <div>
                <div className="mb-4 px-1">
                  <h3 className="text-sm font-bold text-stone-800">标签</h3>
                  <p className="mt-1 text-xs text-stone-400">当天存在至少一条命中该标签的记录时点亮。</p>
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
            </>
          )}

          {localDraft.sourceType === 'scope' && (
            <>
              {localDraft.iconMode === 'emoji'
                ? renderEmojiInput(selectedScope?.icon || '🧭', '跟随领域图标')
                : renderUiIconSection('领域可以跟随它本来的 UI icon。')}

              <div>
                <div className="mb-4 px-1">
                  <h3 className="text-sm font-bold text-stone-800">领域</h3>
                  <p className="mt-1 text-xs text-stone-400">当天有记录关联到这个领域时点亮。</p>
                </div>
                <CustomSelect
                  value={localDraft.scopeId || ''}
                  options={scopes.map((scope) => ({
                    value: scope.id,
                    label: scope.name
                  }))}
                  onChange={(scopeId) => setDraftField('scopeId', scopeId || null)}
                  placeholder="请选择一个领域"
                />
              </div>
            </>
          )}

          {localDraft.sourceType === 'daily' && (
            <>
              <div>
                <div className="mb-4 px-1">
                  <h3 className="text-sm font-bold text-stone-800">绑定手动日课</h3>
                  <p className="mt-1 text-xs text-stone-400">这里只显示手动日课，完成当天会点亮。</p>
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
                ? renderEmojiInput(selectedDailyItem?.icon || '✅', '跟随日课图标')
                : renderUiIconSection('日课也可以切到 UI icon，但颜色可以先留空。')}
            </>
          )}

          {localDraft.sourceType && (
            <div>
              <div className="mb-3 flex items-center justify-between px-1">
                <div>
                  <h3 className="text-sm font-bold text-stone-800">主题颜色</h3>
                  <p className="mt-1 text-xs text-stone-400">不选时会尽量跟随标签或领域原色；日课可以先留空。</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDraftField('backgroundColor', null)}
                  className="text-xs font-medium text-stone-400 transition-colors hover:text-stone-700"
                >
                  {localDraft.sourceType === 'daily' ? '不设置' : '跟随默认'}
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {colorOptions.map((color) => {
                  const normalized = normalizeCustomColorHex(color);
                  if (!normalized) {
                    return null;
                  }
                  const isActive = normalized === effectiveColor;
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
          )}
        </div>

        <div className="border-t border-stone-100 bg-white px-5 py-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || !hasValidIconSelection}
            className="w-full rounded-2xl bg-stone-800 px-4 py-3 text-sm font-bold text-white transition-all active:scale-[0.99] disabled:opacity-40"
          >
            保存追踪对象
          </button>
        </div>
      </div>
    </div>
  );
};
