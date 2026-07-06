/**
 * @file assistantLocalSearchService.test.ts
 * @input Synthetic local assistant-query requests plus lightweight logs/todos/categories/reviews fixtures
 * @output Regression coverage for foreground local-query matching and digest formatting
 * @pos Test (Assistant Local Query)
 * @description Verifies that foreground assistant local queries can hit shared keyword-search targets and emit stable digests for follow-up unified turns and debug rendering.
 * @updated 2026-07-06: Added basic keyword-search coverage for todo/category hits and query-history digest formatting.
 */

import { describe, expect, it } from 'vitest';
import { assistantLocalSearchService } from './assistantLocalSearchService';

describe('assistantLocalSearchService', () => {
  it('returns bounded keyword-search hits across todo and category targets', () => {
    const result = assistantLocalSearchService.runQuery({
      round: 1,
      request: {
        mode: 'keyword_search',
        targets: ['todos', 'categories'],
        query: '论文',
        limit: 5
      },
      logs: [],
      categories: [{
        id: 'study',
        name: '论文研究',
        icon: '📚',
        color: '#000000',
        activities: []
      }] as any,
      todos: [{
        id: 'todo-1',
        title: '修改论文结构',
        categoryId: 'project',
        isCompleted: false,
        note: '先收敛大纲'
      }] as any,
      todoCategories: [{
        id: 'project',
        name: '项目',
        icon: '🧩'
      }] as any,
      scopes: [],
      dailyReviews: [],
      weeklyReviews: [],
      monthlyReviews: []
    });

    expect(result.hitCount).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.itemType)).toEqual(['category', 'todo']);
    expect(result.digest).toContain('query=论文');
    expect(result.digest).toContain('[todo] 修改论文结构');
    expect(result.digest).toContain('[category] 论文研究');
  });

  it('matches log records through filter-expression tag and scope names even when note text does not contain the keyword', () => {
    const result = assistantLocalSearchService.runQuery({
      round: 1,
      request: {
        mode: 'filter_expression',
        targets: ['logs'],
        query: '#写作 %论文'
      },
      logs: [{
        id: 'log-1',
        title: '',
        categoryId: 'study',
        activityId: 'writing',
        scopeIds: ['paper'],
        note: '今天推进了一段第三章',
        linkedTodoId: undefined,
        startTime: new Date('2026-07-04T02:39:00+08:00').getTime(),
        endTime: new Date('2026-07-04T03:57:00+08:00').getTime()
      }] as any,
      categories: [{
        id: 'study',
        name: '学习',
        icon: '📚',
        color: '#000000',
        activities: [{
          id: 'writing',
          name: '写作',
          icon: '✍️',
          color: '#000000'
        }]
      }] as any,
      todos: [],
      todoCategories: [],
      scopes: [{
        id: 'paper',
        name: '论文',
        icon: '📝',
        color: '#000000'
      }] as any,
      dailyReviews: [],
      weeklyReviews: [],
      monthlyReviews: []
    });

    expect(result.hitCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.itemType).toBe('log');
    expect(result.digest).toContain('query=#写作 %论文');
  });

  it('builds skipped duplicate-query results for debug and chat rendering', () => {
    const result = assistantLocalSearchService.buildSkippedResult(2, {
      mode: 'filter_expression',
      targets: ['logs'],
      query: '#写作 %论文'
    }, '这轮查询与上一轮检索式完全相同，已拒绝执行。');

    expect(result.status).toBe('rejected_duplicate');
    expect(result.hitCount).toBe(0);
    expect(result.digest).toContain('status=rejected_duplicate');
    expect(result.digest).toContain('已拒绝执行');
  });

  it('builds a reusable local-query history digest from multiple rounds', () => {
    const digest = assistantLocalSearchService.buildQueryHistoryDigest([{
      round: 1,
      request: {
        mode: 'keyword_search',
        targets: ['todos'],
        query: '论文'
      },
      hitCount: 1,
      items: [{
        itemType: 'todo',
        id: 'todo-1',
        title: '修改论文结构',
        summary: '项目 | todo'
      }],
      digest: 'Round 1 | mode=keyword_search | targets=todos | query=论文 | hitCount=1'
    }]);

    expect(digest).toContain('=== Local Query Context ===');
    expect(digest).toContain('Round 1 | mode=keyword_search | targets=todos | query=论文 | hitCount=1');
  });
});
