/**
 * @file todoExecutionTags.test.ts
 * @input Energy, preset and custom folder label selections
 * @output Regression checks for selection semantics and category-aware deduplication
 * @pos Test (Todo execution context)
 * @updated 2026-10-29: Preserves distinct same-name labels in separate library categories.
 */
import { describe, expect, it } from 'vitest';
import {
  createCustomTodoExecutionTag,
  normalizeTodoExecutionTags,
  toggleTodoExecutionTag
} from './todoExecutionTags';

describe('todo execution tags', () => {
  it('preserves separate label identities with the same name in different library categories', () => {
    const tags = normalizeTodoExecutionTags([
      { id: 'custom:one', name: '阅读', group: 'custom', categoryId: 'home', source: 'user' },
      { id: 'custom:two', name: '阅读', group: 'custom', categoryId: 'travel', source: 'user' }
    ]);
    expect(tags.map((tag) => tag.categoryId)).toEqual(['home', 'travel']);
  });
  it('keeps only one energy tag while allowing scene and time tags together', () => {
    const tags = normalizeTodoExecutionTags([
      { id: 'energy:low', name: '\u4f4e\u7cbe\u529b', group: 'energy', source: 'preset' },
      { id: 'scene:home', name: '\u5bb6\u91cc', group: 'scene', source: 'preset' },
      { id: 'energy:high', name: '\u9ad8\u7cbe\u529b', group: 'energy', source: 'preset' },
      { id: 'time:evening', name: '\u665a\u4e0a', group: 'time', source: 'preset' }
    ]);

    expect(tags.map((tag) => tag.id)).toEqual(['scene:home', 'energy:high', 'time:evening']);
  });

  it('toggles a tag and replaces an existing energy selection', () => {
    const low = { id: 'energy:low', name: '\u4f4e\u7cbe\u529b', group: 'energy' as const, source: 'preset' as const };
    const high = { id: 'energy:high', name: '\u9ad8\u7cbe\u529b', group: 'energy' as const, source: 'preset' as const };

    expect(toggleTodoExecutionTag([low], high)).toEqual([high]);
    expect(toggleTodoExecutionTag([high], high)).toEqual([]);
  });

  it('trims and de-duplicates custom tags', () => {
    const custom = createCustomTodoExecutionTag('  \u9700\u8981\u5b89\u9759  ', 'custom:quiet');
    expect(custom).toEqual({ id: 'custom:quiet', name: '\u9700\u8981\u5b89\u9759', group: 'custom', source: 'user' });
    expect(normalizeTodoExecutionTags([custom, { ...custom }])).toEqual([custom]);
    expect(createCustomTodoExecutionTag('   ', 'custom:empty')).toBeNull();
  });

  it('ignores malformed legacy values', () => {
    expect(normalizeTodoExecutionTags([null, undefined, { id: '', name: 'bad' }, { id: 'custom:ok', name: '\u53ef\u7528' }])).toEqual([
      { id: 'custom:ok', name: '\u53ef\u7528', group: 'custom', source: 'user' }
    ]);
  });
});
