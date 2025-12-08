import React from 'react';
import { Goal, Log, TodoItem } from '../types';
import { Target, Edit2, Trash2 } from 'lucide-react';
import { calculateGoalProgress, formatGoalValue, getGoalMetricLabel } from '../utils/goalUtils';

interface GoalCardProps {
    goal: Goal;
    logs: Log[];
    todos: TodoItem[];
    onEdit?: (goal: Goal) => void;
    onDelete?: (goalId: string) => void;
    compact?: boolean; // 紧凑模式（用于ScopeView）
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, logs, todos, onEdit, onDelete, compact = false }) => {
    const { current, target, percentage } = calculateGoalProgress(goal, logs, todos);

    // 判断是否为反向目标（时长上限）
    const isLimitGoal = goal.metric === 'duration_limit';

    // 进度条颜色
    const progressColor = isLimitGoal
        ? (percentage > 80 ? 'bg-red-900' : 'bg-red-700')
        : 'bg-[#2F4F4F]';

    const progressBgColor = isLimitGoal ? 'bg-red-50' : 'bg-stone-100';

    // 格式化日期显示
    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    if (compact) {
        // 紧凑模式：用于ScopeView
        return (
            <div className="p-2">
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <Target size={12} className="text-stone-400 flex-shrink-0" />
                        <span className="text-xs font-bold text-stone-700 truncate">{goal.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-stone-500 ml-2 flex-shrink-0">
                        {formatGoalValue(current, goal.metric)} / {formatGoalValue(target, goal.metric)}
                    </span>
                </div>
                <div className={`h-1 w-full ${progressBgColor} rounded-full overflow-hidden`}>
                    <div
                        className={`h-full ${progressColor} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        );
    }

    // 完整模式：用于ScopeDetailView
    return (
        <div className="bg-white border border-stone-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Target size={16} className={isLimitGoal ? 'text-red-600' : 'text-[#2F4F4F]'} />
                        <h4 className="text-base font-bold text-stone-900 truncate">{goal.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-stone-400">
                        <span className="font-medium uppercase tracking-wider">{getGoalMetricLabel(goal.metric)}</span>
                        <span className="text-stone-300">•</span>
                        <span>{formatDate(goal.startDate)} - {formatDate(goal.endDate)}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                {(onEdit || onDelete) && (
                    <div className="flex items-center gap-1 ml-2">
                        {onEdit && (
                            <button
                                onClick={() => onEdit(goal)}
                                className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-md transition-colors"
                            >
                                <Edit2 size={14} />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => onDelete(goal.id)}
                                className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
                <div className={`h-2 w-full ${progressBgColor} rounded-full overflow-hidden`}>
                    <div
                        className={`h-full ${progressColor} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-stone-700">
                    {formatGoalValue(current, goal.metric)} / {formatGoalValue(target, goal.metric)}
                </span>
                <span className="font-bold text-stone-900">
                    {percentage.toFixed(1)}%
                </span>
            </div>

            {/* Motivation */}
            {goal.motivation && (
                <div className="mt-3 pt-3 border-t border-stone-100">
                    <p className="text-xs text-stone-500">{goal.motivation}</p>
                </div>
            )}
        </div>
    );
};
