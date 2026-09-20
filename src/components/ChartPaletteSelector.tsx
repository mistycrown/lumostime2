/**
 * @file ChartPaletteSelector.tsx
 * @input The selected activity statistic palette, custom sequences, and unlock state.
 * @output A reusable palette swatch selector for chart configuration surfaces.
 * @description Keeps the locked default and premium sequence options in one selector.
 */
import React from 'react';
import type { ActivityStatisticPaletteId, CustomChartPaletteSequence } from '../types';
import { getChartPaletteOptions } from '../utils/chartPalette';

interface ChartPaletteSelectorProps {
  value: ActivityStatisticPaletteId;
  onChange: (value: ActivityStatisticPaletteId) => void;
  customSequences?: CustomChartPaletteSequence[];
  unlocked?: boolean;
}

export const ChartPaletteSelector: React.FC<ChartPaletteSelectorProps> = ({ value, onChange, customSequences = [], unlocked = true }) => (
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="鍥捐〃閰嶈壊">
    {getChartPaletteOptions(customSequences, !unlocked).filter((palette) => unlocked || palette.id === 'default').map((palette) => (
      <button
        key={palette.id}
        type="button"
        onClick={() => onChange(palette.id)}
        aria-label={`閫夋嫨${palette.label}閰嶈壊`}
        aria-pressed={value === palette.id}
        className={`rounded-md border px-2.5 py-2 text-left transition-colors ${value === palette.id ? 'border-[#b16d4c] bg-[#f1e1d5]' : 'border-[#e0d6ca] bg-[#fffdfa] hover:border-[#c9b6a4]'}`}
      >
        <span className="mb-1.5 flex h-3.5 gap-0.5 overflow-hidden rounded-sm" aria-hidden="true">
          {palette.colors.slice(0, 6).map((color, index) => <span key={`${palette.id}-${index}`} className="min-w-0 flex-1" style={{ backgroundColor: color }} />)}
        </span>
        <span className={`text-[11px] ${value === palette.id ? 'font-medium text-[#8f4f32]' : 'text-[#766657]'}`}>{palette.label}</span>
      </button>
    ))}
  </div>
);
