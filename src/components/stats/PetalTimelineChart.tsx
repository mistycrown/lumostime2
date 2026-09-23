/**
 * @file PetalTimelineChart.tsx
 * @input Duration logs, a calendar range, and an activity chart palette.
 * @output A complete, equal-sized 12-petal radial rhythm chart with value encoded by tone.
 * @pos Component (Activity Statistics)
 * @description Owns the shared hourly duration aggregation used by the petal rhythm chart.
 */
import React, { useMemo } from 'react';
import type { Log } from '../../types';
import type { ChartPalette } from '../../utils/chartPalette';
import { getLogDurationSeconds } from '../../utils/scopeStatsUtils';

export type RhythmRange = 'week' | 'month' | 'year';

export interface HourBucket {
  hour: number;
  minutes: number;
}

export interface HourBucketSummary {
  buckets: HourBucket[];
  totalMinutes: number;
  activeDays: number;
}

const MINUTE_MS = 60 * 1000;

const getLocalDateKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const getRhythmRangeBounds = (range: RhythmRange, now = new Date()) => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === 'year') {
    start.setMonth(0, 1);
  } else if (range === 'month') {
    start.setDate(1);
  } else {
    const day = start.getDay();
    start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  }
  return { start: start.getTime(), end: now.getTime() };
};

export const aggregateHourBuckets = (
  logs: Array<Pick<Log, 'duration' | 'startTime' | 'endTime'>>,
  range: RhythmRange,
  now = new Date()
): HourBucketSummary => {
  const { start: rangeStart, end: rangeEnd } = getRhythmRangeBounds(range, now);
  const minutesByHour = Array.from({ length: 24 }, () => 0);
  const activeDays = new Set<string>();
  logs.forEach((log) => {
    const logStart = Math.min(log.startTime, log.endTime);
    const logEnd = Math.max(log.startTime, log.endTime);
    const overlapStart = Math.max(logStart, rangeStart);
    const overlapEnd = Math.min(logEnd, rangeEnd);
    if (overlapEnd <= overlapStart) return;
    const elapsedSeconds = Math.max(0, (logEnd - logStart) / 1000);
    const durationScale = elapsedSeconds > 0 ? getLogDurationSeconds(log) / elapsedSeconds : 1;
    let cursor = overlapStart;
    while (cursor < overlapEnd) {
      const cursorDate = new Date(cursor);
      const nextHour = new Date(cursorDate);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);
      const segmentEnd = Math.min(nextHour.getTime(), overlapEnd);
      minutesByHour[cursorDate.getHours()] += ((segmentEnd - cursor) / MINUTE_MS) * durationScale;
      activeDays.add(getLocalDateKey(cursor));
      cursor = segmentEnd;
    }
  });
  const buckets = minutesByHour.map((minutes, hour) => ({ hour, minutes }));
  return { buckets, totalMinutes: minutesByHour.reduce((sum, minutes) => sum + minutes, 0), activeDays: activeDays.size };
};

export const formatRhythmDuration = (minutes: number): string => {
  const roundedMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(roundedMinutes / 60);
  const remainder = roundedMinutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
};

export interface PetalTimelineChartProps {
  logs: Array<Pick<Log, 'duration' | 'startTime' | 'endTime'>>;
  range: RhythmRange;
  palette: ChartPalette;
}

export const PetalTimelineChart: React.FC<PetalTimelineChartProps> = ({ logs, range, palette }) => {
  const summary = useMemo(() => aggregateHourBuckets(logs, range), [logs, range]);
  const maximum = Math.max(...Array.from({ length: 12 }, (_, index) => (summary.buckets[index * 2]?.minutes || 0) + (summary.buckets[index * 2 + 1]?.minutes || 0)), 0);
  const center = 160;
  const startAtTop = -Math.PI / 2;
  const hasData = summary.totalMinutes > 0;
  const petalPath = `M ${center} ${center - 4} C ${center - 22} ${center - 10}, ${center - 29} ${center - 34}, ${center - 28} ${center - 55} C ${center - 27} ${center - 75}, ${center - 13} ${center - 94}, ${center - 3} ${center - 99} C ${center - 1} ${center - 100}, ${center + 1} ${center - 100}, ${center + 3} ${center - 99} C ${center + 13} ${center - 94}, ${center + 27} ${center - 75}, ${center + 28} ${center - 55} C ${center + 29} ${center - 34}, ${center + 22} ${center - 10}, ${center} ${center - 4} Z`;

  return (
    <div className="mx-auto w-full max-w-[360px]">
      <svg viewBox="0 0 320 320" className="w-full" role="img" aria-label={`花瓣时序图，${range === 'week' ? '本周' : range === 'month' ? '本月' : '本年'}，总时长 ${formatRhythmDuration(summary.totalMinutes)}`}>
        <circle cx={center} cy={center} r="116" fill={palette.background} opacity="0.36" />
        {Array.from({ length: 12 }, (_, index) => index * 2).map((hour) => {
          const point = {
            x: center + 132 * Math.cos(startAtTop + (hour / 24) * Math.PI * 2),
            y: center + 132 * Math.sin(startAtTop + (hour / 24) * Math.PI * 2)
          };
          return <text key={hour} x={point.x} y={point.y + 3} textAnchor="middle" fill="#8f8174" fontSize="9" fontFamily="var(--font-family)" fontVariant="tabular-nums">{String(hour).padStart(2, '0')}</text>;
        })}
        {Array.from({ length: 12 }, (_, petalIndex) => {
          const firstBucket = summary.buckets[petalIndex * 2];
          const secondBucket = summary.buckets[petalIndex * 2 + 1];
          const minutes = (firstBucket?.minutes || 0) + (secondBucket?.minutes || 0);
          const ratio = maximum > 0 ? minutes / maximum : 0;
          const angle = startAtTop + (petalIndex / 12) * Math.PI * 2;
          const tone = 0.1 + ratio * 0.76;
          return <path key={petalIndex} d={petalPath} transform={`rotate(${(angle * 180) / Math.PI + 90} ${center} ${center})`} fill={palette.accent} fillOpacity={tone} stroke={palette.background} strokeWidth="1.1"><title>{`${String(petalIndex * 2).padStart(2, '0')}:00–${String(petalIndex * 2 + 2).padStart(2, '0')}:00 · ${formatRhythmDuration(minutes)}`}</title></path>;
        })}
        <circle cx={center} cy={center} r="43" fill={palette.background} stroke={palette.grid} strokeWidth="1" />
        <text x={center} y={center - 17} textAnchor="middle" fill="#5d5147" fontSize="9" fontFamily="var(--font-family)">累计时长</text>
        <text x={center} y={center + 2} textAnchor="middle" fill="#4b3d32" fontSize="17" fontFamily="var(--font-family)">{hasData ? formatRhythmDuration(summary.totalMinutes) : '暂无记录'}</text>
        {hasData && <text x={center} y={center + 19} textAnchor="middle" fill="#9a8b7e" fontSize="8.5" fontFamily="var(--font-family)">{summary.activeDays} 天</text>}
      </svg>
    </div>
  );
};

export default PetalTimelineChart;
