/**
 * @file searchAllUtils.test.ts
 * @input Search-all records with custom Activity attributes.
 * @output Regression coverage for searching attribute names and stored values.
 */
import { describe, expect, it } from 'vitest';
import { Category, Log } from '../types';
import { runSearchAll } from './searchAllUtils';

const activity: Category['activities'][number] = {
  id: 'activity-reading',
  name: '阅读',
  icon: 'R',
  color: 'bg-stone-100',
  attributes: [
    {
      id: 'format',
      name: '格式',
      type: 'single',
      options: [{ id: 'book', label: '书籍' }, { id: 'paper', label: '论文' }],
      order: 0,
      createdAt: 1,
      updatedAt: 1
    },
    {
      id: 'remark',
      name: '备注属性',
      type: 'text',
      order: 1,
      createdAt: 1,
      updatedAt: 1
    }
  ]
};

const category: Category = {
  id: 'category-study',
  name: '学习',
  icon: 'S',
  activities: [activity],
  themeColor: '#333333'
};

const log: Log = {
  id: 'log-1',
  categoryId: category.id,
  activityId: activity.id,
  startTime: 1,
  endTime: 2,
  duration: 1,
  attributeValues: [
    { attributeId: 'format', optionId: 'book' },
    { attributeId: 'remark', value: '深度阅读' }
  ]
};

const search = (query: string) => runSearchAll({
  query,
  searchMode: 'all',
  selectedTypes: [],
  logs: [log],
  categories: [category],
  todos: [],
  todoCategories: [],
  scopes: [],
  dailyReviews: [],
  weeklyReviews: [],
  monthlyReviews: []
});

describe('searchAllUtils custom attributes', () => {
  it('matches text values and choice option labels on records', () => {
    expect(search('深度阅读')?.records).toHaveLength(1);
    expect(search('书籍')?.records).toHaveLength(1);
  });

  it('does not match custom attribute names on records', () => {
    expect(search('备注属性')?.records).toHaveLength(0);
  });
});
