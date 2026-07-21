/**
 * @file TimelineStyleSelector.tsx
 * @input Toast callback
 * @output Timeline style card selector and adjuster launcher
 * @pos Component (Theme & Customization)
 * @description 时间线样式选择器，用于投喂功能中的样式切换，并保留样式调节入口。
 *
 * @updated 2026-03-28: Restored the default style preview to a classic filled dot so the original timeline option remains visually recognizable in the compact grid.
 */

import React, { useMemo } from 'react';
import { Leaf, MapPin, Moon, Music4, PawPrint, Scissors, SlidersHorizontal } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { ToastType } from './Toast';
import { CompactPreviewCardSelector } from './CompactPreviewCardSelector';
import {
  DEFAULT_TIMELINE_STYLE_THEME,
  TimelineStyleOption,
  TimelineStyleTheme,
  getTimelineStyleOptions
} from '../services/timelineStyleService';

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

interface TimelineStyleSelectorProps {
  onToast: (type: ToastType, message: string) => void;
}

export const TimelineStyleSelector: React.FC<TimelineStyleSelectorProps> = ({ onToast }) => {
  const {
    timelineStyleTheme,
    setTimelineStyleTheme,
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

  return (
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
  );
};
