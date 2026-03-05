/**
 * @file GoalStatusAlert.tsx
 * @input Goal status information, callback functions, MajorGoals
 * @output Interactive status alert card
 * @pos Component (Alert)
 * @description Displays interactive alert cards for different goal statuses. Supports both independent goals and goals within a major goal series.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React from 'react';
import confetti from 'canvas-confetti';
import { Goal, MajorGoal } from '../types';
import { GoalStatusInfo } from '../hooks/useGoalStatus';
import { formatGoalValue } from '../utils/goalUtils';

interface GoalStatusAlertProps {
  goal: Goal;
  statusInfo: GoalStatusInfo;
  majorGoals?: MajorGoal[]; // 目标系列列表
  onArchive: (goalId: string) => void;
  onExtend: (goalId: string, days: number) => void;
  onIncreaseTarget: (goalId: string, increaseAmount: number) => void;
  onCreate?: (templateGoal?: Goal, majorGoalId?: string) => void; // 修改：支持传递目标系列ID
  onDismiss: () => void;
}

export const GoalStatusAlert: React.FC<GoalStatusAlertProps> = ({
  goal,
  statusInfo,
  majorGoals = [],
  onArchive,
  onExtend,
  onIncreaseTarget,
  onCreate,
  onDismiss
}) => {
  const { status, progress, daysUntilDeadline } = statusInfo;
  const isLimitGoal = goal.metric === 'duration_limit';
  
  // 检查目标是否已归档（用于判断显示第一步还是第二步）
  const isArchived = goal.status === 'archived';
  
  // 检查目标是否属于目标系列
  const belongsToMajorGoal = !!goal.majorGoalId;
  const majorGoal = belongsToMajorGoal ? majorGoals.find(mg => mg.id === goal.majorGoalId) : undefined;

  // 烟花效果函数
  const triggerFireworks = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // 从两侧发射烟花
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  // 场景A：目标完成
  if (status === 'completed') {
    if (isArchived) {
      // 第二步：引导创建新目标
      return (
        <div className="rounded-xl p-4 mb-4" style={{ 
          backgroundColor: 'color-mix(in srgb, var(--accent-color) 8%, white)',
          borderColor: 'color-mix(in srgb, var(--accent-color) 20%, white)',
          borderWidth: '1px'
        }}>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--accent-color)' }}>目标已归档</h3>
              <p className="text-xs mb-3" style={{ color: 'color-mix(in srgb, var(--accent-color) 70%, black)' }}>
                {belongsToMajorGoal && majorGoal 
                  ? `继续「${majorGoal.title}」系列的下一个阶段？` 
                  : '想要继续挑战吗？'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (belongsToMajorGoal && goal.majorGoalId) {
                      // 属于目标系列：只传递目标系列ID
                      onCreate?.(undefined, goal.majorGoalId);
                    } else {
                      // 独立目标：传递当前目标作为模板
                      onCreate?.(goal);
                    }
                    onDismiss();
                  }}
                  className="px-4 py-2 text-white text-xs font-medium rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--accent-color)' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  {belongsToMajorGoal ? '创建下一阶段' : '创建下一个目标'}
                </button>
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 bg-white text-xs font-medium rounded-lg border transition-colors"
                  style={{ 
                    color: 'var(--accent-color)',
                    borderColor: 'color-mix(in srgb, var(--accent-color) 30%, white)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent-color) 5%, white)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 第一步：显示完成提示
    const completionMessage = isLimitGoal 
      ? `太棒了！你成功控制了「${goal.title}」`
      : `恭喜！你完成了目标「${goal.title}」`;
    
    const saved = isLimitGoal ? progress.target - progress.current : 0;
    const controlRate = isLimitGoal ? ((progress.target - progress.current) / progress.target * 100).toFixed(0) : 0;

    return (
      <div className="rounded-xl p-4 mb-4" style={{ 
        backgroundColor: 'color-mix(in srgb, var(--accent-color) 8%, white)',
        borderColor: 'color-mix(in srgb, var(--accent-color) 20%, white)',
        borderWidth: '1px'
      }}>
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--accent-color)' }}>
              {completionMessage}
            </h3>
            <div className="text-xs space-y-0.5 mb-3" style={{ color: 'color-mix(in srgb, var(--accent-color) 70%, black)' }}>
              {isLimitGoal ? (
                <>
                  <p>实际用时：{formatGoalValue(progress.current, goal.metric)} / 上限：{formatGoalValue(progress.target, goal.metric)}</p>
                  <p>控制率：{controlRate}%（节省了{formatGoalValue(saved, goal.metric)}）</p>
                </>
              ) : (
                <>
                  <p>实际完成：{formatGoalValue(progress.current, goal.metric)} / 目标：{formatGoalValue(progress.target, goal.metric)}</p>
                  <p>完成率：{progress.percentage.toFixed(1)}%</p>
                </>
              )}
              {goal.motivation && (
                <p className="mt-2 pt-2 border-t" style={{ borderColor: 'color-mix(in srgb, var(--accent-color) 15%, white)' }}>
                  💝 {goal.motivation}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  triggerFireworks();
                  // 延迟执行归档，让烟花效果先播放
                  setTimeout(() => {
                    onArchive(goal.id);
                  }, 300);
                }}
                className="px-4 py-2 text-white text-xs font-medium rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--accent-color)' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                归档此目标
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 场景B：目标失败
  if (status === 'failed') {
    const daysOverdue = Math.abs(daysUntilDeadline);
    const remaining = isLimitGoal ? 0 : progress.target - progress.current;
    const exceeded = isLimitGoal ? progress.current - progress.target : 0;
    
    // 智能计算延长天数：至少延长到今天之后
    const minExtendDays = Math.max(7, daysOverdue + 7);
    
    // 智能计算增加上限的数值（负向目标）：
    // 确保新上限至少比当前用时多 10 小时（36000 秒）
    const baseIncrease = 36000; // 10 小时
    const increaseAmount = goal.metric === 'duration_limit' 
      ? Math.max(baseIncrease, exceeded + baseIncrease)
      : 0;

    const failureMessage = isLimitGoal
      ? `注意！「${goal.title}」已超过上限`
      : `目标「${goal.title}」已过期 ${daysOverdue} 天`;

    // 互补色：使用橙红色系
    const complementColor = '#e67e22'; // 橙色作为互补色

    return (
      <div className="rounded-xl p-4 mb-4" style={{ 
        backgroundColor: 'color-mix(in srgb, #e67e22 8%, white)',
        borderColor: 'color-mix(in srgb, #e67e22 20%, white)',
        borderWidth: '1px'
      }}>
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="text-sm font-bold mb-1" style={{ color: complementColor }}>
              {failureMessage}
            </h3>
            <div className="text-xs space-y-0.5 mb-3" style={{ color: 'color-mix(in srgb, #e67e22 70%, black)' }}>
              {isLimitGoal ? (
                <>
                  <p>当前用时：{formatGoalValue(progress.current, goal.metric)} / 上限：{formatGoalValue(progress.target, goal.metric)} ({progress.percentage.toFixed(1)}%)</p>
                  <p>超出：{formatGoalValue(exceeded, goal.metric)}</p>
                </>
              ) : (
                <>
                  <p>当前进度：{formatGoalValue(progress.current, goal.metric)} / {formatGoalValue(progress.target, goal.metric)} ({progress.percentage.toFixed(1)}%)</p>
                  <p>还差：{formatGoalValue(remaining, goal.metric)}</p>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isLimitGoal ? (
                // 负向目标：增加上限 + 重新再来
                <>
                  <button
                    onClick={() => {
                      onIncreaseTarget(goal.id, increaseAmount);
                      onDismiss();
                    }}
                    className="px-4 py-2 text-white text-xs font-medium rounded-lg transition-colors"
                    style={{ backgroundColor: complementColor }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    增加上限 {formatGoalValue(increaseAmount, goal.metric)}
                  </button>
                  <button
                    onClick={() => {
                      onArchive(goal.id);
                      if (belongsToMajorGoal && goal.majorGoalId) {
                        // 属于目标系列：只传递目标系列ID
                        onCreate?.(undefined, goal.majorGoalId);
                      } else {
                        // 独立目标：传递当前目标作为模板
                        onCreate?.(goal);
                      }
                      onDismiss();
                    }}
                    className="px-4 py-2 bg-white text-xs font-medium rounded-lg border transition-colors"
                    style={{ 
                      color: complementColor,
                      borderColor: 'color-mix(in srgb, #e67e22 30%, white)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, #e67e22 5%, white)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    重新再来
                  </button>
                </>
              ) : (
                // 正向目标：延长天数 + 重新再来
                <>
                  <button
                    onClick={() => {
                      onExtend(goal.id, minExtendDays);
                      onDismiss();
                    }}
                    className="px-4 py-2 text-white text-xs font-medium rounded-lg transition-colors"
                    style={{ backgroundColor: complementColor }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    延长 {minExtendDays} 天
                  </button>
                  <button
                    onClick={() => {
                      onArchive(goal.id);
                      if (belongsToMajorGoal && goal.majorGoalId) {
                        // 属于目标系列：只传递目标系列ID
                        onCreate?.(undefined, goal.majorGoalId);
                      } else {
                        // 独立目标：传递当前目标作为模板
                        onCreate?.(goal);
                      }
                      onDismiss();
                    }}
                    className="px-4 py-2 bg-white text-xs font-medium rounded-lg border transition-colors"
                    style={{ 
                      color: complementColor,
                      borderColor: 'color-mix(in srgb, #e67e22 30%, white)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, #e67e22 5%, white)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    重新再来
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
