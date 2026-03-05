/**
 * @file useMajorGoalManager.ts
 * @input CategoryScopeContext (majorGoals, goals, setMajorGoals, setGoals)
 * @output MajorGoal CRUD Operations
 * @pos Hook (Data Manager)
 * @description 大目标数据管理 Hook - 处理大目标的增删改查、归档等操作
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { MajorGoal, Goal } from '../types';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { updateMajorGoalTimeRange } from '../utils/majorGoalUtils';

export const useMajorGoalManager = () => {
  const { majorGoals, setMajorGoals, goals, setGoals } = useCategoryScope();

  /**
   * 添加大目标
   * @param majorGoal - 大目标对象
   * @param childGoals - 子目标列表（可选）
   */
  const addMajorGoal = (majorGoal: MajorGoal, childGoals?: Goal[]) => {
    // 添加大目标
    setMajorGoals(prev => [...prev, majorGoal]);

    // 如果提供了子目标，添加子目标并关联到大目标
    if (childGoals && childGoals.length > 0) {
      const goalsWithMajorGoalId = childGoals.map(goal => ({
        ...goal,
        majorGoalId: majorGoal.id
      }));
      setGoals(prev => [...prev, ...goalsWithMajorGoalId]);

      // 更新大目标的时间范围
      const updatedMajorGoal = updateMajorGoalTimeRange(majorGoal, goalsWithMajorGoalId);
      setMajorGoals(prev => prev.map(mg => 
        mg.id === majorGoal.id ? updatedMajorGoal : mg
      ));
    }
  };

  /**
   * 更新大目标
   * @param majorGoal - 更新后的大目标对象
   */
  const updateMajorGoal = (majorGoal: MajorGoal) => {
    setMajorGoals(prev => prev.map(mg => 
      mg.id === majorGoal.id ? { ...majorGoal, updatedAt: new Date().toISOString() } : mg
    ));

    // 如果筛选器发生变化，更新所有子目标的筛选器
    const childGoals = goals.filter(g => g.majorGoalId === majorGoal.id);
    if (childGoals.length > 0) {
      setGoals(prev => prev.map(g => {
        if (g.majorGoalId === majorGoal.id) {
          return {
            ...g,
            filterActivityIds: majorGoal.filterActivityIds,
            filterTodoCategories: majorGoal.filterTodoCategories,
            filterTodoCategorySource: majorGoal.filterTodoCategorySource
          };
        }
        return g;
      }));
    }
  };

  /**
   * 删除大目标
   * @param majorGoalId - 大目标 ID
   * @param deleteChildren - 是否同时删除子目标
   */
  const deleteMajorGoal = (majorGoalId: string, deleteChildren: boolean = false) => {
    // 删除大目标
    setMajorGoals(prev => prev.filter(mg => mg.id !== majorGoalId));

    if (deleteChildren) {
      // 删除所有子目标
      setGoals(prev => prev.filter(g => g.majorGoalId !== majorGoalId));
    } else {
      // 保留子目标，将其变为独立目标
      setGoals(prev => prev.map(g =>
        g.majorGoalId === majorGoalId
          ? { ...g, majorGoalId: undefined }
          : g
      ));
    }
  };

  /**
   * 归档大目标
   * @param majorGoalId - 大目标 ID
   */
  const archiveMajorGoal = (majorGoalId: string) => {
    setMajorGoals(prev => prev.map(mg => {
      if (mg.id === majorGoalId) {
        const newStatus = mg.status === 'archived' ? 'active' : 'archived';
        return {
          ...mg,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return mg;
    }));

    // 同时归档/恢复所有子目标
    setGoals(prev => prev.map(g => {
      if (g.majorGoalId === majorGoalId) {
        const majorGoal = majorGoals.find(mg => mg.id === majorGoalId);
        const newStatus = majorGoal?.status === 'archived' ? 'active' : 'archived';
        return { ...g, status: newStatus };
      }
      return g;
    }));
  };

  /**
   * 添加子目标到大目标
   * @param majorGoalId - 大目标 ID
   * @param goal - 子目标对象
   */
  const addChildGoal = (majorGoalId: string, goal: Goal) => {
    // 添加子目标并关联到大目标
    const goalWithMajorGoalId = {
      ...goal,
      majorGoalId
    };
    setGoals(prev => [...prev, goalWithMajorGoalId]);

    // 更新大目标的时间范围
    const majorGoal = majorGoals.find(mg => mg.id === majorGoalId);
    if (majorGoal) {
      const childGoals = goals.filter(g => g.majorGoalId === majorGoalId);
      const updatedMajorGoal = updateMajorGoalTimeRange(majorGoal, [...childGoals, goalWithMajorGoalId]);
      setMajorGoals(prev => prev.map(mg => 
        mg.id === majorGoalId ? updatedMajorGoal : mg
      ));
    }
  };

  /**
   * 从大目标中移除子目标
   * @param goalId - 子目标 ID
   */
  const removeChildGoal = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal || !goal.majorGoalId) return;

    const majorGoalId = goal.majorGoalId;

    // 将子目标变为独立目标
    setGoals(prev => prev.map(g =>
      g.id === goalId ? { ...g, majorGoalId: undefined } : g
    ));

    // 更新大目标的时间范围
    const majorGoal = majorGoals.find(mg => mg.id === majorGoalId);
    if (majorGoal) {
      const remainingChildGoals = goals.filter(g => 
        g.majorGoalId === majorGoalId && g.id !== goalId
      );
      
      if (remainingChildGoals.length > 0) {
        const updatedMajorGoal = updateMajorGoalTimeRange(majorGoal, remainingChildGoals);
        setMajorGoals(prev => prev.map(mg => 
          mg.id === majorGoalId ? updatedMajorGoal : mg
        ));
      }
    }
  };

  /**
   * 关联独立目标到大目标
   * @param goalId - 目标 ID
   * @param majorGoalId - 大目标 ID
   */
  const linkGoalToMajorGoal = (goalId: string, majorGoalId: string) => {
    setGoals(prev => prev.map(g =>
      g.id === goalId ? { ...g, majorGoalId } : g
    ));

    // 更新大目标的时间范围
    const majorGoal = majorGoals.find(mg => mg.id === majorGoalId);
    if (majorGoal) {
      const childGoals = goals.filter(g => 
        g.majorGoalId === majorGoalId || g.id === goalId
      );
      const updatedMajorGoal = updateMajorGoalTimeRange(majorGoal, childGoals);
      setMajorGoals(prev => prev.map(mg => 
        mg.id === majorGoalId ? updatedMajorGoal : mg
      ));
    }
  };

  /**
   * 更新大目标的时间范围（当子目标变化时调用）
   * @param majorGoalId - 大目标 ID
   */
  const refreshMajorGoalTimeRange = (majorGoalId: string) => {
    const majorGoal = majorGoals.find(mg => mg.id === majorGoalId);
    if (!majorGoal) return;

    const childGoals = goals.filter(g => g.majorGoalId === majorGoalId);
    const updatedMajorGoal = updateMajorGoalTimeRange(majorGoal, childGoals);
    
    setMajorGoals(prev => prev.map(mg => 
      mg.id === majorGoalId ? updatedMajorGoal : mg
    ));
  };

  return {
    addMajorGoal,
    updateMajorGoal,
    deleteMajorGoal,
    archiveMajorGoal,
    addChildGoal,
    removeChildGoal,
    linkGoalToMajorGoal,
    refreshMajorGoalTimeRange
  };
};
