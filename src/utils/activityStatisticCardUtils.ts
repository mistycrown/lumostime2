/**
 * @file activityStatisticCardUtils.ts
 * @input Activity attribute definitions and persisted statistic card settings.
 * @output Normalized card settings, default cards, and chart capability helpers.
 * @pos Utility (Activity Statistics)
 * @description Keeps per-activity statistic card configuration backward-compatible and type-safe.
 * @updated 2026-09-20: Removes the numeric trend card, defaults numeric attributes to histogram cards, and keeps choice cards on count metrics.
 */
import {
  Activity,
  ActivityAttributeDefinition,
  ActivityStatisticCard,
  ActivityStatisticCardSource,
  ActivityStatisticCardType,
  ActivityStatisticMetric,
  ActivityStatisticRange
} from '../types';

const RANGES: ActivityStatisticRange[] = ['all', '7d', '30d', 'month', 'year'];
const METRICS: ActivityStatisticMetric[] = ['value', 'count', 'duration', 'average', 'sum'];
const CARD_TYPES: ActivityStatisticCardType[] = ['textCloud', 'numberArea', 'numberHistogram', 'numberCalendar', 'numberKpi', 'choiceBar', 'choiceDonut', 'choiceHeatmap', 'choiceTreemap', 'tagDurationBoxplot', 'tagDurationWeekHourHeatmap'];

export const getDefaultChartType = (type: ActivityAttributeDefinition['type']): ActivityStatisticCardType => {
  if (type === 'text') return 'textCloud';
  if (type === 'number') return 'numberHistogram';
  return 'choiceBar';
};

export const getChartTypesForSource = (source: ActivityStatisticCardSource, attributes: ActivityAttributeDefinition[]): ActivityStatisticCardType[] => {
  if (source.type === 'note') return ['textCloud'];
  if (source.type === 'tagDuration') return ['numberArea', 'numberCalendar', 'numberKpi', 'tagDurationBoxplot', 'tagDurationWeekHourHeatmap'];
  const attribute = attributes.find((item) => item.id === source.attributeId);
  if (!attribute) return [];
  if (attribute.type === 'text') return ['textCloud'];
  if (attribute.type === 'number') return ['numberArea', 'numberHistogram', 'numberCalendar', 'numberKpi'];
  if (attribute.type === 'single') return ['choiceBar', 'choiceDonut', 'choiceHeatmap', 'choiceTreemap'];
  return ['choiceBar', 'choiceHeatmap'];
};

const isCardSource = (value: unknown): value is ActivityStatisticCardSource => {
  if (!value || typeof value !== 'object') return false;
  const source = value as Record<string, unknown>;
  return source.type === 'note'
    || source.type === 'tagDuration'
    || (source.type === 'attribute' && typeof source.attributeId === 'string' && source.attributeId.length > 0);
};

const normalizeSource = (raw: unknown): ActivityStatisticCardSource | null => {
  if (isCardSource(raw)) return raw;
  if (raw && typeof raw === 'object' && typeof (raw as Record<string, unknown>).attributeId === 'string') {
    return { type: 'attribute', attributeId: (raw as Record<string, string>).attributeId };
  }
  return null;
};

const normalizeCard = (raw: unknown, index: number, attributes: ActivityAttributeDefinition[]): ActivityStatisticCard | null => {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const source = normalizeSource(item.source ?? item);
  if (!source) return null;
  const persistedChartType = item.chartType === 'numberTrend' || item.chartType === 'numberBox' ? 'numberHistogram' : item.chartType;
  const rawChartType = CARD_TYPES.includes(persistedChartType as ActivityStatisticCardType)
    ? persistedChartType as ActivityStatisticCardType
    : null;
  if (!rawChartType) return null;
  const sourceAttribute = source.type === 'attribute' ? attributes.find((attribute) => attribute.id === source.attributeId) : undefined;
  const allowedTypes = getChartTypesForSource(source, attributes);
  const chartType = rawChartType === 'choiceDonut' && sourceAttribute?.type === 'multi'
    ? 'choiceBar'
    : rawChartType;
  if (!allowedTypes.includes(chartType)) return null;
  const rawRange = RANGES.includes(item.range as ActivityStatisticRange)
    ? item.range as ActivityStatisticRange
    : chartType === 'numberCalendar' || chartType === 'tagDurationBoxplot' ? 'year'
      : chartType === 'tagDurationWeekHourHeatmap' ? 'all'
        : '30d';
  const range = rawRange === 'all' && source.type !== 'tagDuration' ? '30d' : rawRange;
  const metric = METRICS.includes(item.metric as ActivityStatisticMetric) ? item.metric as ActivityStatisticMetric : 'count';
  const normalizedMetric = source.type === 'attribute' && sourceAttribute?.type === 'number'
    ? (chartType === 'numberKpi' ? (metric === 'average' || metric === 'sum' ? metric : 'average') : 'value')
    : chartType === 'choiceBar' || chartType === 'choiceDonut'
      ? metric === 'duration' ? 'duration' : 'count'
      : 'count';
  return {
    id: typeof item.id === 'string' && item.id ? item.id : crypto.randomUUID(),
    source,
    chartType,
    range,
    metric: normalizedMetric,
    order: Number.isFinite(item.order) ? Number(item.order) : index
  };
};

export const normalizeStatisticCards = (activity: Activity): ActivityStatisticCard[] => (activity.statisticCards || [])
  .map((item, index) => normalizeCard(item, index, activity.attributes || []))
  .filter((item): item is ActivityStatisticCard => Boolean(item))
  .map((card, index) => ({ ...card, order: index }));

export const createDefaultStatisticCard = (attribute: ActivityAttributeDefinition, order: number): ActivityStatisticCard => ({
  id: crypto.randomUUID(),
  source: { type: 'attribute', attributeId: attribute.id },
  chartType: getDefaultChartType(attribute.type),
  range: '30d',
  metric: attribute.type === 'number' ? 'value' : 'count',
  order
});

export const ensureStatisticCards = (activity: Activity): ActivityStatisticCard[] => {
  const attributes = activity.attributes || [];
  const existing = normalizeStatisticCards(activity);
  const cards = [...existing];
  attributes.forEach((attribute) => {
    if (cards.some((card) => card.source.type === 'attribute' && card.source.attributeId === attribute.id)) return;
    cards.push(createDefaultStatisticCard(attribute, cards.length));
  });
  return cards.map((card, index) => ({ ...card, order: index }));
};

export const getStatisticCardLabel = (card: ActivityStatisticCard, attributes: ActivityAttributeDefinition[]): string => {
  const attributeId = card.source.type === 'attribute' ? card.source.attributeId : null;
  const name = card.source.type === 'note'
    ? '备注'
    : card.source.type === 'tagDuration'
      ? '标签时长'
      : attributes.find((attribute) => attribute.id === attributeId)?.name || '已删除属性';
  const labels: Record<ActivityStatisticCardType, string> = {
    textCloud: '词云',
    numberArea: '数值面积趋势',
    numberHistogram: '数值分布',
    numberCalendar: '数值日历',
    numberKpi: '数值概览',
    choiceBar: '选项分布',
    choiceDonut: '选项环形图',
    choiceHeatmap: '选项热力图',
    choiceTreemap: '选项矩形图',
    tagDurationBoxplot: '标签时长箱线图',
    tagDurationWeekHourHeatmap: '星期 × 小时热力图'
  };
  return `${name} · ${labels[card.chartType]}`;
};
