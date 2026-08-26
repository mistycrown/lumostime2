import { describe, expect, it } from 'vitest';
import {
  addRoutineChecklistItem,
  parseRoutineChecklist,
  serializeRoutineChecklist,
  toggleRoutineChecklistItem
} from './routineChecklist';

describe('routineChecklist', () => {
  it('parses and serializes Markdown checklist state', () => {
    const markdown = '- [ ] 洗漱\n- [x] 刷牙';
    expect(parseRoutineChecklist(markdown)).toEqual([
      { text: '洗漱', completed: false },
      { text: '刷牙', completed: true }
    ]);
    expect(serializeRoutineChecklist(parseRoutineChecklist(markdown))).toBe(markdown);
  });

  it('toggles one item without changing other items', () => {
    expect(toggleRoutineChecklistItem('- [ ] 洗漱\n- [x] 刷牙', 0)).toBe('- [x] 洗漱\n- [x] 刷牙');
  });

  it('adds a default unfinished item', () => {
    expect(addRoutineChecklistItem('- [ ] 洗漱')).toBe('- [ ] 洗漱\n- [ ] 新 checklist 条目');
  });
});
