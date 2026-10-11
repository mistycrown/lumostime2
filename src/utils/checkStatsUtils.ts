/**
 * @file checkStatsUtils.ts
 * @input Daily reviews, active check templates and a local date range
 * @output Habit statistics and a bounded, source-aware range cache
 * @pos Utility (Statistics - Check)
 * @updated 2026-10-11: Extracted daily-check aggregation and cached six recent ranges; source changes invalidate the cache.
 */
import type { CheckTemplate, DailyReview } from '../types';
import type { CheckStats } from '../components/stats/CheckView';

export interface CheckStatsOptions {
  dailyReviews: DailyReview[];
  checkTemplates?: CheckTemplate[];
  rangeStart: Date;
  rangeEnd: Date;
}

export const EMPTY_CHECK_STATS: CheckStats = { categories: [], allDays: [], dateMap: {} };

export const buildCheckStats = ({ dailyReviews, checkTemplates, rangeStart, rangeEnd }: CheckStatsOptions): CheckStats => {
  const days: string[] = [];
  const dateMap: Record<string, Date> = {};
  const current = new Date(rangeStart);
  while (current <= rangeEnd && days.length < 366) {
    const date = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    days.push(date);
    dateMap[date] = new Date(current);
    current.setDate(current.getDate() + 1);
  }

  const daySet = new Set(days);
  const activeTemplates = (checkTemplates || []).filter(template => template.enabled && template.isDaily);
  const activeKeys = new Set(activeTemplates.flatMap(template => template.items.map(item => `${template.title}|${item.content}`)));
  const filterByTemplates = Array.isArray(checkTemplates);
  const icons: Record<string, { icon: string; uiIcon?: string; color?: string }> = {};
  activeTemplates.forEach(template => {
    template.items.forEach(item => {
      icons[`${template.title}|${item.content}`] = { icon: item.icon || '🔵', uiIcon: item.uiIcon, color: item.color };
    });
  });

  type Habit = CheckStats['categories'][number]['items'][number];
  const groups = new Map<string, Map<string, Habit>>();
  dailyReviews.forEach(review => {
    if (!daySet.has(review.date) || !review.checkItems) return;
    review.checkItems.forEach(item => {
      if (!item.category) return;
      const key = `${item.category}|${item.content}`;
      if (filterByTemplates && !activeKeys.has(key)) return;
      if (!icons[key] && (item.icon || item.uiIcon)) {
        icons[key] = { icon: item.icon || '🔵', uiIcon: item.uiIcon };
      }
      let group = groups.get(item.category);
      if (!group) {
        group = new Map();
        groups.set(item.category, group);
      }
      let habit = group.get(item.content);
      if (!habit) {
        habit = {
          name: item.content,
          icon: '🔵',
          days: {},
          stats: { total: 0, checked: 0, countTotal: 0, isCountMode: false }
        };
        group.set(item.content, habit);
      }
      habit.stats.total++;
      let checked = item.isCompleted;
      if (item.type !== 'auto' && item.manualMode === 'count') {
        const target = Math.max(1, Math.floor(item.targetCount || 1));
        const rawCount = typeof item.currentCount === 'number' ? item.currentCount : (item.isCompleted ? target : 0);
        const count = Math.min(target, Math.max(0, Math.floor(rawCount)));
        habit.dayDetails ??= {};
        habit.dayDetails[review.date] = { value: count, target };
        habit.stats.isCountMode = true;
        habit.stats.countTotal += count;
        checked = count > 0;
      }
      habit.days[review.date] = checked;
      if (checked) habit.stats.checked++;
    });
  });

  return {
    categories: Array.from(groups, ([name, group]) => ({
      name,
      items: Array.from(group.values(), habit => ({ ...habit, ...(icons[`${name}|${habit.name}`] || {}) }))
    })),
    allDays: days,
    dateMap
  };
};

/** Each view owns its cache; immutable review/template updates clear all stale results. */
export const createCheckStatsCache = () => {
  let reviews: DailyReview[] | undefined;
  let templates: CheckTemplate[] | undefined;
  const ranges = new Map<string, CheckStats>();
  return (options: CheckStatsOptions): CheckStats => {
    if (reviews !== options.dailyReviews || templates !== options.checkTemplates) {
      ranges.clear();
      reviews = options.dailyReviews;
      templates = options.checkTemplates;
    }
    const key = `${options.rangeStart.getTime()}|${options.rangeEnd.getTime()}`;
    let result = ranges.get(key);
    if (result) ranges.delete(key);
    else result = buildCheckStats(options);
    ranges.set(key, result);
    if (ranges.size > 6) ranges.delete(ranges.keys().next().value!);
    return result;
  };
};
