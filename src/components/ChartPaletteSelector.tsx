/**
 * @file ChartPaletteSelector.tsx
 * @input The selected activity statistic palette and an update callback.
 * @output A reusable palette swatch selector for chart configuration surfaces.
 * @description Presents grouped colors as compact swatches without adding a second color system.
 * @updated 2026-09-20: Added reusable activity statistic palette selector.
 */
import React from 'react';
import { ActivityStatisticPaletteId } from '../types';
import { getChartPaletteOptions } from '../utils/chartPalette';

interface ChartPaletteSelectorProps {
  value: ActivityStatisticPaletteId;
  onChange: (value: ActivityStatisticPaletteId) => void;
}

export const ChartPaletteSelector: React.FC<ChartPaletteSelectorProps> = ({ value, onChange }) => (
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="图表配色">
    {getChartPaletteOptions().map((palette) => (
      <button
        key={palette.id}
        type="button"
        onClick={() => onChange(palette.id)}
        aria-label={`选择${palette.label}配色`}
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
