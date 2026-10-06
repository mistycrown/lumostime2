/**
 * @file NodeText.tsx
 * @input Plain note text containing wiki links and optional highlighted node name
 * @output Inline accessible node links that do not trigger parent log clicks
 * @pos Component (Nodes)
 * @updated 2026-10-06: Added shared node-aware note rendering.
 */
import React from 'react';
import { useOptionalNodes } from '../contexts/NodeContext';
import { parseNodeLinks } from '../utils/nodeUtils';

export const NodeText: React.FC<{ text: string; highlightName?: string }> = ({ text, highlightName }) => {
  const context = useOptionalNodes();
  const parts: React.ReactNode[] = [];
  let offset = 0;
  for (const link of parseNodeLinks(text)) {
    parts.push(text.slice(offset, link.start));
    parts.push(context ? <button
      key={link.start}
      type="button"
      aria-label={`查看节点：${link.name}`}
      className={`inline break-words text-left underline decoration-stone-300 underline-offset-4 hover:decoration-stone-600 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 ${highlightName === link.name ? 'font-semibold text-stone-900' : 'text-stone-700'}`}
      onClick={(event) => { event.stopPropagation(); context.openNode(link.name); }}
    >{link.name}</button> : <span key={link.start}>{text.slice(link.start, link.end)}</span>);
    offset = link.end;
  }
  parts.push(text.slice(offset));
  return <>{parts}</>;
};
