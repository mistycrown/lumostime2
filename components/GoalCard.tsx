import React from 'react';
import { Goal, Log, TodoItem } from '../types';
import { Target, Edit2, Trash2, Archive } from 'lucide-react';
import { calculateGoalProgress, formatGoalValue, getGoalMetricLabel } from '../utils/goalUtils';

interface GoalCardProps {
    goal: Goal;
    logs: Log[];
    todos: TodoItem[];
    onEdit?: (goal: Goal) => void;
    onDelete?: (goalId: string) => void;
    onArchive?: (goalId: string) => void; // 归档操作
    compact?: boolean; // 紧凑模式（用于ScopeView）
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, logs, todos, onEdit, onDelete, onArchive, compact = false }) => {
    const { current, target, percentage } = calculateGoalProgress(goal, logs, todos);

    // 判断是否为归档目标
    const isArchived = goal.status === 'archived';

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
            <div className={`p-2 ${isArchived ? 'opacity-50' : ''}`}>
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
        <div
            className={`rounded-xl p-4 transition-all cursor-pointer ${isArchived
                    ? 'bg-stone-50 border-2 border-dashed border-stone-300 opacity-70 hover:opacity-90'
                    : 'bg-white border border-stone-100 shadow-sm hover:shadow-md'
                }`}
            onClick={() => onEdit?.(goal)}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Target size={16} className={isLimitGoal ? 'text-red-600' : (isArchived ? 'text-stone-400' : 'text-[#2F4F4F]')} />
                        <h4 className={`text-base font-bold truncate ${isArchived ? 'text-stone-400' : 'text-stone-900'
                            }`}>{goal.title}</h4>
                        {isArchived && (
                            <span className="px-2 py-0.5 bg-stone-200 text-stone-500 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                已归档
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-stone-400">
                        <span className="font-medium uppercase tracking-wider">{getGoalMetricLabel(goal.metric)}</span>
                        <span className="text-stone-300">•</span>
                        <span>{formatDate(goal.startDate)} - {formatDate(goal.endDate)}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                {(onEdit || onDelete || onArchive) && (
                    <div className="flex items-center gap-1 ml-2">
                        {onArchive && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onArchive(goal.id);
                                }}
                                title={isArchived ? '恢复目标' : '归档目标'}
                                className={`p-1.5 rounded-md transition-colors ${isArchived
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
                                    onEdit(goal);
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
                                    onDelete(goal.id);
                                }}
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
