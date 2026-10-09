/**
 * @file aiChatViewportRendererHarness.tsx
 * @input Real chat viewport hook, browser layout events, and synthetic conversations
 * @output Offline browser regression results for entry, keyboard resize, and history navigation
 * @pos Test (AI chat viewport renderer)
 * @updated 2026-10-09: Exercises scrolling with real padded containers and ResizeObserver without accessing saved data.
 */
import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { queueComposerFocusScroll } from '../ai-chat/AIBackfillChatComposer';
import { useAIBackfillChatViewport } from '../ai-chat/useAIBackfillChatViewport';
import type { AIChatMessage, AIChatSession } from '../ai-chat/AIBackfillChatShared';

declare global {
  interface Window {
    __aiChatViewportResult?: { passed: string[]; error?: string };
  }
}

const passed: string[] = [];
const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const root = createRoot(document.getElementById('root')!);
const viewport = Object.assign(new EventTarget(), { height: 800, width: 900, offsetTop: 0 });
Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
const makeMessage = (id: string, role: AIChatMessage['role'] = 'assistant'): AIChatMessage => ({
  id, role, content: `Conversation message ${id}`, createdAt: 1
});
const makeSession = (id: string, count = 50): AIChatSession => ({
  id, title: id, createdAt: 1, updatedAt: 1, personaId: 'test', contextCacheEnabled: false,
  messages: Array.from({ length: count }, (_, index) => makeMessage(`${id}-${index}`))
});
let state = {
  isOpen: true, isHomeView: true, activeSessionId: 'first',
  sessions: [makeSession('first'), makeSession('second'), makeSession('empty', 0)],
  height: 700, width: 900, growth: 0, native: false,
  targetSessionId: undefined as string | undefined,
  targetMessageId: undefined as string | undefined
};
let current: ReturnType<typeof useAIBackfillChatViewport>;
let keepLatest: React.MutableRefObject<boolean>;

function Harness() {
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldKeepLatestMessageVisibleRef = useRef(false);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messageElementRefs = useRef(new Map<string, HTMLDivElement | null>());
  const handledNavigationKeyRef = useRef('');
  const wasOpenRef = useRef(state.isOpen);
  const visualViewportBaselineRef = useRef({ height: 0, width: 0 });
  const activeSession = state.sessions.find((session) => session.id === state.activeSessionId)!;
  Capacitor.isNativePlatform = () => state.native;
  Capacitor.getPlatform = () => state.native ? 'android' : 'web';
  keepLatest = shouldKeepLatestMessageVisibleRef;
  current = useAIBackfillChatViewport({
    ...state, activeSession, isLoading: false, messagesEndRef, messagesScrollContainerRef,
    shouldKeepLatestMessageVisibleRef, composerTextareaRef, messageElementRefs,
    handledNavigationKeyRef, wasOpenRef, visualViewportBaselineRef, setKeyboardBottomInset,
    setActiveSessionId: (activeSessionId) => update({ activeSessionId }),
    setIsHomeView: (isHomeView) => update({ isHomeView })
  });
  if (!state.isOpen) return <div>Closed</div>;
  if (state.isHomeView) return <div>Chat home</div>;
  return <main style={{
    position: 'relative', display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
    width: state.width, height: state.height, overflow: 'hidden', paddingBottom: keyboardBottomInset
  }}>
    <header style={{ height: 64, flexShrink: 0 }}>AI conversation</header>
    <div id="conversation" ref={messagesScrollContainerRef}
      onScroll={(event) => current.handleConversationScroll(event.currentTarget)}
      style={{ minHeight: 0, flex: 1, overflowY: 'auto', padding: '16px 16px 112px' }}>
      {activeSession.messages.length > 0 && <div>
        {activeSession.messages.map((message, index) => <div key={message.id}
          ref={(node) => { messageElementRefs.current.set(message.id, node); }}
          data-message={message.id} style={{ minHeight: 70, marginBottom: 16, borderBottom: '1px solid #ddd' }}>
          {message.content}
          {index === activeSession.messages.length - 1 && <div style={{ height: state.growth }} />}
        </div>)}
        <div ref={messagesEndRef} />
      </div>}
    </div>
    <div id="composer" style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
      padding: `12px 16px ${keyboardBottomInset + 12}px`, background: '#f4f0e8' }}>
      <textarea ref={composerTextareaRef} autoFocus placeholder="Type a message"
        onFocus={() => queueComposerFocusScroll(current.scrollToLatestMessage, current.handleComposerFocus())}
        onBlur={current.handleComposerBlur} style={{ width: '100%', boxSizing: 'border-box', height: 36 }} />
    </div>
  </main>;
}
function update(next: Partial<typeof state>) {
  state = { ...state, ...next };
  root.render(<Harness />);
}
const container = () => document.getElementById('conversation')!;
const assertBottom = (label: string) => {
  const element = container();
  const distance = element.scrollHeight - element.clientHeight - element.scrollTop;
  check(distance <= 1, `${label}: ${distance}px from bottom`);
  const last = document.querySelector('[data-message]:last-of-type')
    || Array.from(document.querySelectorAll('[data-message]')).at(-1);
  if (last) check(last.getBoundingClientRect().bottom <= document.getElementById('composer')!.getBoundingClientRect().top,
    `${label}: composer covers latest message`);
};
const readHistory = async () => {
  container().scrollTop = 600;
  await delay();
  check(!keepLatest.current, 'Manual history scrolling did not cancel bottom following');
};

async function run() {
  update({}); await delay();
  update({ isHomeView: false }); await delay();
  assertBottom('Home to unchanged session');
  check(keepLatest.current, 'Entry did not enable follow intent');
  passed.push('Home to the same session scrolls to the real padded bottom');

  update({ isHomeView: true }); await delay();
  update({ isHomeView: false }); await delay();
  assertBottom('Repeated home entry');
  update({ activeSessionId: 'second' }); await delay();
  assertBottom('Session switch');
  update({ isOpen: false }); await delay();
  update({ isOpen: true }); await delay();
  assertBottom('Reopen unchanged session');
  passed.push('Repeated entry, session switching, and reopening all align');

  // Native Android uses real WebView height changes and must never add a second inset.
  update({ native: true, width: 390 }); await delay();
  for (const height of [620, 560, 480, 400]) {
    update({ height }); await delay(55);
    assertBottom(`Native keyboard animation at ${height}`);
  }
  document.querySelector('textarea')!.blur();
  update({ height: 700 }); await delay();
  assertBottom('Native keyboard dismissal after blur');
  check(document.querySelector('main')!.style.paddingBottom === '0px', 'Android inset was applied twice');
  passed.push('Native keyboard animation and dismissal preserve alignment after blur');

  // A scroll event delivered before ResizeObserver must preserve the old bottom intent.
  container().style.height = '180px';
  container().style.flex = 'none';
  current.handleConversationScroll(container());
  check(keepLatest.current, 'Resize-generated scroll event cleared intent');
  await delay(); assertBottom('Resize-before-observer race');
  container().style.removeProperty('height'); container().style.flex = '1'; await delay();
  passed.push('Scroll events arriving before resize alignment retain bottom intent');

  update({ growth: 340 }); await delay();
  assertBottom('Delayed reply expansion');
  passed.push('Reply content growth follows without message-array changes');

  await readHistory();
  const previousTop = container().scrollTop;
  document.querySelector('textarea')!.focus();
  update({ height: 400, growth: 600 }); await delay();
  check(container().scrollTop === previousTop && !keepLatest.current, 'Focus/resize/expansion moved historical reading');
  const second = state.sessions.find((session) => session.id === 'second')!;
  update({ sessions: state.sessions.map((session) => session.id === second.id
    ? { ...session, messages: [...session.messages, makeMessage('background-reply')] } : session) });
  await delay();
  check(container().scrollTop === previousTop, 'New assistant reply moved historical reading');
  passed.push('History reading survives focus, keyboard resize, expansion, and incoming replies');

  update({ sessions: state.sessions.map((session) => session.id === second.id
    ? { ...session, messages: [...session.messages, makeMessage('outgoing', 'user'), makeMessage('pending')] } : session) });
  await delay(); assertBottom('Outgoing user message');
  passed.push('Sending a new message resumes latest-message following');

  update({ native: false, height: 700 }); await delay();
  viewport.height = 520;
  viewport.dispatchEvent(new Event('resize')); await delay();
  assertBottom('Web visualViewport keyboard');
  check(document.querySelector('main')!.style.paddingBottom === '280px', 'Web keyboard inset did not update');
  document.querySelector('textarea')!.blur();
  viewport.height = 800;
  viewport.dispatchEvent(new Event('resize')); await delay();
  assertBottom('Web visualViewport keyboard dismissal');
  check(document.querySelector('main')!.style.paddingBottom === '0px', 'Web inset did not reset');
  passed.push('Web keyboard inset updates and clears while keeping the latest message visible');

  update({ isHomeView: true, targetSessionId: 'first', targetMessageId: 'first-10' });
  await delay(700);
  const target = document.querySelector('[data-message="first-10"]')!;
  check(target.getBoundingClientRect().top > container().getBoundingClientRect().top
    && target.getBoundingClientRect().bottom < container().getBoundingClientRect().bottom,
  'Deep-linked historical message was not visible');
  check(!keepLatest.current, 'Deep link incorrectly follows latest');
  update({ growth: 900 }); await delay();
  check(target.getBoundingClientRect().top > container().getBoundingClientRect().top, 'Expansion overrode the deep link');
  passed.push('Deep links select historical messages without competing bottom scrolling');

  update({ targetSessionId: undefined, targetMessageId: undefined, activeSessionId: 'empty', growth: 0 });
  await delay();
  update({ sessions: state.sessions.map((session) => session.id === 'empty' ? makeSession('empty') : session) });
  await delay(); assertBottom('Asynchronous history hydration');
  update({ growth: 450 }); await delay(); assertBottom('Hydrated content observer');
  passed.push('Empty conversations align after hydration and observe later content growth');

  const observer = window.ResizeObserver;
  Object.defineProperty(window, 'ResizeObserver', { configurable: true, writable: true, value: undefined });
  update({ native: true, activeSessionId: 'second', height: 700 }); await delay();
  update({ height: 400 }); await delay();
  window.dispatchEvent(new Event('resize')); await delay(); assertBottom('No ResizeObserver fallback');
  window.ResizeObserver = observer;
  passed.push('Window resize fallback works without ResizeObserver');

  check(window.scrollY === 0, 'Chat scrolling moved the outer document');
  window.__aiChatViewportResult = { passed };
}
run().catch((error) => { window.__aiChatViewportResult = { passed, error: error.stack || String(error) }; });
