/**
 * @file assistantLocalSearchService.test.ts
 * @input Synthetic local assistant-query requests plus lightweight logs/todos/categories/reviews fixtures
 * @output Regression coverage for foreground local-query matching and digest formatting
 * @pos Test (Assistant Local Query)
 * @description Verifies that foreground assistant local queries can hit shared keyword-search targets and emit stable digests for follow-up unified turns and debug rendering.
 * @updated 2026-07-06: Added basic keyword-search coverage for todo/category hits and query-history digest formatting.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { assistantLocalSearchService } from './assistantLocalSearchService';

const installLocalStorageMock = () => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear()
    }
  });
};

describe('assistantLocalSearchService', () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  it('returns all stored principles without keyword filtering or limit slicing', () => {
    localStorage.setItem('lumostime_principles', JSON.stringify([
      {
        id: 'principle-1',
        title: '拥抱现实',
        frontText: '先看清事实',
        backText: '现实不会因为回避而消失'
      },
      {
        id: 'principle-2',
        title: '五步流程',
        frontText: '目标、问题、诊断、方案、执行',
        backText: '慢慢走完整个闭环'
      }
    ]));

    const result = assistantLocalSearchService.runQuery({
      round: 1,
      request: {
        mode: 'keyword_search',
        targets: ['principles'],
        query: '自我鼓励',
        limit: 1
      },
      logs: [],
      categories: [],
      todos: [],
      todoCategories: [],
      scopes: [],
      dailyReviews: [],
      weeklyReviews: [],
      monthlyReviews: []
    });

    expect(result.hitCount).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.itemType)).toEqual(['principle', 'principle']);
    expect(result.digest).toContain('[principle] id=principle-1 | 拥抱现实');
    expect(result.digest).toContain('[principle] id=principle-2 | 五步流程');
  });

  it('returns all stored self-beliefs with description metadata and legacy evidence compatibility', () => {
    localStorage.setItem('lumostime_self_beliefs', JSON.stringify([
      {
        id: 'belief-1',
        title: '我是一个学习能力很强的人',
        descriptions: [{
          id: 'description-1',
          text: '两周学完基础编程并做出第一个工具',
          date: '2026-07-06',
          source: 'manual'
        }]
      },
      {
        id: 'belief-2',
        title: '我是一个勇于尝试的人',
        evidence: [{
          id: 'legacy-evidence-1',
          text: '主动尝试把原则库接入 AI 对话',
          date: '2026-07-06',
          source: 'manual'
        }]
      }
    ]));

    const result = assistantLocalSearchService.runQuery({
      round: 1,
      request: {
        mode: 'keyword_search',
        targets: ['selfBeliefs'],
        query: '用户自我认知',
        limit: 1
      },
      logs: [],
      categories: [],
      todos: [],
      todoCategories: [],
      scopes: [],
      dailyReviews: [],
      weeklyReviews: [],
      monthlyReviews: []
    });

    expect(result.hitCount).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.itemType)).toEqual(['selfBelief', 'selfBelief']);
    expect(result.digest).toContain('[selfBelief] id=belief-1 | 我是一个学习能力很强的人');
    expect(result.digest).toContain('两周学完基础编程');
    expect(result.digest).toContain('[selfBelief] id=belief-2 | 我是一个勇于尝试的人');
    expect(result.digest).toContain('主动尝试把原则库接入 AI 对话');
  });

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
    expect(result.digest).toContain('[todo] id=todo-1 | 修改论文结构');
    expect(result.digest).toContain('[category] id=study | 论文研究');
  });



  it('defaults to returning up to 20 items while preserving the full hit count', () => {
    const result = assistantLocalSearchService.runQuery({
      round: 1,
      request: {
        mode: 'keyword_search',
        targets: ['categories'],
        query: '??'
      },
      logs: [],
      categories: Array.from({ length: 25 }, (_, index) => ({
        id: `category-${index + 1}`,
        name: `???? ${index + 1}`,
        icon: '??',
        color: '#000000',
        activities: []
      })) as any,
      todos: [],
      todoCategories: [],
      scopes: [],
      dailyReviews: [],
      weeklyReviews: [],
      monthlyReviews: []
    });

    expect(result.hitCount).toBe(25);
    expect(result.items).toHaveLength(20);
  });

  it('allows larger requested limits up to the safety cap', () => {
    expect(assistantLocalSearchService.clampLimit()).toBe(20);
    expect(assistantLocalSearchService.clampLimit(50)).toBe(50);
    expect(assistantLocalSearchService.clampLimit(1000)).toBe(100);
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
