/**
 * @file AchievementBottleIconPackSelector.tsx
 * @description Compact sponsorship selector for switching which bundled achievement bottle icon pack is rendered.
 */
import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import {
  ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS,
  getAchievementBottleIconPackOption
} from '../../services/achievementBottleIconPackService';

export const AchievementBottleIconPackSelector: React.FC = () => {
  const { achievementBottleIconPack, setAchievementBottleIconPack } = useSettings();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectedPack = useMemo(
    () => getAchievementBottleIconPackOption(achievementBottleIconPack),
    [achievementBottleIconPack]
  );
  const visibleOptions = ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS.length > 0
    ? ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS
    : [selectedPack];

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between p-4 relative">
        <div>
          <h4 className="font-bold text-stone-700">成就瓶图标包</h4>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-bold px-4 py-2 rounded-lg transition-colors"
          >
            <span>{selectedPack?.label || achievementBottleIconPack || 'Star'}</span>
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
              <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden z-[110] flex flex-col py-1 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                {visibleOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setAchievementBottleIconPack(option.value);
                      setIsDropdownOpen(false);
                    }}
                    className={`px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-stone-50 flex items-center justify-between gap-3 ${
                      achievementBottleIconPack === option.value ? 'bg-stone-50 text-stone-900' : 'text-stone-500'
                    }`}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    {achievementBottleIconPack === option.value && (
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-stone-800" />
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
