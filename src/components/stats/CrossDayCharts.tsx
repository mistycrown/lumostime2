/**
 * @file CrossDayCharts.tsx
 * @updated 2026-10-25: Uses five contrasting heat levels and a matching legend without dimming date markers.
 * @updated 2026-10-25: Shares explicitly bounded numeric labels with tag/category calendars instead of CSS font sizing.
 * @updated 2026-10-25: Applies period color sequences, adapts daily value text and zooms to occupied clock bounds.
 * @input Display dates, overnight intervals, metric scale and shared palette.
 * @output Non-interactive compact calendars and monthly interval small multiples.
 * @pos Component (Cross-day Statistics)
 * @updated 2026-10-25: Matches duration calendars and keeps long interval ranges compact without date selection.
 */
import React from 'react';
import type { CrossDayMetric } from '../../types';
import type { ChartPalette } from '../../utils/chartPalette';
import { CROSS_DAY_METRIC_LABELS, formatCrossDayClock, formatCrossDayDuration, getCrossDayClockPosition, getCrossDayTimelineAxis, getCrossDayValue, type CrossDayStat } from '../../utils/crossDayStatsUtils';
import './CrossDayCharts.css';
import { CalendarValueLabel } from './CalendarValueLabel';
import { CALENDAR_HEATMAP_LEVELS, getCalendarHeatmapColor, getCalendarHeatmapLevel } from '../../utils/calendarHeatmap';

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
    const level = value === null ? null : getCalendarHeatmapLevel(value, minimum, maximum);
    const colorIndex = weekly ? keys.indexOf(key) : months.indexOf(key.slice(0, 7));
    const color = palette.colors[colorIndex % palette.colors.length] || palette.accent;
    return <span key={key} aria-label={`${key} ${CROSS_DAY_METRIC_LABELS[metric]} ${label}`}
      title={`${key} · ${label}${night ? ` · ${crossDayDetails(night)}` : ''}`} data-calendar-date={key}
      className={`flex min-w-0 flex-col ${keySet.has(key) ? '' : 'opacity-25'}`}>
      <span className="flex aspect-square w-full items-center justify-center rounded-[2px] border border-stone-200 font-mono text-[8px]"
        data-heatmap-level={level ?? undefined}
        style={{ backgroundColor: level === null ? '#f5f5f4' : getCalendarHeatmapColor(color, level), color: level === null ? '#a8a29e' : level < 2 ? '#57534e' : '#ffffff' }}>{marker ?? null}</span>
      {showValues && <CalendarValueLabel value={value === null ? '—' : compact(value)} empty={value === null} />}
    </span>;
  };
  if (weekly) return <div className="grid grid-cols-7 gap-2" data-cross-day-calendar="weekly">{keys.map(key => {
    const [year, month, day] = key.split('-').map(Number);
    const value = stats.has(key) ? getCrossDayValue(stats.get(key)!, metric) : null;
    return <div key={key} className="min-w-0 text-center"><div className="text-[9px] text-stone-400">周{['日', '一', '二', '三', '四', '五', '六'][new Date(year, month - 1, day).getDay()]}</div>
      <div className="mb-2 mt-0.5 font-mono text-[10px] text-stone-600">{shortDate(key)}</div>{cell(key)}
      <CalendarValueLabel value={value === null ? '—' : compact(value)} empty={value === null} />
    </div>;
  })}</div>;
  const columns = singleMonth ? 'grid-cols-1' : showValues ? 'grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  return <div data-cross-day-calendar="compact">
    <div className={`grid gap-x-3 gap-y-3 ${columns}`} data-cross-day-months="" style={showValues && !singleMonth ? { gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))' } : undefined}>{months.map(month => {
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
      <span>{format(minimum)}</span>{CALENDAR_HEATMAP_LEVELS.map(level => <span key={level} className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: getCalendarHeatmapColor('#78716c', level) }} />)}<span>{format(maximum)}</span>
    </div>
  </div>;
};

export const CrossDayTimeline: React.FC<ChartProps & { boundary: number; compact: boolean }> = ({ keys, stats, palette, boundary, compact }) => {
  const axis = getCrossDayTimelineAxis(keys.flatMap(key => stats.has(key) ? [stats.get(key)!] : []), boundary);
  const fraction = (clock: number) => (clock - axis.start) / Math.max(1, axis.end - axis.start);
  if (compact) {
    const keySet = new Set(keys);
    const months = [...new Set(keys.map(key => key.slice(0, 7)))];
    return <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-4" data-cross-day-timeline="compact" data-axis-start={axis.start} data-axis-end={axis.end}>
      {months.map((month, monthIndex) => {
        const [year, monthNumber] = month.split('-').map(Number);
        const dayCount = new Date(year, monthNumber, 0).getDate();
        const color = palette.colors[monthIndex % palette.colors.length] || palette.accent;
        return <div key={month} data-cross-day-month={month}>
          <div className="mb-1 text-[10px] text-stone-500">{monthNumber} 月</div>
          <svg viewBox="0 0 180 112" className="w-full" role="img" aria-label={`${year}年${monthNumber}月跨天活动时段`}>
            {axis.ticks.map((tick, tickIndex) => {
              const x = 18 + fraction(tick) * 158;
              return <g key={tick}><line x1={x} x2={x} y1="14" y2="110" stroke={palette.grid} strokeWidth="0.5" strokeDasharray="1 2" />
                <text x={x} y="8" fontSize="6" fill="#a08f7d" textAnchor={tickIndex === 0 ? 'start' : tickIndex === axis.ticks.length - 1 ? 'end' : 'middle'}>{formatCrossDayClock(tick)}</text></g>;
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
                  return <rect key={intervalIndex} data-cross-day-interval="" x={18 + fraction(start) * 158} y={y}
                    width={Math.max(0.4, (fraction(end) - fraction(start)) * 158)} height="2" rx="0.5" fill={color} opacity="0.8"><title>{key} · {crossDayDetails(night)}</title></rect>;
                })}
              </g>;
            })}
          </svg>
        </div>;
      })}
    </div>;
  }
  return <div data-cross-day-timeline="daily" data-axis-start={axis.start} data-axis-end={axis.end}>
    <div className="mb-2 flex items-center gap-2 border-b border-[#e0d6ca] pb-2"><span className="w-9 shrink-0" />
      <div className="relative h-4 min-w-0 flex-1 font-mono text-[9px] text-[#a08f7d]">{axis.ticks.map((tick, index) => <span key={tick} className="absolute whitespace-nowrap" style={{ left: `${fraction(tick) * 100}%`, transform: `translateX(${index === 0 ? '0' : index === axis.ticks.length - 1 ? '-100%' : '-50%'})` }}>{formatCrossDayClock(tick)}</span>)}</div>
      <span className="w-14 shrink-0 text-right text-[9px] text-[#a08f7d]">时长</span>
    </div>
    <div className="cross-day-timeline-scroll max-h-[440px] overflow-y-auto overscroll-contain pr-1">{[...keys].reverse().map(key => {
      const night = stats.get(key);
      const color = palette.colors[keys.indexOf(key) % palette.colors.length] || palette.accent;
      return <div key={key} aria-label={`${key} ${crossDayDetails(night) || '无记录'}`} title={`${key} · ${crossDayDetails(night) || '无记录'}`}
        className="flex w-full items-center gap-2 border-b border-[#e0d6ca]/50 py-1.5">
        <span className="w-9 shrink-0 font-mono text-[10px] tabular-nums text-[#8f7f70]">{shortDate(key)}</span>
        <span className="relative h-6 min-w-0 flex-1">{axis.ticks.map(tick => <span key={tick} className="absolute inset-y-0 border-l border-dashed border-[#e0d6ca]" style={{ left: `${fraction(tick) * 100}%` }} />)}
          {night?.intervals.map((interval, index) => {
            const start = getCrossDayClockPosition(interval.start, key);
            const end = getCrossDayClockPosition(interval.end, key);
            return <span key={index} data-cross-day-interval="" className="absolute top-1.5 h-3 rounded-sm" style={{ left: `${fraction(start) * 100}%`, width: `${Math.max(0.3, (fraction(end) - fraction(start)) * 100)}%`, backgroundColor: color, opacity: 0.75 }} />;
          })}
          {!night && <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[#b3a597]">—</span>}
        </span><span className="w-14 shrink-0 text-right font-mono text-[9px] tabular-nums text-[#8f7f70]">{night ? formatCrossDayDuration(night.duration) : '—'}</span>
      </div>;
    })}</div>
  </div>;
};
