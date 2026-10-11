/**
 * @file noteAutocompleteRendererHarness.tsx
 * @updated 2026-10-11: Exercises review guide answer completion, expansion, node shortcuts and reading/choice modes.
 * @updated 2026-10-10: Emulates WebView's zoomed computed font metrics to catch double-scaling of copied px values.
 * @input Real note editor and log/focus views with isolated historical fixtures
 * @output Browser interaction assertions and screenshot fixtures
 * @pos Test (Note Autocomplete Renderer)
 * @updated 2026-10-09: Covers IME, keyboard/touch acceptance, caret restoration, scrolling and draft commits.
 * @updated 2026-10-09: Adds the reported mobile mixed-language wrap fixture and native-caret screenshot measurements.
 */
import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ActiveSession, Category, Log, ReviewAnswer, ReviewTemplateSnapshot } from '../../types';
import { NoteAutocompleteTextarea } from '../NoteAutocompleteTextarea';
import { ReviewGuideTab } from '../ReviewView/ReviewGuideTab';
import { AddLogModal } from '../AddLogModal';
import { FocusDetailView } from '../../views/FocusDetailView';
import { ToastProvider } from '../../contexts/ToastContext';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { NavigationProvider } from '../../contexts/NavigationContext';
import { DataProvider } from '../../contexts/DataContext';
import '../../index.css';

const categories: Category[] = [{ id: 'study', name: '学习', icon: '书', themeColor: '#78716c', activities: [
  { id: 'writing', name: '论文', icon: '书', color: '#78716c' }
] }];
const history: Log[] = [1, 2, 3].map((id) => ({ id: `history-${id}`, note: '论文修改 TypeScript 叫做',
  categoryId: 'study', activityId: 'writing', duration: 3600, startTime: Date.now() - id * 86400000, endTime: Date.now() }));
const root = createRoot(document.getElementById('root')!);
const passed: string[] = [];
const delay = () => new Promise((resolve) => setTimeout(resolve, 70));
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
let committed = '';
let savedLog: Log | undefined;
let updatedSession: ActiveSession | undefined;
const Editor = () => {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  return <main className="mx-auto mt-12 max-w-md px-5">
    <h1 className="mb-4 font-serif text-xl text-stone-700">备注</h1>
    <NoteAutocompleteTextarea ref={ref} aria-label="测试备注" value={value} onValueChange={setValue} history={history} activityId="writing"
      onBlur={() => { committed = value; }} style={{ fontFamily: 'VerifiedChinese', lineHeight: '24px' }}
      className="h-[120px] w-full resize-none rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-800 outline-none" />
    <button id="next" type="button" className="mt-6 text-sm text-stone-500">保存</button>
    <output hidden data-draft>{value}</output>
  </main>;
};
const session: ActiveSession = { id: 'focus', categoryId: 'study', activityId: 'writing', activityName: '论文', activityIcon: '书', startTime: Date.now(), note: '' };
const Focus = () => {
  const [current, setCurrent] = useState(session);
  return <SettingsProvider><ToastProvider><FocusDetailView session={current} categories={categories} todos={[]} scopes={[]} todoCategories={[]}
    logs={history} autoFocusNote={false} onClose={() => {}} onComplete={() => {}}
    onUpdate={(next) => { updatedSession = next; setCurrent(next); }} /></ToastProvider></SettingsProvider>;
};
const LogEditor = ({ editing = false }: { editing?: boolean }) => <SettingsProvider><DataProvider><NavigationProvider><ToastProvider>
  <AddLogModal initialLog={editing ? { ...history[0], id: 'editing', note: '' } : undefined}
    prefilledData={{ categoryId: 'study', activityId: 'writing' }} allLogs={history} autoFocusNote={false}
    categories={categories} todos={[]} todoCategories={[]} scopes={[]} onSave={(next) => { savedLog = next; }} onClose={() => {}} />
</ToastProvider></NavigationProvider></DataProvider></SettingsProvider>;

const reviewTemplates: ReviewTemplateSnapshot[] = [{ id: 'guide', title: '回顾引导', questions: [
  { id: 'answer', question: '今天有什么收获？', type: 'text' },
  { id: 'choice', question: '今天状态如何？', type: 'choice', choices: ['很好', '一般'] }
] }];
let reviewAnswers: ReviewAnswer[] = [];
const ReviewEditor = ({ reading = false }: { reading?: boolean }) => {
  const [answers, setAnswers] = useState<ReviewAnswer[]>([]);
  reviewAnswers = answers;
  return <main className="mx-auto mt-12 max-w-md px-5">
    <ReviewGuideTab templates={reviewTemplates} answers={answers} history={history} isReadingMode={reading}
      onUpdateAnswer={(questionId, question, answer) => setAnswers((current) => [
        ...current.filter((entry) => entry.questionId !== questionId), { questionId, question, answer }
      ])} />
  </main>;
};

const render = async (node: React.ReactNode) => { root.render(node); await delay(); };
const input = () => document.querySelector<HTMLTextAreaElement>('textarea')!;
const ghost = () => document.querySelector('[data-note-completion-suffix]');
const setText = async (text: string, start = text.length, end = start) => {
  const element = input(); element.focus();
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(element, text);
  element.setSelectionRange(start, end);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('select', { bubbles: true }));
  await delay();
};
const key = async (name: string, options: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...options });
  input().dispatchEvent(event); await delay(); return event;
};
const accept = async () => { await key('Tab'); await delay(); };
const visible = () => ghost()?.textContent;
const checkGhostPosition = () => {
  const layer = document.querySelector<HTMLElement>('[data-note-completion]')!;
  const reference = layer.cloneNode(false) as HTMLElement;
  reference.removeAttribute('data-note-completion'); reference.style.visibility = 'hidden';
  const content = document.createElement('div');
  content.style.transform = layer.querySelector('div')!.style.transform;
  content.textContent = input().value.slice(0, input().selectionStart);
  const marker = document.createElement('span'); marker.textContent = '\u200b'; content.append(marker);
  reference.append(content); layer.parentElement!.append(reference);
  const expected = marker.getBoundingClientRect(); const actual = ghost()!.getClientRects()[0];
  reference.remove();
  check(Math.abs(expected.left - actual.left) < 1 && Math.abs(expected.top - actual.top) < 1, 'Ghost text moved away from the input caret');
};

async function runReview() {
  await render(null); await render(<ReviewEditor />);
  await setText('今天写论');
  check(visible() === '文' && reviewAnswers[0]?.answer === '今天写论', 'Review history completion missing or ghost was saved');
  checkGhostPosition(); await accept();
  check(reviewAnswers[0]?.answer === '今天写论文' && input().selectionStart === 5 && document.activeElement === input(), 'Review Tab acceptance lost answer/caret/focus');
  await setText('今天写论'); await key('Escape'); check(!ghost(), 'Review Escape did not dismiss');
  await setText('今天修改论');
  input().dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); await delay();
  check(!ghost(), 'Review IME displayed a suggestion');
  input().dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); await delay();
  check(visible() === '文', 'Review IME completion did not return');
  document.querySelector<HTMLButtonElement>('[aria-label="扩展输入框"]')!.click(); await delay();
  check(input().classList.contains('h-[320px]') && input().value === '今天修改论', 'Review expansion lost answer or height');
  input().focus(); await delay(); checkGhostPosition();
  document.querySelector<HTMLButtonElement>('[aria-label="接受备注补全"]')!.click(); await delay();
  check(reviewAnswers[0]?.answer === '今天修改论文' && document.activeElement === input(), 'Review click acceptance lost answer or focus');
  input().setSelectionRange(4, 6);
  document.querySelector<HTMLButtonElement>('[aria-label="插入节点括号"]')!.click(); await delay();
  check(input().value === '今天修改[[论文]]' && !ghost(), 'Review node shortcut lost selected text or showed completion');
  check(input().selectionStart === 10 && document.activeElement === input(), 'Review node shortcut lost caret/focus');
  [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === '很好')!.click(); await delay();
  check(reviewAnswers.find((answer) => answer.questionId === 'choice')?.answer === '很好', 'Review choice answer changed');
  await render(null); await render(<ReviewEditor reading />);
  check(!document.querySelector('textarea') && !ghost(), 'Review reading mode contains an editor');
  passed.push(`Review guide (${window.innerWidth}px): history, actual answer updates, Tab/click, IME, expansion, node shortcut and reading/choice modes`);
  await render(null); await render(<Editor />); await setText('今天修改论');
  return passed;
}

async function run() {
  await document.fonts.load('16px VerifiedChinese', '备注今天修改论文补全');
  check(document.fonts.check('16px VerifiedChinese'), 'Chinese font did not load');
  await render(<Editor />);
  await setText('今天写论');
  check(visible() === '文', 'Chinese inline suggestion missing');
  check(input().value === '今天写论', 'Ghost text changed the stored input');
  checkGhostPosition();
  const before = await key('Tab', { shiftKey: true }); check(!before.defaultPrevented, 'Shift+Tab was intercepted');
  await accept();
  check(input().value === '今天写论文' && input().selectionStart === '今天写论文'.length && document.activeElement === input(), 'Tab acceptance lost text/caret/focus');
  passed.push('Single gray suggestion stays outside input data; Tab inserts the missing suffix and restores focus/caret');

  await setText('今天写论'); await key('Escape');
  check(!ghost() && input().value === '今天写论', 'Escape did not dismiss suggestion');
  const tab = await key('Tab'); check(!tab.defaultPrevented, 'Tab without a suggestion was intercepted');
  await setText('今天修改论'); check(visible() === '文', 'Typing did not restore matching');
  input().blur(); await delay(); check(!ghost() && committed === '今天修改论', 'Blur persisted ghost text');
  passed.push('Esc hides suggestions; native Tab/Shift+Tab remain available; blur commits only actual text');

  await setText('今天写论');
  input().dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); await delay();
  check(!ghost(), 'Ghost remained during IME composition');
  const ime = await key('Tab', { isComposing: true }); check(!ime.defaultPrevented && input().value === '今天写论', 'IME Tab was intercepted');
  input().dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); await delay();
  check(visible() === '文', 'Composition end did not restore suggestions');
  await setText('论\n保留后文', 1); await accept();
  check(input().value === '论文\n保留后文' && input().selectionStart === 2, 'Mid-note insertion changed following text');
  await setText('论文', 0, 1); check(!ghost(), 'Selection showed suggestion');
  await setText('[[论'); check(!ghost(), 'Wiki-link editing showed ordinary suggestion');
  passed.push('IME composition, selections and node brackets are protected; insertion before a newline preserves following text');

  await setText('Learn Type'); check(visible() === 'Script', 'English completion missing');
  checkGhostPosition();
  await accept(); check(input().value === 'Learn TypeScript', 'English casing was lost');
  await setText('第一行\n'.repeat(8) + '最后写论');
  input().scrollTop = input().scrollHeight; input().dispatchEvent(new Event('scroll')); await delay();
  const layer = document.querySelector<HTMLElement>('[data-note-completion]')!;
  check(layer.querySelector('div')!.style.transform.includes(`-${input().scrollTop}px`), 'Scroll layer was not synchronized');
  const inputStyle = getComputedStyle(input()); const layerStyle = getComputedStyle(layer);
  check(inputStyle.fontFamily === layerStyle.fontFamily && inputStyle.lineHeight === layerStyle.lineHeight && inputStyle.paddingLeft === layerStyle.paddingLeft, 'Mirror typography differs');
  checkGhostPosition();
  const button = document.querySelector<HTMLButtonElement>('[aria-label="接受备注补全"]')!;
  check(button.textContent?.trim() === 'Tab' && getComputedStyle(button).borderTopWidth === '0px', 'Completion action is not a borderless Tab label');
  const pointer = new PointerEvent('pointerdown', { bubbles: true, cancelable: true }); button.dispatchEvent(pointer);
  check(pointer.defaultPrevented, 'Completion click could blur the editor'); button.click(); await delay();
  check(input().value.endsWith('最后写论文') && document.activeElement === input(), 'Completion button lost input focus');
  input().style.width = '200px';
  await setText('今天修改'.repeat(20) + '论');
  input().scrollTop = input().scrollHeight; input().dispatchEvent(new Event('scroll')); await delay();
  checkGhostPosition(); input().style.width = '';
  passed.push('English casing, multiline scroll, typography synchronization and touch acceptance are correct');

  await render(<Focus />); await setText('今天写论'); check(visible() === '文', 'Focus view missing completion');
  await accept(); input().blur(); await delay(); check(updatedSession?.note === '今天写论文', 'Focus buffer did not commit accepted completion');
  passed.push('Active focus view completes and commits its buffered note');
  for (const editing of [false, true]) {
    await render(null); await render(<LogEditor editing={editing} />); await setText('今天写论');
    check(visible() === '文', `Log ${editing ? 'edit' : 'add'} view missing completion`); await accept();
    const save = document.querySelector<HTMLButtonElement>('.record-detail-modal-header .lucide-check')?.closest('button');
    check(save, 'Log save button missing'); save!.click(); await delay();
    check(savedLog?.note === '今天写论文', 'Log save did not store accepted text');
  }
  passed.push('New and existing record notes accept completion and save the actual completed text');
  await render(null); await render(<Editor />); await setText('今天修改论');
  return passed;
}

declare global {
  interface Window {
    __noteAutocompleteHarness?: { run: typeof run; runReview: typeof runReview; setText: typeof setText; prepareMobileCase: typeof prepareMobileCase; restoreTextZoom: typeof restoreTextZoom; renderEditor: () => Promise<void>; renderReview: () => Promise<void>; passed: string[] };
  }
}
const originalComputedStyle = window.getComputedStyle.bind(window);
const restoreTextZoom = () => { window.getComputedStyle = originalComputedStyle; };
async function prepareMobileCase() {
  // Real Android WebView returns e.g. 15.4px for CSS 14px at 110% system text zoom.
  // Copying 15.4px into another element repeats the scaling; desktop emulation does not do this.
  window.getComputedStyle = (element, pseudo) => new Proxy(originalComputedStyle(element, pseudo), {
    get(target, property) {
      const result = Reflect.get(target, property, target);
      if ((property === 'fontSize' || property === 'lineHeight') && typeof result === 'string' && result.endsWith('px')) {
        return `${parseFloat(result) * 1.1}px`;
      }
      return typeof result === 'function' ? result.bind(target) : result;
    }
  });
  await render(<Editor />);
  document.documentElement.style.setProperty('text-size-adjust', '130%');
  document.documentElement.style.setProperty('-webkit-text-size-adjust', '130%');
  input().style.width = '342.5px';
  input().style.wordSpacing = '3px';
  input().style.caretColor = '#ff0000';
  await setText('纠结了一会要不要报boss直聘的奖学金，然后欣然就叫');
  check(visible() === '做', 'Reported mobile fixture did not suggest the expected suffix');
  const suffix = ghost()!.getClientRects()[0];
  const rect = input().getBoundingClientRect();
  const computed = getComputedStyle(input());
  return { suffix: { left: suffix.left, top: suffix.top }, input: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }, fontSize: parseFloat(computed.fontSize) };
}
window.__noteAutocompleteHarness = { run, runReview, setText, prepareMobileCase, restoreTextZoom, renderEditor: () => render(<Editor />), renderReview: async () => { await render(null); await render(<ReviewEditor />); }, passed };
void render(<Editor />);
