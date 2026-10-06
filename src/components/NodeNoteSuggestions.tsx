/**
 * @file NodeNoteSuggestions.tsx
 * @input Unsaved note draft, existing node names/aliases and a draft update callback
 * @output Keyword-style node suggestions below the note editor
 * @pos Component (Nodes / Log Editor)
 * @updated 2026-10-06: Adds live, opt-in name/alias conversion following the user's editor preference.
 */
import React, { useMemo } from 'react';
import { CheckCircle2, Lightbulb } from 'lucide-react';
import { useOptionalNodes } from '../contexts/NodeContext';
import { getNodeCandidates, linkNodeInText } from '../utils/nodeUtils';

export const NodeNoteSuggestions: React.FC<{ note: string; onChange: (note: string) => void }> = ({ note, onChange }) => {
  const context = useOptionalNodes();
  const candidates = useMemo(() => context ? getNodeCandidates(note, context.nodes) : [], [note, context?.nodes]);
  if (!candidates.length) return null;
  return <div className="mt-3 rounded-xl border p-3" style={{ backgroundColor: 'var(--secondary-button-bg)', borderColor: 'var(--secondary-button-border)' }}>
    <div className="flex items-start gap-2">
      <Lightbulb size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-color)' }} />
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-xs font-bold" style={{ color: 'var(--accent-color)' }}>建议关联节点</p>
        <div className="flex flex-wrap gap-2">
          {candidates.map(({ node, matches }) => <button
            key={node.id} type="button" aria-label={`在备注中关联节点：${node.name}`}
            onClick={() => onChange(linkNodeInText(note, node))}
            className="flex min-w-0 items-center gap-1 rounded-lg border bg-white px-2 py-1 text-xs font-medium transition-colors active:scale-95"
            style={{ borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }}
          ><span className="mr-0.5 shrink-0 text-[10px] opacity-70">[{matches.includes(node.name) ? '名称匹配' : '别名匹配'}]</span><span className="break-words">{node.name}</span><CheckCircle2 size={12} className="shrink-0" /></button>)}
        </div>
      </div>
    </div>
  </div>;
};
