/**
 * @file feishuLogDescription.test.ts
 * @input Saved logs with text/choice/numeric attributes, ratings and linked entities.
 * @output Description completeness, readable layout and deleted-reference/length regressions.
 * @pos Feishu calendar formatting tests.
 */
import { expect, it } from 'vitest';
import type { Category, Log } from '../types';
import { formatFeishuLogDescription, FEISHU_LOG_DESCRIPTION_LIMIT } from './feishuLogDescription';
import { prepareFeishuLogImport } from './feishuLogImport';

const category: Category = { id: 'work', name: '工作', icon: '', themeColor: '#336699', activities: [{
  id: 'read', name: '阅读', icon: '', color: 'bg-blue-100', attributes: [
    { id: 'pages', name: '阅读页数', type: 'number', unit: '页', order: 3, createdAt: 1, updatedAt: 1 },
    { id: 'book', name: '书名', type: 'text', order: 0, createdAt: 1, updatedAt: 1 },
    { id: 'mode', name: '阅读方式', type: 'single', options: [{ id: 'paper', label: '纸质书', isArchived: true }], isArchived: true, order: 1, createdAt: 1, updatedAt: 1 },
    { id: 'topics', name: '主题', type: 'multi', options: [{ id: 'design', label: '设计' }, { id: 'psychology', label: '心理学' }], order: 2, createdAt: 1, updatedAt: 1 }
  ]
}] };
const log: Log = { id: 'log-1', categoryId: 'work', activityId: 'read',
  startTime: new Date(2026, 9, 3, 9).getTime(), endTime: new Date(2026, 9, 3, 10).getTime(), duration: 3600 };

it('exports every requested field with readable names, units and section spacing', () => {
  const selected = prepareFeishuLogImport([{ ...log, note: '读完第二章。\r\n明天继续。', focusScore: 4, moodScore: 5,
    linkedTodoId: 'todo-1', scopeIds: ['growth', 'health'], progressIncrement: 12,
    attributeValues: [{ attributeId: 'pages', value: 12 }, { attributeId: 'book', value: '设计心理学' },
      { attributeId: 'mode', optionId: 'paper' }, { attributeId: 'topics', optionIds: ['design', 'psychology'] }] }],
  [category], { startDate: '20261003', endDate: '20261003' }, {
    todos: [{ id: 'todo-1', title: '读完这本书' }], scopes: [{ id: 'growth', name: '个人成长' }, { id: 'health', name: '健康' }]
  });
  expect(selected.records[0].note).toBe([
    '【备注】\n读完第二章。\n明天继续。',
    '【属性】\n• 书名：设计心理学\n• 阅读方式：纸质书\n• 主题：设计、心理学\n• 阅读页数：12 页',
    '【状态】\n专注度：4 / 5\n情绪度：5 / 5',
    '【关联】\n关联待办：读完这本书\n待办 ID：todo-1\n\n关联领域：\n• 个人成长（ID：growth）\n• 健康（ID：health）\n\n本次进度：12',
    '【记录来源】\nLumosTime\n分类：工作\n标签：阅读\nLog ID：log-1'
  ].join('\n\n'));
});

it('keeps missing and archived references traceable and preserves numeric zero', () => {
  const result = formatFeishuLogDescription({ ...log, linkedTodoId: 'removed-todo', scopeIds: ['removed-scope', 'removed-scope'],
    attributeValues: [{ attributeId: 'pages', value: 0 }, { attributeId: 'mode', optionId: 'removed-option' }, { attributeId: 'removed-attribute', value: '旧内容' }] }, category, category.activities[0]);
  expect(result).toContain('阅读页数：0 页');
  expect(result).toContain('阅读方式：选项（removed-option）');
  expect(result).toContain('属性（removed-attribute）：旧内容');
  expect(result).toContain('关联待办：已删除或不可用\n待办 ID：removed-todo');
  expect(result.match(/ID：removed-scope/g)).toHaveLength(1);
});

it('omits empty sections and invalid ratings without inventing missing scores or links', () => {
  const result = formatFeishuLogDescription({ ...log, note: '  ', focusScore: 0, moodScore: NaN,
    attributeValues: [{ attributeId: 'book', value: '' }, { attributeId: 'pages', value: Infinity }] }, category, category.activities[0]);
  expect(result).toBe('【记录来源】\nLumosTime\n分类：工作\n标签：阅读\nLog ID：log-1');
});

it('keeps long notes beyond the old 2000-character cap and rejects oversized descriptions without truncating metadata', () => {
  const note = '长备注😀'.repeat(600);
  const result = formatFeishuLogDescription({ ...log, note, moodScore: 3, linkedTodoId: 'todo-1' }, category, category.activities[0]);
  expect(result).toContain(note);
  expect(result).toContain('情绪度：3 / 5');
  expect(result).toContain('Log ID：log-1');
  expect(() => formatFeishuLogDescription({ ...log, note: '文'.repeat(FEISHU_LOG_DESCRIPTION_LIMIT) }, category)).toThrow('超过 12000 字符');
});
