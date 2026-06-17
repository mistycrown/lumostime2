/**
 * @file SyncConflictModal.tsx
 * @input Conflict visibility, descriptive sync context, and explicit upload/restore actions
 * @output A dual-action sync conflict dialog for choosing the final overwrite direction
 * @pos Component (Modal)
 * @description Presents timestamp-vs-size sync contradictions in one focused dialog so users can choose whether local data should overwrite the cloud copy or vice versa.
 * @updated 2026-06-15: Added the dedicated sync conflict modal for JSON-size protection during cloud sync.
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React from 'react';
import { AlertTriangle, Download, Upload, X } from 'lucide-react';

interface SyncConflictModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onUpload: () => void;
  onDownload: () => void;
}

export const SyncConflictModal: React.FC<SyncConflictModalProps> = ({
  isOpen,
  title,
  description,
  onClose,
  onUpload,
  onDownload
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/25 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-[#fdfbf7] shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50">
              <AlertTriangle size={22} className="text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-stone-800">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
            aria-label="关闭同步冲突弹窗"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="max-h-[45vh] whitespace-pre-wrap rounded-2xl border border-stone-100 bg-stone-50 p-4 text-sm leading-relaxed text-stone-600">
            {description}
          </div>
        </div>

        <div className="border-t border-stone-100 bg-white px-5 py-5">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl border border-stone-200 bg-white py-3.5 font-bold text-stone-600 transition-colors hover:bg-stone-50"
            >
              取消
            </button>
            <button
              onClick={onDownload}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white py-3.5 font-bold text-emerald-600 transition-colors hover:bg-emerald-50"
            >
              <Download size={18} />
              云端覆盖本地
            </button>
            <button
              onClick={onUpload}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white py-3.5 font-bold text-blue-600 transition-colors hover:bg-blue-50"
            >
              <Upload size={18} />
              本地覆盖云端
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
