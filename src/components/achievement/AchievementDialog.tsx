/**
 * @file AchievementDialog.tsx
 * @description Centered modal shared by the achievement tabs.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface AchievementDialogProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AchievementDialog: React.FC<AchievementDialogProps> = ({
  isOpen,
  title,
  subtitle,
  onClose,
  children,
  footer
}) => {
  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(84vh,44rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-stone-200 bg-[#fdfbf7] shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-stone-200 bg-white/75 px-6 pb-5 pt-6 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-400">Achievement</div>
              <h3 className="mt-2 text-[1.9rem] font-normal leading-none tracking-tight text-stone-900">{title}</h3>
              {subtitle && (
                <p className="mt-3 max-w-xl text-sm leading-6 text-stone-500">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
              aria-label="关闭"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {footer && (
          <div className="border-t border-stone-200 bg-white/70 px-6 py-4 backdrop-blur-sm">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
