/**
 * @file journalExport.ts
 * @input Local app datasets and journal export options
 * @output Validated, date-bounded journal model without mutating source records
 * @pos Utility (Journal PDF)
 * @updated 2026-10-23: Adds calendar grouping, midnight clipping, plan projection and historical checks.
 * @updated 2026-10-23: Strictly parses eight-digit entry and uses full current/previous calendar periods.
 * @updated 2026-10-23: Adds separate log/timeline chapters and retains activity colors for weekly blocks.
 * @updated 2026-10-23: Projects goal progress and shared calendar colors for nested book layouts.
 * @updated 2026-10-23: Snapshots keyword, scope and todo identities for six actual-time distributions.
 * @updated 2026-10-23: Resolves historical Log fields and retains planned record metadata alongside deduplicated task plans.
 * @updated 2026-10-23: Projects Collection membership and current review templates, preserving authored colors without palette remapping.
 * @updated 2026-10-24: Maps seventeen independent parts to backward-compatible chapters and accepts per-export appearance.
 */
import type { Category, CheckItem, DailyReview, DataCollection, DataCollectionEntry, Goal, Log, MajorGoal, MonthlyReview, ReviewTemplate, Scope, TodoCategory, TodoItem, WeeklyReview } from '../types';
import { buildTodoDateEntryMap, formatDateKey, getStartOfWeek, parseDateKey, type TodoDateEntry } from './todoScheduleUtils';
import { evaluateAutoCheck } from './autoCheckUtils';
import { getCheckItemCountState } from './dailyCheckUtils';
import { calculateGoalProgress } from './goalUtils';
import { calculateMajorGoalProgress } from './majorGoalUtils';
import { getColorHexForCharts } from './colorAdapterUtils';
import { DEFAULT_TODO_SCHEDULE_TYPE_COLORS, type TodoScheduleTypeColorKey } from '../services/todoScheduleColorService';
import { getLogMatchedDetailTimelineKeywords, syncActivityKeywordsWithAttribute } from './detailTimelineKeywordUtils';
import { getNormalizedScopeIds } from './scopeStatsUtils';
import { journalLogFields, type JournalField } from './journalLogContent';

export const JOURNAL_SECTIONS = [
  { id: 'yearly', label: '年度回顾与目标' },
  { id: 'monthly', label: '月计划与月历' },
  { id: 'weekly', label: '周计划' },
  { id: 'daily', label: '一日一页' },
  { id: 'timeline', label: '时间轴' },
  { id: 'logs', label: '日志' },
  { id: 'checks', label: '打卡表' },
  { id: 'reviews', label: '复盘' }
] as const;
export type JournalSection = typeof JOURNAL_SECTIONS[number]['id'];
export const JOURNAL_PART_GROUPS = [
  { label: '年度', items: [ { id: 'annualReview', label: '年度回顾', section: 'yearly' }, { id: 'goals', label: '目标与子目标', section: 'yearly' }, { id: 'mood', label: '心情年历', section: 'yearly' }, { id: 'oneLine', label: '每日一句话', section: 'yearly' } ] },
  { label: '每月', items: [ { id: 'monthCalendar', label: '月历', section: 'monthly' }, { id: 'monthAgenda', label: '日程明细', section: 'monthly' }, { id: 'monthReview', label: '月复盘', section: 'reviews' }, { id: 'monthChecks', label: '月打卡', section: 'checks' }, { id: 'monthStatistics', label: '时间分布与统计', section: 'checks' } ] },
  { label: '每周', items: [ { id: 'weekPlans', label: '周计划', section: 'weekly' }, { id: 'weekTimeline', label: '周时间轴', section: 'timeline' }, { id: 'weekReview', label: '周复盘', section: 'reviews' } ] },
  { label: '每日', items: [ { id: 'dayPlans', label: '日计划', section: 'daily' }, { id: 'dayLogs', label: '日志图文', section: 'logs' }, { id: 'dayChecks', label: '日课', section: 'daily' }, { id: 'daySummary', label: '总结与贴纸', section: 'daily' }, { id: 'dayReview', label: '引导', section: 'reviews' } ] }
] as const;
export type JournalPart = typeof JOURNAL_PART_GROUPS[number]['items'][number]['id'];
const JOURNAL_PARTS = JOURNAL_PART_GROUPS.flatMap<typeof JOURNAL_PART_GROUPS[number]['items'][number]>((group) => group.items);
export type JournalCoverStyle = 'minimal' | 'classic' | 'abstract';
export const journalSectionsForParts = (parts: JournalPart[]): JournalSection[] => [...new Set(JOURNAL_PARTS.filter((item) => parts.includes(item.id)).map((item) => item.section))];
export const journalHasPart = (options: JournalExportOptions, part: JournalPart): boolean => {
  if (options.parts) return options.parts.includes(part);
  if (part === 'monthStatistics') return options.sections.includes('monthly') || options.sections.includes('checks');
  if (part === 'dayLogs') return options.sections.includes('daily') || options.sections.includes('logs');
  return options.sections.includes(JOURNAL_PARTS.find((item) => item.id === part)!.section);
};
export interface JournalExportOptions {
  startDate: string;
  endDate: string;
  sections: JournalSection[];
  paperSize: 'a4' | 'a5';
  includeCover: boolean;
  includeEmptyDays: boolean;
  parts?: JournalPart[];
  accentColor?: string;
  printedFontId?: string;
  contentFontId?: string;
  coverStyle?: JournalCoverStyle;
}
export interface JournalExportData {
  logs: Log[];
  categories: Category[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  scopes: Scope[];
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  monthlyReviews: MonthlyReview[];
  goals?: Goal[];
  majorGoals?: MajorGoal[];
  collections?: DataCollection[];
  collectionEntries?: DataCollectionEntry[];
  reviewTemplates?: ReviewTemplate[];
  calendarStyle?: { colorMode: 'category' | 'schedule'; colors: Record<TodoScheduleTypeColorKey, string> };
}
export interface JournalLog {
  source: Log;
  start: number;
  end: number;
  seconds: number;
  activity: string;
  category: string;
  color?: string;
  categoryColor?: string;
  keywords?: JournalStatLabel[];
  scopes?: JournalStatLabel[];
  todo?: JournalStatLabel & { categoryId: string; category: string; categoryColor?: string };
  fields?: JournalField[];
  collections?: JournalStatLabel[];
}
export interface JournalStatLabel { id: string; name: string; color?: string }
export interface JournalDay {
  date: string;
  logs: JournalLog[];
  todos: TodoDateEntry[];
  checks: CheckItem[];
  review?: DailyReview;
  actualSeconds: number;
  hasContent: boolean;
}
export interface JournalModel {
  options: JournalExportOptions;
  days: JournalDay[];
  months: string[];
  years: number[];
  weeks: string[];
  goals: (Goal | MajorGoal)[];
  weeklyReviews: WeeklyReview[];
  monthlyReviews: MonthlyReview[];
  calendarStyle: { colorMode: 'category' | 'schedule'; colors: Record<TodoScheduleTypeColorKey, string>; categoryColors: Record<string, string> };
  goalProgress: Record<string, { current: number; target: number; percentage: number }>;
  majorGoalIds: string[];
  reviewTemplates: ReviewTemplate[];
}

export const shiftJournalDate = (key: string, days: number): string => {
  const date = parseDateKey(key)!;
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
};

export const parseJournalDateInput = (input: string): string => {
  if (!/^\d{8}$/.test(input)) return '';
  const key = `${input.slice(0, 4)}-${input.slice(4, 6)}-${input.slice(6)}`;
  return parseDateKey(key) && Number(input.slice(0, 4)) >= 1900 ? key : '';
};

export type JournalRangePreset = 'today' | 'week' | 'lastWeek' | 'month' | 'lastMonth' | 'year' | 'lastYear' | 'all';
export const getJournalQuickRange = (data: JournalExportData, preset: JournalRangePreset, today = new Date()): { startDate: string; endDate: string } => {
  if (preset === 'all') return getJournalDataRange(data, today);
  let start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let end = new Date(start);
  if (preset === 'week' || preset === 'lastWeek') {
    start = getStartOfWeek(today);
    if (preset === 'lastWeek') start.setDate(start.getDate() - 7);
    end = new Date(start); end.setDate(end.getDate() + 6);
  }
  if (preset === 'month' || preset === 'lastMonth') {
    const offset = preset === 'lastMonth' ? -1 : 0;
    start = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    end = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);
  }
  if (preset === 'year' || preset === 'lastYear') {
    const year = today.getFullYear() - (preset === 'lastYear' ? 1 : 0);
    start = new Date(year, 0, 1); end = new Date(year, 11, 31);
  }
  return { startDate: formatDateKey(start), endDate: formatDateKey(end) };
};

export const validateJournalOptions = (options: JournalExportOptions): string | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(options.endDate)) return '请输入有效的起止日期';
  const start = parseDateKey(options.startDate);
  const end = parseDateKey(options.endDate);
  if (!start || !end || start.getFullYear() < 1900 || end.getFullYear() > 9999) return '请输入有效的起止日期';
  if (start > end) return '起始日期不能晚于结束日期';
  const dayCount = (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000 + 1;
  if (dayCount > 3660) return '一次最多导出 3660 天，请缩小日期范围';
  if (!options.sections.length) return '请至少选择一个导出章节';
  if (options.parts && (!options.parts.length || options.parts.some((part) => !JOURNAL_PART_GROUPS.some((group) => group.items.some((item) => item.id === part))))) return '请选择有效的导出内容';
  if (options.accentColor && !/^#[0-9a-f]{6}$/i.test(options.accentColor)) return '请输入有效的主题色';
  if (options.sections.some((section) => !JOURNAL_SECTIONS.some((item) => item.id === section))) return '存在不支持的导出章节';
  if (!['a4', 'a5'].includes(options.paperSize)) return '请选择 A4 或 A5 纸张';
  return null;
};

export const formatJournalDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分` : `${minutes} 分钟`;
};

export const formatJournalTime = (timestamp: number, dayKey: string): string => {
  if (formatDateKey(new Date(timestamp)) > dayKey) return '24:00';
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const journalTodoStatus = (entry: TodoDateEntry): string => {
  if (entry.todo.abandonedAt && entry.todo.abandonedAt.slice(0, 10) <= (entry.dateKey || '')) return '已放弃';
  if (entry.todo.occurrenceCompletions?.[entry.dateKey || ''] || entry.badges.completed) return '已完成';
  if (!entry.todo.recurrenceRule && entry.todo.isCompleted) return '已完成';
  return '待办';
};

export const journalCheckValue = (item: CheckItem): string => item.manualMode === 'count'
  ? `${getCheckItemCountState(item).current}/${getCheckItemCountState(item).target}`
  : item.isCompleted ? '已完成' : '未完成';

export interface JournalCalendarEntry {
  key: string;
  title: string;
  label: string;
  times: string[];
  completed: boolean;
  colorKey: string;
  color?: string;
  notes: { key: string; text: string }[];
  logs: JournalLog[];
}

export const getJournalDayPlans = (day: JournalDay): JournalCalendarEntry[] => {
  const entries = day.todos.filter((entry) => entry.primaryKind !== 'inProgress').map((entry) => ({
    key: `todo:${entry.todo.id}`,
    title: entry.todo.title,
    label: journalTodoStatus(entry) === '已放弃' ? '已放弃' : entry.badges.deadline ? '截止' : entry.badges.recurring ? '重复' : entry.badges.maybe ? '待定' : '排期',
    times: [] as string[],
    completed: journalTodoStatus(entry) === '已完成',
    colorKey: entry.todo.categoryId,
    color: undefined as string | undefined,
    notes: entry.todo.note ? [{ key: `todo:${entry.todo.id}`, text: entry.todo.note }] : [],
    logs: [] as JournalLog[]
  }));
  day.logs.filter((log) => log.source.isPlanned).forEach((log) => {
    const linked = entries.find((entry) => entry.key === `todo:${log.source.linkedTodoId}`);
    const time = `${formatJournalTime(log.start, day.date)}–${formatJournalTime(log.end, day.date)}`;
    if (linked) {
      linked.logs.push(log);
      linked.color = log.color;
      if (!linked.times.includes(time)) linked.times.push(time);
      if (log.source.note && !linked.notes.some((note) => note.text === log.source.note)) linked.notes.push({ key: `log:${log.source.id}`, text: log.source.note });
    } else entries.push({ key: `log:${log.source.id}`, title: log.source.title || log.activity, label: '计划', times: [time], completed: false, colorKey: log.category, color: log.color, notes: log.source.note ? [{ key: `log:${log.source.id}`, text: log.source.note }] : [], logs: [log] });
  });
  return entries;
};

export const getJournalDataRange = (data: JournalExportData, today = new Date()): { startDate: string; endDate: string } => {
  const keys = [formatDateKey(today)];
  const add = (value?: string) => { if (value && /^\d{4}-\d{2}-\d{2}$/.test(value) && parseDateKey(value)) keys.push(value); };
  const addTimestamp = (timestamp?: number) => { if (Number.isFinite(timestamp)) add(formatDateKey(new Date(timestamp!))); };
  data.logs.forEach((log) => { addTimestamp(log.startTime); addTimestamp(log.endTime > log.startTime ? log.endTime - 1 : log.endTime); });
  data.dailyReviews.forEach((review) => add(review.date));
  data.weeklyReviews.forEach((review) => { add(review.weekStartDate); add(review.weekEndDate); });
  data.monthlyReviews.forEach((review) => { add(review.monthStartDate); add(review.monthEndDate); });
  data.todos.forEach((todo) => {
    add(todo.scheduledDate); add(todo.deadlineDate); add(todo.recurrenceRule?.startDate); add(todo.recurrenceRule?.endDate);
    todo.maybeDates?.forEach(add);
    Object.keys(todo.occurrenceCompletions || {}).forEach(add);
    if (todo.completedAt) addTimestamp(Date.parse(todo.completedAt));
  });
  [...(data.goals || []), ...(data.majorGoals || [])].forEach((goal) => { add(goal.startDate); add(goal.endDate); });
  keys.sort();
  return { startDate: keys[0], endDate: keys[keys.length - 1] };
};

export const buildJournalModel = (data: JournalExportData, options: JournalExportOptions): JournalModel => {
  const error = validateJournalOptions(options);
  if (error) throw new Error(error);
  const days: JournalDay[] = [];
  const last = parseDateKey(options.endDate)!;
  for (const date = parseDateKey(options.startDate)!; date <= last; date.setDate(date.getDate() + 1)) {
    const key = formatDateKey(date);
    days.push({ date: key, logs: [], todos: [], checks: [], actualSeconds: 0, hasContent: false });
  }
  const byDate = new Map(days.map((day) => [day.date, day]));
  const rangeStart = parseDateKey(options.startDate)!.getTime();
  const rangeEnd = parseDateKey(shiftJournalDate(options.endDate, 1))!.getTime();
  const activities = new Map(data.categories.flatMap((category) => category.activities.map((activity) => [activity.id, { activity: activity.name, category: category.name, color: getColorHexForCharts(activity.color || category.themeColor || '') }] as const)));
  const activityDefinitions = new Map(data.categories.flatMap((category) => category.activities.map((activity) => [activity.id, activity] as const)));
  const categoryMap = new Map(data.categories.map((category) => [category.id, category]));
  const scopeMap = new Map(data.scopes.map((scope) => [scope.id, scope]));
  const todoMap = new Map(data.todos.map((todo) => [todo.id, todo]));
  const todoCategoryMap = new Map(data.todoCategories.map((category) => [category.id, category]));
  const collectionMap = new Map((data.collections || []).map((collection) => [collection.id, collection]));
  const collectionsByLog = new Map<string, JournalStatLabel[]>();
  (data.collectionEntries || []).filter((entry) => entry.itemType === 'log').forEach((entry) => {
    const entries = collectionsByLog.get(entry.itemId) || [];
    if (!entries.some((item) => item.id === entry.collectionId)) entries.push({ id: entry.collectionId, name: collectionMap.get(entry.collectionId)?.name || `已删除合集 (${entry.collectionId})` });
    collectionsByLog.set(entry.itemId, entries);
  });
  // Project each intersecting log only onto touched days; elapsed proportions retain recorded durations.
  data.logs.forEach((log) => {
    if (!Number.isFinite(log.startTime) || !Number.isFinite(log.endTime) || log.endTime <= log.startTime) return;
    let start = Math.max(log.startTime, rangeStart);
    const end = Math.min(log.endTime, rangeEnd);
    if (start >= end) return;
    const names = activities.get(log.activityId);
    const activity = activityDefinitions.get(log.activityId);
    const keywordRecords = syncActivityKeywordsWithAttribute(activity?.keywords || [], activity?.attributes || [], () => names?.color || '#8a918e');
    const attribute = activity?.attributes?.find((item) => item.isKeywordSource && !item.isArchived && (item.type === 'single' || item.type === 'multi'));
    const keywords = getLogMatchedDetailTimelineKeywords(log, keywordRecords, attribute).map((name) => {
      const stored = activity?.keywords?.find((item) => typeof item !== 'string' && item.label === name);
      return { id: `${log.activityId}:${name}`, name, color: typeof stored === 'object' && stored.color ? stored.color : names?.color };
    });
    const scopes = getNormalizedScopeIds(log.scopeIds).map((id) => ({ id, name: scopeMap.get(id)?.name || '已删除领域', color: getColorHexForCharts(scopeMap.get(id)?.themeColor || '') }));
    const todoItem = log.linkedTodoId ? todoMap.get(log.linkedTodoId) : undefined;
    const todoCategory = todoItem ? todoCategoryMap.get(todoItem.categoryId) : undefined;
    const todo = log.linkedTodoId ? { id: log.linkedTodoId, name: todoItem?.title || '已删除待办', categoryId: todoItem?.categoryId || '__missing__', category: todoCategory?.name || '未分类待办', color: getColorHexForCharts(todoCategory?.color || '') } : undefined;
    while (start < end) {
      const key = formatDateKey(new Date(start));
      const next = Math.min(end, parseDateKey(shiftJournalDate(key, 1))!.getTime());
      const seconds = Math.max(0, Number.isFinite(log.duration) ? log.duration : (log.endTime - log.startTime) / 1000) * (next - start) / (log.endTime - log.startTime);
      byDate.get(key)?.logs.push({ source: log, start, end: next, seconds, activity: names?.activity || '未分类活动', category: names?.category || '未分类', color: names?.color, categoryColor: getColorHexForCharts(categoryMap.get(log.categoryId)?.themeColor || ''), keywords, scopes, todo, fields: journalLogFields(log, activity), collections: collectionsByLog.get(log.id) || [] });
      start = next;
    }
  });
  const todos = buildTodoDateEntryMap(data.todos, data.logs, days.map((day) => day.date));
  const reviews = new Map(data.dailyReviews.map((review) => [review.date, review]));
  const context = { categories: data.categories, scopes: data.scopes, todos: data.todos, todoCategories: data.todoCategories };
  days.forEach((day) => {
    day.logs.sort((left, right) => left.start - right.start || left.source.id.localeCompare(right.source.id));
    day.todos = todos[day.date] || [];
    day.review = reviews.get(day.date);
    day.checks = (day.review?.checkItems || []).map((item) => {
      if (item.type === 'auto' && item.autoConfig) {
        return { ...item, isCompleted: evaluateAutoCheck(item, data.logs, context, parseDateKey(item.autoConfig.comparisonType === 'nightEarliestStart' ? shiftJournalDate(day.date, -1) : day.date)!) };
      }
      if (item.manualMode === 'count') return { ...item, isCompleted: getCheckItemCountState(item).isCompleted };
      return { ...item };
    });
    day.actualSeconds = day.logs.filter((log) => !log.source.isPlanned).reduce((sum, log) => sum + log.seconds, 0);
    day.hasContent = Boolean(day.logs.length || day.todos.length || day.checks.length || day.review?.summary?.trim() || day.review?.moodEmoji || day.review?.narrative?.trim() || day.review?.aiNewspaper || day.review?.answers.some((answer) => answer.answer.trim()));
  });
  const progressLogs = data.logs.filter((log) => log.startTime < rangeEnd).map((log) => {
    if (log.endTime <= rangeEnd || log.endTime <= log.startTime) return log;
    return { ...log, endTime: rangeEnd, duration: log.duration * (rangeEnd - log.startTime) / (log.endTime - log.startTime) };
  });
  const progressTodos = data.todos.filter((todo) => !todo.isCompleted || !todo.completedAt || Date.parse(todo.completedAt) < rangeEnd);
  const majorGoalIds = new Set((data.majorGoals || []).map((goal) => goal.id));
  return {
    options: { ...options, sections: [...new Set(options.sections)] }, days,
    months: [...new Set(days.map((day) => day.date.slice(0, 7)))],
    years: [...new Set(days.map((day) => Number(day.date.slice(0, 4))))],
    weeks: [...new Set(days.map((day) => formatDateKey(getStartOfWeek(parseDateKey(day.date)!))))],
    goals: [...(data.majorGoals || []), ...(data.goals || [])].filter((goal) => goal.startDate <= options.endDate && goal.endDate >= options.startDate),
    weeklyReviews: data.weeklyReviews.filter((review) => review.weekStartDate <= options.endDate && review.weekEndDate >= options.startDate).sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate)),
    monthlyReviews: data.monthlyReviews.filter((review) => review.monthStartDate <= options.endDate && review.monthEndDate >= options.startDate).sort((a, b) => a.monthStartDate.localeCompare(b.monthStartDate)),
    calendarStyle: {
      colorMode: data.calendarStyle?.colorMode || 'schedule',
      colors: { ...(data.calendarStyle?.colors || DEFAULT_TODO_SCHEDULE_TYPE_COLORS) },
      categoryColors: Object.fromEntries(data.todoCategories.map((category) => [category.id, getColorHexForCharts(category.color || '')]))
    },
    majorGoalIds: [...majorGoalIds],
    reviewTemplates: data.reviewTemplates || [],
    goalProgress: Object.fromEntries([...(data.majorGoals || []), ...(data.goals || [])].map((goal) => {
      const progress = majorGoalIds.has(goal.id)
        ? calculateMajorGoalProgress(goal as MajorGoal, data.goals || [], progressLogs, progressTodos)
        : calculateGoalProgress(goal as Goal, progressLogs, progressTodos);
      return [goal.id, progress];
    }))
  };
};
