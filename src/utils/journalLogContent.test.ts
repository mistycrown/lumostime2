/**
 * @file journalLogContent.test.ts
 * @input Historical attribute values and explicit wiki links in scoped logs
 * @output Completeness and immutability regressions for journal-rich content
 * @updated 2026-10-23: Covers archived/deleted options, zero scores, workflow answers and inline node wrapping.
 */
import { describe, expect, it } from 'vitest';
import type { Activity, Log } from '../types';
import { journalNoteRuns, wrapJournalNoteRuns, journalLogFields } from './journalLogContent';

const log: Log = { id: 'l', categoryId: 'c', activityId: 'a', startTime: new Date(2026, 9, 20).getTime(), endTime: new Date(2026, 9, 20, 1).getTime(), duration: 3600 };
describe('rich journal records', () => {
  it('retains archived definitions, missing choices, numeric zero and workflow answers', () => {
    const activity: Activity = { id: 'a', name: '阅读', icon: '', color: '#000000', attributes: [
      { id: 'n', name: '页数', type: 'number', unit: '页', order: 0, createdAt: 0, updatedAt: 0, isArchived: true },
      { id: 's', name: '题材', type: 'multi', options: [{ id: 'o', label: '历史', isArchived: true }], order: 1, createdAt: 0, updatedAt: 0 }
    ] };
    const source = { ...log, focusScore: 0, moodScore: 5, progressIncrement: 0, attributeValues: [{ attributeId: 'n', value: 0 }, { attributeId: 's', optionIds: ['o', 'deleted'] }, { attributeId: 'missing', value: '历史原文' }], appAwarenessMeta: { sourceAppName: '阅读器', sourceAppPackage: 'reader', workflowTemplateId: 'flow', workflowTemplateName: '阅读前', answers: { 意图: '读完一章', 是否完成: false, 次数: 0 } } };
    const before = JSON.stringify(source);
    const fields = journalLogFields(source, activity);
    expect(fields).toEqual(expect.arrayContaining([
      { label: '专注评分', value: '0/5' }, { label: '心情评分', value: '5/5' }, { label: '进度增量', value: '0' },
      { label: '页数', value: '0 页' }, { label: '题材', value: '历史 / 已删除选项 (deleted)' },
      { label: '属性 (missing)', value: '历史原文' }, { label: '是否完成', value: '否' }, { label: '次数', value: '0' }
    ]));
    expect(JSON.stringify(source)).toBe(before);
  });
  it('keeps node aliases in place and preserves paragraphs and canonical targets', () => {
    expect(journalNoteRuns('记下 [[小名丨阅读]]\n\n与［［写作］］有关。')).toEqual([
      { text: '记下 ' }, { text: '小名', node: '阅读' }, { text: '\n\n与' }, { text: '写作', node: '写作' }, { text: '有关。' }
    ]);
  });
  it('keeps a short node with closing punctuation on one line and retains blank paragraphs', () => {
    const lines = wrapJournalNoteRuns(journalNoteRuns('一起想到了[[夏日散步]]。\n\n再见。'), 7, (text) => [...text].length);
    expect(lines.map((line) => line.map((run) => run.text).join(''))).toEqual(['一起想到了', '夏日散步。', '', '再见。']);
    expect(lines[1].filter((run) => run.node).every((run) => run.node === '夏日散步')).toBe(true);
  });
});
