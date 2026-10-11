/**
 * @file useNoteFocus.ts
 * @input Native note textarea and its modal scroll container refs
 * @output Note shortcut with bounded keyboard/layout position correction
 * @pos Hook (Record Note Navigation)
 * @updated 2026-10-11: Corrects delayed keyboard panning and native scrolling without smooth-scroll races or interrupting manual navigation.
 */
import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export const useNoteFocus = (
  noteRef: RefObject<HTMLTextAreaElement | null>,
  containerRef: RefObject<HTMLElement | null>
) => {
  const beginAlignmentRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const note = noteRef.current;
    const container = containerRef.current;
    if (!note || !container) return;
    const viewport = window.visualViewport;
    let timer: number | undefined;
    let alignmentDeadline = 0;
    const cancelAlignment = () => {
      alignmentDeadline = 0;
      window.clearTimeout(timer);
    };
    const align = () => {
      if (document.activeElement !== note || Date.now() >= alignmentDeadline) return;
      const visibleTop = Math.max(container.getBoundingClientRect().top, viewport?.offsetTop ?? 0);
      const target = container.scrollTop + note.getBoundingClientRect().top - visibleTop - 24;
      const top = Math.max(0, Math.min(target, container.scrollHeight - container.clientHeight));
      if (Math.abs(container.scrollTop - top) > 1) {
        // Cancel any native/in-flight smooth scroll before applying the current geometry.
        container.scrollTo({ top, behavior: 'instant' });
      }
    };
    const scheduleAlignment = () => {
      window.clearTimeout(timer);
      if (document.activeElement !== note || Date.now() >= alignmentDeadline) return;
      timer = window.setTimeout(align, 100);
    };
    const beginAlignment = () => {
      alignmentDeadline = Date.now() + 1500;
      align();
      scheduleAlignment();
    };
    beginAlignmentRef.current = beginAlignment;
    note.addEventListener('focus', beginAlignment);
    note.addEventListener('blur', cancelAlignment);
    note.addEventListener('keydown', cancelAlignment);
    note.addEventListener('input', cancelAlignment);
    viewport?.addEventListener('resize', scheduleAlignment);
    viewport?.addEventListener('scroll', scheduleAlignment);
    window.addEventListener('resize', scheduleAlignment);
    window.addEventListener('scroll', scheduleAlignment);
    container.addEventListener('scroll', scheduleAlignment);
    container.addEventListener('pointerdown', cancelAlignment, { passive: true });
    container.addEventListener('touchmove', cancelAlignment, { passive: true });
    container.addEventListener('wheel', cancelAlignment, { passive: true });
    const observer = new ResizeObserver(scheduleAlignment);
    observer.observe(container);
    observer.observe(note);
    return () => {
      cancelAlignment();
      beginAlignmentRef.current = null;
      observer.disconnect();
      note.removeEventListener('focus', beginAlignment);
      note.removeEventListener('blur', cancelAlignment);
      note.removeEventListener('keydown', cancelAlignment);
      note.removeEventListener('input', cancelAlignment);
      viewport?.removeEventListener('resize', scheduleAlignment);
      viewport?.removeEventListener('scroll', scheduleAlignment);
      window.removeEventListener('resize', scheduleAlignment);
      window.removeEventListener('scroll', scheduleAlignment);
      container.removeEventListener('scroll', scheduleAlignment);
      container.removeEventListener('pointerdown', cancelAlignment);
      container.removeEventListener('touchmove', cancelAlignment);
      container.removeEventListener('wheel', cancelAlignment);
    };
  }, [noteRef, containerRef]);

  return useCallback(() => {
    const note = noteRef.current;
    if (!note) return;
    note.focus({ preventScroll: true });
    note.setSelectionRange(note.value.length, note.value.length);
    // Also restart when the shortcut is tapped while the note already has focus.
    beginAlignmentRef.current?.();
  }, [noteRef]);
};
