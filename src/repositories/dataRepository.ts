/**
 * @file dataRepository.ts
 * @input Legacy localStorage keys, IndexedDB-backed storage repository, application defaults
 * @output Unified domain repository for heavy core data and one-time localStorage migration
 * @pos Repository (Application Data)
 * @description Loads and persists large core datasets through a single async repository and migrates legacy localStorage payloads into IndexedDB on first run.
 *
 * @updated 2026-06-07: Normalized weekly and monthly review payloads during repository hydration so periodic AI newspaper fields survive reloads with the same guarantees as daily reviews.
 * @updated 2026-05-18: Parallelized snapshot hydration reads and added startup timing logs so Electron boot can diagnose slow IndexedDB-backed loads faster.
 * @updated 2026-05-18: Repaired default achievement bottle image paths by id, preset name, and stale bottle asset URLs so desktop updates keep bottle artwork visible.
 * @updated 2026-05-12: Added repository-backed `DataCollection` and `DataCollectionEntry` persistence to the core data snapshot.
 * @updated 2026-05-10: Flagged fallback-seeded core snapshots so background assistant flows can refuse demo logs/todos when real user data is unavailable.
 * @updated 2026-04-07: Keeps default achievement bottle metadata synced with the latest preset names, descriptions, and archive labels.
 */
import {
  DEFAULT_ACHIEVEMENT_COLLECTION_COST,
  DEFAULT_ACHIEVEMENT_COLLECTIONS,
  getDefaultAchievementCollectionPresetFromReference,
  repairAchievementCollectionImagePath
} from '../constants/achievementCollections';
import { CATEGORIES, INITIAL_DAILY_REVIEWS, INITIAL_GOALS, INITIAL_LOGS, INITIAL_TODOS, MOCK_TODO_CATEGORIES, SCOPES } from '../constants';
import { REVIEW_KEYS, StorageKey, USER_DATA_KEYS, storage } from '../constants/storageKeys';
import {
  AchievementArchivedBottle,
  AchievementBottleActionRecord,
  AchievementCollection,
  AchievementCollectionRecord,
  AchievementDailySnapshot,
  AchievementMeta,
  AchievementRedemptionRecord,
  AchievementReward,
  AchievementRule,
  Category,
  DataCollection,
  DataCollectionEntry,
  DailyReview,
  Goal,
  Log,
  MajorGoal,
  MonthlyReview,
  OnThisDayEntry,
  Scope,
  TodoCategory,
  TodoItem,
  WeeklyReview
} from '../types';
import { normalizeDailyReviews, normalizeMonthlyReviews, normalizeWeeklyReviews } from '../utils/checkItemNormalizer';
import { storageRepository, StorageRepository } from './storageRepository';

const CORE_DATA_MIGRATION_META_KEY = 'core-data-migration-v2';

const getTimingNow = (): number => (
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
);

export const REPOSITORY_KEYS = {
  LOGS: 'logs',
  TODOS: 'todos',
  TODO_CATEGORIES: 'todoCategories',
  DATA_COLLECTIONS: 'dataCollections',
  DATA_COLLECTION_ENTRIES: 'dataCollectionEntries',
  CATEGORIES: 'categories',
  SCOPES: 'scopes',
  GOALS: 'goals',
  MAJOR_GOALS: 'majorGoals',
  DAILY_REVIEWS: 'dailyReviews',
  WEEKLY_REVIEWS: 'weeklyReviews',
  MONTHLY_REVIEWS: 'monthlyReviews',
  ON_THIS_DAY_ENTRIES: 'onThisDayEntries',
  ACHIEVEMENT_META: 'achievementMeta',
  ACHIEVEMENT_RULES: 'achievementRules',
  ACHIEVEMENT_REWARDS: 'achievementRewards',
  ACHIEVEMENT_COLLECTIONS: 'achievementCollections',
  ACHIEVEMENT_DAILY_SNAPSHOTS: 'achievementDailySnapshots',
  ACHIEVEMENT_REDEMPTION_RECORDS: 'achievementRedemptionRecords',
  ACHIEVEMENT_COLLECTION_RECORDS: 'achievementCollectionRecords',
  ACHIEVEMENT_ARCHIVED_BOTTLES: 'achievementArchivedBottles',
  ACHIEVEMENT_BOTTLE_ACTION_RECORDS: 'achievementBottleActionRecords'
} as const;

type CoreRepositoryKey = typeof REPOSITORY_KEYS[keyof typeof REPOSITORY_KEYS];

interface MigrationDefinition {
  repositoryKey: CoreRepositoryKey;
  legacyStorageKey: StorageKey;
}

interface LegacyStorageAdapter {
  getJSON<T>(key: StorageKey, defaultValue?: T): T | null;
  remove(key: StorageKey): boolean;
}

const MIGRATION_DEFINITIONS: MigrationDefinition[] = [
  { repositoryKey: REPOSITORY_KEYS.LOGS, legacyStorageKey: USER_DATA_KEYS.LOGS },
  { repositoryKey: REPOSITORY_KEYS.TODOS, legacyStorageKey: USER_DATA_KEYS.TODOS },
  { repositoryKey: REPOSITORY_KEYS.TODO_CATEGORIES, legacyStorageKey: USER_DATA_KEYS.TODO_CATEGORIES },
  { repositoryKey: REPOSITORY_KEYS.CATEGORIES, legacyStorageKey: USER_DATA_KEYS.CATEGORIES },
  { repositoryKey: REPOSITORY_KEYS.SCOPES, legacyStorageKey: USER_DATA_KEYS.SCOPES },
  { repositoryKey: REPOSITORY_KEYS.GOALS, legacyStorageKey: USER_DATA_KEYS.GOALS },
  { repositoryKey: REPOSITORY_KEYS.MAJOR_GOALS, legacyStorageKey: USER_DATA_KEYS.MAJOR_GOALS },
  { repositoryKey: REPOSITORY_KEYS.DAILY_REVIEWS, legacyStorageKey: REVIEW_KEYS.DAILY_REVIEWS },
  { repositoryKey: REPOSITORY_KEYS.WEEKLY_REVIEWS, legacyStorageKey: REVIEW_KEYS.WEEKLY_REVIEWS },
  { repositoryKey: REPOSITORY_KEYS.MONTHLY_REVIEWS, legacyStorageKey: REVIEW_KEYS.MONTHLY_REVIEWS }
] as const;

export interface DataContextSnapshot {
  logs: Log[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  collections: DataCollection[];
  collectionEntries: DataCollectionEntry[];
  usesFallbackSeedData: boolean;
}

export interface ReviewEntriesSnapshot {
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  monthlyReviews: MonthlyReview[];
  onThisDayEntries: OnThisDayEntry[];
}

export interface CategoryScopeSnapshot {
  categories: Category[];
  scopes: Scope[];
  goals: Goal[];
  majorGoals: MajorGoal[];
}

export interface AchievementSnapshot {
  meta: AchievementMeta;
  rules: AchievementRule[];
  rewards: AchievementReward[];
  collections: AchievementCollection[];
  dailySnapshots: AchievementDailySnapshot[];
  redemptionRecords: AchievementRedemptionRecord[];
  collectionRecords: AchievementCollectionRecord[];
  archivedBottles: AchievementArchivedBottle[];
  bottleActionRecords: AchievementBottleActionRecord[];
}

const migrateDefaultAchievementCollection = (collection: AchievementCollection): AchievementCollection => {
  const preset = getDefaultAchievementCollectionPresetFromReference({
    collectionId: collection.id,
    imagePath: collection.imagePath,
    name: collection.name
  });
  if (!preset) {
    return {
      ...collection,
      imagePath: repairAchievementCollectionImagePath({
        imagePath: collection.imagePath
      })
    };
  }

  return {
    ...collection,
    name: preset.name,
    cost: DEFAULT_ACHIEVEMENT_COLLECTION_COST,
    imagePath: preset.imagePath,
    description: preset.description
  };
};

const migrateDefaultAchievementCollectionRecord = (
  record: AchievementCollectionRecord
): AchievementCollectionRecord => {
  const preset = getDefaultAchievementCollectionPresetFromReference({
    collectionId: record.collectionId,
    imagePath: record.imagePath,
    name: record.collectionName
  });
  if (!preset) {
    return {
      ...record,
      imagePath: repairAchievementCollectionImagePath({
        imagePath: record.imagePath
      })
    };
  }

  return {
    ...record,
    collectionName: preset.name,
    imagePath: preset.imagePath
  };
};

const migrateDefaultAchievementArchivedBottle = (
  bottle: AchievementArchivedBottle
): AchievementArchivedBottle => {
  const preset = getDefaultAchievementCollectionPresetFromReference({
    collectionId: bottle.collectionId,
    imagePath: bottle.imagePath,
    name: bottle.collectionName
  });
  if (!preset) {
    return {
      ...bottle,
      imagePath: repairAchievementCollectionImagePath({
        imagePath: bottle.imagePath
      })
    };
  }

  return {
    ...bottle,
    collectionName: preset.name,
    imagePath: preset.imagePath
  };
};

export class DataRepository {
  private initPromise: Promise<void> | null = null;

  constructor(
    private readonly repository: Pick<StorageRepository, 'getData' | 'setData' | 'getMeta' | 'setMeta'> = storageRepository,
    private readonly legacyStorage: LegacyStorageAdapter = storage
  ) {}

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initializeInternal();
    return this.initPromise;
  }

  private async initializeInternal(): Promise<void> {
    const alreadyMigrated = await this.repository.getMeta<boolean>(CORE_DATA_MIGRATION_META_KEY);
    if (alreadyMigrated) {
      return;
    }

    for (const definition of MIGRATION_DEFINITIONS) {
      const existingValue = await this.repository.getData(definition.repositoryKey);
      if (existingValue !== null) {
        continue;
      }

      const legacyValue = this.legacyStorage.getJSON(definition.legacyStorageKey);
      if (legacyValue !== null) {
        await this.repository.setData(definition.repositoryKey, legacyValue);
      }
    }

    await this.repository.setMeta(CORE_DATA_MIGRATION_META_KEY, true);

    for (const definition of MIGRATION_DEFINITIONS) {
      this.legacyStorage.remove(definition.legacyStorageKey);
    }
  }

  async loadDataContextSnapshot(): Promise<DataContextSnapshot> {
    const startedAt = getTimingNow();
    await this.initialize();

    const [
      storedLogs,
      storedTodos,
      storedTodoCategories,
      storedCollections,
      storedCollectionEntries
    ] = await Promise.all([
      this.repository.getData<Log[]>(REPOSITORY_KEYS.LOGS),
      this.repository.getData<TodoItem[]>(REPOSITORY_KEYS.TODOS),
      this.repository.getData<TodoCategory[]>(REPOSITORY_KEYS.TODO_CATEGORIES),
      this.repository.getData<DataCollection[]>(REPOSITORY_KEYS.DATA_COLLECTIONS),
      this.repository.getData<DataCollectionEntry[]>(REPOSITORY_KEYS.DATA_COLLECTION_ENTRIES)
    ]);
    const logs = storedLogs ?? INITIAL_LOGS;
    const todos = storedTodos ?? this.buildDefaultTodos(logs);
    const todoCategories = storedTodoCategories ?? MOCK_TODO_CATEGORIES;
    const collections = storedCollections ?? [];
    const collectionEntries = storedCollectionEntries ?? [];

    console.info(
      `[DataRepository] loadDataContextSnapshot resolved in ${(getTimingNow() - startedAt).toFixed(1)}ms`
    );

    return {
      logs,
      todos,
      todoCategories,
      collections,
      collectionEntries,
      usesFallbackSeedData: storedLogs === null || storedTodos === null
    };
  }

  async loadReviewEntriesSnapshot(): Promise<ReviewEntriesSnapshot> {
    const startedAt = getTimingNow();
    await this.initialize();

    const [
      storedDailyReviews,
      weeklyReviews,
      monthlyReviews,
      onThisDayEntries
    ] = await Promise.all([
      this.repository.getData<DailyReview[]>(REPOSITORY_KEYS.DAILY_REVIEWS),
      this.repository.getData<WeeklyReview[]>(REPOSITORY_KEYS.WEEKLY_REVIEWS),
      this.repository.getData<MonthlyReview[]>(REPOSITORY_KEYS.MONTHLY_REVIEWS),
      this.repository.getData<OnThisDayEntry[]>(REPOSITORY_KEYS.ON_THIS_DAY_ENTRIES)
    ]);
    const dailyReviews = storedDailyReviews
      ? normalizeDailyReviews(storedDailyReviews)
      : normalizeDailyReviews(INITIAL_DAILY_REVIEWS);
    const normalizedWeeklyReviews = normalizeWeeklyReviews(weeklyReviews ?? []);
    const normalizedMonthlyReviews = normalizeMonthlyReviews(monthlyReviews ?? []);

    console.info(
      `[DataRepository] loadReviewEntriesSnapshot resolved in ${(getTimingNow() - startedAt).toFixed(1)}ms`
    );

    return {
      dailyReviews,
      weeklyReviews: normalizedWeeklyReviews,
      monthlyReviews: normalizedMonthlyReviews,
      onThisDayEntries: onThisDayEntries ?? []
    };
  }

  async loadCategoryScopeSnapshot(): Promise<CategoryScopeSnapshot> {
    const startedAt = getTimingNow();
    await this.initialize();

    const [
      categories,
      scopes,
      goals,
      majorGoals
    ] = await Promise.all([
      this.repository.getData<Category[]>(REPOSITORY_KEYS.CATEGORIES),
      this.repository.getData<Scope[]>(REPOSITORY_KEYS.SCOPES),
      this.repository.getData<Goal[]>(REPOSITORY_KEYS.GOALS),
      this.repository.getData<MajorGoal[]>(REPOSITORY_KEYS.MAJOR_GOALS)
    ]);

    console.info(
      `[DataRepository] loadCategoryScopeSnapshot resolved in ${(getTimingNow() - startedAt).toFixed(1)}ms`
    );

    return {
      categories: categories ?? CATEGORIES,
      scopes: scopes ?? SCOPES,
      goals: goals ?? INITIAL_GOALS,
      majorGoals: majorGoals ?? []
    };
  }

  async loadAchievementSnapshot(): Promise<AchievementSnapshot> {
    const startedAt = getTimingNow();
    await this.initialize();

    const [
      storedMeta,
      rules,
      rewards,
      collections,
      dailySnapshots,
      redemptionRecords,
      collectionRecords,
      archivedBottles,
      bottleActionRecords
    ] = await Promise.all([
      this.repository.getData<AchievementMeta>(REPOSITORY_KEYS.ACHIEVEMENT_META),
      this.repository.getData<AchievementRule[]>(REPOSITORY_KEYS.ACHIEVEMENT_RULES),
      this.repository.getData<AchievementReward[]>(REPOSITORY_KEYS.ACHIEVEMENT_REWARDS),
      this.repository.getData<AchievementCollection[]>(REPOSITORY_KEYS.ACHIEVEMENT_COLLECTIONS),
      this.repository.getData<AchievementDailySnapshot[]>(REPOSITORY_KEYS.ACHIEVEMENT_DAILY_SNAPSHOTS),
      this.repository.getData<AchievementRedemptionRecord[]>(REPOSITORY_KEYS.ACHIEVEMENT_REDEMPTION_RECORDS),
      this.repository.getData<AchievementCollectionRecord[]>(REPOSITORY_KEYS.ACHIEVEMENT_COLLECTION_RECORDS),
      this.repository.getData<AchievementArchivedBottle[]>(REPOSITORY_KEYS.ACHIEVEMENT_ARCHIVED_BOTTLES),
      this.repository.getData<AchievementBottleActionRecord[]>(REPOSITORY_KEYS.ACHIEVEMENT_BOTTLE_ACTION_RECORDS)
    ]);
    const meta = storedMeta ?? {
      achievementStartDate: null,
      activeBottleCarryoverStars: 0
    };
    const safeRules = rules ?? [];
    const safeRewards = rewards ?? [];
    const safeCollections = collections ?? DEFAULT_ACHIEVEMENT_COLLECTIONS;
    const migratedCollections = safeCollections.map(migrateDefaultAchievementCollection);
    const safeDailySnapshots = dailySnapshots ?? [];
    const safeRedemptionRecords = redemptionRecords ?? [];
    const safeCollectionRecords = (collectionRecords ?? []).map(migrateDefaultAchievementCollectionRecord);
    const safeArchivedBottles = (archivedBottles ?? []).map(migrateDefaultAchievementArchivedBottle);
    const safeBottleActionRecords = bottleActionRecords ?? [];

    console.info(
      `[DataRepository] loadAchievementSnapshot resolved in ${(getTimingNow() - startedAt).toFixed(1)}ms`
    );

    return {
      meta: {
        achievementStartDate: meta.achievementStartDate ?? null,
        activeBottleCarryoverStars: meta.activeBottleCarryoverStars ?? 0
      },
      rules: safeRules,
      rewards: safeRewards,
      collections: migratedCollections,
      dailySnapshots: safeDailySnapshots,
      redemptionRecords: safeRedemptionRecords,
      collectionRecords: safeCollectionRecords,
      archivedBottles: safeArchivedBottles,
      bottleActionRecords: safeBottleActionRecords
    };
  }

  async getLogs(): Promise<Log[]> {
    const snapshot = await this.loadDataContextSnapshot();
    return snapshot.logs;
  }

  async saveLogs(logs: Log[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.LOGS, logs);
  }

  async saveTodos(todos: TodoItem[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.TODOS, todos);
  }

  async saveTodoCategories(todoCategories: TodoCategory[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.TODO_CATEGORIES, todoCategories);
  }

  async saveDataCollections(collections: DataCollection[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.DATA_COLLECTIONS, collections);
  }

  async saveDataCollectionEntries(collectionEntries: DataCollectionEntry[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.DATA_COLLECTION_ENTRIES, collectionEntries);
  }

  async getCategories(): Promise<Category[]> {
    const snapshot = await this.loadCategoryScopeSnapshot();
    return snapshot.categories;
  }

  async saveCategories(categories: Category[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.CATEGORIES, categories);
  }

  async getScopes(): Promise<Scope[]> {
    const snapshot = await this.loadCategoryScopeSnapshot();
    return snapshot.scopes;
  }

  async saveScopes(scopes: Scope[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.SCOPES, scopes);
  }

  async saveGoals(goals: Goal[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.GOALS, goals);
  }

  async saveMajorGoals(majorGoals: MajorGoal[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.MAJOR_GOALS, majorGoals);
  }

  async saveDailyReviews(dailyReviews: DailyReview[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.DAILY_REVIEWS, dailyReviews);
  }

  async saveWeeklyReviews(weeklyReviews: WeeklyReview[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.WEEKLY_REVIEWS, weeklyReviews);
  }

  async saveMonthlyReviews(monthlyReviews: MonthlyReview[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.MONTHLY_REVIEWS, monthlyReviews);
  }

  async saveOnThisDayEntries(onThisDayEntries: OnThisDayEntry[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.ON_THIS_DAY_ENTRIES, onThisDayEntries);
  }

  async saveAchievementMeta(meta: AchievementMeta): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.ACHIEVEMENT_META, meta);
  }

  async saveAchievementRules(rules: AchievementRule[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.ACHIEVEMENT_RULES, rules);
  }

  async saveAchievementRewards(rewards: AchievementReward[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.ACHIEVEMENT_REWARDS, rewards);
  }

  async saveAchievementCollections(collections: AchievementCollection[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.ACHIEVEMENT_COLLECTIONS, collections);
  }

  async saveAchievementDailySnapshots(dailySnapshots: AchievementDailySnapshot[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.ACHIEVEMENT_DAILY_SNAPSHOTS, dailySnapshots);
  }

  async saveAchievementRedemptionRecords(redemptionRecords: AchievementRedemptionRecord[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.ACHIEVEMENT_REDEMPTION_RECORDS, redemptionRecords);
  }

  async saveAchievementCollectionRecords(collectionRecords: AchievementCollectionRecord[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.ACHIEVEMENT_COLLECTION_RECORDS, collectionRecords);
  }

  async saveAchievementArchivedBottles(archivedBottles: AchievementArchivedBottle[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.ACHIEVEMENT_ARCHIVED_BOTTLES, archivedBottles);
  }

  async saveAchievementBottleActionRecords(bottleActionRecords: AchievementBottleActionRecord[]): Promise<void> {
    await this.initialize();
    await this.repository.setData(REPOSITORY_KEYS.ACHIEVEMENT_BOTTLE_ACTION_RECORDS, bottleActionRecords);
  }

  private buildDefaultTodos(logs: Log[]): TodoItem[] {
    return INITIAL_TODOS.map((todo) => {
      if (!todo.isProgress) {
        return todo;
      }

      const completedUnits = logs
        .filter((log) => log.linkedTodoId === todo.id)
        .reduce((sum, log) => sum + (log.progressIncrement || 0), 0);

      return {
        ...todo,
        completedUnits
      };
    });
  }
}

export const dataRepository = new DataRepository();
