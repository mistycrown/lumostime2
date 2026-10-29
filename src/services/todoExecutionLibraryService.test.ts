/**
 * @file todoExecutionLibraryService.test.ts
 * @input Legacy tags, library edits, backups and malformed persistence
 * @output Regression coverage for reuse, deletion and category/association integrity
 * @pos Test (Todo execution context)
 * @updated 2026-10-29: Covers library persistence and backup/restore compatibility.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { TodoItem } from '../types';
import { SETTINGS_KEYS } from '../constants/storageKeys';
import { TODO_EXECUTION_TAG_PRESETS } from '../utils/todoExecutionTags';
import {
  DEFAULT_EXECUTION_LIBRARY, deleteExecutionCategory, deleteExecutionTag, discoverExecutionTags,
  normalizeExecutionLibrary, resolveExecutionTags, updateExecutionTagAssociations
} from '../utils/todoExecutionLibrary';
import { groupTodosByExecutionTags } from '../utils/todoExecutionGrouping';
import { preferencesBackupService } from './preferencesBackupService';
import { todoExecutionLibraryService as service } from './todoExecutionLibraryService';

const legacy = { id: 'custom:legacy', name: '通勤时', group: 'custom' as const, source: 'user' as const };
const task: TodoItem = { id: 'task', categoryId: 'work', title: '阅读资料', note: '保留备注', isCompleted: false, executionTags: [legacy] };

describe('execution label library', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(globalThis, 'window', { configurable: true, value: new EventTarget() });
  });

  it('imports existing labels once and persists them for reuse even after the original task is removed', () => {
    const library = discoverExecutionTags(service.getSnapshot(), [task, task]);
    service.save(library);
    const loaded = service.getSnapshot();
    expect(loaded.tags.filter((tag) => tag.id === legacy.id)).toEqual([legacy]);
    expect(discoverExecutionTags(loaded, [])).toBe(loaded);
    expect(service.getSnapshot()).toBe(loaded);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEYS.TODO_EXECUTION_LIBRARY)!)).toEqual(loaded);
    expect(loaded.tags.filter((tag) => tag.group === 'energy')).toHaveLength(3);
  });

  it('keeps deleted presets and custom labels deleted when discovering stale task data', () => {
    const seeded = discoverExecutionTags(DEFAULT_EXECUTION_LIBRARY, [task]);
    const deleted = deleteExecutionTag(deleteExecutionTag(seeded, legacy.id), 'energy:low');
    service.save(deleted);
    const library = discoverExecutionTags(service.getSnapshot(), [task, { executionTags: [TODO_EXECUTION_TAG_PRESETS[0]] }]);
    expect(library.tags.some((tag) => tag.id === legacy.id || tag.id === 'energy:low')).toBe(false);
    expect(resolveExecutionTags([legacy], library)).toEqual([]);
    const changed = updateExecutionTagAssociations([task], library)[0];
    expect(changed).toEqual({ ...task, executionTags: undefined });
    expect(changed.note).toBe(task.note);
    expect(task.executionTags).toEqual([legacy]);
  });

  it('moves and renames labels while preserving identity, energy semantics and task fields', () => {
    const low = TODO_EXECUTION_TAG_PRESETS[0];
    const library = {
      ...DEFAULT_EXECUTION_LIBRARY,
      categories: [...DEFAULT_EXECUTION_LIBRARY.categories, { id: 'travel', name: '出行' }],
      tags: DEFAULT_EXECUTION_LIBRARY.tags.map((tag) => tag.id === low.id ? { ...tag, name: '轻松完成', categoryId: 'travel' } : tag)
    };
    const original = { ...task, executionTags: [low] };
    const changed = updateExecutionTagAssociations([original], library)[0];
    expect(changed.executionTags).toEqual([{ ...low, name: '轻松完成', categoryId: 'travel' }]);
    expect(changed.note).toBe(original.note);
    expect(changed.executionTags?.[0].group).toBe('energy');
    const afterDeletion = deleteExecutionCategory(library, 'travel');
    expect(resolveExecutionTags(changed.executionTags, afterDeletion)).toEqual([{ ...low, name: '轻松完成', categoryId: 'custom' }]);
    expect(deleteExecutionCategory(afterDeletion, 'custom')).toBe(afterDeletion);
    expect(updateExecutionTagAssociations([task], library)[0]).toBe(task);
  });

  it('backs up unused labels and categories, notifies mounted subscribers and preserves them for older backups', () => {
    service.save(discoverExecutionTags(DEFAULT_EXECUTION_LIBRARY, [task]));
    const backup = preferencesBackupService.buildBackupPayload();
    service.save(deleteExecutionTag(service.getSnapshot(), legacy.id));
    let notifications = 0;
    const unsubscribe = service.subscribe(() => { notifications += 1; });
    preferencesBackupService.applyBackupPayload(backup);
    expect(service.getSnapshot().tags.some((tag) => tag.id === legacy.id)).toBe(true);
    preferencesBackupService.applyBackupPayload({ storage: { lumos_default_view: 'RECORD' } });
    expect(service.getSnapshot().tags.some((tag) => tag.id === legacy.id)).toBe(true);
    expect(notifications).toBe(2);
    unsubscribe();
    service.save(DEFAULT_EXECUTION_LIBRARY);
    expect(notifications).toBe(2);
  });

  it('uses renamed labels and custom category order in execution groups', () => {
    const library = {
      ...DEFAULT_EXECUTION_LIBRARY,
      categories: [{ id: 'reading', name: '阅读' }, ...DEFAULT_EXECUTION_LIBRARY.categories],
      tags: [...DEFAULT_EXECUTION_LIBRARY.tags, { ...legacy, name: '旅途阅读', categoryId: 'reading' }]
    };
    const groups = groupTodosByExecutionTags([task, { ...task, id: 'second', executionTags: [TODO_EXECUTION_TAG_PRESETS[0]] }], { library });
    expect(groups.map((group) => group.label)).toEqual(['旅途阅读', '低精力']);
  });

  it('does not resurrect intentionally empty libraries and tolerates malformed records', () => {
    expect(normalizeExecutionLibrary({ tags: [], categories: [], deletedTagIds: [] }).tags).toEqual([]);
    const normalized = normalizeExecutionLibrary({ tags: [null, legacy, legacy], categories: [null, { id: 2 }], deletedTagIds: [1, null] });
    expect(normalized.tags).toEqual([legacy]);
    expect(normalized.categories).toEqual([{ id: 'custom', name: '自定义' }]);
    for (const raw of ['{broken', 'null', '[]']) {
      localStorage.setItem(SETTINGS_KEYS.TODO_EXECUTION_LIBRARY, raw);
      expect(service.getSnapshot().tags).toEqual(DEFAULT_EXECUTION_LIBRARY.tags);
    }
  });
});
