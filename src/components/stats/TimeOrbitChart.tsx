/**
 * @file TimeOrbitChart.tsx
 * @input Duration logs, a calendar range, and an activity chart palette.
 * @output A semantic three-track 24-hour star orbit and shared hourly aggregation helpers.
 * @pos Component (Activity Statistics)
 * @description Maps hourly duration to time position, activity level, and arc length.
 */
import React, { useId, useMemo } from 'react';
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

const getTrackIndex = (minutes: number, maximum: number): 0 | 1 | 2 => {
  if (maximum <= 0 || minutes / maximum >= 0.66) return 0;
  if (minutes / maximum >= 0.33) return 1;
  return 2;
};

const TRACKS: Array<{ radius: number; label: string; shortLabel: string }> = [
  { radius: 106, label: '外轨 · 高活跃时段', shortLabel: '高活跃' },
  { radius: 86, label: '中轨 · 中等活跃时段', shortLabel: '中等' },
  { radius: 66, label: '内轨 · 低活跃时段', shortLabel: '低活跃' }
];

const STARS = [
  [72, 75, 1.4], [104, 52, 1], [137, 73, 0.8], [198, 58, 1.2], [232, 84, 1.6],
  [255, 139, 0.9], [61, 159, 1], [91, 216, 1.4], [124, 239, 0.8], [209, 228, 1.1],
  [245, 201, 0.8], [176, 242, 1.5], [148, 93, 0.7], [220, 119, 0.7]
] as const;

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
  const tickHours = Array.from({ length: 12 }, (_, index) => index * 2);
  const starFieldId = `orbit-stars-${range}-${useId().replace(/:/g, '')}`;

  return (
    <div className="mx-auto w-full max-w-[360px]">
      <svg viewBox="0 0 320 320" className="w-full" role="img" aria-label={`时间轨道环，${range === 'week' ? '本周' : '本月'}，外轨高活跃、中轨中等、内轨低活跃，总时长 ${formatRhythmDuration(summary.totalMinutes)}`}>
        <defs>
          <radialGradient id={starFieldId} cx="50%" cy="46%" r="65%">
            <stop offset="0%" stopColor="#344969" />
            <stop offset="68%" stopColor="#1d2b46" />
            <stop offset="100%" stopColor="#111c31" />
          </radialGradient>
        </defs>
        <circle cx={center} cy={center} r="121" fill={`url(#${starFieldId})`} opacity="0.96" />
        {STARS.map(([x, y, radius], index) => <circle key={index} cx={x} cy={y} r={radius} fill={index % 3 === 0 ? '#f6dfaa' : '#d7e7ef'} opacity={0.5 + (index % 4) * 0.12} />)}
        <path d="M226 58c-9 5-13 17-8 27 5 10 17 14 27 9-9 1-17-4-21-12-4-8-3-17 2-24Z" fill="#f4e8c8" opacity="0.9" />
        {TRACKS.map((track) => <circle key={track.radius} cx={center} cy={center} r={track.radius} fill="none" stroke="#9bb0c5" strokeWidth="1" strokeDasharray="1.5 4" opacity="0.7" />)}
        {tickHours.map((hour) => {
          const angle = startAtTop + (hour / 24) * Math.PI * 2;
          const inner = polarPoint(center, 61, angle);
          const outer = polarPoint(center, 111, angle);
          return <line key={`tick-${hour}`} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#b8c9d7" strokeWidth="0.7" opacity="0.35" />;
        })}
        {tickHours.map((hour) => {
          const angle = startAtTop + (hour / 24) * Math.PI * 2;
          const labelPoint = polarPoint(center, 128, angle);
          return <text key={hour} x={labelPoint.x} y={labelPoint.y + 3} textAnchor="middle" fill="#d7e4ec" fontSize="8.5" fontFamily="var(--font-family)" fontVariant="tabular-nums">{String(hour).padStart(2, '0')}</text>;
        })}
        {summary.buckets.map((bucket) => {
          if (bucket.minutes <= 0 || maximum <= 0) return null;
          const track = TRACKS[getTrackIndex(bucket.minutes, maximum)];
          const startAngle = startAtTop + (bucket.hour / 24) * Math.PI * 2;
          const endAngle = startAngle + Math.max(0.02, Math.min(bucket.minutes / 60, 1) * Math.PI * 2 / 24);
          const intensity = 0.56 + (bucket.minutes / maximum) * 0.4;
          return <path key={bucket.hour} d={describeArc(center, track.radius, startAngle, endAngle)} fill="none" stroke={palette.accent} strokeWidth="5.5" strokeLinecap="round" opacity={intensity}><title>{`${String(bucket.hour).padStart(2, '0')}:00 · ${formatRhythmDuration(bucket.minutes)} · ${track.shortLabel}`}</title></path>;
        })}
        <circle cx={center} cy={center} r="43" fill="#16243c" stroke="#adc0cf" strokeWidth="1" opacity="0.96" />
        <text x={center} y={center - 17} textAnchor="middle" fill="#c3d4df" fontSize="9" fontFamily="var(--font-family)">累计时长</text>
        <text x={center} y={center + 2} textAnchor="middle" fill="#f7ead0" fontSize="17" fontFamily="var(--font-family)">{hasData ? formatRhythmDuration(summary.totalMinutes) : '暂无记录'}</text>
        {hasData && <text x={center} y={center + 19} textAnchor="middle" fill="#a8bdca" fontSize="8.5" fontFamily="var(--font-family)">{summary.activeDays} 天</text>}
      </svg>
      <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-[#8f8174]">
        {TRACKS.map((track, index) => <span key={track.radius} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette.accent, opacity: 0.58 + index * 0.12 }} />{track.label}</span>)}
      </div>
    </div>
  );
};

export default TimeOrbitChart;
