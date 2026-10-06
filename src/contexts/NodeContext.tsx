/**
 * @file NodeContext.tsx
 * @input DataContext logs and NoteNode metadata
 * @output Node index, metadata editing, text conversion and detail navigation history
 * @pos Context (Nodes)
 * @description Shares node navigation across timeline, settings and detail pages.
 * @updated 2026-10-06: Added text-derived backlinks and lightweight node actions.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useData } from './DataContext';
import type { NoteNode } from '../types';
import { buildNodeIndex, linkNodeInText, renameNode, renameNodeInText } from '../utils/nodeUtils';

interface NodeContextValue {
  nodes: NoteNode[];
  index: ReturnType<typeof buildNodeIndex>;
  selectedNodeId: string | null;
  openNode: (name: string) => void;
  goBack: () => void;
  closeNode: () => void;
  updateNode: (id: string, patch: Pick<NoteNode, 'aliases' | 'description'>) => void;
  rename: (id: string, name: string) => void;
  associate: (logId: string, nodeId: string) => void;
}

const NodeContext = createContext<NodeContextValue | null>(null);
export const useOptionalNodes = () => useContext(NodeContext);
export const useNodes = () => {
  const context = useOptionalNodes();
  if (!context) throw new Error('useNodes must be used within NodeProvider');
  return context;
};

export const NodeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { nodes, setNodes, logs, setLogs } = useData();
  const [history, setHistory] = useState<string[]>([]);
  const index = useMemo(() => buildNodeIndex(nodes, logs), [nodes, logs]);
  const openNode = useCallback((name: string) => {
    const node = nodes.find((item) => item.name === name);
    if (node) setHistory((previous) => previous.at(-1) === node.id ? previous : [...previous, node.id]);
  }, [nodes]);
  const goBack = useCallback(() => setHistory((previous) => previous.slice(0, -1)), []);
  const closeNode = useCallback(() => setHistory([]), []);
  const updateNode = (id: string, patch: Pick<NoteNode, 'aliases' | 'description'>) => {
    setNodes((previous) => previous.map((node) => node.id === id ? {
      ...node, ...patch, aliases: [...new Set(patch.aliases.map((alias) => alias.trim()).filter((alias) => alias && alias !== node.name))], updatedAt: Date.now()
    } : node));
  };
  const rename = (id: string, name: string) => {
    renameNode(nodes, [], id, name);
    const source = nodes.find((node) => node.id === id)!;
    const nextName = name.trim();
    setNodes((previous) => renameNode(previous, [], id, nextName).nodes);
    setLogs((previous) => previous.map((log) => {
      const note = renameNodeInText(log.note || '', source.name, nextName);
      return note === (log.note || '') ? log : { ...log, note };
    }));
  };
  const associate = (logId: string, nodeId: string) => {
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;
    setLogs((previous) => previous.map((log) => log.id === logId ? { ...log, note: linkNodeInText(log.note || '', node) } : log));
  };
  return <NodeContext.Provider value={{ nodes, index, selectedNodeId: history.at(-1) || null, openNode, goBack, closeNode, updateNode, rename, associate }}>{children}</NodeContext.Provider>;
};
