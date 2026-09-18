/**
 * @file ActivityAttributeStatistics.tsx
 * @input One Activity and its actual Logs.
 * @output Type-specific attribute distribution and condition-aware trend visualizations.
 * @pos Activity detail analytics component
 * @description Presents attribute data as a compact editorial report: text terms, choice rankings, numeric KPIs, and trends.
 * @updated 2026-09-02: Adds count/duration dimensions for single- and multi-choice attributes while keeping text and number statistics unchanged.
 * @updated 2026-09-12: Uses the bundled Segmentit dictionary for consistent Chinese text terms across desktop and Android WebView.
 * @updated 2026-09-12: Keeps short Chinese and English text terms in the ranked text statistics instead of showing an empty state.
 * @updated 2026-08-31: Splits conditional attribute analytics by their triggering single-choice option and shows units.
 * @updated 2026-08-25: Added type-specific visualizations, text aggregation, date ranges, and theme-aware styling.
 */
import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BarChart3, LineChart, PieChart, Plus, Settings2, Table2, Trash2, Type, X } from 'lucide-react';
import { Activity, ActivityAttributeDefinition, ActivityAttributeOption, ActivityAttributeType, ActivityAttributeValue, ActivityStatisticCard, ActivityStatisticCardSource, ActivityStatisticCardType, Log } from '../types';
import { getActivityAttributeValue, getSortedActivityAttributes } from '../utils/activityAttributeUtils';
import { getLogDurationSeconds } from '../utils/scopeStatsUtils';
import { formatDuration } from '../utils/chartUtils';
import { getTextTerms } from '../utils/textSegmentation';
import { ensureStatisticCards, getChartTypesForSource, getStatisticCardLabel, normalizeStatisticCards } from '../utils/activityStatisticCardUtils';

export { getTextTerms } from '../utils/textSegmentation';

type StatisticsAttribute = Pick<ActivityAttributeDefinition, 'id' | 'name' | 'type' | 'options' | 'unit' | 'displayCondition'>;
type RangeKey = 'all' | '7d' | '30d' | 'year';
type StatisticMode = 'count' | 'duration';

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: '7d', label: '近 7 天' },
  { key: '30d', label: '近 30 天' },
  { key: 'year', label: '本年' }
];

const STATISTIC_MODE_OPTIONS: Array<{ key: StatisticMode; label: string }> = [
  { key: 'count', label: '次数' },
  { key: 'duration', label: '时长' }
];

const MISSING_ATTRIBUTE = '已删除属性';
const MISSING_OPTION = '已删除选项';

const inferAttributeType = (value: ActivityAttributeValue): ActivityAttributeType => {
  if ('optionIds' in value) return 'multi';
  if ('optionId' in value) return 'single';
  return typeof value.value === 'number' ? 'number' : 'text';
};

const formatNumber = (value: number) => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value);

const getLocalDateKey = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getDateLabel = (dateKey: string) => {
  const [, month, day] = dateKey.split('-');
  return `${Number(month)}/${Number(day)}`;
};

const getRangeStart = (range: RangeKey, now: Date) => {
  if (range === 'all') return 0;
  if (range === 'year') return new Date(now.getFullYear(), 0, 1).getTime();
  const days = range === '7d' ? 7 : 30;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start.getTime();
};

const MAX_TEXT_TERMS = 50;

interface ActivityAttributeStatisticsProps {
  activity: Activity;
  logs: Log[];
  onChange?: (activity: Activity) => void;
  hideToolbar?: boolean;
  fixedMode?: StatisticMode;
  chartVariant?: ActivityStatisticCardType;
}

interface TrendPoint {
  key: string;
  value: number;
}

interface AttributeStatisticSlice {
  logs: Log[];
  contextLabel?: string;
}

const getAttributeStatisticSlices = (
  attribute: StatisticsAttribute,
  definitions: StatisticsAttribute[],
  logs: Log[]
): AttributeStatisticSlice[] => {
  const condition = attribute.displayCondition;
  if (!condition) return [{ logs }];

  const parent = definitions.find((definition) => definition.id === condition.attributeId);
  return condition.optionIds.map((optionId) => {
    const option = parent?.options?.find((item) => item.id === optionId);
    return {
      contextLabel: `${parent?.name || MISSING_ATTRIBUTE}: ${option?.label || MISSING_OPTION}`,
      logs: logs.filter((log) => {
        const parentValue = getActivityAttributeValue(log.attributeValues, condition.attributeId);
        return Boolean(parentValue && 'optionId' in parentValue && parentValue.optionId === optionId);
      })
    };
  });
};

const AttributeSection: React.FC<{
  title: string;
  typeLabel: string;
  count: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, typeLabel, count, children }) => (
  <section className="border-t border-stone-300 pt-6">
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold tracking-tight text-stone-800">{title}</h2>
        <span className="text-[10px] uppercase tracking-[0.16em] text-stone-400">{typeLabel}</span>
      </div>
      <span className="shrink-0 text-xs text-stone-400">{count}</span>
    </div>
    {children}
  </section>
);

const LegacyActivityAttributeStatistics: React.FC<ActivityAttributeStatisticsProps> = ({ activity, logs, hideToolbar = false, fixedMode, chartVariant }) => {
  const [range, setRange] = useState<RangeKey>('all');
  const [statisticMode, setStatisticMode] = useState<StatisticMode>(fixedMode || 'count');
  const statisticAccent = 'var(--accent-color)';
  const accentSoft = 'color-mix(in srgb, var(--accent-color) 12%, white)';
  const accentMuted = 'color-mix(in srgb, var(--accent-color) 42%, #a8a29e)';

  const filteredLogs = useMemo(() => {
    const start = getRangeStart(range, new Date());
    return logs.filter((log) => start === 0 || log.startTime >= start);
  }, [logs, range]);

  const attributes = useMemo<StatisticsAttribute[]>(() => {
    const definitions = getSortedActivityAttributes(activity);
    const knownIds = new Set(definitions.map((definition) => definition.id));
    const missingDefinitions = new Map<string, StatisticsAttribute>();

    filteredLogs.forEach((log) => (log.attributeValues || []).forEach((value) => {
      if (!knownIds.has(value.attributeId) && !missingDefinitions.has(value.attributeId)) {
        missingDefinitions.set(value.attributeId, {
          id: value.attributeId,
          name: MISSING_ATTRIBUTE,
          type: inferAttributeType(value),
          options: []
        });
      }
    }));

    return [...definitions, ...missingDefinitions.values()].filter((attribute) =>
      filteredLogs.some((log) => (log.attributeValues || []).some((value) => value.attributeId === attribute.id))
    );
  }, [activity, filteredLogs]);

  const filledValueCount = filteredLogs.reduce((total, log) => total + (log.attributeValues || []).length, 0);
  const hasChoiceAttributes = attributes.some((attribute) => attribute.type === 'single' || attribute.type === 'multi');

  if (logs.length === 0) {
    return <div className="py-20 text-center text-sm text-stone-400">暂无可分析的属性数据</div>;
  }

  return (
    <div className="space-y-7">
      {!hideToolbar && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">属性概览</p>
          <p className="mt-1 text-sm text-stone-600">{filteredLogs.length} 条记录 <span className="text-stone-300">/</span> {filledValueCount} 个属性值</p>
        </div>
        <div className="flex max-w-full flex-wrap justify-end gap-2">
          <div className="flex max-w-full overflow-x-auto rounded-lg border border-stone-200 bg-white p-0.5 no-scrollbar" aria-label="切换时间">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setRange(option.key)}
                className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs transition-colors ${range === option.key ? 'font-medium text-stone-900' : 'text-stone-400 hover:text-stone-700'}`}
                style={range === option.key ? { backgroundColor: accentSoft, color: statisticAccent } : undefined}
              >
                {option.label}
              </button>
            ))}
          </div>
          {hasChoiceAttributes && (
            <div className="flex max-w-full overflow-x-auto rounded-lg border border-stone-200 bg-white p-0.5 no-scrollbar" aria-label="切换统计维度">
              {STATISTIC_MODE_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setStatisticMode(option.key)}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs transition-colors ${statisticMode === option.key ? 'font-medium text-stone-900' : 'text-stone-400 hover:text-stone-700'}`}
                  style={statisticMode === option.key ? { backgroundColor: accentSoft, color: statisticAccent } : undefined}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>}

      {attributes.length === 0 ? (
        <div className="border-t border-stone-200 pt-8 text-center text-sm text-stone-400">该时间范围内暂无属性数据</div>
      ) : (
        <div className="space-y-8">
          {attributes.flatMap((attribute) => getAttributeStatisticSlices(attribute, attributes, filteredLogs).map((slice) => ({ attribute, ...slice }))).map(({ attribute: baseAttribute, logs: attributeLogs, contextLabel }) => {
            const attributeId = baseAttribute.id;
            const attribute = contextLabel
              ? { ...baseAttribute, id: `${baseAttribute.id}-${contextLabel}`, name: `${baseAttribute.name} · ${contextLabel}` }
              : baseAttribute;
            const values = attributeLogs.flatMap((log) => (log.attributeValues || []).filter((value) => value.attributeId === attributeId));
            if (values.length === 0) return null;
            if (attribute.type === 'text') {
              const termCounts = new Map<string, number>();
              values.forEach((value) => {
                if ('value' in value && typeof value.value === 'string') getTextTerms(value.value).forEach((term) => termCounts.set(term, (termCounts.get(term) || 0) + 1));
              });
              const terms = [...termCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, MAX_TEXT_TERMS);
              const maxCount = terms[0]?.[1] || 1;
              return (
                <AttributeSection key={attribute.id} title={attribute.name} typeLabel="TEXT / 文本" count={`${values.length} 条已填写`}>
                  {terms.length === 0 ? <p className="text-sm text-stone-400">暂无有效文本</p> : (
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-3 rounded-xl px-1 py-2">
                      {terms.map(([term, count], index) => {
                        const size = 13 + Math.round((count / maxCount) * 13);
                        const color = index < 3 ? statisticAccent : index < 8 ? accentMuted : '#a8a29e';
                        return <span key={term} title={`${count} 次`} className="cursor-default leading-none transition-transform hover:scale-105" style={{ fontSize: `${size}px`, color }}>{term}</span>;
                      })}
                    </div>
                  )}
                </AttributeSection>
              );
            }

            if (attribute.type === 'number') {
              const numbers = values.flatMap((value) => 'value' in value && typeof value.value === 'number' ? [value.value] : []);
              if (numbers.length === 0) return null;
              const sum = numbers.reduce((total, value) => total + value, 0);
              const trendMap = new Map<string, number>();
              attributeLogs.forEach((log) => (log.attributeValues || []).forEach((value) => {
                if (value.attributeId !== attributeId || !('value' in value) || typeof value.value !== 'number') return;
                const key = getLocalDateKey(log.startTime);
                trendMap.set(key, (trendMap.get(key) || 0) + value.value);
              }));
              const trend: TrendPoint[] = [...trendMap.entries()].sort((left, right) => left[0].localeCompare(right[0])).slice(-14).map(([key, value]) => ({ key, value }));
              const trendMax = Math.max(...trend.map((point) => point.value), 1);
              const chartWidth = 320;
              const chartHeight = 96;
              const chartBottom = 86;
              const getChartX = (index: number) => trend.length === 1 ? chartWidth / 2 : (index / (trend.length - 1)) * chartWidth;
              const getChartY = (value: number) => chartBottom - (value / trendMax) * 68;
              const points = trend.map((point, index) => `${getChartX(index)},${getChartY(point.value)}`).join(' ');
              return (
                <AttributeSection key={attribute.id} title={attribute.name} typeLabel={`NUMBER / ${attribute.unit || '数值'}`} count={`${numbers.length} 条已填写`}>
                  <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200 sm:grid-cols-4">
                    {[
                      ['合计', `${formatNumber(sum)}${attribute.unit ? ` ${attribute.unit}` : ''}`],
                      ['平均', `${formatNumber(sum / numbers.length)}${attribute.unit ? ` ${attribute.unit}` : ''}`],
                      ['最小', `${formatNumber(Math.min(...numbers))}${attribute.unit ? ` ${attribute.unit}` : ''}`],
                      ['最大', `${formatNumber(Math.max(...numbers))}${attribute.unit ? ` ${attribute.unit}` : ''}`]
                    ].map(([label, value]) => <div key={label} className="bg-white px-3 py-3"><div className="text-[10px] text-stone-400">{label}</div><div className="mt-1 font-mono text-base" style={{ color: statisticAccent }}>{value}</div></div>)}
                  </div>
                  {chartVariant !== 'numberKpi' && trend.length > 0 && (
                    <div className="mt-5 rounded-xl border border-stone-200 bg-white p-3">
                      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-stone-400"><span>日趋势</span><span>{trend.length} 个有数据日</span></div>
                      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="aspect-[10/3] w-full overflow-visible">
                        <line x1="0" y1={chartBottom} x2={chartWidth} y2={chartBottom} stroke="#e7e5e4" strokeWidth="1" />
                        {trend.length > 1 && <polyline points={points} fill="none" stroke={statisticAccent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                        {trend.map((point, index) => <circle key={point.key} cx={getChartX(index)} cy={getChartY(point.value)} r="3.5" fill={statisticAccent} vectorEffect="non-scaling-stroke" />)}
                      </svg>
                      <div className="mt-1 flex justify-between text-[10px] text-stone-400"><span>{getDateLabel(trend[0].key)}</span><span>{getDateLabel(trend[trend.length - 1].key)}</span></div>
                    </div>
                  )}
                </AttributeSection>
              );
            }

            const selectedByOption = new Map<string, number>();
            let totalMetric = 0;
            attributeLogs.forEach((log) => {
              const logValues = (log.attributeValues || []).filter((value) => value.attributeId === attributeId);
              logValues.forEach((value) => {
                const optionIds = 'optionId' in value ? [value.optionId] : 'optionIds' in value ? value.optionIds : [];
                const metric = statisticMode === 'duration' ? getLogDurationSeconds(log) : 1;
                totalMetric += metric;
                optionIds.forEach((optionId) => selectedByOption.set(optionId, (selectedByOption.get(optionId) || 0) + metric));
              });
            });
            const options = new Map<string, ActivityAttributeOption>((attribute.options || []).map((option) => [option.id, option]));
            selectedByOption.forEach((_count, optionId) => { if (!options.has(optionId)) options.set(optionId, { id: optionId, label: MISSING_OPTION }); });
            const rankedOptions = [...selectedByOption.entries()].sort((left, right) => right[1] - left[1]);
            return (
              <AttributeSection key={attribute.id} title={attribute.name} typeLabel={`${attribute.type === 'single' ? 'SINGLE' : 'MULTI'} / ${attribute.type === 'single' ? '单选' : '多选'}`} count={statisticMode === 'duration' ? `${formatDuration(totalMetric)} 时长` : `${values.length} 条已填写`}>
                <div className="space-y-3">
                  {rankedOptions.map(([optionId, metric], index) => {
                    const option = options.get(optionId);
                    const percentage = totalMetric > 0 ? Math.round((metric / totalMetric) * 100) : 0;
                    const color = index === 0 ? statisticAccent : index < 3 ? accentMuted : '#d6d3d1';
                    return <div key={optionId}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate text-stone-600">{option?.label || MISSING_OPTION}</span><span className="shrink-0 font-mono text-stone-400">{statisticMode === 'duration' ? formatDuration(metric) : metric} <span className="text-stone-300">/</span> {percentage}%</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full transition-all" style={{ width: `${Math.max(percentage, 3)}%`, backgroundColor: color, opacity: Math.max(0.55, 1 - index * 0.12) }} /></div>
                    </div>;
                  })}
                </div>
              </AttributeSection>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CARD_TYPE_LABELS: Record<ActivityStatisticCardType, string> = {
  textCloud: '词云', numberTrend: '数值趋势', numberKpi: '数值概览', choiceBar: '选项分布', choiceDonut: '选项环形图'
};
const RANGE_DAYS: Record<string, number> = { '7d': 7, '30d': 30 };

const filterLogsByRange = (logs: Log[], range: string) => {
  if (range === 'all') return logs;
  const now = new Date();
  const start = range === 'year'
    ? new Date(now.getFullYear(), 0, 1).getTime()
    : (() => { const date = new Date(now); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (RANGE_DAYS[range] || 7) + 1); return date.getTime(); })();
  return logs.filter((log) => log.startTime >= start);
};

const getCardAttribute = (activity: Activity, source: ActivityStatisticCardSource) => source.type === 'attribute'
  ? activity.attributes?.find((attribute) => attribute.id === source.attributeId)
  : undefined;

const CardLocalControls: React.FC<{ card: ActivityStatisticCard; onUpdate: (update: Partial<ActivityStatisticCard>) => void }> = ({ card, onUpdate }) => (
  <div className="mb-3 flex flex-wrap justify-end gap-2 border-b border-[#eee7de] pb-2">
    <div className="flex overflow-x-auto rounded-md border border-[#e5ddd2] bg-[#f7f3ed] p-0.5" aria-label="卡片时间范围">
      {RANGE_OPTIONS.map((option) => <button key={option.key} type="button" onClick={() => onUpdate({ range: option.key })} className={`whitespace-nowrap rounded px-2 py-1 text-[10px] ${card.range === option.key ? 'bg-[#ead9cb] font-medium text-[#8f4f32]' : 'text-[#9b8d80]'}`}>{option.label}</button>)}
    </div>
    {(card.chartType === 'choiceBar' || card.chartType === 'choiceDonut') && <div className="flex overflow-hidden rounded-md border border-[#e5ddd2] bg-[#f7f3ed] p-0.5" aria-label="卡片统计维度"><button type="button" onClick={() => onUpdate({ metric: 'count' })} className={`rounded px-2 py-1 text-[10px] ${card.metric !== 'duration' ? 'bg-[#ead9cb] font-medium text-[#8f4f32]' : 'text-[#9b8d80]'}`}>次数</button><button type="button" onClick={() => onUpdate({ metric: 'duration' })} className={`rounded px-2 py-1 text-[10px] ${card.metric === 'duration' ? 'bg-[#ead9cb] font-medium text-[#8f4f32]' : 'text-[#9b8d80]'}`}>时长</button></div>}
  </div>
);

const DonutPreview: React.FC<{ attribute: ActivityAttributeDefinition; logs: Log[]; mode: StatisticMode }> = ({ attribute, logs, mode }) => {
  const counts = new Map<string, number>();
  let total = 0;
  logs.forEach((log) => (log.attributeValues || []).filter((value) => value.attributeId === attribute.id).forEach((value) => {
    const ids = 'optionId' in value ? [value.optionId] : 'optionIds' in value ? value.optionIds : [];
    const metric = mode === 'duration' ? getLogDurationSeconds(log) : 1;
    ids.forEach((id) => counts.set(id, (counts.get(id) || 0) + metric)); total += metric;
  }));
  const options = new Map((attribute.options || []).map((option) => [option.id, option.label]));
  const items = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, value]) => ({ label: options.get(id) || MISSING_OPTION, value, percentage: total ? value / total * 100 : 0 }));
  if (items.length === 0) return <p className="py-8 text-center text-xs text-[#aa9b8b]">当前范围暂无选项数据</p>;
  const colors = ['#b16d4c', '#748b84', '#c39a77', '#8c91a3', '#9d8063', '#bdafa0'];
  let angle = 0;
  return <div className="grid items-center gap-5 sm:grid-cols-[150px_1fr]"><div className="relative mx-auto h-36 w-36"><div className="h-full w-full rounded-full" style={{ background: `conic-gradient(${items.map((item, index) => { const start = angle; angle += item.percentage; return `${colors[index % colors.length]} ${start}% ${angle}%`; }).join(', ')})` }} /><div className="absolute inset-[25%] flex flex-col items-center justify-center rounded-full bg-[#fcfaf6]"><span className="font-serif text-xl text-[#4a3b30]">{mode === 'duration' ? formatDuration(total) : Math.round(total)}</span><span className="text-[10px] text-[#a08f7d]">{mode === 'duration' ? '总时长' : '总次数'}</span></div></div><div className="space-y-2">{items.map((item, index) => <div key={item.label} className="flex items-center justify-between gap-2 text-xs"><span className="flex min-w-0 items-center gap-2 text-[#67594d]"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} /><span className="truncate">{item.label}</span></span><span className="shrink-0 font-mono text-[#927e6c]">{mode === 'duration' ? formatDuration(item.value) : item.value}</span></div>)}</div></div>;
};

export const ActivityAttributeStatistics: React.FC<ActivityAttributeStatisticsProps> = ({ activity, logs, onChange }) => {
  const attributes = useMemo(() => getSortedActivityAttributes(activity), [activity]);
  const [cards, setCards] = useState<ActivityStatisticCard[]>(() => activity.statisticCards === undefined ? ensureStatisticCards(activity) : normalizeStatisticCards(activity));
  const [manageOpen, setManageOpen] = useState(false);
  const [source, setSource] = useState<ActivityStatisticCardSource>({ type: 'attribute', attributeId: attributes[0]?.id || '' });
  const [chartType, setChartType] = useState<ActivityStatisticCardType>('textCloud');

  const commit = (next: ActivityStatisticCard[]) => {
    const normalized = next.map((card, index) => ({ ...card, order: index }));
    setCards(normalized);
    onChange?.({ ...activity, statisticCards: normalized });
  };
  React.useEffect(() => {
    const next = activity.statisticCards === undefined ? ensureStatisticCards(activity) : normalizeStatisticCards(activity);
    setCards(next);
    if (JSON.stringify(next) !== JSON.stringify(activity.statisticCards || [])) onChange?.({ ...activity, statisticCards: next });
  }, [activity.id, activity.attributes, activity.statisticCards]);

  const sourceChoices = [
    ...attributes.map((attribute) => ({ key: `attribute:${attribute.id}`, source: { type: 'attribute', attributeId: attribute.id } as ActivityStatisticCardSource, label: attribute.name })),
    { key: 'note', source: { type: 'note' } as ActivityStatisticCardSource, label: '备注' }
  ];
  const availableTypes = getChartTypesForSource(source, attributes);
  const selectedType = availableTypes.includes(chartType) ? chartType : availableTypes[0];

  const updateCard = (id: string, update: Partial<ActivityStatisticCard>) => commit(cards.map((card) => card.id === id ? { ...card, ...update } : card));
  const renderCard = (card: ActivityStatisticCard) => {
    const cardLogs = filterLogsByRange(logs, card.range);
    if (card.source.type === 'note') {
      const noteAttribute: ActivityAttributeDefinition = { id: '__note__', name: '备注', type: 'text', order: 0, createdAt: 0, updatedAt: 0 };
      const noteLogs = cardLogs.map((log) => ({ ...log, attributeValues: log.note ? [{ attributeId: noteAttribute.id, value: log.note }] : undefined }));
      return <div key={card.id} className="rounded-xl border border-[#d8d0c5] bg-[#fcfaf6] p-1"><CardLocalControls card={card} onUpdate={(update) => updateCard(card.id, update)} /><LegacyActivityAttributeStatistics activity={{ ...activity, attributes: [noteAttribute] }} logs={noteLogs} hideToolbar onChange={undefined} /></div>;
    }
    const attribute = getCardAttribute(activity, card.source);
    if (!attribute) return null;
    if (card.chartType === 'choiceDonut') {
      return <div key={card.id} className="rounded-xl border border-[#d8d0c5] bg-[#fcfaf6] p-5"><div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-[15px] font-semibold text-[#3d332a]">{getStatisticCardLabel(card, attributes)}</h2><div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[#a08f7d]">CHOICE DONUT / {attribute.type === 'single' ? '单选' : '多选'}</div></div></div><CardLocalControls card={card} onUpdate={(update) => updateCard(card.id, update)} /><DonutPreview attribute={attribute} logs={cardLogs} mode={card.metric === 'duration' ? 'duration' : 'count'} /></div>;
    }
    return <div key={card.id} className="rounded-xl border border-[#d8d0c5] bg-[#fcfaf6] p-1"><CardLocalControls card={card} onUpdate={(update) => updateCard(card.id, update)} /><LegacyActivityAttributeStatistics activity={{ ...activity, attributes: [attribute] }} logs={cardLogs} hideToolbar fixedMode={card.metric === 'duration' ? 'duration' : 'count'} chartVariant={card.chartType} onChange={undefined} /></div>;
  };

  const addCard = () => {
    if (!source || !selectedType) return;
    commit([...cards, { id: crypto.randomUUID(), source, chartType: selectedType, range: 'all', metric: selectedType === 'numberTrend' ? 'value' : 'count', order: cards.length }]);
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ddd3c7] pb-4">
      <div><p className="text-[10px] uppercase tracking-[0.2em] text-[#a08f7d]">属性统计</p><p className="mt-1 text-sm text-[#67594d]">{logs.length} 条记录 <span className="text-[#c8b9a9]">/</span> {cards.length} 张卡片</p></div>
      <button type="button" onClick={() => setManageOpen(true)} className="inline-flex items-center gap-1.5 rounded-md border border-[#d8cabb] bg-[#fffdfa] px-3 py-2 text-xs font-medium text-[#77523d] shadow-sm hover:bg-[#f5ebe1]"><Settings2 size={14} />管理</button>
    </div>
    <div className="grid gap-5 xl:grid-cols-2">{cards.map(renderCard)}</div>
    {manageOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#3b2e24]/25 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setManageOpen(false); }}><div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[#d8cabb] bg-[#fcfaf6] p-5 shadow-2xl sm:rounded-2xl" role="dialog" aria-modal="true" aria-label="管理统计卡片"><div className="mb-5 flex items-center justify-between"><h2 className="font-serif text-lg text-[#4a3b30]">管理统计卡片</h2><button type="button" onClick={() => setManageOpen(false)} title="关闭" aria-label="关闭" className="p-1.5 text-[#a08f7d]"><X size={17} /></button></div><div className="space-y-2">{cards.map((card, index) => <div key={card.id} className="flex items-center gap-2 border-b border-[#ece5dc] py-2.5"><span className="min-w-0 flex-1 truncate text-sm text-[#5c4b3c]">{getStatisticCardLabel(card, attributes)}</span><button type="button" onClick={() => { if (index > 0) { const next = [...cards]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; commit(next); } }} disabled={index === 0} title="上移" aria-label="上移" className="p-1 text-[#aa927e] disabled:opacity-25"><ArrowUp size={14} /></button><button type="button" onClick={() => { if (index < cards.length - 1) { const next = [...cards]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; commit(next); } }} disabled={index === cards.length - 1} title="下移" aria-label="下移" className="p-1 text-[#aa927e] disabled:opacity-25"><ArrowDown size={14} /></button><button type="button" onClick={() => commit(cards.filter((item) => item.id !== card.id))} title="删除" aria-label="删除" className="p-1 text-[#b17961]"><Trash2 size={14} /></button></div>)}</div><div className="mt-5 border-t border-[#e5dbcf] pt-5"><h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#8f7f70]">新增统计卡片</h3><label className="block text-xs text-[#766657]">数据来源<select value={sourceChoices.find((item) => item.source.type === source.type && (source.type === 'note' || item.source.attributeId === source.attributeId))?.key || ''} onChange={(event) => { const selected = sourceChoices.find((item) => item.key === event.target.value); if (selected) { setSource(selected.source); setChartType(getChartTypesForSource(selected.source, attributes)[0] || 'textCloud'); } }} className="mt-1.5 w-full rounded-md border border-[#ddcfbf] bg-[#fffdfa] px-3 py-2 text-sm text-[#5c4b3c]"><option value="">选择来源</option>{sourceChoices.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><div className="mt-3 grid grid-cols-2 gap-2">{availableTypes.map((type) => <button key={type} type="button" onClick={() => setChartType(type)} className={`rounded-md border px-3 py-2 text-xs ${selectedType === type ? 'border-[#b16d4c] bg-[#f1e1d5] text-[#8f4f32]' : 'border-[#e0d6ca] text-[#8f7f70]'}`}>{CARD_TYPE_LABELS[type]}</button>)}</div><button type="button" onClick={addCard} disabled={!selectedType} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[#9b5c3f] px-3 py-2 text-xs font-medium text-white disabled:opacity-40"><Plus size={14} />添加卡片</button></div><button type="button" onClick={() => commit(ensureStatisticCards({ ...activity, statisticCards: cards }))} className="mt-5 text-xs text-[#9b5c3f] underline-offset-2 hover:underline">恢复默认卡片</button></div></div>}
  </div>;
};
