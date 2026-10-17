/**
 * @file dailyStatsLogsHarness.tsx
 * @input Real statistics hook, pie chart and hierarchical period log modal
 * @output Interaction assertions and mobile/desktop/dark screenshot checkpoints
 * @updated 2026-10-17: Verifies category/tag filtering, day boundaries, planned logs, dismissal, focus and scrolling.
 * @updated 2026-10-17: Covers week/month/year expansion, empty periods, keyboard wrapping and range reset.
 * @updated 2026-10-17: Exercises todo/scope sources, multiple tag categories, independent exclusions and scope duration semantics.
 * @updated 2026-10-17: Verifies bounded rendering and untouched collapsed payloads with 100,800 annual records.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PieChartView } from '../PieChartView';
import { useStatsCalculation } from '../../../hooks/useStatsCalculation';
import { runRegisteredHardwareBackHandler } from '../../../utils/hardwareBackHandlerStack';
import type { Category, Log, Scope, TodoCategory, TodoItem } from '../../../types';
import { getDateRange } from '../../StatsView/statsUtils';
import type { StatsLogRange } from '../../../utils/statsLogGroupingUtils';
import { useTodoStats } from '../../../hooks/useTodoStats';
import { useScopeStats } from '../../../hooks/useScopeStats';

declare global {
  interface Window {
    __dailyStatsLogsResult?: { passed: string[]; error?: string; performance?: Record<string, number> };
    __dailyStatsLogsCapture?: { name: string; width: number; height: number };
    __dailyStatsLogsCaptured?: boolean;
  }
}

const categories: Category[] = [
  { id: 'study', name: '学习', icon: '📚', themeColor: '#a7f3d0', activities: [
    { id: 'reading', name: '书籍文献', icon: '📖', color: '#a7f3d0' },
    { id: 'writing', name: '写作整理', icon: '✍️', color: '#bae6fd' }
  ] },
  { id: 'self', name: '与自己', icon: '🌻', themeColor: '#e9d5ff', activities: [
    { id: 'reading', name: '运动健身', icon: '🏃', color: '#e9d5ff' }
  ] }
];
const timestamp = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).getTime();
const log = (id: string, hour: number, minutes: number, extra: Partial<Log> = {}): Log => ({
  id, categoryId: 'study', activityId: 'reading', startTime: timestamp(16, hour),
  endTime: timestamp(16, hour, minutes), duration: minutes * 60, ...extra
});
let logs = [
  log('afternoon', 14, 38, { title: '把阅读变成自己的理解', note: '整理今天读到的内容，记下值得继续追问的问题。\n下次从这里继续。' }),
  log('morning', 9, 30, { title: '早晨的阅读', note: '读完一个章节，给自己留一点安静的时间。' }),
  log('writing', 16, 20, { activityId: 'writing', note: '将零散笔记整理成一篇短文。' }),
  log('other-category', 18, 26, { categoryId: 'self', note: 'OTHER_CATEGORY' }),
  log('yesterday', 9, 40, { startTime: timestamp(15, 9), endTime: timestamp(15, 9, 40), note: 'YESTERDAY' }),
  log('tomorrow', 9, 40, { startTime: timestamp(17, 9), endTime: timestamp(17, 9, 40), note: 'TOMORROW' }),
  log('plan', 20, 30, { isPlanned: true, note: 'PLANNED' })
];
let date = new Date(2026, 9, 16);
let range: StatsLogRange = 'day';
const dailyLogs = [...logs];
let privacy = false;
let enabled = true;
let underlyingTouches = 0;
let todos: TodoItem[] = [];
let todoCategories: TodoCategory[] = [];
let scopes: Scope[] = [];
const root = createRoot(document.getElementById('root')!);

const App = () => {
  const [excluded, setExcluded] = useState<string[]>([]);
  const dateRange = getDateRange(date, range);
  const { stats, filteredLogs } = useStatsCalculation({
    logs, categories, excludedCategoryIds: excluded,
    dateRange
  });
  const { todoStats } = useTodoStats({ logs, todos, todoCategories, dateRange });
  const { scopeStats } = useScopeStats({ logs, scopes, categories, dateRange });
  return <main className="mx-auto max-w-md px-7 py-6" onTouchEnd={() => underlyingTouches++}>
    <h1 className="mb-8 font-serif text-xl text-stone-800">Daily Review · 数据</h1>
    <PieChartView
      stats={stats} previousStats={null}
      todoStats={todoStats} previousTodoStats={null}
      scopeStats={scopeStats} previousScopeStats={null}
      pieRange={range} categories={categories} excludedCategoryIds={excluded}
      todos={todos} todoCategories={todoCategories} scopes={scopes}
      onToggleExclusion={id => setExcluded(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id])}
      logDetails={enabled ? { logs: filteredLogs, relatedLogs: logs, date, isPrivacyMode: privacy } : undefined}
    />
  </main>;
};
const render = () => root.render(<App />);
const tick = () => new Promise(resolve => setTimeout(resolve, 60));
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const button = (label: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
const close = async () => { button('关闭记录明细').click(); await tick(); };
const open = async (label: string) => { const target = button(label); target.focus(); target.click(); await tick(); };
const capture = async (name: string, width: number, height: number) => {
  window.__dailyStatsLogsCaptured = false;
  window.__dailyStatsLogsCapture = { name, width, height };
  for (let index = 0; index < 150 && !window.__dailyStatsLogsCaptured; index++) await tick();
  assert(window.__dailyStatsLogsCaptured, 'Screenshot checkpoint timed out');
  window.__dailyStatsLogsCapture = undefined;
};

const run = async () => {
  const passed: string[] = [];
  render(); await tick();
  const categoryButton = button('查看学习分类的当日记录');
  categoryButton.focus();
  categoryButton.querySelector<HTMLElement>('.h-1\\.5')!.click(); await tick();
  assert(dialog()?.textContent?.includes('3 条记录'), 'Category did not include every activity');
  assert(dialog()?.textContent?.includes('1小时 28分钟'), 'Modal and chart totals differ');
  assert(!/YESTERDAY|TOMORROW|PLANNED|OTHER_CATEGORY/.test(dialog()!.textContent!), 'Date/category/planned filtering leaked logs');
  const rows = Array.from(dialog()!.querySelectorAll('li'));
  assert(rows[0].textContent?.includes('早晨的阅读') && rows[2].textContent?.includes('写作整理'), 'Records are not chronological');
  assert(document.body.style.overflow === 'hidden', 'Background scroll was not locked');
  assert(document.activeElement === button('关闭记录明细'), 'Modal did not take focus');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  assert(document.activeElement === button('关闭记录明细'), 'Focus escaped the dialog');
  dialog()!.dispatchEvent(new Event('touchend', { bubbles: true }));
  assert(underlyingTouches === 0, 'Modal touch bubbled to date navigation');
  await capture('daily-stats-category-mobile', 390, 844);
  await close();
  assert(!dialog() && document.body.style.overflow !== 'hidden' && document.activeElement === categoryButton, 'Close did not restore focus/scroll');
  passed.push('category and progress bar: exact daily records, chronology, totals, focus and scroll');

  await open('查看书籍文献标签的当日记录');
  assert(dialog()?.textContent?.includes('2 条记录') && dialog()?.textContent?.includes('1小时 8分钟'), 'Activity filter or total failed');
  assert(!dialog()?.textContent?.includes('写作整理') && !dialog()?.textContent?.includes('OTHER_CATEGORY'), 'Activity crossed category boundaries');
  await capture('daily-stats-activity-desktop', 1100, 820);
  document.documentElement.dataset.themeMode = 'dark';
  await capture('daily-stats-activity-dark', 390, 844);
  delete document.documentElement.dataset.themeMode;
  assert(runRegisteredHardwareBackHandler(), 'Hardware back did not consume overlay');
  await tick(); assert(!dialog(), 'Hardware back did not close dialog');
  assert(!runRegisteredHardwareBackHandler(), 'Hardware handler was not cleaned up');
  passed.push('activity filter and Android back; responsive light/dark layouts');

  button('按二级标签显示标签颜色').click(); await tick();
  button('查看书籍文献标签的当日记录').querySelector<HTMLElement>('.h-1\\.5')!.click(); await tick();
  assert(!!dialog(), 'Activity progress bar did not open modal');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await tick(); assert(!dialog(), 'Escape did not close dialog');
  await open('查看学习分类的当日记录');
  dialog()!.parentElement!.click(); await tick(); assert(!dialog(), 'Backdrop did not close dialog');
  passed.push('second-level progress bars, Escape and backdrop dismissal');

  privacy = true; render(); await tick(); await open('查看学习分类的当日记录');
  assert(dialog()!.querySelector('.blur-sm')?.textContent?.includes('早晨的阅读'), 'Privacy mode did not cover titles and notes');
  logs = []; render(); await tick();
  assert(dialog()?.textContent?.includes('暂无记录') && dialog()?.textContent?.includes('0 条记录'), 'Live empty-state update failed');
  date = new Date(2026, 9, 17); render(); await tick(); assert(!dialog(), 'Date change kept a stale dialog');
  passed.push('privacy, live log updates, empty state and date changes');

  date = new Date(2026, 9, 16); privacy = false;
  logs = Array.from({ length: 18 }, (_, index) => log(`long-${index}`, index, 20, { note: '较长的记录内容需要自然换行，不应挤出屏幕。'.repeat(5) }));
  render(); await tick(); await open('查看学习分类的当日记录');
  await capture('daily-stats-long-list-mobile', 360, 640);
  assert(dialog()!.getBoundingClientRect().top >= 0, 'Dialog top was clipped: ' + JSON.stringify({ viewport: [innerWidth, innerHeight], rect: dialog()!.getBoundingClientRect().toJSON(), maxHeight: getComputedStyle(dialog()!).maxHeight }));
  const scroller = dialog()!.querySelector<HTMLElement>('.overflow-y-auto')!;
  assert(scroller.scrollHeight > scroller.clientHeight, 'Long lists did not scroll internally');
  assert(dialog()!.getBoundingClientRect().right <= innerWidth && dialog()!.scrollWidth <= dialog()!.clientWidth, 'Narrow dialog overflowed');
  await close();
  enabled = false; render(); await tick();
  assert(!button('查看学习分类的当日记录'), 'Non-enabled charts gained log interactions');
  passed.push('long notes, internal scroll, narrow layout and opt-in scope');

  const periodButton = (id: string) => dialog()!.querySelector<HTMLButtonElement>(`button[data-stats-period="${id}"]`)!;
  const expand = async (id: string) => { const target = periodButton(id); assert(target && !target.disabled, `Missing period ${id}`); target.click(); await tick(); };
  const logRows = () => dialog()!.querySelectorAll('li');
  enabled = true; range = 'week'; logs = dailyLogs;
  render(); await tick(); await open('查看学习分类的本周记录');
  assert(dialog()!.querySelectorAll('[data-stats-period]').length === 7 && logRows().length === 0, 'Week did not start with collapsed day summaries');
  assert(periodButton('day:2026-10-12').disabled, 'Empty day was not disabled');
  assert(dialog()!.textContent?.includes('5 条记录') && dialog()!.textContent?.includes('2小时 48分钟'), 'Weekly chart totals differ from dialog');
  await expand('day:2026-10-16');
  assert(logRows().length === 3 && dialog()!.textContent?.includes('早晨的阅读'), 'Weekly day expansion lost logs');
  assert(!/YESTERDAY|TOMORROW|PLANNED|OTHER_CATEGORY/.test(Array.from(logRows()).map(row => row.textContent).join('')), 'Day expansion leaked adjacent dates');
  await capture('stats-week-days-mobile', 390, 844);
  await expand('day:2026-10-16');
  assert(logRows().length === 0 && periodButton('day:2026-10-16').getAttribute('aria-expanded') === 'false', 'Day collapse did not hide logs');
  button('关闭记录明细').focus();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
  assert(document.activeElement === periodButton('day:2026-10-17'), 'Shift+Tab did not reach the last enabled summary');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  assert(document.activeElement === button('关闭记录明细'), 'Tab escaped the expanded dialog');
  passed.push('weekly day summaries, exact day logs, collapse, empty days and focus containment');

  range = 'month'; render(); await tick(); assert(!dialog(), 'Range change retained a stale selection');
  await open('查看学习分类的本月记录');
  assert(dialog()!.querySelectorAll('[data-stats-period]').length === 5 && logRows().length === 0, 'Month did not start with collapsed weeks');
  assert(periodButton('week:2026-10-01').textContent?.includes('10.01 — 10.04'), 'Partial first week was not clipped');
  await expand('week:2026-10-12');
  assert(dialog()!.querySelectorAll('[data-stats-period^="day:"]').length === 7, 'Month week did not expand to days');
  await expand('day:2026-10-16');
  assert(logRows().length === 3, 'Month day did not reach the matching logs');
  await capture('stats-month-weeks-desktop', 1100, 820);
  privacy = true; render(); await tick();
  assert(dialog()!.querySelector('.blur-sm')?.textContent?.includes('早晨的阅读'), 'Expanded period lost privacy mode');
  passed.push('monthly partial weeks, week-to-day-to-log expansion and privacy');

  privacy = false; range = 'year';
  logs = [
    ...dailyLogs,
    log('jan-end', 9, 30, { startTime: new Date(2026, 0, 31, 9).getTime(), endTime: new Date(2026, 0, 31, 9, 30).getTime(), note: 'JANUARY_ONLY' }),
    log('feb-start', 9, 20, { startTime: new Date(2026, 1, 1, 9).getTime(), endTime: new Date(2026, 1, 1, 9, 20).getTime(), note: 'FEBRUARY_ONLY' })
  ];
  render(); await tick(); assert(!dialog(), 'Year range did not clear month selection');
  await open('查看书籍文献标签的本年记录');
  assert(dialog()!.querySelectorAll('[data-stats-period]').length === 12 && logRows().length === 0, 'Year did not show twelve collapsed months');
  assert(periodButton('month:2026-03-01').disabled, 'Empty month was not disabled');
  await expand('month:2026-01-01'); await expand('week:2026-01-26'); await expand('day:2026-01-31');
  assert(logRows().length === 1 && logRows()[0].textContent?.includes('JANUARY_ONLY'), 'January included the adjacent month portion');
  await expand('month:2026-01-01');
  await expand('month:2026-10-01'); await expand('week:2026-10-12'); await expand('day:2026-10-16');
  assert(logRows().length === 2 && !Array.from(logRows()).some(row => /写作整理|OTHER_CATEGORY/.test(row.textContent || '')), 'Year activity hierarchy lost category/activity filtering');
  periodButton('week:2026-10-12').scrollIntoView({ block: 'start' });
  await capture('stats-year-months-mobile', 360, 740);
  assert(dialog()!.scrollWidth <= dialog()!.clientWidth && dialog()!.getBoundingClientRect().top >= 0, 'Expanded year overflowed a narrow viewport');
  document.documentElement.dataset.themeMode = 'dark';
  await capture('stats-year-months-dark', 390, 844);
  delete document.documentElement.dataset.themeMode;
  assert(runRegisteredHardwareBackHandler(), 'Grouped hierarchy did not consume Android back');
  await tick(); assert(!dialog(), 'Grouped hierarchy did not close on Android back');
  passed.push('year-to-month-to-week-to-day-to-log expansion, month boundaries, lazy rendering and responsive layouts');

  range = 'day';
  todos = [
    { id: 'book', title: '阅读《瓦尔登湖》', categoryId: 'projects', isCompleted: false },
    { id: 'notes', title: '整理读书笔记', categoryId: 'projects', isCompleted: true },
    { id: 'other-book', title: '阅读《瓦尔登湖》', categoryId: 'other', isCompleted: false }
  ];
  todoCategories = [
    { id: 'projects', name: '阅读计划', icon: '📝', color: '#e9d5ff' },
    { id: 'other', name: '生活杂项', icon: '🧺', color: '#bae6fd' }
  ];
  scopes = [
    { id: 'growth', name: '个人成长', icon: '🌱', themeColor: '#a7f3d0', isArchived: false, order: 0 },
    { id: 'health', name: '身心健康', icon: '🌻', themeColor: '#e9d5ff', isArchived: false, order: 1 }
  ];
  logs = [
    log('todo-reading', 9, 30, { linkedTodoId: 'book', duration: 1200, scopeIds: ['growth', 'health', 'growth'], title: '安静地读一个章节', note: 'TODO_READING' }),
    log('todo-notes', 10, 20, { activityId: 'writing', linkedTodoId: 'notes', duration: 600, scopeIds: ['growth'], note: 'TODO_NOTES' }),
    log('todo-other-activity', 18, 26, { categoryId: 'self', activityId: 'reading', linkedTodoId: 'book', duration: 900, scopeIds: ['health'], note: 'TODO_OTHER_ACTIVITY' }),
    log('duplicate-title', 11, 10, { linkedTodoId: 'other-book', scopeIds: ['health'], note: 'DUPLICATE_TODO' }),
    log('scope-no-todo', 14, 15, { scopeIds: ['growth'], note: 'NO_TODO' }),
    log('planned-todo', 20, 30, { linkedTodoId: 'book', scopeIds: ['growth'], isPlanned: true, note: 'PLANNED_TODO' }),
    log('out-of-period-todo', 9, 30, { linkedTodoId: 'book', scopeIds: ['growth'], startTime: new Date(2025, 9, 16, 9).getTime(), endTime: new Date(2025, 9, 16, 9, 30).getTime(), note: 'OUT_OF_PERIOD' })
  ];
  render(); await tick();
  const tagChip = Array.from(document.querySelectorAll<HTMLButtonElement>('main button')).find(item => item.textContent?.trim().endsWith('学习'))!;
  assert(tagChip, 'Missing tag exclusion chip');
  tagChip.click(); await tick();
  assert(!button('查看学习分类的当日记录'), 'Tag exclusion did not apply');
  const todoCategoryButton = button('查看阅读计划待办分类的当日记录');
  todoCategoryButton.querySelector<HTMLElement>('.h-1\\.5')!.click(); await tick();
  assert(dialog()!.querySelector('h2')?.textContent === '阅读计划' && logRows().length === 3 && dialog()!.textContent?.includes('1小时 16分钟'), 'Todo category did not preserve its own chart totals');
  assert(!/DUPLICATE_TODO|PLANNED_TODO|OUT_OF_PERIOD|NO_TODO/.test(dialog()!.textContent!), 'Todo category leaked unrelated records');
  assert(dialog()!.textContent?.includes('运动健身') && dialog()!.textContent?.includes('写作整理'), 'Mixed-category todo records lost their tag labels');
  await close();
  await open('查看阅读《瓦尔登湖》待办的当日记录');
  assert(logRows().length === 2 && dialog()!.textContent?.includes('56分钟') && !dialog()!.textContent?.includes('DUPLICATE_TODO'), 'Individual todo matched a duplicate title or lost another activity category');
  await capture('stats-todo-logs-mobile', 390, 844);
  await close();
  button('查看个人成长领域的当日记录').querySelector<HTMLElement>('.h-1\\.5')!.click(); await tick();
  assert(logRows().length === 3 && dialog()!.querySelector('header')!.textContent?.includes('45分钟'), 'Scope total did not use stored chart durations');
  assert(logRows()[0].textContent?.includes('20分钟'), 'Scope row duration differs from its chart');
  assert(!/TODO_OTHER_ACTIVITY|DUPLICATE_TODO|PLANNED_TODO|OUT_OF_PERIOD/.test(Array.from(logRows()).map(row => row.textContent).join('')), 'Scope selection leaked unmatched records');
  await close();
  await open('查看身心健康领域的当日记录');
  assert(logRows().length === 3 && dialog()!.querySelector('header')!.textContent?.includes('45分钟') && dialog()!.textContent?.includes('TODO_READING'), 'Multi-scope record was split, duplicated or omitted');
  await close();
  passed.push('todo/category/scope daily rows and bars, mixed tags, duplicate titles, independent tag exclusions and scope duration rules');

  for (const nextRange of ['week', 'month', 'year'] as const) {
    range = nextRange; render(); await tick();
    const periodLabel = { week: '本周', month: '本月', year: '本年' }[range];
    for (const target of [
      { label: `查看阅读计划待办分类的${periodLabel}记录`, count: 3, total: '1小时 16分钟', kind: 'todoCategory' },
      { label: `查看阅读《瓦尔登湖》待办的${periodLabel}记录`, count: 2, total: '56分钟', kind: 'todo' },
      { label: `查看个人成长领域的${periodLabel}记录`, count: 3, total: '45分钟', kind: 'scope' }
    ]) {
      await open(target.label);
      assert(logRows().length === 0 && dialog()!.querySelector('header')!.textContent?.includes(target.total), `${range} ${target.kind} initial summary differs from chart`);
      if (range === 'year') await expand('month:2026-10-01');
      if (range !== 'week') await expand('week:2026-10-12');
      await expand('day:2026-10-16');
      assert(logRows().length === target.count && periodButton('day:2026-10-16').textContent?.includes(target.total), `${range} ${target.kind} hierarchy lost its records or duration metric`);
      periodButton('day:2026-10-16').scrollIntoView({ block: 'start' });
      if (range === 'month' && target.kind === 'todoCategory') await capture('stats-todo-category-month-desktop', 1100, 820);
      if (range === 'year' && target.kind === 'todo') await capture('stats-todo-year-mobile', 360, 740);
      if (range === 'year' && target.kind === 'scope') {
        document.documentElement.dataset.themeMode = 'dark';
        await capture('stats-scope-year-dark', 390, 844);
        delete document.documentElement.dataset.themeMode;
      }
      assert(dialog()!.scrollWidth <= dialog()!.clientWidth, 'Related entity detail overflowed horizontally');
      await close();
    }
  }
  passed.push('todo categories, individual todos and scopes share week/month/year expansion and preserve every level total');

  range = 'year';
  const readNotes = new Set<number>();
  let firstNoteRead = '';
  logs = Array.from({ length: 100800 }, (_, index): Log => {
    const month = Math.floor(index / 8400);
    const day = Math.floor(index / 300) % 28 + 1;
    const startTime = new Date(2026, month, day, 0, (index % 300) * 2).getTime();
    return {
      id: `dense-${index}`, categoryId: 'study', activityId: 'reading', startTime,
      endTime: startTime + 60000, duration: 60,
      get note() { if (!firstNoteRead) firstNoteRead = new Error('First record payload access').stack || ''; readNotes.add(index); return `压力测试记录 ${index + 1}`; }
    };
  });
  render(); await tick();
  Array.from(document.querySelectorAll<HTMLButtonElement>('main button')).find(item => item.textContent?.trim().endsWith('学习'))!.click();
  await tick();
  const started = performance.now();
  await open('查看学习分类的本年记录');
  const initialMs = Math.round(performance.now() - started);
  assert(dialog()!.querySelectorAll('[data-stats-period]').length === 12 && logRows().length === 0, 'Large annual view rendered descendants eagerly');
  assert(readNotes.size === 0, 'Annual summaries read hidden log content: ' + firstNoteRead);
  await expand('month:2026-10-01');
  assert(dialog()!.querySelectorAll('[data-stats-period^="week:"]').length === 5 && readNotes.size === 0, 'Month expansion loaded log content');
  await expand('week:2026-10-12');
  assert(dialog()!.querySelectorAll('[data-stats-period^="day:"]').length === 7 && readNotes.size === 0, 'Week expansion loaded log content');
  const dayStarted = performance.now();
  await expand('day:2026-10-16');
  const dayMs = Math.round(performance.now() - dayStarted);
  assert(logRows().length === 50 && readNotes.size === 50, 'Day expansion did not cap its first record batch');
  const more = Array.from(dialog()!.querySelectorAll<HTMLButtonElement>('button')).find(item => item.textContent === '加载更多');
  assert(more, 'Record pagination control is missing');
  more!.click(); await tick();
  assert(logRows().length === 100 && readNotes.size === 100, 'Next record batch loaded unrelated or excess content');
  periodButton('day:2026-10-16').scrollIntoView({ block: 'start' });
  await capture('stats-large-year-paged-mobile', 390, 844);
  await expand('day:2026-10-16');
  assert(logRows().length === 0, 'Collapsed day retained mounted records');
  await expand('day:2026-10-16');
  assert(logRows().length === 50, 'Reopened day retained an unbounded previous page');
  await expand('month:2026-10-01');
  assert(dialog()!.querySelectorAll('[data-stats-period]').length === 12 && logRows().length === 0, 'Collapsed month retained mounted descendants');
  await close();
  passed.push('100,800 annual records: 12 initial summaries, untouched hidden payloads, one-level expansion, 50-row batches and collapse cleanup');
  window.__dailyStatsLogsResult = { passed, performance: { records: logs.length, initialMs, dayMs, initialMonths: 12, firstBatchRows: 50 } };
};
run().catch(error => { window.__dailyStatsLogsResult = { passed: [], error: String(error.stack || error) }; });
