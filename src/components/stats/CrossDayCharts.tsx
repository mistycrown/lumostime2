/**
 * @file CrossDayCharts.tsx
 * @input Display dates, overnight intervals, metric scale and shared palette.
 * @output Non-interactive compact calendars and monthly interval small multiples.
 * @pos Component (Cross-day Statistics)
 * @updated 2026-10-25: Matches duration calendars and keeps long interval ranges compact without date selection.
 */
import React from 'react';
import type { CrossDayMetric } from '../../types';
import type { ChartPalette } from '../../utils/chartPalette';
import { CROSS_DAY_METRIC_LABELS, formatCrossDayClock, formatCrossDayDuration, getCrossDayClockPosition, getCrossDayValue, type CrossDayStat } from '../../utils/crossDayStatsUtils';

interface ChartProps {
  keys: string[];
  stats: Map<string, CrossDayStat>;
  palette: ChartPalette;
}

const shortDate = (key: string) => `${Number(key.slice(5, 7))}/${Number(key.slice(8))}`;
export const crossDayDetails = (night?: CrossDayStat): string | undefined => {
  if (!night) return undefined;
  const timestamp = (value: number) => { const date = new Date(value); return `${date.getMonth() + 1}/${date.getDate()} ${formatCrossDayClock(date.getHours() * 60 + date.getMinutes())}`; };
  return `${timestamp(night.start)} → ${timestamp(night.end)} · ${formatCrossDayDuration(night.duration)}`;
};
const compactDuration = (seconds: number) => { const minutes = Math.round(seconds / 60); return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`; };

export const CrossDayCalendar: React.FC<ChartProps & {
  metric: CrossDayMetric; weekly: boolean; singleMonth: boolean; showValues: boolean; scale: [number, number];
}> = ({ keys, stats, palette, metric, weekly, singleMonth, showValues, scale: [minimum, maximum] }) => {
  const months = [...new Set(keys.map(key => key.slice(0, 7)))];
  const keySet = new Set(keys);
  const format = metric === 'duration' ? formatCrossDayDuration : formatCrossDayClock;
  const compact = metric === 'duration' ? compactDuration : formatCrossDayClock;
  const cell = (key: string, marker?: number) => {
    const night = keySet.has(key) ? stats.get(key) : undefined;
    const value = night ? getCrossDayValue(night, metric) : null;
    const label = value === null ? '无记录' : format(value);
    const ratio = value === null ? 0 : maximum === minimum ? 0.6 : (value - minimum) / (maximum - minimum);
    return <span key={key} aria-label={`${key} ${CROSS_DAY_METRIC_LABELS[metric]} ${label}`}
      title={`${key} · ${label}${night ? ` · ${crossDayDetails(night)}` : ''}`} data-calendar-date={key}
      className={`flex min-w-0 flex-col ${keySet.has(key) ? '' : 'opacity-25'}`}>
      <span className="flex aspect-square w-full items-center justify-center rounded-[2px] border border-stone-200 font-mono text-[8px]"
        style={{ backgroundColor: value === null ? '#f5f5f4' : palette.accent, color: value === null ? '#a8a29e' : '#ffffff', opacity: value === null ? 1 : 0.3 + ratio * 0.7 }}>{marker ?? null}</span>
      {showValues && <span className={`mt-0.5 truncate text-center font-mono text-[8px] leading-tight tracking-[-0.04em] tabular-nums ${value === null ? 'text-stone-300' : 'text-stone-600'}`} data-calendar-value="">{value === null ? '—' : compact(value)}</span>}
    </span>;
  };
  if (weekly) return <div className="grid grid-cols-7 gap-2" data-cross-day-calendar="weekly">{keys.map(key => {
    const [year, month, day] = key.split('-').map(Number);
    const value = stats.has(key) ? getCrossDayValue(stats.get(key)!, metric) : null;
    return <div key={key} className="min-w-0 text-center"><div className="text-[9px] text-stone-400">周{['日', '一', '二', '三', '四', '五', '六'][new Date(year, month - 1, day).getDay()]}</div>
      <div className="mb-2 mt-0.5 font-mono text-[10px] text-stone-600">{shortDate(key)}</div>{cell(key)}
      <div className="mt-1 truncate font-mono text-[9px] text-stone-500">{value === null ? '—' : compact(value)}</div>
    </div>;
  })}</div>;
  const columns = singleMonth ? 'grid-cols-1' : showValues ? 'grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  return <div data-cross-day-calendar="compact">
    <div className={`grid gap-x-3 gap-y-3 ${columns}`} data-cross-day-months="">{months.map(month => {
      const [year, monthNumber] = month.split('-').map(Number);
      const leading = new Date(year, monthNumber - 1, 1).getDay();
      const dayCount = new Date(year, monthNumber, 0).getDate();
      const cellCount = singleMonth ? dayCount : Math.ceil((leading + dayCount) / 7) * 7;
      return <div key={month} data-cross-day-month={month}>
        <div className="mb-1 text-[10px] text-stone-500">{monthNumber} 月</div>
        <div className={`grid ${singleMonth ? showValues ? 'grid-cols-7 sm:grid-cols-[repeat(14,minmax(0,1fr))] gap-x-1' : 'grid-cols-[repeat(14,minmax(0,1fr))] gap-x-1' : 'grid-cols-7 gap-x-0.5'} ${showValues ? 'gap-y-1.5' : 'gap-y-0.5'}`}>
          {Array.from({ length: cellCount }, (_, index) => {
            const day = singleMonth ? index + 1 : index - leading + 1;
            if (day < 1 || day > dayCount) return <span key={`blank-${index}`} aria-hidden="true" />;
            const key = `${month}-${String(day).padStart(2, '0')}`;
            return cell(key, (singleMonth ? [5, 10, 15, 25, 30] : [10, 20]).includes(day) ? day : undefined);
          })}
        </div>
      </div>;
    })}</div>
    <div className="mt-4 flex items-center justify-end gap-2 font-mono text-[10px] text-[#a08f7d]">
      <span>{format(minimum)}</span>{[0.3, 0.5, 0.75, 1].map(opacity => <span key={opacity} className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: palette.accent, opacity }} />)}<span>{format(maximum)}</span>
    </div>
  </div>;
};

export const CrossDayTimeline: React.FC<ChartProps & { boundary: number; compact: boolean }> = ({ keys, stats, palette, boundary, compact }) => {
  if (compact) {
    const keySet = new Set(keys);
    const months = [...new Set(keys.map(key => key.slice(0, 7)))];
    return <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-4" data-cross-day-timeline="compact">
      {months.map(month => {
        const [year, monthNumber] = month.split('-').map(Number);
        const dayCount = new Date(year, monthNumber, 0).getDate();
        return <div key={month} data-cross-day-month={month}>
          <div className="mb-1 text-[10px] text-stone-500">{monthNumber} 月</div>
          <svg viewBox="0 0 180 112" className="w-full" role="img" aria-label={`${year}年${monthNumber}月跨天活动时段`}>
            {[0, 360, 720, 1080, 1440].map(offset => {
              const x = 18 + offset / 1440 * 158;
              return <g key={offset}><line x1={x} x2={x} y1="14" y2="110" stroke={palette.grid} strokeWidth="0.5" strokeDasharray="1 2" />
                <text x={x} y="8" fontSize="6" fill="#a08f7d" textAnchor={offset === 0 ? 'start' : offset === 1440 ? 'end' : 'middle'}>{formatCrossDayClock(boundary + offset)}</text></g>;
            })}
            {Array.from({ length: dayCount }, (_, index) => {
              const day = index + 1;
              const key = `${month}-${String(day).padStart(2, '0')}`;
              const night = keySet.has(key) ? stats.get(key) : undefined;
              const y = 16 + index * 3;
              return <g key={key} aria-label={`${key} ${crossDayDetails(night) || '无记录'}`}>
                {[1, 10, 20, dayCount].includes(day) && <text x="13" y={y + 2} textAnchor="end" fontSize="6" fill="#a08f7d">{day}</text>}
                <line x1="18" x2="176" y1={y + 1} y2={y + 1} stroke={palette.grid} strokeOpacity="0.5" strokeWidth="0.5" />
                {night?.intervals.map((interval, intervalIndex) => {
                  const start = getCrossDayClockPosition(interval.start, key);
                  const end = getCrossDayClockPosition(interval.end, key);
                  return <rect key={intervalIndex} data-cross-day-interval="" x={18 + (start - boundary) / 1440 * 158} y={y}
                    width={Math.max(0.4, (end - start) / 1440 * 158)} height="2" rx="0.5" fill={palette.accent} opacity="0.8"><title>{key} · {crossDayDetails(night)}</title></rect>;
                })}
              </g>;
            })}
          </svg>
        </div>;
      })}
    </div>;
  }
  return <div data-cross-day-timeline="daily">
    <div className="mb-2 flex items-center gap-2 border-b border-[#e0d6ca] pb-2"><span className="w-9 shrink-0" />
      <div className="flex min-w-0 flex-1 justify-between font-mono text-[9px] text-[#a08f7d]">{[0, 360, 720, 1080, 1440].map(offset => <span key={offset}>{formatCrossDayClock(boundary + offset)}</span>)}</div>
      <span className="w-14 shrink-0 text-right text-[9px] text-[#a08f7d]">时长</span>
    </div>
    <div className="max-h-[440px] overflow-y-auto overscroll-contain pr-1">{[...keys].reverse().map(key => {
      const night = stats.get(key);
      return <div key={key} aria-label={`${key} ${crossDayDetails(night) || '无记录'}`} title={`${key} · ${crossDayDetails(night) || '无记录'}`}
        className="flex w-full items-center gap-2 border-b border-[#e0d6ca]/50 py-1.5">
        <span className="w-9 shrink-0 font-mono text-[10px] tabular-nums text-[#8f7f70]">{shortDate(key)}</span>
        <span className="relative h-6 min-w-0 flex-1">{[0, 25, 50, 75, 100].map(left => <span key={left} className="absolute inset-y-0 border-l border-dashed border-[#e0d6ca]" style={{ left: `${left}%` }} />)}
          {night?.intervals.map((interval, index) => {
            const start = getCrossDayClockPosition(interval.start, key);
            const end = getCrossDayClockPosition(interval.end, key);
            return <span key={index} data-cross-day-interval="" className="absolute top-1.5 h-3 rounded-sm" style={{ left: `${(start - boundary) / 1440 * 100}%`, width: `${Math.max(0.3, (end - start) / 1440 * 100)}%`, backgroundColor: palette.accent, opacity: 0.75 }} />;
          })}
          {!night && <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[#b3a597]">—</span>}
        </span><span className="w-14 shrink-0 text-right font-mono text-[9px] tabular-nums text-[#8f7f70]">{night ? formatCrossDayDuration(night.duration) : '—'}</span>
      </div>;
    })}</div>
  </div>;
};
