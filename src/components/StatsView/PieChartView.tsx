/**
 * @file PieChartView.tsx
 * @description Pie chart visualization for time distribution
 */

import React from 'react';
import { Share, TrendingUp, TrendingDown } from 'lucide-react';
import { IconRenderer } from '../IconRenderer';
import { getHexColor, formatDuration, getDurationHM } from './statsUtils';
import { StatsData } from './useStatsData';

interface PieChartViewProps {
  stats: StatsData;
  todoStats: any;
  scopeStats: any;
  previousStats: any;
  previousTodoStats: any;
  previousScopeStats: any;
  pieChartData: any[];
  todoPieChartData: any[];
  scopePieChartData: any[];
  categories: any[];
  excludedCategoryIds: string[];
  toggleExclusion: (id: string) => void;
  onExportStats: () => void;
  isFullScreen: boolean;
  pieRange: string;
}

export const PieChartView: React.FC<PieChartViewProps> = ({
  stats,
  todoStats,
  scopeStats,
  previousStats,
  previousTodoStats,
  previousScopeStats,
  pieChartData,
  todoPieChartData,
  scopePieChartData,
  categories,
  excludedCategoryIds,
  toggleExclusion,
  onExportStats,
  isFullScreen,
  pieRange
}) => {
  const { h: totalH, m: totalM } = getDurationHM(stats.totalDuration);
  const { h: totalTodoH, m: totalTodoM } = getDurationHM(todoStats.totalDuration);
  const { h: totalScopeH, m: totalScopeM } = getDurationHM(scopeStats.totalDuration);

  const renderGrowth = (current: number, previous: number) => {
    if (current < 0.1 && (!previous || previous < 0.1)) return null;
    if (!previous || previous < 0.1) return null;

    const delta = current - previous;
    const percentage = Math.round((delta / previous) * 100);
    if (percentage === 0) return null;
    const isPositive = percentage > 0;

    return (
      <div className={`flex items-center gap-0.5 text-[10px] font-medium ml-1.5 ${isPositive ? 'text-emerald-500' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        <span>{Math.abs(percentage)}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Main Chart */}
      <div className="flex flex-col items-center">
        <div className="relative w-56 h-56 mb-8 mt-2">
          <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
            <circle cx="100" cy="100" r="80" fill="none" stroke="#f5f5f4" strokeWidth="25" />
            {pieChartData.map((segment, idx) => (
              <path 
                key={segment && segment.id} 
                d={segment && segment.d} 
                fill="none" 
                stroke={segment && segment.hexColor} 
                strokeWidth="25" 
                strokeLinecap="round" 
                className="animate-in fade-in duration-700" 
                style={{ animationDelay: `${idx * 100}ms` }} 
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs font-bold text-stone-300 uppercase">Tags</span>
            <div className="flex items-baseline gap-0.5 text-stone-800">
              <span className="text-3xl font-bold font-mono">{totalH}</span>
              <span className="text-xs text-stone-400">h</span>
              <span className="text-xl font-bold font-mono">{totalM}</span>
              <span className="text-xs text-stone-400">m</span>
            </div>
          </div>
        </div>

        {/* Category Stats */}
        <div className="w-full space-y-4">
          {stats.categoryStats.map(cat => (
            <div key={cat.id} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <IconRenderer icon={cat.icon} uiIcon={cat.uiIcon} size={14} />
                  <span className="font-bold text-stone-700 text-[13px]">{cat.name}</span>
                  {renderGrowth(cat.duration, previousStats.catDurations.get(cat.id) || 0)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-stone-400">{formatDuration(cat.duration)}</span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-stone-100 rounded text-stone-500">
                    {cat.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-stone-50 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full rounded-full" 
                  style={{ width: `${cat.percentage}%`, backgroundColor: getHexColor(cat.themeColor) }} 
                />
              </div>
              <div className="pl-6 space-y-1">
                {cat.items.map(act => (
                  <div 
                    key={act.id} 
                    className="flex items-center justify-between text-[11px] text-stone-500 hover:bg-stone-50 rounded px-2 py-0.5 -ml-2 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <IconRenderer icon={act.icon} uiIcon={act.uiIcon} className="text-xs" />
                      <span>{act.name}</span>
                      {renderGrowth(act.duration, previousStats.actDurations.get(act.id) || 0)}
                    </div>
                    <span className="font-mono opacity-60">{formatDuration(act.duration)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 justify-center pt-2 pb-4">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => toggleExclusion(cat.id)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${
              excludedCategoryIds.includes(cat.id)
                ? 'bg-stone-50 text-stone-300 grayscale'
                : 'bg-white border border-stone-200 text-stone-600'
            }`}
          >
            <IconRenderer icon={cat.icon} uiIcon={cat.uiIcon} size={14} />
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Export Button */}
      {!isFullScreen && (
        <div className="flex justify-center pt-8 mt-4 mb-4">
          <button
            onClick={onExportStats}
            className="flex items-center gap-1 text-stone-400 hover:text-stone-600 transition-colors text-xs font-medium"
          >
            <Share size={12} />
            <span>导出统计文本</span>
          </button>
        </div>
      )}
    </div>
  );
};
