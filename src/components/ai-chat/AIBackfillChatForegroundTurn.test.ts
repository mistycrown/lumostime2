/**
 * @file AIBackfillChatForegroundTurn.test.ts
 * @input Foreground local-query normalization helpers plus dictionary-like category/scope fixtures
 * @output Regression coverage for log-query routing and filter-expression name normalization
 * @pos Test (AI Foreground Turn)
 * @description Verifies that foreground local log queries normalize filter-expression tokens to display names instead of raw ids before execution.
 * @updated 2026-07-06: Added coverage that converts `#writing %paper` into name-based filter tokens for log retrieval.
 */

import { describe, expect, it } from 'vitest';
import { normalizeLocalQueryRequestForExecution } from './AIBackfillChatForegroundTurn';

describe('foreground local-query normalization contract', () => {
  it('converts id-like filter-expression tokens into display names before executing log queries', () => {
    const normalized = normalizeLocalQueryRequestForExecution(
      '帮我找一下最近写论文的记录',
      {
        mode: 'filter_expression',
        targets: ['logs'],
        query: '#writing %paper'
      },
      [{
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
      [{
        id: 'paper',
        name: '论文',
        icon: '📝',
        color: '#000000'
      }] as any,
      [{
        id: 'todo-paper-3',
        title: '完成毕业论文第三章',
        categoryId: 'project',
        isCompleted: false
      }] as any,
      [{
        id: 'project',
        name: '项目',
        icon: '🧩'
      }] as any
    );

    expect(normalized.mode).toBe('filter_expression');
    expect(normalized.targets).toEqual(['logs']);
    expect(normalized.query).toBe('#写作 %论文');
    expect(normalized.reason).toBeUndefined();
  });



  it('treats a larger limit on the same query as a valid progressive follow-up', () => {
    const first = normalizeLocalQueryRequestForExecution(
      '?????????????',
      {
        mode: 'filter_expression',
        targets: ['logs'],
        query: '#writing %paper',
        limit: 20
      },
      [{
        id: 'study',
        name: '??',
        icon: '??',
        color: '#000000',
        activities: [{
          id: 'writing',
          name: '??',
          icon: '??',
          color: '#000000'
        }]
      }] as any,
      [{
        id: 'paper',
        name: '??',
        icon: '??',
        color: '#000000'
      }] as any,
      [],
      []
    );

    const second = normalizeLocalQueryRequestForExecution(
      '?????????????',
      {
        mode: 'filter_expression',
        targets: ['logs'],
        query: '#writing %paper',
        limit: 50
      },
      [{
        id: 'study',
        name: '??',
        icon: '??',
        color: '#000000',
        activities: [{
          id: 'writing',
          name: '??',
          icon: '??',
          color: '#000000'
        }]
      }] as any,
      [{
        id: 'paper',
        name: '??',
        icon: '??',
        color: '#000000'
      }] as any,
      [],
      []
    );

    expect(first.query).toBe('#?? %??');
    expect(second.query).toBe('#?? %??');
    expect(first.limit).toBe(20);
    expect(second.limit).toBe(50);
  });

  it('routes todo-like lookups to keyword search instead of log filter expressions', () => {
    const normalized = normalizeLocalQueryRequestForExecution(
      '帮我找一下论文相关待办',
      {
        mode: 'filter_expression',
        targets: ['all'],
        query: '#writing'
      },
      [],
      [],
      [],
      []
    );

    expect(normalized.mode).toBe('keyword_search');
    expect(normalized.targets).toEqual(['todos', 'reviews', 'categories', 'activities', 'scopes']);
    expect(normalized.query).toBe('#writing');
  });
});
