/**
 * @file InteractiveTrendChart.tsx
 * @input Daily values, chart title, palette accent and value formatter.
 * @output Clickable trend with a persistent date/value readout and keyboard navigation.
 * @pos Component (Custom Detail Statistics)
 * @updated 2026-10-23: Adds touch-friendly date selection without obscuring the plot.
 */
import React, { useId, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface InteractiveTrendChartProps {
  title: string;
  points: Array<{ key: string; value: number }>;
  accent: string;
  formatValue: (value: number) => string;
  area?: boolean;
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

export const InteractiveTrendChart: React.FC<InteractiveTrendChartProps> = ({ title, points, accent, formatValue, area = true }) => {
  const gradientId = `trend-area-${useId().replace(/:/g, '')}`;
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  if (points.length === 0) return null;

  // Keep a selected date across live data updates; fall back when the range changes.
  const matchingIndex = points.findIndex(point => point.key === selectedKey);
  const selectedIndex = matchingIndex < 0 ? points.length - 1 : matchingIndex;
  const selected = points[selectedIndex];
  const minimum = Math.min(0, ...points.map(point => point.value));
  const maximum = Math.max(0, ...points.map(point => point.value));
  const span = maximum - minimum || 1;
  const getX = (index: number) => points.length === 1 ? WIDTH / 2 : LEFT + index / (points.length - 1) * (RIGHT - LEFT);
  const getY = (value: number) => BOTTOM - (value - minimum) / span * 76;
  const linePoints = points.map((point, index) => `${getX(index)},${getY(point.value)}`).join(' ');
  const selectIndex = (index: number) => setSelectedKey(points[Math.max(0, Math.min(points.length - 1, index))].key);
  const valueLabel = formatValue(selected.value);
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
    selectIndex(Math.round((local.x - LEFT) / (RIGHT - LEFT) * (points.length - 1)));
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
        className="aspect-[40/13] w-full cursor-crosshair rounded-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-stone-400"
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
        <line x1={LEFT} y1={getY(0)} x2={RIGHT} y2={getY(0)} stroke="#e7e5e4" strokeWidth="1" />
        {area && points.length > 1 && <polygon points={`${linePoints} ${getX(points.length - 1)},${getY(0)} ${getX(0)},${getY(0)}`} fill={`url(#${gradientId})`} />}
        {points.length > 1 && <polyline points={linePoints} fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        <line x1={getX(selectedIndex)} y1="8" x2={getX(selectedIndex)} y2={BOTTOM} stroke={accent} strokeOpacity="0.4" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        {points.length <= 31 && points.map((point, index) => <circle key={point.key} cx={getX(index)} cy={getY(point.value)} r="2.5" fill={accent} fillOpacity="0.6" />)}
        <circle cx={getX(selectedIndex)} cy={getY(selected.value)} r="7" fill={accent} fillOpacity="0.14" />
        <circle cx={getX(selectedIndex)} cy={getY(selected.value)} r="3.5" fill={accent} stroke="white" strokeWidth="1.5" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-stone-400" aria-hidden="true">
        <span>{shortDate(points[0].key)}</span><span>{shortDate(points[points.length - 1].key)}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-stone-200 pt-3">
        <div className="min-w-0" role="status" aria-live="polite" aria-atomic="true">
          <div className="text-[11px] text-stone-500">{dateLabel}</div>
          <div className="mt-1 break-words font-mono text-lg font-medium tabular-nums" style={{ color: accent }}>{valueLabel}</div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" aria-label="上一个日期" disabled={selectedIndex === 0} onClick={() => selectIndex(selectedIndex - 1)} className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 disabled:opacity-25"><ChevronLeft size={18} /></button>
          <button type="button" aria-label="下一个日期" disabled={selectedIndex === points.length - 1} onClick={() => selectIndex(selectedIndex + 1)} className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 disabled:opacity-25"><ChevronRight size={18} /></button>
        </div>
      </div>
    </div>
  );
};
