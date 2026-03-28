/**
 * @file AchievementBottleStyleSelector.tsx
 * @description Compact sponsorship style-tab selector for switching achievement bottle variants without rendering previews.
 */
import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import {
  ACHIEVEMENT_BOTTLE_STYLE_OPTIONS,
  getAchievementBottleStyleOption
} from '../../services/achievementBottleStyleService';

export const AchievementBottleStyleSelector: React.FC = () => {
  const { achievementBottleStyle, setAchievementBottleStyle } = useSettings();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectedStyle = useMemo(
    () => getAchievementBottleStyleOption(achievementBottleStyle),
    [achievementBottleStyle]
  );

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between p-4 relative">
        <div>
          <h4 className="font-bold text-stone-700">成就瓶样式</h4>
          <p className="text-xs text-stone-400 mt-1">用于切换成就页成就瓶的瓶身配色与玻璃气质。</p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-bold px-4 py-2 rounded-lg transition-colors"
          >
            <span>{selectedStyle.label}</span>
            <ChevronDown
              size={14}
              className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-[100]"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden z-[110] flex flex-col py-1 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                {ACHIEVEMENT_BOTTLE_STYLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setAchievementBottleStyle(option.value);
                      setIsDropdownOpen(false);
                    }}
                    className={`px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-stone-50 flex items-center justify-between ${
                      achievementBottleStyle === option.value ? 'text-stone-900 bg-stone-50' : 'text-stone-500'
                    }`}
                  >
                    {option.label}
                    {achievementBottleStyle === option.value && (
                      <div className="w-1.5 h-1.5 rounded-full bg-stone-800" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
