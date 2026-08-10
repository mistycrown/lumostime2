/**
 * @file CheckView.tsx
 * @input checkStats, pieRange, rangeStart
 * @output UI (Check View)
 * @pos Component (Statistics - Check)
 * @description 打卡统计视图 - 显示习惯打卡情况（周/月/年）
 *
 * 修改历史:
 * - 2026-03-03: 数字类型（manual count）日课改为展示完成次数，而不是仅展示是否完成。
 * - 2026-03-03: 月视图中数字类型日课的完成天数改为按“达标天数（value >= target）”计算并渲染。
 * - 2026-07-22: Added semantic hooks for dark-mode weekly, monthly, and yearly habit-stat grids.
 * - 2026-08-09: Applied custom daily-check template colors across week, month, and year views.
 */

import React from 'react';
import { CheckCircle2, ListChecks, Target } from 'lucide-react';
import { getWeekColorStyle, getMonthYearColorStyle } from '../../utils/checkViewUtils';
import { IconRenderer } from '../IconRenderer';
import { getDailyCheckColorValues } from '../../utils/dailyCheckColorUtils';

export interface CheckStats {
  categories: {
    name: string;
    items: {
      name: string;
      icon: string;
      uiIcon?: string;
      color?: string;
      days: Record<string, boolean>;
      dayDetails?: Record<string, { value: number; target: number }>;
      stats: {
        total: number;
        checked: number;
        countTotal?: number;
        isCountMode?: boolean;
      };
    }[];
  }[];
  allDays: string[];
  dateMap: Record<string, Date>;
}

export interface CheckViewProps {
  checkStats: CheckStats;
  pieRange: 'day' | 'week' | 'month' | 'year';
  rangeStart: Date;
}

export const CheckView: React.FC<CheckViewProps> = ({
  checkStats,
  pieRange,
  rangeStart
}) => {
  if (checkStats.categories.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center justify-center py-20 text-stone-400">
          <CheckCircle2 size={48} className="mb-4 opacity-20" />
          <p>该时间段无打卡记录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="daily-check-stats space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Week View */}
      {pieRange === 'week' && (
        <div className="space-y-8">
          {checkStats.categories.map(cat => (
            <div key={cat.name} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-stone-900">
                  {cat.name === '默认' ? '日常习惯' : cat.name}
                </h3>
                <div className="h-px bg-stone-200 flex-1"></div>
              </div>
              <div className="space-y-2">
                {cat.items.map(habit => {
                  const style = getWeekColorStyle(habit.name);
                  const customColor = getDailyCheckColorValues(habit.color);
                  const isCountMode = Boolean(habit.stats.isCountMode);

                  return (
                    <div key={habit.name} className="flex items-center justify-between py-1">
                      <div className="w-28 sm:w-40 shrink-0 flex items-center gap-2">
                        <IconRenderer
                          icon={habit.icon}
                          uiIcon={habit.uiIcon}
                          className="text-base shrink-0"
                        />
                        <span className="text-sm font-medium text-stone-800 truncate" title={habit.name}>
                          {habit.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-end px-2 sm:px-4">
                        {checkStats.allDays.map(dayStr => {
                          const detail = habit.dayDetails?.[dayStr];
                          const countValue = detail?.value ?? 0;
                          const isChecked = isCountMode ? countValue > 0 : Boolean(habit.days[dayStr]);
                          const date = checkStats.dateMap[dayStr];

                          return (
                            <div key={dayStr} className="flex flex-col items-center gap-1">
                              <div
                                title={isCountMode
                                  ? `${date.toLocaleDateString()} ${countValue}次`
                                  : `${date.toLocaleDateString()} ${isChecked ? '已完成' : '未完成'}${detail ? ` (${detail.value}/${detail.target}次)` : ''}`
                                }
                                  className={`daily-check-week-cell ${isChecked ? 'daily-check-cell-complete' : ''} w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                                    isChecked
                                      ? customColor ? '' : `${style.fill} ${style.text}`
                                      : 'bg-white border border-stone-200'
                                  }`}
                                style={customColor && isChecked
                                  ? { backgroundColor: customColor.surface, color: customColor.primary }
                                  : undefined}
                              >
                                {isCountMode && countValue > 0 ? (
                                  <span className="text-[10px] sm:text-xs font-bold leading-none">{countValue}</span>
                                ) : (
                                  isChecked && <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={3} />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Month View */}
          {pieRange === 'month' && (
            <div className="grid grid-cols-2 gap-3">
              {checkStats.categories.flatMap(cat => cat.items.map(habit => {
                const style = getMonthYearColorStyle(habit.name);
                const customColor = getDailyCheckColorValues(habit.color);
                const isCountMode = Boolean(habit.stats.isCountMode);
            const completedDisplay = isCountMode
              ? checkStats.allDays.reduce((sum, dayStr) => {
                  const detail = habit.dayDetails?.[dayStr];
                  if (!detail) return sum;
                  const countValue = Math.max(0, Math.floor(Number(detail.value) || 0));
                  const targetValue = Math.max(1, Math.floor(Number(detail.target) || 1));
                  return sum + (countValue >= targetValue ? 1 : 0);
                }, 0)
              : habit.stats.checked;
            const completionPercent = Math.round((completedDisplay / (checkStats.allDays.length || 1)) * 100);

            return (
              <div key={`${cat.name}-${habit.name}`} className="daily-check-stat-card bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <IconRenderer
                        icon={habit.icon}
                        uiIcon={habit.uiIcon}
                        className="text-base shrink-0"
                      />
                      <h4 className="font-bold text-stone-800 text-sm">
                        {habit.name}
                      </h4>
                    </div>
                    <p className="text-xs text-stone-400">{cat.name === '默认' ? '日常' : cat.name}</p>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="grid grid-cols-7 gap-1">
                    {(() => {
                      // Monday start: Sunday is 0, we want it to be 6. Monday is 1, we want 0.
                      // formula: (day + 6) % 7
                      const startDay = (new Date(rangeStart).getDay() + 6) % 7;
                      const blanks = Array.from({ length: startDay }, (_, i) => <div key={`blank-${i}`} />);

                      return [
                        ...blanks,
                        ...checkStats.allDays.map(dayStr => {
                          const detail = habit.dayDetails?.[dayStr];
                          const countValue = detail?.value ?? 0;
                          const targetValue = Math.max(1, Math.floor(Number(detail?.target) || 1));
                          const isChecked = isCountMode ? countValue >= targetValue : Boolean(habit.days[dayStr]);
                          return (
                            <div
                              key={dayStr}
                              title={isCountMode
                                ? `${dayStr} ${countValue}/${targetValue}次${isChecked ? '（达标）' : '（未达标）'}`
                                : (detail ? `${dayStr} ${detail.value}/${detail.target}次` : dayStr)}
                                className={`daily-check-month-cell ${isChecked ? 'daily-check-cell-complete' : ''} aspect-square rounded-md flex items-center justify-center text-[10px] font-medium transition-colors ${
                                isChecked ? customColor ? 'text-white' : `${style.fill} text-white` : 'bg-stone-50 text-stone-300'
                              }`}
                              style={customColor && isChecked ? { backgroundColor: customColor.primary } : undefined}
                            >
                              {isCountMode && countValue > 0 ? countValue : ''}
                            </div>
                          );
                        })
                      ];
                    })()}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-50">
                  <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    <CheckCircle2
                      size={14}
                      className={customColor ? '' : style.text}
                      style={customColor ? { color: customColor.primary } : undefined}
                    />
                    <span className="font-bold">{completedDisplay}</span>
                    {isCountMode && typeof habit.stats.countTotal === 'number' && (
                      <>
                        <ListChecks
                          size={14}
                          className={customColor ? '' : style.text}
                          style={customColor ? { color: customColor.primary } : undefined}
                        />
                        <span className="font-bold">{habit.stats.countTotal}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    <Target
                      size={14}
                      className={customColor ? '' : style.text}
                      style={customColor ? { color: customColor.primary } : undefined}
                    />
                    <span className="font-bold">
                      {completionPercent}%
                    </span>
                  </div>
                </div>
              </div>
            );
          }))}
        </div>
      )}

      {/* Year View */}
          {pieRange === 'year' && (
            <div className="space-y-4">
              {checkStats.categories.flatMap(cat => cat.items.map(habit => {
                const style = getMonthYearColorStyle(habit.name);
                const customColor = getDailyCheckColorValues(habit.color);
                const isCountMode = Boolean(habit.stats.isCountMode);
            const completedDisplay = isCountMode
              ? (habit.stats.countTotal || 0)
              : habit.stats.checked;

            return (
              <div key={`${cat.name}-${habit.name}`} className="daily-check-stat-card bg-white rounded-xl py-4 shadow-sm border border-stone-100 overflow-hidden">
                <div className="flex items-center gap-3 mb-4 px-4">
                  <IconRenderer
                    icon={habit.icon}
                    uiIcon={habit.uiIcon}
                    className="text-lg shrink-0"
                  />
                  <span className="font-bold text-sm text-stone-800 shrink-0">
                    {habit.name}
                  </span>
                  <span className="text-xs text-stone-400 ml-auto shrink-0">
                    {cat.name} · {completedDisplay}次
                  </span>
                </div>

                <div className="px-4">
                  <div className="overflow-x-auto pb-2 scrollbar-hide">
                    <div className="flex gap-1 min-w-fit">
                      {(() => {
                        const weeks: string[][] = [];
                        let currentWeek: string[] = Array(7).fill(null);

                        const startDay = new Date(rangeStart).getDay();
                        let dayIndex = startDay;

                        checkStats.allDays.forEach((dayStr) => {
                          currentWeek[dayIndex] = dayStr;
                          dayIndex++;
                          if (dayIndex > 6) {
                            weeks.push(currentWeek);
                            currentWeek = Array(7).fill(null);
                            dayIndex = 0;
                          }
                        });
                        if (dayIndex > 0) weeks.push(currentWeek);

                        return weeks.map((week, wIdx) => (
                          <div key={wIdx} className="flex flex-col gap-1">
                            {week.map((dayStr, dIdx) => {
                              if (!dayStr) return <div key={dIdx} className="w-3 h-3" />;
                              const detail = habit.dayDetails?.[dayStr];
                              const countValue = detail?.value ?? 0;
                              const isChecked = isCountMode ? countValue > 0 : Boolean(habit.days[dayStr]);
                              return (
                                <div
                                  key={dayStr}
                                  title={isCountMode
                                    ? `${dayStr} ${countValue}次`
                                    : `${dayStr}${isChecked ? ' 已完成' : ''}${detail ? ` (${detail.value}/${detail.target}次)` : ''}`
                                  }
                                  className={`daily-check-year-cell ${isChecked ? 'daily-check-cell-complete' : ''} w-3 h-3 rounded-[2px] transition-colors flex items-center justify-center ${
                                    isChecked
                                      ? customColor ? '' : style.fill
                                      : 'bg-stone-100'
                                  }`}
                                  style={customColor && isChecked ? { backgroundColor: customColor.primary } : undefined}
                                >
                                  {isCountMode && countValue > 0 && (
                                    <span className="text-[6px] leading-none text-white font-bold tracking-[-0.2px]">
                                      {countValue > 99 ? '99' : countValue}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            );
          }))}
        </div>
      )}
    </div>
  );
};
