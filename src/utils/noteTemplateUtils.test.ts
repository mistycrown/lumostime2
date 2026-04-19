/**
 * @file noteTemplateUtils.test.ts
 * @input Shared note template helpers
 * @output Regression coverage for note template recommendation ordering and insertion behavior
 * @pos Test
 * @description Verifies that note template recommendations stay deduplicated and correctly ordered across selected entities and linked todos, and that template insertion appends cleanly to note text.
 * @updated 2026-04-19: Added focused note template utility coverage.
 */
import { describe, expect, it } from 'vitest';
import { appendTemplateToNote, getRecommendedNoteTemplates } from './noteTemplateUtils';
import { Category, Scope, TodoItem } from '../types';

const categories: Category[] = [
  {
    id: 'cat-reading',
    name: '阅读',
    icon: '📚',
    themeColor: '#111111',
    noteTemplates: [
      { id: 'cat-template', name: '分类模板', content: '记录章节与页码' }
    ],
    activities: [
      {
        id: 'act-deep-read',
        name: '精读',
        icon: '📝',
        color: 'bg-stone-100 text-stone-800',
        noteTemplates: [
          { id: 'act-template', name: '标签模板', content: '今天重点：' }
        ]
      },
      {
        id: 'act-review',
        name: '复盘',
        icon: '🔁',
        color: 'bg-stone-100 text-stone-800'
      }
    ]
  }
];

const scopes: Scope[] = [
  {
    id: 'scope-study',
    name: '学习',
    icon: '🎓',
    isArchived: false,
    order: 0,
    themeColor: '#222222',
    noteTemplates: [
      { id: 'scope-template', name: '领域模板', content: '输出一条可复用结论' }
    ]
  }
];

const todos: TodoItem[] = [
  {
    id: 'todo-1',
    categoryId: 'todo-cat',
    title: '读完第三章',
    isCompleted: false,
    linkedActivityId: 'act-deep-read',
    linkedCategoryId: 'cat-reading',
    defaultScopeIds: ['scope-study']
  }
];

describe('appendTemplateToNote', () => {
  it('returns template content directly when the note is empty', () => {
    expect(appendTemplateToNote('', '  第一条模板  ')).toBe('第一条模板');
  });

  it('appends a new line before template content when the note already has text', () => {
    expect(appendTemplateToNote('已有备注', '模板内容')).toBe('已有备注\n模板内容');
  });
});

describe('getRecommendedNoteTemplates', () => {
  it('orders selected activity/category/scope templates before linked todo fallbacks and deduplicates entity repeats', () => {
    const result = getRecommendedNoteTemplates({
      categories,
      scopes,
      todos,
      selectedCategoryId: 'cat-reading',
      selectedActivityId: 'act-deep-read',
      selectedScopeIds: ['scope-study'],
      linkedTodoId: 'todo-1'
    });

    expect(result.map((item) => item.name)).toEqual(['标签模板', '分类模板', '领域模板']);
    expect(result.map((item) => item.sourceLabel)).toEqual(['当前标签', '当前分类', '当前领域']);
  });

  it('falls back to linked todo templates when no explicit entities are selected', () => {
    const result = getRecommendedNoteTemplates({
      categories,
      scopes,
      todos,
      linkedTodoId: 'todo-1'
    });

    expect(result.map((item) => item.sourceLabel)).toEqual(['待办标签', '待办分类', '待办领域']);
  });
});
