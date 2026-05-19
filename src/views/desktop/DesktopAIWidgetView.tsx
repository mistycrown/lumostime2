/**
 * @file DesktopAIWidgetView.tsx
 * @input Desktop AI window edge-hide state from Electron preload plus the shared in-app AI chat modal
 * @output Compact always-on-top Electron AI chat widget that can collapse into an edge handle without unmounting the chat engine
 * @pos View (Desktop widget)
 * @description Reuses the full app provider tree and the shared AI chat implementation, but renders it inside a compact desktop shell with edge-hide controls for quick desktop conversations.
 * @updated 2026-05-18: Added the first desktop AI widget shell with preload-driven edge-hide state, restore handling, and compact AI chat rendering.
 */
import React, { useEffect, useState } from 'react';
import { AIBackfillChatModal } from '../../components/AIBackfillChatModal';

interface DesktopAIWidgetWindowState {
  isHiddenToEdge: boolean;
  hiddenEdge: 'left' | 'right' | null;
}

const DEFAULT_WINDOW_STATE: DesktopAIWidgetWindowState = {
  isHiddenToEdge: false,
  hiddenEdge: null
};

export const DesktopAIWidgetView: React.FC = () => {
  const [windowState, setWindowState] = useState<DesktopAIWidgetWindowState>(DEFAULT_WINDOW_STATE);

  const setPointerInside = (inside: boolean) => {
    window.desktopWidget?.setAIPointerInside?.(inside);
  };

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
      setPointerInside(false);
    };
  }, []);

  return (
    <div
      className="h-screen w-screen"
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
    </div>
  );
};
