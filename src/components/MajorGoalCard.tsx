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
import { Target, Edit2, Trash2, Archive, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { 
  calculateMajorGoalProgress, 
  getMajorGoalChildren,
  getMajorGoalStatus 
} from '../utils/majorGoalUtils';
import { calculateGoalProgress, formatGoalValue, getGoalMetricLabel } from '../utils/goalUtils';
import { formatShortDate } from '../utils/dateUtils';

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
  const { isExpired, isCompleted, daysRemaining } = getMajorGoalStatus(
    majorGoal,
    { percentage }
  );

  // 判断是否为归档目标
  const isArchived = majorGoal.status === 'archived';

  // 判断是否为反向目标
  const isLimitGoal = majorGoal.metric === 'duration_limit';

  // 进度条颜色
  const progressColor = isLimitGoal
    ? (percentage > 80 ? 'bg-red-900' : 'bg-red-700')
    : '';

  const progressBgColor = isLimitGoal ? 'bg-red-50' : '';

  // 进度条样式（使用CSS变量）
  const progressStyle = !isLimitGoal ? {
    backgroundColor: 'var(--progress-bar-fill)'
  } : undefined;

  const progressBgStyle = !isLimitGoal ? {
    backgroundColor: 'var(--progress-bar-bg)'
  } : undefined;

  // 获取子目标的状态图标
  const getChildGoalIcon = (goal: Goal) => {
    const { percentage } = calculateGoalProgress(goal, logs, todos);
    const now = Date.now();
    const endTime = new Date(goal.endDate).setHours(23, 59, 59, 999);
    const isGoalExpired = now > endTime;

    if (isLimitGoal) {
      if (percentage >= 100) return '✗'; // 超标
      if (isGoalExpired) return '✓'; // 成功控制
      return '⏳'; // 进行中
    } else {
      if (percentage >= 100) return '✓'; // 达成
      if (isGoalExpired) return '✗'; // 过期未完成
      return '⏳'; // 进行中
    }
  };

  return (
    <div
      className={`rounded-xl p-4 transition-all ${
        isArchived
          ? 'bg-stone-50 border-2 border-dashed border-stone-300 opacity-70'
          : 'bg-white border border-stone-100 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Target 
              size={16} 
              className={isLimitGoal ? 'text-red-600' : (isArchived ? 'text-stone-400' : '')}
              style={!isLimitGoal && !isArchived ? { color: 'var(--accent-color)' } : undefined}
            />
            <h4 className={`text-base font-bold truncate ${
              isArchived ? 'text-stone-400' : 'text-stone-900'
            }`}>
              {majorGoal.title}
            </h4>
            {isArchived && (
              <span className="px-2 py-0.5 bg-stone-200 text-stone-500 text-[10px] font-bold rounded-full uppercase tracking-wider">
                已归档
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-stone-400">
            <span className="font-medium uppercase tracking-wider">
              {getGoalMetricLabel(majorGoal.metric)}
            </span>
            <span className="text-stone-300">•</span>
            <span>
              {majorGoal.startDate ? formatShortDate(majorGoal.startDate) : '待添加'} - {majorGoal.endDate ? formatShortDate(majorGoal.endDate) : '待添加'}
            </span>
            {!isArchived && !isExpired && daysRemaining > 0 && (
              <>
                <span className="text-stone-300">•</span>
                <span>剩余 {daysRemaining} 天</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {(onEdit || onDelete || onArchive) && (
          <div className="flex items-center gap-1 ml-2">
            {onArchive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(majorGoal.id);
                }}
                title={isArchived ? '恢复大目标' : '归档大目标'}
                className={`p-1.5 rounded-md transition-colors ${
                  isArchived
                    ? 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    : 'text-stone-400 hover:text-orange-600 hover:bg-orange-50'
                }`}
              >
                <Archive size={14} />
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(majorGoal);
                }}
                className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-md transition-colors"
              >
                <Edit2 size={14} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(majorGoal.id);
                }}
                className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {majorGoal.description && (
        <p className="text-xs text-stone-500 mb-3">{majorGoal.description}</p>
      )}

      {/* Overall Progress Bar */}
      <div className="mb-3">
        <div className={`h-2 w-full rounded-full overflow-hidden ${progressBgColor}`} style={progressBgStyle}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={progressStyle ? { ...progressStyle, width: `${percentage}%` } : { width: `${percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <span className="font-mono font-bold text-stone-700">
            总进度: {formatGoalValue(current, majorGoal.metric)} / {formatGoalValue(target, majorGoal.metric)}
          </span>
          <span className="font-bold text-stone-900">
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Child Goals List */}
      {childGoals.length > 0 && (
        <div className="border-t border-stone-100 pt-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 w-full text-left mb-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>包含 {childGoals.length} 个阶段目标</span>
          </button>

          {isExpanded && (
            <div className="space-y-2">
              {childGoals.map(goal => {
                const { current: goalCurrent, target: goalTarget, percentage: goalPercentage } = calculateGoalProgress(goal, logs, todos);
                const icon = getChildGoalIcon(goal);

                return (
                  <div
                    key={goal.id}
                    onClick={() => onEditChildGoal?.(goal)}
                    className="p-2 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{icon}</span>
                      <span className="text-xs font-bold text-stone-700 flex-1 truncate">
                        {goal.title}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {formatShortDate(goal.startDate)} ~ {formatShortDate(goal.endDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            backgroundColor: 'var(--accent-color)',
                            width: `${goalPercentage}%`
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-stone-500">
                        {goalPercentage.toFixed(0)}%
                      </span>
                      <span className="text-[10px] font-mono text-stone-400">
                        ({formatGoalValue(goalCurrent, goal.metric)}/{formatGoalValue(goalTarget, goal.metric)})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Child Goal Button */}
      {onAddChildGoal && !isArchived && (
        <button
          onClick={() => onAddChildGoal(majorGoal.id)}
          className="w-full mt-3 py-2 border border-dashed border-stone-200 rounded-lg text-stone-400 hover:text-stone-600 hover:border-stone-300 transition-colors text-xs font-medium flex items-center justify-center gap-1"
        >
          <Plus size={14} />
          <span>添加阶段目标</span>
        </button>
      )}

      {/* Motivation */}
      {majorGoal.motivation && (
        <div className="mt-3 pt-3 border-t border-stone-100">
          <p className="text-xs text-stone-500">{majorGoal.motivation}</p>
        </div>
      )}
    </div>
  );
};
