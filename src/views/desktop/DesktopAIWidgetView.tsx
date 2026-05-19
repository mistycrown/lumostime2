/**
 * @file DesktopAIWidgetView.tsx
 * @input Desktop AI window edge-hide state from Electron preload plus the shared in-app AI chat modal
 * @output Compact always-on-top Electron AI chat widget that can collapse into an edge handle without unmounting the chat engine
 * @pos View (Desktop widget)
 * @description Reuses the full app provider tree and the shared AI chat implementation, but renders it inside a compact desktop shell with edge-hide controls for quick desktop conversations.
 * @updated 2026-05-19: Added transparent edge and corner resize handles so the frameless AI widget can be freely resized from any side while expanded.
 * @updated 2026-05-18: Added the first desktop AI widget shell with preload-driven edge-hide state, restore handling, and compact AI chat rendering.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AIBackfillChatModal } from '../../components/AIBackfillChatModal';

interface DesktopAIWidgetWindowState {
  isHiddenToEdge: boolean;
  hiddenEdge: 'left' | 'right' | null;
}

const DEFAULT_WINDOW_STATE: DesktopAIWidgetWindowState = {
  isHiddenToEdge: false,
  hiddenEdge: null
};

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const DesktopAIWidgetView: React.FC = () => {
  const [windowState, setWindowState] = useState<DesktopAIWidgetWindowState>(DEFAULT_WINDOW_STATE);
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  const setPointerInside = (inside: boolean) => {
    window.desktopWidget?.setAIPointerInside?.(inside);
  };

  const setResizing = (resizing: boolean) => {
    window.desktopWidget?.setAIResizing?.(resizing);
  };

  const startResize = useCallback(async (event: React.MouseEvent<HTMLDivElement>, direction: ResizeDirection) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.screenX;
    const startY = event.screenY;
    const startBounds = await window.desktopWidget?.getBounds?.();
    if (!startBounds) {
      return;
    }

    const minWidth = 320;
    const minHeight = 420;
    setPointerInside(true);
    setResizing(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.screenX - startX;
      const dy = moveEvent.screenY - startY;

      let nextWidth = startBounds.width;
      let nextHeight = startBounds.height;
      let nextX = startBounds.x;
      let nextY = startBounds.y;

      if (direction.includes('e')) {
        nextWidth = Math.max(minWidth, startBounds.width + dx);
      }

      if (direction.includes('w')) {
        const candidateWidth = startBounds.width - dx;
        if (candidateWidth >= minWidth) {
          nextWidth = candidateWidth;
          nextX = startBounds.x + dx;
        }
      }

      if (direction.includes('s')) {
        nextHeight = Math.max(minHeight, startBounds.height + dy);
      }

      if (direction.includes('n')) {
        const candidateHeight = startBounds.height - dy;
        if (candidateHeight >= minHeight) {
          nextHeight = candidateHeight;
          nextY = startBounds.y + dy;
        }
      }

      window.desktopWidget?.setBounds?.({
        x: Math.round(nextX),
        y: Math.round(nextY),
        width: Math.round(nextWidth),
        height: Math.round(nextHeight)
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      resizeCleanupRef.current = null;
      setResizing(false);
      setPointerInside(false);
    };

    resizeCleanupRef.current?.();
    resizeCleanupRef.current = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const hydrateWindowState = async () => {
      try {
        const nextState = await window.desktopWidget?.getAIWindowState?.();
        if (isMounted && nextState) {
          setWindowState(nextState);
        }
      } catch (error) {
        console.error('Failed to load desktop AI widget state', error);
      }
    };

    void hydrateWindowState();

    const unsubscribe = window.desktopWidget?.onAIWindowState?.((nextState) => {
      setWindowState(nextState);
    });

    setPointerInside(false);

    return () => {
      isMounted = false;
      unsubscribe?.();
      resizeCleanupRef.current?.();
      resizeCleanupRef.current = null;
      setResizing(false);
      setPointerInside(false);
    };
  }, []);

  return (
    <div
      className="relative h-screen w-screen"
      onMouseEnter={() => setPointerInside(true)}
      onMouseLeave={() => setPointerInside(false)}
    >
      <AIBackfillChatModal
        isOpen
        onClose={() => window.desktopWidget?.closeAI?.()}
        displayMode="desktop-widget"
        edgeHidden={windowState.isHiddenToEdge}
        hiddenEdge={windowState.hiddenEdge}
        onHideToEdge={() => window.desktopWidget?.hideAIToEdge?.()}
        onRestoreFromEdge={() => window.desktopWidget?.restoreAIFromEdge?.()}
        onOpenMainApp={() => window.desktopWidget?.openMainApp()}
      />
      {!windowState.isHiddenToEdge && (
        <div className="pointer-events-none absolute inset-0 z-[120]">
          <div
            className="pointer-events-auto absolute bottom-0 left-2 right-2 h-2.5 cursor-s-resize"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.001)' }}
            onMouseDown={(event) => void startResize(event, 's')}
          />
          <div
            className="pointer-events-auto absolute right-0 top-2 bottom-2 w-2.5 cursor-e-resize"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.001)' }}
            onMouseDown={(event) => void startResize(event, 'e')}
          />
          <div
            className="pointer-events-auto absolute top-0 left-2 right-2 h-2.5 cursor-n-resize"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.001)' }}
            onMouseDown={(event) => void startResize(event, 'n')}
          />
          <div
            className="pointer-events-auto absolute left-0 top-2 bottom-2 w-2.5 cursor-w-resize"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.001)' }}
            onMouseDown={(event) => void startResize(event, 'w')}
          />
          <div
            className="pointer-events-auto absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.001)' }}
            onMouseDown={(event) => void startResize(event, 'se')}
          />
          <div
            className="pointer-events-auto absolute bottom-0 left-0 h-4 w-4 cursor-sw-resize"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.001)' }}
            onMouseDown={(event) => void startResize(event, 'sw')}
          />
          <div
            className="pointer-events-auto absolute top-0 right-0 h-4 w-4 cursor-ne-resize"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.001)' }}
            onMouseDown={(event) => void startResize(event, 'ne')}
          />
          <div
            className="pointer-events-auto absolute top-0 left-0 h-4 w-4 cursor-nw-resize"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.001)' }}
            onMouseDown={(event) => void startResize(event, 'nw')}
          />
        </div>
      )}
    </div>
  );
};
