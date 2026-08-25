/**
 * @file ActivityAttributeStatistics.tsx
 * @input One Activity and its actual Logs.
 * @output Type-specific attribute distribution and trend visualizations.
 * @pos Activity detail analytics component
 * @description Presents attribute data as a compact editorial report: text terms, choice rankings, numeric KPIs, and trends.
 * @updated 2026-08-25: Added type-specific visualizations, text aggregation, date ranges, and theme-aware styling.
 */
import React, { useMemo, useState } from 'react';
import { Activity, ActivityAttributeDefinition, ActivityAttributeOption, ActivityAttributeType, ActivityAttributeValue, Log } from '../types';
import { getSortedActivityAttributes } from '../utils/activityAttributeUtils';

type StatisticsAttribute = Pick<ActivityAttributeDefinition, 'id' | 'name' | 'type' | 'options'>;
type RangeKey = 'all' | '7d' | '30d' | 'year';

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: '7d', label: '近 7 天' },
  { key: '30d', label: '近 30 天' },
  { key: 'year', label: '本年' }
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

const TEXT_STOPWORDS = new Set(['的', '了', '和', '是', '在', '有', '我', '也', '就', '都', '很', '还', '与', '及', '或', '一个', '一些']);

const getTextTerms = (value: string) => {
  const text = value.trim().replace(/[\r\n]+/g, ' ');
  if (!text) return [];

  const Segmenter = (Intl as typeof Intl & { Segmenter?: new (locale?: string, options?: { granularity: 'word' }) => { segment: (input: string) => Iterable<{ segment: string; isWordLike?: boolean }> } }).Segmenter;
  if (Segmenter) {
    const segmenter = new Segmenter('zh', { granularity: 'word' });
    return Array.from(segmenter.segment(text))
      .map((part) => part.segment.trim().toLowerCase())
      .filter((part) => part.length >= 2 && !TEXT_STOPWORDS.has(part) && /[\u4e00-\u9fffA-Za-z0-9]/.test(part));
  }

  return text
    .split(/[，。！？，、；：,.!?;:\s]+/)
    .flatMap((part) => part.length <= 8 ? [part] : part.match(/[\u4e00-\u9fffA-Za-z0-9]{2,4}/g) || [])
    .map((part) => part.toLowerCase())
    .filter((part) => part.length >= 2 && !TEXT_STOPWORDS.has(part));
};

interface ActivityAttributeStatisticsProps {
  activity: Activity;
  logs: Log[];
}

interface TrendPoint {
  key: string;
  value: number;
}

const AttributeSection: React.FC<{
  title: string;
  typeLabel: string;
  count: number;
  children: React.ReactNode;
}> = ({ title, typeLabel, count, children }) => (
  <section className="border-t border-stone-200/80 pt-5">
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold tracking-tight text-stone-800">{title}</h2>
        <span className="text-[10px] uppercase tracking-[0.16em] text-stone-400">{typeLabel}</span>
      </div>
      <span className="shrink-0 text-xs text-stone-400">{count} 条已填写</span>
    </div>
    {children}
  </section>
);

export const ActivityAttributeStatistics: React.FC<ActivityAttributeStatisticsProps> = ({ activity, logs }) => {
  const [range, setRange] = useState<RangeKey>('all');
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

  if (logs.length === 0) {
    return <div className="py-20 text-center text-sm text-stone-400">暂无可分析的属性数据</div>;
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">属性概览</p>
          <p className="mt-1 text-sm text-stone-600">{filteredLogs.length} 条记录 <span className="text-stone-300">/</span> {filledValueCount} 个属性值</p>
        </div>
        <div className="flex max-w-full overflow-x-auto rounded-lg border border-stone-200 bg-white p-0.5 no-scrollbar">
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
      </div>

      {attributes.length === 0 ? (
        <div className="border-t border-stone-200 pt-8 text-center text-sm text-stone-400">该时间范围内暂无属性数据</div>
      ) : (
        <div className="space-y-8">
          {attributes.map((attribute) => {
            const values = filteredLogs.flatMap((log) => (log.attributeValues || []).filter((value) => value.attributeId === attribute.id));
            if (attribute.type === 'text') {
              const termCounts = new Map<string, number>();
              values.forEach((value) => {
                if ('value' in value && typeof value.value === 'string') getTextTerms(value.value).forEach((term) => termCounts.set(term, (termCounts.get(term) || 0) + 1));
              });
              const terms = [...termCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 24);
              const maxCount = terms[0]?.[1] || 1;
              return (
                <AttributeSection key={attribute.id} title={attribute.name} typeLabel="TEXT / 文本" count={values.length}>
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
              filteredLogs.forEach((log) => (log.attributeValues || []).forEach((value) => {
                if (value.attributeId !== attribute.id || !('value' in value) || typeof value.value !== 'number') return;
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
                <AttributeSection key={attribute.id} title={attribute.name} typeLabel="NUMBER / 数字" count={numbers.length}>
                  <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200 sm:grid-cols-4">
                    {[
                      ['合计', formatNumber(sum)],
                      ['平均', formatNumber(sum / numbers.length)],
                      ['最小', formatNumber(Math.min(...numbers))],
                      ['最大', formatNumber(Math.max(...numbers))]
                    ].map(([label, value]) => <div key={label} className="bg-white px-3 py-3"><div className="text-[10px] text-stone-400">{label}</div><div className="mt-1 font-mono text-base" style={{ color: statisticAccent }}>{value}</div></div>)}
                  </div>
                  {trend.length > 0 && (
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
            values.forEach((value) => {
              const optionIds = 'optionId' in value ? [value.optionId] : 'optionIds' in value ? value.optionIds : [];
              optionIds.forEach((optionId) => selectedByOption.set(optionId, (selectedByOption.get(optionId) || 0) + 1));
            });
            const options = new Map<string, ActivityAttributeOption>((attribute.options || []).map((option) => [option.id, option]));
            selectedByOption.forEach((_count, optionId) => { if (!options.has(optionId)) options.set(optionId, { id: optionId, label: MISSING_OPTION }); });
            const rankedOptions = [...selectedByOption.entries()].sort((left, right) => right[1] - left[1]);
            return (
              <AttributeSection key={attribute.id} title={attribute.name} typeLabel={`${attribute.type === 'single' ? 'SINGLE' : 'MULTI'} / ${attribute.type === 'single' ? '单选' : '多选'}`} count={values.length}>
                <div className="space-y-3">
                  {rankedOptions.map(([optionId, count], index) => {
                    const option = options.get(optionId);
                    const percentage = Math.round((count / values.length) * 100);
                    const color = index === 0 ? statisticAccent : index < 3 ? accentMuted : '#d6d3d1';
                    return <div key={optionId}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate text-stone-600">{option?.label || MISSING_OPTION}</span><span className="shrink-0 font-mono text-stone-400">{count} <span className="text-stone-300">/</span> {percentage}%</span></div>
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
