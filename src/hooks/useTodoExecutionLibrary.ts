/**
 * @file useTodoExecutionLibrary.ts
 * @input Current todos including any editor draft
 * @output Reactive reusable execution labels and categories
 * @pos Hook (Todo execution context)
 * @updated 2026-10-29: Discovers legacy task tags once and reacts to library restores.
 */
import { useEffect, useSyncExternalStore } from 'react';
import type { TodoItem } from '../types';
import { todoExecutionLibraryService } from '../services/todoExecutionLibraryService';
import { discoverExecutionTags } from '../utils/todoExecutionLibrary';

export const useTodoExecutionLibrary = (todos: Pick<TodoItem, 'executionTags'>[]) => {
  const library = useSyncExternalStore(todoExecutionLibraryService.subscribe, todoExecutionLibraryService.getSnapshot, todoExecutionLibraryService.getServerSnapshot);
  useEffect(() => {
    const current = todoExecutionLibraryService.getSnapshot();
    const discovered = discoverExecutionTags(current, todos);
    if (discovered !== current) {
      try { todoExecutionLibraryService.save(discovered); }
      catch (error) { console.error('[TodoExecutionLibrary] Could not remember existing labels', error); }
    }
  }, [library, todos]);
  return library;
};
