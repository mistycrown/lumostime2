/**
 * @file CrossDayStatistics.tsx
 * @updated 2026-10-25: Places one calendar display icon beside the chart title instead of a separate text-control row.
 * @updated 2026-10-25: Separates overview tables from charts and applies metric colors from the shared sequence.
 * @input Complete tag history, cross-day card settings and the shared palette.
 * @output Clock/duration trends, gap-aware overnight intervals and metric calendars.
 * @pos Component (Tag Statistics)
 * @updated 2026-10-25: Uses compact year charts and all-time year paging; only trends select daily details.
 */
import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ActivityStatisticCard, CrossDayMetric, Log } from '../../types';
import type { ChartPalette } from '../../utils/chartPalette';
import {
  buildCrossDayStats, CROSS_DAY_METRIC_LABELS, formatCrossDayClock, formatCrossDayDuration,
  getCrossDayDateKeys, getCrossDayValue, getPreviousCrossDayKeys, normalizeDayBoundary
} from '../../utils/crossDayStatsUtils';
import { InteractiveTrendChart } from './InteractiveTrendChart';
import { CrossDayCalendar, CrossDayTimeline, crossDayDetails } from './CrossDayCharts';
import { CrossDayOverview } from './CrossDayOverview';
import { CalendarDisplayToggle } from './CalendarDisplayToggle';

interface CrossDayStatisticsProps {
  card: ActivityStatisticCard;
  logs: Log[];
  palette: ChartPalette;
  rangeLabel: string;
  now?: Date;
  onCalendarValuesChange?: (show: boolean) => void;
}

const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

export const CrossDayStatistics: React.FC<CrossDayStatisticsProps> = ({ card, logs, palette, rangeLabel, now = new Date(), onCalendarValuesChange }) => {
  const boundary = normalizeDayBoundary(card.dayBoundaryMinutes);
  const metric = card.chartType === 'crossDayTimeline' ? 'duration' : card.crossDayMetric || 'duration';
  const nowTime = now.getTime();
  const stats = useMemo(() => buildCrossDayStats(logs, boundary, new Date(nowTime)), [logs, boundary, nowTime]);
  const keys = getCrossDayDateKeys(card.range, now, stats.keys().next().value);
  const valuesFor = (dateKeys: string[]) => dateKeys.flatMap(key => stats.has(key) ? [getCrossDayValue(stats.get(key)!, metric)] : []);
  const values = valuesFor(keys);
  const mean = average(values);
  const format = metric === 'duration' ? formatCrossDayDuration : formatCrossDayClock;
  const selectedKey = [...keys].reverse().find(key => stats.has(key)) || keys.at(-1)!;
  const [yearSelection, setYearSelection] = useState<string | null>(null);
  const years = [...new Set(keys.map(key => key.slice(0, 4)))];
  const displayYear = yearSelection && years.includes(yearSelection) ? yearSelection : years.at(-1)!;
  const yearIndex = years.indexOf(displayYear);
  const overview = card.chartType === 'crossDayOverview';
  const pageYears = card.range === 'all' && (card.chartType === 'crossDayCalendar' || card.chartType === 'crossDayTimeline');
  const chartKeys = pageYears ? keys.filter(key => key.startsWith(`${displayYear}-`)) : keys;
  const weekly = card.range === '7d' || card.range === 'week';
  const timeline = card.chartType === 'crossDayTimeline';
  const title = `跨天活动${timeline || overview ? '' : ` · ${CROSS_DAY_METRIC_LABELS[metric]}`}`;
  const metricColor = palette.colors[(['start', 'duration', 'end'] as CrossDayMetric[]).indexOf(metric)] || palette.accent;
  const domain: [number, number] = metric === 'duration'
    ? [0, Math.max(3600, ...values) * 1.1]
    : [Math.floor(Math.min(...values) / 60) * 60 - 30, Math.ceil(Math.max(...values) / 60) * 60 + 30];

  return <section className="py-7 first:pt-2" aria-label={`${title}统计`}>
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="min-w-0"><div className="flex min-w-0 items-center gap-2" data-statistics-title-row=""><h2 className="min-w-0 truncate text-[15px] font-semibold text-[#3d332a]">{title}</h2>
        {card.chartType === 'crossDayCalendar' && !weekly && onCalendarValuesChange && <CalendarDisplayToggle showValues={Boolean(card.showCalendarValues)} kind={metric === 'duration' ? 'duration' : 'clock'} onChange={onCalendarValuesChange} />}
        </div>
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[#a08f7d]">{overview ? 'OVERNIGHT / 数据概览' : timeline ? 'OVERNIGHT / 时段图' : card.chartType === 'crossDayCalendar' ? 'OVERNIGHT / 指标日历' : 'OVERNIGHT / 趋势折线图'}</div>
      </div><span className="shrink-0 font-mono text-[10px] text-[#b09e8c]">{rangeLabel}</span>
    </div>
    {overview ? <CrossDayOverview keys={keys} previousKeys={card.range === 'all' ? [] : getPreviousCrossDayKeys(keys)} stats={stats} palette={palette} />
      : mean === null ? <p className="py-10 text-center text-sm text-[#a08f7d]">暂无跨天活动记录</p>
      : card.chartType === 'crossDayTrend' ? <InteractiveTrendChart title={title}
        points={keys.map(key => ({ key, value: stats.has(key) ? getCrossDayValue(stats.get(key)!, metric) : null }))}
        accent={metricColor} formatValue={format} area={metric === 'duration'} valueDomain={domain}
        referenceValue={mean} formatDetails={key => crossDayDetails(stats.get(key))} initialSelectedKey={selectedKey} />
        : <>
          {pageYears && <div className="mb-4 flex items-center gap-1" aria-label="统计年份">
              <button type="button" aria-label="上一年" disabled={yearIndex === 0} onClick={() => setYearSelection(years[yearIndex - 1])} className="p-1.5 text-stone-500 disabled:opacity-25"><ChevronLeft size={15} /></button>
              <span className="font-mono text-xs text-[#8f7f70]">{displayYear} 年</span>
              <button type="button" aria-label="下一年" disabled={yearIndex === years.length - 1} onClick={() => setYearSelection(years[yearIndex + 1])} className="p-1.5 text-stone-500 disabled:opacity-25"><ChevronRight size={15} /></button>
            </div>}
          {timeline ? <CrossDayTimeline keys={chartKeys} stats={stats} boundary={boundary} palette={palette} compact={card.range === 'year' || card.range === 'all'} />
            : <CrossDayCalendar keys={chartKeys} stats={stats} metric={metric} palette={palette} weekly={weekly} singleMonth={card.range === 'month'} showValues={!weekly && Boolean(card.showCalendarValues)} scale={[Math.min(...values), Math.max(...values)]} />}
        </>}
  </section>;
};
