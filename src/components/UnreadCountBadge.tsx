/**
 * @file UnreadCountBadge.tsx
 * @input unread count plus optional positioning classes
 * @output Theme-aware unread badge suitable for floating or icon buttons
 * @pos Component (Feedback UI)
 * @description Renders a compact unread-count badge that follows the current accent theme when one is active and falls back to a subdued dark-red bubble in the default theme, giving AI entry points a WeChat-like unread indicator without feeling overly loud.
 *
 * @updated 2026-04-26: Added a reusable unread-count badge for AI entry buttons and future notification surfaces.
 * @updated 2026-04-26: Pushed the badge farther toward the top-right so the circular-button badge reads even more like a docked corner marker.
 */
import React from 'react';
import { useSettings } from '../contexts/SettingsContext';

interface UnreadCountBadgeProps {
  count: number;
  className?: string;
}

export const UnreadCountBadge: React.FC<UnreadCountBadgeProps> = ({
  count,
  className = 'absolute right-0 top-0 translate-x-[68%] -translate-y-[65%]'
}) => {
  const { colorScheme } = useSettings();

  if (count <= 0) {
    return null;
  }

  const label = count > 99 ? '99+' : String(count);
  const isDefaultTheme = colorScheme === 'default';

  return (
    <span
      className={`${className} pointer-events-none inline-flex min-w-[1.15rem] items-center justify-center rounded-full px-1.5 py-[0.18rem] text-[10px] font-semibold leading-none text-white shadow-[0_4px_10px_rgba(15,23,42,0.16)]`.trim()}
      style={{
        backgroundColor: isDefaultTheme
          ? '#8f3b3b'
          : 'color-mix(in srgb, var(--accent-color) 88%, white 12%)',
        border: isDefaultTheme
          ? '1px solid rgba(255,255,255,0.82)'
          : '1px solid color-mix(in srgb, var(--accent-color) 28%, rgba(255,255,255,0.92))'
      }}
    >
      {label}
    </span>
  );
};
