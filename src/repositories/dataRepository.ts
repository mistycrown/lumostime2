/**
 * @file dataRepository.ts
 * @input Legacy localStorage keys, IndexedDB-backed storage repository, application defaults
 * @output Unified domain repository for heavy core data and one-time localStorage migration
 * @pos Repository (Application Data)
 * @description Loads and persists large core datasets through a single async repository and migrates legacy localStorage payloads into IndexedDB on first run.
 *
 * @updated 2026-03-28: Added achievement collection catalog defaults plus persisted collection redemption records.
 */
import { DEFAULT_ACHIEVEMENT_COLLECTION_COST, DEFAULT_ACHIEVEMENT_COLLECTIONS } from '../constants/achievementCollections';
import { CATEGORIES, INITIAL_DAILY_REVIEWS, INITIAL_GOALS, INITIAL_LOGS, INITIAL_TODOS, MOCK_TODO_CATEGORIES, SCOPES } from '../constants';
import { REVIEW_KEYS, StorageKey, USER_DATA_KEYS, storage } from '../constants/storageKeys';
import {
  AchievementCollection,
  AchievementCollectionRecord,
  AchievementDailySnapshot,
  AchievementMeta,
  AchievementRedemptionRecord,
  AchievementReward,
  AchievementRule,
  Category,
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
import { normalizeDailyReviews } from '../utils/checkItemNormalizer';
import { storageRepository, StorageRepository } from './storageRepository';

const CORE_DATA_MIGRATION_META_KEY = 'core-data-migration-v2';

export const REPOSITORY_KEYS = {
  LOGS: 'logs',
  TODOS: 'todos',
  TODO_CATEGORIES: 'todoCategories',
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
  ACHIEVEMENT_COLLECTION_RECORDS: 'achievementCollectionRecords'
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
}

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
    await this.initialize();

    const logs = (await this.repository.getData<Log[]>(REPOSITORY_KEYS.LOGS)) ?? INITIAL_LOGS;
    const storedTodos = await this.repository.getData<TodoItem[]>(REPOSITORY_KEYS.TODOS);
    const todos = storedTodos ?? this.buildDefaultTodos(logs);
    const todoCategories =
      (await this.repository.getData<TodoCategory[]>(REPOSITORY_KEYS.TODO_CATEGORIES)) ?? MOCK_TODO_CATEGORIES;

    return {
      logs,
      todos,
      todoCategories
    };
  }

  async loadReviewEntriesSnapshot(): Promise<ReviewEntriesSnapshot> {
    await this.initialize();

    const storedDailyReviews = await this.repository.getData<DailyReview[]>(REPOSITORY_KEYS.DAILY_REVIEWS);
    const dailyReviews = storedDailyReviews
      ? normalizeDailyReviews(storedDailyReviews)
      : normalizeDailyReviews(INITIAL_DAILY_REVIEWS);

    const weeklyReviews =
      (await this.repository.getData<WeeklyReview[]>(REPOSITORY_KEYS.WEEKLY_REVIEWS)) ?? [];
    const monthlyReviews =
      (await this.repository.getData<MonthlyReview[]>(REPOSITORY_KEYS.MONTHLY_REVIEWS)) ?? [];
    const onThisDayEntries =
      (await this.repository.getData<OnThisDayEntry[]>(REPOSITORY_KEYS.ON_THIS_DAY_ENTRIES)) ?? [];

    return {
      dailyReviews,
      weeklyReviews,
      monthlyReviews,
      onThisDayEntries
    };
  }

  async loadCategoryScopeSnapshot(): Promise<CategoryScopeSnapshot> {
    await this.initialize();

    const categories =
      (await this.repository.getData<Category[]>(REPOSITORY_KEYS.CATEGORIES)) ?? CATEGORIES;
    const scopes =
      (await this.repository.getData<Scope[]>(REPOSITORY_KEYS.SCOPES)) ?? SCOPES;
    const goals =
      (await this.repository.getData<Goal[]>(REPOSITORY_KEYS.GOALS)) ?? INITIAL_GOALS;
    const majorGoals =
      (await this.repository.getData<MajorGoal[]>(REPOSITORY_KEYS.MAJOR_GOALS)) ?? [];

    return {
      categories,
      scopes,
      goals,
      majorGoals
    };
  }

  async loadAchievementSnapshot(): Promise<AchievementSnapshot> {
    await this.initialize();

    const meta =
      (await this.repository.getData<AchievementMeta>(REPOSITORY_KEYS.ACHIEVEMENT_META)) ?? {
        achievementStartDate: null
      };
    const rules =
      (await this.repository.getData<AchievementRule[]>(REPOSITORY_KEYS.ACHIEVEMENT_RULES)) ?? [];
    const rewards =
      (await this.repository.getData<AchievementReward[]>(REPOSITORY_KEYS.ACHIEVEMENT_REWARDS)) ?? [];
    const collections =
      (await this.repository.getData<AchievementCollection[]>(REPOSITORY_KEYS.ACHIEVEMENT_COLLECTIONS)) ?? DEFAULT_ACHIEVEMENT_COLLECTIONS;
    // migrate: reset default bottle costs to the current default
    const migratedCollections = collections.map((c) =>
      c.id.startsWith('default-bottle-') ? { ...c, cost: DEFAULT_ACHIEVEMENT_COLLECTION_COST } : c
    );
    const dailySnapshots =
      (await this.repository.getData<AchievementDailySnapshot[]>(REPOSITORY_KEYS.ACHIEVEMENT_DAILY_SNAPSHOTS)) ?? [];
    const redemptionRecords =
      (await this.repository.getData<AchievementRedemptionRecord[]>(REPOSITORY_KEYS.ACHIEVEMENT_REDEMPTION_RECORDS)) ?? [];
    const collectionRecords =
      (await this.repository.getData<AchievementCollectionRecord[]>(REPOSITORY_KEYS.ACHIEVEMENT_COLLECTION_RECORDS)) ?? [];

    return {
      meta,
      rules,
      rewards,
      collections: migratedCollections,
      dailySnapshots,
      redemptionRecords,
      collectionRecords
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
