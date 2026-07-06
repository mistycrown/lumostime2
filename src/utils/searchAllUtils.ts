/**
 * @file searchAllUtils.ts
 * @input Search query plus local logs, todos, categories, scopes, and reviews
 * @output Reusable pure search-all result groups for UI search and assistant local-query flows
 * @pos Utils (Search)
 * @description Extracts the global search logic out of SearchView so manual search and assistant-triggered local retrieval use the same matching rules and result shaping.
 * @updated 2026-07-04: Added shared search-all helpers for foreground assistant local queries and SearchView reuse.
 */

import type {
  Category,
  DailyReview,
  Log,
  MonthlyReview,
  Scope,
  SearchType,
  TodoCategory,
  TodoItem,
  WeeklyReview
} from '../types';

export interface SearchAllReviewResult {
  type: 'daily' | 'weekly' | 'monthly';
  date: string;
  id: string;
  title: string;
  snippet?: string;
}

export interface SearchAllRecordResult {
  log: Log;
  category: Category;
  activity: {
    id: string;
    name: string;
    icon: string;
  };
}

export interface SearchAllActivityResult {
  activity: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  category: Category;
}

export interface SearchAllTodoResult {
  todo: TodoItem;
  category: TodoCategory;
}

export interface SearchAllResults {
  records: SearchAllRecordResult[];
  categories: Category[];
  activities: SearchAllActivityResult[];
  todos: SearchAllTodoResult[];
  scopes: Scope[];
  reviews: SearchAllReviewResult[];
}

export interface SearchAllParams {
  query: string;
  searchMode: 'all' | 'partial';
  selectedTypes: SearchType[];
  logs: Log[];
  categories: Category[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  scopes: Scope[];
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  monthlyReviews: MonthlyReview[];
}

const buildEmptyResults = (): SearchAllResults => ({
  records: [],
  categories: [],
  activities: [],
  todos: [],
  scopes: [],
  reviews: []
});

const getSnippet = (text: string, query: string): string | undefined => {
  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(query);
  if (index === -1) {
    return undefined;
  }

  const start = Math.max(0, index - 10);
  const end = Math.min(text.length, index + query.length + 20);
  return `${start > 0 ? '...' : ''}${text.substring(start, end)}${end < text.length ? '...' : ''}`;
};

const getReviewMatch = (
  review: {
    answers: Array<{ answer: string }>;
    summary?: string;
    narrative?: string;
  },
  query: string
): string | undefined => {
  const answerMatch = review.answers?.find((answer) => (
    Boolean(answer.answer) && answer.answer.toLowerCase().includes(query)
  ));
  if (answerMatch) {
    return getSnippet(answerMatch.answer, query);
  }

  if (review.summary && review.summary.toLowerCase().includes(query)) {
    return getSnippet(review.summary, query);
  }

  if (review.narrative && review.narrative.toLowerCase().includes(query)) {
    return getSnippet(review.narrative, query);
  }

  return undefined;
};

export const runSearchAll = ({
  query,
  searchMode,
  selectedTypes,
  logs,
  categories,
  todos,
  todoCategories,
  scopes,
  dailyReviews,
  weeklyReviews,
  monthlyReviews
}: SearchAllParams): SearchAllResults | null => {
  if (!query.trim()) {
    return null;
  }

  const lowerQuery = query.toLowerCase().trim();
  const typesToSearch = searchMode === 'all'
    ? ['record', 'category', 'activity', 'todo', 'scope', 'review'] as SearchType[]
    : selectedTypes;

  const results = buildEmptyResults();

  if (typesToSearch.includes('review')) {
    dailyReviews.forEach((review) => {
      const snippet = getReviewMatch(review, lowerQuery);
      const dateMatch = review.date.includes(lowerQuery);
      if (!snippet && !dateMatch) {
        return;
      }

      results.reviews.push({
        type: 'daily',
        date: review.date,
        id: review.date,
        title: `${review.date} 日报`,
        snippet: snippet || (dateMatch ? '日期匹配' : undefined)
      });
    });

    weeklyReviews.forEach((review) => {
      const snippet = getReviewMatch(review, lowerQuery);
      const dateMatch = review.weekStartDate.includes(lowerQuery);
      if (!snippet && !dateMatch) {
        return;
      }

      results.reviews.push({
        type: 'weekly',
        date: review.weekStartDate,
        id: review.id,
        title: `${review.weekStartDate} 周报`,
        snippet: snippet || (dateMatch ? '日期匹配' : undefined)
      });
    });

    monthlyReviews.forEach((review) => {
      const snippet = getReviewMatch(review, lowerQuery);
      const dateMatch = review.monthStartDate.includes(lowerQuery);
      if (!snippet && !dateMatch) {
        return;
      }

      results.reviews.push({
        type: 'monthly',
        date: review.monthStartDate,
        id: review.id,
        title: `${review.monthStartDate.substring(0, 7)} 月报`,
        snippet: snippet || (dateMatch ? '日期匹配' : undefined)
      });
    });
  }

  if (typesToSearch.includes('record')) {
    logs.forEach((log) => {
      const category = categories.find((item) => item.id === log.categoryId);
      const activity = category?.activities.find((item) => item.id === log.activityId);
      if (!category || !activity) {
        return;
      }

      const hasReactionMatch = log.reactions?.some((reaction) => (
        reaction.includes(lowerQuery) || lowerQuery.includes(reaction)
      ));

      if (
        log.title?.toLowerCase().includes(lowerQuery)
        || log.note?.toLowerCase().includes(lowerQuery)
        || activity.name.toLowerCase().includes(lowerQuery)
        || hasReactionMatch
      ) {
        results.records.push({
          log,
          category,
          activity: {
            id: activity.id,
            name: activity.name,
            icon: activity.icon
          }
        });
      }
    });
  }

  if (typesToSearch.includes('category')) {
    categories.forEach((category) => {
      if (category.name.toLowerCase().includes(lowerQuery)) {
        results.categories.push(category);
      }
    });
  }

  if (typesToSearch.includes('activity')) {
    categories.forEach((category) => {
      category.activities.forEach((activity) => {
        if (activity.name.toLowerCase().includes(lowerQuery)) {
          results.activities.push({
            activity: {
              id: activity.id,
              name: activity.name,
              icon: activity.icon,
              color: activity.color
            },
            category
          });
        }
      });
    });
  }

  if (typesToSearch.includes('todo')) {
    todos.forEach((todo) => {
      const category = todoCategories.find((item) => item.id === todo.categoryId);
      if (
        !category
        || (
          !todo.title.toLowerCase().includes(lowerQuery)
          && !todo.note?.toLowerCase().includes(lowerQuery)
        )
      ) {
        return;
      }

      results.todos.push({
        todo,
        category
      });
    });
  }

  if (typesToSearch.includes('scope')) {
    scopes.forEach((scope) => {
      if (
        scope.name.toLowerCase().includes(lowerQuery)
        || scope.description?.toLowerCase().includes(lowerQuery)
      ) {
        results.scopes.push(scope);
      }
    });
  }

  return results;
};

export const countSearchAllResults = (results: SearchAllResults | null): number => (
  results
    ? (
      results.records.length
      + results.categories.length
      + results.activities.length
      + results.todos.length
      + results.scopes.length
      + results.reviews.length
    )
    : 0
);
