/**
 * @file CrossDayStatistics.tsx
 * @input Complete tag history, cross-day card settings and the shared palette.
 * @output Clock/duration trends, gap-aware overnight intervals and metric calendars.
 * @pos Component (Tag Statistics)
 * @updated 2026-10-25: Adds three overnight visualizations with selected-date details and period averages.
 */
import React, { useMemo, useState } from 'react';
import type { ActivityStatisticCard, CrossDayMetric, Log } from '../../types';
import type { ChartPalette } from '../../utils/chartPalette';
import {
  buildCrossDayStats, CROSS_DAY_METRIC_LABELS, formatCrossDayClock, formatCrossDayDuration,
  getCrossDayClockPosition, getCrossDayDateKeys, getCrossDayValue, getPreviousCrossDayKeys,
  normalizeDayBoundary, type CrossDayStat
} from '../../utils/crossDayStatsUtils';
import { InteractiveTrendChart } from './InteractiveTrendChart';

interface CrossDayStatisticsProps {
  card: ActivityStatisticCard;
  logs: Log[];
  palette: ChartPalette;
  rangeLabel: string;
  now?: Date;
}

const shortDate = (key: string) => `${Number(key.slice(5, 7))}/${Number(key.slice(8))}`;
const timestampLabel = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()} ${formatCrossDayClock(date.getHours() * 60 + date.getMinutes())}`;
};
const nightDetails = (night?: CrossDayStat) => night
  ? `${timestampLabel(night.start)} → ${timestampLabel(night.end)} · ${formatCrossDayDuration(night.duration)}`
  : undefined;
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const MetricCalendar: React.FC<{
  keys: string[]; stats: Map<string, CrossDayStat>; metric: CrossDayMetric; palette: ChartPalette;
  selectedKey: string; onSelect: (key: string) => void;
}> = ({ keys, stats, metric, palette, selectedKey, onSelect }) => {
  const months = [...new Set(keys.map(key => key.slice(0, 7)))];
  const keySet = new Set(keys);
  const values = keys.flatMap(key => stats.has(key) ? [getCrossDayValue(stats.get(key)!, metric)] : []);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const format = metric === 'duration' ? formatCrossDayDuration : formatCrossDayClock;
  return <div>
    <div className={`grid gap-x-7 gap-y-6 ${months.length > 1 ? 'sm:grid-cols-2' : 'mx-auto max-w-sm'}`}>
      {months.map(month => {
        const [year, monthNumber] = month.split('-').map(Number);
        const offset = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;
        const days = new Date(year, monthNumber, 0).getDate();
        return <div key={month}>
          <h3 className="mb-3 font-mono text-xs text-[#8f7f70]">{year} / {String(monthNumber).padStart(2, '0')}</h3>
          <div className="grid grid-cols-7 gap-1">
            {['一', '二', '三', '四', '五', '六', '日'].map(day => <span key={day} className="pb-1 text-center text-[10px] text-[#a08f7d]">{day}</span>)}
            {Array.from({ length: offset }, (_, index) => <span key={`pad-${index}`} />)}
            {Array.from({ length: days }, (_, index) => {
              const key = `${month}-${String(index + 1).padStart(2, '0')}`;
              const night = keySet.has(key) ? stats.get(key) : undefined;
              const value = night ? getCrossDayValue(night, metric) : null;
              const label = value === null ? '无记录' : format(value);
              const ratio = value === null ? 0 : max === min ? 0.6 : (value - min) / (max - min);
              return <button key={key} type="button" disabled={!keySet.has(key)}
                aria-label={`${key} ${CROSS_DAY_METRIC_LABELS[metric]} ${label}`} aria-pressed={key === selectedKey}
                title={`${key} · ${label}${night ? ` · ${nightDetails(night)}` : ''}`} onClick={() => onSelect(key)}
                className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-sm border py-2 outline-offset-2 transition-opacity disabled:opacity-20 ${key === selectedKey ? 'border-current' : 'border-transparent'}`}
                style={{ color: value === null ? '#b3a597' : palette.accent }}>
                <span className="pointer-events-none absolute inset-0 rounded-sm" style={{ backgroundColor: value === null ? palette.grid : palette.accent, opacity: value === null ? 0.25 : 0.08 + ratio * 0.3 }} />
                <span className="relative font-mono text-[11px]">{index + 1}</span>
                <span className="relative whitespace-nowrap font-mono text-[8px] tabular-nums">{value === null ? '—' : metric === 'duration' ? `${Math.floor(Math.round(value / 60) / 60)}:${String(Math.round(value / 60) % 60).padStart(2, '0')}` : label}</span>
              </button>;
            })}
          </div>
        </div>;
      })}
    </div>
    {values.length > 0 && <div className="mt-4 flex items-center justify-end gap-2 font-mono text-[10px] text-[#a08f7d]">
      <span>{format(min)}</span>
      {[0.08, 0.18, 0.28, 0.38].map(opacity => <span key={opacity} className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: palette.accent, opacity }} />)}
      <span>{format(max)}</span>
    </div>}
  </div>;
};

const IntervalTimeline: React.FC<{
  keys: string[]; stats: Map<string, CrossDayStat>; boundary: number; palette: ChartPalette;
  selectedKey: string; onSelect: (key: string) => void;
}> = ({ keys, stats, boundary, palette, selectedKey, onSelect }) => (
  <div>
    <div className="mb-2 flex items-center gap-2 border-b border-[#e0d6ca] pb-2">
      <span className="w-9 shrink-0" />
      <div className="flex min-w-0 flex-1 justify-between font-mono text-[9px] text-[#a08f7d]">
        {[0, 360, 720, 1080, 1440].map(offset => <span key={offset}>{formatCrossDayClock(boundary + offset)}</span>)}
      </div><span className="w-14 shrink-0 text-right text-[9px] text-[#a08f7d]">时长</span>
    </div>
    <div className="max-h-[440px] overflow-y-auto overscroll-contain pr-1">
      {[...keys].reverse().map(key => {
        const night = stats.get(key);
        return <button key={key} type="button" aria-label={`${key} ${nightDetails(night) || '无记录'}`}
          aria-pressed={key === selectedKey} onClick={() => onSelect(key)}
          className="flex w-full items-center gap-2 border-b border-[#e0d6ca]/50 py-1.5 text-left transition-colors hover:bg-stone-100"
          style={{ backgroundColor: key === selectedKey ? palette.background : undefined }}>
          <span className="w-9 shrink-0 font-mono text-[10px] tabular-nums text-[#8f7f70]">{shortDate(key)}</span>
          <span className="relative h-6 min-w-0 flex-1">
            {[0, 25, 50, 75, 100].map(left => <span key={left} className="absolute inset-y-0 border-l border-dashed border-[#e0d6ca]" style={{ left: `${left}%` }} />)}
            {night?.intervals.map((interval, index) => {
              const start = getCrossDayClockPosition(interval.start, key);
              const end = getCrossDayClockPosition(interval.end, key);
              return <span key={index} className="absolute top-1.5 h-3 rounded-sm" style={{
                left: `${(start - boundary) / 1440 * 100}%`, width: `${Math.max(0.3, (end - start) / 1440 * 100)}%`,
                backgroundColor: palette.accent, opacity: key === selectedKey ? 0.95 : 0.65
              }} />;
            })}
            {!night && <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[#b3a597]">—</span>}
          </span>
          <span className="w-14 shrink-0 text-right font-mono text-[9px] tabular-nums text-[#8f7f70]">{night ? formatCrossDayDuration(night.duration) : '—'}</span>
        </button>;
      })}
    </div>
  </div>
);

export const CrossDayStatistics: React.FC<CrossDayStatisticsProps> = ({ card, logs, palette, rangeLabel, now = new Date() }) => {
  const boundary = normalizeDayBoundary(card.dayBoundaryMinutes);
  const metric = card.chartType === 'crossDayTimeline' ? 'duration' : card.crossDayMetric || 'duration';
  const nowTime = now.getTime();
  const stats = useMemo(() => buildCrossDayStats(logs, boundary, new Date(nowTime)), [logs, boundary, nowTime]);
  const keys = getCrossDayDateKeys(card.range, now);
  const valuesFor = (dateKeys: string[]) => dateKeys.flatMap(key => stats.has(key) ? [getCrossDayValue(stats.get(key)!, metric)] : []);
  const values = valuesFor(keys);
  const mean = average(values);
  const previousMean = average(valuesFor(getPreviousCrossDayKeys(keys)));
  const difference = mean === null || previousMean === null ? null : mean - previousMean;
  const format = metric === 'duration' ? formatCrossDayDuration : formatCrossDayClock;
  const [selection, setSelection] = useState<string | null>(null);
  const selectedKey = selection && keys.includes(selection) ? selection : [...keys].reverse().find(key => stats.has(key)) || keys.at(-1)!;
  const timeline = card.chartType === 'crossDayTimeline';
  const title = `跨天活动${timeline ? '' : ` · ${CROSS_DAY_METRIC_LABELS[metric]}`}`;
  const domain: [number, number] = metric === 'duration'
    ? [0, Math.max(3600, ...values) * 1.1]
    : [Math.floor(Math.min(...values) / 60) * 60 - 30, Math.ceil(Math.max(...values) / 60) * 60 + 30];
  const changeLabel = difference === null ? '—' : Math.abs(difference) < (metric === 'duration' ? 60 : 1) ? '持平'
    : metric === 'duration' ? `${difference > 0 ? '+' : '−'}${formatCrossDayDuration(Math.abs(difference))}`
      : `${difference > 0 ? '晚' : '早'} ${Math.round(Math.abs(difference))} 分钟`;

  return <section className="py-7 first:pt-2" aria-label={`${title}统计`}>
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="min-w-0"><h2 className="truncate text-[15px] font-semibold text-[#3d332a]">{title}</h2>
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[#a08f7d]">{timeline ? 'OVERNIGHT / 时段图' : card.chartType === 'crossDayCalendar' ? 'OVERNIGHT / 指标日历' : 'OVERNIGHT / 趋势折线图'}</div>
      </div><span className="shrink-0 font-mono text-[10px] text-[#b09e8c]">{rangeLabel}</span>
    </div>
    <div className="mb-6 grid grid-cols-3 gap-3 border-b border-[#e0d6ca] pb-5">
      <div><div className="text-[10px] text-[#a08f7d]">平均{CROSS_DAY_METRIC_LABELS[metric]}</div><div className="mt-2 font-mono text-xl tabular-nums" style={{ color: palette.accent }}>{mean === null ? '—' : format(mean)}</div></div>
      <div><div className="text-[10px] text-[#a08f7d]">较上一周期</div><div className="mt-2 font-mono text-sm leading-7 tabular-nums text-[#766657]">{changeLabel}</div></div>
      <div><div className="text-[10px] text-[#a08f7d]">已记录天数</div><div className="mt-2 font-mono text-sm leading-7 tabular-nums text-[#766657]">{values.length} / {keys.length}</div></div>
    </div>
    {mean === null ? <p className="py-10 text-center text-sm text-[#a08f7d]">暂无跨天活动记录</p>
      : card.chartType === 'crossDayTrend' ? <InteractiveTrendChart title={title}
        points={keys.map(key => ({ key, value: stats.has(key) ? getCrossDayValue(stats.get(key)!, metric) : null }))}
        accent={palette.accent} formatValue={format} area={metric === 'duration'} valueDomain={domain}
        referenceValue={mean} formatDetails={key => nightDetails(stats.get(key))} initialSelectedKey={selectedKey} />
        : <>
          {timeline ? <IntervalTimeline keys={keys} stats={stats} boundary={boundary} palette={palette} selectedKey={selectedKey} onSelect={setSelection} />
            : <MetricCalendar keys={keys} stats={stats} metric={metric} palette={palette} selectedKey={selectedKey} onSelect={setSelection} />}
          <div className="mt-4 border-t border-[#e0d6ca] pt-3" role="status" aria-live="polite" aria-atomic="true">
            <div className="text-[11px] text-[#a08f7d]">{selectedKey}</div>
            <div className="mt-1 font-mono text-lg tabular-nums" style={{ color: palette.accent }}>{stats.has(selectedKey) ? format(getCrossDayValue(stats.get(selectedKey)!, metric)) : '无记录'}</div>
            {stats.has(selectedKey) && <div className="mt-1 text-[10px] text-[#8f7f70]">{nightDetails(stats.get(selectedKey))}</div>}
          </div>
        </>}
  </section>;
};
