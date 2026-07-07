/**
 * @file achievementBackupService.ts
 * @input In-memory achievement snapshot data from AchievementContext
 * @output Unified achievement backup payloads plus restore parsing helpers for export/import/cloud sync
 * @pos Service (Achievement Backup)
 * @description Centralizes the achievement bottle backup block so the full achievement state can travel inside the app's main backup JSON and cloud sync payload.
 * @updated 2026-07-07: Reconstructs missing carryover meta from shattered archived bottles when importing older achievement backups.
 * @updated 2026-05-18: Added unified achievement backup export/restore helpers covering bottle meta, rules, rewards, collections, snapshots, records, and archived bottles.
 */

import type { AchievementArchivedBottle, AchievementCollectionRecord, AchievementMeta, AchievementRedemptionRecord } from '../types';
import type { AchievementSnapshot } from '../repositories/dataRepository';
import { normalizeAchievementRedemptionRecordFunding, normalizeAchievementStarValue } from '../utils/achievementUtils';

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

const hasOwnProperty = (value: object, key: string): boolean => (
  Object.prototype.hasOwnProperty.call(value, key)
);

const deriveLegacyAchievementCarryoverStars = ({
  archivedBottles,
  redemptionRecords,
  collectionRecords
}: {
  archivedBottles: AchievementArchivedBottle[];
  redemptionRecords: AchievementRedemptionRecord[];
  collectionRecords: AchievementCollectionRecord[];
}): number => {
  const shatteredStars = archivedBottles.reduce((sum, bottle) => (
    bottle.status === 'shattered' ? sum + Math.max(0, bottle.sealedAmount || 0) : sum
  ), 0);
  const spentFromCarryover = [...redemptionRecords, ...collectionRecords].reduce((sum, record) => {
    const normalized = normalizeAchievementRedemptionRecordFunding(record);
    return sum + normalized.paidFromCarryover;
  }, 0);

  return Math.max(0, normalizeAchievementStarValue(shatteredStars - spentFromCarryover));
};

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

    const metaSource = isPlainObject(value.meta) ? value.meta as Partial<AchievementMeta> : DEFAULT_ACHIEVEMENT_META;
    const redemptionRecords = readArray<AchievementRedemptionRecord>(value.redemptionRecords);
    const collectionRecords = readArray<AchievementCollectionRecord>(value.collectionRecords);
    const archivedBottles = readArray<AchievementArchivedBottle>(value.archivedBottles);
    const activeBottleCarryoverStars = hasOwnProperty(metaSource, 'activeBottleCarryoverStars')
      ? metaSource.activeBottleCarryoverStars ?? 0
      : deriveLegacyAchievementCarryoverStars({
        archivedBottles,
        redemptionRecords,
        collectionRecords
      });

    return {
      meta: {
        ...metaSource,
        achievementStartDate: metaSource.achievementStartDate ?? null,
        activeBottleCarryoverStars
      },
      rules: readArray(value.rules),
      rewards: readArray(value.rewards),
      collections: readArray(value.collections),
      dailySnapshots: readArray(value.dailySnapshots),
      redemptionRecords,
      collectionRecords,
      archivedBottles,
      bottleActionRecords: readArray(value.bottleActionRecords)
    };
  }
};
