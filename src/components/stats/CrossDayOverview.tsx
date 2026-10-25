/**
 * @file CrossDayOverview.tsx
 * @input Overnight statistics, selected/previous dates and the activity color sequence.
 * @output Standalone three-metric overview table, without repeating KPIs inside charts.
 * @pos Component (Cross-day Statistics)
 * @updated 2026-10-25: Separates average/range/period comparisons into an independently managed card.
 */
import React from 'react';
import type { CrossDayMetric } from '../../types';
import type { ChartPalette } from '../../utils/chartPalette';
import { CROSS_DAY_METRIC_LABELS, formatCrossDayClock, formatCrossDayDuration, getCrossDayValue, type CrossDayStat } from '../../utils/crossDayStatsUtils';

interface CrossDayOverviewProps {
  keys: string[];
  previousKeys: string[];
  stats: Map<string, CrossDayStat>;
  palette: ChartPalette;
}
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

export const CrossDayOverview: React.FC<CrossDayOverviewProps> = ({ keys, previousKeys, stats, palette }) => (
  <div data-cross-day-overview="">
    <table className="w-full table-fixed border-y border-stone-200 text-left">
      <thead><tr className="border-b border-stone-200 text-[9px] font-normal text-stone-400">
        {['指标', '平均值', '最小值', '最大值', '较上期'].map(label => <th key={label} scope="col" className="px-1 py-2.5 font-normal first:w-[24%]">{label}</th>)}
      </tr></thead>
      <tbody>{(['start', 'duration', 'end'] as CrossDayMetric[]).map((metric, index) => {
        const valuesFor = (dates: string[]) => dates.flatMap(key => stats.has(key) ? [getCrossDayValue(stats.get(key)!, metric)] : []);
        const values = valuesFor(keys);
        const mean = average(values);
        const previous = average(valuesFor(previousKeys));
        const format = (value: number) => metric === 'duration' ? formatCrossDayDuration(value).replace(' ', '') : formatCrossDayClock(value);
        const difference = mean === null || previous === null ? null : mean - previous;
        const delta = difference === null ? '—' : Math.abs(difference) < (metric === 'duration' ? 60 : 1) ? '持平'
          : metric === 'duration' ? `${difference > 0 ? '+' : '−'}${format(Math.abs(difference))}`
            : `${difference > 0 ? '晚' : '早'}${Math.round(Math.abs(difference))}m`;
        return <tr key={metric} className="border-b border-stone-200/70 last:border-0" data-overview-metric={metric}>
          <th scope="row" className="px-1 py-3 text-[10px] font-normal text-stone-500">{CROSS_DAY_METRIC_LABELS[metric]}</th>
          {[mean === null ? '—' : format(mean), values.length ? format(Math.min(...values)) : '—', values.length ? format(Math.max(...values)) : '—', delta].map((value, column) => (
            <td key={column} className="whitespace-nowrap px-1 py-3 font-mono text-[10px] tabular-nums" style={{ color: palette.colors[index % palette.colors.length] || palette.accent }}>{value}</td>
          ))}
        </tr>;
      })}</tbody>
    </table>
    <div className="mt-3 flex items-center justify-between text-[10px] text-stone-400"><span>已记录天数</span><span className="font-mono tabular-nums">{keys.filter(key => stats.has(key)).length} / {keys.length}</span></div>
  </div>
);
