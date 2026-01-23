import { Goal } from '../types';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useNavigation } from '../contexts/NavigationContext';

export const useGoalManager = () => {
    const { setGoals } = useCategoryScope();
    const { setIsGoalEditorOpen, setEditingGoal, setGoalScopeId } = useNavigation();

    const handleAddGoal = (scopeId: string) => {
        setEditingGoal(null);
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
        closeGoalEditor
    };
};
