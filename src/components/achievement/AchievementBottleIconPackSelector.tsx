/**
 * @file AchievementBottleIconPackSelector.tsx
 * @description Compact preview-card selector for switching bundled achievement bottle icon packs in the sponsorship style tab.
 *
 * @updated 2026-03-28: Render each icon pack with a stable first-image preview and hide per-card labels for a cleaner preview grid.
 */

import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { CompactPreviewCardSelector } from '../CompactPreviewCardSelector';
import {
  ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS,
  AchievementBottleIconPackOption
} from '../../services/achievementBottleIconPackService';

const renderIconPackPreview = (option: AchievementBottleIconPackOption) => {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(135deg,#f8f4ec_0%,#efe7da_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.85),transparent_42%)]" />

      <div className="flex h-full items-center justify-center p-2.5">
        <div className="flex h-full w-full items-center justify-center rounded-[22px] border border-white/70 bg-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
          {option.previewImageSrc ? (
            <img
              src={option.previewImageSrc}
              alt=""
              className="h-11 w-11 object-contain drop-shadow-[0_6px_12px_rgba(120,113,108,0.18)]"
              loading="lazy"
            />
          ) : (
            <div className="h-10 w-10 rounded-full border border-stone-200/80 bg-stone-100/80" />
          )}
        </div>
      </div>
    </div>
  );
};

export const AchievementBottleIconPackSelector: React.FC = () => {
  const { achievementBottleIconPack, setAchievementBottleIconPack } = useSettings();

  return (
    <CompactPreviewCardSelector
      title="成就瓶图标包"
      options={ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS}
      selectedValue={achievementBottleIconPack}
      onSelect={setAchievementBottleIconPack}
      renderPreview={(option) => renderIconPackPreview(option as AchievementBottleIconPackOption)}
      showLabels={false}
    />
  );
};
