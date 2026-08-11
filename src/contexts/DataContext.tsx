/**
 * @file DataContext.tsx
 * @description Manages core application data state (logs, todos, todoCategories, and data collections) with async repository hydration and persistence.
 * @updated 2026-07-30: Normalizes hydrated recurring auto-Plan settings alongside Maybe dates.
 * @updated 2026-05-23: Broadcasts desktop todo sync events after persisted todo writes and rehydrates todos from external desktop-window edits so Electron widgets and the main app stay aligned.
 * @updated 2026-08-11: Reports core local-data hydration failures and stops the bootstrap gate with a shareable error ID.
 */
import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { INITIAL_LOGS, INITIAL_TODOS, MOCK_TODO_CATEGORIES } from '../constants';
import { dataRepository } from '../repositories/dataRepository';
import {
  publishDesktopTodoSyncEvent,
  subscribeDesktopTodoSyncEvent
} from '../services/desktopWidgetService';
import { DataCollection, DataCollectionEntry, Log, TodoCategory, TodoItem } from '../types';
import { normalizeTodoMaybeDates } from '../utils/todoScheduleUtils';
import { normalizeTodoRecurringPlanConfig } from '../utils/todoRecurringPlanUtils';
import {
  getLocalDataTimestamp,
  isLocalDataTimestampUpdateLocked,
  LOCAL_DATA_TIMESTAMP_UPDATED_EVENT,
  LocalDataTimestampUpdatedDetail,
  updateLocalDataTimestamp
} from '../utils/localDataTimestamp';
import { reportCriticalDataError } from '../services/errorReporting';

interface DataContextType {
  isReady: boolean;
  usesFallbackSeedData: boolean;

  logs: Log[];
  setLogs: React.Dispatch<React.SetStateAction<Log[]>>;

  todos: TodoItem[];
  setTodos: React.Dispatch<React.SetStateAction<TodoItem[]>>;

  todoCategories: TodoCategory[];
  setTodoCategories: React.Dispatch<React.SetStateAction<TodoCategory[]>>;

  collections: DataCollection[];
  setCollections: React.Dispatch<React.SetStateAction<DataCollection[]>>;

  collectionEntries: DataCollectionEntry[];
  setCollectionEntries: React.Dispatch<React.SetStateAction<DataCollectionEntry[]>>;

  localDataTimestamp: number;
  setLocalDataTimestamp: React.Dispatch<React.SetStateAction<number>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [canPersist, setCanPersist] = useState(false);
  const [usesFallbackSeedData, setUsesFallbackSeedData] = useState(true);
  const [logs, setLogs] = useState<Log[]>(INITIAL_LOGS);
  const [todos, setTodos] = useState<TodoItem[]>(INITIAL_TODOS);
  const [todoCategories, setTodoCategories] = useState<TodoCategory[]>(MOCK_TODO_CATEGORIES);
  const [collections, setCollections] = useState<DataCollection[]>([]);
  const [collectionEntries, setCollectionEntries] = useState<DataCollectionEntry[]>([]);
  const [localDataTimestamp, setLocalDataTimestamp] = useState<number>(() => getLocalDataTimestamp());

  const isHydratingRef = useRef(true);
  const isTimestampTrackingReadyRef = useRef(false);
  const latestTodosRef = useRef<TodoItem[]>(INITIAL_TODOS);

  useEffect(() => {
    latestTodosRef.current = todos;
  }, [todos]);

  useEffect(() => {
    const handleTimestampUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<LocalDataTimestampUpdatedDetail>;
      const timestamp = customEvent.detail?.timestamp;
      if (typeof timestamp === 'number') {
        setLocalDataTimestamp(timestamp);
      }
    };

    window.addEventListener(LOCAL_DATA_TIMESTAMP_UPDATED_EVENT, handleTimestampUpdated as EventListener);
    return () => {
      window.removeEventListener(LOCAL_DATA_TIMESTAMP_UPDATED_EVENT, handleTimestampUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      let hydratedSuccessfully = false;

      try {
        const snapshot = await dataRepository.loadDataContextSnapshot();
        if (cancelled) {
          return;
        }

        hydratedSuccessfully = true;
        const normalizedTodos = snapshot.todos.map((todo) => normalizeTodoMaybeDates({
          ...todo,
          recurringPlan: todo.recurrenceRule && !todo.parentTodoId && todo.kind !== 'quick'
            ? normalizeTodoRecurringPlanConfig(todo.recurringPlan)
            : undefined
        }));
        setLogs(snapshot.logs);
        setTodos(normalizedTodos);
        setTodoCategories(snapshot.todoCategories);
        setCollections(snapshot.collections);
        setCollectionEntries(snapshot.collectionEntries);
        setUsesFallbackSeedData(snapshot.usesFallbackSeedData);
      } catch (error) {
        console.error('[DataContext] Failed to hydrate core data from repository', error);
        if (!cancelled) {
          reportCriticalDataError(error, '读取本地数据失败，请重试。', {
            dataArea: 'core'
          });
        }
        setUsesFallbackSeedData(true);
      } finally {
        if (!cancelled) {
          setCanPersist(hydratedSuccessfully);
          setIsReady(true);
          window.setTimeout(() => {
            if (!cancelled) {
              isHydratingRef.current = false;
              isTimestampTrackingReadyRef.current = true;
            }
          }, 0);
        }
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    void dataRepository.saveLogs(logs).catch((error) => {
      console.error('[DataContext] Failed to persist logs', error);
    });
  }, [canPersist, isReady, logs]);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    void (async () => {
      try {
        await dataRepository.saveTodos(todos);
        if (!isHydratingRef.current) {
          publishDesktopTodoSyncEvent();
        }
      } catch (error) {
        console.error('[DataContext] Failed to persist todos', error);
      }
    })();
  }, [canPersist, isReady, todos]);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    const stopTodoSyncSubscription = subscribeDesktopTodoSyncEvent(() => {
      void (async () => {
        try {
          const snapshot = await dataRepository.loadDataContextSnapshot();
          const normalizedTodos = snapshot.todos.map((todo) => normalizeTodoMaybeDates({
            ...todo,
            recurringPlan: todo.recurrenceRule && !todo.parentTodoId && todo.kind !== 'quick'
              ? normalizeTodoRecurringPlanConfig(todo.recurringPlan)
              : undefined
          }));
          const currentSerializedTodos = JSON.stringify(latestTodosRef.current);
          const nextSerializedTodos = JSON.stringify(normalizedTodos);

          if (currentSerializedTodos === nextSerializedTodos) {
            return;
          }

          setTodos(normalizedTodos);
        } catch (error) {
          console.error('[DataContext] Failed to refresh todos from desktop sync event', error);
        }
      })();
    });

    return () => {
      stopTodoSyncSubscription();
    };
  }, [canPersist, isReady]);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    void dataRepository.saveTodoCategories(todoCategories).catch((error) => {
      console.error('[DataContext] Failed to persist todo categories', error);
    });
  }, [canPersist, isReady, todoCategories]);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    void dataRepository.saveDataCollections(collections).catch((error) => {
      console.error('[DataContext] Failed to persist data collections', error);
    });
  }, [canPersist, collections, isReady]);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    void dataRepository.saveDataCollectionEntries(collectionEntries).catch((error) => {
      console.error('[DataContext] Failed to persist data collection entries', error);
    });
  }, [canPersist, collectionEntries, isReady]);

  useEffect(() => {
    if (!isReady || !canPersist || isHydratingRef.current || !isTimestampTrackingReadyRef.current) {
      return;
    }

    if (isLocalDataTimestampUpdateLocked()) {
      console.log('[DataContext] Skipping local data timestamp update (locked during restore)');
      return;
    }

    const previous = getLocalDataTimestamp();
    const now = updateLocalDataTimestamp();
    console.log(
      `[DataContext] Data changed, updated local timestamp: ${previous} -> ${now} (${new Date(now).toLocaleTimeString()})`
    );
  }, [canPersist, isReady, logs, todos, todoCategories, collections, collectionEntries]);

  return (
    <DataContext.Provider
      value={{
        isReady,
        usesFallbackSeedData,
        logs,
        setLogs,
        todos,
        setTodos,
        todoCategories,
        setTodoCategories,
        collections,
        setCollections,
        collectionEntries,
        setCollectionEntries,
        localDataTimestamp,
        setLocalDataTimestamp
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
