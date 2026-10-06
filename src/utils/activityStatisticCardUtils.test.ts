/**
 * @file activityStatisticCardUtils.test.ts
 * @updated 2026-10-06: Covers persisted all-time capability rules and record-duration sources.
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

  it('uses a bounded default range and preserves supported all-time cards', () => {
    const first = ensureStatisticCards(activity());
    expect(first.every((card) => card.range === '30d')).toBe(true);
    expect(normalizeStatisticCards(activity([{ ...first[0], range: 'all' }]))[0]?.range).toBe('all');
  });

  it('round-trips all-time summary cards for notes, attributes, categories, and record collections', () => {
    const cards: ActivityStatisticCard[] = [
      { id: 'notes', source: { type: 'note' }, chartType: 'textCloud', range: 'all', metric: 'count', order: 0 },
      { id: 'numeric', source: { type: 'attribute', attributeId: 'weight' }, chartType: 'numberKpi', range: 'all', metric: 'average', order: 1 },
      { id: 'choices', source: { type: 'attribute', attributeId: 'kind' }, chartType: 'choiceDonut', range: 'all', metric: 'duration', order: 2 },
      { id: 'multi', source: { type: 'attribute', attributeId: 'parts' }, chartType: 'choiceBar', range: 'all', metric: 'count', order: 3 },
      { id: 'tags', source: { type: 'categoryActivity' }, chartType: 'choiceTreemap', range: 'all', metric: 'count', order: 4 },
      { id: 'duration', source: { type: 'recordDuration' }, chartType: 'numberKpi', range: 'all', metric: 'count', order: 5 },
      { id: 'rhythm', source: { type: 'recordDuration' }, chartType: 'tagDurationPetalTimeline', range: 'all', metric: 'count', timelineStyle: 'histogram', order: 6 }
    ];
    const saved = normalizeStatisticCards(activity(JSON.parse(JSON.stringify(cards))));
    expect(saved).toEqual(cards);
    expect(getChartTypesForSource({ type: 'recordDuration' }, [])).toEqual(getChartTypesForSource({ type: 'tagDuration' }, []));
  });

  it('migrates unsupported all-time calendars, trends, stacked bars, and boxplots to supported ranges', () => {
    const types = ['numberArea', 'numberCalendar', 'tagDurationBoxplot'] as const;
    const cards: ActivityStatisticCard[] = types.map((chartType, order) => ({
      id: chartType, source: { type: 'tagDuration' }, chartType, range: 'all', metric: 'count', order
    }));
    cards.push({ id: 'heatmap', source: { type: 'categoryActivity' }, chartType: 'choiceHeatmap', range: 'all', metric: 'count', order: 3 });
    cards.push({ id: 'stacked', source: { type: 'categoryActivity' }, chartType: 'choiceStacked', range: 'all', metric: 'count', order: 4 });
    expect(normalizeStatisticCards(activity(cards)).map((card) => card.range)).toEqual(['30d', 'year', 'year', '30d', '30d']);
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
    expect(getChartTypesForSource({ type: 'attribute', attributeId: 'kind' }, attributes)).toEqual(['choiceBar', 'choiceDonut', 'choiceHeatmap', 'choiceTreemap', 'choiceStacked']);
    expect(getChartTypesForSource({ type: 'attribute', attributeId: 'parts' }, attributes)).toEqual(['choiceBar', 'choiceHeatmap']);
    expect(getChartTypesForSource({ type: 'categoryActivity' }, attributes)).toEqual(['choiceBar', 'choiceDonut', 'choiceHeatmap', 'choiceTreemap', 'choiceStacked']);
    expect(getChartTypesForSource({ type: 'categoryDuration' }, attributes)).toEqual(['numberArea', 'numberCalendar', 'numberKpi', 'tagDurationBoxplot', 'tagDurationWeekHourHeatmap', 'tagDurationPetalTimeline']);
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
    expect(normalizeStatisticCards(activity([durationChoice]))[0]?.metric).toBe('duration');
    const calendarCard: ActivityStatisticCard = {
      id: 'calendar', source: { type: 'attribute', attributeId: 'weight' }, chartType: 'numberCalendar', range: '7d', metric: 'value', order: 0
    };
    expect(normalizeStatisticCards(activity([calendarCard]))[0]?.range).toBe('7d');
  });

  it('allows note only as a text cloud source', () => {
    expect(getChartTypesForSource({ type: 'note' }, activity().attributes || [])).toEqual(['textCloud']);
  });

  it('migrates stacked choice charts away from the unsupported year range', () => {
    const single = { id: 'mood', name: 'Mood', type: 'single' as const, options: [], order: 0, createdAt: 1, updatedAt: 1 };
    const card: ActivityStatisticCard = {
      id: 'stacked-year', source: { type: 'attribute', attributeId: 'mood' }, chartType: 'choiceStacked', range: 'year', metric: 'count', order: 0
    };
    expect(normalizeStatisticCards({ id: 'activity-3', name: 'Activity', color: '#000', attributes: [single], statisticCards: [card] } as Activity)[0]?.range).toBe('30d');
  });

  it('keeps the yearly range for petal rhythm cards', () => {
    const card: ActivityStatisticCard = {
      id: 'petal-year', source: { type: 'tagDuration' }, chartType: 'tagDurationPetalTimeline', range: 'year', metric: 'duration', order: 0
    };
    expect(normalizeStatisticCards(activity([card]))[0]?.range).toBe('year');
  });

  it('exposes chart families that match each attribute shape', () => {
    const attributes = activity().attributes || [];
    expect(getChartTypesForSource({ type: 'attribute', attributeId: 'weight' }, attributes)).toEqual(['numberArea', 'numberHistogram', 'numberCalendar', 'numberKpi']);
    expect(getChartTypesForSource({ type: 'attribute', attributeId: 'parts' }, attributes)).toEqual(['choiceBar', 'choiceHeatmap']);
  });
});
