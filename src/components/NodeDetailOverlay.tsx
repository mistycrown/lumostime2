/**
 * @file NodeDetailOverlay.tsx
 * @input Node navigation history and existing log editor navigation
 * @output Global node details with hardware-back and Escape navigation
 * @pos Component (Overlay)
 * @updated 2026-10-06: Added node-to-node navigation while preserving the underlying view.
 */
import React, { useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNodes } from '../contexts/NodeContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAIChatWindow } from '../contexts/AIChatWindowContext';
import { useLogManager } from '../hooks/useLogManager';
import { registerHardwareBackHandler } from '../utils/hardwareBackHandlerStack';

const NodeDetailView = React.lazy(() => import('../views/NodeDetailView').then((module) => ({ default: module.NodeDetailView })));

export const NodeDetailOverlay: React.FC = () => {
  const { selectedNodeId, nodes, goBack, closeNode } = useNodes();
  const { isAddModalOpen, isTodoModalOpen } = useNavigation();
  const { isAIChatOpen } = useAIChatWindow();
  const { openEditModal } = useLogManager();
  const node = nodes.find((item) => item.id === selectedNodeId);
  useEffect(() => {
    if (!node || isAddModalOpen || isTodoModalOpen || isAIChatOpen) return;
    const unregister = registerHardwareBackHandler(() => { goBack(); return true; });
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); goBack(); }
    };
    window.addEventListener('keydown', escape);
    return () => { unregister(); window.removeEventListener('keydown', escape); };
  }, [node, isAddModalOpen, isTodoModalOpen, isAIChatOpen, goBack]);
  useEffect(() => { if (selectedNodeId && !node) closeNode(); }, [selectedNodeId, node, closeNode]);
  if (!node) return null;
  return <div className="fixed inset-0 z-[190] flex flex-col bg-[#faf9f6]" role="dialog" aria-label={`节点：${node.name}`}>
    <header className="relative z-30 flex h-[calc(3.5rem+var(--app-safe-area-top,0px))] shrink-0 items-center justify-between border-b border-stone-100 bg-[#faf9f6]/80 px-5 pt-[var(--app-safe-area-top,0px)] backdrop-blur-sm">
      <div className="flex w-8 items-center"><button type="button" aria-label="返回上一页" onClick={goBack} className="text-stone-400 hover:text-stone-600"><ChevronLeft size={24} /></button></div>
      <h1 className="text-lg font-bold tracking-wide text-stone-700">节点详情</h1>
      <div className="w-8" />
    </header>
    <div className="min-h-0 flex-1">
      <React.Suspense fallback={<div className="p-7 text-sm text-stone-400">正在加载节点…</div>}>
        <NodeDetailView key={node.id} node={node} onEditLog={openEditModal} />
      </React.Suspense>
    </div>
  </div>;
};
