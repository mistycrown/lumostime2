/**
 * @file AIBackfillChatSettingsOverlay.tsx
 * @input Settings overlay visibility, active tab, theme tokens, and tab content nodes
 * @output Shared AI settings overlay shell with tab switching
 * @pos Component Support (AI Integration)
 * @description Extracts the AI settings overlay frame out of AIBackfillChatModal so the modal can focus on supplying section content rather than carrying the shell and tab chrome inline.
 * @updated 2026-05-15: Extracted the AI settings overlay shell from AIBackfillChatModal.
 */
import React from 'react';
import { X } from 'lucide-react';
import type { AISettingsMainTab } from './AIBackfillChatShared';

interface AIChatSettingsOverlayTheme {
  chipBorder: string;
  overlayLight: string;
  panelBg: string;
  panelBorder: string;
  textMuted: string;
}

interface AIBackfillChatSettingsOverlayProps {
  activeTab: AISettingsMainTab;
  callContent: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  onTabChange: (tab: AISettingsMainTab) => void;
  personaContent: React.ReactNode;
  theme: AIChatSettingsOverlayTheme;
}

export const AIBackfillChatSettingsOverlay: React.FC<AIBackfillChatSettingsOverlayProps> = ({
  activeTab,
  callContent,
  isOpen,
  onClose,
  onTabChange,
  personaContent,
  theme
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-10 backdrop-blur-[10px]" style={{ backgroundColor: theme.overlayLight }}>
      <div
        className="flex h-full flex-col"
        style={{
          paddingTop: 'var(--app-safe-area-top)',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        <div
          className="flex h-14 items-center justify-between border-b px-4 backdrop-blur-md"
          style={{
            borderColor: theme.panelBorder,
            backgroundColor: theme.panelBg
          }}
        >
          <h3 className="font-serif text-lg font-bold leading-none text-stone-800">AI 设置</h3>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] border transition-colors"
            style={{
              borderColor: theme.chipBorder,
              backgroundColor: theme.panelBg,
              color: theme.textMuted
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-5 sm:px-12">
          <div className="mx-auto max-w-4xl">
            <div className="mb-5 flex gap-6 overflow-x-auto border-b border-stone-200 no-scrollbar">
              {([
                { id: 'persona', label: '人设设置' },
                { id: 'call', label: '调用设置' }
              ] as Array<{ id: AISettingsMainTab; label: string }>).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`pb-3 text-sm font-serif tracking-wide whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-stone-900 font-bold text-stone-900'
                      : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'persona' ? personaContent : callContent}
          </div>
        </div>
      </div>
    </div>
  );
};
