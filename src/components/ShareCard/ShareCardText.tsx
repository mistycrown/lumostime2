/**
 * @file ShareCardText.tsx
 * @input Note text containing node links and optional magazine drop cap
 * @output Static node labels and aliases styled for share previews and image exports
 * @pos Component (ShareCard)
 * @updated 2026-10-11: Preserves node rendering across ordinary, vertical and drop-cap layouts.
 */
import React from 'react';
import { parseNodeLinks } from '../../utils/nodeUtils';

const getTextParts = (text: string): { text: string; isNode: boolean }[] => {
  const parts: { text: string; isNode: boolean }[] = [];
  let offset = 0;
  for (const link of parseNodeLinks(text)) {
    if (link.start > offset) parts.push({ text: text.slice(offset, link.start), isNode: false });
    parts.push({ text: link.label || link.name, isNode: true });
    offset = link.end;
  }
  if (offset < text.length) parts.push({ text: text.slice(offset), isNode: false });
  return parts;
};

export const getShareCardPlainText = (text: string): string => getTextParts(text).map((part) => part.text).join('');

const renderParts = (parts: ReturnType<typeof getTextParts>) => parts.map((part, index) => part.isNode
  ? <span key={index} className="underline decoration-current underline-offset-4">{part.text}</span>
  : <React.Fragment key={index}>{part.text}</React.Fragment>);

export const ShareCardText: React.FC<{ text: string; dropCap?: boolean }> = ({ text, dropCap = false }) => {
  const parts = getTextParts(text);
  if (!dropCap || !parts.length) return <>{renderParts(parts)}</>;

  // Split the first visible character only after parsing, so an opening node stays styled.
  const firstPart = parts[0];
  const firstCharacter = Array.from(firstPart.text)[0];
  const remainingParts = [{ ...firstPart, text: firstPart.text.slice(firstCharacter.length) }, ...parts.slice(1)];
  return <>
    <span className="float-left text-[2.8em] leading-[0.85] pr-2 pt-1 font-serif font-bold opacity-100">
      {renderParts([{ ...firstPart, text: firstCharacter }])}
    </span>
    <div className="text-sm md:text-base" style={{ whiteSpace: 'pre-wrap' }}>
      {renderParts(remainingParts)}
    </div>
  </>;
};
