import { describe, expect, it } from 'vitest';
import type { Category, CheckItem, Log } from '../types';
import { evaluateAutoCheck, formatTimeValue, hasAutoCheckItemCompletionChanges } from './autoCheckUtils';
import { normalizeCheckItem, normalizeCheckTemplates } from './checkItemNormalizer';
import type { FilterContext } from './filterUtils';

const context: FilterContext = {
  categories: [
    {
      id: 'sleep',
      name: '睡眠',
      color: 'bg-stone-100 text-stone-700',
      activities: [
        {
          id: 'sleep_act',
          name: '睡觉',
          icon: '🛌',
          color: 'bg-stone-100 text-stone-700'
        }
      ]
    }
  ] as Category[],
  scopes: [],
  todos: [],
  todoCategories: []
};

function createSleepLog(start: string, end: string): Log {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  return {
    id: `${start}-${end}`,
    activityId: 'sleep_act',
    categoryId: 'sleep',
    startTime,
    endTime,
    duration: Math.round((endTime - startTime) / 1000)
  };
}

function createNightSleepCheck(targetValue = 23 * 60): CheckItem {
  return {
    id: 'night-sleep',
    category: '自动日课',
    content: '早睡',
    isCompleted: false,
    type: 'auto',
    autoConfig: {
      filterExpression: '#睡觉',
      comparisonType: 'nightEarliestStart',
      operator: '<',
      targetValue
    }
  };
}

describe('autoCheckUtils nightEarliestStart', () => {
  it('passes when the earliest night sleep start is before the target', () => {
    const checkItem = createNightSleepCheck();
    const logs = [
      createSleepLog('2026-04-15T22:40:00+08:00', '2026-04-16T06:40:00+08:00')
    ];

    expect(evaluateAutoCheck(checkItem, logs, context, new Date('2026-04-15T12:00:00+08:00'))).toBe(true);
  });

  it('fails when only a next-day 00:30 sleep belongs to the previous night window', () => {
    const checkItem = createNightSleepCheck();
    const logs = [
      createSleepLog('2026-04-16T00:30:00+08:00', '2026-04-16T07:10:00+08:00')
    ];

    expect(evaluateAutoCheck(checkItem, logs, context, new Date('2026-04-15T12:00:00+08:00'))).toBe(false);
  });

  it('uses the earliest start across both pre-midnight and post-midnight sleep segments', () => {
    const checkItem = createNightSleepCheck();
    const logs = [
      createSleepLog('2026-04-15T23:20:00+08:00', '2026-04-16T00:20:00+08:00'),
      createSleepLog('2026-04-16T01:10:00+08:00', '2026-04-16T07:00:00+08:00')
    ];

    expect(evaluateAutoCheck(checkItem, logs, context, new Date('2026-04-15T12:00:00+08:00'))).toBe(false);
  });

  it('passes split sleep records when the bedtime segment begins before the target', () => {
    const checkItem = createNightSleepCheck();
    const logs = [
      createSleepLog('2026-04-15T22:49:00+08:00', '2026-04-16T00:00:00+08:00'),
      createSleepLog('2026-04-16T00:00:00+08:00', '2026-04-16T07:00:00+08:00')
    ];

    expect(evaluateAutoCheck(checkItem, logs, context, new Date('2026-04-15T12:00:00+08:00'))).toBe(true);
  });

  it('excludes logs that start at 04:00 sharp from the night window', () => {
    const checkItem = createNightSleepCheck(24 * 60 + 3 * 60 + 59);
    const logs = [
      createSleepLog('2026-04-16T04:00:00+08:00', '2026-04-16T08:00:00+08:00')
    ];

    expect(evaluateAutoCheck(checkItem, logs, context, new Date('2026-04-15T12:00:00+08:00'))).toBe(false);
  });

  it('formats extended night times with the clock value before the next-day marker', () => {
    expect(formatTimeValue(24 * 60 + 30)).toBe('00:30 次日');
  });
});

describe('legacy night sleep configuration migration', () => {
  const legacyAutoConfig = {
    filterExpression: '#睡觉',
    comparisonType: 'nightLatestStart',
    operator: '<' as const,
    targetValue: 23 * 60
  };

  it('migrates template and daily-review snapshots to nightEarliestStart', () => {
    const normalizedTemplate = normalizeCheckTemplates([{
      id: 'template',
      title: '日常',
      enabled: true,
      order: 0,
      isDaily: true,
      items: [{ id: 'sleep', content: '早睡', type: 'auto', autoConfig: legacyAutoConfig }]
    }]);
    const normalizedItem = normalizeCheckItem({
      id: 'sleep',
      content: '早睡',
      type: 'auto',
      isCompleted: false,
      autoConfig: legacyAutoConfig as unknown as CheckItem['autoConfig']
    });

    expect(normalizedTemplate[0].items[0].autoConfig?.comparisonType).toBe('nightEarliestStart');
    expect(normalizedItem.autoConfig?.comparisonType).toBe('nightEarliestStart');
  });
});

describe('hasAutoCheckItemCompletionChanges', () => {
  const autoItem: CheckItem = {
    id: 'auto-check',
    content: 'auto',
    isCompleted: false,
    type: 'auto'
  };
  const manualItem: CheckItem = {
    id: 'manual-check',
    content: 'manual',
    isCompleted: false,
    type: 'manual'
  };

  it('ignores manual check changes and reordered items', () => {
    expect(hasAutoCheckItemCompletionChanges(
      [autoItem, manualItem],
      [{ ...manualItem, isCompleted: true }, { ...autoItem }]
    )).toBe(false);
  });

  it('detects automatic check completion changes', () => {
    expect(hasAutoCheckItemCompletionChanges(
      [autoItem, manualItem],
      [{ ...manualItem }, { ...autoItem, isCompleted: true }]
    )).toBe(true);
  });
});
