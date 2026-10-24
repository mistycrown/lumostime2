/**
 * @file journalStatistics.ts
 * @input Midnight-clipped actual journal logs with immutable label identities
 * @output Nested category/activity and todo-category/task distributions plus scopes
 * @pos Utility (Journal statistics)
 * @updated 2026-10-23: Matches full-duration multi-scope/keyword attribution without counting Plan blocks.
 * @updated 2026-10-24: Removes unsupported keyword statistics and retains parent-child relationships.
 */
import type { JournalDay, JournalStatLabel } from './journalExport';

export interface JournalStatItem extends JournalStatLabel { seconds: number; children?: JournalStatItem[] }
export interface JournalDistribution { id: string; label: string; items: JournalStatItem[]; total: number; attributed: boolean }
export const buildJournalDistributions = (days: JournalDay[]): JournalDistribution[] => {
  const definitions = [ ['categories', '标签'], ['scopes', '领域'], ['todoCategories', '待办'] ];
  const maps = new Map(definitions.map(([id]) => [id, new Map<string, JournalStatItem>()]));
  const add = (id: string, item: JournalStatLabel, seconds: number, child?: JournalStatLabel) => {
    const map = maps.get(id)!;
    const previous = map.get(item.id);
    const children = previous?.children || [];
    if (child) {
      const existing = children.find((entry) => entry.id === child.id);
      if (existing) existing.seconds += seconds;
      else children.push({ ...child, seconds });
    }
    map.set(item.id, { ...item, seconds: (previous?.seconds || 0) + seconds, ...(child ? { children } : {}) });
  };
  days.forEach((day) => day.logs.filter((log) => !log.source.isPlanned && log.seconds > 0).forEach((log) => {
    add('categories', { id: log.source.categoryId, name: log.category, color: log.categoryColor }, log.seconds, { id: log.source.activityId, name: log.activity, color: log.color });
    new Map((log.scopes || []).map((item) => [item.id, item])).forEach((item) => add('scopes', item, log.seconds));
    if (log.todo) {
      add('todoCategories', { id: log.todo.categoryId, name: log.todo.category, color: log.todo.categoryColor || log.todo.color }, log.seconds, log.todo);
    }
  }));
  return definitions.map(([id, label]) => {
    const items = [...maps.get(id)!.values()].sort((a, b) => b.seconds - a.seconds || a.id.localeCompare(b.id));
    items.forEach((item) => item.children?.sort((a, b) => b.seconds - a.seconds || a.id.localeCompare(b.id)));
    return { id, label, items, total: items.reduce((sum, item) => sum + item.seconds, 0), attributed: id === 'scopes' };
  });
};
