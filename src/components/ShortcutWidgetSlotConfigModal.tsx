/**
 * @file ShortcutWidgetSlotConfigModal.tsx
 * @input Shortcut widget slot draft, custom color palette
 * @output Centered slot configuration modal for shortcut widgets
 * @pos Component
 * @description Lets the user bind one shortcut widget slot to an app shortcut action, customize its emoji, and choose its square background color.
 * @updated 2026-04-18: Replaced fixed Lucide icons with configurable emoji and background colors.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { COLOR_OPTIONS } from '../constants';
import { useCustomColors } from '../hooks/useCustomColors';
import { normalizeCustomColorHex } from '../services/customColorGroupService';
import {
  DEFAULT_SHORTCUT_WIDGET_COLOR,
  SHORTCUT_WIDGET_ACTION_OPTIONS,
  ShortcutWidgetAction,
  getShortcutWidgetActionColor,
  getShortcutWidgetActionEmoji,
  getShortcutWidgetActionLabel
} from '../services/widgetShortcutService';
import { normalizeHexColor } from '../utils/colorUtils';
import { CustomSelect } from './CustomSelect';
import { IconRenderer } from './IconRenderer';

export interface ShortcutWidgetSlotConfigDraft {
  slotIndex: number;
  shortcutAction: ShortcutWidgetAction | null;
  label: string | null;
  customIcon: string | null;
  backgroundColor: string | null;
}

interface ShortcutWidgetSlotConfigModalProps {
  isOpen: boolean;
  draft: ShortcutWidgetSlotConfigDraft | null;
  onClose: () => void;
  onSave: (draft: ShortcutWidgetSlotConfigDraft) => void;
}

const EMOJI_INPUT_MAX_LENGTH = 8;

const normalizeCustomIcon = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, EMOJI_INPUT_MAX_LENGTH) : null;
};

export const ShortcutWidgetSlotConfigModal: React.FC<ShortcutWidgetSlotConfigModalProps> = ({
  isOpen,
  draft,
  onClose,
  onSave
}) => {
  const [shortcutAction, setShortcutAction] = useState<ShortcutWidgetAction | null>(null);
  const [customIcon, setCustomIcon] = useState('');
  const [backgroundColor, setBackgroundColor] = useState<string | null>(null);
  const customColors = useCustomColors();

  useEffect(() => {
    if (!isOpen || !draft) {
      return;
    }

    setShortcutAction(draft.shortcutAction);
    setCustomIcon(draft.customIcon || '');
    setBackgroundColor(draft.backgroundColor || null);
  }, [draft, isOpen]);

  const selectedMeta = useMemo(
    () => SHORTCUT_WIDGET_ACTION_OPTIONS.find((item) => item.value === shortcutAction) || null,
    [shortcutAction]
  );

  const effectiveIcon =
    normalizeCustomIcon(customIcon) || getShortcutWidgetActionEmoji(shortcutAction);
  const effectiveColor =
    normalizeHexColor(backgroundColor || '') ||
    getShortcutWidgetActionColor(shortcutAction) ||
    DEFAULT_SHORTCUT_WIDGET_COLOR;

  const colorOptions = useMemo(() => {
    const deduped = new Set<string>();
    const values = [
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

  if (!isOpen || !draft) {
    return null;
  }

  const handleSave = () => {
    if (!shortcutAction) {
      return;
    }

    onSave({
      slotIndex: draft.slotIndex,
      shortcutAction,
      label: getShortcutWidgetActionLabel(shortcutAction),
      customIcon: normalizeCustomIcon(customIcon),
      backgroundColor: effectiveColor
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/30 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-[#fdfbf7] shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <div>
            <div className="text-sm font-bold text-stone-800">快捷按钮 {draft.slotIndex + 1}</div>
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
              className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-stone-200 leading-none shadow-[0_10px_24px_rgba(15,23,42,0.08)] sm:h-28 sm:w-28 md:h-32 md:w-32"
              style={{ backgroundColor: effectiveColor, containerType: 'size' } as React.CSSProperties}
            >
              <IconRenderer icon={effectiveIcon} size="54cqmin" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-widest text-stone-400">Preview</div>
              <div className="mt-2 truncate text-xl font-bold text-stone-800">
                {selectedMeta?.label || '未配置快捷动作'}
              </div>
              <div className="mt-1 text-sm leading-6 text-stone-500">
                桌面按钮会显示为方形背景中的 emoji，不显示文字名称。
              </div>
            </div>
          </div>

          <div>
            <div className="mb-4 px-1">
              <h3 className="text-sm font-bold text-stone-800">快捷动作</h3>
              <p className="mt-1 text-xs text-stone-400">
                选择点击这个按钮后要打开或执行的应用内入口。
              </p>
            </div>
            <CustomSelect
              value={shortcutAction || ''}
              options={SHORTCUT_WIDGET_ACTION_OPTIONS.map((item) => ({
                value: item.value,
                label: item.label
              }))}
              onChange={(value) => {
                const nextAction = value as ShortcutWidgetAction;
                setShortcutAction(nextAction);
                setBackgroundColor((previous) => previous || getShortcutWidgetActionColor(nextAction));
              }}
              placeholder="选择一个快捷动作"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Emoji</span>
              <button
                type="button"
                onClick={() => setCustomIcon('')}
                className="text-xs font-medium text-stone-400 transition-colors hover:text-stone-700"
              >
                使用动作默认 emoji
              </button>
            </div>
            <input
              value={customIcon}
              onChange={(event) => setCustomIcon(event.target.value)}
              placeholder={getShortcutWidgetActionEmoji(shortcutAction)}
              maxLength={EMOJI_INPUT_MAX_LENGTH}
              className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-4 text-center text-3xl outline-none transition-colors focus:border-stone-400"
            />
            <p className="mt-2 text-xs leading-5 text-stone-400">
              留空时会使用该快捷动作的默认 emoji，也可以输入一个你喜欢的 emoji 覆盖它。
            </p>
          </div>

          <div>
            <div className="mb-3 px-1">
              <h3 className="text-sm font-bold text-stone-800">背景颜色</h3>
              <p className="mt-1 text-xs text-stone-400">
                只影响这个快捷按钮的方形背景，不改变其他按钮。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {colorOptions.map((color) => {
                const normalized = normalizeCustomColorHex(color) || DEFAULT_SHORTCUT_WIDGET_COLOR;
                const isActive = normalized === effectiveColor.toUpperCase();
                return (
                  <button
                    key={normalized}
                    type="button"
                    onClick={() => setBackgroundColor(normalized)}
                    className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-105 ${
                      isActive ? 'border-stone-800' : 'border-white'
                    }`}
                    style={{ backgroundColor: normalized }}
                    title={normalized}
                  />
                );
              })}
            </div>
          </div>

          {selectedMeta && (
            <div className="rounded-3xl border border-stone-200 bg-white px-4 py-4">
              <div className="text-sm font-semibold text-stone-800">{selectedMeta.label}</div>
              <div className="mt-1 text-xs leading-5 text-stone-500">{selectedMeta.description}</div>
            </div>
          )}
        </div>

        <div className="border-t border-stone-100 bg-white px-5 py-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={!shortcutAction}
            className="w-full rounded-2xl bg-stone-800 px-4 py-3 text-sm font-bold text-white transition-all active:scale-[0.99] disabled:opacity-40"
          >
            保存快捷按钮
          </button>
        </div>
      </div>
    </div>
  );
};
