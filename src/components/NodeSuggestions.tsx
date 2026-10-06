/**
 * @file NodeSuggestions.tsx
 * @input A persisted log note and existing node names/aliases
 * @output Post-save node suggestions with explicit one-click text conversion
 * @pos Component (Nodes)
 * @updated 2026-10-06: Added saved-note suggestions without live input detection.
 */
import React, { useMemo } from 'react';
import type { Log } from '../types';
import { useOptionalNodes } from '../contexts/NodeContext';
import { usePrivacy } from '../contexts/PrivacyContext';
import { getNodeCandidates } from '../utils/nodeUtils';

export const NodeSuggestions: React.FC<{ log: Log }> = ({ log }) => {
  const context = useOptionalNodes();
  const { isPrivacyMode } = usePrivacy();
  const candidates = useMemo(() => context ? getNodeCandidates(log.note || '', context.nodes) : [], [log.note, context?.nodes]);
  if (!context || !candidates.length || isPrivacyMode) return null;
  return <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" onClick={(event) => event.stopPropagation()}>
    <span className="text-stone-400">可能关联</span>
    {candidates.map(({ node }) => <button
      key={node.id} type="button" aria-label={`关联节点：${node.name}`}
      className="py-1 text-stone-500 underline decoration-dashed decoration-stone-300 underline-offset-4 hover:text-stone-900"
      onClick={() => context.associate(log.id, node.id)}
    >{node.name}</button>)}
  </div>;
};
