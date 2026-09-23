/**
 * @file ActivityAttributeStatistics.test.tsx
 * @input Text attribute values.
 * @output Regression coverage for text-term extraction used by attribute statistics.
 */
import { describe, expect, it } from 'vitest';
import type { Activity } from '../types';
import { filterLogsForAttribute, filterLogsByRange, getCalendarDaysForRange, getCardAttributeStatisticSlices, getDateKeysForRange, getTextTerms } from './ActivityAttributeStatistics';
import { aggregateHourBuckets } from './stats/PetalTimelineChart';
import { getChartTypesForSource, normalizeStatisticCards } from '../utils/activityStatisticCardUtils';

describe('getTextTerms', () => {
  it('preserves explicit whitespace boundaries across browser runtimes', () => {
    expect(getTextTerms('测试 一下')).toEqual(['测试', '一下']);
  });

  it('segments unspaced Chinese text with the bundled dictionary', () => {
    expect(getTextTerms('我今天学习编程')).toEqual(['今天', '学习', '编程']);
  });

  it('keeps segmented Chinese words and meaningful single-character values', () => {
    expect(getTextTerms('阅读 好')).toEqual(['阅读', '好']);
  });

  it('filters punctuation, whitespace, and configured stopwords', () => {
    expect(getTextTerms('的，\n和')).toEqual([]);
  });

  it('filters common Chinese function words without removing meaningful short terms', () => {
    expect(getTextTerms('这个任务可以通过学习完成，但是好')).toEqual(['任务', '学习', '完成', '好']);
  });

  it('handles short English values', () => {
    expect(getTextTerms('A')).toEqual(['a']);
  });
});

describe('filterLogsForAttribute', () => {
  it('keeps only the requested attribute values from each log', () => {
    const logs = [
      {
        id: 'log-1',
        activityId: 'activity-1',
        categoryId: 'category-1',
        startTime: 1,
        endTime: 2,
        duration: 1,
        attributeValues: [
          { attributeId: 'weight', value: 68 },
          { attributeId: 'note-text', value: '训练' }
        ]
      },
      {
        id: 'log-2',
        activityId: 'activity-1',
        categoryId: 'category-1',
        startTime: 3,
        endTime: 4,
        duration: 1,
        attributeValues: [{ attributeId: 'note-text', value: '恢复' }]
      }
    ];

    expect(filterLogsForAttribute(logs, 'weight')).toEqual([
      {
        ...logs[0],
        attributeValues: [{ attributeId: 'weight', value: 68 }]
      }
    ]);
  });
});

describe('filterLogsByRange', () => {
  it('keeps the full local calendar year while excluding prior-year and future logs', () => {
    const now = new Date(2026, 8, 21, 15, 57, 0);
    const logs = [
      { id: 'new-year', startTime: new Date(2026, 0, 1, 0, 0, 0).getTime() },
      { id: 'current', startTime: new Date(2026, 8, 20, 12, 0, 0).getTime() },
      { id: 'previous-year', startTime: new Date(2025, 11, 31, 23, 59, 59).getTime() },
      { id: 'future', startTime: new Date(2026, 8, 21, 16, 0, 0).getTime() }
    ];

    expect(filterLogsByRange(logs as never, 'year', now).map((log) => log.id)).toEqual(['new-year', 'current']);
  });
});

describe('statistic calendar ranges', () => {
  it('keeps month and rolling thirty-day ranges distinct across a month boundary', () => {
    const now = new Date(2026, 8, 5, 15, 57, 0);
    expect(getDateKeysForRange('month', now)[0]).toBe('2026-09-01');
    expect(getDateKeysForRange('month', now).at(-1)).toBe('2026-09-05');
    expect(getDateKeysForRange('30d', now)[0]).toBe('2026-08-07');
    expect(getDateKeysForRange('30d', now).at(-1)).toBe('2026-09-05');
  });

  it('expands a cross-month range to complete month grids', () => {
    const days = getCalendarDaysForRange('30d', new Date(2026, 8, 5, 15, 57, 0));
    expect(days[0]).toBe('2026-08-01');
    expect(days.at(-1)).toBe('2026-09-30');
    expect(days).toContain('2026-08-31');
    expect(days).toContain('2026-09-30');
  });

  it('keeps the seven-day range bounded to seven dates instead of expanding a month', () => {
    const days = getDateKeysForRange('7d', new Date(2026, 8, 5, 15, 57, 0));
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2026-08-30');
    expect(days.at(-1)).toBe('2026-09-05');
  });
});

describe('getCardAttributeStatisticSlices', () => {
  it('uses the parent choice before trimming logs to the conditional attribute', () => {
    const parent = {
      id: 'kind',
      name: 'Kind',
      type: 'single' as const,
      options: [{ id: 'run', label: 'Run' }],
      order: 0,
      createdAt: 1,
      updatedAt: 1
    };
    const child = {
      id: 'pace',
      name: 'Pace',
      type: 'number' as const,
      unit: 'min/km',
      displayCondition: { attributeId: 'kind', optionIds: ['run'] },
      order: 1,
      createdAt: 1,
      updatedAt: 1
    };
    const logs = [
      {
        id: 'run-log', activityId: 'activity-1', categoryId: 'category-1', startTime: 1, endTime: 2, duration: 1,
        attributeValues: [{ attributeId: 'kind', optionId: 'run' }, { attributeId: 'pace', value: 5 }]
      },
      {
        id: 'walk-log', activityId: 'activity-1', categoryId: 'category-1', startTime: 3, endTime: 4, duration: 1,
        attributeValues: [{ attributeId: 'kind', optionId: 'walk' }, { attributeId: 'pace', value: 8 }]
      }
    ];

    const slices = getCardAttributeStatisticSlices(child, [parent, child], logs);

    expect(slices).toHaveLength(1);
    expect(slices[0]?.contextLabel).toBe('Kind: Run');
    expect(slices[0]?.logs.map((log) => log.id)).toEqual(['run-log']);
    expect(slices[0]?.logs[0]?.attributeValues).toEqual([{ attributeId: 'pace', value: 5 }]);
  });
});

describe('extended statistic card sources', () => {
  it('supports tag duration charts and single-choice treemaps', () => {
    const single = { id: 'mood', name: 'Mood', type: 'single' as const, options: [{ id: 'good', label: 'Good' }], order: 0, createdAt: 1, updatedAt: 1 };
    expect(getChartTypesForSource({ type: 'tagDuration' }, [single])).toEqual(['numberArea', 'numberCalendar', 'numberKpi', 'tagDurationBoxplot', 'tagDurationWeekHourHeatmap', 'tagDurationPetalTimeline']);
    expect(getChartTypesForSource({ type: 'attribute', attributeId: 'mood' }, [single])).toContain('choiceTreemap');
  });

  it('keeps an explicit calendar range while defaulting missing calendar ranges to a year', () => {
    const number = { id: 'weight', name: 'Weight', type: 'number' as const, order: 0, createdAt: 1, updatedAt: 1 };
    const activity = { id: 'activity-1', name: 'Activity', color: '#000', attributes: [number], statisticCards: [
      { id: 'calendar-month', source: { type: 'attribute' as const, attributeId: 'weight' }, chartType: 'numberCalendar' as const, range: 'month' as const, metric: 'value' as const, order: 0 },
      { id: 'calendar-default', source: { type: 'attribute' as const, attributeId: 'weight' }, chartType: 'numberCalendar' as const, metric: 'value' as const, order: 1 }
    ] };
    const cards = normalizeStatisticCards(activity as unknown as Activity);
    expect(cards[0]?.range).toBe('month');
    expect(cards[1]?.range).toBe('year');
  });

  it('defaults tag-duration chart ranges to their supported scopes', () => {
    const activity = { id: 'activity-2', name: 'Activity', color: '#000', attributes: [], statisticCards: [
      { id: 'boxplot', source: { type: 'tagDuration' as const }, chartType: 'tagDurationBoxplot' as const, metric: 'count' as const, order: 0 },
      { id: 'heatmap', source: { type: 'tagDuration' as const }, chartType: 'tagDurationWeekHourHeatmap' as const, metric: 'count' as const, order: 1 }
    ] };
    const cards = normalizeStatisticCards(activity as unknown as Activity);
    expect(cards.map((card) => card.range)).toEqual(['year', 'all']);
  });

  it('splits duration across hours for the natural week', () => {
    const now = new Date(2026, 8, 23, 12, 0, 0, 0);
    const start = new Date(2026, 8, 22, 23, 30, 0, 0).getTime();
    const end = new Date(2026, 8, 23, 1, 30, 0, 0).getTime();
    const summary = aggregateHourBuckets([{ startTime: start, endTime: end, duration: 2 * 60 * 60 }], 'week', now);
    expect(summary.buckets[23]?.minutes).toBeCloseTo(30);
    expect(summary.buckets[0]?.minutes).toBeCloseTo(60);
    expect(summary.buckets[1]?.minutes).toBeCloseTo(30);
    expect(summary.totalMinutes).toBeCloseTo(120);
    expect(summary.activeDays).toBe(2);
  });
});
