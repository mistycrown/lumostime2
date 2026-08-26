/**
 * @file archiveUtils.ts
 * @input Activity, Category, Scope collections
 * @output Active and archived collection helpers, including category-level cascading state updates
 * @description Shared archive-state predicates used by indexes and selectors.
 */
import { Activity, Category, Scope } from '../types';

export const isActivityArchived = (activity: Activity): boolean => activity.isArchived === true;

export const isCategoryArchived = (category: Category): boolean => category.isArchived === true;

export const isScopeArchived = (scope: Scope): boolean => scope.isArchived === true;

export const getActiveActivities = (category: Category): Activity[] =>
  isCategoryArchived(category)
    ? []
    : category.activities.filter((activity) => !isActivityArchived(activity));

export const setCategoryArchiveState = (category: Category, isArchived: boolean): Category => ({
  ...category,
  isArchived,
  activities: category.activities.map((activity) => ({ ...activity, isArchived }))
});

export const getActiveScopes = (scopes: Scope[]): Scope[] =>
  scopes.filter((scope) => !isScopeArchived(scope));
