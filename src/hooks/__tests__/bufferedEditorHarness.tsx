/**
 * @file bufferedEditorHarness.tsx
 * @updated 2026-10-16: Covers missing-review commits on return/reopen and shared local-date period creation.
 * @input Real React editors and isolated platform adapters
 * @output Regression results for input, exit, deletion, merge and lifecycle saving
 * @pos Test (Renderer)
 */
import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useBufferedRecord } from '../useBufferedRecord';
import { useReviewManager } from '../useReviewManager';
import { BufferedTextarea } from '../../components/BufferedTextarea';
import { DailyReviewView } from '../../views/DailyReviewView';
import { WeeklyReviewView } from '../../views/WeeklyReviewView';
import { MonthlyReviewView } from '../../views/MonthlyReviewView';
import { ReviewTemplateManageView } from '../../views/ReviewTemplateManageView';
import { FocusDetailView } from '../../views/FocusDetailView';
import { nativeState, reviewState } from './bufferedEditorMocks';

declare global { interface Window { __bufferedEditorResult?: { passed: string[]; error?: string }; } }
const passed: string[] = [];
const delay = () => new Promise(resolve => setTimeout(resolve, 30));
const check = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const host = document.getElementById('root')!;
const root = createRoot(host);
const saves: any[] = [];
let source: any = { id: 'record', text: '', other: 'original' };
let draft: ReturnType<typeof useBufferedRecord<typeof source>>;
const Probe = () => {
  draft = useBufferedRecord(source, value => { saves.push(value); source = value; });
  return <span>{draft.value.text}</span>;
};
let manager: ReturnType<typeof useReviewManager>;
const ManagerProbe = () => { manager = useReviewManager(); return null; };
const render = async (element: React.ReactNode) => { root.render(element); await delay(); };
const unmount = () => render(null);
const input = async (selector: string, value: string) => {
  const element = host.querySelector(selector) as HTMLTextAreaElement | HTMLInputElement;
  check(element, 'Missing input: ' + selector);
  const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  await delay();
  check(element.value === value, 'Input was overwritten');
};
const click = async (label: string) => {
  const button = Array.from(host.querySelectorAll('button')).find(button => button.textContent?.trim() === label || button.title === label);
  check(button, 'Missing button: ' + label);
  button!.click(); await delay();
};

async function run() {
  await render(<StrictMode><Probe /></StrictMode>);
  check(saves.length === 0, 'StrictMode mount must not save');
  for (let i = 0; i < 20; i++) { draft.update({ ...draft.value, text: '输入草稿'.repeat(i + 1) }); await delay(); }
  check(saves.length === 0, 'Typing triggered persistence');
  source = { ...source, other: 'external update' };
  await render(<StrictMode><Probe /></StrictMode>);
  check(draft.value.text === '输入草稿'.repeat(20), 'External data erased draft');
  await unmount();
  check(saves.length === 1 && saves[0].other === 'external update', 'Exit did not merge and save once');
  passed.push('StrictMode, repeated input, external merge and single exit save');

  const exitedValue = draft.value;
  const lateUpdate = draft.update;
  lateUpdate({ ...exitedValue, other: 'late AI result' }); await delay();
  check(saves.length === 2 && saves[1].text === '输入草稿'.repeat(20) && saves[1].other === 'late AI result', 'Late AI result lost the exited draft');
  passed.push('Async result after exit preserves saved edits');

  saves.length = 0;
  await render(<Probe />);
  draft.update({ ...draft.value, text: 'background' }); await delay();
  nativeState.callback!({ isActive: false }); await delay();
  window.dispatchEvent(new Event('pagehide')); await delay();
  await unmount();
  check(saves.length === 1 && saves[0].text === 'background', 'Lifecycle flush duplicated or lost save');
  passed.push('Native background and pagehide save once');

  saves.length = 0;
  await render(<Probe />);
  draft.update({ ...draft.value, text: 'delete me' }); await delay();
  draft.discard(); await unmount();
  draft.update({ ...draft.value, other: 'late deleted result' }); await delay();
  check(saves.length === 0, 'Discard resurrected deleted record');
  passed.push('Discard suppresses unmount persistence');

  source = { id: 'field-a', text: '' }; saves.length = 0;
  const field = () => <BufferedTextarea draftKey={source.id} value={source.text} onValueCommit={text => { saves.push(text); source = { ...source, text }; }} />;
  await render(field());
  await input('textarea', '提示词\n第二行');
  check(saves.length === 0, 'Textarea saved during input');
  host.querySelector('textarea')!.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); await delay();
  await render(field());
  check(saves.length === 1 && saves[0] === '提示词\n第二行', 'Blur lost text');
  await input('textarea', '退出时保存');
  source = { id: 'field-b', text: 'different record' };
  await render(field());
  check(saves.length === 2 && saves[1] === '退出时保存', 'Identity change did not flush old draft');
  check((host.querySelector('textarea') as HTMLTextAreaElement).value === 'different record', 'Identity change leaked old text');
  await unmount();
  passed.push('Buffered textarea input, blur, identity switch and exit');

  const date = new Date(2026, 9, 4);
  const templateSnapshot = [{ id: 'template', title: 'Review', order: 0, questions: [{ id: 'question', question: '今天的回顾', type: 'text' }] }];
  const common: any = { templates: [], checkTemplates: [], categories: [], logs: [], todos: [], todoCategories: [], scopes: [], dailyReviews: [], addToast: () => {}, onClose: () => {}, onGenerateNarrative: async () => 'Generated' };
  await render(<ManagerProbe />);
  reviewState.reviewTemplates = [{ ...templateSnapshot[0], isWeeklyTemplate: true, isMonthlyTemplate: true }];
  await render(<ManagerProbe />);
  manager.handleOpenWeeklyReview(new Date(2026, 9, 12), new Date(2026, 9, 18, 23, 59, 59));
  manager.handleOpenMonthlyReview(new Date(2026, 9, 1), new Date(2026, 9, 31));
  check(reviewState.weeklyReviews[0].weekStartDate === '2026-10-12' && reviewState.weeklyReviews[0].weekEndDate === '2026-10-18', 'Weekly entry shifted the local date');
  check(reviewState.monthlyReviews[0].monthStartDate === '2026-10-01' && reviewState.monthlyReviews[0].monthEndDate === '2026-10-31', 'Monthly entry shifted the local date');
  check(reviewState.weeklyReviews[0].templateSnapshot.length === 1 && reviewState.monthlyReviews[0].templateSnapshot.length === 1, 'Alternate entry lost the template snapshot');
  await render(<ManagerProbe />);
  manager.handleOpenWeeklyReview(new Date(2026, 9, 12), new Date(2026, 9, 18, 23, 59, 59));
  manager.handleOpenMonthlyReview(new Date(2026, 9, 1), new Date(2026, 9, 31));
  check(reviewState.weeklyReviews.length === 1 && reviewState.monthlyReviews.length === 1, 'Reopen duplicated a period');
  passed.push('Shared weekly/monthly entry uses local dates, templates and existing records');

  for (const [View, collection, save] of [
    [DailyReviewView, 'dailyReviews', manager.handleUpdateReview],
    [WeeklyReviewView, 'weeklyReviews', manager.handleUpdateWeeklyReview],
    [MonthlyReviewView, 'monthlyReviews', manager.handleUpdateMonthlyReview]
  ] as const) {
    const existing = { id: 'unrelated-review', answers: [] };
    reviewState[collection] = [existing];
    const review: any = { id: `missing-${View.name}`, date: '2026-10-04', weekStartDate: '2026-10-04', weekEndDate: '2026-10-10', monthStartDate: '2026-10-01', monthEndDate: '2026-10-31', answers: [], templateSnapshot, createdAt: 1, updatedAt: 1 };
    const view = (value: any) => <View {...common} key={value.id} review={value} date={date} weekStartDate={date} weekEndDate={date} monthStartDate={date} monthEndDate={date} initialTab="guide" onUpdateReview={save as any} onDelete={() => root.render(null)} />;
    await render(view(review));
    await input('textarea', '返回后应保留的回答');
    await unmount(); // Return without blur or an explicit save button.
    const saved = reviewState[collection].find((item: any) => item.id === review.id);
    check(saved?.answers[0]?.answer === '返回后应保留的回答', View.name + ': missing review was silently dropped on return');
    check(reviewState[collection][0] === existing && reviewState[collection].length === 2, View.name + ': save changed unrelated records');
    await render(view(saved));
    check(host.textContent?.includes('返回后应保留的回答'), View.name + ': reopen lost the answer');
    await unmount();
    save({ ...saved, summary: '再次保存' });
    check(reviewState[collection].length === 2 && reviewState[collection][1].summary === '再次保存', View.name + ': update duplicated the saved review');
    passed.push(View.name + ' missing record survives direct return and reopen through the real manager');
  }

  for (const View of [DailyReviewView, WeeklyReviewView, MonthlyReviewView]) {
    saves.length = 0;
    let review: any = { id: View.name, date: '2026-10-04', weekStartDate: '2026-10-04', weekEndDate: '2026-10-10', monthStartDate: '2026-10-01', monthEndDate: '2026-10-31', answers: [], templateSnapshot, createdAt: 1, updatedAt: 1 };
    const view = (tab: string) => <View {...common} key={review.id} review={review} date={date} weekStartDate={date} weekEndDate={date} monthStartDate={date} monthEndDate={date} initialTab={tab} onUpdateReview={value => { saves.push(value); review = value; }} onDelete={() => root.render(null)} />;
    await render(view('guide'));
    for (let i = 1; i <= 8; i++) await input('textarea', '回顾文字'.repeat(i));
    check(saves.length === 0, View.name + ': guide saved while typing');
    await click('叙事');
    await input('input[placeholder="用一句话总结..."]', '一句总结');
    await input('textarea', '# 叙事\n\n长篇编辑');
    if (View === MonthlyReviewView) {
      await click('引言');
      await input('textarea', '这个月的长句引言');
    }
    check(saves.length === 0, View.name + ': narrative saved while typing');
    await unmount();
    check(saves.length === 1 && saves[0].answers[0].answer === '回顾文字'.repeat(8) && saves[0].summary === '一句总结' && saves[0].narrative === '# 叙事\n\n长篇编辑', View.name + ': exit lost a field');
    if (View === MonthlyReviewView) check(saves[0].cite === '这个月的长句引言', 'Monthly cite draft was lost');
    passed.push(View.name + ' real guide, summary and narrative input saves once on exit');
    review = { ...review, answers: [], summary: '', narrative: '' }; saves.length = 0;
    await render(view('guide'));
    await input('textarea', '即将删除');
    const deleteButton = Array.from(host.querySelectorAll('button')).find(button => button.querySelector('svg.lucide-trash-2'));
    check(deleteButton, 'Missing review delete button'); deleteButton!.click(); await delay();
    check(saves.length === 0, View.name + ': deletion recreated review');
    passed.push(View.name + ' deletion discards draft');
  }
  let persistedDaily: any = { id: 'daily-autosave', date: '2026-10-04', answers: [], templateSnapshot, createdAt: 1, updatedAt: 1 };
  let dailySaves = 0;
  const AutosavingDailyReview = () => {
    const [review, setReview] = useState(persistedDaily);
    return <DailyReviewView {...common} review={review} date={date} initialTab="guide"
      onUpdateReview={(value) => { persistedDaily = value; dailySaves++; setReview(value); }}
      onDelete={() => root.render(null)} />;
  };
  await render(<AutosavingDailyReview />);
  await input('textarea', '停顿后保存');
  await new Promise(resolve => setTimeout(resolve, 600));
  check(dailySaves === 1 && persistedDaily.answers[0].answer === '停顿后保存', 'Daily review did not autosave before return');
  check((host.querySelector('textarea') as HTMLTextAreaElement).value === '停顿后保存', 'Autosave reset the visible answer');
  await input('textarea', '失焦立即保存');
  host.querySelector('textarea')!.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  await delay();
  check(dailySaves === 2 && persistedDaily.answers[0].answer === '失焦立即保存', 'Daily blur did not commit the latest answer');
  await input('textarea', '最后输入后立即返回');
  await unmount();
  check(dailySaves === 3 && persistedDaily.answers[0].answer === '最后输入后立即返回', 'Daily return lost the pending autosave');
  await new Promise(resolve => setTimeout(resolve, 600));
  check(dailySaves === 3, 'Autosave timer fired again after return');
  await render(<AutosavingDailyReview />);
  check(host.textContent?.includes('最后输入后立即返回'), 'Daily autosaved answer was missing on reopen');
  await unmount();
  passed.push('Daily review autosave, blur, immediate return, reopen and timer cancellation');

  saves.length = 0;
  const templates: any[] = [{ id: 'template', title: 'Review template', order: 0, questions: [{ id: 'q', question: 'Question', type: 'choice', choices: ['A'] }] }];
  await render(<ReviewTemplateManageView templates={templates} onUpdateTemplates={value => saves.push(value)} onBack={() => root.render(null)} />);
  host.querySelector('h4')!.parentElement!.parentElement!.click(); await delay();
  const questionLabel = Array.from(host.querySelectorAll('p')).find(element => element.textContent === 'Question');
  check(questionLabel, 'Missing edit question'); questionLabel!.parentElement!.click(); await delay();
  await input('textarea', '第一项\n第二项\n第三项');
  check(saves.length === 0, 'Template options saved during input');
  await unmount();
  check(saves.length === 1 && saves[0][0].questions[0].choices.join('\n') === '第一项\n第二项\n第三项', 'Template exit lost options');
  passed.push('Review template options save once on editor exit');
  let session: any = { id: 'focus', startTime: Date.now(), categoryId: 'category', activityId: 'activity', activityName: 'Work', scopeIds: [], reactions: [], note: '' };
  let completed: any;
  const focus = () => <FocusDetailView session={session} categories={[]} todos={[]} scopes={[]} todoCategories={[]} autoFocusNote={false}
    onUpdate={value => { saves.push(value); session = value; }} onClose={() => root.render(null)}
    onComplete={value => { completed = value; root.render(null); }} />;
  await render(focus());
  await render(focus()); saves.length = 0;
  await input('textarea', '专注备注草稿');
  check(saves.length === 0, 'Focus note saved while typing');
  await unmount();
  check(saves.length === 1 && saves[0].note === '专注备注草稿', 'Focus exit lost note');
  passed.push('Focus note saves once on exit');
  await render(focus()); await render(focus()); saves.length = 0;
  await input('textarea', '完成时保留备注');
  host.querySelector<HTMLButtonElement>('button.btn-template-filled')!.click(); await delay();
  check(completed?.note === '完成时保留备注' && saves.length === 0, 'Focus completion lost note or resurrected session');
  passed.push('Focus completion includes draft without an extra active-session save');
  root.unmount();
  window.__bufferedEditorResult = { passed };
}
run().catch(error => { window.__bufferedEditorResult = { passed, error: error.stack || String(error) }; });
