/**
 * @file activityStatisticCardUtils.test.ts
 * @input Activity statistic card configurations.
 * @output Regression coverage for default card migration and source capabilities.
 */
import { describe, expect, it } from 'vitest';
import { Activity, ActivityStatisticCard } from '../types';
import { ensureStatisticCards, getChartTypesForSource, normalizeStatisticCards } from './activityStatisticCardUtils';

const activity = (statisticCards?: Activity['statisticCards']): Activity => ({
  id: 'activity', name: '健康', icon: 'H', color: 'text-stone-800', statisticCards,
  attributes: [
    { id: 'weight', name: '体重', type: 'number', order: 0, createdAt: 1, updatedAt: 1 },
    { id: 'parts', name: '锻炼部位', type: 'multi', options: [{ id: 'leg', label: '腿' }], order: 1, createdAt: 1, updatedAt: 1 },
    { id: 'kind', name: '训练类型', type: 'single', options: [{ id: 'run', label: '跑步' }], order: 2, createdAt: 1, updatedAt: 1 },
    { id: 'memo', name: '感受', type: 'text', order: 3, createdAt: 1, updatedAt: 1 }
  ]
});

describe('activity statistic cards', () => {
  it('creates one default card per attribute and is repeatable with persisted cards', () => {
    const first = ensureStatisticCards(activity());
    expect(first.map((card) => card.chartType)).toEqual(['numberHistogram', 'choiceBar', 'choiceBar', 'textCloud']);
    expect(ensureStatisticCards(activity([]))).toHaveLength(4);
    expect(ensureStatisticCards(activity(first)).map((card) => card.id)).toEqual(first.map((card) => card.id));
  });

  it('does not recreate a card that the user deleted', () => {
    const first = ensureStatisticCards(activity());
    const remaining = first.slice(1);
    expect(normalizeStatisticCards(activity(remaining))).toHaveLength(3);
  });

  it('uses a bounded default range and migrates legacy all-time cards', () => {
    const first = ensureStatisticCards(activity());
    expect(first.every((card) => card.range === '30d')).toBe(true);
    expect(normalizeStatisticCards(activity([{ ...first[0], range: 'all' }]))[0]?.range).toBe('30d');
  });

  it('keeps heatmap metrics on counts', () => {
    const heatmapCard: ActivityStatisticCard = {
      id: 'heatmap', source: { type: 'attribute', attributeId: 'parts' }, chartType: 'choiceHeatmap', range: '30d', metric: 'duration', order: 0
    };
    expect(normalizeStatisticCards(activity([heatmapCard]))[0]?.metric).toBe('count');
  });

  it('offers Lieflat-inspired numeric charts and rejects donut charts for multi-choice data', () => {
    const attributes = activity().attributes || [];
    expect(getChartTypesForSource({ type: 'attribute', attributeId: 'weight' }, attributes)).toEqual([
      'numberArea', 'numberHistogram', 'numberCalendar', 'numberKpi'
    ]);
    expect(getChartTypesForSource({ type: 'attribute', attributeId: 'kind' }, attributes)).toEqual(['choiceBar', 'choiceDonut', 'choiceHeatmap']);
    expect(getChartTypesForSource({ type: 'attribute', attributeId: 'parts' }, attributes)).toEqual(['choiceBar', 'choiceHeatmap']);
    const legacyMultiDonut: ActivityStatisticCard = {
      id: 'legacy-donut', source: { type: 'attribute', attributeId: 'parts' }, chartType: 'choiceDonut', range: '30d', metric: 'count', order: 0
    };
    expect(normalizeStatisticCards(activity([legacyMultiDonut]))[0]?.chartType).toBe('choiceBar');
    const legacyTrend = {
      id: 'legacy-trend', source: { type: 'attribute', attributeId: 'weight' }, chartType: 'numberTrend', range: '30d', metric: 'value', order: 0
    } as unknown as ActivityStatisticCard;
    expect(normalizeStatisticCards(activity([legacyTrend]))[0]?.chartType).toBe('numberHistogram');
    const legacyBox = {
      id: 'legacy-box', source: { type: 'attribute', attributeId: 'weight' }, chartType: 'numberBox', range: '30d', metric: 'value', order: 0
    } as unknown as ActivityStatisticCard;
    expect(normalizeStatisticCards(activity([legacyBox]))[0]?.chartType).toBe('numberHistogram');
    const durationChoice: ActivityStatisticCard = {
      id: 'duration-choice', source: { type: 'attribute', attributeId: 'parts' }, chartType: 'choiceBar', range: '30d', metric: 'duration', order: 0
    };
    expect(normalizeStatisticCards(activity([durationChoice]))[0]?.metric).toBe('count');
    const calendarCard: ActivityStatisticCard = {
      id: 'calendar', source: { type: 'attribute', attributeId: 'weight' }, chartType: 'numberCalendar', range: '7d', metric: 'value', order: 0
    };
    expect(normalizeStatisticCards(activity([calendarCard]))[0]?.range).toBe('year');
  });

  it('allows note only as a text cloud source', () => {
    expect(getChartTypesForSource({ type: 'note' }, activity().attributes || [])).toEqual(['textCloud']);
  });

  it('exposes chart families that match each attribute shape', () => {
    const attributes = activity().attributes || [];
    expect(getChartTypesForSource({ type: 'attribute', attributeId: 'weight' }, attributes)).toEqual(['numberArea', 'numberHistogram', 'numberCalendar', 'numberKpi']);
    expect(getChartTypesForSource({ type: 'attribute', attributeId: 'parts' }, attributes)).toEqual(['choiceBar', 'choiceHeatmap']);
  });
});
