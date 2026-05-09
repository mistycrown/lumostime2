/**
 * @file WidgetTrackingCalendarEditorModal.tsx
 * @input Tracking-calendar draft, category/scope/daily sources, save handler
 * @output Modal editor for the dedicated 2x2 tracking calendar widget template
 * @pos Component
 * @description Lets the user pick one tracked target plus icon/color options for the dedicated monthly tracking widget.
 * @updated 2026-05-01: Added the first tracking-calendar editor so dedicated 2x2 calendar widgets can follow tags, scopes, or daily checks.
 * @updated 2026-05-01: Cleaned all localized copy and aligned the preview wording with the new tracking-calendar visual design.
 * @updated 2026-05-03: Reordered the flow to bind the tracked object before choosing icon mode, and let daily bindings fall back to their default UI icon with one tap.
 * @updated 2026-05-03: Removed helper copy under section titles in the tracking-object editor to keep the sheet more minimal.
 * @updated 2026-05-03: Normalized tracking-color selection comparisons so preset palette colors and custom color-group entries share the same selected outline state.
 * @updated 2026-05-04: Switched the theme-color palette to an auto-fit grid so mobile sheets distribute swatches evenly without leaving a large right-side gap.
 * @updated 2026-05-04: Expanded daily tracking bindings to include all enabled daily checks instead of only manual punchable items.
 * @updated 2026-05-09: Sorted scope source options by the shared scope-order helper so widget scope pickers match management order.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { COLOR_OPTIONS } from '../constants';
import { useCustomColors } from '../hooks/useCustomColors';
import { normalizeCustomColorHex } from '../services/customColorGroupService';
import { UIIconType, uiIconService } from '../services/uiIconService';
import { DEFAULT_TRACKING_CALENDAR_COLOR, WidgetTrackingCalendarSourceType } from '../services/widgetService';
import { Category, CheckTemplate, Scope } from '../types';
import { getColorHexForCharts } from '../utils/colorAdapterUtils';
import { normalizeHexColor } from '../utils/colorUtils';
import { getEligibleTrackingCalendarDailyCheckItems } from '../utils/dailyCheckUtils';
import { sortActiveScopesByOrder } from '../utils/scopeSortUtils';
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

const clampColorChannel = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

const COLOR_SWATCH_GRID_STYLE: React.CSSProperties = {
  gridTemplateColumns: 'repeat(auto-fit, minmax(2.75rem, 1fr))'
};

const getColorSelectionOutline = (hex: string): string => {
  const normalized = normalizeCustomColorHex(hex);
  if (!normalized) {
    return 'rgba(68, 64, 60, 0.9)';
  }

  const raw = normalized.slice(1);
  const expanded = raw.length === 3
    ? raw.split('').map((char) => char + char).join('')
    : raw;

  const red = parseInt(expanded.slice(0, 2), 16);
  const green = parseInt(expanded.slice(2, 4), 16);
  const blue = parseInt(expanded.slice(4, 6), 16);

  return `rgba(${clampColorChannel(red * 0.68)}, ${clampColorChannel(green * 0.68)}, ${clampColorChannel(blue * 0.68)}, 0.96)`;
};

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

  const dailyItems = useMemo(() => getEligibleTrackingCalendarDailyCheckItems(checkTemplates), [checkTemplates]);
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
  const activeScopes = useMemo(() => sortActiveScopesByOrder(scopes), [scopes]);
  const selectedDailyItem = useMemo(
    () => dailyItems.find((item) => item.checkItemId === localDraft?.checkItemId) || null,
    [dailyItems, localDraft?.checkItemId]
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

  const iconPlaceholder = (() => {
    if (localDraft.sourceType === 'tag') {
      return selectedActivity?.icon || selectedCategory?.icon || '🏷️';
    }
    if (localDraft.sourceType === 'scope') {
      return selectedScope?.icon || '🧭';
    }
    if (localDraft.sourceType === 'daily') {
      return selectedDailyItem?.icon || '✅';
    }
    return '•';
  })();

  const iconResetLabel = (() => {
    if (localDraft.sourceType === 'tag') {
      return '跟随标签图标';
    }
    if (localDraft.sourceType === 'scope') {
      return '跟随领域图标';
    }
    if (localDraft.sourceType === 'daily') {
      return '跟随日课图标';
    }
    return '清空';
  })();

  const defaultTrackingColor = (() => {
    if (localDraft.sourceType === 'tag') {
      return getColorHexForCharts(selectedActivity?.color || selectedCategory?.themeColor || '') || null;
    }
    if (localDraft.sourceType === 'scope') {
      return getColorHexForCharts(selectedScope?.themeColor || '') || null;
    }
    if (localDraft.sourceType === 'daily') {
      return DEFAULT_TRACKING_CALENDAR_COLOR;
    }
    return null;
  })();

  const effectiveColor = normalizeHexColor(localDraft.backgroundColor || '') || defaultTrackingColor;
  const normalizedEffectiveColor = effectiveColor ? normalizeCustomColorHex(effectiveColor) : null;
  const previewColor = effectiveColor ? `${effectiveColor}22` : '#FFFFFF';
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

  const renderUiIconSection = () => (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3 px-1">
        <div>
          <h3 className="text-sm font-bold text-stone-800">UI icon</h3>
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
              style={{ backgroundColor: previewColor, containerType: 'size' } as React.CSSProperties}
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

          {localDraft.sourceType === 'tag' && (
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
          )}

          {localDraft.sourceType === 'scope' && (
            <div>
              <div className="mb-4 px-1">
                <h3 className="text-sm font-bold text-stone-800">领域</h3>
              </div>
              <CustomSelect
                value={localDraft.scopeId || ''}
                options={activeScopes.map((scope) => ({
                  value: scope.id,
                  label: scope.name
                }))}
                onChange={(scopeId) => setDraftField('scopeId', scopeId || null)}
                placeholder="请选择一个领域"
              />
            </div>
          )}

          {localDraft.sourceType === 'daily' && (
            <div>
              <div className="mb-4 px-1">
                <h3 className="text-sm font-bold text-stone-800">绑定日课</h3>
              </div>

              {dailyItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-4 py-8 text-center text-sm text-stone-400">
                  还没有可绑定的日课
                </div>
              ) : (
                <CustomSelect
                  value={localDraft.checkItemId || ''}
                  options={dailyItems.map((item) => ({
                    value: item.checkItemId,
                    label: item.manualMode === 'count'
                      ? `${item.category} / ${item.content}（目标 ${item.targetCount} 次）`
                      : `${item.category} / ${item.content}`
                  }))}
                  onChange={(checkItemId) => {
                    const nextItem = dailyItems.find((item) => item.checkItemId === checkItemId);
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
                  placeholder="请选择一个日课"
                />
              )}
            </div>
          )}

          {localDraft.sourceType && (
            <>
              {canUseUiIcon && (
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

              {!canUseUiIcon || localDraft.iconMode === 'emoji'
                ? renderEmojiInput(iconPlaceholder, iconResetLabel)
                : renderUiIconSection()}
            </>
          )}

          {localDraft.sourceType && (
            <div>
              <div className="mb-3 flex items-center justify-between px-1">
                <div>
                  <h3 className="text-sm font-bold text-stone-800">主题颜色</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDraftField('backgroundColor', null)}
                  className="text-xs font-medium text-stone-400 transition-colors hover:text-stone-700"
                >
                  {localDraft.sourceType === 'daily' ? '不设置' : '跟随默认'}
                </button>
              </div>
              <div className="grid gap-3" style={COLOR_SWATCH_GRID_STYLE}>
                {colorOptions.map((color) => {
                  const normalized = normalizeCustomColorHex(color);
                  if (!normalized) {
                    return null;
                  }
                  const isActive = normalized === normalizedEffectiveColor;
                  return (
                    <button
                      key={normalized}
                      type="button"
                      onClick={() => setDraftField('backgroundColor', normalized)}
                      aria-pressed={isActive}
                      className="aspect-square w-full rounded-full border-0 bg-white p-[2px] transition-colors hover:scale-105"
                      style={{
                        boxShadow: isActive
                          ? `0 0 0 2px rgba(255,255,255,0.98), 0 0 0 4px ${getColorSelectionOutline(normalized)}`
                          : '0 0 0 1px rgba(255,255,255,0.84)'
                      }}
                    >
                      <span
                        className="block h-full w-full rounded-full"
                        style={{ backgroundColor: normalized }}
                      />
                    </button>
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
