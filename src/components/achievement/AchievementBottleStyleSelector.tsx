/**
 * @file AchievementBottleStyleSelector.tsx
 * @description Compact preview-card selector for switching achievement bottle glass styles in the sponsorship style tab.
 *
 * @updated 2026-03-28: Replaced the dropdown with a compact card grid preview and re-centered the bottle illustration in each card.
 */

import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { CompactPreviewCardSelector } from '../CompactPreviewCardSelector';
import {
  ACHIEVEMENT_BOTTLE_STYLE_OPTIONS,
  AchievementBottleStyle,
  AchievementBottleStyleOption
} from '../../services/achievementBottleStyleService';

interface BottlePreviewPalette {
  background: string;
  bottleFrom: string;
  bottleTo: string;
  cap: string;
  glow: string;
  star: string;
}

const BOTTLE_STYLE_PREVIEW_MAP: Record<AchievementBottleStyle, BottlePreviewPalette> = {
  sunlit: {
    background: 'linear-gradient(135deg, #fbf5e8 0%, #f3ead3 100%)',
    bottleFrom: 'rgba(245, 210, 120, 0.55)',
    bottleTo: 'rgba(234, 185, 87, 0.28)',
    cap: '#b78b4c',
    glow: 'rgba(255, 247, 220, 0.9)',
    star: '#d8a248'
  },
  seaGlass: {
    background: 'linear-gradient(135deg, #eef7f7 0%, #dceced 100%)',
    bottleFrom: 'rgba(132, 193, 194, 0.45)',
    bottleTo: 'rgba(101, 161, 162, 0.24)',
    cap: '#6e9ea0',
    glow: 'rgba(240, 252, 252, 0.92)',
    star: '#7cb8b8'
  },
  midnight: {
    background: 'linear-gradient(135deg, #eef1f8 0%, #d9deeb 100%)',
    bottleFrom: 'rgba(88, 103, 141, 0.48)',
    bottleTo: 'rgba(53, 63, 93, 0.28)',
    cap: '#4e5a79',
    glow: 'rgba(244, 247, 255, 0.88)',
    star: '#6e7ca5'
  },
  blushBloom: {
    background: 'linear-gradient(135deg, #fbf1f4 0%, #f4e4eb 100%)',
    bottleFrom: 'rgba(220, 160, 183, 0.42)',
    bottleTo: 'rgba(195, 128, 154, 0.22)',
    cap: '#bc8199',
    glow: 'rgba(255, 245, 248, 0.9)',
    star: '#d79ab3'
  },
  pearlMist: {
    background: 'linear-gradient(135deg, #f7f7f5 0%, #ececea 100%)',
    bottleFrom: 'rgba(203, 205, 200, 0.42)',
    bottleTo: 'rgba(171, 174, 170, 0.2)',
    cap: '#9ea39f',
    glow: 'rgba(255, 255, 255, 0.92)',
    star: '#babdb7'
  },
  linenCream: {
    background: 'linear-gradient(135deg, #fbf7ef 0%, #f3ebde 100%)',
    bottleFrom: 'rgba(229, 209, 177, 0.42)',
    bottleTo: 'rgba(207, 184, 150, 0.2)',
    cap: '#baa07d',
    glow: 'rgba(255, 251, 243, 0.92)',
    star: '#d2b58e'
  },
  mintHaze: {
    background: 'linear-gradient(135deg, #f0f8f3 0%, #dff0e6 100%)',
    bottleFrom: 'rgba(149, 204, 181, 0.4)',
    bottleTo: 'rgba(116, 175, 152, 0.2)',
    cap: '#79a58f',
    glow: 'rgba(245, 255, 250, 0.92)',
    star: '#8cccb0'
  }
};

const renderBottlePreview = (option: AchievementBottleStyleOption) => {
  const palette = BOTTLE_STYLE_PREVIEW_MAP[option.value];
  const starCount = Math.min(3, Math.max(1, Math.round(option.previewStars / 7)));

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: palette.background }}>
      <div
        className="absolute left-2 top-2 h-7 w-7 rounded-full blur-md"
        style={{ background: palette.glow }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-12"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(120,113,108,0.14) 100%)' }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex flex-col items-center">
          <div
            className="h-2.5 w-4 translate-y-0.5 rounded-t-md"
            style={{ backgroundColor: palette.cap }}
          />
          <div
            className="relative mt-1 h-11 w-9 rounded-[14px_14px_12px_12px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
            style={{
              background: `linear-gradient(180deg, ${palette.bottleFrom} 0%, ${palette.bottleTo} 100%)`,
              backdropFilter: 'blur(2px)'
            }}
          >
            <div className="absolute left-1.5 top-1.5 h-7 w-2 rounded-full bg-white/45 blur-[1px]" />
            <div className="absolute right-1.5 top-2 h-4 w-1 rounded-full bg-white/35" />
          </div>
        </div>
      </div>

      <div className="absolute left-2 top-2 flex gap-1">
        {Array.from({ length: starCount }).map((_, index) => (
          <span
            key={`${option.value}-${index}`}
            className="text-[10px] leading-none"
            style={{ color: palette.star }}
          >
            ✦
          </span>
        ))}
      </div>
    </div>
  );
};

export const AchievementBottleStyleSelector: React.FC = () => {
  const { achievementBottleStyle, setAchievementBottleStyle } = useSettings();

  return (
    <CompactPreviewCardSelector
      title="成就瓶样式"
      description="用于切换成就页成就瓶的瓶身配色与玻璃气质。"
      options={ACHIEVEMENT_BOTTLE_STYLE_OPTIONS}
      selectedValue={achievementBottleStyle}
      onSelect={setAchievementBottleStyle}
      renderPreview={(option) => renderBottlePreview(option as AchievementBottleStyleOption)}
      showLabels={false}
    />
  );
};
