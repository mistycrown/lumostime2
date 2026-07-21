/**
 * @file ScheduleStyleSelector.tsx
 * @description Pill-style selector for switching the schedule chart rendering style in the sponsorship style tab.
 *
 * @updated 2026-03-28: Switched from preview cards to flat Chinese pill options for a cleaner, lighter selector.
 */

import React from 'react';
import { useSettings, ScheduleStyle } from '../contexts/SettingsContext';
import { Check } from 'lucide-react';

interface ScheduleStyleOption {
  value: ScheduleStyle;
  label: string;
  description: string;
}

const SCHEDULE_STYLE_OPTIONS: ScheduleStyleOption[] = [
  {
    value: 'default',
    label: '默认',
    description: '柔和描边与浅底色'
  },
  {
    value: 'classic',
    label: '经典',
    description: '边框更明确'
  },
  {
    value: 'minimal',
    label: '极简',
    description: '只保留轻结构线'
  },
  {
    value: 'solid',
    label: '实色',
    description: '色块更饱满'
  }
];

export const ScheduleStyleSelector: React.FC = () => {
  const { scheduleStyle, setScheduleStyle } = useSettings();

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <div className="p-4">
        <div>
          <h4 className="font-bold text-stone-700">日程图样式</h4>
          <p className="mt-1 text-xs leading-5 text-stone-400">用于统计页日图、周日程图的显示风格。</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {SCHEDULE_STYLE_OPTIONS.map((option) => {
            const isSelected = option.value === scheduleStyle;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setScheduleStyle(option.value)}
                className={`schedule-style-option ${isSelected ? 'schedule-style-option-selected' : ''} inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  isSelected
                    ? 'border-stone-700 bg-stone-700 text-white shadow-[0_6px_16px_rgba(41,37,36,0.16)]'
                    : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300 hover:bg-stone-100'
                }`}
              >
                {isSelected && <Check size={14} />}
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
