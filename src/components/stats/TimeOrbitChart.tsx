/**
 * @file TimeOrbitChart.tsx
 * @input Duration logs, a calendar range, and an activity chart palette.
 * @output A three-level 24-hour activity orbit and shared hourly aggregation helpers.
 * @pos Component (Activity Statistics)
 * @description Maps hourly duration to time position, activity level, and arc length.
 */
import React, { useMemo } from 'react';
import type { Log } from '../../types';
import { getLogDurationSeconds } from '../../utils/scopeStatsUtils';
import type { ChartPalette } from '../../utils/chartPalette';

export type RhythmRange = 'week' | 'month';

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
  if (range === 'month') {
    start.setDate(1);
  } else {
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);
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
    const recordedSeconds = getLogDurationSeconds(log);
    const durationScale = elapsedSeconds > 0 ? recordedSeconds / elapsedSeconds : 1;
    let cursor = overlapStart;
    while (cursor < overlapEnd) {
      const cursorDate = new Date(cursor);
      const nextHour = new Date(cursorDate);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);
      const segmentEnd = Math.min(nextHour.getTime(), overlapEnd);
      const hour = cursorDate.getHours();
      minutesByHour[hour] += ((segmentEnd - cursor) / MINUTE_MS) * durationScale;
      activeDays.add(getLocalDateKey(cursor));
      cursor = segmentEnd;
    }
  });

  const buckets = minutesByHour.map((minutes, hour) => ({ hour, minutes }));
  return {
    buckets,
    totalMinutes: minutesByHour.reduce((sum, minutes) => sum + minutes, 0),
    activeDays: activeDays.size
  };
};

export const formatRhythmDuration = (minutes: number): string => {
  const roundedMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(roundedMinutes / 60);
  const remainder = roundedMinutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
};

const polarPoint = (center: number, radius: number, angle: number) => ({
  x: center + radius * Math.cos(angle),
  y: center + radius * Math.sin(angle)
});

const describeArc = (center: number, radius: number, startAngle: number, endAngle: number): string => {
  const safeEnd = endAngle - startAngle >= Math.PI * 2 - 0.001 ? endAngle - 0.001 : endAngle;
  const start = polarPoint(center, radius, startAngle);
  const end = polarPoint(center, radius, safeEnd);
  const largeArcFlag = safeEnd - startAngle > Math.PI ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
};

const getLevel = (minutes: number, maximum: number): 0 | 1 | 2 | 3 => {
  if (minutes <= 0 || maximum <= 0) return 0;
  const ratio = minutes / maximum;
  if (ratio >= 0.66) return 3;
  if (ratio >= 0.33) return 2;
  return 1;
};

const LEVELS: Array<{ radius: number; label: string }> = [
  { radius: 62, label: '低活跃' },
  { radius: 84, label: '中等活跃' },
  { radius: 106, label: '高活跃' }
];

export interface TimeOrbitChartProps {
  logs: Array<Pick<Log, 'duration' | 'startTime' | 'endTime'>>;
  range: RhythmRange;
  palette: ChartPalette;
}

export const TimeOrbitChart: React.FC<TimeOrbitChartProps> = ({ logs, range, palette }) => {
  const summary = useMemo(() => aggregateHourBuckets(logs, range), [logs, range]);
  const maximum = Math.max(...summary.buckets.map((bucket) => bucket.minutes), 0);
  const hasData = summary.totalMinutes > 0;
  const center = 160;
  const startAtTop = -Math.PI / 2;
  const tickHours = [0, 6, 12, 18];

  return (
    <div className="mx-auto w-full max-w-[360px]">
      <svg viewBox="0 0 320 320" className="w-full" role="img" aria-label={`时间轨道环，${range === 'week' ? '本周' : '本月'}，总时长 ${formatRhythmDuration(summary.totalMinutes)}`}>
        <circle cx={center} cy={center} r={116} fill={palette.background} opacity="0.42" />
        {LEVELS.map((level) => <circle key={level.radius} cx={center} cy={center} r={level.radius} fill="none" stroke={palette.grid} strokeWidth="1" strokeDasharray="2 5" />)}
        {tickHours.map((hour) => {
          const angle = startAtTop + (hour / 24) * Math.PI * 2;
          const labelPoint = polarPoint(center, 132, angle);
          return <text key={hour} x={labelPoint.x} y={labelPoint.y + 3} textAnchor="middle" fill="#8f8174" fontSize="10" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">{hour}</text>;
        })}
        {summary.buckets.map((bucket) => {
          const level = getLevel(bucket.minutes, maximum);
          if (level === 0) return null;
          const startAngle = startAtTop + (bucket.hour / 24) * Math.PI * 2;
          const endAngle = startAngle + Math.max(0.05, Math.min(bucket.minutes / 60, 1) * Math.PI * 2 / 24);
          const radius = LEVELS[level - 1].radius;
          return <path key={bucket.hour} d={describeArc(center, radius, startAngle, endAngle)} fill="none" stroke={palette.accent} strokeWidth="12" strokeLinecap="round" opacity={0.46 + level * 0.16}><title>{`${String(bucket.hour).padStart(2, '0')}:00 · ${formatRhythmDuration(bucket.minutes)} · ${LEVELS[level - 1].label}`}</title></path>;
        })}
        <circle cx={center} cy={center} r="43" fill={palette.background} stroke={palette.grid} strokeWidth="1" />
        <text x={center} y={center - 4} textAnchor="middle" fill="#5d5147" fontSize="10">累计时长</text>
        <text x={center} y={center + 15} textAnchor="middle" fill="#4b3d32" fontSize="17" fontFamily="ui-serif, Georgia, serif">{hasData ? formatRhythmDuration(summary.totalMinutes) : '暂无记录'}</text>
        {hasData && <text x={center} y={center + 31} textAnchor="middle" fill="#9a8b7e" fontSize="9">{summary.activeDays} 天</text>}
      </svg>
      <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-[#8f8174]">
        {LEVELS.map((level, index) => <span key={level.label} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette.accent, opacity: 0.46 + (index + 1) * 0.16 }} />{level.label}</span>)}
      </div>
    </div>
  );
};

export default TimeOrbitChart;
