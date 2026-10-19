/**
 * @file useTodoReminderNavigation.ts
 * @input Live todos, detail navigation and app lifecycle events
 * @output Reminder notification navigation, resume reconciliation and error feedback
 * @pos Hook
 * @updated 2026-10-17: Opens the current saved todo after cold/warm notification clicks.
 */
import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import type { TodoItem } from '../types';
import { useToast } from '../contexts/ToastContext';
import { todoReminderService, TODO_REMINDER_OPEN_EVENT, TODO_REMINDER_STATUS_EVENT } from '../services/todoReminderService';

export const useTodoReminderNavigation = (todos: TodoItem[], onOpen: (todo: TodoItem) => void): void => {
  const { addToast } = useToast();
  const state = useRef({ todos, onOpen, addToast });
  state.current = { todos, onOpen, addToast };

  useEffect(() => {
    let disposed = false;
    let checking = false;
    let shownError = '';
    const open = (id?: string) => {
      if (!id || disposed) return;
      const todo = state.current.todos.find((item) => item.id === id);
      if (todo) state.current.onOpen(todo);
      else state.current.addToast('info', '此待办已删除');
    };
    const checkNavigation = async () => {
      if (checking || disposed) return;
      checking = true;
      try { open((await todoReminderService.consumeNavigation()).todoId); }
      catch (error) { console.error('[TodoReminder] Notification navigation failed', error); }
      finally { checking = false; }
    };
    const resume = () => {
      if (document.visibilityState === 'hidden') return;
      void todoReminderService.refresh().catch((error) => console.error('[TodoReminder] Resume sync failed', error));
      void checkNavigation();
    };
    const onOpenEvent = (event: Event) => open((event as CustomEvent<{ todoId?: string }>).detail?.todoId);
    const onStatus = (event: Event) => {
      const error = (event as CustomEvent<{ error?: string }>).detail?.error || '';
      if (error && error !== shownError) state.current.addToast('error', '本地提醒设置失败，请重新打开提醒设置重试');
      shownError = error;
    };
    window.addEventListener(TODO_REMINDER_OPEN_EVENT, onOpenEvent);
    window.addEventListener(TODO_REMINDER_STATUS_EVENT, onStatus);
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    const listener = Capacitor.isNativePlatform()
      ? App.addListener('appStateChange', ({ isActive }) => { if (isActive) resume(); }) : undefined;
    const urlListener = Capacitor.isNativePlatform() ? App.addListener('appUrlOpen', () => void checkNavigation()) : undefined;
    void checkNavigation();
    return () => {
      disposed = true;
      window.removeEventListener(TODO_REMINDER_OPEN_EVENT, onOpenEvent);
      window.removeEventListener(TODO_REMINDER_STATUS_EVENT, onStatus);
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
      void listener?.then((handle) => handle.remove());
      void urlListener?.then((handle) => handle.remove());
    };
  }, []);
};
