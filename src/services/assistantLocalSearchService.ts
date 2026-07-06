/**
 * @file assistantLocalSearchService.ts
 * @input Assistant local-query requests plus local logs, todos, categories, scopes, and reviews
 * @output Structured local-query hits and compact text digests for foreground assistant retrieval loops
 * @pos Service (Assistant Local Query)
 * @description Executes foreground assistant local queries against shared custom-filter and search-all logic so the model can request focused local facts without forcing every turn through a retrieval pass.
 * @updated 2026-07-06: Added skipped-query result shaping so duplicate foreground retrieval rounds can be surfaced clearly in chat and debug flows.
 * @updated 2026-07-05: Added a foreground-only local query service with filter-expression and keyword-search modes, result limiting, and assistant-facing digest formatting.
 */

import type {
  Category,
  DailyReview,
  Log,
  MonthlyReview,
  Scope,
  TodoCategory,
  TodoItem,
  WeeklyReview
} from '../types';
import type {
  AssistantLocalQueryRequest,
  AssistantLocalQueryResult,
  AssistantLocalQueryResultItem,
  AssistantLocalQueryTarget
} from '../types/assistant';
import { matchesFilter, matchesTodoFilter, parseFilterExpression } from '../utils/filterUtils';
import { runSearchAll } from '../utils/searchAllUtils';

interface AssistantLocalSearchContext {
  logs: Log[];
  categories: Category[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  scopes: Scope[];
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  monthlyReviews: MonthlyReview[];
}

interface AssistantLocalSearchParams extends AssistantLocalSearchContext {
  round: number;
  request: AssistantLocalQueryRequest;
}

const DEFAULT_QUERY_LIMIT = 6;
const MAX_QUERY_LIMIT = 20;

const clampLimit = (value?: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_QUERY_LIMIT;
  }

  return Math.max(1, Math.min(MAX_QUERY_LIMIT, Math.round(Number(value))));
};

const expandTargets = (targets: AssistantLocalQueryTarget[]): AssistantLocalQueryTarget[] => {
  if (targets.includes('all')) {
    return ['logs', 'todos', 'reviews', 'categories', 'activities', 'scopes'];
  }

  return Array.from(new Set(targets));
};

const formatDateKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
};

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const formatRange = (log: Log): string => `${formatTime(log.startTime)}-${formatTime(log.endTime)}`;

const findCategory = (categories: Category[], categoryId?: string): Category | undefined => (
  categoryId ? categories.find((category) => category.id === categoryId) : undefined
);

const findActivityName = (categories: Category[], categoryId?: string, activityId?: string): string => {
  if (!activityId) {
    return '';
  }

  const directCategory = findCategory(categories, categoryId);
  const directMatch = directCategory?.activities.find((activity) => activity.id === activityId);
  if (directMatch) {
    return directMatch.name;
  }

  return categories
    .flatMap((category) => category.activities)
    .find((activity) => activity.id === activityId)?.name || '';
};

const findTodo = (todos: TodoItem[], todoId?: string): TodoItem | undefined => (
  todoId ? todos.find((todo) => todo.id === todoId) : undefined
);

const buildLogItem = (log: Log, context: AssistantLocalSearchContext): AssistantLocalQueryResultItem => {
  const category = findCategory(context.categories, log.categoryId);
  const activityName = findActivityName(context.categories, log.categoryId, log.activityId);
  const linkedTodo = findTodo(context.todos, log.linkedTodoId);

  return {
    itemType: 'log',
    id: log.id,
    title: log.title || activityName || 'untitled_log',
    summary: [
      formatDateKey(log.startTime),
      formatRange(log),
      category?.name,
      activityName,
      log.note,
      linkedTodo ? `@${linkedTodo.title}` : ''
    ].filter(Boolean).join(' | '),
    metadata: {
      date: formatDateKey(log.startTime),
      timeRange: formatRange(log),
      categoryName: category?.name,
      activityName: activityName || undefined,
      note: log.note,
      linkedTodoTitle: linkedTodo?.title
    }
  };
};

const buildTodoItem = (todo: TodoItem, context: AssistantLocalSearchContext): AssistantLocalQueryResultItem => {
  const category = context.todoCategories.find((item) => item.id === todo.categoryId);
  const linkedCategory = findCategory(context.categories, todo.linkedCategoryId);
  const linkedActivityName = findActivityName(context.categories, todo.linkedCategoryId, todo.linkedActivityId);

  return {
    itemType: 'todo',
    id: todo.id,
    title: todo.title,
    summary: [
      category?.name,
      todo.isCompleted ? 'done' : 'todo',
      todo.scheduledDate ? `arrange ${todo.scheduledDate}` : '',
      todo.deadlineDate ? `due ${todo.deadlineDate}` : '',
      linkedCategory?.name ? `#${linkedCategory.name}` : '',
      linkedActivityName ? `#${linkedActivityName}` : '',
      todo.note
    ].filter(Boolean).join(' | '),
    metadata: {
      categoryName: category?.name,
      isCompleted: todo.isCompleted,
      scheduledDate: todo.scheduledDate,
      deadlineDate: todo.deadlineDate,
      linkedCategoryName: linkedCategory?.name,
      linkedActivityName: linkedActivityName || undefined,
      note: todo.note
    }
  };
};

const buildReviewItem = (
  review: { id: string; date: string; title: string; snippet?: string; type: 'daily' | 'weekly' | 'monthly' }
): AssistantLocalQueryResultItem => ({
  itemType: 'review',
  id: review.id,
  title: review.title,
  summary: [review.type, review.date, review.snippet || ''].filter(Boolean).join(' | '),
  metadata: {
    reviewType: review.type,
    date: review.date,
    snippet: review.snippet
  }
});

const buildCategoryItem = (category: Category): AssistantLocalQueryResultItem => ({
  itemType: 'category',
  id: category.id,
  title: category.name,
  summary: `${category.activities.length} activities`,
  metadata: {
    activityCount: category.activities.length
  }
});

const buildActivityItem = (
  activity: { id: string; name: string },
  category: Category
): AssistantLocalQueryResultItem => ({
  itemType: 'activity',
  id: activity.id,
  title: activity.name,
  summary: `category: ${category.name}`,
  metadata: {
    categoryName: category.name
  }
});

const buildScopeItem = (scope: Scope): AssistantLocalQueryResultItem => ({
  itemType: 'scope',
  id: scope.id,
  title: scope.name,
  summary: scope.description || 'scope',
  metadata: {
    description: scope.description
  }
});

const buildResultDigest = (result: AssistantLocalQueryResult): string => {
  const header = [
    `Round ${result.round}`,
    `mode=${result.request.mode}`,
    `targets=${result.request.targets.join(',')}`,
    `query=${result.request.query}`,
    `status=${result.status || 'executed'}`,
    `hitCount=${result.hitCount}`
  ].join(' | ');

  if (result.status && result.status !== 'executed') {
    return `${header}\n- ${result.statusMessage || 'query skipped'}`;
  }

  if (result.items.length === 0) {
    return `${header}\n- no hits`;
  }

  return [
    header,
    ...result.items.map((item, index) => `- ${index + 1}. [${item.itemType}] ${item.title} | ${item.summary}`)
  ].join('\n');
};

const runFilterExpressionQuery = (
  request: AssistantLocalQueryRequest,
  context: AssistantLocalSearchContext
): AssistantLocalQueryResultItem[] => {
  const targets = expandTargets(request.targets);
  const condition = parseFilterExpression(request.query);
  const items: AssistantLocalQueryResultItem[] = [];

  if (targets.includes('logs')) {
    context.logs.forEach((log) => {
      if (!matchesFilter(log, condition, {
        categories: context.categories,
        scopes: context.scopes,
        todos: context.todos,
        todoCategories: context.todoCategories
      })) {
        return;
      }

      items.push(buildLogItem(log, context));
    });
  }

  if (targets.includes('todos')) {
    context.todos.forEach((todo) => {
      if (!matchesTodoFilter(todo, condition, {
        categories: context.categories,
        scopes: context.scopes,
        todoCategories: context.todoCategories
      })) {
        return;
      }

      items.push(buildTodoItem(todo, context));
    });
  }

  return items;
};

const runKeywordSearchQuery = (
  request: AssistantLocalQueryRequest,
  context: AssistantLocalSearchContext
): AssistantLocalQueryResultItem[] => {
  const targets = expandTargets(request.targets);
  const selectedTypes = targets.flatMap((target) => {
    switch (target) {
      case 'logs':
        return ['record'] as const;
      case 'todos':
        return ['todo'] as const;
      case 'reviews':
        return ['review'] as const;
      case 'categories':
        return ['category'] as const;
      case 'activities':
        return ['activity'] as const;
      case 'scopes':
        return ['scope'] as const;
      default:
        return [];
    }
  });

  const searchResults = runSearchAll({
    query: request.query,
    searchMode: 'partial',
    selectedTypes: Array.from(new Set(selectedTypes)),
    logs: context.logs,
    categories: context.categories,
    todos: context.todos,
    todoCategories: context.todoCategories,
    scopes: context.scopes,
    dailyReviews: context.dailyReviews,
    weeklyReviews: context.weeklyReviews,
    monthlyReviews: context.monthlyReviews
  });

  if (!searchResults) {
    return [];
  }

  return [
    ...searchResults.records.map(({ log }) => buildLogItem(log, context)),
    ...searchResults.todos.map(({ todo }) => buildTodoItem(todo, context)),
    ...searchResults.reviews.map((review) => buildReviewItem(review)),
    ...searchResults.categories.map((category) => buildCategoryItem(category)),
    ...searchResults.activities.map(({ activity, category }) => buildActivityItem(activity, category)),
    ...searchResults.scopes.map((scope) => buildScopeItem(scope))
  ];
};

export const assistantLocalSearchService = {
  clampLimit,

  buildSkippedResult(
    round: number,
    request: AssistantLocalQueryRequest,
    statusMessage: string
  ): AssistantLocalQueryResult {
    const result: AssistantLocalQueryResult = {
      round,
      request: {
        ...request,
        targets: expandTargets(request.targets),
        limit: clampLimit(request.limit)
      },
      status: 'rejected_duplicate',
      statusMessage,
      hitCount: 0,
      items: [],
      digest: ''
    };

    return {
      ...result,
      digest: buildResultDigest(result)
    };
  },

  runQuery({
    round,
    request,
    logs,
    categories,
    todos,
    todoCategories,
    scopes,
    dailyReviews,
    weeklyReviews,
    monthlyReviews
  }: AssistantLocalSearchParams): AssistantLocalQueryResult {
    const normalizedRequest: AssistantLocalQueryRequest = {
      ...request,
      targets: expandTargets(request.targets),
      limit: clampLimit(request.limit)
    };

    const context: AssistantLocalSearchContext = {
      logs,
      categories,
      todos,
      todoCategories,
      scopes,
      dailyReviews,
      weeklyReviews,
      monthlyReviews
    };

    const rawItems = normalizedRequest.mode === 'filter_expression'
      ? runFilterExpressionQuery(normalizedRequest, context)
      : runKeywordSearchQuery(normalizedRequest, context);
    const items = rawItems.slice(0, normalizedRequest.limit || DEFAULT_QUERY_LIMIT);
    const result: AssistantLocalQueryResult = {
      round,
      request: normalizedRequest,
      status: 'executed',
      hitCount: rawItems.length,
      items,
      digest: ''
    };

    return {
      ...result,
      digest: buildResultDigest(result)
    };
  },

  buildQueryHistoryDigest(results: AssistantLocalQueryResult[]): string | undefined {
    if (results.length === 0) {
      return undefined;
    }

    return [
      '=== Local Query Context ===',
      ...results.map((result) => result.digest)
    ].join('\n\n');
  }
};
