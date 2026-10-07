/**
 * @file DataContext.tsx
 * @updated 2026-10-07: Applies node rename/merge and related log edits as one React state transition.
 * @updated 2026-10-07: Hydrates and atomically persists node category metadata.
 * @updated 2026-10-06: Discovers wiki-link nodes after log changes and persists metadata with core data.
 * @updated 2026-10-03: Initializes missing logs once but does not rewrite persisted hydration snapshots, preventing stale-window calendar deletions.
 * @description Manages core application data state (logs, todos, todoCategories, and data collections) with async repository hydration and persistence.
 * @updated 2026-07-30: Normalizes hydrated recurring auto-Plan settings alongside Maybe dates.
 * @updated 2026-05-23: Broadcasts desktop todo sync events after persisted todo writes and rehydrates todos from external desktop-window edits so Electron widgets and the main app stay aligned.
 * @updated 2026-08-11: Reports core local-data hydration failures and stops the bootstrap gate with a shareable error ID.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { INITIAL_LOGS, INITIAL_TODOS, MOCK_TODO_CATEGORIES } from '../constants';
import { dataRepository } from '../repositories/dataRepository';
import {
  publishDesktopTodoSyncEvent,
  subscribeDesktopTodoSyncEvent
} from '../services/desktopWidgetService';
import { DataCollection, DataCollectionEntry, Log, NoteNode, NodeCategory, TodoCategory, TodoItem } from '../types';
import { discoverNodes } from '../utils/nodeUtils';
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
  nodes: NoteNode[];
  setNodes: React.Dispatch<React.SetStateAction<NoteNode[]>>;
  updateNodeRecords: (transform: (nodes: NoteNode[], logs: Log[]) => { nodes: NoteNode[]; logs: Log[] }) => void;
  nodeCategories: NodeCategory[];
  setNodeCategories: React.Dispatch<React.SetStateAction<NodeCategory[]>>;

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
  const [{ logs, nodes: storedNodes }, setNodeRecords] = useState<{ logs: Log[]; nodes: NoteNode[] }>({ logs: INITIAL_LOGS, nodes: [] });
  const setLogs = useCallback((action: React.SetStateAction<Log[]>) => setNodeRecords((previous) => {
    const next = typeof action === 'function' ? action(previous.logs) : action;
    return next === previous.logs ? previous : { ...previous, logs: next };
  }), []);
  const setNodes = useCallback((action: React.SetStateAction<NoteNode[]>) => setNodeRecords((previous) => {
    const next = typeof action === 'function' ? action(previous.nodes) : action;
    return next === previous.nodes ? previous : { ...previous, nodes: next };
  }), []);
  const [nodeCategories, setNodeCategories] = useState<NodeCategory[]>([]);
  const nodes = useMemo(() => isReady ? discoverNodes(storedNodes, logs) : storedNodes, [isReady, storedNodes, logs]);
  const updateNodeRecords = useCallback((transform: (nodes: NoteNode[], logs: Log[]) => { nodes: NoteNode[]; logs: Log[] }) => {
    setNodeRecords((previous) => {
      const currentNodes = previous.nodes === storedNodes && previous.logs === logs ? nodes : previous.nodes;
      const next = transform(currentNodes, previous.logs);
      return next.nodes === previous.nodes && next.logs === previous.logs ? previous : next;
    });
  }, [nodes, storedNodes, logs]);
  const [todos, setTodos] = useState<TodoItem[]>(INITIAL_TODOS);
  const [todoCategories, setTodoCategories] = useState<TodoCategory[]>(MOCK_TODO_CATEGORIES);
  const [collections, setCollections] = useState<DataCollection[]>([]);
  const [collectionEntries, setCollectionEntries] = useState<DataCollectionEntry[]>([]);
  const [localDataTimestamp, setLocalDataTimestamp] = useState<number>(() => getLocalDataTimestamp());

  const isHydratingRef = useRef(true);
  const isTimestampTrackingReadyRef = useRef(false);
  const latestTodosRef = useRef<TodoItem[]>(INITIAL_TODOS);
  const persistedLogsRef = useRef<Log[] | null>(null);
  const persistedNodesRef = useRef<NoteNode[] | null>(null);
  const persistedNodeCategoriesRef = useRef<NodeCategory[] | null>(null);
  const persistenceQueueRef = useRef<Promise<void>>(Promise.resolve());

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
        persistedLogsRef.current = snapshot.hasStoredLogs ? snapshot.logs : null;
        persistedNodesRef.current = snapshot.nodes ?? [];
        persistedNodeCategoriesRef.current = snapshot.nodeCategories ?? [];
        setLogs(snapshot.logs);
        setNodes(snapshot.nodes ?? []);
        setNodeCategories(snapshot.nodeCategories ?? []);
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
    if (nodes !== storedNodes) setNodeRecords((previous) => previous.nodes === storedNodes && previous.logs === logs ? { ...previous, nodes } : previous);
  }, [nodes, storedNodes, logs]);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    if (logs === persistedLogsRef.current && nodes === persistedNodesRef.current && nodeCategories === persistedNodeCategoriesRef.current) return;
    const logsChanged = logs !== persistedLogsRef.current;
    persistedLogsRef.current = logs;
    persistedNodesRef.current = nodes;
    persistedNodeCategoriesRef.current = nodeCategories;
    // Serialize snapshots so a metadata-only write cannot overtake a log rename transaction.
    persistenceQueueRef.current = persistenceQueueRef.current
      .then(() => logsChanged ? dataRepository.saveLogs(logs, nodes, nodeCategories) : dataRepository.saveNodes(nodes, nodeCategories))
      .catch((error) => {
        reportCriticalDataError(error, '保存记录或节点失败，请重试。', { dataArea: 'logs-nodes' });
      });
  }, [canPersist, isReady, logs, nodes, nodeCategories]);

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
  }, [canPersist, isReady, logs, nodes, nodeCategories, todos, todoCategories, collections, collectionEntries]);

  return (
    <DataContext.Provider
      value={{
        isReady,
        usesFallbackSeedData,
        logs,
        setLogs,
        nodes,
        setNodes,
        updateNodeRecords,
        nodeCategories,
        setNodeCategories,
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
