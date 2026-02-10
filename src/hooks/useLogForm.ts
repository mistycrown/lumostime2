/**
 * @file useLogForm.ts
 * @description Custom hook for managing log form state
 */

import { useState, useEffect, useMemo } from 'react';
import { Log, Category, TodoItem, TodoCategory, Scope, AutoLinkRule, Comment } from '../types';

interface UseLogFormProps {
  initialLog?: Log | null;
  initialStartTime?: number;
  initialEndTime?: number;
  categories: Category[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  lastLogEndTime?: number;
  allLogs?: Log[];
}

export interface LogFormState {
  selectedCategoryId: string;
  selectedActivityId: string;
  note: string;
  linkedTodoId?: string;
  progressIncrement: number;
  focusScore?: number;
  scopeIds?: string[];
  images: string[];
  comments: Comment[];
  reactions: string[];
  currentStartTime: number;
  currentEndTime: number;
  trackStartTime: number;
  trackEndTime: number;
}

export const useLogForm = ({
  initialLog,
  initialStartTime,
  initialEndTime,
  categories,
  todos,
  todoCategories,
  lastLogEndTime,
  allLogs = []
}: UseLogFormProps) => {
  // 合并状态到单个对象
  const [formState, setFormState] = useState<LogFormState>(() => {
    const defaultCategory = categories[0];
    const defaultActivity = defaultCategory?.activities[0];
    
    return {
      selectedCategoryId: defaultCategory?.id || '',
      selectedActivityId: defaultActivity?.id || '',
      note: '',
      linkedTodoId: undefined,
      progressIncrement: 0,
      focusScore: undefined,
      scopeIds: undefined,
      images: [],
      comments: [],
      reactions: [],
      currentStartTime: 0,
      currentEndTime: 0,
      trackStartTime: 0,
      trackEndTime: 0
    };
  });

  // 初始化表单状态
  useEffect(() => {
    let tStart = 0;
    let tEnd = 0;
    let cStart = 0;
    let cEnd = 0;

    if (initialLog) {
      // 编辑模式
      tStart = initialLog.startTime;
      tEnd = initialLog.endTime;
      cStart = initialLog.startTime;
      cEnd = initialLog.endTime;

      setFormState({
        selectedCategoryId: initialLog.categoryId,
        selectedActivityId: initialLog.activityId,
        note: initialLog.note || '',
        linkedTodoId: initialLog.linkedTodoId,
        progressIncrement: initialLog.progressIncrement || 0,
        focusScore: initialLog.focusScore,
        scopeIds: initialLog.scopeIds,
        images: initialLog.images || [],
        comments: initialLog.comments || [],
        reactions: initialLog.reactions || [],
        currentStartTime: cStart,
        currentEndTime: cEnd,
        trackStartTime: tStart,
        trackEndTime: tEnd
      });
    } else if (initialStartTime && initialEndTime) {
      // 填充间隙模式
      tStart = initialStartTime;
      tEnd = initialEndTime;
      cStart = initialStartTime;
      cEnd = initialEndTime;

      setFormState(prev => ({
        ...prev,
        currentStartTime: cStart,
        currentEndTime: cEnd,
        trackStartTime: tStart,
        trackEndTime: tEnd
      }));
    } else {
      // 新建模式
      const now = Date.now();
      const startTime = lastLogEndTime || now - 60 * 60 * 1000;

      tStart = startTime;
      tEnd = now;
      cStart = startTime;
      cEnd = now;

      setFormState(prev => ({
        ...prev,
        currentStartTime: cStart,
        currentEndTime: cEnd,
        trackStartTime: tStart,
        trackEndTime: tEnd
      }));
    }
  }, [initialLog, initialStartTime, initialEndTime, categories, lastLogEndTime]);

  // 计算上一条记录的结束时间
  const previousLogEndTime = useMemo(() => {
    if (!allLogs || allLogs.length === 0) return lastLogEndTime;
    
    const referenceTime = formState.currentStartTime || formState.trackStartTime || Date.now();
    const referenceDate = new Date(referenceTime);
    referenceDate.setHours(0, 0, 0, 0);
    const dayStartTime = referenceDate.getTime();
    
    const previousLogs = allLogs.filter(log => {
      if (initialLog && log.id === initialLog.id) return false;
      return log.endTime <= referenceTime;
    });
    
    if (previousLogs.length === 0) return lastLogEndTime;
    
    const sortedPreviousLogs = previousLogs.sort((a, b) => b.endTime - a.endTime);
    const closestLog = sortedPreviousLogs[0];
    
    if (closestLog.endTime < dayStartTime) {
      return dayStartTime;
    }
    
    return closestLog.endTime;
  }, [allLogs, formState.currentStartTime, formState.trackStartTime, initialLog, lastLogEndTime]);

  // 更新单个字段
  const updateField = <K extends keyof LogFormState>(field: K, value: LogFormState[K]) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  // 批量更新字段
  const updateFields = (updates: Partial<LogFormState>) => {
    setFormState(prev => ({ ...prev, ...updates }));
  };

  return {
    formState,
    updateField,
    updateFields,
    previousLogEndTime
  };
};
