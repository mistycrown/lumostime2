/**
 * @file widgetScopeRendererHarness.tsx
 * @input Real timer-slot editor, preferences, rules and scope fixtures
 * @output Browser assertions for automatic and suggested scope association
 * @pos Test harness
 * @updated 2026-10-14: Covers preference toggles, existing scopes, suggestions, save and reopen.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { WidgetSlotEditorModal } from '../WidgetSlotEditorModal';

const categories = [{ id: 'cat', name: '标签分类', icon: 'C', activities: [
  { id: 'reading', name: '阅读', icon: 'R', color: '#78716c' },
  { id: 'exercise', name: '运动', icon: 'E', color: '#78716c' }
] }];
const scopes = [
  { id: 'work', name: '工作领域', icon: 'W', order: 0, isArchived: false, themeColor: '#78716c' },
  { id: 'study', name: '学习领域', icon: 'S', order: 1, isArchived: false, themeColor: '#78716c' },
  { id: 'manual', name: '手动领域', icon: 'M', order: 2, isArchived: false, themeColor: '#78716c' },
  { id: 'archived', name: '已归档领域', icon: 'A', order: 3, isArchived: true, themeColor: '#78716c' }
];
const rules = [
  { id: '1', activityId: 'reading', scopeId: 'work' },
  { id: '2', activityId: 'reading', scopeId: 'study' },
  { id: '3', activityId: 'reading', scopeId: 'archived' }
];
const root = createRoot(document.getElementById('root')!);
let saved: any;
const delay = () => new Promise((resolve) => setTimeout(resolve, 100));
const check = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const button = (label: string) => Array.from(document.querySelectorAll('button')).find((element) => element.textContent?.trim().endsWith(label))!;
const click = async (label: string) => { check(button(label), 'Missing button: ' + label); button(label).click(); await delay(); };
const blank = () => ({ slotIndex: 0, slotType: 'timer', categoryId: 'cat', activityId: null, linkedTodoId: null,
  scopeIds: null, checkTemplateId: null, checkItemId: null, shortcutAction: null, label: null,
  customIcon: null, iconMode: 'emoji', uiIcon: null, backgroundColor: null });
const render = async (autoApply: boolean, draft: any, extraRules = rules) => {
  saved = undefined;
  root.render(<WidgetSlotEditorModal isOpen draft={draft} categories={categories as any} scopes={scopes}
    todos={[]} todoCategories={[]} checkTemplates={[]} canUseUiIcon={false}
    autoLinkRules={extraRules} autoApplyAutoLinkRules={autoApply} onClose={() => {}} onSave={(value) => { saved = value; }} />);
  await delay();
};
const hasSuggestion = () => [...document.querySelectorAll('h3')].some((element) => element.textContent === '建议关联');
const selected = (id: string) => button(scopes.find((scope) => scope.id === id)!.name)?.className.includes('record-association-selected');
const save = async () => { await click('保存槽位'); return saved.scopeIds; };

declare global {
  interface Window {
    runWidgetScopeSmoke: () => Promise<string[]>;
  }
}

window.runWidgetScopeSmoke = async () => {
  await document.fonts.load('16px VerifiedChinese', '计时器建议关联工作学习领域保存槽位');
  check(document.fonts.check('16px VerifiedChinese'), 'Chinese font unavailable');
  const passed = [];
  await render(false, blank()); await click('阅读');
  check(hasSuggestion() && !selected('work') && !selected('study'), 'Disabled mode did not suggest without selecting');
  check(!document.body.textContent?.includes('已归档领域'), 'Archived scope leaked');
  check(await save() === null, 'Disabled mode auto-selected scopes');
  const suggestionButton = [...document.querySelectorAll('button')].filter((element) => element.textContent?.trim().endsWith('工作领域')).at(-1)!;
  suggestionButton.click(); await delay();
  check(JSON.stringify(await save()) === '["work"]', 'Suggestion did not persist');
  passed.push('Disabled preference shows active-scope suggestions; accepting one persists it');

  await render(true, blank()); await click('阅读');
  check(selected('work') && selected('study') && !hasSuggestion(), 'Enabled selection did not apply all rules');
  check(JSON.stringify(await save()) === '["work","study"]', 'Auto-association missing from saved draft');
  passed.push('Selecting a timer activity automatically associates all matching active scopes');

  await render(true, { ...blank(), activityId: 'reading', scopeIds: ['manual'] });
  check(JSON.stringify(await save()) === '["manual","work","study"]', 'Existing/manual scopes were not preserved on reopen');
  passed.push('Opening an existing timer keeps manual scopes and applies rules');

  const draft = { ...blank(), activityId: 'reading' };
  await render(false, draft); await click('手动领域');
  await render(true, draft);
  check(JSON.stringify(await save()) === '["manual","work","study"]', 'Preference change lost unsaved scopes');
  await render(false, blank()); await click('运动');
  check(!hasSuggestion() && await save() === null, 'Unmatched activity gained scopes');
  passed.push('Live preference changes preserve edits; unmatched activities remain unassociated');

  await render(false, { ...blank(), activityId: 'reading' });
  return passed;
};
