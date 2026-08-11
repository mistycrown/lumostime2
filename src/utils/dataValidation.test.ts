import { describe, expect, it } from 'vitest';

import { validateAndFixData, validateLocalData } from './dataValidation';

const createValidPayload = () => ({
  logs: [],
  todos: [],
  categories: [{ id: 'cat-1', name: 'Category', icon: '📝', activities: [], themeColor: '#111111' }],
});

describe('dataValidation achievementData support', () => {
  it('accepts optional Android widget templates and keeps old backups compatible', () => {
    const widgetTemplateResult = validateLocalData({
      ...createValidPayload(),
      widgetTemplates: []
    });
    const legacyBackupResult = validateLocalData(createValidPayload());

    expect(widgetTemplateResult.isValid).toBe(true);
    expect(legacyBackupResult.isValid).toBe(true);
  });

  it('rejects malformed Android widget templates', () => {
    const result = validateLocalData({
      ...createValidPayload(),
      widgetTemplates: {}
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes('widgetTemplates'))).toBe(true);
  });

  it('accepts an optional appearance backup block and rejects malformed values', () => {
    const validResult = validateLocalData({
      ...createValidPayload(),
      appearanceData: {
        version: 1,
        storage: {
          lumostime_color_scheme: 'forest',
          lumostime_timepal_type: 'cat'
        }
      }
    });
    const invalidResult = validateLocalData({
      ...createValidPayload(),
      appearanceData: 'not-a-backup'
    });

    expect(validResult.isValid).toBe(true);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors.some((error) => error.includes('appearanceData'))).toBe(true);
  });

  it('accepts data collections and collection entries in backup payloads', () => {
    const result = validateLocalData({
      ...createValidPayload(),
      collections: [
        {
          id: 'collection-1',
          name: 'Reading',
          description: '',
          createdAt: 1,
          updatedAt: 2,
        },
      ],
      collectionEntries: [
        {
          id: 'entry-1',
          collectionId: 'collection-1',
          itemType: 'log',
          itemId: 'log-1',
          addedAt: 3,
        },
      ],
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects malformed data collection fields', () => {
    const result = validateLocalData({
      ...createValidPayload(),
      collections: {},
      collectionEntries: 'entries',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes('collections'))).toBe(true);
    expect(result.errors.some((error) => error.includes('collectionEntries'))).toBe(true);
  });

  it('preserves missing collection fields when fixing old backup payloads', () => {
    const { data, result } = validateAndFixData(createValidPayload());

    expect(result.isValid).toBe(true);
    expect(data.collections).toBeUndefined();
    expect(data.collectionEntries).toBeUndefined();
  });

  it('keeps a missing legacy timestamp neutral during fix-up', () => {
    const { data, result } = validateAndFixData(createValidPayload());

    expect(result.isValid).toBe(true);
    expect(data.timestamp).toBe(0);
  });

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
