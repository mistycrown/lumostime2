/**
 * @file TimelineStyleSelector.tsx
 * @input Toast callback
 * @output Timeline style card selector and adjuster launcher
 * @pos Component (Theme & Customization)
 * @description 时间线样式选择器，用于投喂功能中的样式切换，并保留样式调节入口。
 *
 * @updated 2026-03-28: Restored the default style preview to a classic filled dot so the original timeline option remains visually recognizable in the compact grid.
 * @updated 2026-09-27: Added an independent persisted header-theme selector below the timeline rail styles.
 * @updated 2026-09-27: Adds a timeline-page entry for the per-sticker header debugger.
 * @updated 2026-09-27: Adds a Little Prince layered-header preview alongside the pink notebook theme.
 * @updated 2026-09-27: Uses the named Little Prince layer assets in the compact theme preview.
 */

import React, { useMemo } from 'react';
import { Leaf, MapPin, Moon, Music4, PawPrint, Scissors, Settings, SlidersHorizontal } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { ToastType } from './Toast';
import { CompactPreviewCardSelector } from './CompactPreviewCardSelector';
import {
  DEFAULT_TIMELINE_STYLE_THEME,
  TimelineStyleOption,
  TimelineStyleTheme,
  getTimelineStyleOptions
} from '../services/timelineStyleService';
import {
  TIMELINE_HEADER_THEME_OPTIONS,
  type TimelineHeaderThemeOption,
  type TimelineHeaderThemeSelection
} from './TimelineHeaderDecorations';

interface TimelinePreviewPreset {
  background: string;
  nodeColor: string;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

const TIMELINE_PREVIEW_MAP: Record<TimelineStyleTheme, TimelinePreviewPreset> = {
  default: {
    background: 'linear-gradient(135deg, #f8f6f2 0%, #f0ece6 100%)',
    nodeColor: '#1c1917'
  },
  vine: {
    background: 'linear-gradient(135deg, #f1f8f4 0%, #e2efe7 100%)',
    nodeColor: '#597a70',
    icon: Leaf
  },
  celestial: {
    background: 'linear-gradient(135deg, #f3f5fb 0%, #e3e8f2 100%)',
    nodeColor: '#6a7591',
    icon: Moon
  },
  track: {
    background: 'linear-gradient(135deg, #f9f6f0 0%, #eee6da 100%)',
    nodeColor: '#887b6c',
    icon: MapPin
  },
  stitches: {
    background: 'linear-gradient(135deg, #faf3f1 0%, #f1e3de 100%)',
    nodeColor: '#8f6e69',
    icon: Scissors
  },
  paw: {
    background: 'linear-gradient(135deg, #f7f3f1 0%, #ede3de 100%)',
    nodeColor: '#816f67',
    icon: PawPrint
  },
  music: {
    background: 'linear-gradient(135deg, #f2f7f8 0%, #dfe9ec 100%)',
    nodeColor: '#5f7580',
    icon: Music4
  }
};

const TimelinePreview: React.FC<{ option: TimelineStyleOption }> = ({ option }) => {
  const preview = TIMELINE_PREVIEW_MAP[option.value];
  const Icon = preview.icon;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: preview.background }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.8),transparent_42%)]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/86 shadow-[0_6px_16px_rgba(255,255,255,0.5)]"
          style={{ color: preview.nodeColor }}
        >
          {Icon ? (
            <Icon size={18} strokeWidth={2.2} />
          ) : (
            <div
              className="h-3 w-3 rounded-full border-2 border-[#faf9f6]"
              style={{ backgroundColor: preview.nodeColor }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const TimelineHeaderPreview: React.FC<{ option: TimelineHeaderThemeOption }> = ({ option }) => {
  if (option.value === 'none') {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#fdfcf9]">
        <div className="absolute inset-x-0 top-0 h-8 border-b border-stone-100 bg-white" />
        <div className="absolute left-3 top-3 flex gap-1"><span className="h-1.5 w-1.5 rounded-full bg-stone-300" /><span className="h-1.5 w-1.5 rounded-full bg-stone-300" /><span className="h-1.5 w-1.5 rounded-full bg-stone-300" /></div>
        <div className="absolute inset-x-3 bottom-3 h-7 rounded-lg border border-stone-100 bg-white" />
      </div>
    );
  }

  if (option.value === 'little-prince') {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#9db9de]">
        <img src="/mdlo/prince/01_top_header_background.png" alt="" className="absolute inset-x-0 top-0 h-full w-full object-cover object-[center_38%] opacity-70" />
        <div className="absolute left-3 top-3 flex gap-1"><span className="h-1.5 w-1.5 rounded-full bg-white/80" /><span className="h-1.5 w-1.5 rounded-full bg-white/80" /><span className="h-1.5 w-1.5 rounded-full bg-white/80" /></div>
        <img src="/mdlo/prince/02_date_bar_background.png" alt="" className="absolute inset-x-2 bottom-2 h-8 w-[calc(100%-1rem)] object-fill" />
        <img src="/mdlo/prince/08_selected_date_card.png" alt="" className="absolute bottom-2 left-1/2 h-8 w-7 -translate-x-1/2 object-cover" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#fffaf8]">
      <img src="/mdlo/pink/01_top_header_cloud_border.png" alt="" className="absolute inset-x-0 top-0 h-12 w-full object-cover" />
      <img src="/mdlo/pink/02_peeking_cat.png" alt="" className="absolute right-7 top-1 z-10 w-10" />
      <div className="absolute inset-x-3 bottom-3 h-8 rounded-lg border border-white/80 bg-white/85 shadow-sm" />
      <img src="/mdlo/pink/03_pink_star_washi_tape.png" alt="" className="absolute bottom-7 left-2 z-10 w-9 -rotate-6" />
    </div>
  );
};

interface TimelineStyleSelectorProps {
  onToast: (type: ToastType, message: string) => void;
  onOpenHeaderDebugger?: () => void;
}

export const TimelineStyleSelector: React.FC<TimelineStyleSelectorProps> = ({ onToast, onOpenHeaderDebugger }) => {
  const {
    timelineStyleTheme,
    setTimelineStyleTheme,
    timelineHeaderTheme,
    setTimelineHeaderTheme,
    setTimelineStyleAdjusterOpen
  } = useSettings();

  const styleOptions = useMemo(() => getTimelineStyleOptions(), []);
  const canAdjust = timelineStyleTheme !== DEFAULT_TIMELINE_STYLE_THEME;

  const handleAdjust = () => {
    if (!canAdjust) {
      onToast('info', '原版默认样式不提供调节，请先切换到自定义样式。');
      return;
    }

    setTimelineStyleAdjusterOpen(true);
    onToast('success', '已打开时间线调节器，请返回时间脉络页或档案页查看。');
  };

  const handleSelect = (value: TimelineStyleTheme) => {
    setTimelineStyleTheme(value);
    if (value === DEFAULT_TIMELINE_STYLE_THEME) {
      setTimelineStyleAdjusterOpen(false);
    }
    onToast('success', `时间线样式已切换为「${styleOptions.find((option) => option.value === value)?.label || value}」`);
  };

  const handleHeaderThemeSelect = (value: TimelineHeaderThemeSelection) => {
    setTimelineHeaderTheme(value);
    onToast('success', `顶部主题已切换为「${TIMELINE_HEADER_THEME_OPTIONS.find((option) => option.value === value)?.label || value}」`);
  };

  return (
    <div className="space-y-4">
      <CompactPreviewCardSelector
        title="时间线样式"
        options={styleOptions}
        selectedValue={timelineStyleTheme}
        onSelect={handleSelect}
        actionSlot={(
          <button
            type="button"
            onClick={handleAdjust}
            className={`timeline-style-adjust flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              canAdjust ? 'bg-stone-100 text-stone-700 hover:bg-stone-200' : 'bg-stone-50 text-stone-300'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>调节</span>
          </button>
        )}
        renderPreview={(option) => <TimelinePreview option={option as TimelineStyleOption} />}
        showLabels={false}
      />
      <CompactPreviewCardSelector
        title="顶部主题"
        options={TIMELINE_HEADER_THEME_OPTIONS}
        selectedValue={timelineHeaderTheme}
        onSelect={handleHeaderThemeSelect}
        actionSlot={(
          <button
            type="button"
            disabled={timelineHeaderTheme === 'none'}
            onClick={onOpenHeaderDebugger}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${timelineHeaderTheme === 'none' ? 'bg-stone-50 text-stone-300' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
          >
            <Settings size={14} />调试
          </button>
        )}
        renderPreview={(option) => <TimelineHeaderPreview option={option as TimelineHeaderThemeOption} />}
        minCardWidth={132}
        maxCardWidth={188}
        cardAspectRatio="16 / 9"
      />
    </div>
  );
};
