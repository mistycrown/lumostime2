/**
 * @file useFloatingWindow.ts
 * @input SessionContext active sessions, session cancellation, toast, and app-side stop callback
 * @output Floating window event bridge for ending active focus sessions from Android
 * @pos Hook (System Integration)
 * @description Listens for Android floating-window stop events and resolves them against app or widget-origin sessions without duplicating widget logs.
 * @updated 2026-05-05: Honors native session ids and cancels widget-origin sessions locally after native-side shutdown so floating-window stops work for widget-started focus.
 */
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSession } from '../contexts/SessionContext';
import { useToast } from '../contexts/ToastContext';

type FloatingStopDetail = {
  sessionId?: string;
};

const parseFloatingStopDetail = (event: Event): FloatingStopDetail => {
  const customEvent = event as CustomEvent<unknown>;
  const { detail } = customEvent;

  if (!detail) {
    return {};
  }

  if (typeof detail === 'string') {
    try {
      const parsed = JSON.parse(detail) as FloatingStopDetail;
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
      return {};
    }
  }

  if (typeof detail === 'object') {
    return detail as FloatingStopDetail;
  }

  return {};
};

export const useFloatingWindow = (
  handleStopActivity: (sessionId: string) => void
) => {
  const { activeSessions, cancelSession } = useSession();
  const { addToast } = useToast();

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    const handleStopFromFloating = (event: Event) => {
      const { sessionId } = parseFloatingStopDetail(event);
      const sessionsToStop = sessionId
        ? activeSessions.filter((session) => session.id === sessionId)
        : activeSessions;

      if (sessionsToStop.length === 0) {
        return;
      }

      sessionsToStop.forEach((session) => {
        if (session.source === 'widget' && sessionId) {
          cancelSession(session.id);
          return;
        }

        handleStopActivity(session.id);
      });

      addToast('success', '已从悬浮球结束计时');
    };

    window.addEventListener('stopFocusFromFloating', handleStopFromFloating);
    return () => {
      window.removeEventListener('stopFocusFromFloating', handleStopFromFloating);
    };
  }, [activeSessions, addToast, cancelSession, handleStopActivity]);
};
