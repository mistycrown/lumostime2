/**
 * @file aiLogAttributesRendererHarness.tsx
 * @input Real AI log executor, applied-action renderer, and synthetic activity schemas
 * @output Offline renderer assertions and desktop/mobile screenshot checkpoints
 * @pos Test (AI log attributes renderer)
 * @updated 2026-10-06: Checks four attribute types, live edits, clearing, undo, and old actions.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import type { Category, Log } from '../../types';
import { assistantActionExecutor, type AppliedCreateLogAction } from '../../services/assistantActionExecutor';
import { renderAppliedChatAction } from '../ai-chat/AIBackfillChatAppliedActionRenderer';

declare global {
  interface Window {
    __aiLogAttributesResult?: { passed: string[]; error?: string };
    __aiLogAttributesCapture?: string | null;
  }
}

const passed: string[] = [];
const delay = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const host = document.getElementById('root')!;
const root = createRoot(host);
const categories: Category[] = [{ id: 'sport', name: '运动', icon: 'R', themeColor: '#675e50', activities: [{
  id: 'running', name: '跑步', icon: 'R', color: '#675e50', attributes: [
    { id: 'distance', name: '距离', type: 'number', unit: 'km', order: 0, createdAt: 1, updatedAt: 1 },
    { id: 'place', name: '地点', type: 'single', options: [{ id: 'park', label: '公园' }], order: 1, createdAt: 1, updatedAt: 1 },
    { id: 'equipment', name: '装备', type: 'multi', options: [{ id: 'watch', label: '手表' }, { id: 'phone', label: '手机' }], order: 2, createdAt: 1, updatedAt: 1 },
    { id: 'route', name: '路线', type: 'text', displayCondition: { attributeId: 'place', optionIds: ['park'] }, order: 3, createdAt: 1, updatedAt: 1 }
  ]
}] }];
const result = assistantActionExecutor.applyLogToolCalls({
  defaultDateKey: '2026-10-06', categories, logs: [], todos: [], scopes: [], todoCategories: [],
  autoApplyAutoLinkRules: false, autoLinkRules: []
}, [{ toolName: 'create_log', args: {
  date: '2026-10-06', startTime: '07:00', endTime: '08:00', description: '早上在公园沿湖跑了五公里，带了手表和手机。',
  categoryId: 'sport', activityId: 'running', attributeValues: [
    { attributeId: 'distance', value: 5 }, { attributeId: 'place', optionId: 'park' },
    { attributeId: 'equipment', optionIds: ['watch', 'phone'] }, { attributeId: 'route', value: '湖边' }
  ]
} }]);
const action = result.actions[0] as AppliedCreateLogAction;
let logs = result.nextLogs;
const noop = () => {};
const theme = {
  activeBorder: '#b1a18e', chipBg: '#f5f0e8', chipBorder: '#e1d6c9', dangerBg: '#fff', dangerBorder: '#b44', dangerText: '#b44',
  inputBg: '#fff', successBg: '#fff', successBorder: '#384', successText: '#384', textMuted: '#877765', textPrimary: '#342c24',
  textSecondary: '#675e50', undoneBg: '#fff', undoneBorder: '#aaa', undoneText: '#888'
};
const render = async (currentAction = action, currentLogs: Log[] = logs) => {
  root.render(<main className="mx-auto max-w-xl p-5">
    <h1 className="mb-6 text-xl">AI 补记结果</h1>
    {renderAppliedChatAction({
      action: currentAction, logs: currentLogs, categories, todos: [], todoCategories: [], theme, messageId: 'message',
      formatActionDate: () => '2026.10.06', formatTimeRange: () => '07:00–08:00',
      getActivityById: () => categories[0].activities[0], getActivityCategory: () => categories[0], getScopeNames: () => [],
      onOpenLogEditor: () => { logs = logs.map((log) => ({ ...log, attributeValues: [{ attributeId: 'distance', value: 6 }] })); void render(); },
      onUndoLogAction: () => { void render({ ...action, status: 'undone' }, []); },
      onOpenPrincipleEditor: noop, onOpenSelfBeliefEditor: noop, onOpenTodoDetail: noop, onUndoCreateSubtaskAction: noop,
      onUndoEditLogAction: noop, onUndoPlannedLogAction: noop, onUndoPrincipleAction: noop, onUndoSelfBeliefAction: noop,
      onUndoTodoAction: noop, onUndoUpdateTodoAction: noop
    })}
  </main>);
  await delay();
};
const capture = async (name: string) => {
  window.__aiLogAttributesCapture = name;
  for (let i = 0; window.__aiLogAttributesCapture && i < 100; i++) await delay();
  check(!window.__aiLogAttributesCapture, 'Screenshot was not captured');
};

async function run() {
  check(action.status === 'applied', 'Executor failed');
  await render();
  ['距离: 5 km', '地点: 公园', '装备: 手表、手机', '路线: 湖边'].forEach((label) => check(host.textContent?.includes(label), `Missing ${label}`));
  await capture('ai-log-attributes-desktop');
  await capture('ai-log-attributes-mobile');
  passed.push('Four attribute types and units render at desktop and mobile widths');

  document.querySelector<HTMLButtonElement>('button[title="编辑"]')!.click(); await delay(160);
  check(host.textContent?.includes('距离: 6 km') && !host.textContent?.includes('地点:'), 'Live edits did not update the result card');
  await render(action, logs.map((log) => ({ ...log, attributeValues: undefined })));
  check(!host.textContent?.includes('距离:'), 'Cleared live values incorrectly fell back to the snapshot');
  passed.push('Live edits and clearing replace snapshot values');

  await render();
  document.querySelector<HTMLButtonElement>('button[title="撤销"]')!.click(); await delay(160);
  check(host.textContent?.includes('距离: 5 km'), 'Undo lost the original attribute snapshot');
  check(document.querySelector<HTMLButtonElement>('button[title="编辑"]')?.disabled, 'Undone actions remained editable');
  passed.push('Undo keeps original attributes visible and disables editing');

  const { attributeValues: _unused, ...legacySnapshot } = action.snapshot;
  await render({ ...action, snapshot: legacySnapshot }, []);
  check(host.textContent?.includes('早上在公园') && !host.textContent?.includes('距离:'), 'Legacy action without attributes broke rendering');
  passed.push('Legacy actions without attributes still render');
  window.__aiLogAttributesResult = { passed };
}
run().catch((error) => { window.__aiLogAttributesResult = { passed, error: error.stack || String(error) }; });
