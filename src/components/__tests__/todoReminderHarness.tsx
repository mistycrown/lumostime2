/**
 * @file todoReminderHarness.tsx
 * @input Real todo detail, reminder/date dialogs, DataProvider and isolated storage
 * @output Interaction, persistence, lifecycle and responsive screenshot checkpoints
 * @pos Renderer test harness; only system permissions and unrelated visual blocks are simulated
 * @updated 2026-10-18: Exercises calendar opt-in/denial/recovery, calendar-only saves and independent persistent toggles.
 * @updated 2026-10-18: Types four reminder digits through Chromium and verifies hour-to-minute focus and replacement.
 * @updated 2026-10-18: Exercises quick-card reminder visibility, active colors, independent saves and nested back navigation.
 * @updated 2026-10-18: Reproduces isolated todo-page stacking with sibling bottom navigation and checks overlay hit targets.
 * @updated 2026-10-18: Checks color-only active reminders have no background and fit their card header.
 * @updated 2026-10-17: Verifies independent dated reminders through the actual autosave path.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DataProvider, useData } from '../../contexts/DataContext';
import { TodoDetailModal } from '../TodoDetailModal';
import { TodoQuickActionsModal } from '../TodoQuickActionsModal';
import { useTodoQuickActions } from '../../hooks/useTodoQuickActions';
import { storageRepository } from '../../repositories/storageRepository';
import { dataRepository } from '../../repositories/dataRepository';
import { publishDesktopTodoSyncEvent } from '../../services/desktopWidgetService';
import { normalizeTodoScheduleFields } from '../../utils/todoDuplicateUtils';
import { formatDateKey } from '../../utils/todoScheduleUtils';
import { buildTodoReminderSnapshot } from '../../utils/todoReminderUtils';
import { runRegisteredHardwareBackHandler } from '../../utils/hardwareBackHandlerStack';
import { todoReminderService } from '../../services/todoReminderService';
import { useTodoReminderNavigation } from '../../hooks/useTodoReminderNavigation';
import type { TodoItem } from '../../types';

declare global {
  interface Window {
    __todoReminderResult?: { passed: string[]; error?: string };
    __todoReminderCapture?: { name: string; width: number; height: number };
    __todoReminderCaptured?: boolean;
    __todoReminderTypeDigits?: string;
    __todoReminderTyped?: string[];
  }
}

const category = { id: 'research', name: '研究与写作', icon: 'book' };
const future = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return formatDateKey(date); };
const task: TodoItem = { id: 'reminder-task', categoryId: category.id, title: '提交研究计划', isCompleted: false };
let todos: TodoItem[] = [];
let replace: (patch: Partial<TodoItem>) => void;
let ready = false;
let showQuickActions: () => void;
let showDetail: () => void;
let scheduleCalls = 0;
let persistenceError = '';
let allowed = true;
let exact = true;
let calendarSupported = false;
let calendarGranted = false;
let allowCalendarGrant = false;
let calendarRequests = 0;
let calendarError = '';
let pendingNavigation: { todoId?: string } = {};
let openedTodo: TodoItem | undefined;
let pauseNextSave: Promise<void> | undefined;
let saveBlocked = false;
const noop = () => {};
todoReminderService.getStatus = async () => ({ supported: true, notifications: allowed, background: true, exact,
  ...(calendarSupported ? { calendar: { supported: true, granted: calendarGranted, error: calendarError } } : {}) });
todoReminderService.requestNotifications = todoReminderService.getStatus;
todoReminderService.requestCalendar = async () => {
  calendarRequests++;
  calendarGranted = allowCalendarGrant;
  return todoReminderService.getStatus();
};
todoReminderService.consumeNavigation = async () => { const result = pendingNavigation; pendingNavigation = {}; return result; };
const saveTodos = dataRepository.saveTodos.bind(dataRepository);
dataRepository.saveTodos = async (saved) => {
  const pause = pauseNextSave;
  if (pause) {
    pauseNextSave = undefined;
    saveBlocked = true;
    await pause;
  }
  await saveTodos(saved);
};
const originalSync = todoReminderService.syncTodos.bind(todoReminderService);
todoReminderService.syncTodos = async (saved) => {
  const persisted = await storageRepository.getData<TodoItem[]>('todos');
  if (JSON.stringify(buildTodoReminderSnapshot(persisted || [])) !== JSON.stringify(buildTodoReminderSnapshot(saved))) {
    persistenceError = 'Scheduling ran before the matching todo snapshot was persisted';
  }
  scheduleCalls++;
  await originalSync(saved);
};

function Screen() {
  const data = useData();
  const [epoch, setEpoch] = useState(0);
  const [mode, setMode] = useState<'detail' | 'quick'>('detail');
  const save = (saved: TodoItem) => data.setTodos((previous) => previous.map((todo) => todo.id === saved.id ? normalizeTodoScheduleFields(saved) : todo));
  const actions = useTodoQuickActions({ todos: data.todos, onSaveTodo: save, onEditTodo: noop, onDeleteTodo: noop });
  showQuickActions = () => { actions.openQuickActions(data.todos[0]); setMode('quick'); };
  showDetail = () => { actions.closeQuickActions(true); setMode('detail'); setEpoch((value) => value + 1); };
  todos = data.todos;
  ready = data.isReady;
  useTodoReminderNavigation(data.todos, (todo) => { openedTodo = todo; });
  replace = (patch) => {
    data.setTodos((previous) => previous.map((todo) => todo.id === task.id ? normalizeTodoScheduleFields({ ...todo, ...patch }) : todo));
    setEpoch((value) => value + 1);
  };
  if (!data.isReady || !data.todos[0]) return null;
  if (mode === 'quick') return <><div style={{ isolation: 'isolate', position: 'relative' }} data-testid="isolated-todo-page">
    <TodoQuickActionsModal isOpen={Boolean(actions.quickActionTodo)} todo={actions.quickActionTodo}
    todos={data.todos} todoCategories={[category]} openedAt={actions.quickActionOpenedAt}
    onMoveDate={actions.handleQuickActionMove} onSelectDate={actions.handleQuickActionSelectDate} onClearDate={actions.handleQuickActionClearDate}
    onOpenDetail={showDetail} onComplete={actions.handleQuickActionComplete} onUndoComplete={actions.handleQuickActionUndoComplete}
    onTogglePin={actions.handleQuickActionTogglePin} onEditMaybeDates={actions.handleQuickActionMaybeDates}
    onSkipNextRecurrence={actions.handleQuickActionSkipNextRecurrence} onSkipToMaybeDate={actions.handleQuickActionSkipToMaybeDate}
    onMoveCategory={actions.handleQuickActionMoveCategory} onDelete={actions.handleQuickActionDelete}
    onUpdateReminder={actions.handleQuickActionUpdateReminder} onClose={actions.closeQuickActions}
    onForceClose={() => actions.closeQuickActions(true)} />
    </div><nav data-testid="bottom-navigation" className="fixed bottom-0 left-0 z-30 flex h-12 w-full items-center justify-around bg-white">
      <span>记录</span><span>待办</span><span>脉络</span><span>档案</span><span>索引</span>
    </nav></>;
  return <TodoDetailModal key={epoch} initialTodo={data.todos[0]} todos={data.todos} currentCategory={category}
    todoCategories={[category]} logs={[]} categories={[]} scopes={[]} displayMode="page" onClose={noop}
    onSave={save} />;
}

const passed: string[] = [];
const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const until = async (predicate: () => unknown | Promise<unknown>, label: string) => {
  for (let index = 0; index < 150; index++) { if (await predicate()) return; await delay(30); }
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
const setTime = async (value: string, expected = value) => {
  const hour = document.querySelector<HTMLInputElement>('#todo-reminder-hour')!;
  const minute = document.querySelector<HTMLInputElement>('#todo-reminder-minute')!;
  check(!document.querySelector('input[type="time"]'), 'Reminder must not expose a native time picker');
  check(hour.inputMode === 'numeric' && minute.inputMode === 'numeric', 'Both segments must request the numeric keyboard');
  hour.focus();
  await delay();
  check(hour.selectionStart === 0 && hour.selectionEnd === 2, 'Focusing a segment must select its existing value: '
    + JSON.stringify({ value: hour.value, start: hour.selectionStart, end: hour.selectionEnd, active: document.activeElement?.id, focused: document.hasFocus() }));
  window.__todoReminderTyped = undefined;
  window.__todoReminderTypeDigits = value.replace(':', '');
  await until(() => window.__todoReminderTyped, 'four-digit time entry');
  check(window.__todoReminderTyped?.[0] === 'todo-reminder-hour', 'The first hour digit must keep hour focus');
  check(window.__todoReminderTyped?.[1] === 'todo-reminder-minute', 'Two hour digits must advance to minutes');
  check(hour.value === expected.slice(0, 2) && minute.value === expected.slice(3), 'Four digits must replace the complete time within valid ranges');
};
const capture = async (name: string, width = 390, height = 844) => {
  window.__todoReminderCaptured = false;
  window.__todoReminderCapture = { name, width, height };
  await until(() => window.__todoReminderCaptured, 'screenshot ' + name);
};
const contrast = (element: Element) => {
  const style = getComputedStyle(element);
  const luminance = (color: string) => {
    const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((value) => {
      const normalized = value / (color.startsWith('color(') ? 1 : 255);
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = luminance(style.color);
  let backgroundElement: Element | null = element;
  while (backgroundElement.parentElement && getComputedStyle(backgroundElement).backgroundColor === 'rgba(0, 0, 0, 0)') {
    backgroundElement = backgroundElement.parentElement;
  }
  const b = luminance(getComputedStyle(backgroundElement).backgroundColor);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
const persisted = async () => (await storageRepository.getData<TodoItem[]>('todos'))?.[0];

async function run() {
  await storageRepository.setBatch([
    { namespace: 'data', key: 'logs', value: [] }, { namespace: 'data', key: 'todos', value: [task] },
    { namespace: 'data', key: 'todoCategories', value: [category] },
    { namespace: 'meta', key: 'core-data-migration-v2', value: true }
  ]);
  createRoot(document.getElementById('root')!).render(<DataProvider><Screen /></DataProvider>);
  await until(() => ready && button('细节'), 'detail hydration');
  await click('细节');
  check(!button('设置安排提醒') && !button('设置截止提醒'), 'Undated tasks must not show reminder actions');
  replace({ scheduledDate: future(3), deadlineDate: future(5) });
  await delay();
  await click('细节');
  check(button('设置安排提醒') && button('设置截止提醒'), 'Each selected date needs its own reminder action');
  await click('设置安排提醒');
  check(!document.querySelector('[aria-label="同步系统日历"]'), 'Old native plugins must not display unsupported calendar actions');
  await click('提前 1 天');
  await setTime('99:99', '23:59');
  await setTime('00:00');
  await setTime('08:45');
  const minute = document.querySelector<HTMLInputElement>('#todo-reminder-minute')!;
  minute.blur();
  minute.focus();
  await delay();
  check(minute.selectionStart === 0 && minute.selectionEnd === 2, 'Focusing minutes must select its existing value');
  passed.push('Four-digit typing, hour-to-minute advance, leading zeros, range limits and segment replacement');
  await capture('todo-reminder-mobile');
  await click('保存提醒');
  await until(async () => (await persisted())?.reminders?.scheduledDate?.time === '08:45', 'scheduled reminder persistence');
  check(todos[0].reminders?.scheduledDate?.daysBefore === 1, 'Offset must be saved');
  check(!todos[0].reminders?.deadlineDate, 'Setting arrange reminder must not create a deadline reminder');
  passed.push('Dated entry visibility, modal editing and independent arrange reminder persistence');

  await click('设置截止提醒');
  await setTime('18:30');
  await click('保存提醒');
  await until(async () => (await persisted())?.reminders?.deadlineDate?.time === '18:30', 'deadline reminder persistence');
  check(todos[0].reminders?.scheduledDate?.time === '08:45', 'Deadline edits must preserve arrange reminder');
  await click('编辑截止提醒');
  await click('选择提醒日期');
  check(runRegisteredHardwareBackHandler(), 'Date picker must consume hardware back');
  await delay();
  check(document.querySelector('[role="dialog"]'), 'Date picker back must keep reminder dialog open');
  check(!document.body.textContent?.includes('选择提醒日期'), 'Date picker must close first');
  check(runRegisteredHardwareBackHandler(), 'Reminder dialog must consume hardware back');
  await delay();
  check(!document.querySelector('[role="dialog"]') && button('编辑截止提醒'), 'Reminder back must keep todo detail open');
  passed.push('Separate deadline reminder; nested calendar and reminder back navigation');

  await click('编辑安排提醒');
  check((document.querySelector('#todo-reminder-hour') as HTMLInputElement).value === '08'
    && (document.querySelector('#todo-reminder-minute') as HTMLInputElement).value === '45', 'Reopened dialog must preserve selected time');
  document.documentElement.dataset.themeMode = 'dark';
  await capture('todo-reminder-dark');
  check(contrast(document.querySelector('.todo-reminder-save')!) >= 4.5, 'Dark save action must have readable text contrast');
  check(contrast(document.querySelector('.todo-reminder-choice[aria-pressed="true"]')!) >= 4.5, 'Dark selected choice must have readable contrast');
  document.documentElement.dataset.themeMode = 'light';
  await capture('todo-reminder-desktop', 1100, 820);
  await capture('todo-reminder-small', 320, 640);
  check(document.documentElement.scrollWidth <= window.innerWidth, 'Small-screen dialog must not overflow horizontally');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await delay();
  button('编辑安排提醒')!.scrollIntoView({ block: 'center' });
  await capture('todo-reminder-date-actions');
  check(document.documentElement.scrollWidth <= window.innerWidth, 'Date action rows must fit mobile width');
  passed.push('Saved-time reopening, Escape and mobile/dark/desktop/small-screen layouts');

  replace({ scheduledDate: future(8) });
  await delay();
  await click('细节');
  await click('编辑安排提醒');
  check(button('选择提醒日期')?.textContent?.includes(future(7).replaceAll('-', '.')), 'Reminder must move with the arranged date');
  await click('不提醒');
  await until(async () => !(await persisted())?.reminders?.scheduledDate, 'turn off arrange reminder');
  check(todos[0].reminders?.deadlineDate, 'Turning off one source must preserve the other');
  replace({ deadlineDate: undefined });
  await delay();
  await click('细节');
  await until(async () => !(await persisted())?.reminders, 'date clear cancellation');
  check(!button('设置截止提醒'), 'Cleared date must remove its reminder button');
  passed.push('Relative rescheduling and independent reminder/date clearing');

  replace({ scheduledDate: future(3), reminders: undefined });
  await delay();
  await click('细节');
  check(!todos[0].reminders?.scheduledDate, 'Permission test must start without an existing arrange reminder');
  await click('设置安排提醒');
  allowed = false;
  await click('保存提醒');
  check(document.querySelector('[role="alert"]')?.textContent?.includes('开启通知'), 'Permission denial must keep the dialog open with feedback');
  check(!todos[0].reminders?.scheduledDate, 'Permission denial must not silently enable a reminder: ' + JSON.stringify(todos[0]));
  allowed = true;
  exact = false;
  await click('保存提醒');
  await until(async () => Boolean((await persisted())?.reminders?.scheduledDate), 'save after notification permission recovery');
  await click('编辑安排提醒');
  check(document.body.textContent?.includes('提醒可能延迟'), 'Missing exact-alarm permission must be visible');
  await click('关闭提醒设置');
  let releaseSave!: () => void;
  pauseNextSave = new Promise<void>((resolve) => { releaseSave = resolve; });
  replace({ scheduledDate: future(10) });
  await until(() => saveBlocked, 'delayed first save');
  replace({ scheduledDate: future(11), reminders: undefined });
  publishDesktopTodoSyncEvent();
  await delay();
  releaseSave();
  await until(async () => (await persisted())?.scheduledDate === future(11) && !(await persisted())?.reminders, 'latest cancellation after delayed writes');
  await delay(300);
  check(todos[0].scheduledDate === future(11) && !todos[0].reminders, 'A stale sync broadcast must never resurrect the cancelled reminder');
  passed.push('Delayed saves and self-sync broadcasts preserve the latest reminder cancellation');
  replace({ scheduledDate: future(-2), reminders: undefined });
  await delay();
  await click('细节');
  await click('设置安排提醒');
  await click('保存提醒');
  check(document.querySelector('[role="alert"]')?.textContent?.includes('未来'), 'Expired reminders must be rejected');
  await click('关闭提醒设置');
  replace({ isCompleted: true });
  await delay();
  await click('细节');
  check(!button('设置安排提醒'), 'Completed todos must hide reminder controls');
  pendingNavigation = { todoId: task.id };
  window.dispatchEvent(new Event('focus'));
  await until(() => openedTodo?.id === task.id, 'notification navigation');
  check(openedTodo?.isCompleted === true, 'Notification navigation must use the latest todo rather than an old snapshot');
  passed.push('Notification denial/recovery, approximate-mode feedback, expired-time rejection, completion cancellation and current-todo navigation');

  exact = true;
  replace({ isCompleted: false, completedAt: undefined, scheduledDate: future(3), deadlineDate: future(5), reminders: undefined });
  await delay();
  showQuickActions();
  await until(() => button('设置安排提醒') && button('设置截止提醒'), 'quick-card reminder controls');
  const sheetBackdrop = button('安排到')!.closest('.fixed')!;
  check(sheetBackdrop.parentElement === document.body, 'Quick actions must escape the isolated todo-page stacking context');
  check(sheetBackdrop.contains(document.elementFromPoint(innerWidth / 2, innerHeight - 4)), 'Quick-actions backdrop must intercept navigation taps');
  check(!document.querySelector('button button'), 'Reminder bells must be siblings of the date-header buttons');
  await click('安排到');
  check(document.body.textContent?.includes('选择安排日期'), 'Date header must keep opening its own date picker');
  runRegisteredHardwareBackHandler();
  await delay();
  await click('设置安排提醒');
  const dialog = document.querySelector('#todo-reminder-title')!.closest('[role="dialog"]')!;
  const rect = dialog.getBoundingClientRect();
  check(dialog.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)), 'Reminder dialog must sit above the quick-actions sheet');
  await setTime('09:15');
  await click('保存提醒');
  await until(async () => (await persisted())?.reminders?.scheduledDate?.time === '09:15', 'quick arrange reminder persistence');
  check(button('编辑安排提醒')?.dataset.active === 'true' && button('设置截止提醒')?.dataset.active === 'false', 'Only the configured quick-card bell must be active');
  const activeBell = button('编辑安排提醒')!;
  const inactiveBell = button('设置截止提醒')!;
  const bellRect = activeBell.getBoundingClientRect();
  const headerRect = activeBell.parentElement!.getBoundingClientRect();
  check(getComputedStyle(activeBell).backgroundColor === 'rgba(0, 0, 0, 0)', 'Active reminder must not have a filled circular background');
  check(getComputedStyle(activeBell).color !== getComputedStyle(inactiveBell).color, 'Active reminder must change icon color');
  check(bellRect.top >= headerRect.top && bellRect.bottom <= headerRect.bottom && bellRect.right <= headerRect.right, 'Reminder button must fit inside its card header');
  check(button('安排到') && !document.querySelector('#todo-reminder-title'), 'Saving must return to the same quick-actions sheet');
  await capture('todo-reminder-quick-light');
  check(contrast(button('编辑安排提醒')!) >= 4.5, 'Active quick reminder must be readable in light mode');
  document.documentElement.dataset.themeMode = 'dark';
  await capture('todo-reminder-quick-dark');
  check(getComputedStyle(activeBell).backgroundColor === 'rgba(0, 0, 0, 0)', 'Dark active reminder must keep a transparent background');
  check(getComputedStyle(activeBell).color !== getComputedStyle(inactiveBell).color, 'Dark active reminder must change icon color');
  check(contrast(button('编辑安排提醒')!) >= 4.5, 'Active quick reminder must be readable in dark mode');
  document.documentElement.dataset.themeMode = 'light';
  await click('设置截止提醒');
  await setTime('18:10');
  await click('保存提醒');
  await until(async () => (await persisted())?.reminders?.deadlineDate?.time === '18:10', 'quick deadline reminder persistence');
  check(todos[0].reminders?.scheduledDate?.time === '09:15', 'Quick deadline reminder edits must preserve the arrange reminder');
  await click('编辑安排提醒');
  await click('不提醒');
  await until(async () => !(await persisted())?.reminders?.scheduledDate, 'quick arrange reminder cancellation');
  check(button('设置安排提醒')?.dataset.active === 'false' && button('编辑截止提醒')?.dataset.active === 'true', 'Turning off one bell must preserve the other bell color');
  await click('设置安排提醒');
  await click('选择提醒日期');
  replace({ title: todos[0].title }); // Force parent handlers to re-register while the nested editor stays open.
  await delay();
  check(runRegisteredHardwareBackHandler(), 'Nested quick reminder calendar must consume back');
  await delay();
  check(document.querySelector('#todo-reminder-title') && !document.body.textContent?.includes('选择提醒日期'), 'First back must only close the reminder calendar');
  check(runRegisteredHardwareBackHandler(), 'Quick reminder editor must consume back');
  await delay();
  check(button('安排到') && !document.querySelector('#todo-reminder-title'), 'Second back must preserve the quick-actions sheet');
  await click('清除安排日期');
  await until(async () => !(await persisted())?.scheduledDate, 'quick arranged date clearing');
  showQuickActions();
  await delay();
  check(!button('设置安排提醒') && button('编辑截止提醒'), 'Cleared source date must hide only its own quick-card bell');
  passed.push('Quick-card reminder visibility, independent save/cancel, active light/dark colors, topmost dialog and nested-back isolation');

  calendarSupported = true;
  allowed = false;
  replace({ scheduledDate: future(3), deadlineDate: future(5), reminders: undefined });
  showDetail();
  await delay();
  await click('细节');
  await click('设置安排提醒');
  const calendarSwitch = () => document.querySelector<HTMLInputElement>('[aria-label="同步系统日历"]')!;
  check(calendarSwitch() && !calendarSwitch().checked && calendarRequests === 0, 'Calendar sync defaults off and never requests permission on load');
  calendarSwitch().click();
  await delay();
  check(!calendarSwitch().checked && calendarRequests === 1, 'Calendar permission denial must not enable sync');
  check(document.querySelector('[role="alert"]')?.textContent?.includes('日历权限'), 'Calendar permission denial must have feedback');
  allowCalendarGrant = true;
  calendarSwitch().click();
  await delay();
  check(calendarSwitch().checked && calendarRequests === 2, 'Explicit retry can enable authorized calendar sync');
  await capture('todo-reminder-calendar-light', 390, 844);
  document.documentElement.dataset.themeMode = 'dark';
  await capture('todo-reminder-calendar-dark');
  check(contrast(calendarSwitch().closest('label')!) >= 4.5, 'Dark calendar toggle label must be readable');
  document.documentElement.dataset.themeMode = 'light';
  await click('保存提醒');
  await until(async () => (await persisted())?.reminders?.scheduledDate?.calendarSync, 'calendar-only reminder persistence');
  check(!allowed, 'Calendar reminder can save independently of app notification permission');
  await click('编辑安排提醒');
  check(calendarSwitch().checked && calendarRequests === 2, 'Reopening must preserve calendar opt-in without asking again');
  calendarGranted = false;
  window.dispatchEvent(new Event('focus'));
  await delay();
  await click('保存提醒');
  check(document.querySelector('[role="alert"]')?.textContent?.includes('日历权限'), 'Revoked permission must block an unprotected calendar save');
  check(document.querySelector('#todo-reminder-title'), 'Permission revocation must keep the editor open');
  calendarGranted = true;
  allowed = true;
  window.dispatchEvent(new Event('focus'));
  await delay();
  await click('保存提醒');
  await click('设置截止提醒');
  check(!calendarSwitch().checked, 'Calendar sync is independent for arrange and deadline reminders');
  await click('保存提醒');
  await until(async () => Boolean((await persisted())?.reminders?.deadlineDate), 'deadline without calendar sync');
  check((await persisted())?.reminders?.scheduledDate?.calendarSync, 'Saving the other date must preserve calendar sync');
  await click('编辑安排提醒');
  calendarError = '系统日历同步失败，请检查日历权限后重新打开应用';
  window.dispatchEvent(new Event('focus'));
  await delay();
  check(document.querySelector('[role="status"]')?.textContent === calendarError, 'Calendar sync errors must be visible independently');
  calendarError = '';
  window.dispatchEvent(new Event('focus'));
  await delay();
  calendarSwitch().click();
  await delay();
  await click('保存提醒');
  await until(async () => !(await persisted())?.reminders?.scheduledDate?.calendarSync, 'disabling calendar sync');
  check((await persisted())?.reminders?.scheduledDate?.time && (await persisted())?.reminders?.deadlineDate,
    'Disabling calendar sync must preserve local reminders on both dates');
  check(!buildTodoReminderSnapshot([(await persisted())!]).some((entry) => entry.calendarSync), 'Disabled calendar sync must reach reconciliation snapshots');
  passed.push('Calendar default-off, denied/retried permission, calendar-only saving, revocation recovery, error display, independent sources and disabling sync');
  check(!persistenceError, persistenceError);
  check(scheduleCalls > 5, 'Committed writes must reconcile reminders');
  window.__todoReminderResult = { passed };
}

void run().catch((error) => { window.__todoReminderResult = { passed, error: error instanceof Error ? error.stack : String(error) }; });
