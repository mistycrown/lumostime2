/**
 * @file useAIBackfillChatViewport.ts
 * @input AI chat session navigation, message DOM refs, and viewport lifecycle state
 * @output Scroll helpers and keyboard-safe viewport effects for AIBackfillChatModal
 * @pos Component Support (AI Integration)
 * @description Keeps message scrolling, deep-link navigation, and visual viewport keyboard handling out of the main chat coordinator.
 * @updated 2026-09-30: Tracks bottom intent and follows keyboard-driven conversation resizing without interrupting older-message reading.
 * @updated 2026-10-09: Aligns the real scroller bottom on conversation entry and preserves follow intent through keyboard and message layout changes.
 */
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import type { AIChatSession } from './AIBackfillChatShared';
import { MOBILE_KEYBOARD_INSET_THRESHOLD } from './AIBackfillChatShared';

export const AI_CHAT_BOTTOM_FOLLOW_THRESHOLD_PX = 48;

interface AIChatScrollMetrics {
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
}

export const isAIChatScrollNearBottom = (
  metrics: AIChatScrollMetrics,
  threshold = AI_CHAT_BOTTOM_FOLLOW_THRESHOLD_PX
) => metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight <= threshold;

export const getAIChatBottomFollowIntent = (
  previousMetrics: AIChatScrollMetrics | null,
  metrics: AIChatScrollMetrics,
  shouldKeepLatestVisible: boolean
) => {
  // Resizing can emit scroll events before ResizeObserver restores the bottom.
  // Preserve the pre-layout intent instead of treating those events as user scrolling.
  if (shouldKeepLatestVisible && previousMetrics && (
    previousMetrics.clientHeight !== metrics.clientHeight
    || previousMetrics.scrollHeight !== metrics.scrollHeight
  )) {
    return true;
  }

  return isAIChatScrollNearBottom(metrics);
};

const readScrollMetrics = (element: HTMLElement): AIChatScrollMetrics => ({
  clientHeight: element.clientHeight,
  scrollHeight: element.scrollHeight,
  scrollTop: element.scrollTop
});

export const queueAIChatViewportResizeScroll = (
  shouldFollow: () => boolean,
  scrollToLatestMessage: (behavior?: ScrollBehavior) => void,
  pendingFrameId: number | null,
  requestFrame: (callback: FrameRequestCallback) => number,
  cancelFrame: (frameId: number) => void
) => {
  if (pendingFrameId !== null) {
    cancelFrame(pendingFrameId);
  }

  if (!shouldFollow()) {
    return null;
  }

  return requestFrame(() => {
    if (shouldFollow()) {
      scrollToLatestMessage('auto');
    }
  });
};

interface ViewportOptions {
  isOpen: boolean;
  isHomeView: boolean;
  targetSessionId?: string;
  targetMessageId?: string;
  activeSessionId: string;
  activeSession: AIChatSession | null;
  sessions: AIChatSession[];
  isLoading: boolean;
  setActiveSessionId: (sessionId: string) => void;
  setIsHomeView: (isHomeView: boolean) => void;
  setKeyboardBottomInset: React.Dispatch<React.SetStateAction<number>>;
  messagesEndRef: React.MutableRefObject<HTMLDivElement | null>;
  messagesScrollContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  shouldKeepLatestMessageVisibleRef: React.MutableRefObject<boolean>;
  messageElementRefs: React.MutableRefObject<Map<string, HTMLDivElement | null>>;
  handledNavigationKeyRef: React.MutableRefObject<string>;
  wasOpenRef: React.MutableRefObject<boolean>;
  visualViewportBaselineRef: React.MutableRefObject<{ height: number; width: number }>;
  composerTextareaRef: React.MutableRefObject<HTMLTextAreaElement | null>;
}

export const useAIBackfillChatViewport = ({
  isOpen,
  isHomeView,
  targetSessionId,
  targetMessageId,
  activeSessionId,
  activeSession,
  sessions,
  isLoading,
  setActiveSessionId,
  setIsHomeView,
  setKeyboardBottomInset,
  messagesEndRef,
  messagesScrollContainerRef,
  shouldKeepLatestMessageVisibleRef,
  messageElementRefs,
  handledNavigationKeyRef,
  wasOpenRef,
  visualViewportBaselineRef
}: ViewportOptions) => {
  const previousScrollMetricsRef = useRef<AIChatScrollMetrics | null>(null);
  const previousMessagesRef = useRef<{ sessionId: string; count: number } | null>(null);
  const visibleConversationKeyRef = useRef<string | null>(null);
  const isConversationVisibleRef = useRef(false);
  isConversationVisibleRef.current = isOpen && !isHomeView;

  const scrollToLatestMessage = useCallback((behavior: ScrollBehavior = 'auto') => {
    const container = messagesScrollContainerRef.current;
    if (!isConversationVisibleRef.current || !container
      || !shouldKeepLatestMessageVisibleRef.current) {
      return;
    }

    // The sentinel is inside the padded content. Scrolling it into view leaves
    // the bottom padding unscrolled and can also move ancestor scroll containers.
    container.scrollTo({ top: container.scrollHeight, behavior });
    previousScrollMetricsRef.current = readScrollMetrics(container);
  }, [messagesScrollContainerRef, shouldKeepLatestMessageVisibleRef]);

  const handleConversationScroll = useCallback((element: HTMLElement) => {
    const metrics = readScrollMetrics(element);
    shouldKeepLatestMessageVisibleRef.current = getAIChatBottomFollowIntent(
      previousScrollMetricsRef.current,
      metrics,
      shouldKeepLatestMessageVisibleRef.current
    );
    previousScrollMetricsRef.current = metrics;
  }, [shouldKeepLatestMessageVisibleRef]);

  const handleComposerFocus = useCallback(() => {
    const scrollContainer = messagesScrollContainerRef.current;
    const shouldKeepLatestVisible = scrollContainer === null || getAIChatBottomFollowIntent(
      previousScrollMetricsRef.current,
      readScrollMetrics(scrollContainer),
      shouldKeepLatestMessageVisibleRef.current
    );
    shouldKeepLatestMessageVisibleRef.current = shouldKeepLatestVisible;
    return shouldKeepLatestVisible;
  }, [messagesScrollContainerRef, shouldKeepLatestMessageVisibleRef]);

  const handleComposerBlur = useCallback(() => {
    // Blur also precedes keyboard dismissal and send/menu clicks. Keep the
    // scroll intent until the user scrolls away or leaves this conversation.
    const scrollContainer = messagesScrollContainerRef.current;
    if (scrollContainer) {
      handleConversationScroll(scrollContainer);
    }
  }, [handleConversationScroll, messagesScrollContainerRef]);

  useEffect(() => {
    if (!isOpen || isHomeView) {
      shouldKeepLatestMessageVisibleRef.current = false;
      return;
    }

    const scrollContainer = messagesScrollContainerRef.current;
    if (!scrollContainer) {
      return;
    }

    let resizeFrameId: number | null = null;
    const shouldFollow = () => shouldKeepLatestMessageVisibleRef.current;
    const followLayoutResize = () => {
      resizeFrameId = queueAIChatViewportResizeScroll(
        shouldFollow,
        scrollToLatestMessage,
        resizeFrameId,
        window.requestAnimationFrame.bind(window),
        window.cancelAnimationFrame.bind(window)
      );
    };
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(followLayoutResize);

    resizeObserver?.observe(scrollContainer);
    const content = messagesEndRef.current?.parentElement;
    if (content) {
      resizeObserver?.observe(content);
    }
    window.addEventListener('resize', followLayoutResize);
    window.visualViewport?.addEventListener('resize', followLayoutResize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', followLayoutResize);
      window.visualViewport?.removeEventListener('resize', followLayoutResize);
      if (resizeFrameId !== null) {
        window.cancelAnimationFrame(resizeFrameId);
      }
    };
  }, [activeSessionId, Boolean(activeSession?.messages.length), isHomeView, isOpen, messagesEndRef, messagesScrollContainerRef, scrollToLatestMessage, shouldKeepLatestMessageVisibleRef]);

  const shouldUseVisualViewportKeyboardInset = !(Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android');
  const getKeyboardBottomInset = useCallback(() => {
    if (!shouldUseVisualViewportKeyboardInset || typeof window === 'undefined' || !window.visualViewport) {
      return 0;
    }

    const viewport = window.visualViewport;
    const currentVisibleHeight = viewport.height + viewport.offsetTop;
    const currentViewportWidth = viewport.width;

    if (currentVisibleHeight <= 0 || currentViewportWidth <= 0) {
      return 0;
    }

    const baseline = visualViewportBaselineRef.current;
    const widthDelta = Math.abs(currentViewportWidth - baseline.width);

    if (baseline.height === 0 || widthDelta > 120) {
      visualViewportBaselineRef.current = { height: currentVisibleHeight, width: currentViewportWidth };
      return 0;
    }

    if (currentVisibleHeight > baseline.height) {
      visualViewportBaselineRef.current = { height: currentVisibleHeight, width: currentViewportWidth };
      return 0;
    }

    const inset = Math.round(baseline.height - currentVisibleHeight);
    return inset > MOBILE_KEYBOARD_INSET_THRESHOLD ? inset : 0;
  }, [shouldUseVisualViewportKeyboardInset, visualViewportBaselineRef]);

  const activeNavigationKey = isOpen && targetSessionId
    ? `${targetSessionId}:${targetMessageId || ''}`
    : '';
  const hasPendingNavigation = Boolean(activeNavigationKey)
    && handledNavigationKeyRef.current !== activeNavigationKey;
  const hasResolvablePendingNavigation = hasPendingNavigation
    && Boolean(targetSessionId)
    && sessions.some((session) => session.id === targetSessionId);

  useLayoutEffect(() => {
    const conversationKey = isOpen && !isHomeView ? activeSessionId : null;
    const isEnteringConversation = conversationKey !== null
      && visibleConversationKeyRef.current !== conversationKey;
    visibleConversationKeyRef.current = conversationKey;
    wasOpenRef.current = isOpen;

    if (!conversationKey) {
      previousScrollMetricsRef.current = null;
      shouldKeepLatestMessageVisibleRef.current = false;
      return;
    }

    if (!isEnteringConversation) {
      return;
    }

    previousScrollMetricsRef.current = null;
    shouldKeepLatestMessageVisibleRef.current = !hasResolvablePendingNavigation;
    if (hasResolvablePendingNavigation) {
      return;
    }

    scrollToLatestMessage('auto');
    const frameId = window.requestAnimationFrame(() => {
      if (shouldKeepLatestMessageVisibleRef.current) {
        scrollToLatestMessage('auto');
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeSessionId, hasResolvablePendingNavigation, isHomeView, isOpen, scrollToLatestMessage, shouldKeepLatestMessageVisibleRef, wasOpenRef]);

  useEffect(() => {
    const previous = previousMessagesRef.current;
    const messages = activeSession?.messages || [];
    previousMessagesRef.current = { sessionId: activeSessionId, count: messages.length };
    if (!isOpen || isHomeView || hasResolvablePendingNavigation) {
      return;
    }

    if (previous?.sessionId === activeSessionId
      && messages.slice(previous.count).some((message) => message.role === 'user')) {
      shouldKeepLatestMessageVisibleRef.current = true;
    }
    if (!shouldKeepLatestMessageVisibleRef.current) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      if (shouldKeepLatestMessageVisibleRef.current) {
        scrollToLatestMessage('auto');
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeSession?.messages, activeSessionId, hasResolvablePendingNavigation, isHomeView, isLoading, isOpen, scrollToLatestMessage, shouldKeepLatestMessageVisibleRef]);

  useEffect(() => {
    if (!isOpen) {
      visualViewportBaselineRef.current = { height: 0, width: 0 };
      setKeyboardBottomInset(0);
      return;
    }

    if (!shouldUseVisualViewportKeyboardInset || typeof window === 'undefined' || !window.visualViewport) {
      setKeyboardBottomInset(0);
      return;
    }

    const viewport = window.visualViewport;
    let frameId: number | null = null;

    const syncKeyboardBottomInset = () => {
      const nextInset = getKeyboardBottomInset();
      setKeyboardBottomInset((current) => (current === nextInset ? current : nextInset));

      frameId = queueAIChatViewportResizeScroll(
        () => shouldKeepLatestMessageVisibleRef.current,
        scrollToLatestMessage,
        frameId,
        window.requestAnimationFrame.bind(window),
        window.cancelAnimationFrame.bind(window)
      );
    };

    syncKeyboardBottomInset();
    viewport.addEventListener('resize', syncKeyboardBottomInset);
    viewport.addEventListener('scroll', syncKeyboardBottomInset);
    window.addEventListener('resize', syncKeyboardBottomInset);

    return () => {
      viewport.removeEventListener('resize', syncKeyboardBottomInset);
      viewport.removeEventListener('scroll', syncKeyboardBottomInset);
      window.removeEventListener('resize', syncKeyboardBottomInset);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [getKeyboardBottomInset, isOpen, scrollToLatestMessage, setKeyboardBottomInset, shouldKeepLatestMessageVisibleRef, shouldUseVisualViewportKeyboardInset, visualViewportBaselineRef]);

  useEffect(() => {
    if (!isOpen) {
      handledNavigationKeyRef.current = '';
      return;
    }

    if (!targetSessionId || !hasPendingNavigation) {
      return;
    }

    setIsHomeView(false);
    shouldKeepLatestMessageVisibleRef.current = false;

    if (!sessions.some((session) => session.id === targetSessionId)) {
      handledNavigationKeyRef.current = activeNavigationKey;
      return;
    }

    if (activeSessionId !== targetSessionId) {
      setActiveSessionId(targetSessionId);
      return;
    }

    if (isHomeView) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      if (targetMessageId) {
        const targetElement = messageElementRefs.current.get(targetMessageId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const container = messagesScrollContainerRef.current;
          previousScrollMetricsRef.current = container ? readScrollMetrics(container) : null;
          handledNavigationKeyRef.current = activeNavigationKey;
          return;
        }
      }

      shouldKeepLatestMessageVisibleRef.current = true;
      scrollToLatestMessage();
      handledNavigationKeyRef.current = activeNavigationKey;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeNavigationKey, activeSession?.messages, activeSessionId, hasPendingNavigation, isHomeView, isOpen, messageElementRefs, messagesScrollContainerRef, scrollToLatestMessage, sessions, setActiveSessionId, setIsHomeView, shouldKeepLatestMessageVisibleRef, targetMessageId, targetSessionId]);

  return {
    handleComposerBlur,
    handleComposerFocus,
    handleConversationScroll,
    scrollToLatestMessage
  };
};
