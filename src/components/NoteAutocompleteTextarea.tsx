/**
 * @file NoteAutocompleteTextarea.tsx
 * @input Controlled note, historical logs, activity context and native textarea attributes/ref
 * @output One inline ghost suggestion accepted with Tab or the completion button
 * @pos Component (Record Note Editor)
 * @updated 2026-10-09: Adds caret-aware local completion, IME protection and synchronized multiline/scroll rendering.
 */
import React, { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Log } from '../types';
import { EMPTY_NOTE_HISTORY, getNoteAutocompleteIndex, getNoteCompletion } from '../utils/noteAutocomplete';

interface NoteAutocompleteTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
  history?: readonly Log[];
  activityId?: string;
}

const MIRROR_PROPERTIES = [
  'boxSizing', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant', 'lineHeight',
  'letterSpacing', 'textIndent', 'textAlign', 'textTransform', 'tabSize',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderRadius'
] as const;

export const NoteAutocompleteTextarea = forwardRef<HTMLTextAreaElement, NoteAutocompleteTextareaProps>(({
  value, onValueChange, history = EMPTY_NOTE_HISTORY, activityId,
  onFocus, onBlur, onSelect, onScroll, onKeyDown, onCompositionStart, onCompositionEnd,
  disabled, readOnly, className, style, ...props
}, forwardedRef) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  const [isComposing, setIsComposing] = useState(false);
  const [focused, setFocused] = useState(false);
  const [caret, setCaret] = useState({ value, start: value.length, end: value.length });
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [mirrorStyle, setMirrorStyle] = useState<React.CSSProperties>({});
  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const index = useMemo(() => getNoteAutocompleteIndex(history), [history]);
  useImperativeHandle(forwardedRef, () => inputRef.current!, []);

  const readCaret = () => {
    const input = inputRef.current;
    if (input) setCaret((current) => {
      const next = { value: input.value, start: input.selectionStart, end: input.selectionEnd };
      return current.value === next.value && current.start === next.start && current.end === next.end ? current : next;
    });
  };
  useLayoutEffect(() => { readCaret(); setDismissed(null); }, [value, activityId]);
  const completionKey = JSON.stringify([value, caret.start, caret.end, activityId]);
  const suggestion = focused && !isComposing && !disabled && !readOnly && caret.value === value && dismissed !== completionKey
    ? getNoteCompletion(index, value, caret.start, caret.end, activityId) : null;

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const update = () => {
      const computed = window.getComputedStyle(input);
      const next: Record<string, string | number> = {};
      for (const property of MIRROR_PROPERTIES) next[property] = computed[property];
      next.width = input.clientWidth + parseFloat(computed.borderLeftWidth) + parseFloat(computed.borderRightWidth);
      next.height = input.offsetHeight;
      next.top = input.offsetTop;
      next.left = input.offsetLeft;
      next.borderStyle = 'solid';
      next.borderColor = 'transparent';
      next.color = 'transparent';
      next.whiteSpace = props.wrap === 'off' ? 'pre' : 'pre-wrap';
      next.overflowWrap = 'break-word';
      setMirrorStyle(next);
      setScroll({ top: input.scrollTop, left: input.scrollLeft });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(input);
    return () => observer.disconnect();
  }, [className, style, props.wrap, focused]);

  const accept = () => {
    const input = inputRef.current;
    if (!input || !suggestion || composing.current || input.value !== value
      || input.selectionStart !== caret.start || input.selectionEnd !== caret.end) return;
    const position = caret.start + suggestion.suffix.length;
    onValueChange(value.slice(0, caret.start) + suggestion.suffix + value.slice(caret.start));
    window.requestAnimationFrame(() => {
      if (!inputRef.current) return;
      inputRef.current.focus({ preventScroll: true });
      inputRef.current.setSelectionRange(position, position);
      readCaret();
    });
  };

  return <div className="relative">
    <textarea {...props} ref={inputRef} value={value} disabled={disabled} readOnly={readOnly}
      className={className} style={style} aria-autocomplete="inline"
      aria-description={suggestion ? `按 Tab 补全为 ${suggestion.text}` : undefined}
      onChange={(event) => { readCaret(); onValueChange(event.target.value); }}
      onFocus={(event) => { setFocused(true); readCaret(); onFocus?.(event); }}
      onBlur={(event) => { setFocused(false); composing.current = false; setIsComposing(false); onBlur?.(event); }}
      onSelect={(event) => { readCaret(); onSelect?.(event); }}
      onScroll={(event) => { setScroll({ top: event.currentTarget.scrollTop, left: event.currentTarget.scrollLeft }); onScroll?.(event); }}
      onCompositionStart={(event) => { composing.current = true; setIsComposing(true); onCompositionStart?.(event); }}
      onCompositionEnd={(event) => { composing.current = false; setIsComposing(false); readCaret(); onCompositionEnd?.(event); }}
      onKeyDown={(event) => {
        if (!composing.current && !event.nativeEvent.isComposing && event.keyCode !== 229 && suggestion) {
          if (event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
            event.preventDefault(); event.stopPropagation(); accept(); return;
          }
          if (event.key === 'Escape') {
            event.preventDefault(); event.stopPropagation(); setDismissed(completionKey); return;
          }
        }
        onKeyDown?.(event);
      }}
    />
    {suggestion && <>
      <div aria-hidden="true" data-note-completion className="pointer-events-none absolute overflow-hidden" style={mirrorStyle}>
        <div style={{ transform: `translate(${-scroll.left}px, ${-scroll.top}px)` }}>
          <span>{value.slice(0, caret.start)}</span><span data-note-completion-suffix style={{ color: 'var(--text-secondary, #a8a29e)', opacity: 0.65, wordBreak: 'break-all' }}>{suggestion.suffix}</span>
        </div>
      </div>
      <button type="button" tabIndex={-1} aria-label="接受备注补全" title="Tab"
        onPointerDown={(event) => event.preventDefault()} onClick={accept}
        className="absolute bottom-2 right-3 rounded border border-stone-200 bg-white/90 px-2 py-1 text-[11px] text-stone-500 hover:text-stone-800 active:scale-95">
        <span className="hidden sm:inline">Tab</span><span className="sm:hidden">补全</span>
      </button>
    </>}
  </div>;
});
NoteAutocompleteTextarea.displayName = 'NoteAutocompleteTextarea';
