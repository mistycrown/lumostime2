/**
 * @file activityReferenceMigration.ts
 * @input Activity-linked logs, todos, sessions, rules, settings, scenes, and widgets
 * @output Reference counts and migrated immutable state fragments
 * @description Provides the shared pure transformations used when deleting an activity by migrating every known reference to a replacement activity.
 * @updated 2026-08-26: Added full activity-reference migration helpers for tag deletion.
 */
import type {
  AchievementRule,
  ActiveSession,
  AppAwarenessAnswerValue,
  AppAwarenessRun,
  AppAwarenessWorkflowTemplate,
  AutoLinkRule,
  Category,
  Filter,
  Goal,
  Log,
  MajorGoal,
  MemoirFilterConfig,
  SceneGroupState,
  TodoItem
} from '../types';
import type { WidgetTemplate } from '../services/widgetService';

export interface ActivityMigrationImpact {
  logs: number;
  todos: number;
  activeSessions: number;
  autoLinkRules: number;
  appRules: number;
  appAwarenessTemplates: number;
  achievementRules: number;
  sceneCards: number;
  widgetSlots: number;
  memoirFilters: number;
  goalFilters: number;
  timePalFilters: number;
}

export interface ActivityReferenceMigrationInput {
  logs: Log[];
  todos: TodoItem[];
  activeSessions: ActiveSession[];
  autoLinkRules: AutoLinkRule[];
  appRules: Record<string, string>;
  appAwarenessTemplates: AppAwarenessWorkflowTemplate[];
  appAwarenessActiveRun: AppAwarenessRun | null;
  achievementRules: AchievementRule[];
  sceneState?: SceneGroupState | null;
  widgetTemplates?: WidgetTemplate[];
  memoirFilterConfig: MemoirFilterConfig;
  filters: Filter[];
  goals: Goal[];
  majorGoals: MajorGoal[];
  timePalFilterActivityIds?: string[];
}

export interface ActivityReferenceMigrationResult {
  logs: Log[];
  todos: TodoItem[];
  activeSessions: ActiveSession[];
  autoLinkRules: AutoLinkRule[];
  appRules: Record<string, string>;
  appAwarenessTemplates: AppAwarenessWorkflowTemplate[];
  appAwarenessActiveRun: AppAwarenessRun | null;
  achievementRules: AchievementRule[];
  sceneState?: SceneGroupState | null;
  widgetTemplates?: WidgetTemplate[];
  memoirFilterConfig: MemoirFilterConfig;
  filters: Filter[];
  goals: Goal[];
  majorGoals: MajorGoal[];
  timePalFilterActivityIds?: string[];
  impact: ActivityMigrationImpact;
}

const replaceInUniqueArray = (values: string[], sourceId: string, targetId: string): string[] => {
  const next: string[] = [];
  values.forEach((value) => {
    const resolved = value === sourceId ? targetId : value;
    if (!next.includes(resolved)) {
      next.push(resolved);
    }
  });
  return next;
};

const replaceActivityInAnswer = (
  answer: AppAwarenessAnswerValue,
  sourceId: string,
  targetId: string,
  targetCategoryId: string,
  targetName: string
): AppAwarenessAnswerValue => {
  if (!answer || typeof answer !== 'object' || !('activityId' in answer)) {
    return answer;
  }

  if (answer.activityId !== sourceId) {
    return answer;
  }

  return {
    ...answer,
    activityId: targetId,
    categoryId: targetCategoryId,
    label: targetName
  };
};

const migrateAppAwarenessTemplates = (
  templates: AppAwarenessWorkflowTemplate[],
  sourceId: string,
  targetId: string,
  targetCategoryId: string,
  targetName: string
): { templates: AppAwarenessWorkflowTemplate[]; count: number } => {
  let count = 0;
  const next = templates.map((template) => ({
    ...template,
    steps: template.steps.map((step) => {
      if (step.type !== 'start_record') {
        return step;
      }

      const activityOptions = step.activityOptions.map((option) => {
        if (option.activityId !== sourceId) {
          return option;
        }
        count += 1;
        return { ...option, activityId: targetId, categoryId: targetCategoryId, label: targetName };
      });
      return { ...step, activityOptions };
    })
  }));
  return { templates: next, count };
};

const migrateSceneState = (
  state: SceneGroupState | null | undefined,
  sourceId: string,
  targetId: string,
  targetCategoryId: string
): { state: SceneGroupState | null | undefined; count: number } => {
  if (!state) {
    return { state, count: 0 };
  }

  let count = 0;
  const next: SceneGroupState = {
    ...state,
    groups: state.groups.map((group) => ({
      ...group,
      timeSlots: group.timeSlots.map((slot) => ({
        ...slot,
        cards: slot.cards.map((card) => {
          const filterActivityIds = card.filterActivityIds
            ? replaceInUniqueArray(card.filterActivityIds, sourceId, targetId)
            : card.filterActivityIds;
          if (card.action.activityId !== sourceId) {
            return filterActivityIds === card.filterActivityIds ? card : { ...card, filterActivityIds };
          }
          count += 1;
          return {
            ...card,
            filterActivityIds,
            action: { ...card.action, activityId: targetId, categoryId: targetCategoryId }
          };
        })
      }))
    }))
  };
  return { state: next, count };
};

const migrateWidgetTemplates = (
  templates: WidgetTemplate[] | undefined,
  sourceId: string,
  targetId: string,
  targetCategoryId: string
): { templates: WidgetTemplate[] | undefined; count: number } => {
  if (!templates) {
    return { templates, count: 0 };
  }

  let count = 0;
  const next = templates.map((template) => ({
    ...template,
    slots: template.slots.map((slot) => {
      if (slot.activityId !== sourceId) {
        return slot;
      }
      count += 1;
      return { ...slot, activityId: targetId, categoryId: targetCategoryId };
    }),
    trackingConfig: template.trackingConfig?.activityId === sourceId
      ? (() => {
        count += 1;
        return { ...template.trackingConfig, activityId: targetId, categoryId: targetCategoryId };
      })()
      : template.trackingConfig
  }));
  return { templates: next, count };
};

const replaceTagInFilterExpression = (expression: string, sourceName: string, targetName: string): string => {
  if (!sourceName.trim()) {
    return expression;
  }
  const escaped = sourceName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return expression.replace(new RegExp(`(^|\\s)#${escaped}(?=\\s|$)`, 'g'), `$1#${targetName.trim()}`);
};

export const getActivityMigrationImpact = (
  input: ActivityReferenceMigrationInput,
  sourceId: string
): ActivityMigrationImpact => ({
  logs: input.logs.filter((item) => item.activityId === sourceId).length,
  todos: input.todos.filter((item) => item.linkedActivityId === sourceId).length,
  activeSessions: input.activeSessions.filter((item) => item.activityId === sourceId).length,
  autoLinkRules: input.autoLinkRules.filter((item) => item.activityId === sourceId).length,
  appRules: Object.values(input.appRules).filter((activityId) => activityId === sourceId).length,
  appAwarenessTemplates: input.appAwarenessTemplates.flatMap((template) => template.steps)
    .filter((step) => step.type === 'start_record')
    .reduce((count, step) => count + step.activityOptions.filter((option) => option.activityId === sourceId).length, 0),
  achievementRules: input.achievementRules.filter((rule) => rule.targetType === 'activity' && rule.targetIds.includes(sourceId)).length,
  sceneCards: input.sceneState?.groups.flatMap((group) => group.timeSlots)
    .flatMap((slot) => slot.cards)
    .filter((card) => card.action.activityId === sourceId).length || 0,
  widgetSlots: input.widgetTemplates?.reduce((count, template) => (
    count
      + template.slots.filter((slot) => slot.activityId === sourceId).length
      + (template.trackingConfig?.activityId === sourceId ? 1 : 0)
  ), 0) || 0,
  memoirFilters: input.memoirFilterConfig.relatedTagIds.filter((id) => id === sourceId).length,
  goalFilters: input.goals.reduce((count, goal) => count + (goal.filterActivityIds?.includes(sourceId) ? 1 : 0), 0)
    + input.majorGoals.reduce((count, goal) => count + (goal.filterActivityIds?.includes(sourceId) ? 1 : 0), 0),
  timePalFilters: input.timePalFilterActivityIds?.filter((id) => id === sourceId).length || 0
});

export const migrateActivityReferences = (
  input: ActivityReferenceMigrationInput,
  sourceId: string,
  targetId: string,
  targetCategoryId: string,
  sourceName = '',
  targetName = ''
): ActivityReferenceMigrationResult => {
  const awareness = migrateAppAwarenessTemplates(input.appAwarenessTemplates, sourceId, targetId, targetCategoryId, targetName);
  const scene = migrateSceneState(input.sceneState, sourceId, targetId, targetCategoryId);
  const widgets = migrateWidgetTemplates(input.widgetTemplates, sourceId, targetId, targetCategoryId);
  const impact = getActivityMigrationImpact(input, sourceId);

  const appRules: Record<string, string> = {};
  Object.entries(input.appRules).forEach(([packageName, activityId]) => {
    appRules[packageName] = activityId === sourceId ? targetId : activityId;
  });

  return {
    logs: input.logs.map((log) => log.activityId === sourceId
      ? { ...log, activityId: targetId, categoryId: targetCategoryId }
      : log),
    todos: input.todos.map((todo) => todo.linkedActivityId === sourceId
      ? { ...todo, linkedActivityId: targetId, linkedCategoryId: targetCategoryId }
      : todo),
    activeSessions: input.activeSessions.map((session) => {
      const nextSession = session.activityId === sourceId
        ? { ...session, activityId: targetId, categoryId: targetCategoryId }
        : session;
      if (!nextSession.appAwarenessMeta) {
        return nextSession;
      }
      return {
        ...nextSession,
        appAwarenessMeta: {
          ...nextSession.appAwarenessMeta,
          answers: Object.fromEntries(Object.entries(nextSession.appAwarenessMeta.answers).map(([key, value]) => [
            key,
            replaceActivityInAnswer(value, sourceId, targetId, targetCategoryId, targetName)
          ]))
        }
      };
    }),
    autoLinkRules: input.autoLinkRules.map((rule) => rule.activityId === sourceId
      ? { ...rule, activityId: targetId }
      : rule),
    appRules,
    appAwarenessTemplates: awareness.templates,
    appAwarenessActiveRun: input.appAwarenessActiveRun
      ? {
        ...input.appAwarenessActiveRun,
        answers: Object.fromEntries(Object.entries(input.appAwarenessActiveRun.answers).map(([key, value]) => [
          key,
          replaceActivityInAnswer(value, sourceId, targetId, targetCategoryId, targetName)
        ]))
      }
      : input.appAwarenessActiveRun,
    achievementRules: input.achievementRules.map((rule) => rule.targetType === 'activity'
      ? { ...rule, targetIds: replaceInUniqueArray(rule.targetIds, sourceId, targetId) }
      : rule.filterExpression
        ? { ...rule, filterExpression: replaceTagInFilterExpression(rule.filterExpression, sourceName, targetName) }
        : rule),
    sceneState: scene.state,
    widgetTemplates: widgets.templates,
    memoirFilterConfig: {
      ...input.memoirFilterConfig,
      relatedTagIds: replaceInUniqueArray(input.memoirFilterConfig.relatedTagIds, sourceId, targetId)
    },
    filters: input.filters.map((filter) => ({
      ...filter,
      filterExpression: replaceTagInFilterExpression(filter.filterExpression, sourceName, targetName)
    })),
    goals: input.goals.map((goal) => goal.filterActivityIds
      ? { ...goal, filterActivityIds: replaceInUniqueArray(goal.filterActivityIds, sourceId, targetId) }
      : goal),
    majorGoals: input.majorGoals.map((goal) => goal.filterActivityIds
      ? { ...goal, filterActivityIds: replaceInUniqueArray(goal.filterActivityIds, sourceId, targetId) }
      : goal),
    timePalFilterActivityIds: input.timePalFilterActivityIds
      ? replaceInUniqueArray(input.timePalFilterActivityIds, sourceId, targetId)
      : input.timePalFilterActivityIds,
    impact
  };
};
