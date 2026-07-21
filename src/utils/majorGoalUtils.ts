/**
 * @file majorGoalUtils.ts
 * @input MajorGoal objects, Goal objects, Logs array, Todos array
 * @output Progress calculations, time range calculations, validation functions for MajorGoals
 * @pos Utility (MajorGoal Logic)
 * @description Pure functions for managing major goals, including progress calculation, time range management, and validation.
 * @updated 2026-07-21: Use explicit local calendar-day boundaries for inclusive goal ranges.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { MajorGoal, Goal, Log, TodoItem } from '../types';
import { calculateGoalProgress, getGoalDateRange } from './goalUtils';

/**
 * 计算大目标的总进度
 * @param majorGoal - 大目标对象
 * @param goals - 所有目标列表
 * @param logs - 所有日志列表
 * @param todos - 所有待办列表
 * @returns 总进度信息（当前值、目标值、百分比）
 */
export const calculateMajorGoalProgress = (
  majorGoal: MajorGoal,
  goals: Goal[],
  logs: Log[],
  todos: TodoItem[]
): { current: number; target: number; percentage: number } => {
  // 获取该大目标下的所有子目标
  const childGoals = goals.filter(g => g.majorGoalId === majorGoal.id);
  
  const target = majorGoal.targetValue;
  
  // 如果有子目标，累加子目标的当前进度
  if (childGoals.length > 0) {
    let totalCurrent = 0;
    
    childGoals.forEach(goal => {
      const { current } = calculateGoalProgress(goal, logs, todos);
      totalCurrent += current;
    });
    
    const percentage = target > 0 ? (totalCurrent / target) * 100 : 0;
    
    return {
      current: totalCurrent,
      target,
      percentage: Math.min(percentage, 100)
    };
  }
  
  // 如果没有子目标，直接根据筛选条件计算当前值
  let totalCurrent = 0;
  
  // 转换日期为时间戳
  const { start, end } = getGoalDateRange(majorGoal.startDate, majorGoal.endDate);
  
  if (majorGoal.metric === 'task_count') {
    // 任务数量：统计完成的待办
    const filteredTodos = todos.filter(todo => {
      if (!todo.isCompleted) return false;
      
      // 添加领域和时间过滤
      if (!todo.defaultScopeIds?.includes(majorGoal.scopeId)) return false;
      if (!todo.completedAt) return false;
      const completedTime = new Date(todo.completedAt).getTime();
      if (completedTime < start || completedTime > end) return false;

      if (majorGoal.filterTodoCategories && majorGoal.filterTodoCategories.length > 0) {
        return majorGoal.filterTodoCategories.includes(todo.categoryId);
      }
      return true;
    });
    totalCurrent = filteredTodos.length;
  } else {
    // 日志相关指标：先执行基础过滤（时间、领域、标签）
    const baseFilteredLogs = logs.filter(log => {
      if (log.startTime < start || log.startTime > end) return false;
      if (!log.scopeIds?.includes(majorGoal.scopeId)) return false;
      if (majorGoal.filterActivityIds && majorGoal.filterActivityIds.length > 0) {
        return majorGoal.filterActivityIds.includes(log.activityId);
      }
      return true;
    });

    if (majorGoal.metric === 'frequency_days') {
      // 活跃天数：统计有记录的天数
      const uniqueDays = new Set(
        baseFilteredLogs.map(log => new Date(log.startTime).toDateString())
      );
      totalCurrent = uniqueDays.size;
    } else if (majorGoal.metric === 'record_count') {
      // 记录条数：统计有效记录数
      totalCurrent = baseFilteredLogs.length;
    } else {
      // 时长相关：duration_raw, duration_weighted, duration_limit
      if (majorGoal.metric === 'duration_weighted') {
        // 有效时长：考虑专注度
        totalCurrent = baseFilteredLogs.reduce((sum, log) => {
          const weight = log.focusScore ? log.focusScore / 5 : 1;
          return sum + log.duration * weight;
        }, 0);
      } else {
        // 原始时长或时长上限
        totalCurrent = baseFilteredLogs.reduce((sum, log) => sum + log.duration, 0);
      }
    }
  }
  
  const percentage = target > 0 ? (totalCurrent / target) * 100 : 0;
  
  return {
    current: totalCurrent,
    target,
    percentage: Math.min(percentage, 100)
  };
};

/**
 * 自动计算大目标的时间范围
 * @param goals - 子目标列表
 * @returns 时间范围（开始日期和结束日期）
 */
export const calculateMajorGoalTimeRange = (
  goals: Goal[]
): { startDate: string; endDate: string } => {
  if (goals.length === 0) {
    return { startDate: '', endDate: '' };
  }
  
  // 按开始时间排序
  const sortedGoals = [...goals].sort((a, b) => 
    a.startDate.localeCompare(b.startDate)
  );
  
  // 找到最早的开始时间和最晚的结束时间
  const startDate = sortedGoals[0].startDate;
  const endDate = sortedGoals.reduce((latest, goal) => {
    return goal.endDate > latest ? goal.endDate : latest;
  }, sortedGoals[0].endDate);
  
  return { startDate, endDate };
};

/**
 * 检查时间范围是否重叠
 * @param newGoal - 新目标的时间范围
 * @param existingGoals - 现有目标列表
 * @returns 重叠检查结果
 */
export const checkTimeOverlap = (
  newGoal: { startDate: string; endDate: string },
  existingGoals: Goal[]
): { hasOverlap: boolean; overlappingGoals: Goal[] } => {
  const newStart = new Date(newGoal.startDate).getTime();
  const newEnd = new Date(newGoal.endDate).getTime();
  
  const overlappingGoals = existingGoals.filter(goal => {
    const goalStart = new Date(goal.startDate).getTime();
    const goalEnd = new Date(goal.endDate).getTime();
    
    // 检查是否有重叠：新目标的开始时间在现有目标的时间范围内，或新目标的结束时间在现有目标的时间范围内
    return (newStart <= goalEnd && newEnd >= goalStart);
  });
  
  return {
    hasOverlap: overlappingGoals.length > 0,
    overlappingGoals
  };
};

/**
 * 验证目标类型是否与大目标一致
 * @param majorGoal - 大目标对象
 * @param goal - 目标对象
 * @returns 是否一致
 */
export const validateGoalMetric = (
  majorGoal: MajorGoal,
  goal: Goal
): boolean => {
  return majorGoal.metric === goal.metric;
};

/**
 * 获取大目标的子目标列表（按时间排序）
 * @param majorGoalId - 大目标 ID
 * @param goals - 所有目标列表
 * @returns 排序后的子目标列表
 */
export const getMajorGoalChildren = (
  majorGoalId: string,
  goals: Goal[]
): Goal[] => {
  return goals
    .filter(g => g.majorGoalId === majorGoalId)
    .sort((a, b) => {
      const orderA = typeof a.order === 'number' ? a.order : Number.POSITIVE_INFINITY;
      const orderB = typeof b.order === 'number' ? b.order : Number.POSITIVE_INFINITY;
      const diff = orderA - orderB;
      if (diff !== 0) return diff;
      return a.startDate.localeCompare(b.startDate);
    });
};

/**
 * 更新大目标的时间范围（基于子目标）
 * @param majorGoal - 大目标对象
 * @param goals - 所有目标列表
 * @returns 更新后的大目标对象
 */
export const updateMajorGoalTimeRange = (
  majorGoal: MajorGoal,
  goals: Goal[]
): MajorGoal => {
  const childGoals = getMajorGoalChildren(majorGoal.id, goals);
  const { startDate, endDate } = calculateMajorGoalTimeRange(childGoals);
  
  return {
    ...majorGoal,
    startDate,
    endDate,
    updatedAt: new Date().toISOString()
  };
};

/**
 * 验证子目标是否可以添加到大目标
 * @param majorGoal - 大目标对象
 * @param goal - 要添加的目标对象
 * @returns 验证结果和错误信息
 */
export const validateGoalForMajorGoal = (
  majorGoal: MajorGoal,
  goal: Goal
): { valid: boolean; error?: string } => {
  // 检查类型是否一致
  if (!validateGoalMetric(majorGoal, goal)) {
    return {
      valid: false,
      error: `目标类型不匹配。大目标类型为 ${majorGoal.metric}，但目标类型为 ${goal.metric}`
    };
  }
  
  // 检查是否属于同一领域
  if (majorGoal.scopeId !== goal.scopeId) {
    return {
      valid: false,
      error: '目标必须属于同一领域'
    };
  }
  
  return { valid: true };
};

/**
 * 获取大目标的状态（基于时间和进度）
 * @param majorGoal - 大目标对象
 * @param progress - 进度信息
 * @returns 状态描述
 */
export const getMajorGoalStatus = (
  majorGoal: MajorGoal,
  progress: { percentage: number }
): {
  isExpired: boolean;
  isCompleted: boolean;
  daysRemaining: number;
} => {
  const now = Date.now();
  const endTime = new Date(majorGoal.endDate).setHours(23, 59, 59, 999);
  const isExpired = now > endTime;
  const daysRemaining = Math.ceil((endTime - now) / (1000 * 60 * 60 * 24));
  
  // 判断是否完成
  const isLimitGoal = majorGoal.metric === 'duration_limit';
  const isCompleted = isLimitGoal
    ? progress.percentage < 100  // 负向目标：进度 < 100% 为成功
    : progress.percentage >= 100; // 正向目标：进度 >= 100% 为成功
  
  return {
    isExpired,
    isCompleted,
    daysRemaining
  };
};
