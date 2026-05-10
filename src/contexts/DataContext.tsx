/**
 * @file DataContext.tsx
 * @description Manages core application data state (logs, todos, todoCategories) with async repository hydration and persistence.
 */
import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { INITIAL_LOGS, INITIAL_TODOS, MOCK_TODO_CATEGORIES } from '../constants';
import { dataRepository } from '../repositories/dataRepository';
import { Log, TodoCategory, TodoItem } from '../types';
import {
  getLocalDataTimestamp,
  isLocalDataTimestampUpdateLocked,
  LOCAL_DATA_TIMESTAMP_UPDATED_EVENT,
  LocalDataTimestampUpdatedDetail,
  updateLocalDataTimestamp
} from '../utils/localDataTimestamp';

interface DataContextType {
  isReady: boolean;
  usesFallbackSeedData: boolean;

  logs: Log[];
  setLogs: React.Dispatch<React.SetStateAction<Log[]>>;

  todos: TodoItem[];
  setTodos: React.Dispatch<React.SetStateAction<TodoItem[]>>;

  todoCategories: TodoCategory[];
  setTodoCategories: React.Dispatch<React.SetStateAction<TodoCategory[]>>;

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
  const [localDataTimestamp, setLocalDataTimestamp] = useState<number>(() => getLocalDataTimestamp());

  const isHydratingRef = useRef(true);

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
        setLogs(snapshot.logs);
        setTodos(snapshot.todos);
        setTodoCategories(snapshot.todoCategories);
        setUsesFallbackSeedData(snapshot.usesFallbackSeedData);
      } catch (error) {
        console.error('[DataContext] Failed to hydrate core data from repository', error);
        setUsesFallbackSeedData(true);
      } finally {
        if (!cancelled) {
          setCanPersist(hydratedSuccessfully);
          setIsReady(true);
          window.setTimeout(() => {
            if (!cancelled) {
              isHydratingRef.current = false;
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

    void dataRepository.saveTodos(todos).catch((error) => {
      console.error('[DataContext] Failed to persist todos', error);
    });
  }, [canPersist, isReady, todos]);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    void dataRepository.saveTodoCategories(todoCategories).catch((error) => {
      console.error('[DataContext] Failed to persist todo categories', error);
    });
  }, [canPersist, isReady, todoCategories]);

  useEffect(() => {
    if (!isReady || !canPersist || isHydratingRef.current) {
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
  }, [canPersist, isReady, logs, todos, todoCategories]);

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
        localDataTimestamp,
        setLocalDataTimestamp
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
