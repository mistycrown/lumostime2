/**
 * @file aiChatUnreadRendererHarness.tsx
 * @input Real AI chat window provider, viewport hook, and synthetic unread conversations
 * @output Browser regression results for unread entry and explicit message navigation
 * @pos Test (AI chat unread renderer)
 * @updated 2026-10-10: Covers the homepage unread entry through the actual context instead of passing navigation props manually.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { AIChatWindowProvider, useAIChatWindow } from '../../contexts/AIChatWindowContext';
import { queueComposerFocusScroll } from '../ai-chat/AIBackfillChatComposer';
import { useAIBackfillChatViewport } from '../ai-chat/useAIBackfillChatViewport';
import type { AIChatSession } from '../ai-chat/AIBackfillChatShared';

declare global {
  interface Window {
    __aiChatViewportResult?: { passed: string[]; error?: string };
  }
}

const sessions: AIChatSession[] = ['previous', 'unread', 'notification'].map((id): AIChatSession => ({
  id, title: id, createdAt: 1, updatedAt: 1, personaId: 'test', contextCacheEnabled: false,
  messages: Array.from({ length: 50 }, (_, index) => ({
    id: `${id}-${index}`, role: 'assistant', content: `Message ${index}`, createdAt: index
  }))
}));
let controls: ReturnType<typeof useAIChatWindow>;
let layout = { width: 900, height: 700, growth: 0 };
let following: React.MutableRefObject<boolean>;
const root = createRoot(document.getElementById('root')!);
const delay = (ms = 160) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const passed: string[] = [];
Capacitor.isNativePlatform = () => true;
Capacitor.getPlatform = () => 'android';

function Probe() {
  controls = useAIChatWindow();
  return <div>Homepage AI entry</div>;
}

// The runner substitutes only the modal coordinator. The context and viewport
// execute their real implementations with a padded browser message scroller.
export function UnreadViewportModal(props: {
  isOpen: boolean;
  targetSessionId?: string;
  targetMessageId?: string;
  onMarkRead?: () => void;
}) {
  const [activeSessionId, setActiveSessionId] = useState('previous');
  const [isHomeView, setIsHomeView] = useState(true);
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldKeepLatestMessageVisibleRef = useRef(false);
  const messageElementRefs = useRef(new Map<string, HTMLDivElement | null>());
  const handledNavigationKeyRef = useRef('');
  const wasOpenRef = useRef(props.isOpen);
  const visualViewportBaselineRef = useRef({ height: 0, width: 0 });
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  following = shouldKeepLatestMessageVisibleRef;
  const activeSession = sessions.find((session) => session.id === activeSessionId)!;
  const handlers = useAIBackfillChatViewport({
    ...props, isHomeView, activeSessionId, activeSession, sessions, isLoading: false,
    setActiveSessionId, setIsHomeView, setKeyboardBottomInset, messagesEndRef,
    messagesScrollContainerRef, shouldKeepLatestMessageVisibleRef, messageElementRefs,
    handledNavigationKeyRef, wasOpenRef, visualViewportBaselineRef, composerTextareaRef
  });
  useEffect(() => { if (props.isOpen) props.onMarkRead?.(); }, [props.isOpen, props.onMarkRead]);
  if (!props.isOpen) return null;
  if (isHomeView) return <div>AI home</div>;
  return <main style={{ position: 'relative', display: 'flex', flexDirection: 'column',
    width: layout.width, height: layout.height, paddingBottom: keyboardBottomInset, overflow: 'hidden' }}>
    <header style={{ height: 60, flexShrink: 0 }}>Conversation {activeSessionId}</header>
    <div id="conversation" data-session={activeSessionId} ref={messagesScrollContainerRef}
      onScroll={(event) => handlers.handleConversationScroll(event.currentTarget)}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 112px' }}>
      <div>{activeSession.messages.map((message, index) => <div key={message.id}
        data-message={message.id} ref={(node) => { messageElementRefs.current.set(message.id, node); }}
        style={{ minHeight: 70, marginBottom: 16, borderBottom: '1px solid #ddd' }}>
        {message.content}
        {index === activeSession.messages.length - 1 && <div style={{ height: layout.growth }} />}
      </div>)}<div ref={messagesEndRef} /></div>
    </div>
    <textarea ref={composerTextareaRef} autoFocus placeholder="Type a message"
      onFocus={() => queueComposerFocusScroll(handlers.scrollToLatestMessage, handlers.handleComposerFocus())}
      onBlur={handlers.handleComposerBlur}
      style={{ position: 'absolute', bottom: 12, left: 16, right: 16, height: 36 }} />
  </main>;
}

function render(next: Partial<typeof layout> = {}) {
  layout = { ...layout, ...next };
  root.render(<AIChatWindowProvider><Probe /></AIChatWindowProvider>);
}
function assertBottom(label: string) {
  const container = document.getElementById('conversation')!;
  check(container.dataset.session === 'unread', `${label}: selected the wrong conversation`);
  check(container.scrollHeight - container.scrollTop - container.clientHeight <= 1, `${label}: latest message is not aligned`);
  check(following.current, `${label}: bottom following was disabled`);
}
async function openUnread() {
  controls.incrementUnreadCount(3, { targetSessionId: 'unread', targetMessageId: 'unread-40' });
  await delay();
  check(controls.unreadCount === 3, 'Unread badge was not populated');
  controls.openAIChat({ targetDate: new Date('2026-10-10T00:00:00') });
  await delay();
}
async function run() {
  render(); await delay();
  await openUnread();
  assertBottom('Homepage unread entry');
  check(controls.targetMessageId === undefined, 'Unread entry incorrectly pins a message');
  check(controls.unreadCount === 0, 'Unread badge did not clear');
  passed.push('Homepage unread entry selects its session and scrolls past older unread messages to the latest');

  render({ growth: 320 }); await delay(); assertBottom('Delayed unread reply expansion');
  passed.push('Unread entry keeps following delayed reply expansion');
  render({ width: 390, height: 400 }); await delay(); assertBottom('Unread entry keyboard opening');
  document.querySelector('textarea')!.blur();
  render({ height: 700 }); await delay(); assertBottom('Unread entry keyboard dismissal');
  passed.push('Unread entry follows mobile keyboard opening and dismissal');

  controls.closeAIChat(); await delay();
  await openUnread(); assertBottom('Repeated unread entry');
  passed.push('The same unread conversation aligns again after reopening');

  controls.closeAIChat(); await delay();
  controls.incrementUnreadCount(1, { targetSessionId: 'unread', targetMessageId: 'unread-49' });
  await delay();
  controls.openAIChat({ targetSessionId: 'notification', targetMessageId: 'notification-10' });
  await delay(700);
  check(controls.targetSessionId === 'notification' && controls.targetMessageId === 'notification-10',
    'Unread badge overrode the explicit notification target');
  const target = document.querySelector('[data-message="notification-10"]')!;
  const container = document.getElementById('conversation')!;
  check(target.getBoundingClientRect().top >= container.getBoundingClientRect().top
    && target.getBoundingClientRect().bottom <= container.getBoundingClientRect().bottom,
  'Explicit historical message was not visible');
  check(!following.current, 'Explicit history navigation incorrectly enabled bottom following');
  passed.push('Explicit notification links retain their exact message target even with unread messages');

  controls.closeAIChat(); await delay();
  controls.openAIChat(); await delay();
  check(controls.targetSessionId === undefined && controls.targetMessageId === undefined,
    'Opening without unread retained a stale target');
  passed.push('Opening without unread clears stale session and message targets');
  window.__aiChatViewportResult = { passed };
}
run().catch((error) => { window.__aiChatViewportResult = { passed, error: error.stack || String(error) }; });
