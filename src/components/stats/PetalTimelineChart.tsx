/**
 * @file PetalTimelineChart.tsx
 * @updated 2026-10-06: Supports all-time rhythm and shares hourly allocation with weekday heatmaps.
 * @input Duration logs, a calendar range, and an activity chart palette.
 * @output A radial rhythm chart rendered as petals or hourly histogram sectors.
 * @pos Component (Activity Statistics)
 * @description Owns the shared hourly duration aggregation used by both timeline styles.
 * @updated 2026-09-25: Adds a 24-hour radial histogram style while keeping petals as the default.
 */
import React, { useMemo } from 'react';
import type { ActivityTimelineStyle, Log } from '../../types';
import type { ChartPalette } from '../../utils/chartPalette';
import { forEachHourlyDurationSegment, getHourlyDurationRange } from '../../utils/hourlyDurationUtils';

export type RhythmRange = 'week' | 'month' | 'year' | 'all';

export interface HourBucket {
  hour: number;
  minutes: number;
}

export interface HourBucketSummary {
  buckets: HourBucket[];
  totalMinutes: number;
  activeDays: number;
}

const getLocalDateKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const getRhythmRangeBounds = getHourlyDurationRange;

export const aggregateHourBuckets = (
  logs: Array<Pick<Log, 'duration' | 'startTime' | 'endTime'>>,
  range: RhythmRange,
  now = new Date()
): HourBucketSummary => {
  const minutesByHour = Array.from({ length: 24 }, () => 0);
  const activeDays = new Set<string>();
  forEachHourlyDurationSegment(logs, getRhythmRangeBounds(range, now), (timestamp, seconds) => {
    minutesByHour[new Date(timestamp).getHours()] += seconds / 60;
    activeDays.add(getLocalDateKey(timestamp));
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
  timelineStyle?: ActivityTimelineStyle;
}

const rangeLabel = (range: RhythmRange) => range === 'all' ? '全部' : range === 'week' ? '本周' : range === 'month' ? '本月' : '本年';

const polarPoint = (center: number, radius: number, angle: number) => ({
  x: center + radius * Math.cos(angle),
  y: center + radius * Math.sin(angle)
});

const annularSectorPath = (center: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) => {
  const outerStart = polarPoint(center, outerRadius, startAngle);
  const outerEnd = polarPoint(center, outerRadius, endAngle);
  const innerEnd = polarPoint(center, innerRadius, endAngle);
  const innerStart = polarPoint(center, innerRadius, startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`;
};

const RadialHistogram: React.FC<{ summary: HourBucketSummary; range: RhythmRange; palette: ChartPalette }> = ({ summary, range, palette }) => {
  const center = 160;
  const innerRadius = 24;
  const maxRadius = 112;
  const maximum = Math.max(...summary.buckets.map((bucket) => bucket.minutes), 0);
  const startAtTop = -Math.PI / 2;
  const step = (Math.PI * 2) / 24;
  return <div className="mx-auto w-full max-w-[360px]">
    <svg viewBox="0 0 320 320" className="w-full" role="img" aria-label={`时序图，直方样式，${rangeLabel(range)}，总时长 ${formatRhythmDuration(summary.totalMinutes)}`}>
      <circle cx={center} cy={center} r={maxRadius} fill={palette.background} opacity="0.3" />
      {summary.buckets.map((bucket) => {
        const angle = startAtTop + bucket.hour * step;
        const gap = 0.008;
        const ratio = maximum > 0 ? bucket.minutes / maximum : 0;
        const outerRadius = innerRadius + ratio * (maxRadius - innerRadius);
        const valuePath = annularSectorPath(center, innerRadius, Math.max(innerRadius + 1, outerRadius), angle + gap, angle + step - gap);
        const labelPoint = polarPoint(center, maxRadius + 10, angle + step / 2);
        return <g key={bucket.hour}>
          {bucket.minutes > 0 && <path d={valuePath} fill={palette.accent} fillOpacity={0.25 + ratio * 0.68}><title>{`${String(bucket.hour).padStart(2, '0')}:00–${String((bucket.hour + 1) % 24).padStart(2, '0')}:00 · ${formatRhythmDuration(bucket.minutes)}`}</title></path>}
          <text x={labelPoint.x} y={labelPoint.y + 3} textAnchor="middle" fill="#8f8174" fontSize="8" fontFamily="var(--font-family)" fontVariant="tabular-nums">{bucket.hour}</text>
        </g>;
      })}
      <circle cx={center} cy={center} r="20" fill={palette.background} stroke={palette.grid} strokeWidth="1" />
    </svg>
  </div>;
};

export const PetalTimelineChart: React.FC<PetalTimelineChartProps> = ({ logs, range, palette, timelineStyle = 'petal' }) => {
  const summary = useMemo(() => aggregateHourBuckets(logs, range), [logs, range]);
  if (timelineStyle === 'histogram') return <RadialHistogram summary={summary} range={range} palette={palette} />;
  const maximum = Math.max(...Array.from({ length: 12 }, (_, index) => (summary.buckets[index * 2]?.minutes || 0) + (summary.buckets[index * 2 + 1]?.minutes || 0)), 0);
  const center = 160;
  const startAtTop = -Math.PI / 2;
  const hasData = summary.totalMinutes > 0;
  const petalPath = `M ${center} ${center - 4} C ${center - 26} ${center - 11}, ${center - 34} ${center - 39}, ${center - 33} ${center - 64} C ${center - 32} ${center - 87}, ${center - 15} ${center - 109}, ${center - 3} ${center - 115} C ${center - 1} ${center - 116}, ${center + 1} ${center - 116}, ${center + 3} ${center - 115} C ${center + 15} ${center - 109}, ${center + 32} ${center - 87}, ${center + 33} ${center - 64} C ${center + 34} ${center - 39}, ${center + 26} ${center - 11}, ${center} ${center - 4} Z`;

  return (
    <div className="mx-auto w-full max-w-[360px]">
      <svg viewBox="0 0 320 320" className="w-full" role="img" aria-label={`时序图，花瓣样式，${rangeLabel(range)}，总时长 ${formatRhythmDuration(summary.totalMinutes)}`}>
        <circle cx={center} cy={center} r="116" fill={palette.background} opacity="0.36" />
        {Array.from({ length: 12 }, (_, index) => index * 2).map((hour) => {
          const point = {
            x: center + 123 * Math.cos(startAtTop + (hour / 24) * Math.PI * 2),
            y: center + 123 * Math.sin(startAtTop + (hour / 24) * Math.PI * 2)
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
