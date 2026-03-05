/**
 * @file MajorGoalCard.tsx
 * @input MajorGoal object, goals, logs, todos
 * @output Major Goal Card with progress and child goals
 * @pos Component (Display)
 * @description Displays a major goal card with overall progress, child goals list, and management actions.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState } from 'react';
import { MajorGoal, Goal, Log, TodoItem } from '../types';
import { Target, Edit2, Trash2, Archive, ChevronDown, ChevronUp, Plus, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { 
  calculateMajorGoalProgress, 
  getMajorGoalChildren,
  getMajorGoalStatus 
} from '../utils/majorGoalUtils';
import { calculateGoalProgress, formatGoalValue, getGoalMetricLabel } from '../utils/goalUtils';
import { formatShortDate, formatShortDateWithYear } from '../utils/dateUtils';

interface MajorGoalCardProps {
  majorGoal: MajorGoal;
  goals: Goal[];
  logs: Log[];
  todos: TodoItem[];
  onEdit?: (majorGoal: MajorGoal) => void;
  onDelete?: (majorGoalId: string) => void;
  onArchive?: (majorGoalId: string) => void;
  onAddChildGoal?: (majorGoalId: string) => void;
  onEditChildGoal?: (goal: Goal) => void;
}

export const MajorGoalCard: React.FC<MajorGoalCardProps> = ({
  majorGoal,
  goals,
  logs,
  todos,
  onEdit,
  onDelete,
  onArchive,
  onAddChildGoal,
  onEditChildGoal
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // 获取子目标列表（按时间排序）
  const childGoals = getMajorGoalChildren(majorGoal.id, goals);

  // 计算总进度
  const { current, target, percentage } = calculateMajorGoalProgress(
    majorGoal,
    goals,
    logs,
    todos
  );

  // 获取状态信息
  const { isExpired, daysRemaining } = getMajorGoalStatus(
    majorGoal,
    { percentage }
  );

  // 判断是否为归档目标
  const isArchived = majorGoal.status === 'archived';

  // 判断是否为反向目标
  const isLimitGoal = majorGoal.metric === 'duration_limit';

  // 进度条样式（反向目标也使用主题色）
  const progressStyle = {
    backgroundColor: 'var(--accent-color)'
  };

  const progressBgStyle = {
    backgroundColor: 'var(--progress-bar-bg)'
  };

  // 获取子目标的状态图标
  const getChildGoalIcon = (goal: Goal) => {
    const { percentage } = calculateGoalProgress(goal, logs, todos);
    const now = Date.now();
    const endTime = new Date(goal.endDate).setHours(23, 59, 59, 999);
    const isGoalExpired = now > endTime;

    if (isLimitGoal) {
      if (percentage >= 100) return XCircle; // 超标
      if (isGoalExpired) return CheckCircle2; // 成功控制
      return Clock; // 进行中
    } else {
      if (percentage >= 100) return CheckCircle2; // 达成
      if (isGoalExpired) return XCircle; // 过期未完成
      return Clock; // 进行中
    }
  };

  return (
    <div className="py-4 border-b border-stone-200 last:border-b-0">
      {/* Header - 印刷风格标题行 */}
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex-1 min-w-0 flex items-baseline gap-3">
          <Target 
            size={14} 
            className="flex-shrink-0 mt-0.5"
            style={isArchived ? { color: 'var(--text-tertiary)' } : { color: 'var(--accent-color)' }}
          />
          <h4 className={`text-lg font-bold leading-tight ${
            isArchived ? 'text-stone-400' : 'text-stone-900'
          }`}>
            {majorGoal.title}
          </h4>
          {isArchived && (
            <span className="text-[10px] text-stone-400 uppercase tracking-widest font-medium">
              已归档
            </span>
          )}
        </div>

        {/* Action Buttons - 极简图标 */}
        {(onEdit || onDelete || onArchive) && (
          <div className="flex items-center gap-2 ml-4">
            {onArchive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(majorGoal.id);
                }}
                title={isArchived ? '恢复' : '归档'}
                className="text-stone-400 hover:text-stone-700 transition-colors"
              >
                <Archive size={16} />
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(majorGoal);
                }}
                className="text-stone-400 hover:text-stone-700 transition-colors"
              >
                <Edit2 size={16} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(majorGoal.id);
                }}
                className="text-stone-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Meta Info - 印刷风格元信息 */}
      <div className="flex items-center gap-3 text-[11px] text-stone-500 mb-3 ml-7">
        <span className="font-medium uppercase tracking-wider">
          {getGoalMetricLabel(majorGoal.metric)}
        </span>
        <span className="text-stone-300">·</span>
        <span className="font-mono">
          {majorGoal.startDate ? formatShortDateWithYear(majorGoal.startDate) : '—'} / {majorGoal.endDate ? formatShortDateWithYear(majorGoal.endDate) : '—'}
        </span>
        {!isArchived && !isExpired && daysRemaining > 0 && (
          <>
            <span className="text-stone-300">·</span>
            <span>剩余 {daysRemaining} 天</span>
          </>
        )}
      </div>

      {/* Description */}
      {majorGoal.description && (
        <p className="text-sm text-stone-600 mb-3 ml-7 leading-relaxed">{majorGoal.description}</p>
      )}

      {/* Overall Progress - 极简进度条 */}
      <div className="mb-4 ml-7">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs text-stone-500">总进度</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-mono text-stone-600">
              {formatGoalValue(current, majorGoal.metric)} / {formatGoalValue(target, majorGoal.metric)}
            </span>
            <span className="text-base font-bold text-stone-900 tabular-nums">
              {percentage.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className={`h-1 w-full rounded-full overflow-hidden relative`} style={progressBgStyle}>
          {isLimitGoal ? (
            // 反向目标：从右侧填充
            <div
              className="h-full transition-all duration-500 absolute right-0"
              style={{ ...progressStyle, width: `${percentage}%`, opacity: 0.8 }}
            />
          ) : (
            // 正向目标：从左侧填充
            <div
              className="h-full transition-all duration-500"
              style={{ ...progressStyle, width: `${percentage}%` }}
            />
          )}
        </div>
      </div>

      {/* Child Goals List - 极简列表 */}
      {childGoals.length > 0 && (
        <div className="ml-7">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-xs text-stone-500 hover:text-stone-700 transition-colors mb-2 uppercase tracking-wider font-medium"
          >
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <span>包含 {childGoals.length} 个阶段目标</span>
          </button>

          {isExpanded && (
            <div className="space-y-3 mt-3">
              {childGoals.map(goal => {
                const { current: goalCurrent, target: goalTarget, percentage: goalPercentage } = calculateGoalProgress(goal, logs, todos);
                const GoalIcon = getChildGoalIcon(goal);
                
                // 判断是否为反向目标
                const isChildLimitGoal = goal.metric === 'duration_limit';

                return (
                  <div
                    key={goal.id}
                    onClick={() => onEditChildGoal?.(goal)}
                    className="group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <GoalIcon 
                        size={14} 
                        className="flex-shrink-0"
                        style={{ color: 'var(--accent-color)' }}
                      />
                      <span className="text-sm font-medium text-stone-700 group-hover:text-stone-900 flex-1 leading-tight">
                        {goal.title}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono flex-shrink-0">
                        {formatShortDate(goal.startDate)} / {formatShortDate(goal.endDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-6">
                      <div className="flex-1 h-0.5 rounded-full overflow-hidden relative bg-stone-200">
                        {isChildLimitGoal ? (
                          // 反向目标：从右侧填充
                          <div
                            className="h-full transition-all absolute right-0"
                            style={{
                              backgroundColor: 'var(--accent-color)',
                              width: `${goalPercentage}%`,
                              opacity: 0.8
                            }}
                          />
                        ) : (
                          // 正向目标：从左侧填充
                          <div
                            className="h-full transition-all"
                            style={{
                              backgroundColor: 'var(--accent-color)',
                              width: `${goalPercentage}%`
                            }}
                          />
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-stone-500 tabular-nums w-10 text-right">
                        {goalPercentage.toFixed(0)}%
                      </span>
                      <span className="text-[10px] font-mono text-stone-400 flex-shrink-0">
                        {formatGoalValue(goalCurrent, goal.metric)}/{formatGoalValue(goalTarget, goal.metric)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Child Goal Button - 极简按钮 */}
      {onAddChildGoal && !isArchived && (
        <button
          onClick={() => onAddChildGoal(majorGoal.id)}
          className="w-full mt-4 ml-7 py-2 text-stone-400 hover:text-stone-600 transition-colors text-xs font-medium flex items-center gap-1.5 border-t border-dashed border-stone-200 pt-3"
        >
          <Plus size={14} />
          <span className="uppercase tracking-wider">添加阶段目标</span>
        </button>
      )}

      {/* Motivation - 引用样式 */}
      {majorGoal.motivation && (
        <div className="mt-3 ml-7 pl-3 border-l-2 border-stone-200">
          <p className="text-xs text-stone-500 italic leading-relaxed">{majorGoal.motivation}</p>
        </div>
      )}
    </div>
  );
};
