/**
 * @file WidgetSlotEditorModal.test.ts
 * @input Timer-slot todo auto-apply helper inputs
 * @output Regression coverage for widget timer-slot todo selection inheritance
 * @pos Test
 * @description Verifies timer widget slots inherit linked tag metadata and default scopes from the selected todo while keeping sensible fallbacks for partially linked todos or cleared selections.
 * @updated 2026-05-06: Added a source-level guard that keeps widget timer slots on the shared hierarchical todo picker configuration.
 * @updated 2026-05-06: Added regression coverage for todo-driven widget slot tag and scope auto-apply behavior.
 */

import widgetSlotEditorModalSource from './WidgetSlotEditorModal.tsx?raw';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { TodoItem } from '../types';
import type { WidgetSlotEditorDraft } from './WidgetSlotEditorModal';

let applyLinkedTodoToTimerWidgetDraft: typeof import('./WidgetSlotEditorModal')['applyLinkedTodoToTimerWidgetDraft'];

beforeAll(async () => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    }
  });

  ({ applyLinkedTodoToTimerWidgetDraft } = await import('./WidgetSlotEditorModal'));
});

const createTimerDraft = (
  overrides: Partial<WidgetSlotEditorDraft> = {}
): WidgetSlotEditorDraft => ({
  slotIndex: 0,
  slotType: 'timer',
  categoryId: 'existing-category',
  activityId: 'existing-activity',
  linkedTodoId: null,
  scopeIds: ['existing-scope'],
  checkTemplateId: null,
  checkItemId: null,
  shortcutAction: null,
  label: null,
  customIcon: null,
  iconMode: 'emoji',
  uiIcon: null,
  backgroundColor: null,
  ...overrides
});

const createTodo = (overrides: Partial<TodoItem>): TodoItem => ({
  id: 'todo-1',
  categoryId: 'todo-category',
  title: 'Timer todo',
  isCompleted: false,
  ...overrides
});

describe('applyLinkedTodoToTimerWidgetDraft', () => {
  it('keeps the widget slot todo picker in hierarchy mode', () => {
    expect(widgetSlotEditorModalSource).toContain('enableHierarchy={true}');
  });

  it('overwrites the timer slot tag and scopes from the selected todo metadata', () => {
    const draft = createTimerDraft();
    const todos: TodoItem[] = [
      createTodo({
        id: 'todo-linked',
        linkedCategoryId: 'todo-linked-category',
        linkedActivityId: 'todo-linked-activity',
        defaultScopeIds: ['scope-a', 'scope-b']
      })
    ];

    expect(applyLinkedTodoToTimerWidgetDraft(draft, 'todo-linked', todos)).toMatchObject({
      linkedTodoId: 'todo-linked',
      categoryId: 'todo-linked-category',
      activityId: 'todo-linked-activity',
      scopeIds: ['scope-a', 'scope-b']
    });
  });

  it('keeps the current tag but clears scopes when the selected todo has no linked tag or default scopes', () => {
    const draft = createTimerDraft({
      categoryId: 'manual-category',
      activityId: 'manual-activity',
      scopeIds: ['manual-scope']
    });
    const todos: TodoItem[] = [
      createTodo({
        id: 'todo-unlinked'
      })
    ];

    expect(applyLinkedTodoToTimerWidgetDraft(draft, 'todo-unlinked', todos)).toMatchObject({
      linkedTodoId: 'todo-unlinked',
      categoryId: 'manual-category',
      activityId: 'manual-activity',
      scopeIds: null
    });
  });

  it('only clears the linked todo id when the selection is removed', () => {
    const draft = createTimerDraft({
      linkedTodoId: 'todo-linked',
      categoryId: 'manual-category',
      activityId: 'manual-activity',
      scopeIds: ['manual-scope']
    });

    expect(applyLinkedTodoToTimerWidgetDraft(draft, undefined, [])).toMatchObject({
      linkedTodoId: null,
      categoryId: 'manual-category',
      activityId: 'manual-activity',
      scopeIds: ['manual-scope']
    });
  });
});
