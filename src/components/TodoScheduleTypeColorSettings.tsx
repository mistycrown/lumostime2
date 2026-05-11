/**
 * @file TodoScheduleTypeColorSettings.tsx
 * @input Shared schedule-type color settings plus change handler
 * @output Default/custom selector with per-type color picker rows
 * @pos Component (Settings)
 * @description Reuses the built-in palette and persisted custom color group so Todo schedule views can customize Arrange / Due / Repeat / Done / Trace colors from one shared UI block.
 * @updated 2026-05-11: Added the shared schedule-type color settings block used by the Todo month and bento display popups.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { COLOR_OPTIONS } from '../constants';
import { useCustomColors } from '../hooks/useCustomColors';
import { normalizeCustomColorHex } from '../services/customColorGroupService';
import {
  getTodoScheduleTypePreviewColors,
  type TodoScheduleTypeColorKey,
  type TodoScheduleTypeColorSettings as TodoScheduleTypeColorSettingsValue,
  TODO_SCHEDULE_TYPE_COLOR_ITEMS
} from '../services/todoScheduleColorService';
import { isStoredColorSelected } from '../utils/colorUtils';

interface TodoScheduleTypeColorSettingsProps {
  settings: TodoScheduleTypeColorSettingsValue;
  onChange: (nextSettings: TodoScheduleTypeColorSettingsValue) => void;
}

export const TodoScheduleTypeColorSettings: React.FC<TodoScheduleTypeColorSettingsProps> = ({
  settings,
  onChange
}) => {
  const customColors = useCustomColors();
  const [expandedKey, setExpandedKey] = useState<TodoScheduleTypeColorKey | null>(null);
  const previewColors = useMemo(
    () => getTodoScheduleTypePreviewColors(settings),
    [settings]
  );

  useEffect(() => {
    if (settings.mode !== 'custom') {
      setExpandedKey(null);
    }
  }, [settings.mode]);

  const handleModeChange = (mode: TodoScheduleTypeColorSettingsValue['mode']) => {
    if (settings.mode === mode) {
      return;
    }

    onChange({
      ...settings,
      mode,
      updatedAt: Date.now()
    });
  };

  const handleColorChange = (key: TodoScheduleTypeColorKey, color: string) => {
    const normalized = normalizeCustomColorHex(color);
    if (!normalized) {
      return;
    }

    onChange({
      ...settings,
      mode: 'custom',
      colors: {
        ...settings.colors,
        [key]: normalized
      },
      updatedAt: Date.now()
    });
  };

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white/88">
      <div className="border-b border-stone-100 px-4 py-3 text-[0.72rem] font-medium tracking-[0.08em] text-stone-400">
        排期类型颜色
      </div>

      <div className="p-3">
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { key: 'default' as const, label: '默认' },
            { key: 'custom' as const, label: '自定义' }
          ].map((option) => {
            const isSelected = settings.mode === option.key;

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => handleModeChange(option.key)}
                className={`rounded-xl px-3 py-2.5 text-center text-[14px] tracking-[0.04em] transition-colors ${
                  isSelected
                    ? 'bg-stone-100 text-slate-700'
                    : 'text-slate-500 hover:bg-stone-100/70 hover:text-slate-700'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {settings.mode === 'custom' && (
          <div className="mt-3 space-y-2">
            {TODO_SCHEDULE_TYPE_COLOR_ITEMS.map((item) => {
              const isExpanded = expandedKey === item.key;
              const currentColor = previewColors[item.key];

              return (
                <div
                  key={item.key}
                  className="overflow-hidden rounded-xl border border-stone-200/90 bg-stone-50/45"
                >
                  <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className="text-[13px] font-medium text-stone-700">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => setExpandedKey(isExpanded ? null : item.key)}
                      className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/80"
                      aria-expanded={isExpanded}
                      aria-label={`选择${item.label}颜色`}
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-stone-300"
                        style={{ backgroundColor: currentColor }}
                      />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-stone-200/80 bg-white/70 px-3 py-3">
                      <div className="grid grid-cols-6 gap-2">
                        {COLOR_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleColorChange(item.key, option.hex)}
                            title={option.label}
                            className={`h-8 w-8 rounded-full transition-all hover:scale-110 ${
                              isStoredColorSelected(currentColor, option.hex)
                                ? `ring-2 ${option.ring} ring-offset-2`
                                : ''
                            } ${option.picker}`}
                          />
                        ))}

                        {customColors.map((customColor) => (
                          <button
                            key={customColor.id}
                            type="button"
                            onClick={() => handleColorChange(item.key, customColor.color)}
                            title={customColor.color}
                            className={`h-8 w-8 rounded-full border border-stone-300 transition-all hover:scale-110 ${
                              isStoredColorSelected(currentColor, customColor.color)
                                ? 'ring-2 ring-stone-400 ring-offset-2'
                                : ''
                            }`}
                            style={{ backgroundColor: customColor.color }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
