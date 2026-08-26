/**
 * @file ReferenceDeleteModal.tsx
 * @input Deleted reference metadata, available targets, and decision handlers
 * @output Migration or unlink confirmation dialog
 * @description Shared confirmation UI for scope and todo deletion reference handling.
 */
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Trash2, Unlink } from 'lucide-react';
import type { ReferenceDeleteAction, ReferenceDeleteImpact } from '../utils/referenceDeletion';

interface ReferenceDeleteTarget {
  id: string;
  name: string;
  icon?: string;
}

interface ReferenceDeleteModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  targetLabel: string;
  sourceName: string;
  impact: ReferenceDeleteImpact;
  targets: ReferenceDeleteTarget[];
  onClose: () => void;
  onConfirm: (decision: { action: ReferenceDeleteAction; targetId?: string }) => void;
}

export const ReferenceDeleteModal: React.FC<ReferenceDeleteModalProps> = ({
  isOpen, title, description, targetLabel, sourceName, impact, targets, onClose, onConfirm
}) => {
  const [action, setAction] = useState<ReferenceDeleteAction>('unlink');
  const [targetId, setTargetId] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ left: number; top: number; width: number } | null>(null);

  useEffect(() => {
    setAction('unlink');
    setTargetId('');
    setMenuOpen(false);
    setMenuAnchor(null);
  }, [isOpen, sourceName]);

  if (!isOpen) return null;
  const selectedTarget = targets.find((target) => target.id === targetId);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-[#fdfbf7] shadow-2xl">
        <div className="flex items-start gap-3 border-b border-stone-100 p-5">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={20} />
          <div>
            <h2 className="font-bold text-stone-800">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-stone-500">{description}</p>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-stone-200 bg-white p-3">
            <div className="flex items-center gap-2 text-sm font-bold text-stone-800"><Trash2 size={15} className="text-red-300" />{sourceName}</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-stone-400">
              <span>历史记录 {impact.logs}</span><span>当前计时 {impact.activeSessions}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAction('migrate')} className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${action === 'migrate' ? 'border-stone-800 bg-stone-800 text-white' : 'border-stone-200 text-stone-600'}`}>迁移关联</button>
            <button type="button" onClick={() => setAction('unlink')} className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${action === 'unlink' ? 'border-stone-800 bg-stone-800 text-white' : 'border-stone-200 text-stone-600'}`}><Unlink size={14} className="mr-1 inline" />取消关联</button>
          </div>
          {action === 'migrate' && (
            <div className="relative">
              <button
                type="button"
                onClick={(event) => {
                  if (menuOpen) {
                    setMenuOpen(false);
                    setMenuAnchor(null);
                    return;
                  }
                  const rect = event.currentTarget.getBoundingClientRect();
                  setMenuAnchor({ left: rect.left, top: rect.top, width: rect.width });
                  setMenuOpen(true);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-left text-sm text-stone-700"
              >
                <span className={selectedTarget ? 'text-stone-800' : 'text-stone-400'}>{selectedTarget ? `${selectedTarget.icon || ''}${selectedTarget.name}` : `选择${targetLabel}`}</span>
                <ChevronDown size={16} />
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-3 border-t border-stone-100 bg-white p-4">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-600">取消</button>
          <button type="button" disabled={action === 'migrate' && !targetId} onClick={() => onConfirm({ action, targetId: action === 'migrate' ? targetId : undefined })} className="flex-1 rounded-xl bg-stone-900 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">确定删除</button>
        </div>
      </div>
      {menuOpen && menuAnchor && (
        <>
          <button
            type="button"
            aria-label="关闭迁移目标菜单"
            className="fixed inset-0 z-[121] cursor-default"
            onClick={() => { setMenuOpen(false); setMenuAnchor(null); }}
          />
          <div
            className="fixed z-[122] max-h-56 overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-xl"
            style={{ left: menuAnchor.left, top: Math.max(12, menuAnchor.top - 232), width: menuAnchor.width }}
          >
            {targets.map((target) => (
              <button key={target.id} type="button" onClick={() => { setTargetId(target.id); setMenuOpen(false); setMenuAnchor(null); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-50">
                <span>{target.icon}</span><span className="flex-1 truncate">{target.name}</span>{target.id === targetId && <Check size={15} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
