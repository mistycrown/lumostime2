/**
 * @file FeatureHint.tsx
 * @input Stable hint id, developer-provided copy, and optional trigger sizing/placement props.
 * @output Dismissible question-mark hint trigger with a consistent information modal.
 * @pos Reusable UI component
 * @description Provides contextual feature guidance with per-hint localStorage dismissal.
 * @updated 2026-09-12: Created the reusable contextual feature hint component.
 */
import React, { useEffect, useRef, useState } from 'react';
import { CircleQuestionMark } from 'lucide-react';

const STORAGE_KEY_PREFIX = 'lumostime_feature_hint_dismissed:';

interface FeatureHintProps {
  hintId: string;
  title?: string;
  message: string;
  iconSize?: number;
  className?: string;
}

const getStorageKey = (hintId: string): string => `${STORAGE_KEY_PREFIX}${hintId}`;

const readDismissedState = (hintId: string): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(getStorageKey(hintId)) === 'true';
  } catch {
    return false;
  }
};

const persistDismissedState = (hintId: string): void => {
  try {
    window.localStorage.setItem(getStorageKey(hintId), 'true');
  } catch {
    // Storage can be unavailable in private browsing or restricted webviews.
  }
};

export const FeatureHint: React.FC<FeatureHintProps> = ({
  hintId,
  title = '使用提示',
  message,
  iconSize = 15,
  className = ''
}) => {
  const [isDismissed, setIsDismissed] = useState(() => readDismissedState(hintId));
  const [isOpen, setIsOpen] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsDismissed(readDismissedState(hintId));
    setIsOpen(false);
  }, [hintId]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    confirmButtonRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (isDismissed) return null;

  const dismissPermanently = () => {
    persistDismissedState(hintId);
    setIsOpen(false);
    setIsDismissed(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex shrink-0 items-center justify-center text-red-900/75 transition-colors hover:text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-900/30 ${className}`}
        aria-label="查看使用提示"
        title="查看使用提示"
      >
        <CircleQuestionMark size={iconSize} strokeWidth={2.25} />
      </button>

      {isOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm animate-in fade-in duration-200" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setIsOpen(false);
      }}>
        <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-[2rem] bg-[#fdfbf7] shadow-2xl animate-in zoom-in-95 duration-200" role="dialog" aria-modal="true" aria-labelledby={`${hintId}-title`}>
          <div className="p-8 text-center">
            <h3 id={`${hintId}-title`} className="mb-3 text-xl font-bold text-stone-800">{title}</h3>
            <p className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap text-left text-sm leading-relaxed text-stone-500">{message}</p>
          </div>
          <div className="flex gap-3 border-t border-stone-100 bg-white p-5">
            <button type="button" onClick={dismissPermanently} className="flex-1 rounded-2xl border border-stone-200 bg-white py-3.5 font-bold text-stone-600 transition-colors hover:bg-stone-50">不再显示</button>
            <button ref={confirmButtonRef} type="button" onClick={() => setIsOpen(false)} className="flex-1 rounded-2xl bg-stone-800 py-3.5 font-bold text-white shadow-xl transition-transform hover:scale-[1.01] active:scale-[0.99]">好的</button>
          </div>
        </div>
      </div>}
    </>
  );
};
