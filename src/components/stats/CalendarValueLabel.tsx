/**
 * @file CalendarValueLabel.tsx
 * @input Complete calendar value, empty-state color and label attribute kind.
 * @output A bounded SVG number label that fits its cell without CSS container-unit support.
 * @pos Component (Shared Statistics Calendar)
 * @updated 2026-10-25: Fits glyphs inside an explicit viewBox to prevent WebView font scaling from overlapping adjacent values.
 */
import React from 'react';

interface CalendarValueLabelProps {
  value: string;
  empty?: boolean;
  attribute?: 'value' | 'duration';
}

export const CalendarValueLabel: React.FC<CalendarValueLabelProps> = ({ value, empty = false, attribute = 'value' }) => (
  <span {...(attribute === 'duration' ? { 'data-calendar-duration': '' } : { 'data-calendar-value': '' })}
    className={`mt-0.5 ${empty ? 'text-stone-300' : 'text-stone-600'}`} aria-hidden="true"
    style={{ display: 'block', width: '100%', minWidth: 0, lineHeight: 0, overflow: 'hidden', WebkitTextSizeAdjust: 'none' }}>
    <svg viewBox="0 0 36 12" focusable="false" style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 10, overflow: 'hidden', WebkitTextSizeAdjust: 'none' }}>
      <text x="18" y="9" textAnchor="middle" fill="currentColor" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="10" textLength={Math.min(30, value.length * 6)} lengthAdjust="spacingAndGlyphs">{value}</text>
    </svg>
  </span>
);
