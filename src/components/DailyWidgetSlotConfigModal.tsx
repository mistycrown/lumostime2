/**
 * @file DailyWidgetSlotConfigModal.tsx
 * @input Daily widget slot draft, daily check templates, custom color palette
 * @output Slot configuration modal for daily widgets
 * @pos Component
 * @description Lets the user bind one daily widget slot to a manual daily check item, optionally override its icon, and choose a background color.
 * @updated 2026-04-17: Switched daily binding to a dropdown selector and improved tablet preview scaling.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { COLOR_OPTIONS } from '../constants';
import { CheckTemplate } from '../types';
import { useCustomColors } from '../hooks/useCustomColors';
import { normalizeCustomColorHex } from '../services/customColorGroupService';
import { DEFAULT_DAILY_WIDGET_COLOR } from '../services/widgetService';
import { getEligibleNfcDailyCheckItems } from '../utils/dailyCheckUtils';
import { normalizeHexColor } from '../utils/colorUtils';
import { CustomSelect } from './CustomSelect';
import { IconRenderer } from './IconRenderer';

export interface DailyWidgetSlotConfigDraft {
  slotIndex: number;
  checkTemplateId: string | null;
  checkItemId: string | null;
  customIcon: string | null;
  backgroundColor: string | null;
}

interface DailyWidgetSlotConfigModalProps {
  isOpen: boolean;
  draft: DailyWidgetSlotConfigDraft | null;
  checkTemplates: CheckTemplate[];
  onClose: () => void;
  onSave: (draft: DailyWidgetSlotConfigDraft) => void;
}

const EMOJI_INPUT_MAX_LENGTH = 8;

const normalizeCustomIcon = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, EMOJI_INPUT_MAX_LENGTH) : null;
};

export const DailyWidgetSlotConfigModal: React.FC<DailyWidgetSlotConfigModalProps> = ({
  isOpen,
  draft,
  checkTemplates,
  onClose,
  onSave
}) => {
  const [localDraft, setLocalDraft] = useState<DailyWidgetSlotConfigDraft | null>(draft);
  const customColors = useCustomColors();

  useEffect(() => {
    setLocalDraft(draft);
  }, [draft]);

  const manualItems = useMemo(() => getEligibleNfcDailyCheckItems(checkTemplates), [checkTemplates]);

  const bindingOptions = useMemo(
    () =>
      manualItems.map((item) => ({
        value: item.checkItemId,
        label:
          item.manualMode === 'count'
            ? `${item.category} / ${item.content}（目标 ${item.targetCount} 次）`
            : `${item.category} / ${item.content}`
      })),
    [manualItems]
  );

  const selectedItem = useMemo(
    () => manualItems.find((item) => item.checkItemId === localDraft?.checkItemId) ?? null,
    [localDraft?.checkItemId, manualItems]
  );

  const effectiveIcon =
    normalizeCustomIcon(localDraft?.customIcon || '') || selectedItem?.icon || '\u2022';
  const effectiveColor =
    normalizeHexColor(localDraft?.backgroundColor || '') || DEFAULT_DAILY_WIDGET_COLOR;
  const canSave = Boolean(localDraft?.checkTemplateId && localDraft?.checkItemId);

  const colorOptions = useMemo(() => {
    const deduped = new Set<string>();
    const values = [
      DEFAULT_DAILY_WIDGET_COLOR,
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

  const setDraftField = <K extends keyof DailyWidgetSlotConfigDraft>(
    key: K,
    value: DailyWidgetSlotConfigDraft[K]
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

  const handleSelectBinding = (checkItemId: string) => {
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
        checkItemId: nextItem.checkItemId
      };
    });
  };

  const handleSave = () => {
    if (!localDraft || !selectedItem) {
      return;
    }

    onSave({
      ...localDraft,
      checkTemplateId: selectedItem.checkTemplateId,
      checkItemId: selectedItem.checkItemId,
      customIcon: normalizeCustomIcon(localDraft.customIcon || ''),
      backgroundColor: normalizeHexColor(localDraft.backgroundColor || '') || DEFAULT_DAILY_WIDGET_COLOR
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/30 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-[#fdfbf7] shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <div>
            <div className="text-sm font-bold text-stone-800">日课槽位 {localDraft.slotIndex + 1}</div>
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
              className="flex h-24 w-24 items-center justify-center rounded-full border border-stone-200 leading-none shadow-[0_10px_24px_rgba(15,23,42,0.08)] sm:h-28 sm:w-28 md:h-32 md:w-32"
              style={{ backgroundColor: effectiveColor, containerType: 'size' } as React.CSSProperties}
            >
              <IconRenderer icon={effectiveIcon} size="58cqmin" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-widest text-stone-400">Preview</div>
              <div className="mt-2 truncate text-xl font-bold text-stone-800">
                {selectedItem?.content || '未绑定日课'}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-stone-500">
                <span>{selectedItem?.category || '请先选择一个日课项目'}</span>
                {selectedItem && (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500">
                    {selectedItem.manualMode === 'count'
                      ? `计数 · ${selectedItem.targetCount} 次`
                      : '布尔'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-4 px-1">
              <h3 className="text-sm font-bold text-stone-800">绑定手动日课</h3>
              <p className="mt-1 text-xs text-stone-400">
                这里只显示手动日课，自动日课暂时不能加入到小组件里。
              </p>
            </div>

            {bindingOptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-4 py-8 text-center text-sm text-stone-400">
                还没有可绑定的手动日课
              </div>
            ) : (
              <CustomSelect
                value={localDraft.checkItemId || ''}
                options={bindingOptions}
                onChange={handleSelectBinding}
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
                跟随日课模板图标
              </button>
            </div>
            <input
              value={localDraft.customIcon || ''}
              onChange={(event) => setDraftField('customIcon', event.target.value)}
              placeholder={selectedItem?.icon || '✅'}
              maxLength={EMOJI_INPUT_MAX_LENGTH}
              className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-4 text-center text-3xl outline-none transition-colors focus:border-stone-400"
            />
            <p className="mt-2 text-xs leading-5 text-stone-400">
              留空时会自动同步日课模板里的图标，你也可以填一个 emoji 单独覆盖。
            </p>
          </div>

          <div>
            <div className="mb-3 px-1">
              <h3 className="text-sm font-bold text-stone-800">背景颜色</h3>
              <p className="mt-1 text-xs text-stone-400">
                这里只改小组件槽位的背景，不会改动日课模板本身。
              </p>
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
                    title={normalized}
                  />
                );
              })}

              <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-stone-300 bg-white text-xs text-stone-500">
                <input
                  type="color"
                  value={effectiveColor}
                  onChange={(event) => setDraftField('backgroundColor', event.target.value)}
                  className="sr-only"
                />
                自定
              </label>
            </div>
          </div>
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
