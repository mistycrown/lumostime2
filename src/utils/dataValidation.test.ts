/**
 * @file dataValidation.test.ts
 * @updated 2026-10-07: Covers optional category backups and invalid category identities.
 * @input Modern and legacy backup payloads
 * @output Regression coverage for optional backup blocks
 * @updated 2026-10-06: Validates node metadata and rejects malformed or duplicate node identities.
 */
import { describe, expect, it } from 'vitest';

import { validateAndFixData, validateLocalData } from './dataValidation';

const createValidPayload = () => ({
  logs: [],
  todos: [],
  categories: [{ id: 'cat-1', name: 'Category', icon: '📝', activities: [], themeColor: '#111111' }],
});

describe('dataValidation achievementData support', () => {
  it('accepts node categories and rejects malformed or duplicate classifications', () => {
    const category = { id: 'people', name: '人物', createdAt: 1, updatedAt: 2 };
    expect(validateLocalData({ ...createValidPayload(), nodeCategories: [category] }).isValid).toBe(true);
    expect(validateLocalData({ ...createValidPayload(), nodeCategories: {} }).isValid).toBe(false);
    expect(validateLocalData({ ...createValidPayload(), nodeCategories: [{ ...category, name: '未分类' }] }).isValid).toBe(false);
    expect(validateLocalData({ ...createValidPayload(), nodeCategories: [category, { ...category, id: 'other' }] }).isValid).toBe(false);
    expect(validateLocalData({ ...createValidPayload(), nodes: [{ id: 'n', name: '小林', aliases: [], description: '', createdAt: 1, updatedAt: 2, categoryId: 3 }] }).isValid).toBe(false);
  });
  it('preserves valid nodes and accepts legacy backups that omit them', () => {
    const nodes = [{ id: 'n', name: '小林', aliases: ['林林'], description: '朋友', createdAt: 1, updatedAt: 2 }];
    const payload = { ...createValidPayload(), nodes };
    expect(validateAndFixData(payload).data.nodes).toEqual(nodes);
    expect(validateLocalData(payload).isValid).toBe(true);
    expect(validateLocalData({ ...payload, nodes: [{ ...nodes[0], name: '林林丨小林' }] }).isValid).toBe(true);
    expect(validateLocalData(createValidPayload()).isValid).toBe(true);
  });

  it('rejects malformed and duplicate node metadata before restore', () => {
    const node = { id: 'n', name: '小林', aliases: ['林林'], description: '', createdAt: 1, updatedAt: 2 };
    expect(validateLocalData({ ...createValidPayload(), nodes: {} }).isValid).toBe(false);
    expect(validateLocalData({ ...createValidPayload(), nodes: [{ ...node, aliases: '林林' }] }).isValid).toBe(false);
    expect(validateLocalData({ ...createValidPayload(), nodes: [node, { ...node, id: 'n2' }] }).isValid).toBe(false);
    expect(validateLocalData({ ...createValidPayload(), nodes: [{ ...node, name: '[[小林]]' }] }).isValid).toBe(false);
  });

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
