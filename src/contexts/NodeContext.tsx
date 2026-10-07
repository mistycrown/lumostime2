/**
 * @file NodeContext.tsx
 * @updated 2026-10-07: Indexes and mutates node links across daily, weekly and monthly reviews.
 * @updated 2026-10-07: Atomically renames/merges nodes with every referenced record and redirects merged navigation history.
 * @updated 2026-10-07: Exposes persisted node moves and category ordering for capsule management.
 * @updated 2026-10-07: Adds category creation/assignment and preserves alias display links during text conversion.
 * @input DataContext logs and NoteNode metadata
 * @output Node index, metadata editing, text conversion and detail navigation history
 * @pos Context (Nodes)
 * @description Shares node navigation across timeline, settings and detail pages.
 * @updated 2026-10-06: Added text-derived backlinks and lightweight node actions.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useData } from './DataContext';
import { useOptionalReview } from './ReviewContext';
import type { NoteNode, NodeCategory, ReviewAnswer } from '../types';
import { buildNodeIndex, createNodeCategory, discoverNodes, linkNodeInText, mergeNodes, moveNodeToCategory, reorderNodeItems, renameNode, renameNodeInAnswers } from '../utils/nodeUtils';

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
  merge: (sourceId: string, primaryId: string) => void;
  associate: (logId: string, nodeId: string) => void;
  associateReviewAnswer: (kind: 'daily' | 'weekly' | 'monthly', reviewId: string, questionId: string, nodeId: string) => void;
}

const NodeContext = createContext<NodeContextValue | null>(null);
export const useOptionalNodes = () => useContext(NodeContext);
export const useNodes = () => {
  const context = useOptionalNodes();
  if (!context) throw new Error('useNodes must be used within NodeProvider');
  return context;
};

const mapReviewAnswers = <T extends { answers: ReviewAnswer[]; updatedAt: number }>(reviews: T[], oldName: string, newName: string, preserveOldLabel = false): T[] => reviews.map((review) => {
  const answers = renameNodeInAnswers(review.answers || [], oldName, newName, preserveOldLabel);
  return answers === review.answers || answers.every((answer, index) => answer === review.answers?.[index])
    ? review
    : { ...review, answers, updatedAt: Date.now() };
});

export const NodeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { nodes: storedNodes, setNodes, updateNodeRecords, nodeCategories, setNodeCategories, logs, setLogs } = useData();
  const reviewContext = useOptionalReview();
  const dailyReviews = reviewContext?.dailyReviews || [];
  const weeklyReviews = reviewContext?.weeklyReviews || [];
  const monthlyReviews = reviewContext?.monthlyReviews || [];
  const setDailyReviews = reviewContext?.setDailyReviews || (() => undefined);
  const setWeeklyReviews = reviewContext?.setWeeklyReviews || (() => undefined);
  const setMonthlyReviews = reviewContext?.setMonthlyReviews || (() => undefined);
  const [history, setHistory] = useState<string[]>([]);
  const nodes = useMemo(() => discoverNodes(storedNodes, logs, Date.now(), dailyReviews, weeklyReviews, monthlyReviews), [storedNodes, logs, dailyReviews, weeklyReviews, monthlyReviews]);
  useEffect(() => { if (nodes !== storedNodes) setNodes(nodes); }, [nodes, setNodes, storedNodes]);
  const index = useMemo(() => buildNodeIndex(nodes, logs, dailyReviews, weeklyReviews, monthlyReviews), [nodes, logs, dailyReviews, weeklyReviews, monthlyReviews]);
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
    const nextName = name.trim();
    const source = nodes.find((node) => node.id === id);
    if (!source) return;
    updateNodeRecords((previousNodes, previousLogs) => {
      if (!previousNodes.some((node) => node.id === id) || previousNodes.some((node) => node.id !== id && node.name === nextName)) return { nodes: previousNodes, logs: previousLogs };
      return renameNode(previousNodes, previousLogs, id, nextName);
    });
    setDailyReviews((previous) => previous.map((review) => {
      const answers = renameNodeInAnswers(review.answers || [], source.name, nextName);
      return answers === review.answers || answers.every((answer, index) => answer === review.answers?.[index]) ? review : { ...review, answers, updatedAt: Date.now() };
    }));
    setWeeklyReviews((previous) => mapReviewAnswers(previous, source.name, nextName));
    setMonthlyReviews((previous) => mapReviewAnswers(previous, source.name, nextName));
  };
  const merge = (sourceId: string, primaryId: string) => {
    mergeNodes(nodes, [], sourceId, primaryId);
    updateNodeRecords((previousNodes, previousLogs) => {
      if (!previousNodes.some((node) => node.id === sourceId) || !previousNodes.some((node) => node.id === primaryId)) return { nodes: previousNodes, logs: previousLogs };
      return mergeNodes(previousNodes, previousLogs, sourceId, primaryId);
    });
    const source = nodes.find((node) => node.id === sourceId);
    const primary = nodes.find((node) => node.id === primaryId);
    if (source && primary) {
      setDailyReviews((previous) => previous.map((review) => {
        const answers = renameNodeInAnswers(review.answers || [], source.name, primary.name, true);
        return answers === review.answers || answers.every((answer, index) => answer === review.answers?.[index]) ? review : { ...review, answers, updatedAt: Date.now() };
      }));
      setWeeklyReviews((previous) => mapReviewAnswers(previous, source.name, primary.name, true));
      setMonthlyReviews((previous) => mapReviewAnswers(previous, source.name, primary.name, true));
    }
    setHistory((previous) => previous.map((id) => id === sourceId ? primaryId : id).filter((id, index, items) => index === 0 || items[index - 1] !== id));
  };
  const associate = (logId: string, nodeId: string) => {
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;
    setLogs((previous) => previous.map((log) => log.id === logId ? { ...log, note: linkNodeInText(log.note || '', node) } : log));
  };
  const associateReviewAnswer = (kind: 'daily' | 'weekly' | 'monthly', reviewId: string, questionId: string, nodeId: string) => {
    const node = nodes.find((item) => item.id === nodeId);
    if (!node || !reviewContext) return;
    const linkAnswer = <T extends { id: string; answers: Array<{ questionId: string; answer: string }>; updatedAt: number }>(previous: T[]): T[] => previous.map((review) => review.id !== reviewId ? review : {
      ...review,
      answers: review.answers.map((answer) => answer.questionId !== questionId ? answer : { ...answer, answer: linkNodeInText(answer.answer || '', node) }),
      updatedAt: Date.now()
    });
    if (kind === 'daily') setDailyReviews((previous) => linkAnswer(previous));
    else if (kind === 'weekly') setWeeklyReviews((previous) => linkAnswer(previous));
    else setMonthlyReviews((previous) => linkAnswer(previous));
  };
  return <NodeContext.Provider value={{ nodes, nodeCategories, addCategory, assignCategory, moveNode, reorderCategory, index, selectedNodeId: history.at(-1) || null, openNode, goBack, closeNode, updateNode, rename, merge, associate, associateReviewAnswer }}>{children}</NodeContext.Provider>;
};
