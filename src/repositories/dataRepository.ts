/**
 * @file dataRepository.ts
 * @input Legacy localStorage keys, IndexedDB-backed storage repository, application defaults
 * @output Unified domain repository for heavy core data and one-time localStorage migration
 * @pos Repository (Application Data)
 * @description Loads and persists large core datasets through a single async repository and migrates legacy localStorage payloads into IndexedDB on first run.
 */
import { CATEGORIES, INITIAL_DAILY_REVIEWS, INITIAL_GOALS, INITIAL_LOGS, INITIAL_TODOS, MOCK_TODO_CATEGORIES, SCOPES } from '../constants';
import { REVIEW_KEYS, StorageKey, USER_DATA_KEYS, storage } from '../constants/storageKeys';
import { Category, DailyReview, Goal, Log, MajorGoal, MonthlyReview, Scope, TodoCategory, TodoItem, WeeklyReview } from '../types';
import { normalizeDailyReviews } from '../utils/checkItemNormalizer';
import { storageRepository, StorageRepository } from './storageRepository';

const CORE_DATA_MIGRATION_META_KEY = 'core-data-migration-v1';

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
  MONTHLY_REVIEWS: 'monthlyReviews'
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
}

export interface CategoryScopeSnapshot {
  categories: Category[];
  scopes: Scope[];
  goals: Goal[];
  majorGoals: MajorGoal[];
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

    return {
      dailyReviews,
      weeklyReviews,
      monthlyReviews
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
