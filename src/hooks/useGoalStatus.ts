/**
 * @file useGoalStatus.ts
 * @input Goal, Logs, Todos
 * @output Goal status and progress information
 * @pos Hook (Goal Status)
 * @description Custom hook for calculating goal status based on progress and deadline
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { useMemo } from 'react';
import { Goal, Log, TodoItem } from '../types';
import { calculateGoalProgress } from '../utils/goalUtils';

export type GoalStatus = 
  // 简化后的状态
  | 'completed'           // 完成（包括按时和延期）
  | 'failed'              // 失败（过期未完成或超标）
  | 'in_progress';        // 进行中

export interface GoalStatusInfo {
  status: GoalStatus;
  progress: {
    current: number;
    target: number;
    percentage: number;
  };
  isCompleted: boolean;
  isFailed: boolean;
  needsAlert: boolean;  // 是否需要显示提示
  daysUntilDeadline: number;
  isExpired: boolean;
}

export const useGoalStatus = (
  goal: Goal,
  logs: Log[],
  todos: TodoItem[]
): GoalStatusInfo => {
  return useMemo(() => {
    const { current, target, percentage } = calculateGoalProgress(goal, logs, todos);
    
    const now = Date.now();
    const endTime = new Date(goal.endDate).setHours(23, 59, 59, 999);
    const isExpired = now > endTime;
    const daysUntilDeadline = Math.ceil((endTime - now) / (1000 * 60 * 60 * 24));
    const isLimitGoal = goal.metric === 'duration_limit';
    
    let status: GoalStatus;
    
    // 统一逻辑：只在截止日期到达时才判定成功或失败
    if (!isExpired) {
      // 未到截止日期，都是进行中
      status = 'in_progress';
    } else {
      // 已到截止日期，根据进度判定
      if (isLimitGoal) {
        // 负向目标：进度 < 100% 为成功
        status = percentage < 100 ? 'completed' : 'failed';
      } else {
        // 正向目标：进度 >= 100% 为成功
        status = percentage >= 100 ? 'completed' : 'failed';
      }
    }
    
    const isCompleted = status === 'completed';
    const isFailed = status === 'failed';
    const needsAlert = isCompleted || isFailed;  // 只有完成或失败需要提示
    
    return {
      status,
      progress: {
        current,
        target,
        percentage
      },
      isCompleted,
      isFailed,
      needsAlert,
      daysUntilDeadline,
      isExpired
    };
  }, [goal, logs, todos]);
};
