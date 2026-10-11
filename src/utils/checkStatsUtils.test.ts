/**
 * @file checkStatsUtils.test.ts
 * @input Habit review fixtures and range navigation
 * @output Regression coverage for counts, leap years and cache invalidation/eviction
 * @pos Test (Statistics - Check)
 * @updated 2026-10-11: Covers extracted aggregation and recent-range caching.
 */
import { describe, expect, it } from 'vitest';
import type { CheckTemplate, DailyReview } from '../types';
import { buildCheckStats, createCheckStatsCache } from './checkStatsUtils';

const review: DailyReview = {
  id: 'review', date: '2024-02-29', createdAt: 1, updatedAt: 1, answers: [],
  checkItems: [
    { id: 'binary', category: 'daily', content: 'read', isCompleted: true, type: 'manual', icon: '📚' },
    { id: 'count', category: 'daily', content: 'water', isCompleted: false, type: 'manual', manualMode: 'count', targetCount: 3, currentCount: 2 },
    { id: 'legacy-count', category: 'daily', content: 'walk', isCompleted: true, type: 'manual', manualMode: 'count', targetCount: 4 },
    { id: 'temporary', content: 'temporary', isCompleted: true, type: 'manual' }
  ]
};
const templates: CheckTemplate[] = [{
  id: 'template', title: 'daily', enabled: true, isDaily: true, order: 0,
  items: [{ id: 'read', content: 'read', icon: '🌱', color: '#123456' }, { id: 'water', content: 'water' }]
}];
const year = (value: number) => ({ rangeStart: new Date(value, 0, 1), rangeEnd: new Date(value, 11, 31, 23, 59, 59, 999) });

describe('buildCheckStats', () => {
  it('includes leap day, keeps review order and prefers current template metadata', () => {
    const result = buildCheckStats({ dailyReviews: [review], checkTemplates: templates, ...year(2024) });
    expect(result.allDays).toHaveLength(366);
    expect(result.allDays).toContain('2024-02-29');
    expect(result.allDays.at(-1)).toBe('2024-12-31');
    expect(result.categories[0].items.map(item => item.name)).toEqual(['read', 'water']);
    expect(result.categories[0].items[0]).toMatchObject({ icon: '🌱', color: '#123456', stats: { checked: 1 } });
    expect(result.categories[0].items[1]).toMatchObject({
      dayDetails: { '2024-02-29': { value: 2, target: 3 } },
      stats: { checked: 1, countTotal: 2, isCountMode: true }
    });
  });

  it('retains legacy count fallback and excludes other years and temporary items', () => {
    const result = buildCheckStats({ dailyReviews: [review, { ...review, id: 'old', date: '2023-12-31' }], ...year(2024) });
    expect(result.categories[0].items.map(item => item.name)).toEqual(['read', 'water', 'walk']);
    expect(result.categories[0].items[0]).toMatchObject({ icon: '📚', stats: { total: 1, checked: 1 } });
    expect(result.categories[0].items[2]).toMatchObject({ stats: { countTotal: 4 }, dayDetails: { '2024-02-29': { value: 4, target: 4 } } });
  });

  it('filters disabled templates and supports empty and non-leap ranges', () => {
    expect(buildCheckStats({ dailyReviews: [review], checkTemplates: [{ ...templates[0], enabled: false }], ...year(2024) }).categories).toEqual([]);
    const result = buildCheckStats({ dailyReviews: [], ...year(2025) });
    expect(result.allDays).toHaveLength(365);
    expect(result.categories).toEqual([]);
  });

  it('keeps month and cross-month week boundaries', () => {
    const month = buildCheckStats({ dailyReviews: [review], rangeStart: new Date(2024, 1, 1), rangeEnd: new Date(2024, 1, 29, 23, 59, 59, 999) });
    expect(month.allDays).toHaveLength(29);
    const week = buildCheckStats({ dailyReviews: [review], rangeStart: new Date(2024, 1, 26), rangeEnd: new Date(2024, 2, 3, 23, 59, 59, 999) });
    expect(week.allDays).toHaveLength(7);
    expect(week.allDays.at(-1)).toBe('2024-03-03');
  });
});

describe('createCheckStatsCache', () => {
  it('reuses an annual result after navigating away with new Date instances', () => {
    const get = createCheckStatsCache();
    const dailyReviews = [review];
    const result = get({ dailyReviews, checkTemplates: templates, ...year(2024) });
    get({ dailyReviews, checkTemplates: templates, ...year(2025) });
    expect(get({ dailyReviews, checkTemplates: templates, ...year(2024) })).toBe(result);
  });

  it('invalidates cached years after reviews or templates change', () => {
    const get = createCheckStatsCache();
    const dailyReviews = [review];
    const result = get({ dailyReviews, checkTemplates: templates, ...year(2024) });
    const updatedReviews = [{ ...review, checkItems: review.checkItems.map(item => ({ ...item, isCompleted: false, currentCount: 0 })) }];
    const updated = get({ dailyReviews: updatedReviews, checkTemplates: templates, ...year(2024) });
    expect(updated).not.toBe(result);
    expect(updated.categories[0].items[0].stats.checked).toBe(0);
    expect(updated.categories[0].items[1].stats.countTotal).toBe(0);
    const recolored = [{ ...templates[0], items: templates[0].items.map(item => ({ ...item, color: '#abcdef' })) }];
    const recoloredResult = get({ dailyReviews: updatedReviews, checkTemplates: recolored, ...year(2024) });
    expect(recoloredResult).not.toBe(updated);
    expect(recoloredResult.categories[0].items[0].color).toBe('#abcdef');
  });

  it('retains six recent ranges and evicts the least recently viewed one', () => {
    const get = createCheckStatsCache();
    const dailyReviews = [review];
    const oldest = get({ dailyReviews, ...year(2020) });
    const recent = get({ dailyReviews, ...year(2021) });
    for (let value = 2022; value <= 2025; value++) get({ dailyReviews, ...year(value) });
    expect(get({ dailyReviews, ...year(2020) })).toBe(oldest);
    get({ dailyReviews, ...year(2026) });
    expect(get({ dailyReviews, ...year(2020) })).toBe(oldest);
    expect(get({ dailyReviews, ...year(2021) })).not.toBe(recent);
  });
});
