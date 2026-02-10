/**
 * @file useTimeCalculation.ts
 * @description Custom hook for time calculation and manipulation
 */

import { useMemo } from 'react';

export interface TimeHM {
  h: number;
  m: number;
}

export const useTimeCalculation = (
  currentStartTime: number,
  currentEndTime: number,
  trackStartTime: number,
  trackEndTime: number
) => {
  // 将时间戳转换为小时和分钟
  const getHM = (ts: number): TimeHM => {
    const d = new Date(ts);
    return { h: d.getHours(), m: d.getMinutes() };
  };

  // 获取开始和结束时间的小时分钟
  const startHM = useMemo(() => getHM(currentStartTime), [currentStartTime]);
  const endHM = useMemo(() => getHM(currentEndTime), [currentEndTime]);

  // 计算持续时间显示
  const durationDisplay = useMemo(() => {
    const diff = (currentEndTime - currentStartTime) / 1000 / 60; // mins

    if (diff <= 0) return '---';

    const h = Math.floor(diff / 60);
    const m = Math.round(diff % 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }, [currentStartTime, currentEndTime]);

  // 计算滑块百分比
  const trackDuration = trackEndTime - trackStartTime;
  const safeTrackDuration = trackDuration > 0 ? trackDuration : 1;

  const startPercent = Math.max(0, Math.min(100, ((currentStartTime - trackStartTime) / safeTrackDuration) * 100));
  const endPercent = Math.max(0, Math.min(100, ((currentEndTime - trackStartTime) / safeTrackDuration) * 100));

  // 从输入值创建新时间戳
  const createTimeFromInput = (baseTime: number, field: 'h' | 'm', value: number): number => {
    const baseDate = new Date(trackStartTime);
    baseDate.setHours(0, 0, 0, 0);

    const currentHM = getHM(baseTime);
    let newHours = currentHM.h;
    let newMinutes = currentHM.m;

    if (field === 'h') {
      newHours = Math.max(0, Math.min(23, value));
    } else {
      newMinutes = Math.max(0, Math.min(59, value));
    }

    const newDate = new Date(baseDate);
    newDate.setHours(newHours, newMinutes, 0, 0);
    return newDate.getTime();
  };

  // 从客户端 X 坐标计算时间
  const calculateTimeFromClientX = (clientX: number, sliderRect: DOMRect): number | null => {
    if (trackDuration <= 0) return null;
    
    const percent = Math.min(100, Math.max(0, ((clientX - sliderRect.left) / sliderRect.width) * 100));
    let newTime = trackStartTime + (percent / 100) * trackDuration;
    const MS_PER_MIN = 60000;
    return Math.round(newTime / MS_PER_MIN) * MS_PER_MIN;
  };

  // 设置时间为当前时间
  const setToNow = (type: 'start' | 'end', currentStartTime: number): number => {
    const now = Date.now();
    
    if (type === 'end') {
      const startDate = new Date(currentStartTime);
      const nowDate = new Date(now);

      // 如果跨天，限制到当天23:59:59
      if (startDate.toDateString() !== nowDate.toDateString()) {
        const endOfDay = new Date(currentStartTime);
        endOfDay.setHours(23, 59, 59, 999);
        return endOfDay.getTime();
      }
    }
    
    return now;
  };

  return {
    startHM,
    endHM,
    durationDisplay,
    startPercent,
    endPercent,
    trackDuration,
    createTimeFromInput,
    calculateTimeFromClientX,
    setToNow
  };
};
