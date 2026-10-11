/**
 * @file NodeTextEditor.tsx
 * @input Editable text, optional log history and node metadata from NodeContext
 * @output Textarea with inline completion, node bracket shortcut and matching suggestions
 * @pos Component (Nodes / Text Editor)
 * @updated 2026-10-11: Reuses note autocomplete while preserving node insertion and caret restoration.
 */
import React, { useRef } from 'react';
import { Brackets } from 'lucide-react';
import { insertNodeBrackets } from '../utils/nodeUtils';
import { NodeNoteSuggestions } from './NodeNoteSuggestions';
import { NoteAutocompleteTextarea } from './NoteAutocompleteTextarea';
import type { Log } from '../types';

interface NodeTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  rows?: number;
  history?: readonly Log[];
}

export const NodeTextEditor: React.FC<NodeTextEditorProps> = ({
  value,
  onChange,
  id,
  ariaLabel = '文本',
  placeholder = '输入内容...',
  className = '',
  rows = 5,
  history
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const insertBrackets = () => {
    const input = inputRef.current;
    const result = insertNodeBrackets(value, input?.selectionStart ?? value.length, input?.selectionEnd ?? value.length);
    onChange(result.text);
    window.requestAnimationFrame(() => {
      if (!inputRef.current) return;
      inputRef.current.focus();
      inputRef.current.setSelectionRange(result.caret, result.caret);
    });
  };
  return <div>
    <div className="relative">
      <NoteAutocompleteTextarea
        ref={inputRef}
        id={id}
        aria-label={ariaLabel}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onValueChange={onChange}
        history={history}
        className={className}
      />
      <button type="button" aria-label="插入节点括号" title="插入节点括号" onMouseDown={(event) => event.preventDefault()} onClick={insertBrackets} className="absolute right-2 top-2 p-1.5 text-stone-400 hover:text-stone-700">
        <Brackets size={16} />
      </button>
    </div>
    <NodeNoteSuggestions note={value} onChange={onChange} />
  </div>;
};
