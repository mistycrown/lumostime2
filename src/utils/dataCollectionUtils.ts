/**
 * @file dataCollectionUtils.ts
 * @input Data collections, collection entries, logs, and todos
 * @output Shared helpers for collection membership updates and mixed-item resolution
 * @pos Utility (data collection helpers)
 * @description Keeps the new themed collection feature consistent across picker, list, and detail surfaces by centralizing membership updates and display joins.
 * @updated 2026-05-12: Added first-pass helpers for mixed log/todo collection membership and display resolution.
 */
import {
  DataCollection,
  DataCollectionEntry,
  DataCollectionItemType,
  Log,
  TodoItem
} from '../types';

export interface DataCollectionCountSummary {
  total: number;
  logCount: number;
  todoCount: number;
}

export type ResolvedDataCollectionItem =
  | {
      entry: DataCollectionEntry;
      itemType: 'log';
      log: Log;
    }
  | {
      entry: DataCollectionEntry;
      itemType: 'todo';
      todo: TodoItem;
    };

interface UpsertDataCollectionEntriesParams {
  entries: DataCollectionEntry[];
  collectionIds: string[];
  itemType: DataCollectionItemType;
  itemId: string;
  addedAt: number;
}

const compareStringSets = (left: string[], right: string[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();

  return leftSorted.every((value, index) => value === rightSorted[index]);
};

export const getDataCollectionEntriesForItem = (
  entries: DataCollectionEntry[],
  itemType: DataCollectionItemType,
  itemId: string
): DataCollectionEntry[] => entries.filter((entry) => entry.itemType === itemType && entry.itemId === itemId);

export const getDataCollectionIdsForItem = (
  entries: DataCollectionEntry[],
  itemType: DataCollectionItemType,
  itemId: string
): string[] => getDataCollectionEntriesForItem(entries, itemType, itemId).map((entry) => entry.collectionId);

export const hasDataCollectionMembershipChanged = (
  entries: DataCollectionEntry[],
  collectionIds: string[],
  itemType: DataCollectionItemType,
  itemId: string
): boolean => !compareStringSets(
  getDataCollectionIdsForItem(entries, itemType, itemId),
  Array.from(new Set(collectionIds))
);

export const upsertDataCollectionEntriesForItem = ({
  entries,
  collectionIds,
  itemType,
  itemId,
  addedAt
}: UpsertDataCollectionEntriesParams): DataCollectionEntry[] => {
  const normalizedCollectionIds = Array.from(new Set(collectionIds));
  const existingEntries = getDataCollectionEntriesForItem(entries, itemType, itemId);
  const existingByCollectionId = new Map(existingEntries.map((entry) => [entry.collectionId, entry]));
  const unrelatedEntries = entries.filter((entry) => !(entry.itemType === itemType && entry.itemId === itemId));

  const nextEntries = normalizedCollectionIds.map((collectionId) => {
    const existingEntry = existingByCollectionId.get(collectionId);
    if (existingEntry) {
      return existingEntry;
    }

    return {
      id: crypto.randomUUID(),
      collectionId,
      itemType,
      itemId,
      addedAt
    } satisfies DataCollectionEntry;
  });

  return [...unrelatedEntries, ...nextEntries];
};

export const resolveDataCollectionItems = (
  collectionId: string,
  entries: DataCollectionEntry[],
  logs: Log[],
  todos: TodoItem[]
): ResolvedDataCollectionItem[] => {
  const logById = new Map(logs.map((log) => [log.id, log]));
  const todoById = new Map(todos.map((todo) => [todo.id, todo]));

  return entries
    .filter((entry) => entry.collectionId === collectionId)
    .map((entry) => {
      if (entry.itemType === 'log') {
        const log = logById.get(entry.itemId);
        return log ? { entry, itemType: 'log' as const, log } : null;
      }

      const todo = todoById.get(entry.itemId);
      return todo ? { entry, itemType: 'todo' as const, todo } : null;
    })
    .filter((item): item is ResolvedDataCollectionItem => Boolean(item))
    .sort((left, right) => right.entry.addedAt - left.entry.addedAt);
};

export const buildDataCollectionCountMap = (
  collections: DataCollection[],
  entries: DataCollectionEntry[],
  logs: Log[],
  todos: TodoItem[]
): Map<string, DataCollectionCountSummary> => {
  const logIds = new Set(logs.map((log) => log.id));
  const todoIds = new Set(todos.map((todo) => todo.id));
  const countMap = new Map<string, DataCollectionCountSummary>(
    collections.map((collection) => [
      collection.id,
      {
        total: 0,
        logCount: 0,
        todoCount: 0
      }
    ])
  );

  entries.forEach((entry) => {
    const summary = countMap.get(entry.collectionId);
    if (!summary) {
      return;
    }

    if (entry.itemType === 'log') {
      if (!logIds.has(entry.itemId)) {
        return;
      }

      summary.total += 1;
      summary.logCount += 1;
      return;
    }

    if (!todoIds.has(entry.itemId)) {
      return;
    }

    summary.total += 1;
    summary.todoCount += 1;
  });

  return countMap;
};
