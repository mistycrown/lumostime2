import { describe, expect, it } from 'vitest';

import { validateAndFixData, validateLocalData } from './dataValidation';

const createValidPayload = () => ({
  logs: [],
  todos: [],
  categories: [{ id: 'cat-1', name: 'Category', icon: '📝', activities: [], themeColor: '#111111' }],
});

describe('dataValidation achievementData support', () => {
  it('accepts a nested achievementData object in backup payloads', () => {
    const result = validateLocalData({
      ...createValidPayload(),
      achievementData: {
        version: 1,
        exportedAt: '2026-05-18T00:00:00.000Z',
        meta: {
          achievementStartDate: '2026-05-01',
          activeBottleCarryoverStars: 4,
        },
        rules: [],
        rewards: [],
        collections: [],
        dailySnapshots: [],
        redemptionRecords: [],
        collectionRecords: [],
        archivedBottles: [],
        bottleActionRecords: [],
      },
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects a non-object achievementData payload', () => {
    const result = validateLocalData({
      ...createValidPayload(),
      achievementData: 'achievement-backup',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes('achievementData'))).toBe(true);
  });

  it('preserves a valid achievementData block during fix-up', () => {
    const payload = {
      ...createValidPayload(),
      achievementData: {
        version: 1,
        exportedAt: '2026-05-18T00:00:00.000Z',
        meta: {
          achievementStartDate: '2026-05-01',
          activeBottleCarryoverStars: 4,
        },
        rules: [],
        rewards: [],
        collections: [],
        dailySnapshots: [],
        redemptionRecords: [],
        collectionRecords: [],
        archivedBottles: [],
        bottleActionRecords: [],
      },
    };

    const { data, result } = validateAndFixData(payload);

    expect(result.isValid).toBe(true);
    expect(data.achievementData).toEqual(payload.achievementData);
  });
});
