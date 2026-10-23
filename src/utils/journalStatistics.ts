/**
 * @file journalStatistics.ts
 * @input Midnight-clipped actual journal logs with immutable label identities
 * @output Category, activity, keyword, scope, todo-category and task time distributions
 * @pos Utility (Journal statistics)
 * @updated 2026-10-23: Matches full-duration multi-scope/keyword attribution without counting Plan blocks.
 */
import type { JournalDay, JournalStatLabel } from './journalExport';

export interface JournalStatItem extends JournalStatLabel { seconds: number }
export interface JournalDistribution { id: string; label: string; items: JournalStatItem[]; total: number; attributed: boolean }
export const buildJournalDistributions = (days: JournalDay[]): JournalDistribution[] => {
  const definitions = [ ['categories', '一级标签'], ['activities', '二级标签'], ['keywords', '关键字'], ['scopes', '领域'], ['todoCategories', '待办分类'], ['todos', '待办'] ];
  const maps = new Map(definitions.map(([id]) => [id, new Map<string, JournalStatItem>()]));
  const add = (id: string, item: JournalStatLabel, seconds: number) => {
    const map = maps.get(id)!;
    const previous = map.get(item.id);
    map.set(item.id, { ...item, seconds: (previous?.seconds || 0) + seconds });
  };
  days.forEach((day) => day.logs.filter((log) => !log.source.isPlanned && log.seconds > 0).forEach((log) => {
    add('categories', { id: log.source.categoryId, name: log.category, color: log.categoryColor }, log.seconds);
    add('activities', { id: log.source.activityId, name: log.activity, color: log.color }, log.seconds);
    for (const kind of ['keywords', 'scopes'] as const) {
      const unique = new Map((log[kind] || []).map((item) => [item.id, item]));
      unique.forEach((item) => add(kind, item, log.seconds));
    }
    if (log.todo) {
      add('todos', log.todo, log.seconds);
      add('todoCategories', { id: log.todo.categoryId, name: log.todo.category, color: log.todo.categoryColor || log.todo.color }, log.seconds);
    }
  }));
  return definitions.map(([id, label]) => {
    const items = [...maps.get(id)!.values()].sort((a, b) => b.seconds - a.seconds || a.id.localeCompare(b.id));
    return { id, label, items, total: items.reduce((sum, item) => sum + item.seconds, 0), attributed: id === 'keywords' || id === 'scopes' };
  });
};
