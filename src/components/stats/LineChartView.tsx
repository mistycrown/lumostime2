/**
 * @file LineChartView.tsx
 * @input filteredLogs, logs, categories, todos, scopes, rangeStart, rangeEnd, excludedCategoryIds
 * @output UI (Line Charts), Events (toggleExclusion)
 * @pos Component (Statistics - Line Chart)
 * @description 折线图统计视图 - 显示时间趋势
 * 
 * 包含三个独立的折线图：
 * 1. Tags (活动趋势)
 * 2. Todos (待办趋势)
 * 3. Scopes (领域趋势)
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import React, { useMemo } from 'react';
import { Log, Category, TodoItem, Scope } from '../../types';
import { IconRenderer } from '../IconRenderer';
import {
  generateDateRange,
  getDateLabel,
  getMaxValue,
  getStrokeColor,
  prepareActivitySeries,
  prepareTodoSeries,
  prepareScopeSeries,
  SeriesMeta
} from '../../utils/lineChartUtils';

export interface LineChartViewProps {
  filteredLogs: Log[];
  logs: Log[];
  categories: Category[];
  todos: TodoItem[];
  scopes: Scope[];
  rangeStart: Date;
  rangeEnd: Date;
  excludedCategoryIds: string[];
  onToggleExclusion: (id: string) => void;
}

export const LineChartView: React.FC<LineChartViewProps> = ({
  filteredLogs,
  logs,
  categories,
  todos,
  scopes,
  rangeStart,
  rangeEnd,
  excludedCategoryIds,
  onToggleExclusion
}) => {
  // 生成日期范围
  const daysOfRange = useMemo(() => 
    generateDateRange(rangeStart, rangeEnd), 
    [rangeStart, rangeEnd]
  );

  const isMonthView = daysOfRange.length > 10;

  // 准备活动数据
  const { series: activitySeries, meta: topActivities } = useMemo(() =>
    prepareActivitySeries(filteredLogs, categories, daysOfRange),
    [filteredLogs, categories, daysOfRange]
  );

  // 准备待办数据
  const { series: todoSeries, meta: topTodos } = useMemo(() =>
    prepareTodoSeries(logs, todos, rangeStart, rangeEnd, daysOfRange),
    [logs, todos, rangeStart, rangeEnd, daysOfRange]
  );

  // 准备领域数据
  const { series: scopeSeries, meta: topScopes } = useMemo(() =>
    prepareScopeSeries(logs, scopes, rangeStart, rangeEnd, daysOfRange),
    [logs, scopes, rangeStart, rangeEnd, daysOfRange]
  );

  // 图表渲染函数
  const renderChart = (
    title: string,
    seriesData: number[][],
    seriesMeta: SeriesMeta[]
  ) => {
    if (seriesData.length === 0 || seriesData.every(s => s.every(v => v === 0))) {
      return null;
    }

    const height = 220;
    const width = 600;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxY = getMaxValue(seriesData);
    const yTicks = 5;

    const getX = (index: number) => 
      padding.left + (index / (daysOfRange.length - 1)) * chartWidth;
    const getY = (value: number) => 
      height - padding.bottom - (value / maxY) * chartHeight;

    return (
      <div className="mb-4">
        <h3 className="text-lg font-bold text-stone-900 mb-4 px-2 text-center">
          <span>{title}</span>
        </h3>

        <div className="relative w-full aspect-[16/9] sm:aspect-[2/1]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full text-xs">
            {/* Y-Axis Labels */}
            {Array.from({ length: yTicks + 1 }).map((_, i) => {
              const val = (maxY / yTicks) * i;
              const y = getY(val);
              return (
                <text
                  key={i}
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#d6d3d1"
                  fontSize="10"
                >
                  {val.toFixed(1)}h
                </text>
              );
            })}

            {/* X-Axis Labels */}
            {daysOfRange.map((d, i) => (
              <text
                key={i}
                x={getX(i)}
                y={height - 15}
                textAnchor="middle"
                fill="#a8a29e"
                fontSize="11"
                fontWeight="500"
              >
                {getDateLabel(d, isMonthView)}
              </text>
            ))}

            {/* Lines and Points */}
            {seriesData.map((points, sIdx) => {
              if (points.length < 2) return null;
              
              const pathD = points
                .map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`)
                .join(' ');
              const color = getStrokeColor(seriesMeta[sIdx].color);

              return (
                <g key={sIdx}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {points.map((val, i) => (
                    <circle
                      key={i}
                      cx={getX(i)}
                      cy={getY(val)}
                      r="3"
                      fill="white"
                      stroke={color}
                      strokeWidth="2"
                    />
                  ))}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 px-4 justify-center">
          {seriesMeta.map((meta, i) => {
            const color = getStrokeColor(meta.color);
            return (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-medium text-stone-600">
                  {meta.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const tagsChart = renderChart('TAGS', activitySeries, topActivities);
  const todoChart = renderChart('TODOS', todoSeries, topTodos);
  const scopeChart = renderChart('SCOPES', scopeSeries, topScopes);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 pb-20 relative">
      <div className="flex flex-col">
        {/* Activity Trends */}
        {tagsChart}

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-2 pt-2 -mt-2 mb-2 px-2">
          {categories.map(cat => {
            const isExcluded = excludedCategoryIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => onToggleExclusion(cat.id)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all border shadow-sm ${
                  isExcluded
                    ? 'bg-stone-50 border-stone-200 text-stone-400 opacity-60 grayscale'
                    : 'bg-white border-stone-200 text-stone-600'
                }`}
              >
                <IconRenderer icon={cat.icon} uiIcon={cat.uiIcon} size={14} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* TODO Trends */}
        {todoChart && (
          <div className="w-full flex flex-col items-center pt-2 border-t border-stone-100 mt-6 mb-6" />
        )}
        {todoChart}

        {/* Scope Trends */}
        {scopeChart && (
          <div className="w-full flex flex-col items-center pt-2 border-t border-stone-100 mt-6 mb-6" />
        )}
        {scopeChart}
      </div>
    </div>
  );
};
