/**
 * @file appAwarenessHarness.tsx
 * @input Real settings provider, settings view, initialization and workflow runtime hooks
 * @output Browser interaction and persistence checks with simulated Android APIs
 * @pos Renderer verification
 * @updated 2026-10-18: Checks off/on, remount, native synchronization and workflow cancellation.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsProvider, useSettings } from '../../contexts/SettingsContext';
import { AppAwarenessSettingsView } from '../AppAwarenessSettingsView';
import { useAppInitialization } from '../../hooks/useAppInitialization';
import { useAppAwarenessRuntime } from '../../hooks/useAppAwarenessRuntime';
import { appAwarenessService } from '../../services/appAwarenessService';
import AppUsage from '../../plugins/AppUsagePlugin';

const noop = () => {};
let settings: ReturnType<typeof useSettings>;
let nativeBindings: Record<string, string> = {};
let cancelCount = 0;
let overlays = 0;
AppUsage.syncAppAwarenessBindings = async ({ bindings }) => { nativeBindings = bindings; };
AppUsage.cancelAppAwarenessWorkflow = async () => { cancelCount++; };
AppUsage.showAppAwarenessOverlay = async () => { overlays++; };

function Screen() {
  settings = useSettings();
  useAppInitialization();
  useAppAwarenessRuntime({ handleStartActivity: () => 'session', handleStopActivity: noop, todos: [], scopes: [] });
  return <AppAwarenessSettingsView onBack={noop} categories={[]} scopes={[]} todos={[]} todoCategories={[]} />;
}

const delay = () => new Promise((resolve) => setTimeout(resolve, 90));
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const clickSwitch = async () => {
  const toggle = document.querySelector<HTMLButtonElement>('[role="switch"]');
  check(toggle?.textContent?.includes('启用应用感知'), 'Master switch must be first on the settings page');
  toggle!.click();
  await delay();
};
const detect = async () => {
  window.dispatchEvent(new CustomEvent('appAwarenessDetected', { detail: { packageName: 'app.on' } }));
  await delay();
};

async function run() {
  localStorage.clear();
  const template = { ...appAwarenessService.buildPresetTemplates()[0], id: 'workflow', steps: [
    { id: 'question', type: 'text_question' as const, title: '打开应用的目的', answerKey: 'purpose' }
  ] };
  appAwarenessService.saveTemplates([template, { ...template, id: 'disabled-template', enabled: false }]);
  appAwarenessService.saveBindings([
    { packageName: 'app.on', appName: '开启的应用', workflowTemplateId: 'workflow', enabled: true, updatedAt: 1 },
    { packageName: 'app.off', appName: '关闭的应用', workflowTemplateId: 'workflow', enabled: false, updatedAt: 1 }
  ]);
  let root = createRoot(document.getElementById('root')!);
  const mount = () => root.render(<SettingsProvider><Screen /></SettingsProvider>);
  mount();
  await delay();
  check(settings.appAwarenessEnabled && nativeBindings['app.on'] === 'workflow' && !nativeBindings['app.off'], 'Initial native binding states');
  await detect();
  check(settings.appAwarenessActiveRun?.status === 'running_step' && overlays > 0, 'Enabled detection starts a workflow');
  const bindingsSnapshot = JSON.stringify(settings.appAwarenessBindings);
  const templatesSnapshot = JSON.stringify(settings.appAwarenessTemplates);
  await clickSwitch();
  check(!settings.appAwarenessEnabled && Object.keys(nativeBindings).length === 0, 'Off clears effective native bindings');
  check(settings.appAwarenessActiveRun === null && cancelCount > 0, 'Off cancels unfinished workflow');
  await detect();
  check(settings.appAwarenessActiveRun === null, 'Off ignores queued detection');
  root.unmount();
  root = createRoot(document.getElementById('root')!);
  mount();
  await delay();
  check(!settings.appAwarenessEnabled && Object.keys(nativeBindings).length === 0, 'Off survives provider remount');
  check(document.querySelector('[role="switch"]')?.getAttribute('aria-checked') === 'false', 'UI reflects restored off state');
  await clickSwitch();
  check(nativeBindings['app.on'] === 'workflow' && !nativeBindings['app.off'], 'On restores only previously enabled apps');
  check(JSON.stringify(settings.appAwarenessBindings) === bindingsSnapshot, 'Individual app settings preserved');
  check(JSON.stringify(settings.appAwarenessTemplates) === templatesSnapshot, 'Template settings preserved');
  await clickSwitch();
  settings.setAppAwarenessBindings((bindings) => [...bindings, {
    packageName: 'app.new', appName: '新应用', workflowTemplateId: 'workflow', enabled: true, updatedAt: 2
  }]);
  await delay();
  check(Object.keys(nativeBindings).length === 0, 'Editing individual settings cannot bypass off');
  await clickSwitch();
  check(nativeBindings['app.new'] === 'workflow' && !nativeBindings['app.off'], 'On uses saved edits while preserving disabled apps');
  await detect();
  check(settings.appAwarenessActiveRun?.status === 'running_step', 'Re-enabled detection starts a workflow');
  settings.setAppAwarenessActiveRun((run) => run ? { ...run, status: 'timer_running', linkedSessionId: 'session' } : run);
  await delay();
  await clickSwitch();
  check(settings.appAwarenessActiveRun?.linkedSessionId === 'session', 'Off preserves already started activity timer');
  (window as any).__awarenessResult = { passed: true, checks: 15 };
}
void run().catch((error) => { (window as any).__awarenessResult = { error: String(error) }; });
