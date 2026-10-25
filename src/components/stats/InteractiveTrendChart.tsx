/**
 * @file InteractiveTrendChart.tsx
 * @updated 2026-10-25: Supports missing-day gaps, clock axes, average lines and selected-night details.
 * @input Daily values, chart title, palette accent and value formatter.
 * @output Clickable trend with a persistent date/value readout and keyboard navigation.
 * @pos Component (Custom Detail Statistics)
 * @updated 2026-10-23: Adds touch-friendly date selection without obscuring the plot.
 * @updated 2026-10-23: Suppresses the chart focus outline while preserving date selection and keyboard controls.
 */
import React, { useId, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface InteractiveTrendChartProps {
  title: string;
  points: Array<{ key: string; value: number | null }>;
  accent: string;
  formatValue: (value: number) => string;
  area?: boolean;
  valueDomain?: [number, number];
  referenceValue?: number;
  formatDetails?: (key: string) => string | undefined;
  initialSelectedKey?: string;
}

const WIDTH = 320;
const HEIGHT = 104;
const LEFT = 8;
const RIGHT = WIDTH - 8;
const BOTTOM = 94;

const shortDate = (key: string) => {
  const [, month, day] = key.split('-').map(Number);
  return `${month}/${day}`;
};

const fullDate = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
    .format(new Date(year, month - 1, day));
};

export const InteractiveTrendChart: React.FC<InteractiveTrendChartProps> = ({ title, points, accent, formatValue, area = true, valueDomain, referenceValue, formatDetails, initialSelectedKey }) => {
  const gradientId = `trend-area-${useId().replace(/:/g, '')}`;
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  if (points.length === 0) return null;

  // Keep a selected date across live data updates; fall back when the range changes.
  const matchingIndex = points.findIndex(point => point.key === selectedKey);
  const initialIndex = points.findIndex(point => point.key === initialSelectedKey);
  const selectedIndex = matchingIndex < 0 ? (initialIndex < 0 ? points.length - 1 : initialIndex) : matchingIndex;
  const selected = points[selectedIndex];
  const values = points.flatMap(point => point.value === null ? [] : [point.value]);
  const minimum = valueDomain?.[0] ?? Math.min(0, ...values);
  const maximum = valueDomain?.[1] ?? Math.max(0, ...values);
  const span = maximum - minimum || 1;
  const left = valueDomain ? 44 : LEFT;
  const getX = (index: number) => points.length === 1 ? (left + RIGHT) / 2 : left + index / (points.length - 1) * (RIGHT - left);
  const getY = (value: number) => BOTTOM - (value - minimum) / span * 76;
  const baseline = valueDomain ? BOTTOM : getY(0);
  const segments: Array<Array<{ x: number; y: number }>> = [];
  points.forEach((point, index) => {
    if (point.value === null) return;
    if (index === 0 || points[index - 1].value === null) segments.push([]);
    segments.at(-1)!.push({ x: getX(index), y: getY(point.value) });
  });
  const selectIndex = (index: number) => setSelectedKey(points[Math.max(0, Math.min(points.length - 1, index))].key);
  const valueLabel = selected.value === null ? '无记录' : formatValue(selected.value);
  const dateLabel = fullDate(selected.key);

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    // SVG coordinates account for responsive scaling and viewBox letterboxing.
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    selectIndex(Math.round((local.x - left) / (RIGHT - left) * (points.length - 1)));
  };

  const handleKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 };
    if (event.key in offsets) selectIndex(selectedIndex + offsets[event.key]);
    else if (event.key === 'Home') selectIndex(0);
    else if (event.key === 'End') selectIndex(points.length - 1);
    else return;
    event.preventDefault();
  };

  return (
    <div className="mt-5 py-1">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="aspect-[40/13] w-full cursor-crosshair rounded-sm"
        style={{ outline: 'none' }}
        role="slider"
        tabIndex={0}
        aria-label={`${title} 每日趋势`}
        aria-valuemin={1}
        aria-valuemax={points.length}
        aria-valuenow={selectedIndex + 1}
        aria-valuetext={`${dateLabel}，${valueLabel}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={left} y1={baseline} x2={RIGHT} y2={baseline} stroke="#e7e5e4" strokeWidth="1" />
        {valueDomain && [minimum, (minimum + maximum) / 2, maximum].map(value => <g key={value}>
          <line x1={left} x2={RIGHT} y1={getY(value)} y2={getY(value)} stroke="#e7e5e4" strokeDasharray="2 4" />
          <text x={left - 5} y={getY(value) + 3} textAnchor="end" fill="#a08f7d" fontSize="8">{formatValue(value)}</text>
        </g>)}
        {referenceValue !== undefined && <line x1={left} x2={RIGHT} y1={getY(referenceValue)} y2={getY(referenceValue)} stroke={accent} strokeOpacity="0.5" strokeDasharray="4 4"><title>平均值 {formatValue(referenceValue)}</title></line>}
        {segments.map((segment, index) => {
          const linePoints = segment.map(point => `${point.x},${point.y}`).join(' ');
          return <g key={index}>
            {area && segment.length > 1 && <polygon points={`${linePoints} ${segment.at(-1)!.x},${baseline} ${segment[0].x},${baseline}`} fill={`url(#${gradientId})`} />}
            {segment.length > 1 && <polyline points={linePoints} fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
          </g>;
        })}
        <line x1={getX(selectedIndex)} y1="8" x2={getX(selectedIndex)} y2={BOTTOM} stroke={accent} strokeOpacity="0.4" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        {(points.length <= 31 || segments.some(segment => segment.length === 1)) && points.map((point, index) => point.value !== null && <circle key={point.key} cx={getX(index)} cy={getY(point.value)} r="2.5" fill={accent} fillOpacity="0.6" />)}
        {selected.value !== null && <g>
          <circle cx={getX(selectedIndex)} cy={getY(selected.value)} r="7" fill={accent} fillOpacity="0.14" />
          <circle cx={getX(selectedIndex)} cy={getY(selected.value)} r="3.5" fill={accent} stroke="white" strokeWidth="1.5" />
        </g>}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-stone-400" aria-hidden="true">
        <span>{shortDate(points[0].key)}</span><span>{shortDate(points[points.length - 1].key)}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-stone-200 pt-3">
        <div className="min-w-0" role="status" aria-live="polite" aria-atomic="true">
          <div className="text-[11px] text-stone-500">{dateLabel}</div>
          <div className="mt-1 break-words font-mono text-lg font-medium tabular-nums" style={{ color: accent }}>{valueLabel}</div>
          {formatDetails?.(selected.key) && <div className="mt-1 text-[10px] leading-relaxed text-stone-500">{formatDetails(selected.key)}</div>}
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" aria-label="上一个日期" disabled={selectedIndex === 0} onClick={() => selectIndex(selectedIndex - 1)} className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 disabled:opacity-25"><ChevronLeft size={18} /></button>
          <button type="button" aria-label="下一个日期" disabled={selectedIndex === points.length - 1} onClick={() => selectIndex(selectedIndex + 1)} className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 disabled:opacity-25"><ChevronRight size={18} /></button>
        </div>
      </div>
    </div>
  );
};
