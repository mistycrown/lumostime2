/**
 * @file ScheduleView.tsx
 * @input filteredLogs, categories, scheduleRange, rangeStart, currentDate, isFullScreen, isPrivacyMode
 * @output UI (Schedule View)
 * @pos Component (Statistics - Schedule)
 * @description 日程统计视图 - 显示时间轴上的活动分布
 * 
 * 支持三种视图模式：
 * 1. Day - 单日 24 小时时间轴
 * 2. Week - 7 天 × 24 小时网格
 * 3. Month - 月度热力图（使用 MonthHeatmap 组件）
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Log, Category } from '../../types';
import { MonthHeatmap } from '../MonthHeatmap';
import { 
  layoutDayEvents, 
  SCHEDULE_CONSTANTS,
  calculateEventTop,
  calculateEventHeight,
  filterLogsByDate,
  generateWeekDays
} from '../../utils/scheduleUtils';
import { getScheduleStyle } from '../../utils/chartUtils';

export interface ScheduleViewProps {
  filteredLogs: Log[];
  categories: Category[];
  scheduleRange: 'day' | 'week' | 'month';
  rangeStart: Date;
  currentDate: Date;
  isFullScreen: boolean;
  isPrivacyMode: boolean;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  filteredLogs,
  categories,
  scheduleRange,
  rangeStart,
  currentDate,
  isFullScreen,
  isPrivacyMode
}) => {
  // 缩放相关状态
  const [scale, setScale] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  const touchStartDistance = useRef<number | null>(null);
  const initialScale = useRef(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算动态高度
  const BASE_HOUR_HEIGHT = SCHEDULE_CONSTANTS.HOUR_HEIGHT;
  const HOUR_HEIGHT = BASE_HOUR_HEIGHT * scale;
  const TOTAL_HEIGHT = HOUR_HEIGHT * 24;

  // 缩放范围限制
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;

  // 计算两点之间的距离
  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsPinching(true);
      touchStartDistance.current = getDistance(e.touches[0], e.touches[1]);
      initialScale.current = scale;
    }
  };

  // 触摸移动
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinching && touchStartDistance.current) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scaleChange = currentDistance / touchStartDistance.current;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, initialScale.current * scaleChange));
      setScale(newScale);
    }
  };

  // 触摸结束
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setIsPinching(false);
      touchStartDistance.current = null;
    }
  };

  // 重置缩放（当切换视图时）
  useEffect(() => {
    setScale(1);
  }, [scheduleRange]);

  const containerClasses = isFullScreen
    ? "relative w-full bg-white flex flex-1"
    : "relative w-full flex";

  // Day View
  if (scheduleRange === 'day') {
    const layout = layoutDayEvents(filteredLogs);
    
    return (
      <div className={`animate-in fade-in zoom-in-95 duration-300 ${isFullScreen ? 'flex-1 flex flex-col' : 'flex-1 flex flex-col px-5'}`}>
        <div 
          ref={containerRef}
          className={containerClasses}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="relative w-full flex" style={{ minHeight: TOTAL_HEIGHT }}>
            {/* Hour Labels */}
            <div className="w-12 border-r border-stone-100 bg-stone-50/50 relative shrink-0 sticky left-0 z-10" style={{ minHeight: TOTAL_HEIGHT }}>
              {Array.from({ length: 24 }, (_, i) => (
                <div 
                  key={i} 
                  className="absolute w-full text-xs font-medium text-stone-400 font-mono text-center pt-1" 
                  style={{ top: i * HOUR_HEIGHT }}
                >
                  {i}:00
                </div>
              ))}
            </div>

            {/* Events */}
            <div className="relative flex-1" style={{ minHeight: TOTAL_HEIGHT }}>
              {/* Hour Grid Lines */}
              {Array.from({ length: 24 }, (_, h) => (
                <div 
                  key={h} 
                  className="absolute w-full border-b border-stone-50" 
                  style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }} 
                />
              ))}

              {/* Event Blocks */}
              {filteredLogs.map(log => {
                const top = calculateEventTop(log.startTime, HOUR_HEIGHT);
                const height = calculateEventHeight(log.duration, HOUR_HEIGHT);
                const cat = categories.find(c => c.id === log.categoryId);
                const act = cat?.activities.find(a => a.id === log.activityId);
                const style = getScheduleStyle(act?.color || cat?.themeColor);
                const lay = layout.get(log.id) || { left: '0%', width: '100%' };

                // 动态计算可显示的备注行数
                // 标题高度约 16px (text-[11px] + leading-tight)
                // padding 上下各 4px = 8px
                // 备注文字 line-height 约 14px (text-[10px] + leading-snug)
                const titleHeight = 16;
                const paddingTotal = 8;
                const noteLineHeight = 14;
                const availableHeight = height - titleHeight - paddingTotal;
                const maxLines = Math.max(0, Math.floor(availableHeight / noteLineHeight));
                const showNote = log.note && maxLines > 0;

                return (
                  <div 
                    key={log.id} 
                    className={`absolute rounded p-1 text-[10px] overflow-hidden leading-tight flex flex-col justify-start ${style} hover:z-10 border border-white/50 shadow-sm`}
                    style={{ 
                      top: top + 1, 
                      height: height, 
                      left: `calc(${lay.left} + 2px)`, 
                      width: `calc(${lay.width} - 4px)` 
                    }}
                  >
                    <span className="font-bold text-[11px] leading-tight block truncate">
                      {act?.name || cat?.name}
                    </span>
                    {showNote && (
                      <span
                        className={`text-[10px] opacity-80 mt-0.5 font-light leading-snug break-all overflow-hidden text-ellipsis ${
                          isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'
                        }`}
                        title={isPrivacyMode ? '' : log.note}
                        style={{ 
                          display: '-webkit-box', 
                          WebkitLineClamp: maxLines, 
                          WebkitBoxOrient: 'vertical' 
                        }}
                      >
                        {log.note}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Week View
  if (scheduleRange === 'week') {
    const weekDays = generateWeekDays(rangeStart);

    return (
      <div className={`animate-in fade-in zoom-in-95 duration-300 ${isFullScreen ? 'flex-1 flex flex-col' : 'flex-1 flex flex-col px-5'}`}>
        {/* Week Header - 与背景色一致，紧贴顶部无缝隙 */}
        <div className={`flex border-b border-stone-100 shrink-0 sticky top-0 z-30 ${
          isFullScreen ? 'bg-stone-50' : 'bg-[#faf9f6]'
        }`}>
          <div className={`w-10 shrink-0 border-r border-stone-100 ${isFullScreen ? 'bg-stone-50' : 'bg-[#faf9f6]'}`}></div>
          {weekDays.map((d, i) => (
            <div 
              key={i} 
              className={`flex-1 text-center py-2 border-r border-stone-100 last:border-none ${
                d.toDateString() === new Date().toDateString() 
                  ? 'bg-stone-100' 
                  : isFullScreen ? 'bg-stone-50' : 'bg-[#faf9f6]'
              }`}
            >
              <div className="text-[10px] text-stone-400 uppercase">
                {['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}
              </div>
              <div className={`text-xs font-bold ${
                d.toDateString() === new Date().toDateString() ? 'text-stone-900' : 'text-stone-600'
              }`}>
                {d.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Week Grid */}
        <div 
          ref={containerRef}
          className="relative flex-1"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="relative w-full" style={{ minHeight: TOTAL_HEIGHT }}>
            {/* Hour Labels */}
            <div className="absolute left-0 top-0 bottom-0 w-10 border-r border-stone-100 bg-stone-50/50 z-10">
              {Array.from({ length: 24 }, (_, i) => (
                <div 
                  key={i} 
                  className="absolute w-full text-[10px] text-stone-300 font-mono text-center pt-1" 
                  style={{ top: i * HOUR_HEIGHT }}
                >
                  {i}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            <div className="absolute left-10 right-0 top-0 bottom-0 flex">
              {/* Hour Grid Lines */}
              <div className="absolute inset-0 pointer-events-none z-0">
                {Array.from({ length: 24 }, (_, h) => (
                  <div 
                    key={h} 
                    className="w-full border-b border-stone-50" 
                    style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT, position: 'absolute' }} 
                  />
                ))}
              </div>

              {/* Each Day Column */}
              {weekDays.map((d, i) => {
                const dayLogs = filterLogsByDate(filteredLogs, d);
                const layout = layoutDayEvents(dayLogs);

                return (
                  <div 
                    key={i} 
                    className="flex-1 border-r border-stone-50 relative last:border-none" 
                    style={{ minHeight: TOTAL_HEIGHT }}
                  >
                    {dayLogs.map(log => {
                      const top = calculateEventTop(log.startTime, HOUR_HEIGHT);
                      const height = calculateEventHeight(log.duration, HOUR_HEIGHT);
                      const cat = categories.find(c => c.id === log.categoryId);
                      const act = cat?.activities.find(a => a.id === log.activityId);
                      const style = getScheduleStyle(act?.color || cat?.themeColor);
                      const lay = layout.get(log.id) || { left: '0%', width: '100%' };
                      
                      // 动态计算可显示的备注行数
                      // 根据格子高度决定标题字体大小
                      const titleHeight = height < 20 ? 12 : 14;
                      const paddingTotal = 4; // p-0.5 = 2px * 2
                      const noteLineHeight = 12; // text-[10px] + leading-snug
                      const availableHeight = height - titleHeight - paddingTotal;
                      const maxLines = Math.max(0, Math.floor(availableHeight / noteLineHeight));
                      const showNote = log.note && maxLines > 0;

                      return (
                        <div 
                          key={log.id} 
                          className={`absolute rounded-[2px] p-0.5 overflow-hidden leading-tight flex flex-col justify-start ${style} hover:z-10 border border-white/50 shadow-sm transition-all hover:scale-[1.02]`}
                          style={{ 
                            top: top + 1, 
                            height: height, 
                            left: lay.left, 
                            width: `calc(${lay.width} - 2px)` 
                          }}
                        >
                          <span className={`font-bold block w-full leading-tight truncate ${
                            height < 20 ? 'text-[9px]' : 'text-[11px]'
                          }`}>
                            {act?.name}
                          </span>
                          {showNote && (
                            <span
                              className={`text-[10px] opacity-75 w-full block mt-0.5 leading-snug break-all overflow-hidden text-ellipsis ${
                                isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'
                              }`}
                              style={{ 
                                display: '-webkit-box', 
                                WebkitLineClamp: maxLines, 
                                WebkitBoxOrient: 'vertical' 
                              }}
                            >
                              {log.note}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Month View (Heatmap)
  return (
    <div className={`animate-in fade-in zoom-in-95 duration-300 ${isFullScreen ? 'flex-1 flex flex-col' : ''}`}>
      <div 
        className={`${containerClasses} p-1`} 
        style={{ minHeight: isFullScreen ? '100%' : '700px', height: isFullScreen ? '100%' : 'auto' }}
      >
        <MonthHeatmap
          logs={filteredLogs}
          categories={categories}
          month={currentDate}
        />
      </div>
    </div>
  );
};
