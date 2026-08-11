import { describe, expect, it } from 'vitest';
import type { CheckItem, CheckTemplate, DailyReview, ReviewTemplate } from '../types';
import {
  applyDailyCheckActionForDate,
  buildDailyCheckItems,
  filterDailyCheckItemsByEnabledTemplates,
  getDailyCheckTemplateMeta,
  getEligibleNfcDailyCheckItems,
  getEligibleTrackingCalendarDailyCheckItems
} from './dailyCheckUtils';

const reviewTemplates: ReviewTemplate[] = [
  {
    id: 'daily-template',
    title: '日报模板',
    questions: [],
    isSystem: false,
    order: 0,
    isDailyTemplate: true,
    syncToTimeline: false
  }
];

const checkTemplates: CheckTemplate[] = [
  {
    id: 'group-1',
    title: '晨间',
    items: [
      {
        id: 'check-binary',
        content: '喝水',
        type: 'manual',
        manualMode: 'binary'
      },
      {
        id: 'check-count',
        content: '拉伸',
        type: 'manual',
        manualMode: 'count',
        targetCount: 3
      },
      {
        id: 'check-auto',
        content: '自动项',
        type: 'auto'
      }
    ],
    enabled: true,
    order: 0,
    isDaily: true,
    syncToTimeline: false
  }
];

describe('dailyCheckUtils', () => {
  it('creates a daily review and completes a binary manual check on first NFC scan', () => {
    const result = applyDailyCheckActionForDate({
      dateStr: '2026-03-14',
      dailyReviews: [],
      checkTemplates,
      reviewTemplates,
      checkItemId: 'check-binary',
      actionMode: 'complete_once'
    });

    expect(result.status).toBe('completed');
    expect(result.createdReview).toBe(true);
    expect(result.updatedReviews).toHaveLength(1);
    expect(result.item?.isCompleted).toBe(true);
    expect(result.item?.currentCount).toBe(1);
  });

  it('does not change a binary manual check that is already completed', () => {
    const existingReviews: DailyReview[] = [
      {
        id: 'review-1',
        date: '2026-03-14',
        createdAt: 1,
        updatedAt: 1,
        answers: [],
        checkItems: [
          {
            id: 'check-binary',
            category: '晨间',
            content: '喝水',
            isCompleted: true,
            type: 'manual',
            manualMode: 'binary',
            currentCount: 1,
            targetCount: 1
          }
        ]
      }
    ];

    const result = applyDailyCheckActionForDate({
      dateStr: '2026-03-14',
      dailyReviews: existingReviews,
      checkTemplates,
      reviewTemplates,
      checkItemId: 'check-binary',
      actionMode: 'complete_once'
    });

    expect(result.status).toBe('already_completed');
    expect(result.item?.isCompleted).toBe(true);
    expect(result.updatedReviews?.[0].checkCategorySyncToTimeline).toEqual({ 晨间: false });
  });

  it('increments a count manual check and stops at the target limit', () => {
    const dayReview: DailyReview = {
      id: 'review-2',
      date: '2026-03-14',
      createdAt: 1,
      updatedAt: 1,
      answers: [],
      checkItems: [
        {
          id: 'check-count',
          category: '晨间',
          content: '拉伸',
          isCompleted: false,
          type: 'manual',
          manualMode: 'count',
          currentCount: 2,
          targetCount: 3
        }
      ]
    };

    const success = applyDailyCheckActionForDate({
      dateStr: '2026-03-14',
      dailyReviews: [dayReview],
      checkTemplates,
      reviewTemplates,
      checkItemId: 'check-count',
      actionMode: 'complete_once'
    });

    expect(success.status).toBe('completed');
    expect(success.item?.currentCount).toBe(3);
    expect(success.item?.isCompleted).toBe(true);

    const limitReached = applyDailyCheckActionForDate({
      dateStr: '2026-03-14',
      dailyReviews: success.updatedReviews || [],
      checkTemplates,
      reviewTemplates,
      checkItemId: 'check-count',
      actionMode: 'complete_once'
    });

    expect(limitReached.status).toBe('limit_reached');
    expect(limitReached.item?.currentCount).toBe(3);
  });

  it('resets a completed count manual check for the next sidebar click cycle', () => {
    const completedReview: DailyReview = {
      id: 'review-3',
      date: '2026-03-14',
      createdAt: 1,
      updatedAt: 1,
      answers: [],
      checkItems: [{
        id: 'check-count',
        category: '晨间',
        content: '拉伸',
        isCompleted: true,
        type: 'manual',
        manualMode: 'count',
        currentCount: 3,
        targetCount: 3
      }]
    };

    const result = applyDailyCheckActionForDate({
      dateStr: '2026-03-14',
      dailyReviews: [completedReview],
      checkTemplates,
      reviewTemplates,
      checkItemId: 'check-count',
      actionMode: 'reset'
    });

    expect(result.status).toBe('reset');
    expect(result.item?.currentCount).toBe(0);
    expect(result.item?.isCompleted).toBe(false);
  });

  it('cycles a completed count manual check back to zero for detail backfill', () => {
    const completedReview: DailyReview = {
      id: 'review-4',
      date: '2026-03-14',
      createdAt: 1,
      updatedAt: 1,
      answers: [],
      checkItems: [{
        id: 'check-count',
        category: '晨间',
        content: '拉伸',
        isCompleted: true,
        type: 'manual',
        manualMode: 'count',
        currentCount: 3,
        targetCount: 3
      }]
    };

    const result = applyDailyCheckActionForDate({
      dateStr: '2026-03-14',
      dailyReviews: [completedReview],
      checkTemplates,
      reviewTemplates,
      checkItemId: 'check-count',
      actionMode: 'cycle'
    });

    expect(result.status).toBe('toggled');
    expect(result.item?.currentCount).toBe(0);
    expect(result.item?.isCompleted).toBe(false);
  });

  it('cycles a count manual check through every value before resetting for widget replay', () => {
    let reviews: DailyReview[] = [];
    const counts: number[] = [];

    for (let index = 0; index < 4; index += 1) {
      const result = applyDailyCheckActionForDate({
        dateStr: '2026-03-14',
        dailyReviews: reviews,
        checkTemplates,
        reviewTemplates,
        checkItemId: 'check-count',
        actionMode: 'cycle'
      });
      reviews = result.updatedReviews || reviews;
      counts.push(result.item?.currentCount || 0);
    }

    expect(counts).toEqual([1, 2, 3, 0]);
  });

  it('toggles a binary manual check back to incomplete for widget replay', () => {
    const completedReview: DailyReview = {
      id: 'review-5',
      date: '2026-03-14',
      createdAt: 1,
      updatedAt: 1,
      answers: [],
      checkItems: [{
        id: 'check-binary',
        category: '晨间',
        content: '喝水',
        isCompleted: true,
        type: 'manual',
        manualMode: 'binary',
        currentCount: 1,
        targetCount: 1
      }]
    };

    const result = applyDailyCheckActionForDate({
      dateStr: '2026-03-14',
      dailyReviews: [completedReview],
      checkTemplates,
      reviewTemplates,
      checkItemId: 'check-binary',
      actionMode: 'toggle'
    });

    expect(result.item?.currentCount).toBe(0);
    expect(result.item?.isCompleted).toBe(false);
  });

  it('exposes only enabled manual daily checks for NFC selection', () => {
    const eligible = getEligibleNfcDailyCheckItems(checkTemplates);

    expect(eligible.map(item => item.checkItemId)).toEqual(['check-binary', 'check-count']);
  });

  it('exposes both manual and automatic daily checks for tracking-calendar binding', () => {
    const eligible = getEligibleTrackingCalendarDailyCheckItems(checkTemplates);

    expect(eligible.map(item => item.checkItemId)).toEqual(['check-binary', 'check-count', 'check-auto']);
    expect(eligible.find(item => item.checkItemId === 'check-auto')?.type).toBe('auto');
  });

  it('treats missing template item enabled flags as enabled', () => {
    const items = buildDailyCheckItems(checkTemplates);

    expect(items.map(item => item.id)).toEqual(['check-binary', 'check-count', 'check-auto']);
  });

  it('filters disabled template items from generated checks and external bindings', () => {
    const templatesWithDisabledItems: CheckTemplate[] = [
      {
        ...checkTemplates[0],
        items: [
          ...checkTemplates[0].items,
          {
            id: 'check-disabled',
            content: '暂停项',
            enabled: false,
            type: 'manual',
            manualMode: 'binary'
          },
          {
            id: 'check-disabled-auto',
            content: '暂停自动项',
            enabled: false,
            type: 'auto'
          }
        ]
      }
    ];

    expect(buildDailyCheckItems(templatesWithDisabledItems).map(item => item.id)).toEqual([
      'check-binary',
      'check-count',
      'check-auto'
    ]);
    expect(getEligibleNfcDailyCheckItems(templatesWithDisabledItems).map(item => item.checkItemId)).toEqual([
      'check-binary',
      'check-count'
    ]);
    expect(getEligibleTrackingCalendarDailyCheckItems(templatesWithDisabledItems).map(item => item.checkItemId)).toEqual([
      'check-binary',
      'check-count',
      'check-auto'
    ]);
    expect(getDailyCheckTemplateMeta(templatesWithDisabledItems, 'check-disabled')).toBeNull();

    const result = applyDailyCheckActionForDate({
      dateStr: '2026-03-14',
      dailyReviews: [],
      checkTemplates: templatesWithDisabledItems,
      reviewTemplates,
      checkItemId: 'check-disabled',
      actionMode: 'complete_once'
    });

    expect(result.status).toBe('not_found');
    expect(result.createdReview).toBe(false);
  });

  it('filters disabled template items from stored review snapshots used by sidebars', () => {
    const templatesWithDisabledItems: CheckTemplate[] = [
      {
        ...checkTemplates[0],
        items: [
          ...checkTemplates[0].items,
          {
            id: 'check-disabled',
            content: 'disabled',
            enabled: false,
            type: 'manual',
            manualMode: 'binary'
          }
        ]
      }
    ];
    const storedItems: CheckItem[] = [
      {
        id: 'check-binary',
        content: 'binary',
        isCompleted: false,
        type: 'manual',
        manualMode: 'binary'
      },
      {
        id: 'check-disabled',
        content: 'disabled',
        isCompleted: true,
        type: 'manual',
        manualMode: 'binary'
      }
    ];

    expect(filterDailyCheckItemsByEnabledTemplates(storedItems, templatesWithDisabledItems).map(item => item.id)).toEqual([
      'check-binary'
    ]);
  });
});
