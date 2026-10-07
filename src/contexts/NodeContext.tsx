/**
 * @file NodeContext.tsx
 * @updated 2026-10-07: Exposes persisted node moves and category ordering for capsule management.
 * @updated 2026-10-07: Adds category creation/assignment and preserves alias display links during text conversion.
 * @input DataContext logs and NoteNode metadata
 * @output Node index, metadata editing, text conversion and detail navigation history
 * @pos Context (Nodes)
 * @description Shares node navigation across timeline, settings and detail pages.
 * @updated 2026-10-06: Added text-derived backlinks and lightweight node actions.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useData } from './DataContext';
import type { NoteNode, NodeCategory } from '../types';
import { buildNodeIndex, createNodeCategory, linkNodeInText, moveNodeToCategory, reorderNodeItems, renameNode, renameNodeInText } from '../utils/nodeUtils';

interface NodeContextValue {
  nodes: NoteNode[];
  nodeCategories: NodeCategory[];
  addCategory: (name: string, nodeId?: string) => NodeCategory;
  assignCategory: (nodeId: string, categoryId: string) => void;
  moveNode: (nodeId: string, categoryId: string, targetId?: string, after?: boolean) => void;
  reorderCategory: (categoryId: string, targetId: string, after?: boolean) => void;
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
  const { nodes, setNodes, nodeCategories, setNodeCategories, logs, setLogs } = useData();
  const [history, setHistory] = useState<string[]>([]);
  const index = useMemo(() => buildNodeIndex(nodes, logs), [nodes, logs]);
  const openNode = useCallback((name: string) => {
    const node = nodes.find((item) => item.name === name);
    if (node) setHistory((previous) => previous.at(-1) === node.id ? previous : [...previous, node.id]);
  }, [nodes]);
  const goBack = useCallback(() => setHistory((previous) => previous.slice(0, -1)), []);
  const closeNode = useCallback(() => setHistory([]), []);
  const addCategory = (name: string, nodeId?: string) => {
    const category = createNodeCategory(nodeCategories, name);
    setNodeCategories((previous) => [...previous, category]);
    if (nodeId) setNodes((previous) => previous.map((node) => node.id === nodeId ? { ...node, categoryId: category.id, updatedAt: Date.now() } : node));
    return category;
  };
  const assignCategory = (nodeId: string, categoryId: string) => {
    if (categoryId && !nodeCategories.some((category) => category.id === categoryId)) throw new Error('分类不存在');
    setNodes((previous) => previous.map((node) => node.id === nodeId ? { ...node, categoryId: categoryId || undefined, updatedAt: Date.now() } : node));
  };
  const updateNode = (id: string, patch: Pick<NoteNode, 'aliases' | 'description'>) => {
    setNodes((previous) => previous.map((node) => node.id === id ? {
      ...node, ...patch, aliases: [...new Set(patch.aliases.map((alias) => alias.trim()).filter((alias) => alias && alias !== node.name))], updatedAt: Date.now()
    } : node));
  };
  const moveNode = (id: string, categoryId: string, targetId?: string, after = false) => {
    setNodes((previous) => moveNodeToCategory(previous, nodeCategories, id, categoryId, targetId, after));
  };
  const reorderCategory = (id: string, targetId: string, after = false) => {
    setNodeCategories((previous) => reorderNodeItems(previous, id, targetId, after));
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
  return <NodeContext.Provider value={{ nodes, nodeCategories, addCategory, assignCategory, moveNode, reorderCategory, index, selectedNodeId: history.at(-1) || null, openNode, goBack, closeNode, updateNode, rename, associate }}>{children}</NodeContext.Provider>;
};
