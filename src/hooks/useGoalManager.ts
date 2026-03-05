/**
 * @file useGoalManager.ts
 * @input CategoryScopeContext (setGoals), NavigationContext (goal editor modal states)
 * @output Goal CRUD Operations (handleAddGoal, handleEditGoal, handleSaveGoal, handleDeleteGoal, handleArchiveGoal), Modal Control (closeGoalEditor)
 * @pos Hook (Data Manager)
 * @description 目标数据管理 Hook - 处理目标的增删改查、归档等操作
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { Goal } from '../types';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useNavigation } from '../contexts/NavigationContext';

export const useGoalManager = () => {
    const { setGoals } = useCategoryScope();
    const { setIsGoalEditorOpen, setEditingGoal, setGoalScopeId } = useNavigation();

    const handleAddGoal = (scopeId: string, templateGoal?: Goal, majorGoalId?: string) => {
        // 如果提供了 majorGoalId，说明是为目标系列创建阶段目标
        if (majorGoalId) {
            // 创建一个空的目标模板，关联到目标系列
            const goalTemplate: Goal = {
                id: '',
                title: '',
                scopeId,
                metric: 'duration_raw', // 默认值，会被目标系列的类型覆盖
                targetValue: 0,
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                status: 'active',
                majorGoalId, // 关联到目标系列
                order: 0
            };
            setEditingGoal(goalTemplate);
        } else if (templateGoal) {
            // 如果提供了模板目标，使用它作为编辑基础（但清除 ID 和状态）
            const goalTemplate: Goal = {
                ...templateGoal,
                id: '', // 清除 ID，让保存时生成新 ID
                status: 'active', // 重置为活跃状态
                // 保留其他所有参数（title, metric, targetValue, filters 等）
            };
            setEditingGoal(goalTemplate);
        } else {
            setEditingGoal(null);
        }
        setGoalScopeId(scopeId);
        setIsGoalEditorOpen(true);
    };

    const handleEditGoal = (goal: Goal) => {
        setEditingGoal(goal);
        setGoalScopeId(goal.scopeId);
        setIsGoalEditorOpen(true);
    };

    const handleSaveGoal = (goal: Goal) => {
        setGoals(prev => {
            const exists = prev.find(g => g.id === goal.id);
            if (exists) {
                return prev.map(g => g.id === goal.id ? goal : g);
            }
            return [...prev, goal];
        });
        setIsGoalEditorOpen(false);
        setEditingGoal(null);
    };

    const handleDeleteGoal = (goalId: string) => {
        setGoals(prev => prev.filter(g => g.id !== goalId));
    };

    const handleArchiveGoal = (goalId: string) => {
        setGoals(prev => prev.map(g => {
            if (g.id === goalId) {
                return {
                    ...g,
                    status: g.status === 'archived' ? 'active' : 'archived'
                };
            }
            return g;
        }) as Goal[]);
    };

    const handleExtendGoal = (goalId: string, days: number) => {
        setGoals(prev => prev.map(g => {
            if (g.id === goalId) {
                const currentEndDate = new Date(g.endDate);
                currentEndDate.setDate(currentEndDate.getDate() + days);
                return {
                    ...g,
                    endDate: currentEndDate.toISOString().split('T')[0],
                    extendedCount: (g.extendedCount || 0) + 1
                };
            }
            return g;
        }) as Goal[]);
    };

    const handleIncreaseGoalTarget = (goalId: string, increaseAmount: number) => {
        setGoals(prev => prev.map(g => {
            if (g.id === goalId) {
                return {
                    ...g,
                    targetValue: g.targetValue + increaseAmount
                };
            }
            return g;
        }) as Goal[]);
    };

    const closeGoalEditor = () => {
        setIsGoalEditorOpen(false);
        setEditingGoal(null);
    };

    return {
        handleAddGoal,
        handleEditGoal,
        handleSaveGoal,
        handleDeleteGoal,
        handleArchiveGoal,
        handleExtendGoal,
        handleIncreaseGoalTarget,
        closeGoalEditor
    };
};
