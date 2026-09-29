/**
 * @file TimelineItem.test.ts
 * @input Memoir entry types, shared timeline style settings, and summary-card background states
 * @output Regression coverage for Memoir timeline-node style inheritance and summary-card borders
 * @updated 2026-09-29: Verifies review nodes inherit custom timeline styles while default summary colors remain unchanged.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DiaryEntry, EntryType } from '../views/journalTypes';

const timelineRailProps = vi.hoisted(() => [] as Array<Record<string, unknown>>);
const settingsState = vi.hoisted(() => ({
  value: {} as Record<string, unknown>
}));

vi.mock('../hooks/useCardBackground', () => ({
  useCardBackground: vi.fn(() => ({ active: false, style: {} }))
}));

vi.mock('./IconRenderer', () => ({
  IconRenderer: () => null
}));

vi.mock('../contexts/SettingsContext', () => ({
  useSettings: vi.fn(() => settingsState.value)
}));

vi.mock('../contexts/PrivacyContext', () => ({
  usePrivacy: vi.fn(() => ({ isPrivacyMode: false }))
}));

vi.mock('./TimelineStyleRail', () => ({
  TimelineStyleRail: (props: Record<string, unknown>) => {
    timelineRailProps.push(props);
    return null;
  }
}));

vi.mock('../services/imageService', () => ({
  imageService: { getImageUrl: vi.fn() }
}));

vi.mock('./ReactionComponents', () => ({
  ReactionPicker: () => null,
  ReactionList: () => null
}));

vi.mock('./ImagePreviewModal', () => ({
  ImagePreviewModal: () => null
}));

import TimelineItem, { getTimelineItemContainerClassName } from './TimelineItem';

const vineTimelineConfig = {
  iconSize: 17,
  iconAngle: 12,
  lineWidth: 2,
  offsetX: 0,
  memoirOffsetX: 3,
  timelineWidth: 6,
  railOffsetX: 0,
  timeNodeOffsetY: 0,
  uniformNodes: false,
  nodeColor: '#426666',
  lineColor: '#75878A',
  lineOpacity: 15
};

const makeEntry = (type: EntryType): DiaryEntry => ({
  id: `${type}-entry`,
  type,
  date: '2026-09-29T12:00:00',
  title: type,
  content: 'Memoir entry',
  comments: []
});

const renderTimelineItem = (type: EntryType) => renderToStaticMarkup(
  React.createElement(TimelineItem, {
    entry: makeEntry(type),
    isLast: true,
    onAddComment: vi.fn()
  })
);

beforeEach(() => {
  timelineRailProps.splice(0, timelineRailProps.length);
  settingsState.value = {
    timelineStyleTheme: 'vine',
    timelineStyleConfigs: { vine: vineTimelineConfig }
  };
});

describe('Memoir summary-card surface', () => {
  it('removes the dashed border only when a card background is active', () => {
    expect(getTimelineItemContainerClassName(true, false)).toContain('border border-dashed border-gray-300');
    expect(getTimelineItemContainerClassName(true, true)).not.toContain('border');
    expect(getTimelineItemContainerClassName(false, true)).toBe('flex flex-col gap-1 w-full pl-[5px] min-w-0');
  });
});

describe('Memoir review timeline nodes', () => {
  it('uses the same custom rail node props for logs and every review type', () => {
    (['normal', 'daily_summary', 'weekly_summary', 'monthly_summary'] as EntryType[]).forEach(renderTimelineItem);

    expect(timelineRailProps).toHaveLength(4);
    expect(timelineRailProps).toEqual(Array(4).fill({
      theme: 'vine',
      config: vineTimelineConfig,
      index: 0,
      showLine: true,
      showNode: true,
      extendLinePastContainer: false,
      anchorOffsetX: 3,
      maxTimelineWidth: 3
    }));
  });

  it.each([
    ['daily_summary', 'bg-purple-500'],
    ['weekly_summary', 'bg-amber-500'],
    ['monthly_summary', 'bg-pink-400']
  ] as const)('keeps the %s default timeline color', (type, expectedClass) => {
    settingsState.value = {
      timelineStyleTheme: 'default',
      timelineStyleConfigs: { default: vineTimelineConfig }
    };

    const markup = renderTimelineItem(type);

    expect(markup).toContain(expectedClass);
    expect(timelineRailProps).toHaveLength(0);
  });
});
