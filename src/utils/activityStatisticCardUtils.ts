/**
 * @file activityStatisticCardUtils.ts
 * @input Activity attribute definitions and persisted statistic card settings.
 * @output Normalized card settings, default cards, and chart capability helpers.
 * @pos Utility (Activity Statistics)
 * @description Keeps per-activity statistic card configuration backward-compatible and type-safe.
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

const RANGES: ActivityStatisticRange[] = ['all', '7d', '30d', 'year'];
const METRICS: ActivityStatisticMetric[] = ['value', 'count', 'duration', 'average', 'sum'];
const CARD_TYPES: ActivityStatisticCardType[] = ['textCloud', 'numberTrend', 'numberArea', 'numberHistogram', 'numberKpi', 'choiceBar', 'choiceDonut', 'choiceHeatmap'];

export const getDefaultChartType = (type: ActivityAttributeDefinition['type']): ActivityStatisticCardType => {
  if (type === 'text') return 'textCloud';
  if (type === 'number') return 'numberTrend';
  return 'choiceBar';
};

export const getChartTypesForSource = (source: ActivityStatisticCardSource, attributes: ActivityAttributeDefinition[]): ActivityStatisticCardType[] => {
  if (source.type === 'note') return ['textCloud'];
  const attribute = attributes.find((item) => item.id === source.attributeId);
  if (!attribute) return [];
  if (attribute.type === 'text') return ['textCloud'];
  if (attribute.type === 'number') return ['numberTrend', 'numberArea', 'numberHistogram', 'numberKpi'];
  return ['choiceBar', 'choiceDonut', 'choiceHeatmap'];
};

const isCardSource = (value: unknown): value is ActivityStatisticCardSource => {
  if (!value || typeof value !== 'object') return false;
  const source = value as Record<string, unknown>;
  return source.type === 'note'
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
  const chartType = CARD_TYPES.includes(item.chartType as ActivityStatisticCardType)
    ? item.chartType as ActivityStatisticCardType
    : null;
  if (!chartType || !getChartTypesForSource(source, attributes).includes(chartType)) return null;
  const range = RANGES.includes(item.range as ActivityStatisticRange) ? item.range as ActivityStatisticRange : 'all';
  const metric = METRICS.includes(item.metric as ActivityStatisticMetric) ? item.metric as ActivityStatisticMetric : 'count';
  const sourceAttribute = source.type === 'attribute' ? attributes.find((attribute) => attribute.id === source.attributeId) : undefined;
  const normalizedMetric = source.type === 'attribute' && sourceAttribute?.type === 'number'
    ? (chartType === 'numberKpi' ? (metric === 'average' || metric === 'sum' ? metric : 'average') : 'value')
    : source.type === 'note' || sourceAttribute?.type === 'text'
      ? 'count'
      : metric === 'duration' ? 'duration' : 'count';
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
  range: 'all',
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
  const name = card.source.type === 'note' ? '备注' : attributes.find((attribute) => attribute.id === card.source.attributeId)?.name || '已删除属性';
  const labels: Record<ActivityStatisticCardType, string> = {
    textCloud: '词云',
    numberTrend: '数值趋势',
    numberArea: '数值面积趋势',
    numberHistogram: '数值分布',
    numberKpi: '数值概览',
    choiceBar: '选项分布',
    choiceDonut: '选项环形图',
    choiceHeatmap: '选项热力图'
  };
  return `${name} · ${labels[card.chartType]}`;
};
