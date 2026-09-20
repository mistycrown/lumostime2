/**
 * @file ActivityAttributeStatistics.tsx
 * @input One Activity and its actual Logs.
 * @output Tag-wide statistic cards with type-specific distributions and condition-aware trend visualizations.
 * @pos Activity detail analytics component
 * @description Presents attribute data as a compact editorial report: text terms, choice rankings, numeric KPIs, and trends.
 * @updated 2026-09-02: Adds count/duration dimensions for single- and multi-choice attributes while keeping text and number statistics unchanged.
 * @updated 2026-09-12: Uses the bundled Segmentit dictionary for consistent Chinese text terms across desktop and Android WebView.
 * @updated 2026-09-12: Keeps short Chinese and English text terms in the ranked text statistics instead of showing an empty state.
 * @updated 2026-09-18: Restricts each statistic card to its own attribute values so unrelated fields are not reported as deleted attributes.
 * @updated 2026-09-18: Unifies new-card creation with the existing card editor and removes the persistent add form.
 * @updated 2026-09-20: Adds activity-level grouped palettes shared by all statistic cards.
 * @updated 2026-09-20: Replaces numeric trends with Lieflat-inspired histogram stripes and adds count/duration modes to ordinary choice bars.
 * @updated 2026-09-20: Reduces numeric trend area opacity so the line remains the primary visual signal.
 * @updated 2026-09-20: Adds a vertical fade-to-transparent fill for numeric area trends.
 * @updated 2026-09-20: Adds calendar ranges, tag-duration cards, single-choice treemaps, and layered card editing.
 * @updated 2026-09-20: Preserves parent attribute values while splitting conditional statistic cards.
 * @updated 2026-08-31: Splits conditional attribute analytics by their triggering single-choice option and shows units.
 * @updated 2026-08-25: Added type-specific visualizations, text aggregation, date ranges, and theme-aware styling.
 */
import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BarChart3, CalendarDays, Clock3, LineChart, Palette, PieChart, Plus, Settings2, Table2, Trash2, Type, X } from 'lucide-react';
import { Activity, ActivityAttributeDefinition, ActivityAttributeOption, ActivityAttributeType, ActivityAttributeValue, ActivityStatisticCard, ActivityStatisticCardSource, ActivityStatisticCardType, ActivityStatisticPaletteId, Log } from '../types';
import { CustomSelect } from './CustomSelect';
import { ChartPaletteSelector } from './ChartPaletteSelector';
import { getActivityAttributeValue, getSortedActivityAttributes } from '../utils/activityAttributeUtils';
import { getLogDurationSeconds } from '../utils/scopeStatsUtils';
import { formatDuration } from '../utils/chartUtils';
import { getTextTerms } from '../utils/textSegmentation';
import { ensureStatisticCards, getChartTypesForSource, getStatisticCardLabel, normalizeStatisticCards } from '../utils/activityStatisticCardUtils';
import { getChartPalette } from '../utils/chartPalette';
import type { ChartPalette } from '../utils/chartPalette';
import { useChartPaletteSequences } from '../hooks/useChartPaletteSequences';
import { useSponsorshipUnlocked } from '../hooks/useSponsorshipUnlocked';

export { getTextTerms } from '../utils/textSegmentation';

type StatisticsAttribute = Pick<ActivityAttributeDefinition, 'id' | 'name' | 'type' | 'options' | 'unit' | 'displayCondition'>;
type RangeKey = 'all' | '7d' | '30d' | 'month' | 'year';
type StatisticMode = 'count' | 'duration';

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: '7d', label: '近 7 天' },
  { key: '30d', label: '近 30 天' },
  { key: 'month', label: '本月' },
  { key: 'year', label: '本年' }
];

const TAG_DURATION_RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'month', label: '本月' },
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

const formatHoursMinutes = (seconds: number) => {
  const totalMinutes = Math.max(0, Math.floor(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const getLocalDateKey = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getDateLabel = (dateKey: string) => {
  const [, month, day] = dateKey.split('-');
  return `${Number(month)}/${Number(day)}`;
};

const getDateKeysForRange = (range: RangeKey, now = new Date()) => {
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  const start = range === 'year'
    ? new Date(end.getFullYear(), 0, 1)
    : range === 'month'
      ? new Date(end.getFullYear(), end.getMonth(), 1)
      : new Date(end.getTime() - ((range === '7d' ? 7 : 30) - 1) * 24 * 60 * 60 * 1000);
  const keys: string[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) keys.push(getLocalDateKey(cursor.getTime()));
  return keys;
};

const getRangeStart = (range: RangeKey, now: Date) => {
  if (range === 'year') return new Date(now.getFullYear(), 0, 1).getTime();
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
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
  rangeLabel?: string;
  paletteId?: ActivityStatisticPaletteId;
  fixedRange?: RangeKey;
}

interface TrendPoint {
  key: string;
  value: number;
}

interface AttributeStatisticSlice {
  logs: Log[];
  contextLabel?: string;
}

export const getAttributeStatisticSlices = (
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
  rangeLabel?: string;
  children: React.ReactNode;
}> = ({ title, typeLabel, count, rangeLabel, children }) => (
  <section className="border-t border-stone-300 pt-6">
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold tracking-tight text-stone-800">{title}</h2>
        <span className="text-[10px] uppercase tracking-[0.16em] text-stone-400">{typeLabel}{rangeLabel ? <span className="ml-2 normal-case tracking-normal text-stone-400">· {rangeLabel}</span> : null}</span>
      </div>
      <span className="shrink-0 text-xs text-stone-400">{count}</span>
    </div>
    {children}
  </section>
);

const LegacyActivityAttributeStatistics: React.FC<ActivityAttributeStatisticsProps> = ({ activity, logs, hideToolbar = false, fixedMode, chartVariant, rangeLabel, paletteId, fixedRange }) => {
  const [range, setRange] = useState<RangeKey>(fixedRange || '30d');
  const [statisticMode, setStatisticMode] = useState<StatisticMode>(fixedMode || 'count');
  const customSequences = useChartPaletteSequences();
  const isSponsorshipUnlocked = useSponsorshipUnlocked();
  const effectivePaletteId = isSponsorshipUnlocked ? paletteId : 'default';
  const chartPalette = getChartPalette(effectivePaletteId, customSequences);
  const statisticAccent = chartPalette.accent;
  const accentSoft = chartPalette.accentSoft;
  const accentMuted = chartPalette.muted;
  const areaGradientId = `number-area-gradient-${React.useId().replace(/:/g, '')}`;

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
                  <AttributeSection key={attribute.id} title={attribute.name} typeLabel="TEXT / 文本" rangeLabel={rangeLabel} count={`${values.length} 条已填写`}>
                  {terms.length === 0 ? <p className="text-sm text-stone-400">暂无有效文本</p> : (
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-3 rounded-xl px-1 py-2">
                      {terms.map(([term, count], index) => {
                        const size = 13 + Math.round((count / maxCount) * 13);
                        const color = chartPalette.colors[index % chartPalette.colors.length] || accentMuted;
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
              const isDurationNumber = attribute.id === '__tag-duration__';
              const formatNumericValue = (value: number) => isDurationNumber ? formatHoursMinutes(value) : formatNumber(value);
              const numericUnit = isDurationNumber ? '' : attribute.unit ? ` ${attribute.unit}` : '';
              const sum = numbers.reduce((total, value) => total + value, 0);
              const trendMap = new Map<string, number>();
              attributeLogs.forEach((log) => (log.attributeValues || []).forEach((value) => {
                if (value.attributeId !== attributeId || !('value' in value) || typeof value.value !== 'number') return;
                const key = getLocalDateKey(log.startTime);
                trendMap.set(key, (trendMap.get(key) || 0) + value.value);
              }));
              const trend: TrendPoint[] = [...trendMap.entries()].sort((left, right) => left[0].localeCompare(right[0])).slice(-14).map(([key, value]) => ({ key, value }));
              const trendMax = Math.max(...trend.map((point) => point.value), 1);
              const histogramMin = Math.min(...numbers);
              const histogramMax = Math.max(...numbers);
              const histogramBinCount = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(numbers.length))));
              const histogramWidth = histogramMax - histogramMin || 1;
              const histogramBins = Array.from({ length: histogramBinCount }, (_, index) => {
                const start = histogramMin + (index / histogramBinCount) * histogramWidth;
                const end = histogramMin + ((index + 1) / histogramBinCount) * histogramWidth;
                return { start, end, count: numbers.filter((value) => index === histogramBinCount - 1 ? value >= start && value <= histogramMax : value >= start && value < end).length };
              });
              const histogramMaxCount = Math.max(...histogramBins.map((bin) => bin.count), 1);
              const chartWidth = 320;
              const chartHeight = 96;
              const chartBottom = 86;
              const getChartX = (index: number) => trend.length === 1 ? chartWidth / 2 : (index / (trend.length - 1)) * chartWidth;
              const getChartY = (value: number) => chartBottom - (value / trendMax) * 68;
              const points = trend.map((point, index) => `${getChartX(index)},${getChartY(point.value)}`).join(' ');
              const areaPoints = `${points} ${trend.length ? `${getChartX(trend.length - 1)},${chartBottom} 0,${chartBottom}` : ''}`;
              if (chartVariant === 'numberCalendar') {
                const calendarDays = getDateKeysForRange(range);
                const dailyValues = new Map<string, number>();
                attributeLogs.forEach((log) => (log.attributeValues || []).forEach((value) => {
                  if (value.attributeId !== attributeId || !('value' in value) || typeof value.value !== 'number') return;
                  const key = getLocalDateKey(log.startTime);
                  dailyValues.set(key, (dailyValues.get(key) || 0) + value.value);
                }));
                const calendarMax = Math.max(...dailyValues.values(), 1);
                const calendarMonths = [...new Set(calendarDays.map((day) => day.slice(0, 7)))];
                if (range === '7d') {
                  const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];
                  return (
                    <AttributeSection key={attribute.id} title={attribute.name} typeLabel={`NUMBER / ${attribute.unit || '近 7 天'}`} rangeLabel={rangeLabel || getRangeLabel(range)} count={`${numbers.length} 条已填写`}>
                      <div className="mt-5 py-1">
                        <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-stone-400"><span>近 7 日投入</span><span>按日合计</span></div>
                        <div className="grid grid-cols-7 gap-2">
                          {calendarDays.map((day) => {
                            const value = dailyValues.get(day) || 0;
                            const [year, month, dayOfMonth] = day.split('-').map(Number);
                            const weekday = weekdayLabels[new Date(year, month - 1, dayOfMonth).getDay()];
                            const intensity = value ? 0.3 + (value / calendarMax) * 0.7 : 1;
                            const valueLabel = value ? `${formatNumericValue(value)}${numericUnit}` : '无记录';
                            return <div key={day} aria-label={`${getDateLabel(day)} 周${weekday} · ${valueLabel}`} className="min-w-0 text-center"><div className="text-[9px] text-stone-400">周{weekday}</div><div className="mt-0.5 font-mono text-[10px] text-stone-600">{getDateLabel(day)}</div><div className="mt-2 h-12 rounded-[3px] border border-stone-200" style={{ backgroundColor: value ? statisticAccent : '#f5f5f4', opacity: value ? intensity : 1 }} /><div className="mt-1 truncate font-mono text-[9px] text-stone-500" title={valueLabel}>{value ? formatNumericValue(value) : '—'}</div></div>;
                          })}
                        </div>
                      </div>
                    </AttributeSection>
                  );
                }
                return (
                  <AttributeSection key={attribute.id} title={attribute.name} typeLabel={`NUMBER / ${attribute.unit || '全年日历'}`} rangeLabel={rangeLabel || getRangeLabel(range)} count={`${numbers.length} 条已填写`}>
                    <div className="mt-5 py-1">
                      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-stone-400"><span>日历热力</span><span>按日合计</span></div>
                      <div className={`grid gap-x-3 gap-y-3 ${range === 'month' ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
                        {calendarMonths.map((monthKey) => {
                          const monthDays = calendarDays.filter((day) => day.startsWith(monthKey));
                          const [year, month] = monthKey.split('-').map(Number);
                          const leadingBlanks = new Date(year, month - 1, 1).getDay();
                          const monthColor = chartPalette.colors[calendarMonths.indexOf(monthKey) % chartPalette.colors.length] || statisticAccent;
                          const isSingleMonth = range === 'month';
                          return <div key={monthKey}><div className="mb-1 text-[10px] text-stone-500">{month} 月</div><div className={isSingleMonth ? 'grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1' : 'grid grid-cols-7 gap-0.5'}>{!isSingleMonth && Array.from({ length: leadingBlanks }).map((_, index) => <span key={`blank-${monthKey}-${index}`} />)}{monthDays.map((day) => { const value = dailyValues.get(day) || 0; return <span key={day} aria-label={`${getDateLabel(day)} · ${formatNumericValue(value)}${numericUnit}`} className="aspect-square rounded-[2px] border border-stone-200" style={{ backgroundColor: value ? monthColor : '#f5f5f4', opacity: value ? 0.3 + (value / calendarMax) * 0.7 : 1 }} />; })}</div></div>;
                        })}
                      </div>
                    </div>
                  </AttributeSection>
                );
              }
              if (chartVariant === 'numberHistogram') {
                return (
                  <AttributeSection key={attribute.id} title={attribute.name} typeLabel={`NUMBER / ${attribute.unit || '数值分布'}`} rangeLabel={rangeLabel} count={`${numbers.length} 条已填写`}>
                    <div className="mt-5 py-1">
                      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-stone-400"><span>数值分布</span><span>{histogramBinCount} 个区间</span></div>
                      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="aspect-[10/3] w-full overflow-visible" role="img" aria-label={`${attribute.name} 数值分布`}>
                        <line x1="0" y1={chartBottom} x2={chartWidth} y2={chartBottom} stroke="#e7e5e4" strokeWidth="1" />
                        {histogramBins.map((bin, index) => {
                          const slotWidth = chartWidth / histogramBinCount;
                          const center = index * slotWidth + slotWidth / 2;
                          const barWidth = Math.min(24, slotWidth * 0.58);
                          const stripeCount = bin.count > 0 ? Math.max(1, Math.ceil((bin.count / histogramMaxCount) * 16)) : 0;
                          return <g key={`${bin.start}-${index}`} aria-label={`${formatNumber(bin.start)} 至 ${formatNumber(bin.end)}：${bin.count} 条`}>
                            {Array.from({ length: stripeCount }, (_, stripeIndex) => {
                              const y = chartBottom - 4 - stripeIndex * 4;
                              const inset = (stripeIndex % 3) * 1.5;
                              return <line key={stripeIndex} x1={center - barWidth / 2 + inset} y1={y} x2={center + barWidth / 2 - inset} y2={y} stroke={chartPalette.colors[index % chartPalette.colors.length] || statisticAccent} strokeWidth="2" strokeLinecap="round" opacity={0.46 + (stripeIndex / Math.max(stripeCount, 1)) * 0.34} />;
                            })}
                            {bin.count > 0 && <text x={center} y={Math.max(10, chartBottom - stripeCount * 4 - 8)} textAnchor="middle" fill="#57534e" fontSize="9" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">{bin.count}</text>}
                          </g>;
                        })}
                      </svg>
                      <div className="mt-1 flex justify-between text-[10px] text-stone-400"><span>{formatNumber(histogramMin)}</span><span>{formatNumber(histogramMax)}</span></div>
                    </div>
                  </AttributeSection>
                );
              }
              return (
                <AttributeSection key={attribute.id} title={attribute.name} typeLabel={`NUMBER / ${attribute.unit || '数值'}`} rangeLabel={rangeLabel} count={`${numbers.length} 条已填写`}>
                  {chartVariant === 'numberKpi' && <div className="grid grid-cols-2 border-y border-stone-200 sm:grid-cols-4">
                    {[
                      ['合计', `${formatNumericValue(sum)}${numericUnit}`],
                      ['平均', `${formatNumericValue(sum / numbers.length)}${numericUnit}`],
                      ['最小', `${formatNumericValue(Math.min(...numbers))}${numericUnit}`],
                      ['最大', `${formatNumericValue(Math.max(...numbers))}${numericUnit}`]
                    ].map(([label, value]) => <div key={label} className="border-stone-200 px-3 py-3 odd:border-r sm:border-r sm:last:border-r-0"><div className="text-[10px] text-stone-400">{label}</div><div className="mt-1 font-mono text-base" style={{ color: statisticAccent }}>{value}</div></div>)}
                  </div>}
                  {chartVariant !== 'numberKpi' && trend.length > 0 && (
                    <div className="mt-5 py-1">
                      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-stone-400"><span>日趋势</span><span>{trend.length} 个有数据日</span></div>
                      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="aspect-[10/3] w-full overflow-visible">
                        {chartVariant === 'numberArea' && <defs><linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={statisticAccent} stopOpacity="0.28" /><stop offset="100%" stopColor={statisticAccent} stopOpacity="0" /></linearGradient></defs>}
                        <line x1="0" y1={chartBottom} x2={chartWidth} y2={chartBottom} stroke="#e7e5e4" strokeWidth="1" />
                        {chartVariant === 'numberArea' && trend.length > 1 && <polygon points={areaPoints} fill={`url(#${areaGradientId})`} />}
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
            const maxOptionMetric = Math.max(...rankedOptions.map(([, metric]) => metric), 1);
            return (
              <AttributeSection key={attribute.id} title={attribute.name} typeLabel={`${attribute.type === 'single' ? 'SINGLE' : 'MULTI'} / ${attribute.type === 'single' ? '单选' : '多选'}`} rangeLabel={rangeLabel} count={statisticMode === 'duration' ? `${formatDuration(totalMetric)} 时长` : `${values.length} 条已填写`}>
                <div className="space-y-3">
                  {rankedOptions.map(([optionId, metric], index) => {
                    const option = options.get(optionId);
                    const color = chartPalette.colors[index % chartPalette.colors.length] || accentMuted;
                    const relativeWidth = metric > 0 ? Math.max((metric / maxOptionMetric) * 100, 3) : 0;
                    return <div key={optionId}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="flex min-w-0 items-center gap-2 text-stone-600"><span className="w-5 shrink-0 font-mono text-[10px] text-stone-400">{String(index + 1).padStart(2, '0')}</span><span className="truncate">{option?.label || MISSING_OPTION}</span></span><span className="shrink-0 font-mono text-stone-400">{statisticMode === 'duration' ? formatDuration(metric) : metric}</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-stone-100" aria-label={`${option?.label || MISSING_OPTION} ${statisticMode === 'duration' ? formatDuration(metric) : `${metric} 次`}`}><div className="h-full rounded-full transition-all" style={{ width: `${relativeWidth}%`, backgroundColor: color, opacity: Math.max(0.55, 1 - index * 0.12) }} /></div>
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
  textCloud: '词云', numberArea: '面积趋势', numberHistogram: '数值分布', numberCalendar: '数值日历', numberKpi: '数值概览', choiceBar: '选项分布', choiceDonut: '选项环形图', choiceHeatmap: '选项热力图', choiceTreemap: '选项矩形图', tagDurationBoxplot: '标签时长箱线图', tagDurationWeekHourHeatmap: '星期 × 小时热力图'
};
const CARD_TYPE_ICONS: Record<ActivityStatisticCardType, React.ComponentType<{ size?: number }>> = {
  textCloud: Type,
  numberArea: LineChart,
  numberHistogram: BarChart3,
  numberCalendar: CalendarDays,
  numberKpi: Table2,
  choiceBar: BarChart3,
  choiceDonut: PieChart,
  choiceHeatmap: Table2,
  choiceTreemap: Table2,
  tagDurationBoxplot: BarChart3,
  tagDurationWeekHourHeatmap: Clock3
};
const RANGE_DAYS: Record<string, number> = { '7d': 7, '30d': 30 };
const getRangeLabel = (range: RangeKey) => range === 'all' ? '全部' : RANGE_OPTIONS.find((option) => option.key === range)?.label || '近 30 天';

const filterLogsByRange = (logs: Log[], range: string) => {
  if (range === 'all') return logs;
  const now = new Date();
  const start = range === 'year'
    ? new Date(now.getFullYear(), 0, 1).getTime()
    : range === 'month'
      ? new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    : (() => { const date = new Date(now); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (RANGE_DAYS[range] || 7) + 1); return date.getTime(); })();
  return logs.filter((log) => log.startTime >= start);
};

const getCardAttribute = (activity: Activity, source: ActivityStatisticCardSource) => source.type === 'attribute'
  ? activity.attributes?.find((attribute) => attribute.id === source.attributeId)
  : undefined;

const createTagDurationLogs = (logs: Log[], attributeId: string): Log[] => logs.map((log) => ({
  ...log,
  attributeValues: [{ attributeId, value: getLogDurationSeconds(log) }]
}));

const TAG_DURATION_ATTRIBUTE: ActivityAttributeDefinition = { id: '__tag-duration__', name: '标签时长', type: 'number', unit: '时长', order: 0, createdAt: 0, updatedAt: 0 };

export const filterLogsForAttribute = (logs: Log[], attributeId: string): Log[] => logs
  .map((log) => {
    const attributeValues = (log.attributeValues || []).filter((value) => value.attributeId === attributeId);
    return attributeValues.length > 0 ? { ...log, attributeValues } : null;
  })
  .filter((log): log is Log & { attributeValues: NonNullable<Log['attributeValues']> } => log !== null);

/**
 * Splits a card's complete logs by a conditional attribute's parent option,
 * then removes unrelated attribute values before chart aggregation.
 */
export const getCardAttributeStatisticSlices = (
  attribute: StatisticsAttribute,
  definitions: StatisticsAttribute[],
  logs: Log[]
): AttributeStatisticSlice[] => getAttributeStatisticSlices(attribute, definitions, logs)
  .map((slice) => ({ ...slice, logs: filterLogsForAttribute(slice.logs, attribute.id) }))
  .filter((slice) => slice.logs.length > 0);

const DonutPreview: React.FC<{ attribute: ActivityAttributeDefinition; logs: Log[]; mode: StatisticMode; palette: ReturnType<typeof getChartPalette> }> = ({ attribute, logs, mode, palette }) => {
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
  let angle = 0;
  return <div className="grid items-center gap-5 sm:grid-cols-[150px_1fr]"><div className="mx-auto w-36"><div className="relative h-36 w-36"><div className="h-full w-full rounded-full" role="img" aria-label={`${attribute.name} 选项占比`} style={{ background: `conic-gradient(${items.map((item, index) => { const start = angle; angle += item.percentage; return `${palette.colors[index % palette.colors.length]} ${start}% ${angle}%`; }).join(', ')})` }} /><div className="absolute inset-[25%] rounded-full bg-[#fcfaf6]" aria-hidden="true" /></div><div className="mt-3 border-t border-[#e5dbcf] pt-2 text-center"><span className="block break-words font-serif text-lg leading-tight text-[#4a3b30]">{mode === 'duration' ? formatDuration(total) : Math.round(total)}</span><span className="mt-0.5 block text-[10px] text-[#a08f7d]">{mode === 'duration' ? '总时长' : '总次数'}</span></div></div><div className="space-y-2">{items.map((item, index) => <div key={item.label} className="flex items-center justify-between gap-2 text-xs"><span className="flex min-w-0 items-center gap-2 text-[#67594d]"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: palette.colors[index % palette.colors.length] }} /><span className="truncate">{item.label}</span></span><span className="shrink-0 font-mono text-[#927e6c]">{mode === 'duration' ? formatDuration(item.value) : item.value}</span></div>)}</div></div>;
};

interface TreemapRect {
  id: string;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const buildTreemapRects = (items: Array<[string, number]>, x = 0, y = 0, width = 100, height = 100): TreemapRect[] => {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ id: items[0][0], value: items[0][1], x, y, width, height }];
  const total = items.reduce((sum, [, value]) => sum + value, 0);
  const half = total / 2;
  let splitIndex = 1;
  let running = items[0][1];
  for (let index = 1; index < items.length - 1; index += 1) {
    const next = running + items[index][1];
    if (Math.abs(half - next) > Math.abs(half - running)) break;
    running = next;
    splitIndex = index + 1;
  }
  const left = items.slice(0, splitIndex);
  const right = items.slice(splitIndex);
  const leftTotal = left.reduce((sum, [, value]) => sum + value, 0);
  if (width >= height) {
    const leftWidth = width * (leftTotal / total);
    return [...buildTreemapRects(left, x, y, leftWidth, height), ...buildTreemapRects(right, x + leftWidth, y, width - leftWidth, height)];
  }
  const leftHeight = height * (leftTotal / total);
  return [...buildTreemapRects(left, x, y, width, leftHeight), ...buildTreemapRects(right, x, y + leftHeight, width, height - leftHeight)];
};

const ChoiceTreemapPreview: React.FC<{ attribute: ActivityAttributeDefinition; logs: Log[]; mode: StatisticMode; palette: ChartPalette }> = ({ attribute, logs, mode, palette }) => {
  const totals = new Map<string, number>();
  logs.forEach((log) => (log.attributeValues || []).filter((value) => value.attributeId === attribute.id).forEach((value) => {
    const ids = 'optionId' in value ? [value.optionId] : [];
    const metric = mode === 'duration' ? getLogDurationSeconds(log) : 1;
    ids.forEach((id) => totals.set(id, (totals.get(id) || 0) + metric));
  }));
  const labels = new Map((attribute.options || []).map((option) => [option.id, option.label]));
  const items = [...totals.entries()].sort((left, right) => right[1] - left[1]).slice(0, 24);
  const total = items.reduce((sum, [, value]) => sum + value, 0);
  if (items.length === 0 || total === 0) return <p className="py-8 text-center text-xs text-[#aa9b8b]">当前范围暂无选项数据</p>;
  const rects = buildTreemapRects(items);
  return <div className="relative aspect-[16/9] overflow-hidden border border-[#eadfd4] bg-[#eadfd4]" role="img" aria-label={`${attribute.name} 选项面积分布`}>
    {rects.map((rect, index) => <div key={rect.id} className="absolute flex items-center justify-center border border-white/70 p-2 text-center text-xs font-medium text-white transition-opacity hover:z-10 hover:opacity-90" style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.width}%`, height: `${rect.height}%`, backgroundColor: palette.colors[index % palette.colors.length] }} title={`${labels.get(rect.id) || MISSING_OPTION} · ${mode === 'duration' ? formatDuration(rect.value) : rect.value}`}><span className="line-clamp-2 max-w-full break-words">{labels.get(rect.id) || MISSING_OPTION}</span></div>)}
  </div>;
};

const quantile = (values: number[], probability: number) => {
  if (values.length === 0) return 0;
  const position = (values.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return values[lower];
  return values[lower] + (values[upper] - values[lower]) * (position - lower);
};

const TagDurationBoxplotPreview: React.FC<{ logs: Log[]; palette: ChartPalette }> = ({ logs, palette }) => {
  const dailyTotals = new Map<string, number>();
  logs.forEach((log) => {
    const day = getLocalDateKey(log.startTime);
    dailyTotals.set(day, (dailyTotals.get(day) || 0) + getLogDurationSeconds(log));
  });
  const currentYear = new Date().getFullYear();
  const monthly = Array.from({ length: 12 }, (_, month) => {
    const values = [...dailyTotals.entries()]
      .filter(([day]) => Number(day.slice(0, 4)) === currentYear && Number(day.slice(5, 7)) === month + 1)
      .map(([, value]) => value)
      .sort((a, b) => a - b);
    return { month, values, min: values[0] || 0, q1: quantile(values, 0.25), median: quantile(values, 0.5), q3: quantile(values, 0.75), max: values[values.length - 1] || 0 };
  });
  const maximum = Math.max(...monthly.map((item) => item.max), 1);
  const chartWidth = 560;
  const chartHeight = 250;
  const chartLeft = 44;
  const chartRight = 12;
  const chartTop = 16;
  const chartBottom = 206;
  const chartRange = chartBottom - chartTop;
  const getY = (value: number) => chartBottom - (value / maximum) * chartRange;
  const getX = (month: number) => chartLeft + month * ((chartWidth - chartLeft - chartRight) / 11);
  const formatMinutes = (seconds: number) => String(Math.round(seconds / 60));
  if (!dailyTotals.size) return <p className="py-8 text-center text-xs text-[#aa9b8b]">本年暂无标签时长数据</p>;
  return <div>
    <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-[#a08f7d]"><span>每日汇总时长分布</span><span>本年 · 按月</span></div>
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="aspect-[2.24/1] w-full" role="img" aria-label="标签时长年度箱线图">
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => <g key={ratio}><line x1={chartLeft} y1={getY(maximum * ratio)} x2={chartWidth - chartRight} y2={getY(maximum * ratio)} stroke={ratio === 0 ? '#d8cdc0' : '#eee8e1'} strokeWidth={ratio === 0 ? 1.2 : 1} /><text x={chartLeft - 9} y={getY(maximum * ratio) + 3} textAnchor="end" fill="#9d8d7d" fontSize="9" fontVariant="tabular-nums">{formatMinutes(maximum * ratio)}</text></g>)}
      {monthly.map((item) => {
        const x = getX(item.month);
        const color = palette.colors[item.month % palette.colors.length];
        const boxWidth = 16;
        return <g key={item.month}>
          {item.values.length > 0 && <><line x1={x} y1={getY(item.min)} x2={x} y2={getY(item.max)} stroke={color} strokeWidth="1.1" /><line x1={x - 5} y1={getY(item.min)} x2={x + 5} y2={getY(item.min)} stroke={color} strokeWidth="1.1" /><line x1={x - 5} y1={getY(item.max)} x2={x + 5} y2={getY(item.max)} stroke={color} strokeWidth="1.1" /><rect x={x - boxWidth / 2} y={getY(item.q3)} width={boxWidth} height={Math.max(2, getY(item.q1) - getY(item.q3))} rx="2" fill={color} fillOpacity="0.18" stroke={color} strokeWidth="1.2" /><line x1={x - boxWidth / 2} y1={getY(item.median)} x2={x + boxWidth / 2} y2={getY(item.median)} stroke={color} strokeWidth="2" /> </>}
          <text x={x} y={chartBottom + 22} textAnchor="middle" fill="#806f60" fontSize="10" fontVariant="tabular-nums">{item.month + 1}月</text>
        </g>;
      })}
    </svg>
  </div>;
};

const TagDurationWeekHourHeatmap: React.FC<{ logs: Log[]; range: RangeKey; palette: ChartPalette }> = ({ logs, range, palette }) => {
  const filteredLogs = useMemo(() => filterLogsByRange(logs, range), [logs, range]);
  const buckets = new Map<string, { duration: number; count: number }>();
  filteredLogs.forEach((log) => {
    const date = new Date(log.startTime);
    const weekday = (date.getDay() + 6) % 7;
    const key = `${weekday}-${date.getHours()}`;
    const current = buckets.get(key) || { duration: 0, count: 0 };
    current.duration += getLogDurationSeconds(log);
    current.count += 1;
    buckets.set(key, current);
  });
  const weekLabels = ['一', '二', '三', '四', '五', '六', '日'];
  const activeHours = filteredLogs.map((log) => new Date(log.startTime).getHours());
  const minHour = activeHours.length > 0 ? Math.min(...activeHours) : 0;
  const maxHour = activeHours.length > 0 ? Math.max(...activeHours) : 0;
  const hours = Array.from({ length: maxHour - minHour + 1 }, (_, index) => minHour + index);
  const maxDuration = Math.max(...[...buckets.values()].map((bucket) => bucket.duration), 1);
  const heatColor = palette.accent;
  if (filteredLogs.length === 0) return <p className="py-8 text-center text-xs text-[#aa9b8b]">当前范围暂无标签时长数据</p>;
  return <div>
    <div className="mb-3 text-[10px] uppercase tracking-[0.16em] text-[#a08f7d]">记录分布 · 星期 × 小时</div>
    <div className="grid gap-1 text-[10px] text-[#8f7f70]" style={{ gridTemplateColumns: `22px repeat(${hours.length}, minmax(0, 1fr))` }}>
      <span />
      {hours.map((hour) => <span key={hour} className="truncate text-center font-mono text-[9px]">{String(hour).padStart(2, '0')}</span>)}
      {weekLabels.map((label, weekday) => <React.Fragment key={label}>
        <span className="flex items-center justify-center font-medium">{label}</span>
        {hours.map((hour) => {
          const bucket = buckets.get(`${weekday}-${hour}`);
          const intensity = bucket ? 0.08 + (bucket.duration / maxDuration) * 0.92 : 0;
          return <span key={`${weekday}-${hour}`} title={`${label} ${String(hour).padStart(2, '0')}:00 · ${bucket ? `${formatHoursMinutes(bucket.duration)} · ${bucket.count} 条` : '无记录'}`} className="aspect-square min-w-0 rounded-[3px] border border-[#e8dfd5]" style={{ backgroundColor: bucket ? heatColor : '#f8f4ef', opacity: bucket ? intensity : 1 }} />;
        })}
      </React.Fragment>)}
    </div>
  </div>;
};

const ChoiceHeatmapPreview: React.FC<{ attribute: ActivityAttributeDefinition; logs: Log[]; mode: StatisticMode; range: RangeKey; palette: ChartPalette }> = ({ attribute, logs, mode, range, palette }) => {
  const daily = new Map<string, Map<string, number>>();
  const totals = new Map<string, number>();
  logs.forEach((log) => {
    const day = getLocalDateKey(log.startTime);
    const dayMap = daily.get(day) || new Map<string, number>();
    (log.attributeValues || []).filter((value) => value.attributeId === attribute.id).forEach((value) => {
      const metric = mode === 'duration' ? getLogDurationSeconds(log) : 1;
      const ids = 'optionId' in value ? [value.optionId] : 'optionIds' in value ? value.optionIds : [];
      ids.forEach((id) => {
        dayMap.set(id, (dayMap.get(id) || 0) + metric);
        totals.set(id, (totals.get(id) || 0) + metric);
      });
    });
    daily.set(day, dayMap);
  });
  const labels = new Map((attribute.options || []).map((option) => [option.id, option.label]));
  const days = getDateKeysForRange(range);
  const optionIds = [...totals.entries()].sort((left, right) => right[1] - left[1]).slice(0, 8).map(([id]) => id);
  const maxValue = Math.max(...[...daily.values()].flatMap((day) => optionIds.map((id) => day.get(id) || 0)), 1);
  const getOptionColor = (optionId: string) => palette.colors[Math.max(optionIds.indexOf(optionId), 0) % palette.colors.length];
  const getDayItems = (day: string) => [...(daily.get(day) || new Map<string, number>())]
    .filter(([id]) => optionIds.includes(id) && (daily.get(day)?.get(id) || 0) > 0)
    .sort((left, right) => right[1] - left[1]);
  const getDayBackground = (day: string) => {
    const items = getDayItems(day);
    if (items.length === 0) return palette.background;
    const total = items.reduce((sum, [, value]) => sum + value, 0);
    let angle = 0;
    return `conic-gradient(${items.map(([id, value]) => {
      const start = angle;
      angle += (value / total) * 100;
      return `${getOptionColor(id)} ${start}% ${angle}%`;
    }).join(', ')})`;
  };
  const legend = <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-[#e5dbcf] pt-2">{optionIds.map((optionId) => <span key={optionId} className="inline-flex min-w-0 items-center gap-1 text-[10px] text-[#67594d]"><span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: getOptionColor(optionId) }} /><span className="max-w-28 truncate">{labels.get(optionId) || MISSING_OPTION}</span></span>)}</div>;
  if (days.length === 0 || optionIds.length === 0) return <p className="py-8 text-center text-xs text-[#aa9b8b]">当前范围暂无选项数据</p>;
  if (range === 'year') {
    const monthKeys = [...new Set(days.map((day) => day.slice(0, 7)))];
    return <div className="py-1"><div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-[#a08f7d]"><span>选项 × 日期</span><span>本年 · 多选分段显示</span></div><div className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-4">{monthKeys.map((monthKey) => { const monthDays = days.filter((day) => day.startsWith(monthKey)); const [year, month] = monthKey.split('-').map(Number); const leadingBlanks = new Date(year, month - 1, 1).getDay(); return <div key={monthKey}><div className="mb-1 text-[10px] text-[#8f7f70]">{month} 月</div><div className="grid grid-cols-7 gap-px">{Array.from({ length: leadingBlanks }).map((_, index) => <span key={`blank-${monthKey}-${index}`} />)}{monthDays.map((day) => { const items = getDayItems(day); const total = items.reduce((sum, [, value]) => sum + value, 0); return <span key={day} aria-label={`${getDateLabel(day)} · ${items.map(([id, amount]) => `${labels.get(id) || MISSING_OPTION} ${mode === 'duration' ? formatDuration(amount) : amount}`).join(' / ') || '无记录'}`} className="aspect-square rounded-[2px] border border-[#eadfd4]" style={{ background: getDayBackground(day), opacity: total ? 0.3 + (Math.min(total, maxValue * optionIds.length) / (maxValue * optionIds.length)) * 0.7 : 1 }} />; })}</div></div>; })}</div>{legend}</div>;
  }
  const tileGridClass = range === '7d' ? 'grid-cols-7' : range === 'month' ? 'grid-cols-5 sm:grid-cols-7' : 'grid-cols-5 sm:grid-cols-6 lg:grid-cols-10';
  return <div className="py-1"><div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-[#a08f7d]"><span>按日构成</span><span>{range === '7d' ? '近 7 天' : range === 'month' ? '本月' : '近 30 天'}</span></div><div className={`grid gap-x-2 gap-y-3 ${tileGridClass}`}>{days.map((day) => { const items = getDayItems(day); const total = items.reduce((sum, [, value]) => sum + value, 0); const labelsText = items.map(([id, amount]) => `${labels.get(id) || MISSING_OPTION} · ${mode === 'duration' ? formatDuration(amount) : amount}`).join(' / ') || '无记录'; return <div key={day} aria-label={`${getDateLabel(day)} · ${labelsText}`} className="min-w-0 border-b border-[#e5dbcf] pb-2"><div className="flex items-center justify-between gap-1 text-[10px] text-[#8f7f70]"><span className="font-mono">{getDateLabel(day)}</span><span className="font-mono font-medium text-[#67594d]">{total || '-'}</span></div><div className="mt-2 flex h-2 overflow-hidden rounded-full bg-[#f1ebe4]">{items.map(([optionId, value]) => <span key={optionId} className="min-w-[2px]" style={{ width: `${total ? (value / total) * 100 : 0}%`, backgroundColor: getOptionColor(optionId) }} />)}</div><div className="mt-1 truncate text-[9px] leading-tight text-[#a08f7d]" title={labelsText}>{labelsText}</div></div>; })}</div>{legend}</div>;
};

interface ConditionalStatisticCardProps {
  activity: Activity;
  attributes: ActivityAttributeDefinition[];
  attribute: ActivityAttributeDefinition;
  logs: Log[];
  card: ActivityStatisticCard;
  rangeLabel: string;
  paletteId?: ActivityStatisticPaletteId;
  chartPalette: ReturnType<typeof getChartPalette>;
}

const ConditionalStatisticCard: React.FC<ConditionalStatisticCardProps> = ({ activity, attributes, attribute, logs, card, rangeLabel, paletteId, chartPalette }) => {
  const slices = getCardAttributeStatisticSlices(attribute, attributes, logs);
  return <React.Fragment>{slices.map((slice, index) => {
    const sliceAttribute: ActivityAttributeDefinition = {
      ...attribute,
      name: slice.contextLabel ? `${attribute.name} · ${slice.contextLabel}` : attribute.name,
      displayCondition: undefined
    };
    const key = `${card.id}-${index}`;
    const cardHeading = <div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-[15px] font-semibold text-[#3d332a]">{getStatisticCardLabel(card, [sliceAttribute])}</h2><div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[#a08f7d]">{card.chartType === 'choiceDonut' ? 'CHOICE DONUT' : 'CHOICE HEATMAP'} / {attribute.type === 'single' ? '单选' : '多选'}</div></div><span className="shrink-0 font-mono text-[10px] text-[#b09e8c]">{rangeLabel}</span></div>;
    if (card.chartType === 'choiceDonut') {
      return <section key={key} className="py-7 first:pt-2">{cardHeading}<DonutPreview attribute={sliceAttribute} logs={slice.logs} mode={card.metric === 'duration' ? 'duration' : 'count'} palette={chartPalette} /></section>;
    }
    if (card.chartType === 'choiceHeatmap') {
      return <section key={key} className="py-7 first:pt-2">{cardHeading}<ChoiceHeatmapPreview attribute={sliceAttribute} logs={slice.logs} mode="count" range={card.range} palette={chartPalette} /></section>;
    }
    if (card.chartType === 'choiceTreemap') {
      return <section key={key} className="py-7 first:pt-2">{cardHeading}<ChoiceTreemapPreview attribute={sliceAttribute} logs={slice.logs} mode="count" palette={chartPalette} /></section>;
    }
    return <section key={key} className="py-7 first:pt-2"><LegacyActivityAttributeStatistics activity={{ ...activity, attributes: [sliceAttribute] }} logs={slice.logs} hideToolbar fixedMode={card.metric === 'duration' ? 'duration' : 'count'} chartVariant={card.chartType} rangeLabel={rangeLabel} paletteId={paletteId} onChange={undefined} /></section>;
  })}</React.Fragment>;
};

export const ActivityAttributeStatistics: React.FC<ActivityAttributeStatisticsProps> = ({ activity, logs, onChange }) => {
  const attributes = useMemo(() => getSortedActivityAttributes(activity), [activity]);
  const paletteId = activity.statisticPalette || 'theme';
  const customSequences = useChartPaletteSequences();
  const isSponsorshipUnlocked = useSponsorshipUnlocked();
  const effectivePaletteId = isSponsorshipUnlocked ? paletteId : 'default';
  const chartPalette = getChartPalette(effectivePaletteId, customSequences);
  const userEditedCardsRef = React.useRef(false);
  const activityIdRef = React.useRef(activity.id);
  const [cards, setCards] = useState<ActivityStatisticCard[]>(() => !activity.statisticCards || activity.statisticCards.length === 0 ? ensureStatisticCards(activity) : normalizeStatisticCards(activity));
  const [manageOpen, setManageOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const commit = (next: ActivityStatisticCard[]) => {
    const normalized = next.map((card, index) => ({ ...card, order: index }));
    userEditedCardsRef.current = true;
    setCards(normalized);
    onChange?.({ ...activity, statisticCards: normalized });
  };
  const updatePalette = (nextPalette: ActivityStatisticPaletteId) => onChange?.({ ...activity, statisticPalette: nextPalette });
  React.useEffect(() => {
    if (activityIdRef.current !== activity.id) {
      activityIdRef.current = activity.id;
      userEditedCardsRef.current = false;
    }
    const useDefaultCards = !userEditedCardsRef.current && (!activity.statisticCards || activity.statisticCards.length === 0);
    const next = useDefaultCards ? ensureStatisticCards(activity) : normalizeStatisticCards(activity);
    setCards(next);
    if (JSON.stringify(next) !== JSON.stringify(activity.statisticCards || [])) onChange?.({ ...activity, statisticCards: next });
  }, [activity.id, activity.attributes, activity.statisticCards]);

  const sourceChoices = [
    ...attributes.map((attribute) => ({ key: `attribute:${attribute.id}`, source: { type: 'attribute', attributeId: attribute.id } as ActivityStatisticCardSource, label: attribute.name })),
    { key: 'note', source: { type: 'note' } as ActivityStatisticCardSource, label: '备注' },
    { key: 'tagDuration', source: { type: 'tagDuration' } as ActivityStatisticCardSource, label: '标签时长' }
  ];
  const sourceToKey = (value: ActivityStatisticCardSource) => value.type === 'note' ? 'note' : value.type === 'tagDuration' ? 'tagDuration' : `attribute:${value.attributeId}`;
  const selectedCard = cards.find((card) => card.id === selectedCardId) || null;
  const selectedTypes = selectedCard ? getChartTypesForSource(selectedCard.source, attributes) : [];
  const selectedRangeOptions = selectedCard?.source.type === 'tagDuration'
    ? selectedCard.chartType === 'tagDurationBoxplot'
      ? [{ key: 'year' as const, label: '本年' }]
      : selectedCard.chartType === 'tagDurationWeekHourHeatmap'
        ? TAG_DURATION_RANGE_OPTIONS
        : RANGE_OPTIONS
    : RANGE_OPTIONS;

  React.useEffect(() => {
    if (!manageOpen) return;
    if (selectedCardId && cards.some((card) => card.id === selectedCardId)) return;
    setSelectedCardId(cards[0]?.id || null);
  }, [cards, manageOpen, selectedCardId]);

  const updateCard = (id: string, update: Partial<ActivityStatisticCard>) => commit(cards.map((card) => card.id === id ? { ...card, ...update } : card));
  const updateSelectedCard = (update: Partial<ActivityStatisticCard>) => {
    if (selectedCard) updateCard(selectedCard.id, update);
  };

  const changeExistingSource = (key: string) => {
    if (!selectedCard) return;
    const next = sourceChoices.find((item) => item.key === key);
    if (!next) return;
    const types = getChartTypesForSource(next.source, attributes);
    const nextType = types.includes(selectedCard.chartType) ? selectedCard.chartType : types[0];
    const nextRange = nextType === 'tagDurationBoxplot' ? 'year'
      : nextType === 'tagDurationWeekHourHeatmap' ? 'all'
        : nextType === 'numberCalendar' ? 'year' : selectedCard.range;
    updateSelectedCard({
      source: next.source,
      chartType: nextType || 'textCloud',
      range: nextRange,
       metric: nextType === 'numberArea' || nextType === 'numberHistogram' || nextType === 'numberCalendar' || nextType === 'numberKpi' ? 'value' : nextType === 'choiceBar' || nextType === 'choiceDonut' ? selectedCard.metric === 'duration' ? 'duration' : 'count' : 'count'
    });
  };

  const changeExistingType = (type: ActivityStatisticCardType) => {
    if (!selectedCard) return;
    const nextRange = type === 'tagDurationBoxplot' ? 'year'
      : type === 'tagDurationWeekHourHeatmap' ? 'all'
        : type === 'numberCalendar' ? 'year' : selectedCard.range;
    updateSelectedCard({ chartType: type, range: nextRange, metric: type === 'numberArea' || type === 'numberHistogram' || type === 'numberCalendar' || type === 'numberKpi' ? 'value' : type === 'choiceBar' || type === 'choiceDonut' ? selectedCard.metric === 'duration' ? 'duration' : 'count' : 'count' });
  };

  const renderCard = (card: ActivityStatisticCard) => {
    const cardLogs = filterLogsByRange(logs, card.range);
    const rangeLabel = getRangeLabel(card.range);
    if (card.source.type === 'tagDuration') {
      if (card.chartType === 'tagDurationBoxplot') {
        return <section key={card.id} className="py-7 first:pt-2"><div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-[15px] font-semibold text-[#3d332a]">{getStatisticCardLabel(card, attributes)}</h2><div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[#a08f7d]">TAG DURATION BOXPLOT / 每日汇总</div></div><span className="shrink-0 font-mono text-[10px] text-[#b09e8c]">本年</span></div><TagDurationBoxplotPreview logs={filterLogsByRange(logs, 'year')} palette={chartPalette} /></section>;
      }
      if (card.chartType === 'tagDurationWeekHourHeatmap') {
        return <section key={card.id} className="py-7 first:pt-2"><div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-[15px] font-semibold text-[#3d332a]">{getStatisticCardLabel(card, attributes)}</h2><div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[#a08f7d]">TAG DURATION / 星期 × 小时</div></div><span className="shrink-0 font-mono text-[10px] text-[#b09e8c]">{rangeLabel}</span></div><TagDurationWeekHourHeatmap logs={logs} range={card.range} palette={chartPalette} /></section>;
      }
      const tagLogs = createTagDurationLogs(cardLogs, TAG_DURATION_ATTRIBUTE.id);
      return <section key={card.id} className="py-7 first:pt-2"><LegacyActivityAttributeStatistics activity={{ ...activity, attributes: [TAG_DURATION_ATTRIBUTE] }} logs={tagLogs} hideToolbar chartVariant={card.chartType} rangeLabel={rangeLabel} fixedRange={card.range} paletteId={paletteId} onChange={undefined} /></section>;
    }
    if (card.source.type === 'note') {
      const noteAttribute: ActivityAttributeDefinition = { id: '__note__', name: '备注', type: 'text', order: 0, createdAt: 0, updatedAt: 0 };
      const noteLogs = cardLogs.map((log) => ({ ...log, attributeValues: log.note ? [{ attributeId: noteAttribute.id, value: log.note }] : undefined }));
      return <section key={card.id} className="py-7 first:pt-2"><LegacyActivityAttributeStatistics activity={{ ...activity, attributes: [noteAttribute] }} logs={noteLogs} hideToolbar rangeLabel={rangeLabel} paletteId={paletteId} onChange={undefined} /></section>;
    }
    const attribute = getCardAttribute(activity, card.source);
    if (!attribute) return null;
    if (attribute.displayCondition) {
      return <ConditionalStatisticCard
        activity={activity}
        attributes={attributes}
        attribute={attribute}
        logs={cardLogs}
        card={card}
        rangeLabel={rangeLabel}
        paletteId={paletteId}
        chartPalette={chartPalette}
      />;
    }
    const attributeLogs = filterLogsForAttribute(cardLogs, attribute.id);
    if (card.chartType === 'choiceDonut') {
       return <section key={card.id} className="py-7 first:pt-2"><div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-[15px] font-semibold text-[#3d332a]">{getStatisticCardLabel(card, attributes)}</h2><div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[#a08f7d]">CHOICE DONUT / {attribute.type === 'single' ? '单选' : '多选'}</div></div><span className="shrink-0 font-mono text-[10px] text-[#b09e8c]">{rangeLabel}</span></div><DonutPreview attribute={attribute} logs={attributeLogs} mode={card.metric === 'duration' ? 'duration' : 'count'} palette={chartPalette} /></section>;
    }
    if (card.chartType === 'choiceHeatmap') {
       return <section key={card.id} className="py-7 first:pt-2"><div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-[15px] font-semibold text-[#3d332a]">{getStatisticCardLabel(card, attributes)}</h2><div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[#a08f7d]">CHOICE HEATMAP / {attribute.type === 'single' ? '单选' : '多选'}</div></div><span className="shrink-0 font-mono text-[10px] text-[#b09e8c]">{rangeLabel}</span></div><ChoiceHeatmapPreview attribute={attribute} logs={attributeLogs} mode="count" range={card.range} palette={chartPalette} /></section>;
    }
    if (card.chartType === 'choiceTreemap') {
      return <section key={card.id} className="py-7 first:pt-2"><div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-[15px] font-semibold text-[#3d332a]">{getStatisticCardLabel(card, attributes)}</h2><div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[#a08f7d]">CHOICE TREEMAP / 单选</div></div><span className="shrink-0 font-mono text-[10px] text-[#b09e8c]">{rangeLabel}</span></div><ChoiceTreemapPreview attribute={attribute} logs={attributeLogs} mode="count" palette={chartPalette} /></section>;
    }
     return <section key={card.id} className="py-7 first:pt-2"><LegacyActivityAttributeStatistics activity={{ ...activity, attributes: [attribute] }} logs={attributeLogs} hideToolbar fixedMode={card.metric === 'duration' ? 'duration' : 'count'} chartVariant={card.chartType} rangeLabel={rangeLabel} paletteId={paletteId} onChange={undefined} /></section>;
  };

  const addCard = () => {
    const source = sourceChoices[0]?.source || { type: 'note' as const };
    const chartType = getChartTypesForSource(source, attributes)[0] || 'textCloud';
    const newCard: ActivityStatisticCard = { id: crypto.randomUUID(), source, chartType, range: '30d', metric: chartType === 'numberArea' || chartType === 'numberHistogram' || chartType === 'numberCalendar' || chartType === 'numberKpi' ? 'value' : 'count', order: cards.length };
    commit([...cards, newCard]);
    setSelectedCardId(newCard.id);
    setManageOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ddd3c7] pb-4">
        <div><p className="text-[10px] uppercase tracking-[0.2em] text-[#a08f7d]">标签统计</p><p className="mt-1 text-sm text-[#67594d]">{logs.length} 条记录 <span className="text-[#c8b9a9]">/</span> {cards.length} 张卡片</p></div>
        <div className="flex items-center gap-2">
          {isSponsorshipUnlocked && <button type="button" onClick={() => setPaletteOpen(true)} title="配色" aria-label="配色" className="inline-flex items-center gap-1.5 rounded-md border border-[#d8cabb] bg-[#fffdfa] px-3 py-2 text-xs font-medium text-[#77523d] shadow-sm hover:bg-[#f5ebe1]"><Palette size={14} />配色</button>}
          <button type="button" onClick={() => { setSelectedCardId(cards[0]?.id || null); setManageOpen(true); }} className="inline-flex items-center gap-1.5 rounded-md border border-[#d8cabb] bg-[#fffdfa] px-3 py-2 text-xs font-medium text-[#77523d] shadow-sm hover:bg-[#f5ebe1]"><Settings2 size={14} />管理</button>
        </div>
      </div>
      <div className="divide-y divide-[#d8d0c5]">{cards.map(renderCard)}</div>
      {manageOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#3b2e24]/25 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setManageOpen(false); }}>
          <div className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-[#d8cabb] bg-[#fcfaf6] p-5 shadow-2xl sm:rounded-2xl" role="dialog" aria-modal="true" aria-label="管理统计卡片">
            <div className="mb-5 flex items-center justify-between">
              <div><h2 className="font-serif text-lg text-[#4a3b30]">管理统计卡片</h2></div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={addCard} title="新增统计卡片" className="inline-flex items-center gap-1.5 rounded-md border border-[#d8cabb] bg-[#fffdfa] px-2.5 py-1.5 text-xs font-medium text-[#77523d] hover:bg-[#f5ebe1]"><Plus size={14} />新增卡片</button>
                <button type="button" onClick={() => setManageOpen(false)} title="关闭" aria-label="关闭" className="p-1.5 text-[#a08f7d]"><X size={17} /></button>
              </div>
            </div>
            <div className="space-y-1">
              {cards.map((card, index) => (
                <div key={card.id} className={`flex items-center gap-2 border-b border-[#ece5dc] px-2 py-2.5 transition-colors ${selectedCardId === card.id ? 'bg-[#f3e7dc]' : 'hover:bg-[#faf5ef]'}`}>
                  <button type="button" onClick={() => { setSelectedCardId(card.id); setEditorOpen(true); }} aria-label={`编辑${getStatisticCardLabel(card, attributes)}`} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <span className="min-w-0 flex-1 truncate text-sm text-[#5c4b3c]">{getStatisticCardLabel(card, attributes)}</span>
                    <span className="shrink-0 text-[10px] text-[#a08f7d]">{CARD_TYPE_LABELS[card.chartType]}</span>
                  </button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); if (index > 0) { const next = [...cards]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; commit(next); } }} disabled={index === 0} title="上移" aria-label="上移" className="p-1 text-[#aa927e] disabled:opacity-25"><ArrowUp size={14} /></button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); if (index < cards.length - 1) { const next = [...cards]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; commit(next); } }} disabled={index === cards.length - 1} title="下移" aria-label="下移" className="p-1 text-[#aa927e] disabled:opacity-25"><ArrowDown size={14} /></button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); const next = cards.filter((item) => item.id !== card.id); commit(next); setSelectedCardId(next[Math.min(index, next.length - 1)]?.id || null); }} title="删除" aria-label="删除" className="p-1 text-[#b17961]"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => commit(ensureStatisticCards({ ...activity, statisticCards: cards }))} className="mt-5 text-xs text-[#9b5c3f] underline-offset-2 hover:underline">恢复默认卡片</button>
          </div>
        </div>
      )}
      {paletteOpen && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#3b2e24]/35 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaletteOpen(false); }}><div className="w-full max-w-xl rounded-t-2xl border border-[#d8cabb] bg-[#fcfaf6] p-5 shadow-2xl sm:rounded-2xl" role="dialog" aria-modal="true" aria-label="配色"><div className="mb-5 flex items-center justify-between"><h2 className="font-serif text-lg text-[#4a3b30]">配色</h2><button type="button" onClick={() => setPaletteOpen(false)} title="关闭" aria-label="关闭" className="p-1.5 text-[#a08f7d]"><X size={17} /></button></div><ChartPaletteSelector value={effectivePaletteId} onChange={updatePalette} customSequences={customSequences} unlocked={isSponsorshipUnlocked} /></div></div>}
      {editorOpen && selectedCard && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#3b2e24]/35 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditorOpen(false); }}><div className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-[#d8cabb] bg-[#fcfaf6] p-5 shadow-2xl sm:rounded-2xl" role="dialog" aria-modal="true" aria-label="编辑所选卡片"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-serif text-lg text-[#4a3b30]">编辑所选卡片</h2><span className="text-[10px] text-[#b09e8c]">#{cards.findIndex((card) => card.id === selectedCard.id) + 1}</span></div><button type="button" onClick={() => setEditorOpen(false)} title="关闭" aria-label="关闭" className="p-1.5 text-[#a08f7d]"><X size={17} /></button></div><CustomSelect label="数据来源" value={sourceToKey(selectedCard.source)} options={sourceChoices.map((item) => ({ value: item.key, label: item.label }))} onChange={changeExistingSource} renderDropdownInPortal /><div className="mt-4"><p className="mb-2 text-xs text-[#766657]">图表类型</p><div className="grid grid-cols-2 gap-2">{selectedTypes.map((type) => { const Icon = CARD_TYPE_ICONS[type]; return <button key={type} type="button" onClick={() => changeExistingType(type)} className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors ${selectedCard.chartType === type ? 'border-[#b16d4c] bg-[#f1e1d5] font-medium text-[#8f4f32]' : 'border-[#e0d6ca] text-[#8f7f70] hover:border-[#c9b6a4]'}`}><Icon size={14} /><span>{CARD_TYPE_LABELS[type]}</span></button>; })}</div></div><div className="mt-4"><p className="mb-2 text-xs text-[#766657]">时间范围</p><div className="flex flex-wrap gap-1.5">{selectedRangeOptions.map((option) => <button key={option.key} type="button" onClick={() => updateSelectedCard({ range: option.key })} className={`rounded-md border px-2.5 py-1.5 text-xs ${selectedCard.range === option.key ? 'border-[#b16d4c] bg-[#f1e1d5] font-medium text-[#8f4f32]' : 'border-[#e0d6ca] text-[#8f7f70]'}`}>{option.label}</button>)}</div></div>{(selectedCard.chartType === 'choiceBar' || selectedCard.chartType === 'choiceDonut') && <div className="mt-4"><p className="mb-2 text-xs text-[#766657]">统计维度</p><div className="flex gap-1.5">{STATISTIC_MODE_OPTIONS.map((option) => <button key={option.key} type="button" onClick={() => updateSelectedCard({ metric: option.key })} className={`rounded-md border px-3 py-1.5 text-xs ${selectedCard.metric === option.key ? 'border-[#b16d4c] bg-[#f1e1d5] font-medium text-[#8f4f32]' : 'border-[#e0d6ca] text-[#8f7f70]'}`}>{option.label}</button>)}</div></div>}</div></div>}
    </div>
  );
};
