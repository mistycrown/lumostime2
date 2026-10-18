/**
 * @file autoCheckUtils.test.ts
 * @input Auto-check configs, dated logs and shared filter context
 * @output Regression coverage for filter parity, metrics and night-time checks
 * @pos Test (Auto Check)
 * @updated 2026-10-18: Verifies AND/OR/exclusions agree with custom-filter statistics.
 */
import { describe, expect, it } from 'vitest';
import type { CheckItem, Log } from '../types';
import { evaluateAutoCheck, getAutoCheckMetricForDate, formatTimeValue, hasAutoCheckItemCompletionChanges, updateAutoCheckItems } from './autoCheckUtils';
import { normalizeCheckItem, normalizeCheckTemplates } from './checkItemNormalizer';
import type { FilterContext } from './filterUtils';
import { getFilterStats } from './filterUtils';

const context: FilterContext = {
  categories: [
    {
      id: 'sleep',
      name: '睡眠',
      icon: '🛌',
      themeColor: '#78716c',
      activities: [
        {
          id: 'sleep_act',
          name: '睡觉',
          icon: '🛌',
          color: 'bg-stone-100 text-stone-700'
        }
      ]
    }
  ],
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

describe('auto-check and custom-filter matching parity', () => {
  const targetDate = new Date(2026, 9, 18, 12);
  const filterContext: FilterContext = {
    ...context,
    scopes: [{ id: 'health', name: '健康', icon: '🌿', isArchived: false, order: 0, themeColor: '#00aa88' }],
    todos: [{ id: 'plan', title: '睡眠计划', categoryId: 'plans', isCompleted: false }],
    todoCategories: [{ id: 'plans', name: '计划', icon: '📋' }]
  };
  const log: Log = {
    id: 'matching', categoryId: 'sleep', activityId: 'sleep_act',
    startTime: new Date(2026, 9, 18, 8).getTime(),
    endTime: new Date(2026, 9, 18, 9).getTime(), duration: 3600,
    scopeIds: ['health'], linkedTodoId: 'plan', note: '深度 休息', reactions: ['🌸']
  };
  const logs: Log[] = [
    log,
    { ...log, id: 'without-scope', scopeIds: [] },
    { ...log, id: 'without-note', note: '浅睡' },
    { ...log, id: 'excluded', note: '深度 休息 草稿' },
    { ...log, id: 'planned', isPlanned: true }
  ];

  it.each([
    '#睡觉 %健康 深度 休息 @计划 ^🌸 -草稿',
    '#睡觉 AND %健康 and 深度 AND 休息 AND @计划 AND ^🌸 AND -草稿',
    '#午睡 OR 睡觉 AND #睡眠 AND %健康 AND 深度 OR 熟睡 AND 休息 -草稿'
  ])('uses the same matching records for %s', (filterExpression) => {
    const stats = getFilterStats(logs, { id: 'filter', name: '休息', filterExpression, createdAt: 0 }, filterContext);
    expect(stats).toEqual({ count: 1, totalDuration: 3600 });

    const check: CheckItem = {
      ...createNightSleepCheck(),
      autoConfig: { filterExpression, comparisonType: 'duration', operator: '>=', targetValue: 60 }
    };
    expect(getAutoCheckMetricForDate(check, logs, filterContext, targetDate)).toBe(stats.totalDuration / 60);
    expect(evaluateAutoCheck(check, logs, filterContext, targetDate)).toBe(true);
    check.autoConfig = { ...check.autoConfig!, targetValue: 61 };
    expect(evaluateAutoCheck(check, logs, filterContext, targetDate)).toBe(false);
    check.autoConfig = { ...check.autoConfig, comparisonType: 'count', targetValue: 1 };
    expect(getAutoCheckMetricForDate(check, logs, filterContext, targetDate)).toBe(stats.count);
  });
});

describe('autoCheckUtils nightEarliestStart', () => {
  it('refreshes a following-day review from the previous night', () => {
    const checkItem = createNightSleepCheck();
    const logs = [
      createSleepLog('2026-04-15T22:40:00+08:00', '2026-04-16T06:40:00+08:00')
    ];

    const updated = updateAutoCheckItems(
      [checkItem],
      logs,
      context,
      new Date('2026-04-16T12:00:00+08:00')
    );

    expect(updated[0].isCompleted).toBe(true);
  });

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
