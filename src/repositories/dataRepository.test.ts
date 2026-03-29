import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_ACHIEVEMENT_COLLECTION_COST } from '../constants/achievementCollections';
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
    expect(await repository.getData(REPOSITORY_KEYS.LOGS)).toEqual(existingLogs);
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

  it('migrates legacy default achievement bottle names in collections and records', async () => {
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
        name: '自定义星瓶',
        cost: 333,
        imagePath: '/bottle/08.png',
        description: '我的备注',
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
        collectionName: '我的夜空瓶',
        cost: 200,
        imagePath: '',
        redeemedAt: 20
      }
    ]);

    const dataRepository = new DataRepository(repository, createLegacyStorageAdapter(new Map()).adapter);
    const snapshot = await dataRepository.loadAchievementSnapshot();

    expect(snapshot.collections).toEqual([
      {
        id: 'default-bottle-03',
        name: '摘星许愿瓶',
        cost: DEFAULT_ACHIEVEMENT_COLLECTION_COST,
        imagePath: '/bottle/03.png',
        description: '散发着温暖光芒，装满小星星的方形玻璃瓶，带着占星与祈愿的氛围。',
        enabled: true,
        createdAt: 1,
        updatedAt: 1
      },
      {
        id: 'default-bottle-08',
        name: '自定义星瓶',
        cost: DEFAULT_ACHIEVEMENT_COLLECTION_COST,
        imagePath: '/bottle/08.png',
        description: '我的备注',
        enabled: true,
        createdAt: 2,
        updatedAt: 2
      }
    ]);

    expect(snapshot.collectionRecords).toEqual([
      {
        id: 'record-1',
        collectionId: 'default-bottle-03',
        collectionName: '摘星许愿瓶',
        cost: 200,
        imagePath: '/bottle/03.png',
        redeemedAt: 10
      },
      {
        id: 'record-2',
        collectionId: 'default-bottle-08',
        collectionName: '我的夜空瓶',
        cost: 200,
        imagePath: '/bottle/08.png',
        redeemedAt: 20
      }
    ]);
  });
});
