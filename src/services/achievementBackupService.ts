/**
 * @file achievementBackupService.ts
 * @input In-memory achievement snapshot data from AchievementContext
 * @output Unified achievement backup payloads plus restore parsing helpers for export/import/cloud sync
 * @pos Service (Achievement Backup)
 * @description Centralizes the achievement bottle backup block so the full achievement state can travel inside the app's main backup JSON and cloud sync payload.
 * @updated 2026-05-18: Added unified achievement backup export/restore helpers covering bottle meta, rules, rewards, collections, snapshots, records, and archived bottles.
 */

import type { AchievementMeta } from '../types';
import type { AchievementSnapshot } from '../repositories/dataRepository';

export interface AchievementBackupPayload extends AchievementSnapshot {
  version: 1;
  exportedAt: string;
}

const DEFAULT_ACHIEVEMENT_META: AchievementMeta = {
  achievementStartDate: null,
  activeBottleCarryoverStars: 0
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
  Boolean(value)
  && typeof value === 'object'
  && !Array.isArray(value)
);

const readArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value as T[] : []);

export const achievementBackupService = {
  buildBackupPayload(snapshot: AchievementSnapshot): AchievementBackupPayload {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      meta: snapshot.meta,
      rules: snapshot.rules,
      rewards: snapshot.rewards,
      collections: snapshot.collections,
      dailySnapshots: snapshot.dailySnapshots,
      redemptionRecords: snapshot.redemptionRecords,
      collectionRecords: snapshot.collectionRecords,
      archivedBottles: snapshot.archivedBottles,
      bottleActionRecords: snapshot.bottleActionRecords
    };
  },

  readBackupPayload(value: unknown): AchievementSnapshot | null {
    if (!isPlainObject(value)) {
      return null;
    }

    const hasRecognizedField = [
      'meta',
      'rules',
      'rewards',
      'collections',
      'dailySnapshots',
      'redemptionRecords',
      'collectionRecords',
      'archivedBottles',
      'bottleActionRecords'
    ].some((key) => Object.prototype.hasOwnProperty.call(value, key));

    if (!hasRecognizedField) {
      return null;
    }

    return {
      meta: isPlainObject(value.meta) ? value.meta as AchievementMeta : DEFAULT_ACHIEVEMENT_META,
      rules: readArray(value.rules),
      rewards: readArray(value.rewards),
      collections: readArray(value.collections),
      dailySnapshots: readArray(value.dailySnapshots),
      redemptionRecords: readArray(value.redemptionRecords),
      collectionRecords: readArray(value.collectionRecords),
      archivedBottles: readArray(value.archivedBottles),
      bottleActionRecords: readArray(value.bottleActionRecords)
    };
  }
};
