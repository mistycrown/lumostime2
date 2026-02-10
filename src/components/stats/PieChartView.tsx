/**
 * @file PieChartView.tsx
 * @input stats, todoStats, scopeStats, pieRange, categories, excludedCategoryIds
 * @output UI (Pie Charts), Events (toggleExclusion, onExport)
 * @pos Component (Statistics - Pie Chart)
 * @description 环形图统计视图 - 显示活动/待办/领域的时长分布
 * 
 * 包含三个独立的饼图：
 * 1. Tags (活动分类统计)
 * 2. Todos (待办分类统计)
 * 3. Scopes (领域统计)
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import React, { useMemo } from 'react';
import { Category } from '../../types';
import { TrendingUp, TrendingDown, Share } from 'lucide-react';
import { IconRenderer } from '../IconRenderer';
import { 
  calculatePieChartPath, 
  getHexColor, 
  formatDuration, 
  secondsToHoursMinutes 
} from '../../utils/chartUtils';
import { 
  StatsData, 
  PreviousStatsData 
} from '../../hooks/useStatsCalculation';
import { 
  TodoStatsData, 
  PreviousTodoStatsData 
} from '../../hooks/useTodoStats';
import { 
  ScopeStatsData, 
  PreviousScopeStatsData 
} from '../../hooks/useScopeStats';

export interface PieChartViewProps {
  stats: StatsData;
  previousStats: PreviousStatsData | null;
  todoStats: TodoStatsData;
  previousTodoStats: PreviousTodoStatsData | null;
  scopeStats: ScopeStatsData;
  previousScopeStats: PreviousScopeStatsData | null;
  pieRange: 'day' | 'week' | 'month' | 'year';
  categories: Category[];
  excludedCategoryIds: string[];
  onToggleExclusion: (id: string) => void;
  onExport?: () => void;
  isFullScreen?: boolean;
}

export const PieChartView: React.FC<PieChartViewProps> = ({
  stats,
  previousStats,
  todoStats,
  previousTodoStats,
  scopeStats,
  previousScopeStats,
  pieRange,
  categories,
  excludedCategoryIds,
  onToggleExclusion,
  onExport,
  isFullScreen = false
}) => {
  
  // 计算饼图路径数据
  const pieChartData = useMemo(() => {
    let currentAngle = 0;
    return stats.categoryStats.map(cat => {
      const pathData = calculatePieChartPath(cat.percentage, currentAngle);
      if (pathData) {
        currentAngle = pathData.endAngle;
        return { ...cat, d: pathData.d, hexColor: getHexColor(cat.themeColor) };
      }
      return null;
    }).filter(Boolean);
  }, [stats]);

  const todoPieChartData = useMemo(() => {
    let currentAngle = 0;
    return todoStats.categoryStats.map(cat => {
      const pathData = calculatePieChartPath(cat.percentage, currentAngle);
      if (pathData) {
        currentAngle = pathData.endAngle;
        return { ...cat, d: pathData.d, hexColor: cat.assignedColor };
      }
      return null;
    }).filter(Boolean);
  }, [todoStats]);

  const scopePieChartData = useMemo(() => {
    let currentAngle = 0;
    return scopeStats.categoryStats.map(scope => {
      const pathData = calculatePieChartPath(scope.percentage, currentAngle);
      if (pathData) {
        currentAngle = pathData.endAngle;
        return { ...scope, d: pathData.d, hexColor: getHexColor(scope.themeColor) };
      }
      return null;
    }).filter(Boolean);
  }, [scopeStats]);

  // 增长/下降指示器
  const renderGrowth = (current: number, previous: number) => {
    if (current < 0.1 && (!previous || previous < 0.1)) return null;
    if (!previous || previous < 0.1) return null;

    const delta = current - previous;
    const percentage = Math.round((delta / previous) * 100);
    if (percentage === 0) return null;
    const isPositive = percentage > 0;

    return (
      <div className={`flex items-center gap-0.5 text-[10px] font-medium ml-1.5 ${
        isPositive ? 'text-emerald-500' : 'text-red-400'
      }`}>
        {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        <span>{Math.abs(percentage)}%</span>
      </div>
    );
  };

  const { h: totalH, m: totalM } = secondsToHoursMinutes(stats.totalDuration);
  const { h: totalTodoH, m: totalTodoM } = secondsToHoursMinutes(todoStats.totalDuration);
  const { h: totalScopeH, m: totalScopeM } = secondsToHoursMinutes(scopeStats.totalDuration);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Tags Chart */}
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

        <div className="w-full space-y-4">
          {stats.categoryStats.map(cat => (
            <div key={cat.id} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <IconRenderer icon={cat.icon} uiIcon={cat.uiIcon} size={14} />
                  <span className="font-bold text-stone-700 text-[13px]">{cat.name}</span>
                  {previousStats && renderGrowth(
                    cat.duration,
                    previousStats.catDurations.get(cat.id) || 0
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-stone-400">
                    {formatDuration(cat.duration)}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-stone-100 rounded text-stone-500">
                    {cat.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-stone-50 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: getHexColor(cat.themeColor)
                  }}
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
                      {previousStats && renderGrowth(
                        act.duration,
                        previousStats.actDurations.get(act.id) || 0
                      )}
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
            onClick={() => onToggleExclusion(cat.id)}
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

      {/* Todo Stats Chart */}
      {todoStats.totalDuration > 0 && (
        <div className="flex flex-col items-center pt-8 border-t border-stone-100 mt-8">
          <div className="relative w-56 h-56 mb-8 mt-2">
            <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
              <circle cx="100" cy="100" r="80" fill="none" stroke="#f5f5f4" strokeWidth="25" />
              {todoPieChartData.map((segment, idx) => (
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
              <span className="text-xs font-bold text-stone-300 uppercase">Todos</span>
              <div className="flex items-baseline gap-0.5 text-stone-800">
                <span className="text-3xl font-bold font-mono">{totalTodoH}</span>
                <span className="text-xs text-stone-400">h</span>
                <span className="text-xl font-bold font-mono">{totalTodoM}</span>
                <span className="text-xs text-stone-400">m</span>
              </div>
            </div>
          </div>

          <div className="w-full space-y-4">
            {todoStats.categoryStats.map(cat => (
              <div key={cat.id} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <IconRenderer icon={cat.icon} uiIcon={cat.uiIcon} size={14} />
                    <span className="font-bold text-stone-700 text-[13px]">{cat.name}</span>
                    {previousTodoStats && renderGrowth(
                      cat.duration,
                      previousTodoStats.categoryDurations?.get(cat.id) || 0
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-stone-400">
                      {formatDuration(cat.duration)}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-stone-100 rounded text-stone-500">
                      {cat.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-stone-50 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.assignedColor
                    }}
                  />
                </div>
                {pieRange !== 'year' && (
                  <div className="pl-6 space-y-1">
                    {cat.items.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-[11px] text-stone-500 hover:bg-stone-50 rounded px-2 py-0.5 -ml-2 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-1 h-1 rounded-full"
                            style={{ backgroundColor: cat.assignedColor }}
                          />
                          <span>{item.name}</span>
                          {previousTodoStats && renderGrowth(
                            item.duration,
                            previousTodoStats.todoDurations.get(item.id) || 0
                          )}
                        </div>
                        <span className="font-mono opacity-60">{formatDuration(item.duration)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scope Stats Chart */}
      {scopeStats.totalDuration > 0 && (
        <div className="flex flex-col items-center pt-8 border-t border-stone-100 mt-8">
          <div className="relative w-56 h-56 mb-8 mt-2">
            <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
              <circle cx="100" cy="100" r="80" fill="none" stroke="#f5f5f4" strokeWidth="25" />
              {scopePieChartData.map((segment, idx) => (
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
              <span className="text-xs font-bold text-stone-300 uppercase">Scopes</span>
              <div className="flex items-baseline gap-0.5 text-stone-800">
                <span className="text-3xl font-bold font-mono">{totalScopeH}</span>
                <span className="text-xs text-stone-400">h</span>
                <span className="text-xl font-bold font-mono">{totalScopeM}</span>
                <span className="text-xs text-stone-400">m</span>
              </div>
            </div>
          </div>

          <div className="w-full space-y-4">
            {scopeStats.categoryStats.map(scope => (
              <div key={scope.id} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <IconRenderer icon={scope.icon} uiIcon={scope.uiIcon} size={14} />
                    <span className="font-bold text-stone-700 text-[13px]">{scope.name}</span>
                    {previousScopeStats && renderGrowth(
                      scope.duration,
                      previousScopeStats.scopeDurations.get(scope.id) || 0
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-stone-400">
                      {formatDuration(scope.duration)}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-stone-100 rounded text-stone-500">
                      {scope.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-stone-50 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${scope.percentage}%`,
                      backgroundColor: getHexColor(scope.themeColor)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Button */}
      {!isFullScreen && onExport && (
        <div className="flex justify-center pt-8 mt-4 mb-4">
          <button
            onClick={onExport}
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
