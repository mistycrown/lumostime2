/**
 * @file PetalTimelineChart.tsx
 * @input Duration logs, a calendar range, and an activity chart palette.
 * @output A complete, equal-sized 24-petal radial rhythm chart with value encoded by tone.
 * @pos Component (Activity Statistics)
 * @description Uses the shared hourly duration buckets from the time orbit chart.
 */
import React, { useMemo } from 'react';
import type { Log } from '../../types';
import type { ChartPalette } from '../../utils/chartPalette';
import { aggregateHourBuckets, formatRhythmDuration, type RhythmRange } from './TimeOrbitChart';

export interface PetalTimelineChartProps {
  logs: Array<Pick<Log, 'duration' | 'startTime' | 'endTime'>>;
  range: RhythmRange;
  palette: ChartPalette;
}

export const PetalTimelineChart: React.FC<PetalTimelineChartProps> = ({ logs, range, palette }) => {
  const summary = useMemo(() => aggregateHourBuckets(logs, range), [logs, range]);
  const maximum = Math.max(...summary.buckets.map((bucket) => bucket.minutes), 0);
  const center = 160;
  const startAtTop = -Math.PI / 2;
  const hasData = summary.totalMinutes > 0;
  const petalPath = `M ${center} ${center - 3} C ${center - 17} ${center - 17}, ${center - 18} ${center - 60}, ${center} ${center - 111} C ${center + 18} ${center - 60}, ${center + 17} ${center - 17}, ${center} ${center - 3} Z`;

  return (
    <div className="mx-auto w-full max-w-[360px]">
      <svg viewBox="0 0 320 320" className="w-full" role="img" aria-label={`花瓣时序图，${range === 'week' ? '本周' : '本月'}，总时长 ${formatRhythmDuration(summary.totalMinutes)}`}>
        <circle cx={center} cy={center} r="116" fill={palette.background} opacity="0.36" />
        {Array.from({ length: 12 }, (_, index) => index * 2).map((hour) => {
          const point = {
            x: center + 132 * Math.cos(startAtTop + (hour / 24) * Math.PI * 2),
            y: center + 132 * Math.sin(startAtTop + (hour / 24) * Math.PI * 2)
          };
          return <text key={hour} x={point.x} y={point.y + 3} textAnchor="middle" fill="#8f8174" fontSize="9" fontFamily="var(--font-family)" fontVariant="tabular-nums">{String(hour).padStart(2, '0')}</text>;
        })}
        {summary.buckets.map((bucket) => {
          const ratio = maximum > 0 ? bucket.minutes / maximum : 0;
          const angle = startAtTop + (bucket.hour / 24) * Math.PI * 2;
          const tone = 0.1 + ratio * 0.76;
          return <path key={bucket.hour} d={petalPath} transform={`rotate(${(angle * 180) / Math.PI + 90} ${center} ${center})`} fill={palette.accent} fillOpacity={tone} stroke={palette.background} strokeWidth="1.1"><title>{`${String(bucket.hour).padStart(2, '0')}:00 · ${formatRhythmDuration(bucket.minutes)}`}</title></path>;
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
