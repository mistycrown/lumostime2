/**
 * @file activityStatisticCardUtils.test.ts
 * @input Activity statistic card configurations.
 * @output Regression coverage for default card migration and source capabilities.
 */
import { describe, expect, it } from 'vitest';
import { Activity } from '../types';
import { ensureStatisticCards, getChartTypesForSource, normalizeStatisticCards } from './activityStatisticCardUtils';

const activity = (statisticCards?: Activity['statisticCards']): Activity => ({
  id: 'activity', name: '健康', icon: 'H', color: 'text-stone-800', statisticCards,
  attributes: [
    { id: 'weight', name: '体重', type: 'number', order: 0, createdAt: 1, updatedAt: 1 },
    { id: 'parts', name: '锻炼部位', type: 'multi', options: [{ id: 'leg', label: '腿' }], order: 1, createdAt: 1, updatedAt: 1 },
    { id: 'memo', name: '感受', type: 'text', order: 2, createdAt: 1, updatedAt: 1 }
  ]
});

describe('activity statistic cards', () => {
  it('creates one default card per attribute and is repeatable with persisted cards', () => {
    const first = ensureStatisticCards(activity());
    expect(first.map((card) => card.chartType)).toEqual(['numberTrend', 'choiceBar', 'textCloud']);
    expect(ensureStatisticCards(activity(first)).map((card) => card.id)).toEqual(first.map((card) => card.id));
  });

  it('does not recreate a card that the user deleted', () => {
    const first = ensureStatisticCards(activity());
    const remaining = first.slice(1);
    expect(normalizeStatisticCards(activity(remaining))).toHaveLength(2);
  });

  it('allows note only as a text cloud source', () => {
    expect(getChartTypesForSource({ type: 'note' }, activity().attributes || [])).toEqual(['textCloud']);
  });
});
