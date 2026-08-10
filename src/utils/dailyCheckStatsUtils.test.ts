import { describe, expect, it } from 'vitest';
import type { CheckItem } from '../types';
import {
  formatDurationMinutes,
  getCompletionRate,
  getCurrentStreak,
  getDailyCheckDisplayType,
  getDailyCheckHistory,
  getDailyCheckItemForDate,
  getDailyCheckOverviewAnchorDate,
  getDailyCheckRecordedHistory,
  getDailyCheckTypeLabel
} from './dailyCheckStatsUtils';

describe('dailyCheckStatsUtils', () => {
  it('formats durations without adding units to count values', () => {
    expect(formatDurationMinutes(0)).toBe('0m');
    expect(formatDurationMinutes(75)).toBe('1h 15m');
    expect(formatDurationMinutes(120)).toBe('2h');
  });

  it('maps manual, automatic duration, and automatic time checks to display types', () => {
    const binary: CheckItem = {
      id: 'binary',
      content: '阅读',
      isCompleted: false,
      type: 'manual',
      manualMode: 'binary'
    };
    const count: CheckItem = {
      id: 'count',
      content: '背单词',
      isCompleted: false,
      type: 'manual',
      manualMode: 'count',
      currentCount: 2,
      targetCount: 5
    };
    const duration: CheckItem = {
      id: 'duration',
      content: '专注时长',
      isCompleted: false,
      type: 'auto',
      autoConfig: {
        filterExpression: '#study',
        comparisonType: 'duration',
        operator: '>=',
        targetValue: 120
      }
    };
    const time: CheckItem = {
      id: 'time',
      content: '早起时间',
      isCompleted: false,
      type: 'auto',
      autoConfig: {
        filterExpression: '#morning',
        comparisonType: 'earliestStart',
        operator: '<=',
        targetValue: 480
      }
    };

    expect(getDailyCheckDisplayType(binary)).toBe('binary');
    expect(getDailyCheckDisplayType(count)).toBe('count');
    expect(getDailyCheckDisplayType(duration)).toBe('duration');
    expect(getDailyCheckDisplayType(time)).toBe('time');
    expect(getDailyCheckTypeLabel(time)).toBe('自动 · 时刻');
  });

  it('calculates completion rate and the trailing streak', () => {
    const history = [
      { date: new Date('2026-08-03T12:00:00'), dateLabel: '8/3', value: 1, isCompleted: true, hasReview: true, hasRecord: true },
      { date: new Date('2026-08-04T12:00:00'), dateLabel: '8/4', value: 0, isCompleted: false, hasReview: true, hasRecord: true },
      { date: new Date('2026-08-05T12:00:00'), dateLabel: '8/5', value: 1, isCompleted: true, hasReview: true, hasRecord: true },
      { date: new Date('2026-08-06T12:00:00'), dateLabel: '8/6', value: 1, isCompleted: true, hasReview: true, hasRecord: true },
      { date: new Date('2026-08-07T12:00:00'), dateLabel: '8/7', value: 1, isCompleted: true, hasReview: true, hasRecord: true }
    ];

    expect(getCompletionRate(history)).toBe(80);
    expect(getCurrentStreak(history)).toBe(3);
  });

  it('does not fall back to template data when a daily review is missing', () => {
    const checkTemplates = [{
      id: 'template',
      title: '日常',
      items: [{
        id: 'binary',
        content: '阅读',
        enabled: true,
        type: 'manual' as const,
        manualMode: 'binary' as const
      }],
      enabled: true,
      order: 0,
      isDaily: true
    }];
    const filterContext = { categories: [], scopes: [], todos: [], todoCategories: [] };
    const date = new Date('2026-08-09T12:00:00');

    expect(getDailyCheckItemForDate({
      itemId: 'binary',
      date,
      dailyReviews: [],
      checkTemplates,
      logs: [],
      filterContext
    })).toBeNull();

    expect(getDailyCheckHistory({
      itemId: 'binary',
      anchorDate: date,
      days: 1,
      dailyReviews: [],
      checkTemplates,
      logs: [],
      filterContext
    })[0]).toMatchObject({ value: null, isCompleted: false, hasReview: false, hasRecord: false });
  });

  it('counts only daily reviews containing the requested check as effective history', () => {
    const checkTemplates = [{
      id: 'template',
      title: '日常',
      items: [{ id: 'binary', content: '阅读', enabled: true, type: 'manual' as const }],
      enabled: true,
      order: 0,
      isDaily: true
    }];
    const filterContext = { categories: [], scopes: [], todos: [], todoCategories: [] };
    const dailyReviews = [
      {
        id: 'with-item', date: '2026-08-07', createdAt: 1, updatedAt: 1, answers: [],
        checkItems: [{ id: 'binary', content: '阅读', isCompleted: true, type: 'manual' as const }]
      },
      {
        id: 'without-item', date: '2026-08-08', createdAt: 1, updatedAt: 1, answers: [], checkItems: []
      },
      {
        id: 'unfinished', date: '2026-08-09', createdAt: 1, updatedAt: 1, answers: [],
        checkItems: [{ id: 'binary', content: '阅读', isCompleted: false, type: 'manual' as const }]
      }
    ];

    const history = getDailyCheckRecordedHistory({
      itemId: 'binary',
      anchorDate: new Date('2026-08-09T12:00:00'),
      dailyReviews,
      checkTemplates,
      logs: [],
      filterContext
    });

    expect(history).toHaveLength(2);
    expect(getCompletionRate(history)).toBe(50);
    expect(getCurrentStreak(history, new Date('2026-08-09T12:00:00'))).toBe(0);
  });

  it('breaks the current streak across dates without an effective record', () => {
    const history = [
      { date: new Date('2026-08-07T12:00:00'), dateLabel: '8/7', value: 1, isCompleted: true, hasReview: true, hasRecord: true },
      { date: new Date('2026-08-09T12:00:00'), dateLabel: '8/9', value: 1, isCompleted: true, hasReview: true, hasRecord: true }
    ];

    expect(getCurrentStreak(history, new Date('2026-08-09T12:00:00'))).toBe(1);
  });

  it('uses the previous night and live completion status for split early-sleep records', () => {
    const earlySleep: CheckItem = {
      id: 'sleep',
      content: '早睡',
      isCompleted: false,
      type: 'auto',
      autoConfig: {
        filterExpression: '#睡觉',
        comparisonType: 'nightEarliestStart',
        operator: '<',
        targetValue: 23 * 60
      }
    };
    const checkTemplates = [{
      id: 'template',
      title: '日常',
      items: [{ ...earlySleep, enabled: true }],
      enabled: true,
      order: 0,
      isDaily: true
    }];
    const dailyReviews = [{
      id: 'review', date: '2026-08-09', createdAt: 1, updatedAt: 1, answers: [],
      checkItems: [earlySleep]
    }];
    const filterContext = {
      categories: [{
        id: 'sleep-category', name: '睡眠', color: '', activities: [{ id: 'sleep', name: '睡觉', icon: '', color: '' }]
      }],
      scopes: [], todos: [], todoCategories: []
    };
    const logs = [
      { id: 'first', categoryId: 'sleep-category', activityId: 'sleep', startTime: new Date('2026-08-09T22:49:00').getTime(), endTime: new Date('2026-08-10T00:00:00').getTime(), duration: 42660 },
      { id: 'second', categoryId: 'sleep-category', activityId: 'sleep', startTime: new Date('2026-08-10T00:00:00').getTime(), endTime: new Date('2026-08-10T07:00:00').getTime(), duration: 25200 }
    ];
    const overviewDate = new Date('2026-08-10T12:00:00');
    const history = getDailyCheckHistory({
      itemId: 'sleep',
      anchorDate: getDailyCheckOverviewAnchorDate(earlySleep, overviewDate),
      days: 1,
      dailyReviews,
      checkTemplates,
      logs,
      filterContext
    });

    expect(getDailyCheckOverviewAnchorDate(earlySleep, overviewDate).getDate()).toBe(9);
    expect(history[0]).toMatchObject({ value: 22 * 60 + 49, isCompleted: true, hasRecord: true });
  });
});
