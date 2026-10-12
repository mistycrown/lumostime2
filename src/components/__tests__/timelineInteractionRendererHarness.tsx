/**
 * @file timelineInteractionRendererHarness.tsx
 * @input Actual schedule canvas and native Chromium mouse/touch sequences
 * @output Regression results for first-tap record opening, delayed clicks and timeline gestures
 * @pos Test Harness
 * @updated 2026-10-12: Reproduces delayed compatibility clicks closing pointer-up-opened record dialogs.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TimelineScheduleCanvas } from '../TimelineScheduleCanvas';
import { Category, Log } from '../../types';

const day = new Date(2026, 9, 1);
const log: Log = { id: 'record', categoryId: 'work', activityId: 'reading', startTime: day.getTime() + 3600000,
  endTime: day.getTime() + 7200000, duration: 3600, note: '阅读记录' };
const plan: Log = { ...log, id: 'plan', startTime: day.getTime() + 7200000,
  endTime: day.getTime() + 9000000, duration: 1800, note: '', isPlanned: true };
const categories: Category[] = [{ id: 'work', name: '工作', icon: '', themeColor: '#385e3c',
  activities: [{ id: 'reading', name: '阅读', icon: '', color: '#385e3c' }] }];
const state = window as any;
const wait = (ms = 50) => new Promise(resolve => setTimeout(resolve, ms));
const check = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const until = async (condition: () => boolean, message: string) => {
  for (let i = 0; i < 100; i++) { if (condition()) return; await wait(); }
  throw new Error(message);
};
const passed: string[] = [];
let opens = 0;
let actions = 0;
const Fixture = () => {
  const [editing, setEditing] = useState(false);
  state.__closeTimelineDialog = () => setEditing(false);
  return <div className="h-full flex flex-col">
    <TimelineScheduleCanvas currentDate={day} logs={[log, plan]} categories={categories} scopes={[]} todos={[]}
      isDarkMode={false} isPrivacyMode={false} minIdleTimeThreshold={1} onAddLog={() => {}}
      onEditLog={() => { opens++; setEditing(true); }} onUpdateLog={() => {}}
      onCreatePlannedLog={() => log} onCreateQuickColorLog={() => log} onStartPlannedTodo={() => {}} onDeletePlannedLog={() => {}} />
    {editing && <div data-record-dialog className="fixed inset-0 z-[220] bg-stone-900/40 flex items-end" onClick={() => setEditing(false)}>
      <div className="w-full bg-white p-6" onClick={event => event.stopPropagation()}>
        <p>编辑记录</p><button data-dialog-action onClick={() => { actions++; }}>保存</button>
      </div>
    </div>}
  </div>;
};

const input = async (request: object) => {
  state.__timelineInput = request;
  await until(() => !state.__timelineInput, 'Native input request timed out');
  await wait();
};
const blockPoint = () => {
  const bounds = document.querySelector('[data-schedule-block]')!.getBoundingClientRect();
  return { x: Math.round(bounds.left + bounds.width / 2), y: Math.round(bounds.top + bounds.height / 2) };
};
const dialog = () => Boolean(document.querySelector('[data-record-dialog]'));
const close = async () => { state.__closeTimelineDialog(); await wait(); };
const capture = async (name: string) => { state.__timelineCapture = name; await until(() => !state.__timelineCapture, 'Screenshot timed out'); };

async function run() {
  await document.fonts.load('16px VerifiedChinese', '编辑记录阅读');
  check(document.fonts.check('16px VerifiedChinese', '编辑记录阅读'), 'Chinese font missing');
  createRoot(document.getElementById('root')!).render(<Fixture />);
  await until(() => Boolean(document.querySelector('[data-schedule-block]')), 'Timeline did not render');
  await wait(150);

  // Delay Chromium's compatibility click beyond the old global 320 ms guard.
  const delayClick = (event: MouseEvent) => {
    event.stopImmediatePropagation();
    window.removeEventListener('click', delayClick, true);
    const { clientX, clientY } = event;
    setTimeout(() => document.elementFromPoint(clientX, clientY)?.dispatchEvent(new MouseEvent('click', {
      bubbles: true, cancelable: true, detail: 1, clientX, clientY
    })), 450);
  };
  window.addEventListener('click', delayClick, true);
  await input({ type: 'touch', points: [blockPoint()] });
  await wait(550);
  check(opens === 1 && dialog(), 'Delayed release click closed the record editor after the first tap');
  passed.push('A delayed touch click opens the editor once and keeps it visible');
  await capture('record-editor-mobile');

  const action = document.querySelector('[data-dialog-action]')!.getBoundingClientRect();
  await input({ type: 'mouse', point: { x: Math.round(action.left + 10), y: Math.round(action.top + 10) } });
  check(actions === 1, 'Timeline intercepts editor controls');
  await close();
  for (let i = 0; i < 3; i++) {
    const before = opens;
    await input({ type: 'touch', points: [blockPoint()] });
    check(opens === before + 1 && dialog(), 'Native touch tap failed to open once');
    await close();
  }
  const beforeMouse = opens;
  await input({ type: 'mouse', point: blockPoint() });
  check(opens === beforeMouse + 1 && dialog(), 'Native mouse click failed to open once');
  // Controls must work immediately, without a document-wide cooldown.
  const save = document.querySelector('[data-dialog-action]')!.getBoundingClientRect();
  await input({ type: 'mouse', point: { x: Math.round(save.left + 10), y: Math.round(save.top + 10) } });
  check(actions === 2, 'Fresh editor control click was swallowed');
  await close();
  passed.push('Repeated native taps and mouse clicks open on the first attempt, and editor controls respond immediately');

  const beforeScroll = opens;
  const start = blockPoint();
  await input({ type: 'touch', points: [start, { x: start.x, y: start.y - 30 }, { x: start.x, y: start.y - 80 }] });
  check(opens === beforeScroll && !dialog(), 'Scrolling opened a record dialog');
  const scroll = document.querySelector('section[aria-label="全天时间轴"] > div')!;
  scroll.scrollTop = 0; await wait(100);
  passed.push('A vertical scroll over a record does not open the editor');

  await input({ type: 'touch', points: [blockPoint()], holdMs: 600 });
  check(!dialog() && document.querySelector('[aria-label="调整开始时间"]'), 'Long press no longer enters time adjustment');
  await input({ type: 'mouse', point: { x: 15, y: 350 } });
  await wait(350);
  check(!document.querySelector('[aria-label="调整开始时间"]'), 'Time adjustment did not exit');
  const beforeKeyboard = opens;
  const block = document.querySelector('[data-schedule-block]') as HTMLElement;
  block.focus();
  block.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await wait();
  check(opens === beforeKeyboard + 1 && dialog(), 'Keyboard activation failed');
  passed.push('Long-press time adjustment and keyboard activation remain available');
  await close();

  const beforePinch = opens;
  const center = blockPoint();
  await input({ type: 'pinch', frames: [
    [{ x: center.x - 10, y: center.y }, { x: center.x + 10, y: center.y }],
    [{ x: center.x - 30, y: center.y }, { x: center.x + 30, y: center.y }]
  ] });
  check(opens === beforePinch && !dialog(), 'Pinch release opened the editor');
  await wait(350);
  scroll.scrollTop = 0; await wait();
  await input({ type: 'touch', points: [blockPoint()] });
  check(opens === beforePinch + 1 && dialog(), 'Normal taps do not recover after pinch zoom');
  await close();
  const planBounds = document.querySelector('[data-log-id="plan"]')!.getBoundingClientRect();
  await input({ type: 'touch', points: [{ x: Math.round(planBounds.left + planBounds.width / 2), y: Math.round(planBounds.top + planBounds.height / 2) }] });
  check(document.querySelector('[aria-label="计划操作"]') && !dialog(), 'Planned blocks no longer open their action panel');
  passed.push('Pinch zoom does not open records, normal taps recover, and planned blocks keep their action panel');
  state.__timelineResult = { passed };
}
run().catch(error => { state.__timelineResult = { passed, error: error.stack || String(error) }; });
