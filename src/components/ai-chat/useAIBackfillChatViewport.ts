/**
 * @file useAIBackfillChatViewport.ts
 * @input AI chat session navigation, message DOM refs, and viewport lifecycle state
 * @output Scroll helpers and keyboard-safe viewport effects for AIBackfillChatModal
 * @pos Component Support (AI Integration)
 * @description Keeps message scrolling, deep-link navigation, and visual viewport keyboard handling out of the main chat coordinator.
 * @updated 2026-09-30: Tracks bottom intent and follows keyboard-driven conversation resizing without interrupting older-message reading.
 */
import { useCallback, useEffect } from 'react';
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

export const shouldFollowAIChatViewportResize = (
  shouldKeepLatestVisible: boolean,
  activeElement: Element | null,
  composerTextarea: HTMLTextAreaElement | null
) => shouldKeepLatestVisible && composerTextarea !== null && activeElement === composerTextarea;

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
  visualViewportBaselineRef,
  composerTextareaRef
}: ViewportOptions) => {
  const scrollToLatestMessage = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, [messagesEndRef]);

  const handleConversationScroll = useCallback((element: HTMLElement) => {
    shouldKeepLatestMessageVisibleRef.current = isAIChatScrollNearBottom(element);
  }, [shouldKeepLatestMessageVisibleRef]);

  const handleComposerFocus = useCallback(() => {
    const scrollContainer = messagesScrollContainerRef.current;
    const shouldKeepLatestVisible = scrollContainer === null
      || isAIChatScrollNearBottom(scrollContainer);
    shouldKeepLatestMessageVisibleRef.current = shouldKeepLatestVisible;
    return shouldKeepLatestVisible;
  }, [messagesScrollContainerRef, shouldKeepLatestMessageVisibleRef]);

  const handleComposerBlur = useCallback(() => {
    shouldKeepLatestMessageVisibleRef.current = false;
  }, [shouldKeepLatestMessageVisibleRef]);

  useEffect(() => {
    if (!isOpen || isHomeView) {
      shouldKeepLatestMessageVisibleRef.current = false;
      return;
    }

    const scrollContainer = messagesScrollContainerRef.current;
    if (!scrollContainer || typeof ResizeObserver === 'undefined') {
      return;
    }

    let resizeFrameId: number | null = null;
    const shouldFollow = () => shouldFollowAIChatViewportResize(
      shouldKeepLatestMessageVisibleRef.current,
      document.activeElement,
      composerTextareaRef.current
    );
    const resizeObserver = new ResizeObserver(() => {
      resizeFrameId = queueAIChatViewportResizeScroll(
        shouldFollow,
        scrollToLatestMessage,
        resizeFrameId,
        window.requestAnimationFrame.bind(window),
        window.cancelAnimationFrame.bind(window)
      );
    });

    resizeObserver.observe(scrollContainer);

    return () => {
      resizeObserver.disconnect();
      if (resizeFrameId !== null) {
        window.cancelAnimationFrame(resizeFrameId);
      }
    };
  }, [composerTextareaRef, isHomeView, isOpen, messagesScrollContainerRef, scrollToLatestMessage, shouldKeepLatestMessageVisibleRef]);

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

  useEffect(() => {
    if (hasResolvablePendingNavigation) {
      return;
    }

    scrollToLatestMessage();
  }, [activeSession?.messages, activeSessionId, hasResolvablePendingNavigation, isLoading, scrollToLatestMessage]);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (!isOpen || wasOpen || hasResolvablePendingNavigation) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      scrollToLatestMessage('auto');
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [hasResolvablePendingNavigation, isOpen, scrollToLatestMessage, wasOpenRef]);

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

      if (nextInset > 0 && shouldFollowAIChatViewportResize(
        shouldKeepLatestMessageVisibleRef.current,
        document.activeElement,
        composerTextareaRef.current
      )) {
        if (frameId !== null) {
          window.cancelAnimationFrame(frameId);
        }
        frameId = window.requestAnimationFrame(() => {
          scrollToLatestMessage('auto');
        });
      }
    };

    syncKeyboardBottomInset();
    viewport.addEventListener('resize', syncKeyboardBottomInset);
    viewport.addEventListener('scroll', syncKeyboardBottomInset);

    return () => {
      viewport.removeEventListener('resize', syncKeyboardBottomInset);
      viewport.removeEventListener('scroll', syncKeyboardBottomInset);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [composerTextareaRef, getKeyboardBottomInset, isOpen, scrollToLatestMessage, setKeyboardBottomInset, shouldKeepLatestMessageVisibleRef, shouldUseVisualViewportKeyboardInset, visualViewportBaselineRef]);

  useEffect(() => {
    if (!isOpen) {
      handledNavigationKeyRef.current = '';
      return;
    }

    if (!targetSessionId || !hasPendingNavigation) {
      return;
    }

    setIsHomeView(false);

    if (!sessions.some((session) => session.id === targetSessionId)) {
      handledNavigationKeyRef.current = activeNavigationKey;
      return;
    }

    if (activeSessionId !== targetSessionId) {
      setActiveSessionId(targetSessionId);
      return;
    }

    window.requestAnimationFrame(() => {
      if (targetMessageId) {
        const targetElement = messageElementRefs.current.get(targetMessageId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          handledNavigationKeyRef.current = activeNavigationKey;
          return;
        }
      }

      scrollToLatestMessage();
      handledNavigationKeyRef.current = activeNavigationKey;
    });
  }, [activeNavigationKey, activeSession?.messages, activeSessionId, hasPendingNavigation, isOpen, messageElementRefs, scrollToLatestMessage, sessions, setActiveSessionId, setIsHomeView, targetMessageId, targetSessionId]);

  return {
    handleComposerBlur,
    handleComposerFocus,
    handleConversationScroll,
    scrollToLatestMessage
  };
};
