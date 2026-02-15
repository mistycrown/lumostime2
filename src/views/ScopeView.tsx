/**
 * @file ScopeView.tsx
 * @input Scope List, Log Statistics
 * @output Navigation to Scope Detail
 * @pos View (Main Tab)
 * @description The main landing page for the "Scopes" (Domains) feature. Displays a card list of all active scopes with summary statistics (Total Time, Monthly Time).
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useMemo, useState } from 'react';
import { Scope, Goal, Log, TodoItem } from '../types';
import { GoalCard } from '../components/GoalCard';
import { GoalStatusAlert } from '../components/GoalStatusAlert';
import { Settings2 } from 'lucide-react';
import { IconRenderer } from '../components/IconRenderer';
import { useGoalStatus } from '../hooks/useGoalStatus';


interface ScopeViewProps {
    scopes: Scope[];
    logs: Log[];
    goals: Goal[];
    todos: TodoItem[];
    onScopeClick: (scopeId: string) => void;
    onManageClick: () => void;
    onArchiveGoal?: (goalId: string) => void;
    onExtendGoal?: (goalId: string, days: number) => void;
    onIncreaseGoalTarget?: (goalId: string, increaseAmount: number) => void;
    onAddGoal?: (scopeId: string) => void;
}

export const ScopeView: React.FC<ScopeViewProps> = ({
    scopes,
    logs,
    goals = [],
    todos = [],
    onScopeClick,
    onManageClick,
    onArchiveGoal,
    onExtendGoal,
    onIncreaseGoalTarget,
    onAddGoal
}) => {
    // 用于管理已关闭的提示
    const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
    // 用于跟踪刚刚归档的目标（显示第二步）
    const [recentlyArchivedGoals, setRecentlyArchivedGoals] = useState<Set<string>>(new Set());

    // Calculate stats for each scope
    const scopeStats = useMemo(() => {
        const stats = new Map<string, { allTime: number; thisMonth: number }>();

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        logs.forEach(log => {
            if (!log.scopeIds || log.scopeIds.length === 0) return;

            log.scopeIds.forEach(scopeId => {
                const current = stats.get(scopeId) || { allTime: 0, thisMonth: 0 };
                current.allTime += log.duration;

                const logDate = new Date(log.startTime);
                if (logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
                    current.thisMonth += log.duration;
                }

                stats.set(scopeId, current);
            });
        });

        return stats;
    }, [logs]);

    // Filter active scopes and sort by order
    const activeScopes = useMemo(() =>
        scopes.filter(s => !s.isArchived).sort((a, b) => a.order - b.order),
        [scopes]
    );

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const handleDismissAlert = (goalId: string) => {
        setDismissedAlerts(prev => new Set(prev).add(goalId));
        // 同时从最近归档列表中移除
        setRecentlyArchivedGoals(prev => {
            const newSet = new Set(prev);
            newSet.delete(goalId);
            return newSet;
        });
    };

    const handleExtend = (goalId: string, days: number) => {
        onExtendGoal?.(goalId, days);
    };

    const handleIncreaseTarget = (goalId: string, increaseAmount: number) => {
        onIncreaseGoalTarget?.(goalId, increaseAmount);
    };

    const handleArchive = (goalId: string) => {
        onArchiveGoal?.(goalId);
        // 标记为最近归档，以便显示第二步
        setRecentlyArchivedGoals(prev => new Set(prev).add(goalId));
    };

    // 为每个领域找到需要提示的目标（成功和失败分别显示）
    const ScopeGoalAlert: React.FC<{ scopeId: string; scopeGoals: Goal[] }> = ({ scopeId, scopeGoals }) => {
        // 包含活跃目标和最近归档的目标
        const allRelevantGoals = goals.filter(g => 
            g.scopeId === scopeId && 
            (g.status === 'active' || recentlyArchivedGoals.has(g.id))
        );

        // 计算每个目标的状态
        const goalsWithStatus = allRelevantGoals.map(goal => ({
            goal,
            statusInfo: useGoalStatus(goal, logs, todos)
        }));

        // 分别找出完成和失败的目标
        const completedGoals = goalsWithStatus
            .filter(({ statusInfo }) => statusInfo.isCompleted)
            .filter(({ goal }) => !dismissedAlerts.has(goal.id));

        const failedGoals = goalsWithStatus
            .filter(({ statusInfo }) => statusInfo.isFailed)
            .filter(({ goal }) => !dismissedAlerts.has(goal.id));

        return (
            <>
                {/* 显示所有完成的目标提示 */}
                {completedGoals.map(({ goal, statusInfo }) => (
                    <GoalStatusAlert
                        key={goal.id}
                        goal={goal}
                        statusInfo={statusInfo}
                        onArchive={handleArchive}
                        onExtend={handleExtend}
                        onIncreaseTarget={handleIncreaseTarget}
                        onCreate={() => onAddGoal?.(scopeId)}
                        onDismiss={() => handleDismissAlert(goal.id)}
                    />
                ))}
                
                {/* 显示所有失败的目标提示 */}
                {failedGoals.map(({ goal, statusInfo }) => (
                    <GoalStatusAlert
                        key={goal.id}
                        goal={goal}
                        statusInfo={statusInfo}
                        onArchive={handleArchive}
                        onExtend={handleExtend}
                        onIncreaseTarget={handleIncreaseTarget}
                        onCreate={() => onAddGoal?.(scopeId)}
                        onDismiss={() => handleDismissAlert(goal.id)}
                    />
                ))}
            </>
        );
    };

    return (
        <div 
            className="h-full bg-[#faf9f6] overflow-y-auto pb-24 no-scrollbar"
            id="scopes-content"
        >
            {/* Scope Cards */}
            <div className="p-6 space-y-3">
                {activeScopes.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                        <Settings2 size={48} className="mx-auto text-stone-300 mb-4" />
                        <p className="text-stone-400 mb-4">还没有领域</p>
                        <button
                            onClick={onManageClick}
                            className="px-6 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors"
                        >
                            创建第一个领域
                        </button>
                    </div>
                ) : (
                    activeScopes.map(scope => {
                        const stats = scopeStats.get(scope.id) || { allTime: 0, thisMonth: 0 };
                        const scopeGoals = goals.filter(g => g.scopeId === scope.id && g.status === 'active');

                        return (
                            <div
                                key={scope.id}
                                className="bg-white/80 backdrop-blur-md rounded-xl p-4 border border-stone-100 shadow-sm hover:shadow-md transition-all"
                            >
                                <div
                                    onClick={() => onScopeClick(scope.id)}
                                    className="flex items-center justify-between gap-4 cursor-pointer"
                                >
                                    {/* Left: Icon + Title + Description */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <IconRenderer 
                                            icon={scope.icon} 
                                            uiIcon={scope.uiIcon}
                                            className="text-2xl flex-shrink-0" 
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-bold text-stone-900 truncate">
                                                {scope.name}
                                            </h3>
                                            {scope.description && (
                                                <p className="text-sm text-stone-500 truncate">
                                                    {scope.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Time Stats */}
                                    <div className="text-right flex-shrink-0">
                                        <div className="text-base font-bold text-stone-900 font-mono">
                                            {formatTime(stats.allTime)}
                                        </div>
                                        <div className="text-xs text-stone-400">
                                            本月 {formatTime(stats.thisMonth)}
                                        </div>
                                    </div>
                                </div>


                                {/* Goals for this scope */}
                                {scopeGoals.length > 0 && (
                                    <>
                                        <div className="border-t border-stone-100 my-3" />
                                        
                                        {/* Goal Status Alert */}
                                        <ScopeGoalAlert scopeId={scope.id} scopeGoals={scopeGoals} />
                                        
                                        <div className="space-y-2">
                                            {scopeGoals.map(goal => (
                                                <GoalCard
                                                    key={goal.id}
                                                    goal={goal}
                                                    logs={logs}
                                                    todos={todos}
                                                    compact={true}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
