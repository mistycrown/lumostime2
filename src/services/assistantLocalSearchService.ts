/**
 * @file assistantLocalSearchService.ts
 * @input Assistant local-query requests plus local logs, todos, categories, scopes, reviews, principles, and self-beliefs
 * @output Structured local-query hits and compact text digests for foreground assistant retrieval loops
 * @pos Service (Assistant Local Query)
 * @description Executes foreground assistant local queries against shared custom-filter and search-all logic so the model can request focused local facts without forcing every turn through a retrieval pass.
 * @updated 2026-07-06: Added full-list principle and self-belief retrieval targets for foreground assistant local queries.
 * @updated 2026-07-06: Raised the default foreground local-query window to 20 items, allowed larger incremental limit requests, and kept total-hit counts separate from the current returned slice.
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

interface StoredPrinciple {
  id: string;
  title: string;
  frontText?: string;
  backText?: string;
  descriptions?: StoredSelfBeliefDescription[];
}

interface StoredSelfBeliefDescription {
  id: string;
  text: string;
  date?: string;
  source?: 'manual' | 'ai';
  createdAt?: string;
  updatedAt?: string;
}

interface StoredSelfBelief {
  id: string;
  title: string;
  descriptions: StoredSelfBeliefDescription[];
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_QUERY_LIMIT = 20;
const MAX_QUERY_LIMIT = 100;
const PRINCIPLES_STORAGE_KEY = 'lumostime_principles';
const SELF_BELIEFS_STORAGE_KEY = 'lumostime_self_beliefs';

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

const readJsonArrayFromStorage = (key: string): unknown[] => {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  const stored = localStorage.getItem(key);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`[assistantLocalSearchService] Failed to parse ${key}`, error);
    return [];
  }
};

const loadStoredPrinciples = (): StoredPrinciple[] => (
  readJsonArrayFromStorage(PRINCIPLES_STORAGE_KEY).flatMap((item): StoredPrinciple[] => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Partial<StoredPrinciple>;
    const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
    if (!title) {
      return [];
    }

    const descriptions = Array.isArray((candidate as StoredPrinciple).descriptions)
      ? normalizeSelfBeliefDescriptions((candidate as StoredPrinciple).descriptions)
      : [];

    return [{
      id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : `principle-${title}`,
      title,
      ...(typeof candidate.frontText === 'string' && candidate.frontText.trim() ? { frontText: candidate.frontText.trim() } : {}),
      ...(typeof candidate.backText === 'string' && candidate.backText.trim() ? { backText: candidate.backText.trim() } : {}),
      ...(descriptions.length > 0 ? { descriptions } : {})
    }];
  })
);

const normalizeSelfBeliefDescriptions = (value: unknown): StoredSelfBeliefDescription[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item): StoredSelfBeliefDescription[] => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Partial<StoredSelfBeliefDescription>;
    const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
    if (!text) {
      return [];
    }

    return [{
      id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : `description-${text}`,
      text,
      ...(typeof candidate.date === 'string' && candidate.date.trim() ? { date: candidate.date.trim() } : {}),
      source: candidate.source === 'ai' ? 'ai' : 'manual',
      ...(typeof candidate.createdAt === 'string' && candidate.createdAt.trim() ? { createdAt: candidate.createdAt.trim() } : {}),
      ...(typeof candidate.updatedAt === 'string' && candidate.updatedAt.trim() ? { updatedAt: candidate.updatedAt.trim() } : {})
    }];
  });
};

const loadStoredSelfBeliefs = (): StoredSelfBelief[] => (
  readJsonArrayFromStorage(SELF_BELIEFS_STORAGE_KEY).flatMap((item): StoredSelfBelief[] => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Partial<StoredSelfBelief> & { evidence?: unknown[] };
    const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
    if (!title) {
      return [];
    }

    const rawDescriptions = Array.isArray(candidate.descriptions)
      ? candidate.descriptions
      : Array.isArray(candidate.evidence)
        ? candidate.evidence
        : [];

    return [{
      id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : `self-belief-${title}`,
      title,
      descriptions: normalizeSelfBeliefDescriptions(rawDescriptions),
      ...(typeof candidate.createdAt === 'string' && candidate.createdAt.trim() ? { createdAt: candidate.createdAt.trim() } : {}),
      ...(typeof candidate.updatedAt === 'string' && candidate.updatedAt.trim() ? { updatedAt: candidate.updatedAt.trim() } : {})
    }];
  })
);

const buildPrincipleItem = (principle: StoredPrinciple): AssistantLocalQueryResultItem => ({
  itemType: 'principle',
  id: principle.id,
  title: principle.title,
  summary: [
    principle.frontText ? `front: ${principle.frontText}` : '',
    principle.backText ? `back: ${principle.backText}` : '',
    principle.descriptions && principle.descriptions.length > 0
      ? `descriptions: ${principle.descriptions.map((description, index) => `${index + 1}. ${description.text}${description.date ? ` (${description.date})` : ''}`).join(' | ')}`
      : ''
  ].filter(Boolean).join(' | ') || 'principle',
  metadata: {
    frontText: principle.frontText,
    backText: principle.backText,
    descriptions: principle.descriptions || []
  }
});

const buildSelfBeliefItem = (selfBelief: StoredSelfBelief): AssistantLocalQueryResultItem => ({
  itemType: 'selfBelief',
  id: selfBelief.id,
  title: selfBelief.title,
  summary: selfBelief.descriptions.length > 0
    ? selfBelief.descriptions.map((description, index) => (
      `${index + 1}. ${description.text}${description.date ? ` (${description.date})` : ''}`
    )).join(' | ')
    : 'self-belief',
  metadata: {
    descriptions: selfBelief.descriptions,
    createdAt: selfBelief.createdAt,
    updatedAt: selfBelief.updatedAt
  }
});

const parseSortableDate = (value: unknown): number => {
  if (typeof value !== 'string' || !value.trim()) {
    return Number.NaN;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
};

const buildLogSortTimestamp = (item: AssistantLocalQueryResultItem): number => {
  const metadata = item.metadata || {};
  const dateValue = typeof metadata.date === 'string' ? metadata.date : '';
  const timeRangeValue = typeof metadata.timeRange === 'string' ? metadata.timeRange : '';
  const startTime = timeRangeValue.split('-')[0] || '00:00';
  return parseSortableDate(`${dateValue}T${startTime}:00`);
};

const sortQueryItems = (items: AssistantLocalQueryResultItem[]): AssistantLocalQueryResultItem[] => (
  [...items].sort((left, right) => {
    if (left.itemType === 'log' && right.itemType === 'log') {
      return buildLogSortTimestamp(right) - buildLogSortTimestamp(left);
    }

    if (left.itemType === 'review' && right.itemType === 'review') {
      const leftTimestamp = parseSortableDate(String(left.metadata?.date || ''));
      const rightTimestamp = parseSortableDate(String(right.metadata?.date || ''));
      return rightTimestamp - leftTimestamp;
    }

    if (left.itemType !== right.itemType) {
      return left.itemType.localeCompare(right.itemType);
    }

    return left.title.localeCompare(right.title, 'zh-CN');
  })
);

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
    ...result.items.map((item, index) => `- ${index + 1}. [${item.itemType}] id=${item.id} | ${item.title} | ${item.summary}`)
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
      case 'principles':
      case 'selfBeliefs':
        return [];
      default:
        return [];
    }
  });

  const searchResults = selectedTypes.length > 0
    ? runSearchAll({
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
    })
    : undefined;

  return [
    ...(searchResults
      ? [
        ...searchResults.records.map(({ log }) => buildLogItem(log, context)),
        ...searchResults.todos.map(({ todo }) => buildTodoItem(todo, context)),
        ...searchResults.reviews.map((review) => buildReviewItem(review)),
        ...searchResults.categories.map((category) => buildCategoryItem(category)),
        ...searchResults.activities.map(({ activity, category }) => buildActivityItem(activity, category)),
        ...searchResults.scopes.map((scope) => buildScopeItem(scope))
      ]
      : []),
    ...(targets.includes('principles') ? loadStoredPrinciples().map(buildPrincipleItem) : []),
    ...(targets.includes('selfBeliefs') ? loadStoredSelfBeliefs().map(buildSelfBeliefItem) : [])
  ];
};

const shouldReturnFullResult = (targets: AssistantLocalQueryTarget[]): boolean => (
  targets.some((target) => target === 'principles' || target === 'selfBeliefs')
);

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
    const sortedItems = sortQueryItems(rawItems);
    const items = shouldReturnFullResult(normalizedRequest.targets)
      ? sortedItems
      : sortedItems.slice(0, normalizedRequest.limit || DEFAULT_QUERY_LIMIT);
    const result: AssistantLocalQueryResult = {
      round,
      request: normalizedRequest,
      status: 'executed',
      hitCount: sortedItems.length,
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
