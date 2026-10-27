/**
 * @file useTodoDateDialog.ts
 * @input Dialog element, enabled state and dismiss callback
 * @output Focus containment, scroll lock and topmost dialog dismissal
 * @pos Hook (Todo date actions)
 * @updated 2026-10-27: Supports nested date actions and plan editors with Android back and Escape.
 */
import { useEffect, useRef } from 'react';
import { registerHardwareBackHandler } from '../utils/hardwareBackHandlerStack';

export const useTodoDateDialog = (onClose: () => void, enabled = true) => {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!enabled) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]');
    focusable()?.[0]?.focus();
    const unregister = registerHardwareBackHandler(() => { close.current(); return true; });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close.current();
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      unregister();
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [enabled]);

  return panel;
};
