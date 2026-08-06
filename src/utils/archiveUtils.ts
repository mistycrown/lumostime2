/**
 * @file archiveUtils.ts
 * @input Activity, Category, Scope collections
 * @output Active and archived collection helpers
 * @description Shared archive-state predicates used by indexes and selectors.
 */
import { Activity, Category, Scope } from '../types';

export const isActivityArchived = (activity: Activity): boolean => activity.isArchived === true;

export const isScopeArchived = (scope: Scope): boolean => scope.isArchived === true;

export const getActiveActivities = (category: Category): Activity[] =>
  category.activities.filter((activity) => !isActivityArchived(activity));

export const getActiveScopes = (scopes: Scope[]): Scope[] =>
  scopes.filter((scope) => !isScopeArchived(scope));
