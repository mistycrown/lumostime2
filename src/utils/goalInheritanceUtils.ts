/**
 * @file goalInheritanceUtils.ts
 * @input Goal, MajorGoal
 * @output Helpers to apply MajorGoal inheritance onto phase goals
 * @pos Utility (Goal Inheritance)
 * @description Phase goals (goals linked via majorGoalId) should inherit metric and filters from MajorGoal.
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { Goal, MajorGoal } from '../types';

export const applyMajorGoalInheritance = (goal: Goal, majorGoal: MajorGoal): Goal => {
  return {
    ...goal,
    metric: majorGoal.metric,
    filterActivityIds: majorGoal.filterActivityIds,
    filterTodoCategories: majorGoal.filterTodoCategories,
    filterTodoCategorySource: majorGoal.filterTodoCategorySource
  };
};

