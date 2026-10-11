/**
 * @file NodeDeleteButton.tsx
 * @input Node metadata and optional draft invalidation before removal
 * @output Shared node deletion with confirmation, focus return and back navigation
 * @pos Component (Nodes)
 * @updated 2026-10-11: Adds confirmed deletion to node management and details.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { NoteNode } from '../types';
import { useNodes } from '../contexts/NodeContext';
import { useToast } from '../contexts/ToastContext';
import { ConfirmModal } from './ConfirmModal';
import { registerHardwareBackHandler } from '../utils/hardwareBackHandlerStack';

export const NodeDeleteButton: React.FC<{ node: NoteNode; onBeforeDelete?: () => void }> = ({ node, onBeforeDelete }) => {
  const { removeNode } = useNodes();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    return registerHardwareBackHandler(() => { setOpen(false); trigger.current?.focus(); return true; });
  }, [open]);
  return <>
    <button ref={trigger} type="button" aria-label="删除节点" onClick={() => setOpen(true)} className="flex shrink-0 items-center gap-1.5 py-2 text-xs text-red-500 hover:text-red-700"><Trash2 size={14} />删除节点</button>
    {open && <div role="dialog" aria-modal="true" aria-label="确认删除节点" className="relative z-[260]" onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    }}>
      <ConfirmModal isOpen onClose={close} title="删除节点" confirmText="确认删除节点" description="删除后，备注和日报、周报、月报中的节点链接将转为普通文字，保留原文。节点的别名和简介将一并删除，此操作不可撤销。" onConfirm={() => {
        onBeforeDelete?.();
        removeNode(node.id);
        setOpen(false);
        addToast('success', '节点已删除');
      }} />
    </div>}
  </>;
};
