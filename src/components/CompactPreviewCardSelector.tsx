/**
 * @file CompactPreviewCardSelector.tsx
 * @input Title, description, option list, selected value, preview renderer, optional header action
 * @output Compact preview card grid selector
 * @pos Component (Theme & Customization)
 * @description Reusable compact card selector used by sponsorship style settings to replace dropdown pickers with visual previews.
 *
 * @updated 2026-03-28: Added a shared compact preview card grid so style selectors can reuse the same small-card layout and selection state.
 */

import React from 'react';
import { Check } from 'lucide-react';

export interface CompactPreviewCardOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

interface CompactPreviewCardSelectorProps<T extends string = string> {
  title: string;
  description?: string;
  options: CompactPreviewCardOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  renderPreview: (option: CompactPreviewCardOption<T>, selected: boolean) => React.ReactNode;
  actionSlot?: React.ReactNode;
  minCardWidth?: number;
  maxCardWidth?: number;
  cardAspectRatio?: string;
  showLabels?: boolean;
}

export const CompactPreviewCardSelector = <T extends string,>({
  title,
  description,
  options,
  selectedValue,
  onSelect,
  renderPreview,
  actionSlot,
  minCardWidth = 68,
  maxCardWidth = 96,
  cardAspectRatio = '1 / 1',
  showLabels = true
}: CompactPreviewCardSelectorProps<T>) => {
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-bold text-stone-700">{title}</h4>
            {description && (
              <p className="mt-1 text-xs leading-5 text-stone-400">{description}</p>
            )}
          </div>
          {actionSlot}
        </div>

        <div
          className="mt-4 grid gap-2 justify-items-start"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))` }}
        >
          {options.map((option) => {
            const isSelected = option.value === selectedValue;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelect(option.value)}
                title={showLabels ? (option.description ? `${option.label} - ${option.description}` : option.label) : undefined}
                aria-pressed={isSelected}
                className={`compact-preview-option ${isSelected ? 'compact-preview-option-selected' : ''} group relative w-full overflow-hidden rounded-xl bg-white transition-all ${
                  isSelected
                    ? 'ring-2 ring-stone-300 shadow-[0_6px_18px_rgba(120,113,108,0.18)]'
                    : 'ring-1 ring-stone-200 hover:ring-stone-300'
                }`}
                style={{
                  aspectRatio: cardAspectRatio,
                  maxWidth: `${maxCardWidth}px`
                }}
              >
                <div className="relative h-full w-full">
                  {renderPreview(option, isSelected)}
                </div>

                {isSelected && (
                  <div className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-stone-800 shadow-lg">
                    <Check size={12} className="text-white" />
                  </div>
                )}

                {showLabels && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/58 via-black/24 to-transparent px-2 py-1.5">
                    <p className="text-center text-[10px] font-medium leading-tight text-white">
                      {option.label}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
