/**
 * @file CheckView.tsx
 * @input checkStats, pieRange, rangeStart
 * @output UI (Check View)
 * @pos Component (Statistics - Check)
 * @description 打卡统计视图 - 显示习惯打卡情况
 * 
 * 支持三种视图模式：
 * 1. Week - 横向打卡列表
 * 2. Month - 卡片式日历网格
 * 3. Year - GitHub 风格热力图
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { getWeekColorStyle, getMonthYearColorStyle } from '../../utils/checkViewUtils';
import { IconRenderer } from '../IconRenderer';

export interface CheckStats {
  categories: {
    name: string;
    items: {
      name: string;
      icon: string;
      uiIcon?: string;
      days: Record<string, boolean>;
      stats: {
        total: number;
        checked: number;
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
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
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
                          const isChecked = habit.days[dayStr];
                          const date = checkStats.dateMap[dayStr];
                          return (
                            <div key={dayStr} className="flex flex-col items-center gap-1">
                              <div
                                title={`${date.toLocaleDateString()} ${isChecked ? '已完成' : '未完成'}`}
                                className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                                  isChecked
                                    ? `${style.fill} ${style.text}`
                                    : 'bg-white border border-stone-200'
                                }`}
                              >
                                {isChecked && <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={3} />}
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

            return (
              <div key={`${cat.name}-${habit.name}`} className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex flex-col">
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
                          const isChecked = habit.days[dayStr];
                          return (
                            <div
                              key={dayStr}
                              className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium transition-colors ${
                                isChecked ? `${style.fill} text-white` : 'bg-stone-50 text-stone-300'
                              }`}
                            >
                            </div>
                          );
                        })
                      ];
                    })()}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-50">
                  <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    <CheckCircle2 size={14} className={style.text} />
                    <span className="font-bold">{habit.stats.checked}</span>
                    <span className="text-[10px] text-stone-300"></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    <span className="text-[10px]">🔥</span>
                    <span className="font-bold">
                      {Math.round((habit.stats.checked / (checkStats.allDays.length || 1)) * 100)}%
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

            return (
              <div key={`${cat.name}-${habit.name}`} className="bg-white rounded-xl py-4 shadow-sm border border-stone-100 overflow-hidden">
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
                    {cat.name} · {habit.stats.checked}次
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
                              const isChecked = habit.days[dayStr];
                              return (
                                <div
                                  key={dayStr}
                                  title={`${dayStr} ${isChecked ? '已完成' : ''}`}
                                  className={`w-3 h-3 rounded-[2px] transition-colors ${
                                    isChecked ? style.fill : 'bg-stone-100'
                                  }`}
                                />
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
