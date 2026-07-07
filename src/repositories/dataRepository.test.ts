import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_ACHIEVEMENT_COLLECTION_COST,
  getDefaultAchievementCollectionPreset
} from '../constants/achievementCollections';
import { REVIEW_KEYS, USER_DATA_KEYS } from '../constants/storageKeys';
import { DataRepository, REPOSITORY_KEYS } from './dataRepository';

type DataMap = Map<string, unknown>;

class InMemoryStorageRepository {
  data: DataMap = new Map();
  meta: DataMap = new Map();

  async getData<T>(key: string): Promise<T | null> {
    return (this.data.get(key) as T | undefined) ?? null;
  }

  async setData<T>(key: string, value: T): Promise<void> {
    this.data.set(key, value);
  }

  async getMeta<T>(key: string): Promise<T | null> {
    return (this.meta.get(key) as T | undefined) ?? null;
  }

  async setMeta<T>(key: string, value: T): Promise<void> {
    this.meta.set(key, value);
  }
}

const createLegacyStorageAdapter = (initialValues: Map<string, unknown>) => {
  const values = new Map(initialValues);

  return {
    values,
    adapter: {
      getJSON: vi.fn((key: string) => (values.get(key) as unknown) ?? null),
      remove: vi.fn((key: string) => {
        values.delete(key);
        return true;
      })
    }
  };
};

describe('DataRepository', () => {
  const preset02 = getDefaultAchievementCollectionPreset('default-bottle-02');
  const preset03 = getDefaultAchievementCollectionPreset('default-bottle-03');
  const preset08 = getDefaultAchievementCollectionPreset('default-bottle-08');

  it('migrates legacy heavy data once into the repository and clears old keys', async () => {
    const repository = new InMemoryStorageRepository();
    const logs = [
      {
        id: 'log-1',
        activityId: 'activity-1',
        categoryId: 'category-1',
        startTime: 0,
        endTime: 600,
        duration: 600
      }
    ];
    const todos = [
      {
        id: 'todo-1',
        categoryId: 'todo-category-1',
        title: 'Write tests',
        isCompleted: false
      }
    ];
    const todoCategories = [
      {
        id: 'todo-category-1',
        name: 'Inbox',
        icon: '📥'
      }
    ];

    const { values, adapter } = createLegacyStorageAdapter(new Map([
      [USER_DATA_KEYS.LOGS, logs],
      [USER_DATA_KEYS.TODOS, todos],
      [USER_DATA_KEYS.TODO_CATEGORIES, todoCategories],
      [REVIEW_KEYS.DAILY_REVIEWS, []]
    ]));

    const dataRepository = new DataRepository(repository, adapter);
    const snapshot = await dataRepository.loadDataContextSnapshot();

    expect(snapshot.logs).toEqual(logs);
    expect(snapshot.todos).toEqual(todos);
    expect(snapshot.todoCategories).toEqual(todoCategories);
    expect(snapshot.usesFallbackSeedData).toBe(false);
    expect(await repository.getData(REPOSITORY_KEYS.LOGS)).toEqual(logs);
    expect(await repository.getData(REPOSITORY_KEYS.TODOS)).toEqual(todos);
    expect(await repository.getData(REPOSITORY_KEYS.TODO_CATEGORIES)).toEqual(todoCategories);
    expect(await repository.getMeta('core-data-migration-v2')).toBe(true);
    expect(values.has(USER_DATA_KEYS.LOGS)).toBe(false);
    expect(values.has(USER_DATA_KEYS.TODOS)).toBe(false);
    expect(values.has(USER_DATA_KEYS.TODO_CATEGORIES)).toBe(false);
  });

  it('prefers existing repository data over legacy localStorage copies during migration', async () => {
    const repository = new InMemoryStorageRepository();
    const existingLogs = [
      {
        id: 'log-repo',
        activityId: 'activity-1',
        categoryId: 'category-1',
        startTime: 100,
        endTime: 700,
        duration: 600
      }
    ];
    const legacyLogs = [
      {
        id: 'log-legacy',
        activityId: 'activity-legacy',
        categoryId: 'category-legacy',
        startTime: 0,
        endTime: 60,
        duration: 60
      }
    ];

    repository.data.set(REPOSITORY_KEYS.LOGS, existingLogs);

    const { adapter } = createLegacyStorageAdapter(new Map([
      [USER_DATA_KEYS.LOGS, legacyLogs]
    ]));

    const dataRepository = new DataRepository(repository, adapter);
    const snapshot = await dataRepository.loadDataContextSnapshot();

    expect(snapshot.logs).toEqual(existingLogs);
    expect(snapshot.usesFallbackSeedData).toBe(true);
    expect(await repository.getData(REPOSITORY_KEYS.LOGS)).toEqual(existingLogs);
  });

  it('marks a core snapshot as fallback-seeded when heavy user data is missing', async () => {
    const repository = new InMemoryStorageRepository();
    const dataRepository = new DataRepository(repository, createLegacyStorageAdapter(new Map()).adapter);

    const snapshot = await dataRepository.loadDataContextSnapshot();

    expect(snapshot.usesFallbackSeedData).toBe(true);
    expect(snapshot.logs.length).toBeGreaterThan(0);
    expect(snapshot.todos.length).toBeGreaterThan(0);
    expect(snapshot.collections).toEqual([]);
    expect(snapshot.collectionEntries).toEqual([]);
  });

  it('hydrates persisted data collections alongside the core log/todo snapshot', async () => {
    const repository = new InMemoryStorageRepository();
    repository.data.set(REPOSITORY_KEYS.LOGS, []);
    repository.data.set(REPOSITORY_KEYS.TODOS, []);
    repository.data.set(REPOSITORY_KEYS.TODO_CATEGORIES, []);
    repository.data.set(REPOSITORY_KEYS.DATA_COLLECTIONS, [
      {
        id: 'collection-social',
        name: '绀句氦澶嶇洏',
        description: '鑱氬悎楂樹环鍊肩殑绀句氦浜嬩欢',
        createdAt: 1,
        updatedAt: 2
      }
    ]);
    repository.data.set(REPOSITORY_KEYS.DATA_COLLECTION_ENTRIES, [
      {
        id: 'entry-1',
        collectionId: 'collection-social',
        itemType: 'log',
        itemId: 'log-1',
        addedAt: 3
      }
    ]);

    const dataRepository = new DataRepository(repository, createLegacyStorageAdapter(new Map()).adapter);
    const snapshot = await dataRepository.loadDataContextSnapshot();

    expect(snapshot.collections).toEqual([
      {
        id: 'collection-social',
        name: '绀句氦澶嶇洏',
        description: '鑱氬悎楂樹环鍊肩殑绀句氦浜嬩欢',
        createdAt: 1,
        updatedAt: 2
      }
    ]);
    expect(snapshot.collectionEntries).toEqual([
      {
        id: 'entry-1',
        collectionId: 'collection-social',
        itemType: 'log',
        itemId: 'log-1',
        addedAt: 3
      }
    ]);
  });

  it('reruns migration for newer repository keys even if an older migration flag exists', async () => {
    const repository = new InMemoryStorageRepository();
    const majorGoals = [
      {
        id: 'major-goal-1',
        scopeId: 'scope-1',
        title: 'Ship repository migration',
        metric: 'count',
        targetValue: 1,
        startDate: '20260324',
        endDate: '20260331',
        description: '',
        motivation: ''
      }
    ];

    repository.meta.set('core-data-migration-v1', true);

    const { values, adapter } = createLegacyStorageAdapter(new Map([
      [USER_DATA_KEYS.MAJOR_GOALS, majorGoals]
    ]));

    const dataRepository = new DataRepository(repository, adapter);
    const snapshot = await dataRepository.loadCategoryScopeSnapshot();

    expect(snapshot.majorGoals).toEqual(majorGoals);
    expect(await repository.getData(REPOSITORY_KEYS.MAJOR_GOALS)).toEqual(majorGoals);
    expect(await repository.getMeta('core-data-migration-v2')).toBe(true);
    expect(values.has(USER_DATA_KEYS.MAJOR_GOALS)).toBe(false);
  });

  it('hydrates archived achievement bottles and carryover meta for the seal-and-shatter flow', async () => {
    const repository = new InMemoryStorageRepository();

    repository.data.set(REPOSITORY_KEYS.ACHIEVEMENT_META, {
      achievementStartDate: '2026-04-01',
      activeBottleCarryoverStars: 3
    });
    repository.data.set(REPOSITORY_KEYS.ACHIEVEMENT_ARCHIVED_BOTTLES, [
      {
        id: 'archive-1',
        collectionId: 'default-bottle-02',
        collectionName: '花瓶',
        imagePath: '/bottle/02.png',
        periodStartDate: '2026-04-01',
        periodEndDate: '2026-04-05',
        earnedStars: 10,
        spentStars: 2,
        sealedAmount: 8,
        status: 'sealed',
        sealedAt: 1,
        dailySnapshots: [],
        redemptionRecords: []
      }
    ]);
    repository.data.set(REPOSITORY_KEYS.ACHIEVEMENT_BOTTLE_ACTION_RECORDS, [
      {
        id: 'action-1',
        bottleId: 'archive-1',
        actionType: 'seal',
        amount: 8,
        occurredAt: 1
      }
    ]);

    const dataRepository = new DataRepository(repository, createLegacyStorageAdapter(new Map()).adapter);
    const snapshot = await dataRepository.loadAchievementSnapshot();

    expect(snapshot.meta).toEqual({
      achievementStartDate: '2026-04-01',
      activeBottleCarryoverStars: 3
    });
    expect(snapshot.archivedBottles).toEqual([
      {
        id: 'archive-1',
        collectionId: 'default-bottle-02',
        collectionName: preset02?.name,
        imagePath: '/bottle/02.png',
        periodStartDate: '2026-04-01',
        periodEndDate: '2026-04-05',
        earnedStars: 10,
        spentStars: 2,
        sealedAmount: 8,
        status: 'sealed',
        sealedAt: 1,
        dailySnapshots: [],
        redemptionRecords: []
      }
    ]);
    expect(snapshot.bottleActionRecords).toEqual([
      {
        id: 'action-1',
        bottleId: 'archive-1',
        actionType: 'seal',
        amount: 8,
        occurredAt: 1
      }
    ]);
  });

  it('rebuilds missing achievement carryover meta from shattered archived bottles', async () => {
    const repository = new InMemoryStorageRepository();

    repository.data.set(REPOSITORY_KEYS.ACHIEVEMENT_META, {
      achievementStartDate: '2026-04-01'
    });
    repository.data.set(REPOSITORY_KEYS.ACHIEVEMENT_ARCHIVED_BOTTLES, [
      {
        id: 'archive-1',
        collectionId: 'default-bottle-02',
        collectionName: '鑺辩摱',
        imagePath: '/bottle/02.png',
        periodStartDate: '2026-04-01',
        periodEndDate: '2026-04-05',
        earnedStars: 10,
        spentStars: 2,
        sealedAmount: 8,
        status: 'shattered',
        sealedAt: 1,
        shatteredAt: 2,
        dailySnapshots: [],
        redemptionRecords: []
      }
    ]);
    repository.data.set(REPOSITORY_KEYS.ACHIEVEMENT_REDEMPTION_RECORDS, [
      {
        id: 'redeem-1',
        rewardId: 'reward-1',
        rewardName: 'Tea',
        cost: 3,
        redeemedAt: 3,
        paidFromCarryover: 3,
        paidFromLiveStars: 0
      }
    ]);

    const dataRepository = new DataRepository(repository, createLegacyStorageAdapter(new Map()).adapter);
    const snapshot = await dataRepository.loadAchievementSnapshot();

    expect(snapshot.meta.activeBottleCarryoverStars).toBe(5);
  });

  it('syncs default achievement bottle metadata from presets across collections, records, and archived bottles', async () => {
    const repository = new InMemoryStorageRepository();

    repository.data.set(REPOSITORY_KEYS.ACHIEVEMENT_COLLECTIONS, [
      {
        id: 'default-bottle-03',
        name: '收藏瓶 03',
        cost: 999,
        imagePath: '/bottle/03.png',
        description: '',
        enabled: true,
        createdAt: 1,
        updatedAt: 1
      },
      {
        id: 'default-bottle-08',
        name: '纸月旧藏瓶',
        cost: 333,
        imagePath: '/bottle/08.png',
        description: '一段已经过时的旧描述',
        enabled: true,
        createdAt: 2,
        updatedAt: 2
      }
    ]);

    repository.data.set(REPOSITORY_KEYS.ACHIEVEMENT_COLLECTION_RECORDS, [
      {
        id: 'record-1',
        collectionId: 'default-bottle-03',
        collectionName: '玻璃瓶 03',
        cost: 200,
        imagePath: '',
        redeemedAt: 10
      },
      {
        id: 'record-2',
        collectionId: 'default-bottle-08',
        collectionName: '纸月旧藏瓶',
        cost: 200,
        imagePath: '',
        redeemedAt: 20
      }
    ]);

    repository.data.set(REPOSITORY_KEYS.ACHIEVEMENT_ARCHIVED_BOTTLES, [
      {
        id: 'archive-1',
        collectionId: 'default-bottle-08',
        collectionName: '纸月旧藏瓶',
        imagePath: '',
        periodStartDate: '2026-04-01',
        periodEndDate: '2026-04-05',
        earnedStars: 10,
        spentStars: 2,
        sealedAmount: 8,
        status: 'sealed',
        sealedAt: 30,
        dailySnapshots: [],
        redemptionRecords: []
      }
    ]);

    const dataRepository = new DataRepository(repository, createLegacyStorageAdapter(new Map()).adapter);
    const snapshot = await dataRepository.loadAchievementSnapshot();

    expect(snapshot.collections).toEqual([
      {
        id: 'default-bottle-03',
        name: preset03?.name,
        cost: DEFAULT_ACHIEVEMENT_COLLECTION_COST,
        imagePath: '/bottle/03.png',
        description: preset03?.description,
        enabled: true,
        createdAt: 1,
        updatedAt: 1
      },
      {
        id: 'default-bottle-08',
        name: preset08?.name,
        cost: DEFAULT_ACHIEVEMENT_COLLECTION_COST,
        imagePath: '/bottle/08.png',
        description: preset08?.description,
        enabled: true,
        createdAt: 2,
        updatedAt: 2
      }
    ]);

    expect(snapshot.collectionRecords).toEqual([
      {
        id: 'record-1',
        collectionId: 'default-bottle-03',
        collectionName: preset03?.name,
        cost: 200,
        imagePath: '/bottle/03.png',
        redeemedAt: 10
      },
      {
        id: 'record-2',
        collectionId: 'default-bottle-08',
        collectionName: preset08?.name,
        cost: 200,
        imagePath: '/bottle/08.png',
        redeemedAt: 20
      }
    ]);

    expect(snapshot.archivedBottles).toEqual([
      {
        id: 'archive-1',
        collectionId: 'default-bottle-08',
        collectionName: preset08?.name,
        imagePath: '/bottle/08.png',
        periodStartDate: '2026-04-01',
        periodEndDate: '2026-04-05',
        earnedStars: 10,
        spentStars: 2,
        sealedAmount: 8,
        status: 'sealed',
        sealedAt: 30,
        dailySnapshots: [],
        redemptionRecords: []
      }
    ]);
  });

  it('repairs stale desktop default bottle file URLs even when legacy ids no longer match the current preset ids', async () => {
    const repository = new InMemoryStorageRepository();

    repository.data.set(REPOSITORY_KEYS.ACHIEVEMENT_COLLECTIONS, [
      {
        id: 'legacy-bottle-choice-08',
        name: preset08?.name,
        cost: 200,
        imagePath: 'file:///C:/Program Files/LumosTime/resources/app.asar/dist/bottle/08.png',
        description: preset08?.description,
        enabled: true,
        createdAt: 1,
        updatedAt: 1
      }
    ]);
    repository.data.set(REPOSITORY_KEYS.ACHIEVEMENT_COLLECTION_RECORDS, [
      {
        id: 'record-legacy-08',
        collectionId: 'legacy-bottle-choice-08',
        collectionName: preset08?.name,
        cost: 200,
        imagePath: 'file:///C:/Program Files/LumosTime/resources/app.asar/dist/bottle/08.png',
        redeemedAt: 10
      }
    ]);
    repository.data.set(REPOSITORY_KEYS.ACHIEVEMENT_ARCHIVED_BOTTLES, [
      {
        id: 'archive-legacy-08',
        collectionId: 'legacy-bottle-choice-08',
        collectionName: preset08?.name,
        imagePath: 'file:///C:/Program Files/LumosTime/resources/app.asar/dist/bottle/08.png',
        periodStartDate: '2026-04-01',
        periodEndDate: '2026-04-05',
        earnedStars: 10,
        spentStars: 2,
        sealedAmount: 8,
        status: 'sealed',
        sealedAt: 30,
        dailySnapshots: [],
        redemptionRecords: []
      }
    ]);

    const dataRepository = new DataRepository(repository, createLegacyStorageAdapter(new Map()).adapter);
    const snapshot = await dataRepository.loadAchievementSnapshot();

    expect(snapshot.collections[0]?.imagePath).toBe('/bottle/08.png');
    expect(snapshot.collectionRecords[0]?.imagePath).toBe('/bottle/08.png');
    expect(snapshot.archivedBottles[0]?.imagePath).toBe('/bottle/08.png');
  });
});
