/**
 * @file TimelineItem.test.ts
 * @input Memoir summary-card and normal-entry background states
 * @output Regression coverage for the conditional Memoir summary-card border
 * @updated 2026-09-27: Ensures active card backgrounds remove the summary-card outline.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/useCardBackground', () => ({
  useCardBackground: vi.fn(() => ({ active: false, style: {} }))
}));

vi.mock('./IconRenderer', () => ({
  IconRenderer: () => null
}));

vi.mock('../contexts/SettingsContext', () => ({
  useSettings: vi.fn(() => ({}))
}));

vi.mock('../services/imageService', () => ({
  imageService: { getImageUrl: vi.fn() }
}));

vi.mock('./ReactionComponents', () => ({
  ReactionPicker: () => null,
  ReactionList: () => null
}));

import { getTimelineItemContainerClassName } from './TimelineItem';

describe('Memoir summary-card surface', () => {
  it('removes the dashed border only when a card background is active', () => {
    expect(getTimelineItemContainerClassName(true, false)).toContain('border border-dashed border-gray-300');
    expect(getTimelineItemContainerClassName(true, true)).not.toContain('border');
    expect(getTimelineItemContainerClassName(false, true)).toBe('flex flex-col gap-1 w-full pl-[5px] min-w-0');
  });
});
