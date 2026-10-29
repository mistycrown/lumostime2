/**
 * @file widgetService.dailyCheckList.test.ts
 * @input Daily templates, review snapshots, and queued native daily actions.
 * @output Payload and replay regression checks for the quick-check list widget.
 * @updated 2026-10-29: Covers type safety, template order, disabled items and capped replay.
 */
import { describe, expect, it } from 'vitest';
import type { CheckTemplate, DailyReview } from '../types';
import { applyDailyCheckActionForDate } from '../utils/dailyCheckUtils';
import { buildDailyWidgetSyncPayload } from './widgetService';

const templates: CheckTemplate[] = [{
  id: 'daily', title: '日课', enabled: true, isDaily: true, order: 1,
  items: [
    { id: 'rise', content: '早起', type: 'manual' },
    { id: 'water', content: '饮水', type: 'manual', manualMode: 'count', targetCount: 8 },
    { id: 'auto', content: '专注', type: 'auto' },
    { id: 'hidden', content: '隐藏', type: 'manual', enabled: false }
  ]
}];
const date = new Date(2026, 9, 29, 12);
const dateStr = '2026-10-29';

describe('daily check list payload', () => {
  it('preserves template order and explicit manual/auto types while excluding disabled items', () => {
    const payload = buildDailyWidgetSyncPayload({ dailyReviews: [], checkTemplates: templates, date });
    expect(payload.items.map(item => [item.checkItemId, item.type, item.manualMode])).toEqual([
      ['rise', 'manual', 'binary'], ['water', 'manual', 'count'], ['auto', 'auto', 'binary']
    ]);
    expect(payload.progress.filter(item => item.date === dateStr).map(item => item.currentCount)).toEqual([0, 0, 0]);
  });

  it('does not carry yesterdays completion into today or move completed rows', () => {
    const dailyReviews: DailyReview[] = [{
      id: 'yesterday', date: '2026-10-28', createdAt: 1, updatedAt: 1, answers: [],
      checkItems: [{ id: 'rise', content: '早起', isCompleted: true }]
    }];
    const payload = buildDailyWidgetSyncPayload({ dailyReviews, checkTemplates: templates, date });
    expect(payload.progress.find(item => item.checkItemId === 'rise' && item.date === dateStr)?.isCompleted).toBe(false);
    expect(payload.progress.find(item => item.checkItemId === 'rise' && item.date === '2026-10-28')?.isCompleted).toBe(true);
    expect(payload.items.map(item => item.checkItemId)).toEqual(['rise', 'water', 'auto']);
  });

  it('handles an empty template library', () => {
    expect(buildDailyWidgetSyncPayload({ dailyReviews: [], checkTemplates: [], date }).items).toEqual([]);
  });

  it('mirrors packaged UI icon assets while keeping an emoji fallback', () => {
    const checkTemplates = [{ ...templates[0], items: [{ id: 'read', content: '阅读', icon: '📖', uiIcon: 'ui:book' }] }];
    const item = buildDailyWidgetSyncPayload({ dailyReviews: [], checkTemplates, date }).items[0];
    expect(item.icon).toBe('📖');
    expect(item.uiIcon).toBe('ui:book');
    expect(item.uiIconAssetPath).toMatch(/^uiicon\/default\/\d+\.webp$/);
    expect(item.uiIconFallbackAssetPath).toBe(item.uiIconAssetPath?.replace('.webp', '.png'));
  });
});

describe('native daily check list action replay', () => {
  const replay = (dailyReviews: DailyReview[], checkItemId: string, actionMode: 'toggle' | 'increment') => (
    applyDailyCheckActionForDate({ dateStr, dailyReviews, checkTemplates: templates, reviewTemplates: [], checkItemId, actionMode })
  );

  it('creates todays review offline and replays completion followed by cancellation', () => {
    const completed = replay([], 'rise', 'toggle');
    expect(completed.createdReview).toBe(true);
    expect(completed.item?.isCompleted).toBe(true);
    const cancelled = replay(completed.updatedReviews!, 'rise', 'toggle');
    expect(cancelled.item?.isCompleted).toBe(false);
    expect(cancelled.updatedReviews?.filter(review => review.date === dateStr)).toHaveLength(1);
  });

  it('replays repeated increments up to the target without resetting completion', () => {
    let reviews: DailyReview[] = [];
    for (let tap = 0; tap < 10; tap++) {
      const result = replay(reviews, 'water', 'increment');
      reviews = result.updatedReviews || reviews;
      expect(result.item?.currentCount).toBe(Math.min(8, tap + 1));
      if (tap >= 8) expect(result.status).toBe('limit_reached');
    }
    expect(reviews[0].checkItems?.find(item => item.id === 'water')?.isCompleted).toBe(true);
  });

  it('rejects automatic and removed items without creating a review', () => {
    expect(replay([], 'auto', 'toggle').status).toBe('unsupported_type');
    expect(replay([], 'missing', 'toggle').status).toBe('not_found');
    expect(replay([], 'auto', 'toggle').createdReview).toBe(false);
  });
});
