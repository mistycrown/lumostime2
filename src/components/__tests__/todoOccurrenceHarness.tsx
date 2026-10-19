/**
 * @file todoOccurrenceHarness.tsx
 * @updated 2026-10-18: Checks icon/date task rows, inline abandon/delete actions and concise detail controls.
 * @input Real todo views, quick actions, date picker and detail autosave
 * @output Isolated renderer interaction results and responsive screenshot checkpoints
 * @pos Test (Renderer)
 * @updated 2026-10-16: Verifies dated completion, undo, selection, day grouping and series independence.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TodoView } from '../../views/TodoView';
import { TodoDetailModal } from '../TodoDetailModal';
import { TodoQuickActionsModal } from '../TodoQuickActionsModal';
import { useTodoQuickActions } from '../../hooks/useTodoQuickActions';
import { formatDateKey, getWeekDates } from '../../utils/todoScheduleUtils';
import { getTodoForOccurrence, toggleTodoCompletion } from '../../utils/todoOccurrenceUtils';
import { runRegisteredHardwareBackHandler } from '../../utils/hardwareBackHandlerStack';
import type { TodoItem } from '../../types';

declare global {
  interface Window {
    __todoOccurrenceResult?: { passed: string[]; error?: string };
    __todoOccurrenceCapture?: { name: string; width: number; height: number };
    __todoOccurrenceCaptured?: boolean;
  }
}

const today = formatDateKey(new Date());
const yesterdayDate = new Date();
yesterdayDate.setDate(yesterdayDate.getDate() - 1);
const yesterday = formatDateKey(yesterdayDate);
const tomorrowDate = new Date();
tomorrowDate.setDate(tomorrowDate.getDate() + 1);
const tomorrow = formatDateKey(tomorrowDate);
const category = { id: 'books', name: '阅读', icon: 'book' };
const fixture: TodoItem[] = [
  { id: 'repeat', categoryId: category.id, title: '每日阅读', isCompleted: false, pin: true,
    recurrenceRule: { frequency: 'daily', startDate: '2026-01-01' } },
  { id: 'ordinary', categoryId: category.id, title: '整理书架', isCompleted: false, scheduledDate: today }
];
let tasks: TodoItem[] = [];
let actions: ReturnType<typeof useTodoQuickActions>;
let setMode: (mode: 'list' | 'quick' | 'detail') => void;
const noop = () => {};
const Probe = () => {
  const [todos, setTodos] = useState(fixture);
  const [mode, updateMode] = useState<'list' | 'quick' | 'detail'>('list');
  tasks = todos;
  setMode = updateMode;
  const save = (todo: TodoItem) => setTodos((previous) => previous.map((item) => item.id === todo.id ? todo : item));
  actions = useTodoQuickActions({ todos, onSaveTodo: save, onEditTodo: () => updateMode('detail'), onDeleteTodo: noop });
  if (mode === 'list') return <TodoView todos={todos} logs={[]} categories={[category]} activityCategories={[]} scopes={[]}
    onSaveTodo={save} onToggleTodo={(id, date) => setTodos((previous) => previous.map((todo) => todo.id === id ? toggleTodoCompletion(todo, date) : todo))}
    onEditTodo={() => updateMode('detail')} onAddTodo={noop} onStartFocus={noop} onDuplicateTodo={noop} onDeleteTodo={noop} />;
  if (mode === 'detail') return <TodoDetailModal initialTodo={todos[0]} todos={todos} currentCategory={category}
    todoCategories={[category]} categories={[]} scopes={[]} logs={[]} onSave={save} onClose={() => updateMode('list')} />;
  return <TodoQuickActionsModal isOpen={!!actions.quickActionTodo} todo={actions.quickActionTodo} todos={todos} todoCategories={[category]}
    occurrenceDateKey={actions.quickActionOccurrenceDateKey} openedAt={actions.quickActionOpenedAt}
    onComplete={actions.handleQuickActionComplete} onUndoComplete={actions.handleQuickActionUndoComplete}
    onToggleAbandon={actions.handleQuickActionToggleAbandon}
    onMoveDate={actions.handleQuickActionMove} onSelectDate={actions.handleQuickActionSelectDate} onClearDate={actions.handleQuickActionClearDate}
    onOpenDetail={actions.handleQuickActionOpenDetail} onTogglePin={actions.handleQuickActionTogglePin}
    onEditMaybeDates={actions.handleQuickActionMaybeDates} onSkipNextRecurrence={actions.handleQuickActionSkipNextRecurrence}
    onSkipToMaybeDate={actions.handleQuickActionSkipToMaybeDate} onMoveCategory={actions.handleQuickActionMoveCategory}
    onDelete={noop} onClose={actions.closeQuickActions} onForceClose={() => actions.closeQuickActions(true)} />;
};

const passed: string[] = [];
const delay = (ms = 70) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const until = async (predicate: () => unknown, label: string) => {
  for (let index = 0; index < 100; index++) {
    if (predicate()) return;
    await delay(30);
  }
  throw new Error('Timed out: ' + label);
};
const button = (label: string) => Array.from(document.querySelectorAll('button')).find((item) => (
  item.textContent?.trim() === label || item.title === label || item.getAttribute('aria-label') === label
));
const click = async (label: string) => {
  const target = button(label);
  check(target, 'Missing button: ' + label);
  target!.click();
  await delay();
};
const capture = async (name: string, width = 390, height = 844) => {
  window.__todoOccurrenceCaptured = false;
  window.__todoOccurrenceCapture = { name, width, height };
  await until(() => window.__todoOccurrenceCaptured, 'screenshot ' + name);
};
const open = async (dateKey?: string | null) => {
  setMode('quick');
  await delay();
  actions.openQuickActions(tasks[0], dateKey);
  await delay(350);
};

async function run() {
  localStorage.setItem('todoScreenMode', 'list');
  localStorage.setItem('todoShowCompleted', 'true');
  createRoot(document.getElementById('root')!).render(<Probe />);
  await until(() => document.body.textContent?.includes('每日阅读'), 'list');
  const title = Array.from(document.querySelectorAll('span')).find((item) => item.textContent === '每日阅读');
  check(title, 'Missing recurring row');
  title!.click();
  await delay(350);
  await capture('complete-current-mobile');
  await click('完成本次');
  await until(() => tasks[0].occurrenceCompletions?.[today], 'today completion');
  check(!tasks[0].isCompleted && !tasks[0].completedAt, 'Single completion ended the series');
  const completedSection = Array.from(document.querySelectorAll('section')).find((item) => item.textContent?.includes('已完成') && item.textContent?.includes('每日阅读'));
  check(completedSection, 'Completed occurrence did not move to the completed section');
  check(!getTodoForOccurrence(tasks[0], tomorrow).isCompleted, 'Next occurrence was completed');
  await capture('completed-day-mobile');
  await capture('completed-day-desktop', 1280, 900);
  passed.push('List completion moves one occurrence into completed, leaving tomorrow pending');

  await open(today);
  await click('撤销本次完成');
  check(!tasks[0].occurrenceCompletions?.[today], 'Undo retained today completion');
  await open(yesterday);
  await click('完成本次');
  check(tasks[0].occurrenceCompletions?.[yesterday] && !tasks[0].occurrenceCompletions?.[today], 'Backfill completed the wrong date');
  passed.push('Dated undo and backfill preserve other occurrences');

  await open(null);
  await click('完成本次');
  check(document.body.textContent?.includes('选择完成日期'), 'Undated weekly summary did not open date picker');
  check(runRegisteredHardwareBackHandler(), 'Date picker did not consume hardware back');
  await delay();
  check(!document.body.textContent?.includes('选择完成日期') && button('完成本次'), 'Hardware back closed the sheet');
  await click('完成本次');
  const dayButton = Array.from(document.querySelectorAll('button')).find((item) => item.textContent?.trim() === String(new Date().getDate()) && !item.disabled);
  check(dayButton, 'Missing selectable current date');
  dayButton!.click();
  await until(() => tasks[0].occurrenceCompletions?.[today], 'date picker completion');
  passed.push('Undated actions select an occurrence; picker back keeps the sheet open');

  for (const mode of ['week', 'bento', 'month']) {
    setMode('quick');
    await delay();
    localStorage.setItem('todoScreenMode', 'week');
    localStorage.setItem('todoScheduleViewMode', mode);
    setMode('list');
    await delay(150);
    let targetDate: string;
    let trigger: HTMLElement | undefined;
    if (mode === 'week') {
      const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-week-row-item]')).filter((item) => item.textContent?.includes('每日阅读'));
      const dates = getWeekDates(new Date()).map(formatDateKey);
      const index = dates.findIndex((date) => !tasks[0].occurrenceCompletions?.[date]);
      targetDate = dates[index];
      trigger = rows[index]?.querySelector<HTMLElement>('[data-week-badge-trigger]') || undefined;
    } else if (mode === 'bento') {
      const cell = Array.from(document.querySelectorAll<HTMLElement>('[data-bento-entry-date]')).find((item) => !tasks[0].occurrenceCompletions?.[item.dataset.bentoEntryDate!] && item.textContent?.includes('每日阅读'));
      targetDate = cell?.dataset.bentoEntryDate || '';
      trigger = cell?.querySelector<HTMLElement>('button[data-bento-week-swipe-ignore]') || undefined;
    } else {
      targetDate = today;
      const cell = document.querySelector<HTMLElement>(`[data-month-drop-date="${targetDate}"]`);
      check(cell, 'Missing month cell');
      cell!.click();
      await delay();
      trigger = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent?.trim() === '每日阅读');
    }
    check(trigger && targetDate, 'Missing ' + mode + ' dated action trigger');
    trigger!.click();
    await delay(350);
    const selectedDate = new Date(targetDate + 'T12:00:00');
    check(document.body.textContent?.includes(`${selectedDate.getMonth() + 1}/${selectedDate.getDate()}`), mode + ' lost occurrence date');
    if (tasks[0].occurrenceCompletions?.[targetDate]) {
      await click('撤销本次完成');
      check(!tasks[0].occurrenceCompletions?.[targetDate], mode + ' undid the wrong date');
    } else {
      await click('完成本次');
      check(tasks[0].occurrenceCompletions?.[targetDate], mode + ' completed the wrong date');
    }
    check(!tasks[0].isCompleted, mode + ' ended the series');
    passed.push(mode + ' view retains the clicked occurrence date');
  }

  // Restore today's completion for the detail autosave preservation check.
  await open(today);
  await click('完成本次');

  setMode('detail');
  await until(() => button('细节'), 'detail tabs');
  await click('细节');
  await until(() => button('结束循环'), 'series completion');
  await click('结束循环');
  await until(() => tasks[0].isCompleted, 'end series');
  check(tasks[0].occurrenceCompletions?.[today] && tasks[0].occurrenceCompletions?.[yesterday], 'Detail autosave lost occurrence history');
  await click('恢复循环');
  await until(() => !tasks[0].isCompleted, 'restore series');
  check(tasks[0].occurrenceCompletions?.[today], 'Restoring series cleared single completion');
  passed.push('Detail autosave, end series and restore preserve completion history');

  await click('放弃');
  await until(() => tasks[0].abandonedAt, 'detail abandonment autosave');
  check(!tasks[0].isCompleted && !tasks[0].completedAt, 'Abandonment retained completion');
  check(button('恢复') && document.body.textContent?.includes('放弃日期'), 'Missing abandonment detail state');
  await capture('abandoned-detail-mobile');
  await capture('abandoned-detail-desktop', 1280, 900);
  const abandonmentLabel = Array.from(document.querySelectorAll('label')).find((item) => item.textContent?.trim() === '放弃日期');
  const abandonmentDateButton = abandonmentLabel?.nextElementSibling as HTMLButtonElement | null;
  check(abandonmentDateButton, 'Missing abandonment date editor');
  abandonmentDateButton!.click();
  await delay();
  check(document.body.textContent?.includes('选择放弃日期'), 'Abandonment opened wrong picker');
  const editedDay = new Date().getDate() === 1 ? 2 : new Date().getDate() - 1;
  await click(String(editedDay));
  await until(() => new Date(tasks[0].abandonedAt!).getDate() === editedDay, 'edited abandonment date autosave');
  const datedLabel = Array.from(document.querySelectorAll('label')).find((item) => item.textContent?.trim() === '放弃日期');
  datedLabel?.scrollIntoView({ block: 'center' });
  await delay();
  await capture('abandoned-date-mobile');
  document.documentElement.dataset.themeMode = 'dark';
  await capture('abandoned-date-dark-mobile');
  document.documentElement.dataset.themeMode = 'light';
  await click('结束循环');
  await until(() => tasks[0].isCompleted && !tasks[0].abandonedAt, 'completion replaces abandonment');
  await click('放弃');
  await until(() => tasks[0].abandonedAt && !tasks[0].isCompleted && !tasks[0].completedAt, 'abandonment replaces completion');
  await click('恢复');
  await until(() => !tasks[0].abandonedAt && !tasks[0].isCompleted, 'detail restore');
  check(tasks[0].occurrenceCompletions?.[today], 'Abandonment lost historical completions');
  passed.push('Detail abandonment and completion replace each other, dates autosave and restore preserves history');

  await open(today);
  await click('放弃任务');
  await until(() => tasks[0].abandonedAt, 'quick abandonment');
  await open(today);
  check(document.querySelector('[aria-label^="放弃日期"] .lucide-ban') && button('恢复待办'), 'Quick sheet lost abandonment date/icon');
  check(!document.body.textContent?.includes('已放弃'), 'Quick sheet retained redundant status text');
  const restoreBounds = button('恢复待办')!.getBoundingClientRect();
  const deleteBounds = button('删除任务')!.getBoundingClientRect();
  check(Math.abs(restoreBounds.top - deleteBounds.top) < 1 && restoreBounds.right < deleteBounds.left, 'Abandon/restore and delete are not on the same row');
  check(!button('完成本次') && !button('设置安排提醒'), 'Abandoned quick sheet exposes active actions');
  await capture('abandoned-quick-mobile');
  await capture('abandoned-quick-desktop', 1280, 900);
  document.documentElement.dataset.themeMode = 'dark';
  await capture('abandoned-quick-dark-mobile');
  document.documentElement.dataset.themeMode = 'light';
  for (const rowMode of ['compact', 'loose']) {
    localStorage.setItem('todoScreenMode', 'list');
    localStorage.setItem('todoViewMode', rowMode);
    setMode('list');
    await delay(150);
    await click('阅读');
    check(document.querySelector('[aria-label^="放弃日期"] .lucide-ban'), rowMode + ' row lost abandonment icon/date');
    check(!document.body.textContent?.includes('已放弃'), rowMode + ' row has redundant status text');
    await capture('abandoned-list-' + rowMode + '-mobile');
    setMode('quick');
    await delay();
  }
  await open(today);
  await click('恢复待办');
  await until(() => !tasks[0].abandonedAt, 'quick restore');
  passed.push('Quick abandonment records a date, hides completion, and restores the task');
  window.__todoOccurrenceResult = { passed };
}

run().catch((error) => { window.__todoOccurrenceResult = { passed, error: String(error?.stack || error) }; });
