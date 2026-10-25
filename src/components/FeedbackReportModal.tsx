/**
 * @file FeedbackReportModal.tsx
 * @input Report delivery status, optional event ID and error message, user identifier and callbacks
 * @output Persistent copyable feedback receipt dialog
 * @pos Component (Modal)
 * @description Keeps report references visible until dismissed, with individual and combined copying.
 * @updated 2026-10-25: Reuses the receipt for automatic errors, pending/failed uploads and retry.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { copyToClipboard } from '../utils/clipboardUtils';
import { registerHardwareBackHandler } from '../utils/hardwareBackHandlerStack';

interface FeedbackReportModalProps {
  eventId: string | null;
  userId: string;
  onClose: () => void;
  message?: string;
  status?: 'sending' | 'sent' | 'failed' | 'disabled';
  onRetry?: () => void;
}

export const FeedbackReportModal: React.FC<FeedbackReportModalProps> = ({ eventId, userId, onClose, message, status = 'sent', onRetry }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);
  const deliveredEventId = status === 'sent' ? eventId : null;
  const title = status === 'sending' ? '错误报告发送中'
    : status === 'failed' ? '错误报告发送失败'
      : status === 'disabled' ? '诊断服务未启用' : '错误日志已发送';

  useEffect(() => {
    setCopied(null);
    setCopyFailed(false);
  }, [eventId, userId, status]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  useEffect(() => registerHardwareBackHandler(() => {
    onClose();
    return true;
  }), [onClose]);

  const copy = async (key: string, text: string) => {
    const success = await copyToClipboard(text);
    setCopied(success ? key : null);
    setCopyFailed(!success);
  };

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/30 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-report-title"
        tabIndex={-1}
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-[#fdfbf7] p-6 shadow-xl outline-none"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          } else if (event.key === 'Tab') {
            const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button'));
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <h3 id="feedback-report-title" className="font-serif text-lg font-bold text-stone-800" role="status">{title}</h3>
          <button type="button" aria-label="关闭" onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>
        {message && <p className="mb-5 select-text break-words text-sm leading-relaxed text-stone-700">{message}</p>}
        <div className="divide-y divide-stone-200 border-y border-stone-200">
          {[
            ...(deliveredEventId ? [{ key: 'event', label: '反馈 ID', value: deliveredEventId }] : []),
            { key: 'user', label: '用户编号', value: userId }
          ].map(({ key, label, value }) => (
            <div key={key} className="py-4">
              <div className="text-xs text-stone-500">{label}</div>
              <div className="mt-2 flex items-center gap-3">
                <code className="min-w-0 flex-1 select-text break-all font-mono text-sm text-stone-800">{value}</code>
                <button
                  type="button"
                  aria-label={`复制${label}`}
                  onClick={() => void copy(key, value)}
                  className="flex shrink-0 items-center gap-1 text-xs text-stone-600 hover:text-stone-900"
                >
                  {copied === key ? <Check size={14} /> : <Copy size={14} />}
                  {copied === key ? '已复制' : '复制'}
                </button>
              </div>
            </div>
          ))}
        </div>
        {copyFailed && <p role="alert" className="mt-3 text-xs text-red-600">复制失败，请选中编号手动复制</p>}
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-stone-100 py-3 text-sm text-stone-600">关闭</button>
          {status === 'failed' && onRetry ? (
            <button type="button" onClick={onRetry} className="flex-1 rounded-xl bg-stone-800 py-3 text-sm text-white hover:bg-stone-700">重新上传</button>
          ) : deliveredEventId ? <button
            type="button"
            onClick={() => void copy('all', `${message ? `错误信息：${message}\n` : ''}反馈 ID：${deliveredEventId}\n用户编号：${userId}`)}
            className="flex-1 rounded-xl bg-stone-800 py-3 text-sm text-white hover:bg-stone-700"
          >
            {copied === 'all' ? '已复制' : '复制反馈信息'}
          </button> : null}
        </div>
        <span role="status" className="sr-only">{copied ? '已复制到剪贴板' : ''}</span>
      </div>
    </div>
  );
};
