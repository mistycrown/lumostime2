/**
 * @file ColorPalettePicker.tsx
 * @input Selected color and a selection callback
 * @output The application's built-in circular swatches and reactive custom color group
 * @pos Component (Color selection)
 * @updated 2026-10-24: Shares the schedule settings color picker with journal export settings.
 */
import React from 'react';
import { COLOR_OPTIONS } from '../constants';
import { useCustomColors } from '../hooks/useCustomColors';
import { isStoredColorSelected } from '../utils/colorUtils';

interface ColorPalettePickerProps {
  value?: string;
  onChange: (color: string) => void;
}

export const ColorPalettePicker: React.FC<ColorPalettePickerProps> = ({ value, onChange }) => {
  const customColors = useCustomColors();
  return (
    <div className="grid grid-cols-6 gap-2" aria-label="颜色选择">
      {COLOR_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.hex)}
          title={option.label}
          aria-label={option.label}
          aria-pressed={isStoredColorSelected(value, option.hex)}
          className={`h-8 w-8 rounded-full ${isStoredColorSelected(value, option.hex) ? `ring-2 ${option.ring} ring-offset-2` : ''} ${option.picker}`}
        />
      ))}
      {customColors.map((color) => (
        <button
          key={color.id}
          type="button"
          onClick={() => onChange(color.color)}
          title={color.color}
          aria-label={color.color}
          aria-pressed={isStoredColorSelected(value, color.color)}
          className={`h-8 w-8 rounded-full border border-stone-300 ${isStoredColorSelected(value, color.color) ? 'ring-2 ring-stone-400 ring-offset-2' : ''}`}
          style={{ backgroundColor: color.color }}
        />
      ))}
    </div>
  );
};
