/**
 * @file excelExportService.test.ts
 * @input Logs with custom attributes and related datasets.
 * @output Regression coverage for complete XLSX workbook construction.
 * @pos Service test
 */

import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import type { Category, DailyReview, Log, TodoCategory, TodoItem } from '../types';
import { buildExcelWorkbook } from './excelExportService';

const categories: Category[] = [{
  id: 'cat',
  name: '学习',
  icon: '📚',
  themeColor: '#333',
  activities: [{
    id: 'activity',
    name: '阅读',
    icon: '📖',
    color: 'bg-stone-100',
    attributes: [{
      id: 'format',
      name: '形式',
      type: 'single',
      options: [{ id: 'book', label: '书籍' }],
      order: 0,
      createdAt: 1,
      updatedAt: 1
    }]
  }]
}];

const todos: TodoItem[] = [{
  id: 'todo',
  categoryId: 'todo-category',
  title: '复盘',
  isCompleted: false,
  note: '保留这条备注'
}];

const todoCategories: TodoCategory[] = [{ id: 'todo-category', name: '计划', icon: '🗂️' }];

const log: Log = {
  id: 'log',
  categoryId: 'cat',
  activityId: 'activity',
  startTime: new Date(2026, 9, 7, 9).getTime(),
  endTime: new Date(2026, 9, 7, 10).getTime(),
  duration: 3600,
  title: '上午阅读',
  linkedTodoId: 'todo',
  attributeValues: [{ attributeId: 'format', optionId: 'book' }],
  moodScore: 4,
  comments: [{ id: 'comment', content: '很好', createdAt: 1 }]
};

describe('excelExportService', () => {
  it('exports readable attribute columns and raw log metadata', () => {
    const workbook = buildExcelWorkbook([log], categories, todos, todoCategories, [], new Date(2026, 9, 7), new Date(2026, 9, 7));
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['时间记录']);

    expect(rows[0]).toMatchObject({
      标题: '上午阅读',
      心情得分: 4,
      属性JSON: '[{"attributeId":"format","optionId":"book"}]',
      '属性:阅读/形式 [format]': '书籍'
    });
  });

  it('creates related data sheets even when they contain only optional review data', () => {
    const review: DailyReview = {
      id: 'review',
      date: '2026-10-07',
      createdAt: 1,
      updatedAt: 1,
      answers: [],
      summary: '摘要'
    };
    const workbook = buildExcelWorkbook([], categories, todos, todoCategories, [], new Date(2026, 9, 7), new Date(2026, 9, 7), {
      dailyReviews: [review]
    });

    expect(workbook.SheetNames).toEqual(expect.arrayContaining(['时间记录', '属性定义', '待办', '节点', '节点分类', '集合', '集合条目', '日报', '周报', '月报']));
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['日报']);
    expect(rows[0]).toMatchObject({ 日期: '2026-10-07', 摘要: '摘要' });
  });
});
