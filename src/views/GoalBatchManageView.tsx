/**
 * @file GoalBatchManageView.tsx
 * @input scopeId, goals, majorGoals
 * @output Updated MajorGoals/Goals (Rename, Reorder, Delete)
 * @pos View (Management Page)
 * @description Batch manage goals within a scope: major goals, phase goals, and independent goals.
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useMemo, useState } from 'react';
import {
    ArrowDown,
    ArrowUp,
    Check,
    ChevronDown,
    ChevronRight,
    Trash2,
    X
} from 'lucide-react';
import { Goal, MajorGoal } from '../types';

interface MajorGoalWithChildren extends MajorGoal {
    childGoals: Goal[];
}

interface GoalBatchManageViewProps {
    onBack: () => void;
    onSave: (majorGoals: MajorGoal[], goals: Goal[]) => void;
    scopeId: string;
    goals: Goal[];
    majorGoals: MajorGoal[];
}

const getOrderValue = (order?: number) => {
    return typeof order === 'number' ? order : Number.POSITIVE_INFINITY;
};

const compareByOrder = (a: { order?: number }, b: { order?: number }) => {
    return getOrderValue(a.order) - getOrderValue(b.order);
};

const normalizeGoalTitle = (title: string) => title.trim();

export const GoalBatchManageView: React.FC<GoalBatchManageViewProps> = ({
    onBack,
    onSave,
    scopeId,
    goals: initialGoals,
    majorGoals: initialMajorGoals
}) => {
    const activeMajorGoals = useMemo(() => {
        return initialMajorGoals
            .filter(mg => mg.scopeId === scopeId && mg.status !== 'archived')
            .sort((a, b) => {
                const diff = compareByOrder(a, b);
                if (diff !== 0) return diff;
                return (a.createdAt || '').localeCompare(b.createdAt || '');
            });
    }, [initialMajorGoals, scopeId]);

    const activeMajorGoalIdSet = useMemo(() => {
        return new Set(activeMajorGoals.map(mg => mg.id));
    }, [activeMajorGoals]);

    const activeNonArchivedGoalsInScope = useMemo(() => {
        return initialGoals.filter(g => g.scopeId === scopeId && g.status !== 'archived');
    }, [initialGoals, scopeId]);

    const [expandedMajorGoals, setExpandedMajorGoals] = useState<Set<string>>(
        new Set(activeMajorGoals.map(mg => mg.id))
    );

    const [majorGoalsData, setMajorGoalsData] = useState<MajorGoalWithChildren[]>(() => {
        return activeMajorGoals.map(mg => {
            const childGoals = activeNonArchivedGoalsInScope
                .filter(g => g.majorGoalId === mg.id)
                .sort((a, b) => {
                    const diff = compareByOrder(a, b);
                    if (diff !== 0) return diff;
                    return a.startDate.localeCompare(b.startDate);
                });
            return {
                ...mg,
                childGoals
            };
        });
    });

    const [independentGoals, setIndependentGoals] = useState<Goal[]>(() => {
        return activeNonArchivedGoalsInScope
            .filter(g => !g.majorGoalId)
            .sort((a, b) => {
                const diff = compareByOrder(a, b);
                if (diff !== 0) return diff;
                return a.startDate.localeCompare(b.startDate);
            });
    });

    const toggleExpand = (majorGoalId: string) => {
        setExpandedMajorGoals(prev => {
            const next = new Set(prev);
            if (next.has(majorGoalId)) next.delete(majorGoalId);
            else next.add(majorGoalId);
            return next;
        });
    };

    const moveMajorGoal = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index > 0) {
            const next = [...majorGoalsData];
            [next[index], next[index - 1]] = [next[index - 1], next[index]];
            setMajorGoalsData(next);
        } else if (direction === 'down' && index < majorGoalsData.length - 1) {
            const next = [...majorGoalsData];
            [next[index], next[index + 1]] = [next[index + 1], next[index]];
            setMajorGoalsData(next);
        }
    };

    const moveChildGoal = (majorGoalIndex: number, childIndex: number, direction: 'up' | 'down') => {
        setMajorGoalsData(prev => {
            const next = [...prev];
            const children = [...next[majorGoalIndex].childGoals];

            if (direction === 'up' && childIndex > 0) {
                [children[childIndex], children[childIndex - 1]] = [children[childIndex - 1], children[childIndex]];
            } else if (direction === 'down' && childIndex < children.length - 1) {
                [children[childIndex], children[childIndex + 1]] = [children[childIndex + 1], children[childIndex]];
            }

            next[majorGoalIndex] = { ...next[majorGoalIndex], childGoals: children };
            return next;
        });
    };

    const moveIndependentGoal = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index > 0) {
            const next = [...independentGoals];
            [next[index], next[index - 1]] = [next[index - 1], next[index]];
            setIndependentGoals(next);
        } else if (direction === 'down' && index < independentGoals.length - 1) {
            const next = [...independentGoals];
            [next[index], next[index + 1]] = [next[index + 1], next[index]];
            setIndependentGoals(next);
        }
    };

    const handleMajorGoalTitleChange = (majorGoalId: string, title: string) => {
        setMajorGoalsData(prev => prev.map(mg => (mg.id === majorGoalId ? { ...mg, title } : mg)));
    };

    const handleChildGoalTitleChange = (majorGoalId: string, goalId: string, title: string) => {
        setMajorGoalsData(prev => prev.map(mg => {
            if (mg.id !== majorGoalId) return mg;
            return {
                ...mg,
                childGoals: mg.childGoals.map(g => (g.id === goalId ? { ...g, title } : g))
            };
        }));
    };

    const handleIndependentGoalTitleChange = (goalId: string, title: string) => {
        setIndependentGoals(prev => prev.map(g => (g.id === goalId ? { ...g, title } : g)));
    };

    const handleDeleteMajorGoal = (majorGoalId: string) => {
        setMajorGoalsData(prev => prev.filter(mg => mg.id !== majorGoalId));
        setExpandedMajorGoals(prev => {
            const next = new Set(prev);
            next.delete(majorGoalId);
            return next;
        });
    };

    const handleDeleteChildGoal = (majorGoalId: string, goalId: string) => {
        setMajorGoalsData(prev => prev.map(mg => {
            if (mg.id !== majorGoalId) return mg;
            return { ...mg, childGoals: mg.childGoals.filter(g => g.id !== goalId) };
        }));
    };

    const handleDeleteIndependentGoal = (goalId: string) => {
        setIndependentGoals(prev => prev.filter(g => g.id !== goalId));
    };

    const handleSave = () => {
        const nowIso = new Date().toISOString();

        // 目标系列：写回顺序、更新时间
        const updatedMajorGoalsForScope: MajorGoal[] = majorGoalsData.map((mg, index) => {
            const { childGoals: _childGoals, ...majorGoalData } = mg;
            return {
                ...majorGoalData,
                title: normalizeGoalTitle(majorGoalData.title),
                order: index,
                updatedAt: nowIso
            };
        });

        // 阶段目标：写回顺序、标题
        const updatedChildGoals: Goal[] = majorGoalsData.flatMap(mg => {
            return mg.childGoals.map((g, index) => {
                return {
                    ...g,
                    title: normalizeGoalTitle(g.title),
                    order: index,
                    majorGoalId: mg.id
                };
            });
        });

        // 独立目标：写回顺序、标题
        const updatedIndependentGoals: Goal[] = independentGoals.map((g, index) => {
            return {
                ...g,
                title: normalizeGoalTitle(g.title),
                order: index,
                majorGoalId: undefined
            };
        });

        // 删除：以当前编辑态为准（仅影响本 scope 非归档数据）
        const deletedMajorGoalIds = new Set(
            activeMajorGoals
                .filter(mg => !majorGoalsData.some(current => current.id === mg.id))
                .map(mg => mg.id)
        );

        const deletedGoalIds = new Set<string>();

        // 删除目标系列时：删除其所有阶段目标（包括归档的）
        initialGoals
            .filter(g => g.scopeId === scopeId && g.majorGoalId && deletedMajorGoalIds.has(g.majorGoalId))
            .forEach(g => deletedGoalIds.add(g.id));

        // 仅处理当前页面“可管理”的阶段目标（属于 activeMajorGoals 的子目标）
        const manageableChildGoals = activeNonArchivedGoalsInScope.filter(
            g => !!g.majorGoalId && activeMajorGoalIdSet.has(g.majorGoalId)
        );
        manageableChildGoals.forEach(g => {
            const stillExists = majorGoalsData.some(mg => mg.childGoals.some(cg => cg.id === g.id));
            if (!stillExists) deletedGoalIds.add(g.id);
        });

        // 仅处理当前页面“可管理”的独立目标（majorGoalId 为空）
        const manageableIndependentGoals = activeNonArchivedGoalsInScope.filter(g => !g.majorGoalId);
        manageableIndependentGoals.forEach(g => {
            const stillExists = independentGoals.some(ig => ig.id === g.id);
            if (!stillExists) deletedGoalIds.add(g.id);
        });

        // 目标系列：只替换本 scope 下的“未归档目标系列”
        const managedMajorGoalIds = new Set(activeMajorGoals.map(mg => mg.id));
        const finalMajorGoals = initialMajorGoals
            .filter(mg => !managedMajorGoalIds.has(mg.id))
            .filter(mg => !deletedMajorGoalIds.has(mg.id))
            .concat(updatedMajorGoalsForScope);

        // 目标：只替换本 scope 下的“可管理目标”（未归档 + (独立目标 or 属于 activeMajorGoals 的阶段目标)）
        const managedGoalIds = new Set<string>();
        manageableChildGoals.forEach(g => managedGoalIds.add(g.id));
        manageableIndependentGoals.forEach(g => managedGoalIds.add(g.id));

        const finalGoals = initialGoals
            .filter(g => !managedGoalIds.has(g.id))
            .filter(g => !deletedGoalIds.has(g.id))
            .concat(updatedChildGoals)
            .concat(updatedIndependentGoals);

        onSave(finalMajorGoals, finalGoals);
    };

    return (
        <div className="h-full bg-[#faf9f6] flex flex-col pt-[var(--app-safe-area-top)]">
            <div className="h-14 flex items-center justify-between px-5 bg-[#fdfbf7] border-b border-stone-100 sticky top-0 z-20">
                <button onClick={onBack} className="p-2 -ml-2 text-stone-400 hover:text-stone-600 transition-colors">
                    <X size={24} />
                </button>
                <h1 className="font-serif font-bold text-lg text-stone-800">批量管理</h1>
                <button
                    onClick={handleSave}
                    className="p-2 -mr-2 text-stone-400 hover:text-stone-600 transition-colors"
                >
                    <Check size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">
                {/* Major Goals */}
                <div>
                    <div className="flex justify-between items-center px-2 mb-3 text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                        <span>目标系列</span>
                        <span>{majorGoalsData.length}</span>
                    </div>

                    <div className="space-y-4">
                        {majorGoalsData.map((mg, majorIndex) => {
                            const isExpanded = expandedMajorGoals.has(mg.id);

                            return (
                                <div key={mg.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                                    {/* MajorGoal Header */}
                                    <div className="flex items-center gap-2 p-3 border-b border-stone-50 bg-stone-50/50">
                                        <button onClick={() => toggleExpand(mg.id)} className="text-stone-400 shrink-0">
                                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                        </button>

                                        <input
                                            className="bg-transparent font-bold text-stone-800 flex-1 outline-none placeholder:text-stone-300 min-w-0"
                                            value={mg.title}
                                            onChange={(e) => handleMajorGoalTitleChange(mg.id, e.target.value)}
                                            placeholder="目标系列名称"
                                        />

                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => moveMajorGoal(majorIndex, 'up')}
                                                disabled={majorIndex === 0}
                                                className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30"
                                                title="上移"
                                            >
                                                <ArrowUp size={16} />
                                            </button>
                                            <button
                                                onClick={() => moveMajorGoal(majorIndex, 'down')}
                                                disabled={majorIndex === majorGoalsData.length - 1}
                                                className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30"
                                                title="下移"
                                            >
                                                <ArrowDown size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteMajorGoal(mg.id)}
                                                className="p-1 text-stone-300 hover:text-red-500"
                                                title="删除目标系列（含阶段目标）"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Child goals */}
                                    {isExpanded && (
                                        <div className="p-3 space-y-2">
                                            {mg.childGoals.length === 0 ? (
                                                <div className="text-xs text-stone-400 px-2 py-3">暂无阶段目标</div>
                                            ) : (
                                                mg.childGoals.map((g, childIndex) => (
                                                    <div key={g.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-stone-50">
                                                        <input
                                                            className="bg-transparent text-sm text-stone-700 flex-1 outline-none placeholder:text-stone-300 min-w-0"
                                                            value={g.title}
                                                            onChange={(e) => handleChildGoalTitleChange(mg.id, g.id, e.target.value)}
                                                            placeholder="阶段目标名称"
                                                        />
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                onClick={() => moveChildGoal(majorIndex, childIndex, 'up')}
                                                                disabled={childIndex === 0}
                                                                className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30"
                                                                title="上移"
                                                            >
                                                                <ArrowUp size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => moveChildGoal(majorIndex, childIndex, 'down')}
                                                                disabled={childIndex === mg.childGoals.length - 1}
                                                                className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30"
                                                                title="下移"
                                                            >
                                                                <ArrowDown size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteChildGoal(mg.id, g.id)}
                                                                className="p-1 text-stone-300 hover:text-red-500"
                                                                title="删除阶段目标"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Independent Goals */}
                <div>
                    <div className="flex justify-between items-center px-2 mb-3 text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                        <span>独立目标</span>
                        <span>{independentGoals.length}</span>
                    </div>

                    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                        {independentGoals.length === 0 ? (
                            <div className="text-xs text-stone-400 px-4 py-6">暂无独立目标</div>
                        ) : (
                            <div className="p-3 space-y-2">
                                {independentGoals.map((g, index) => (
                                    <div key={g.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-stone-50">
                                        <input
                                            className="bg-transparent text-sm text-stone-700 flex-1 outline-none placeholder:text-stone-300 min-w-0"
                                            value={g.title}
                                            onChange={(e) => handleIndependentGoalTitleChange(g.id, e.target.value)}
                                            placeholder="目标名称"
                                        />
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => moveIndependentGoal(index, 'up')}
                                                disabled={index === 0}
                                                className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30"
                                                title="上移"
                                            >
                                                <ArrowUp size={16} />
                                            </button>
                                            <button
                                                onClick={() => moveIndependentGoal(index, 'down')}
                                                disabled={index === independentGoals.length - 1}
                                                className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30"
                                                title="下移"
                                            >
                                                <ArrowDown size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteIndependentGoal(g.id)}
                                                className="p-1 text-stone-300 hover:text-red-500"
                                                title="删除目标"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
