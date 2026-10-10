/**
 * @file personalDictionaryRendererHarness.tsx
 * @updated 2026-10-10: Covers hidden node words, aliases and live rename/removal with real providers.
 * @input Real dictionary settings, note editor, statistics and isolated browser storage
 * @output Browser interaction checks and desktop/mobile screenshot fixtures
 * @pos Test (Personal Dictionary Renderer)
 * @updated 2026-10-09: Covers batch entry, search, removal, persistence and live consumer restores.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PersonalDictionarySettingsView } from '../../views/settings/PersonalDictionarySettingsView';
import { NoteAutocompleteTextarea } from '../NoteAutocompleteTextarea';
import { ActivityAttributeStatistics } from '../ActivityAttributeStatistics';
import { WordCloudSettingsEditor } from '../WordCloudSettingsEditor';
import { personalDictionaryService } from '../../services/personalDictionaryService';
import { preferencesBackupService } from '../../services/preferencesBackupService';
import { SETTINGS_KEYS } from '../../constants/storageKeys';
import { DataProvider, useData } from '../../contexts/DataContext';
import { NodeProvider, useNodes } from '../../contexts/NodeContext';
import { dataRepository } from '../../repositories/dataRepository';
import type { Activity, Log } from '../../types';

const history: Log[] = [1, 2].map((id) => ({ id: String(id), note: '文学 美食广场', categoryId: 'study', activityId: 'writing',
  startTime: Date.now(), endTime: Date.now(), duration: 1 }));
const activity: Activity = { id: 'writing', name: '写作', icon: '书', color: '#78716c', statisticCards: [
  { id: 'notes', source: { type: 'note' }, chartType: 'textCloud', range: 'all', metric: 'count', order: 0 }
] };
const root = createRoot(document.getElementById('root')!);
const delay = () => new Promise((resolve) => setTimeout(resolve, 90));
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
let backCount = 0;
const App = () => {
  const [settings, setSettings] = useState(true);
  const [note, setNote] = useState('');
  return <>
    <main className="mx-auto max-w-3xl space-y-8 px-7 py-8">
      <button id="open-dictionary" onClick={() => setSettings(true)} className="text-sm text-stone-700">个人词典</button>
      <NoteAutocompleteTextarea aria-label="测试备注" value={note} onValueChange={setNote} history={history} activityId="writing"
        className="h-24 w-full rounded border border-stone-200 bg-white p-4 text-sm outline-none" />
      <div data-cloud><ActivityAttributeStatistics activity={activity} logs={history} /></div>
      <div data-word-rules><WordCloudSettingsEditor settings={{ mergeWords: [], stopWords: [] }} values={history.map((log) => log.note!)} onChange={() => {}} /></div>
    </main>
    {settings && <PersonalDictionarySettingsView onBack={() => { backCount += 1; setSettings(false); }} />}
  </>;
};
const enter = async (label: string, value: string) => {
  const element = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[aria-label="${label}"]`)!;
  element.focus();
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
  if (element instanceof HTMLTextAreaElement) element.setSelectionRange(value.length, value.length);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('select', { bubbles: true }));
  await delay();
};
const click = async (label: string) => {
  document.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!.click(); await delay();
};
const ghost = () => document.querySelector('[data-note-completion-suffix]')?.textContent;
const cloudHasPhrase = () => [...document.querySelectorAll('[data-cloud] [title="2 次"]')].some((element) => element.textContent === '美食广场');
const run = async () => {
  backCount = 0;
  const passed: string[] = [];
  await document.fonts.load('16px VerifiedChinese', '个人词典科研项目美食广场');
  check(document.fonts.check('16px VerifiedChinese'), 'Verified Chinese font did not load');
  personalDictionaryService.setAll([]);
  root.render(<App />); await delay();
  check(document.body.innerText.includes('暂无词条'), 'Empty dictionary state missing');
  await enter('添加词条', ' 文献管理，美食广场\nTypeScript\nC++\nNew York\ntypescript');
  document.querySelector('[aria-label="添加词条"]')!.closest('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await delay();
  check(personalDictionaryService.getAll().length === 5, 'Batch entry did not deduplicate words');
  check(document.querySelector('h1')?.textContent === '个人词典', 'Chinese heading corrupted');
  await enter('添加词条', '文献管理');
  document.querySelector('[aria-label="添加词条"]')!.closest('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await delay();
  check(document.querySelector('[role="status"]')?.textContent === '词条已存在', 'Duplicate feedback missing');
  await enter('添加词条', '');
  await enter('搜索词条', 'types');
  check(document.querySelectorAll('li').length === 1 && document.querySelector('li')?.textContent?.includes('TypeScript'), 'Dictionary search lost casing');
  await click('清除搜索');
  passed.push('Batch entry, case-insensitive deduplication, original spelling and search work');
  await click('返回设置');
  check(backCount === 1 && !document.querySelector('h1'), 'Back navigation failed');
  check(cloudHasPhrase(), 'Real note cloud split the dictionary phrase');
  check(document.querySelector('[data-word-rules]')?.textContent?.includes('美食广场'), 'High-frequency picker split dictionary phrase');
  await enter('测试备注', '文');
  check(ghost() === '献管理', 'Personal term did not beat historical activity match');
  const input = document.querySelector<HTMLTextAreaElement>('[aria-label="测试备注"]')!;
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })); await delay();
  check(input.value === '文献管理', 'Dictionary suggestion did not accept');
  const backup = preferencesBackupService.buildBackupPayload();
  preferencesBackupService.applyBackupPayload({ storage: { [SETTINGS_KEYS.PERSONAL_DICTIONARY]: '[]' } }); await delay();
  check(!cloudHasPhrase(), 'Mounted cloud retained removed dictionary phrase');
  await enter('测试备注', '文'); check(ghost() === '学', 'Historical completion did not return after dictionary removal');
  preferencesBackupService.applyBackupPayload(backup); await delay();
  check(ghost() === '献管理' && cloudHasPhrase(), 'Restore did not update mounted consumers');
  passed.push('Dictionary terms win completion and remain whole in actual clouds; removal and restore refresh mounted views');
  document.getElementById('open-dictionary')!.click(); await delay();
  await click('删除词条：C++');
  check(!personalDictionaryService.getAll().includes('C++'), 'Word removal was not saved');
  root.render(null); await delay(); root.render(<App />); await delay();
  check(document.querySelectorAll('li').length === 4, 'Remount did not retain saved dictionary');
  passed.push('Removal persists and reopening retains saved dictionary');
  return passed;
};
const prepare = async () => {
  personalDictionaryService.setAll(['科研项目复盘', '美食广场', 'TypeScript', 'C++', 'New York', '个人知识管理']);
  root.render(null); await delay(); root.render(<App />); await delay();
  check(document.documentElement.scrollWidth <= window.innerWidth, 'Dictionary page overflows viewport');
};
let dataState: ReturnType<typeof useData>;
let nodeState: ReturnType<typeof useNodes>;
const NodeProbe = () => {
  dataState = useData();
  nodeState = useNodes();
  return null;
};
const runNodes = async () => {
  root.render(null); await delay();
  await dataRepository.saveLogs(history);
  await dataRepository.saveNodes([{ id: 'node', name: '美食广场', aliases: ['未来城市漫游'], description: '', createdAt: 1, updatedAt: 1 }]);
  personalDictionaryService.setAll(['手动词条']);
  root.render(<DataProvider><NodeProvider><NodeProbe /><App /></NodeProvider></DataProvider>);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    await delay();
    if (dataState?.isReady && nodeState?.nodes.some((node) => node.id === 'node')) break;
  }
  check(dataState?.isReady && nodeState?.nodes.some((node) => node.id === 'node'), 'Node provider did not hydrate');
  check(document.querySelectorAll('li').length === 1 && document.querySelector('li')?.textContent?.includes('手动词条'), 'Derived node words appeared in manual dictionary');
  check(personalDictionaryService.getAll().join() === '手动词条', 'Node words were copied into manual storage');
  await click('返回设置');
  check(cloudHasPhrase(), 'Node name was split in real note cloud');
  check(document.querySelector('[data-word-rules]')?.textContent?.includes('美食广场'), 'Node name missing from high-frequency picker');
  await enter('测试备注', '未来城'); check(ghost() === '市漫游', 'Unused node alias did not complete');
  nodeState.updateNode('node', { aliases: ['城市旅行'], description: '' }); await delay();
  check(ghost() !== '市漫游', 'Removed alias remained in mounted completion');
  await enter('测试备注', '城市旅'); check(ghost() === '行', 'Updated alias did not refresh completion');
  nodeState.rename('node', '科研项目复盘'); await delay();
  await enter('测试备注', '科研项'); check(ghost() === '目复盘', 'Renamed node did not refresh completion');
  nodeState.updateNode('node', { aliases: [], description: '' }); await delay();
  check(!cloudHasPhrase(), 'Removed old-name alias remained in mounted cloud');
  dataState.setNodes([]); await delay();
  check(!ghost(), 'Deleted node remained in mounted completion');
  check(personalDictionaryService.getAll().join() === '手动词条', 'Node edits changed manual dictionary');
  root.render(null); await delay();
  return ['Node names and unused aliases participate in completion/clouds while staying hidden in manual dictionary',
    'Node rename, alias changes and removal refresh mounted consumers without modifying manual words'];
};
declare global {
  interface Window { __personalDictionaryHarness?: { run: typeof run; runNodes: typeof runNodes; prepare: typeof prepare }; }
}
window.__personalDictionaryHarness = { run, runNodes, prepare };
