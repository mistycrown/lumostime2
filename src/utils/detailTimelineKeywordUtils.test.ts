/**
 * @file detailTimelineKeywordUtils.test.ts
 * @input Timeline keywords, Activity choice attributes, and historical logs.
 * @output Regression coverage for note and attribute keyword matching.
 * @pos Utility test
 * @description Verifies attribute selections join keyword calendars without replacing existing note keyword behavior.
 * @updated 2026-09-03: Created for Activity attribute keyword sources.
 */
import { describe, expect, it } from 'vitest';
import { ActivityAttributeDefinition, Log } from '../types';
import { getActivityKeywordCandidates, getDetailTimelineKeywords, getLogMatchedDetailTimelineKeywords, syncActivityKeywordsWithAttribute } from './detailTimelineKeywordUtils';

const keywordAttribute: ActivityAttributeDefinition = {
  id: 'content',
  name: '内容',
  type: 'multi',
  isKeywordSource: true,
  options: [
    { id: 'run', label: '跑步' },
    { id: 'rope', label: '跳绳' },
    { id: 'hike', label: '爬山' },
    { id: 'old', label: '已归档', isArchived: true }
  ],
  order: 0,
  createdAt: 1,
  updatedAt: 1
};

const makeLog = (options: Partial<Log> = {}): Log => ({
  id: 'log-1',
  categoryId: 'category-1',
  activityId: 'activity-1',
  startTime: 1,
  endTime: 2,
  duration: 1,
  ...options
});

describe('detailTimelineKeywordUtils', () => {
  it('registers every active option from the keyword-source attribute', () => {
    expect(getActivityKeywordCandidates({
      keywords: ['运动'],
      attributes: [keywordAttribute]
    })).toEqual(['运动', '跑步', '跳绳', '爬山']);
  });

  it('combines configured and attribute keywords while removing duplicate labels', () => {
    expect(getDetailTimelineKeywords(['运动', '跑步'], keywordAttribute)).toEqual([
      '运动', '跑步', '跳绳', '爬山'
    ]);
  });

  it('matches historical single and multi selections without requiring note text', () => {
    expect(getLogMatchedDetailTimelineKeywords(
      makeLog({ attributeValues: [{ attributeId: 'content', optionIds: ['rope', 'hike', 'old'] }] }),
      getDetailTimelineKeywords([], keywordAttribute),
      keywordAttribute
    )).toEqual(['跳绳', '爬山']);

    expect(getLogMatchedDetailTimelineKeywords(
      makeLog({ attributeValues: [{ attributeId: 'content', optionId: 'run' }] }),
      getDetailTimelineKeywords([], keywordAttribute),
      keywordAttribute
    )).toEqual(['跑步']);
  });

  it('keeps note keyword matches alongside selected attribute options', () => {
    const keywords = getDetailTimelineKeywords(['朋友'], keywordAttribute);
    expect(getLogMatchedDetailTimelineKeywords(
      makeLog({ note: '和朋友吃饭', attributeValues: [{ attributeId: 'content', optionIds: ['run'] }] }),
      keywords,
      keywordAttribute
    )).toEqual(['朋友', '跑步']);
  });

  it('registers attribute options, preserves colors, and removes stale options', () => {
    const first = syncActivityKeywordsWithAttribute([{ label: '旧颜色', source: 'attribute', attributeId: 'content', optionId: 'run', color: '#123456' }], [keywordAttribute]);
    expect(first.find((keyword) => keyword.optionId === 'run')?.color).toBe('#123456');
    expect(first).toHaveLength(3);
    const renamed = syncActivityKeywordsWithAttribute(first, [{ ...keywordAttribute, options: [{ id: 'run', label: '跑步' }] }]);
    expect(renamed).toHaveLength(1);
    expect(renamed[0]).toMatchObject({ label: '跑步', optionId: 'run', color: '#123456' });
    expect(syncActivityKeywordsWithAttribute(renamed, [{ ...keywordAttribute, isKeywordSource: false }])).toEqual([]);
  });
});
