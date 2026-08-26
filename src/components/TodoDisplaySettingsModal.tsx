/**
 * @file TodoDisplaySettingsModal.tsx
 * @input Visibility state, compact display settings, and toggle callbacks
 * @output Modal-based todo display setting updates
 * @pos Component (Modal)
 * @description Lets users adjust completed visibility and compact-row metadata visibility from the Todo sidebar.
 * @updated 2026-05-18: Added bg-[rgba(15,23,42,0.12)] and backdrop-blur-sm to the outermost backdrop div to restore background blur and align it with the quick-actions sheet backdrop.
 * @updated 2026-08-26: Raised the mobile display-settings sheet above the fixed bottom navigation by increasing its outer bottom inset while preserving the desktop position.
 * @updated 2026-05-11: Aligned the card glass treatment and control sizing with the schedule shortcut menu so display-settings popups now use the same blur, fill, and larger typography.
 * @updated 2026-05-11: Removed the misplaced full-screen blur scrim so the modal no longer tries to simulate background blur from the wrong layer.
 * @updated 2026-05-11: Added a dedicated full-screen blur scrim behind the popup and made the card fill more opaque so the background stays soft without making the text glow.
 * @updated 2026-05-11: Moved the frosted blur onto the modal card background layer so Android/WebView no longer gives display-settings text a false outer glow.
 * @updated 2026-05-05: Added a dedicated display-settings modal for completed-task visibility and compact-mode metadata toggles.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import React, { useEffect } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { registerHardwareBackHandler } from '../utils/hardwareBackHandlerStack';

export interface TodoCompactDisplaySettings {
  showLinkedTag: boolean;
  showLinkedScope: boolean;
  showScheduleType: boolean;
  showProgressIndicator: boolean;
  showScheduleTime: boolean;
}

interface TodoDisplaySettingsModalProps {
  isOpen: boolean;
  showCompletedTodos: boolean;
  compactDisplaySettings: TodoCompactDisplaySettings;
  onToggleShowCompletedTodos: () => void;
  onToggleCompactSetting: (key: keyof TodoCompactDisplaySettings) => void;
  onClose: () => void;
  onForceClose?: () => void;
}

const COMPACT_SETTING_ITEMS: Array<{ key: keyof TodoCompactDisplaySettings; label: string }> = [
  { key: 'showLinkedTag', label: '关联标签' },
  { key: 'showLinkedScope', label: '关联领域' },
  { key: 'showScheduleType', label: '排期类型' },
  { key: 'showProgressIndicator', label: '进度图示' },
  { key: 'showScheduleTime', label: '排期时间' }
];

const ToggleRow: React.FC<{
  label: string;
  checked: boolean;
  isLast?: boolean;
  onToggle: () => void;
}> = ({ label, checked, isLast = false, onToggle }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onToggle}
    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-50/80 ${isLast ? '' : 'border-b border-stone-100'}`}
  >
    <span className="text-sm font-medium text-stone-700">{label}</span>
    <span
      className={`flex h-7 w-12 flex-shrink-0 items-center rounded-full px-1 transition-colors ${checked ? 'bg-stone-800' : 'bg-stone-200'}`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </span>
  </button>
);

export const TodoDisplaySettingsModal: React.FC<TodoDisplaySettingsModalProps> = ({
  isOpen,
  showCompletedTodos,
  compactDisplaySettings,
  onToggleShowCompletedTodos,
  onToggleCompactSetting,
  onClose,
  onForceClose
}) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      if (onForceClose) {
        onForceClose();
        return;
      }

      onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onForceClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    return registerHardwareBackHandler(() => {
      if (onForceClose) {
        onForceClose();
      } else {
        onClose();
      }

      return true;
    });
  }, [isOpen, onClose, onForceClose]);

  if (!isOpen) return null;

  const handleBackdropPointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    event.stopPropagation();
  };

  const handleBackdropClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (onForceClose) {
      onForceClose();
      return;
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[135] flex items-end justify-center bg-[rgba(15,23,42,0.12)] px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-12 backdrop-blur-sm md:items-center md:pb-4"
      onPointerDown={handleBackdropPointerDown}
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-[24rem] overflow-hidden rounded-[2rem] border border-stone-200/80 shadow-[0_12px_30px_rgba(28,25,23,0.12)]"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[#faf9f6]/95 backdrop-blur-sm"
        />

        <div className="relative z-10">
          <div className="relative border-b border-stone-200 px-5 py-4 pr-16">
            <div className="flex items-center gap-2 text-[0.82rem] font-medium tracking-[0.08em] text-stone-500">
              <SlidersHorizontal size={14} className="text-stone-400" />
              <span>显示设置</span>
            </div>
            <button
              type="button"
              onClick={onForceClose || onClose}
              className="absolute right-4 top-3 rounded-full px-2 py-1.5 text-[0.82rem] text-stone-400 transition-colors hover:bg-stone-100/70 hover:text-stone-600"
              title="关闭"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-4 px-4 py-4">
            <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white/88">
              <ToggleRow
                label="显示已完成任务"
                checked={showCompletedTodos}
                onToggle={onToggleShowCompletedTodos}
              />
            </section>

            <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white/88">
              <div className="border-b border-stone-100 px-4 py-3 text-[0.72rem] font-medium tracking-[0.08em] text-stone-400">
                紧缩模式标签显示
              </div>
              {COMPACT_SETTING_ITEMS.map((item, index) => (
                <ToggleRow
                  key={item.key}
                  label={item.label}
                  checked={compactDisplaySettings[item.key]}
                  isLast={index === COMPACT_SETTING_ITEMS.length - 1}
                  onToggle={() => onToggleCompactSetting(item.key)}
                />
              ))}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
