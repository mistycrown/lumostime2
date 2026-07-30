/**
 * @file usePointerDrag.ts
 * @description Shared pointer drag lifecycle for row-based timeline sidebars.
 * @updated 2026-07-30: Extracted the common pointer capture, document listener, and drag feedback loop from the timeline todo and quick-color sidebars.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export type PointerDragIntent = 'pending' | 'drag' | 'scroll';

export interface PointerDragFeedback {
  x: number;
  y: number;
  isTarget: boolean;
}

interface PointerDragSession {
  pointerId: number;
  startX: number;
  startY: number;
  canDrag: boolean;
  intent: PointerDragIntent;
}

interface UsePointerDragOptions {
  threshold: number;
  resolveIntent: (deltaX: number, deltaY: number) => PointerDragIntent;
  onSelect: () => void;
  onDragMove: (clientX: number, clientY: number) => boolean;
  onDragEnd: () => void;
  onDrop: (clientX: number, clientY: number) => boolean;
  onDropSuccess?: () => void;
}

export const usePointerDrag = ({
  threshold,
  resolveIntent,
  onSelect,
  onDragMove,
  onDragEnd,
  onDrop,
  onDropSuccess
}: UsePointerDragOptions) => {
  const dragRef = useRef<PointerDragSession | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragFeedback, setDragFeedback] = useState<PointerDragFeedback | null>(null);

  const clearDrag = useCallback(() => {
    const wasDragging = dragRef.current?.intent === 'drag';
    dragRef.current = null;
    setIsDragging(false);
    setDragFeedback(null);
    if (wasDragging) onDragEnd();
  }, [onDragEnd]);

  const beginDrag = useCallback((event: ReactPointerEvent<HTMLElement>, canDrag = true) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return false;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      canDrag,
      intent: 'pending'
    };
    return true;
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      if (drag.intent === 'drag') {
        const isTarget = onDragMove(event.clientX, event.clientY);
        setDragFeedback((previous) => (
          previous && previous.x === event.clientX && previous.y === event.clientY && previous.isTarget === isTarget
            ? previous
            : { x: event.clientX, y: event.clientY, isTarget }
        ));
        event.preventDefault();
        return;
      }

      if (drag.intent !== 'pending') return;

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      if (Math.hypot(deltaX, deltaY) <= threshold) return;

      drag.intent = drag.canDrag ? resolveIntent(deltaX, deltaY) : 'scroll';
      if (drag.intent === 'drag') {
        setIsDragging(true);
        const isTarget = onDragMove(event.clientX, event.clientY);
        setDragFeedback({ x: event.clientX, y: event.clientY, isTarget });
        event.preventDefault();
        return;
      }

      if (drag.intent === 'scroll') {
        clearDrag();
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      if (drag.intent === 'drag') {
        if (onDrop(event.clientX, event.clientY)) {
          onDropSuccess?.();
        }
      } else if (drag.intent === 'pending') {
        onSelect();
      }
      clearDrag();
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (dragRef.current?.pointerId === event.pointerId) clearDrag();
    };

    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [clearDrag, onDragMove, onDrop, onDropSuccess, onSelect, resolveIntent, threshold]);

  return {
    beginDrag,
    dragFeedback,
    isDragging
  };
};
