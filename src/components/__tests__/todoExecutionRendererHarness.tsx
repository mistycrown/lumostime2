/**
 * @file todoExecutionRendererHarness.tsx
 * @updated 2026-10-29: Checks icon switching, single-row scrolling and themed modal dropdowns without search.
 * @updated 2026-10-29: Checks category tabs, nested label sections and category-specific empty states.
 * @input Real todo view and picker with isolated example tasks/browser storage
 * @output Interactive desktop/mobile smoke checks and screenshot fixtures
 * @pos Test (Todo execution context)
 * @updated 2026-10-29: Verifies internal view switching and label/category lifecycle with real React events.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TodoView } from '../../views/TodoView';
import { TodoExecutionTagPicker } from '../TodoExecutionTagPicker';
import { PrivacyProvider } from '../../contexts/PrivacyContext';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { AIChatWindowProvider } from '../../contexts/AIChatWindowContext';
import { todoExecutionLibraryService as service } from '../../services/todoExecutionLibraryService';
import { DEFAULT_EXECUTION_LIBRARY, getExecutionCategoryId } from '../../utils/todoExecutionLibrary';
import { TODO_EXECUTION_TAG_PRESETS } from '../../utils/todoExecutionTags';
import { runRegisteredHardwareBackHandler } from '../../utils/hardwareBackHandlerStack';
import type { TodoItem } from '../../types';

const root = createRoot(document.getElementById('root')!);
const delay = () => new Promise((resolve) => setTimeout(resolve, 100));
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const tag = (id: string) => TODO_EXECUTION_TAG_PRESETS.find((item) => item.id === id)!;
const examples: TodoItem[] = [
  { id: 'mail', categoryId: 'work', title: '回复邮件', note: '保留其他任务字段', isCompleted: false, executionTags: [tag('energy:low'), tag('scene:computer')] },
  { id: 'proposal', categoryId: 'work', title: '写项目提案', isCompleted: false, executionTags: [tag('energy:high'), tag('scene:quiet'), tag('time:morning')] },
  { id: 'desk', categoryId: 'work', title: '整理桌面', isCompleted: false },
  { id: 'reading', categoryId: 'work', title: '读几页书', isCompleted: false, executionTags: [tag('energy:low'), tag('scene:home'), tag('time:evening')] }
];
let currentTodos = examples;

const App = () => {
  const [todos, setTodos] = useState(examples);
  const [editingId, setEditingId] = useState<string | null>(null);
  currentTodos = todos;
  const save = (todo: TodoItem) => setTodos((previous) => previous.map((item) => item.id === todo.id ? todo : item));
  const editing = todos.find((todo) => todo.id === editingId);
  return <SettingsProvider><PrivacyProvider><ToastProvider><AIChatWindowProvider>
    <div className="h-dvh"><TodoView todos={todos} logs={[]} categories={[{ id: 'work', name: '工作与生活', icon: '📓' }]}
      activityCategories={[]} scopes={[]} onToggleTodo={(id) => setTodos((previous) => previous.map((todo) => todo.id === id ? { ...todo, isCompleted: !todo.isCompleted } : todo))}
      onEditTodo={(todo) => setEditingId(todo.id)} onAddTodo={() => {}} onSaveTodo={save} onDeleteTodo={() => {}}
      onStartFocus={() => {}} onDuplicateTodo={() => {}} /></div>
    <button id="edit-mail" className="fixed bottom-5 left-20 bg-white px-4 py-2 text-sm" onClick={() => setEditingId('mail')}>编辑示例标签</button>
    {editing && <div className="fixed inset-0 z-[180] bg-black/15 p-6"><div className="mx-auto mt-12 max-w-lg rounded-2xl bg-white p-6">
      <button aria-label="关闭示例编辑" className="float-right" onClick={() => setEditingId(null)}>关闭</button>
      <h2 className="mb-6 text-lg font-semibold">{editing.title}</h2>
      <TodoExecutionTagPicker executionTags={editing.executionTags} todos={todos} currentTodoId={editing.id} onSaveTodo={save}
        onChange={(executionTags) => setTodos((previous) => previous.map((todo) => todo.id === editing.id ? { ...todo, executionTags } : todo))} />
    </div></div>}
  </AIChatWindowProvider></ToastProvider></PrivacyProvider></SettingsProvider>;
};

const button = (text: string) => Array.from((document.querySelector('[role="alertdialog"], [role="dialog"]') || document)
  .querySelectorAll<HTMLButtonElement>('button')).find((element) => element.textContent?.trim() === text);
const click = async (label: string) => {
  const target = document.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`) || button(label);
  check(target, `Button missing: ${label}`); target!.click(); await delay();
};
const input = async (label: string, value: string) => {
  const element = document.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
  check(element, `Input missing: ${label}`); element.focus();
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true })); await delay();
};
const select = async (label: string, value: string) => {
  await click(label);
  const list = document.querySelector<HTMLElement>('[role="listbox"]')!;
  check(list?.closest('[role="dialog"]'), 'Dropdown escaped modal focus scope');
  const bounds = list.getBoundingClientRect();
  check(bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight, 'Dropdown exceeds viewport');
  const option = list.querySelector<HTMLButtonElement>(`[data-select-value="${value}"]`);
  check(option, `Option missing: ${value}`); option!.click(); await delay();
};
const reset = async () => {
  root.render(null); await delay(); localStorage.clear(); service.save(DEFAULT_EXECUTION_LIBRARY);
  localStorage.setItem('todoScreenMode', 'list'); localStorage.setItem('todoViewMode', 'compact');
  root.render(<App />); await delay();
};

const run = async () => {
  await reset();
  await document.fonts.load('16px VerifiedChinese', '执行标签精力分类');
  check(document.fonts.check('16px VerifiedChinese'), 'Chinese font did not load');
  check(!document.querySelector('button[title="执行"]'), 'Unexpected execution sidebar tab');
  check(document.querySelector('[aria-label="切换到执行"]')?.textContent?.trim() === '', 'Mode switch should show only an icon');
  await click('切换到执行');
  const modeSwitch = document.querySelector<HTMLElement>('[aria-label="切换到排期"]')!;
  check(modeSwitch.textContent?.trim() === '' && getComputedStyle(modeSwitch).borderTopWidth === '0px', 'Mode switch has text or capsule border');
  const categoryBar = document.querySelector<HTMLElement>('[aria-label="执行标签分类"]')!;
  const categoryButtons = Array.from(categoryBar.querySelectorAll('button'));
  check(categoryButtons.every((item) => Math.abs(item.getBoundingClientRect().top - categoryButtons[0].getBoundingClientRect().top) < 1), 'Execution categories wrap to multiple rows');
  check(getComputedStyle(categoryBar).overflowX === 'auto' && getComputedStyle(categoryBar).scrollbarWidth === 'none', 'Category scrolling or hidden scrollbar missing');
  categoryBar.style.maxWidth = '160px';
  categoryBar.scrollLeft = categoryBar.scrollWidth;
  check(categoryBar.scrollLeft > 0, 'Execution categories cannot scroll horizontally');
  categoryBar.style.maxWidth = ''; categoryBar.scrollLeft = 0;
  check(document.querySelector('h1')?.textContent?.includes('执行'), 'Execution title missing');
  check(document.querySelector('[aria-label="执行分类：精力"]')?.getAttribute('aria-pressed') === 'true', 'Default energy category not selected');
  check(document.querySelectorAll('#todo-content section').length === 2, 'Energy label subgroups missing');
  check(document.getElementById('todo-content')!.innerText.includes('回复邮件'), 'Low-energy example missing');
  check(document.querySelector('[aria-label="执行分类：精力"]')?.textContent === '精力3', 'Category count is not distinct task count');
  await click('执行分类：场景');
  check(Array.from(document.querySelectorAll('#todo-content section > div:first-child')).map((heading) => heading.textContent?.trim()).join('|') === '家里1|电脑前1|需要安静1', 'Scene labels are not category subgroups');
  await click('执行分类：时段');
  check(document.querySelectorAll('#todo-content section').length === 2, 'Time category subgroups missing');
  await click('执行分类：自定义');
  check(document.getElementById('todo-content')!.innerText.includes('自定义暂无任务'), 'Empty category feedback missing');
  await click('执行分类：未设置');
  check(document.getElementById('todo-content')!.innerText.includes('整理桌面') && !document.getElementById('todo-content')!.innerText.includes('回复邮件'), 'Untagged category did not isolate untagged tasks');
  await click('执行分类：精力'); await click('切换到排期'); await click('切换到执行');
  check(localStorage.getItem('todoScheduleListMode') === 'execution', 'View switch not persisted');
  document.getElementById('edit-mail')!.click(); await delay(); await click('添加');
  check(document.querySelector('[role="dialog"]')?.parentElement?.parentElement === document.body, 'Picker is not a portal modal');
  check(!document.querySelector('[aria-label="搜索执行标签"]') && !document.querySelector('[role="dialog"] select'), 'Picker still has search or native selects');
  await click('低精力'); await click('低精力');
  const selectedStyle = getComputedStyle(button('低精力')!);
  check(selectedStyle.outlineStyle === 'none' || selectedStyle.outlineColor === 'rgba(0, 0, 0, 0)', `Selected execution tag has a visible outline: ${selectedStyle.outlineColor}`);
  await select('新标签分类', 'scene');
  await input('新执行标签名称', '通勤可做'); await click('添加新执行标签');
  const created = service.getSnapshot().tags.find((item) => item.name === '通勤可做')!;
  check(created && currentTodos[0].executionTags?.some((item) => item.id === created.id), 'New label not saved/selected');
  check(getExecutionCategoryId(created) === 'scene', 'Themed category selection did not apply');
  await click('完成'); await click('添加');
  check(button('通勤可做')?.getAttribute('aria-pressed') === 'true', 'Saved label unavailable on reopen');
  await click('通勤可做'); await click('通勤可做');
  await click('管理'); await input('新分类名称', '出行'); await click('添加分类');
  const category = service.getSnapshot().categories.find((item) => item.name === '出行')!;
  await select('移动通勤可做到分类', category.id);
  check(currentTodos[0].executionTags?.find((item) => item.id === created.id)?.categoryId === category.id, 'Move lost task association');
  await input('标签名称：通勤可做', '通勤阅读');
  (document.activeElement as HTMLElement).blur(); await delay();
  check(currentTodos[0].executionTags?.some((item) => item.id === created.id && item.name === '通勤阅读'), 'Label rename did not update task metadata');
  await input('分类名称：出行', '路上');
  (document.activeElement as HTMLElement).blur(); await delay();
  check(service.getSnapshot().categories.some((item) => item.name === '路上'), 'Category rename failed');
  await click('删除分类路上');
  check(document.querySelector('[role="alertdialog"]')?.textContent?.includes('保留任务关联'), 'Category delete impact missing');
  await click('删除');
  check(getExecutionCategoryId(service.getSnapshot().tags.find((item) => item.id === created.id)!) === 'custom', 'Category deletion did not migrate labels');
  await click('删除标签通勤阅读'); await click('取消');
  check(service.getSnapshot().tags.some((item) => item.id === created.id), 'Cancel removed label');
  await click('删除标签低精力');
  check(document.querySelector('[role="alertdialog"]')?.textContent?.includes('2 个任务'), 'Used-tag task count incorrect');
  check(runRegisteredHardwareBackHandler(), 'Confirmation did not register hardware back'); await delay();
  check(!document.querySelector('[role="alertdialog"]') && document.querySelector('[role="dialog"]'), 'Hardware back dismissed the wrong layer');
  await click('删除标签低精力');
  await click('解除关联并删除');
  check(currentTodos.every((todo) => !todo.executionTags?.some((item) => item.id === 'energy:low')), 'Used tag was not unlinked globally');
  check(currentTodos[0].note === examples[0].note, 'Unrelated task fields changed');
  await click('完成'); await click('关闭示例编辑');
  root.render(null); await delay(); root.render(<App />); await delay();
  document.getElementById('edit-mail')!.click(); await delay(); await click('添加');
  check(button('通勤阅读'), 'Unused custom label not reusable after remount');
  check(!button('低精力'), 'Deleted preset resurrected');
  check(document.documentElement.scrollWidth <= innerWidth, 'Page overflows viewport');
  const bounds = document.querySelector('[role="dialog"]')!.getBoundingClientRect();
  check(bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight, 'Modal exceeds viewport');
  const controls = document.querySelector('[role="dialog"]')!.querySelectorAll<HTMLElement>('button:not(:disabled), input, select');
  controls[controls.length - 1].focus();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  check(document.activeElement === controls[0], 'Tab focus escaped the modal');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); await delay();
  check(!document.querySelector('[role="dialog"]'), 'Escape failed to dismiss picker');
  await click('添加'); check(runRegisteredHardwareBackHandler(), 'Picker did not register hardware back'); await delay();
  check(!document.querySelector('[role="dialog"]'), 'Hardware back failed to dismiss picker');
  await reset(); await click('切换到执行');
  const mailTitle = Array.from(document.querySelectorAll<HTMLElement>('#todo-content *')).find((element) => element.textContent === '回复邮件');
  check(mailTitle, 'Example row missing'); mailTitle!.click(); await delay(); await delay(); await delay();
  const labelShortcut = document.querySelector<HTMLButtonElement>('[aria-label="执行标签"]')!;
  check(labelShortcut, 'Execution label shortcut missing');
  const pinButton = button('Pin')!;
  check(pinButton.parentElement === labelShortcut.parentElement?.parentElement, 'Label shortcut is not in the Pin row');
  await click('执行标签'); await click('家里');
  check(currentTodos[0].executionTags?.some((item) => item.id === 'scene:home'), 'Quick-action label selection not saved');
  check(runRegisteredHardwareBackHandler(), 'Nested picker back not handled'); await delay();
  check(!document.querySelector('[role="dialog"]') && document.body.textContent?.includes('Quick Actions'), 'Picker back dismissed shortcut sheet');
  await click('执行标签');
  check(button('家里')?.getAttribute('aria-pressed') === 'true', 'Reopening shortcut lost labels');
  await click('家里'); await click('完成'); await click('Pin');
  check(currentTodos[0].pin && !currentTodos[0].executionTags?.some((item) => item.id === 'scene:home'), 'Pin restored stale execution labels');
  check(currentTodos[0].executionTags?.some((item) => item.id === 'energy:low'), 'Pin lost existing execution labels');
  return ['Tasks switch and tag filters work', 'Custom labels persist and are reused after remount', 'Category create/rename/move/delete preserves task links', 'Deletion warning counts all affected tasks; cancel preserves links; confirm unlinks all', 'Modal fits viewport and deleted presets stay deleted', 'Pin-row shortcut edits labels immediately, preserves nested back behavior and keeps later Pin actions current'];
};

const prepare = async (mode = 'view') => {
  await reset(); await click('切换到执行');
  if (mode === 'quick') {
    Array.from(document.querySelectorAll<HTMLElement>('#todo-content *')).find((element) => element.textContent === '回复邮件')!.click();
    await delay(); await delay(); await delay();
    return;
  }
  if (mode !== 'view') {
    document.getElementById('edit-mail')!.click(); await delay(); await click('添加');
    if (mode === 'manage') await click('管理');
    if (mode === 'dropdown') await click('新标签分类');
  }
};

(window as any).__todoExecutionHarness = { run, prepare };
