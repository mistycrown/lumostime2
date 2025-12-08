import React, { useMemo } from 'react';
import { Scope, Goal, Log, TodoItem } from '../types';
import { GoalCard } from '../components/GoalCard';
import { Settings2 } from 'lucide-react';

interface ScopeViewProps {
    scopes: Scope[];
    logs: Log[];
    goals: Goal[];
    todos: TodoItem[];
    onScopeClick: (scopeId: string) => void;
    onManageClick: () => void;
}

export const ScopeView: React.FC<ScopeViewProps> = ({
    scopes,
    logs,
    goals = [],
    todos = [],
    onScopeClick,
    onManageClick
}) => {
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

    return (
        <div className="h-full bg-[#faf9f6] overflow-y-auto pb-24">
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
                                className="bg-white rounded-xl p-4 border border-stone-100 shadow-sm hover:shadow-md transition-all"
                            >
                                <div
                                    onClick={() => onScopeClick(scope.id)}
                                    className="flex items-center justify-between gap-4 cursor-pointer"
                                >
                                    {/* Left: Icon + Title + Description */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="text-2xl flex-shrink-0">{scope.icon}</span>
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
