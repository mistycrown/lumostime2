/**
 * @file GoalCard.tsx
 * @input goal object, logs, todos
 * @output Goal Progress Card (Compact/Full)
 * @pos Component (Display)
 * @description Displays the progress of a user's goal, supporting multiple metrics (duration, count, frequency) and rendering interactive actions.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React from 'react';
import { Goal, Log, TodoItem } from '../types';
import { Target, Edit2, Trash2, Archive, CheckCircle2, XCircle } from 'lucide-react';
import { calculateGoalProgress, formatGoalValue, getGoalMetricLabel } from '../utils/goalUtils';
import { formatShortDate } from '../utils/dateUtils';

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

    // 计算目标状态
    const now = Date.now();
    const endTime = new Date(goal.endDate).setHours(23, 59, 59, 999);
    const isExpired = now > endTime;
    const daysUntilDeadline = Math.ceil((endTime - now) / (1000 * 60 * 60 * 24));

    // 根据状态选择图标
    const getGoalIcon = () => {
        if (isLimitGoal) {
            // 负向目标
            if (percentage >= 100) return XCircle; // 超标（不管是否过期，都显示失败图标）
            if (isExpired) return CheckCircle2; // 成功控制
            return Target; // 进行中
        } else {
            // 正向目标
            if (percentage >= 100) return CheckCircle2; // 达成目标（不管是否过期，都显示完成图标）
            if (isExpired) return XCircle; // 过期未完成
            return Target; // 进行中
        }
    };

    const GoalIcon = getGoalIcon();

    // 进度条样式（统一使用主题色）
    const progressStyle = {
        backgroundColor: 'var(--progress-bar-fill)'
    };
    
    const progressBgStyle = {
        backgroundColor: 'var(--progress-bar-bg)'
    };

    if (compact) {
        // 紧凑模式：用于ScopeView
        const endDate = new Date(goal.endDate);
        const formattedEndDate = `${endDate.getMonth() + 1}-${endDate.getDate()}`;
        
        return (
            <div className={`p-2 ${isArchived ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <GoalIcon size={12} className="flex-shrink-0" style={{ color: 'var(--accent-color)' }} />
                        <span className="text-xs font-bold text-stone-700 truncate">{goal.title}</span>
                        <span className="text-[10px] text-stone-400 flex-shrink-0">
                            {formattedEndDate}
                        </span>
                    </div>
                    <span className="text-[10px] font-mono text-stone-500 ml-2 flex-shrink-0">
                        {formatGoalValue(current, goal.metric)} / {formatGoalValue(target, goal.metric)}
                    </span>
                </div>
                <div className={`h-1 w-full rounded-full overflow-hidden relative`} style={progressBgStyle}>
                    {isLimitGoal ? (
                        // 反向目标：从右侧填充
                        <div
                            className="h-full rounded-full transition-all duration-500 absolute right-0"
                            style={{ ...progressStyle, width: `${percentage}%`, opacity: 0.8 }}
                        />
                    ) : (
                        // 正向目标：从左侧填充
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ ...progressStyle, width: `${percentage}%` }}
                        />
                    )}
                </div>
            </div>
        );
    }

    // 完整模式：用于ScopeDetailView - 印刷极简风格
    return (
        <div
            className={`py-4 border-b border-stone-200 last:border-b-0 cursor-pointer ${isArchived ? 'opacity-60' : ''}`}
            onClick={() => onEdit?.(goal)}
        >
            {/* Header - 印刷风格标题行 */}
            <div className="flex items-baseline justify-between mb-2">
                <div className="flex-1 min-w-0 flex items-baseline gap-3">
                    <GoalIcon 
                        size={14} 
                        className={isLimitGoal ? 'text-red-600 flex-shrink-0 mt-0.5' : (isArchived ? 'text-stone-300 flex-shrink-0 mt-0.5' : 'flex-shrink-0 mt-0.5')}
                        style={!isLimitGoal && !isArchived ? { color: 'var(--accent-color)' } : undefined}
                    />
                    <h4 className={`text-lg font-bold leading-tight ${isArchived ? 'text-stone-400' : 'text-stone-900'}`}>
                        {goal.title}
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
                                    onArchive(goal.id);
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
                                    onEdit(goal);
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
                                    onDelete(goal.id);
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
                    {getGoalMetricLabel(goal.metric)}
                </span>
                <span className="text-stone-300">·</span>
                <span className="font-mono">
                    {formatShortDate(goal.startDate)} / {formatShortDate(goal.endDate)}
                </span>
                {!isArchived && !isExpired && daysUntilDeadline > 0 && (
                    <>
                        <span className="text-stone-300">·</span>
                        <span>剩余 {daysUntilDeadline} 天</span>
                    </>
                )}
            </div>

            {/* Progress - 极简进度条 */}
            <div className="mb-2 ml-7">
                <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-xs font-mono text-stone-600">
                        {formatGoalValue(current, goal.metric)} / {formatGoalValue(target, goal.metric)}
                    </span>
                    <span className="text-base font-bold text-stone-900 tabular-nums">
                        {percentage.toFixed(1)}%
                    </span>
                </div>
                <div className="h-1 w-full rounded-full overflow-hidden relative" style={progressBgStyle}>
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

            {/* Motivation - 引用样式 */}
            {goal.motivation && (
                <div className="mt-3 ml-7 pl-3 border-l-2 border-stone-200">
                    <p className="text-xs text-stone-500 italic leading-relaxed">{goal.motivation}</p>
                </div>
            )}
        </div>
    );
};
