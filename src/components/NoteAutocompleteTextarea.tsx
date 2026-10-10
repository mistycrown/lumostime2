/**
 * @file NoteAutocompleteTextarea.tsx
 * @updated 2026-10-10: Calibrates Android WebView text zoom before copying computed font size and line height to the ghost layer.
 * @updated 2026-10-10: Includes live node names and aliases in completion candidates.
 * @updated 2026-10-09: Refreshes suggestions after personal dictionary edits and restores.
 * @input Controlled note, historical logs, activity context and native textarea attributes/ref
 * @output One inline ghost suggestion accepted with Tab or the completion button
 * @pos Component (Record Note Editor)
 * @updated 2026-10-09: Adds caret-aware local completion, IME protection and synchronized multiline/scroll rendering.
 * @updated 2026-10-09: Keeps mobile text scaling and fractional wrap widths aligned; uses a borderless Tab action on every device.
 */
import React, { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Log } from '../types';
import { useTextDictionary } from '../hooks/useTextDictionary';
import { EMPTY_NOTE_HISTORY, getNoteAutocompleteIndex, getNoteCompletion } from '../utils/noteAutocomplete';

interface NoteAutocompleteTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
  history?: readonly Log[];
  activityId?: string;
}

const MIRROR_PROPERTIES = [
  'boxSizing', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant', 'fontStretch',
  'fontKerning', 'fontFeatureSettings', 'fontVariationSettings', 'fontSizeAdjust', 'lineHeight',
  'letterSpacing', 'wordSpacing', 'textIndent', 'textAlign', 'textTransform', 'textRendering', 'tabSize',
  'wordBreak', 'lineBreak', 'overflowWrap', 'direction',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderRadius'
] as const;
// Mobile text inflation can affect a div differently from its native textarea.
const NOTE_TEXT_SCALING: React.CSSProperties = { textSizeAdjust: 'none', WebkitTextSizeAdjust: 'none' };

export const NoteAutocompleteTextarea = forwardRef<HTMLTextAreaElement, NoteAutocompleteTextareaProps>(({
  value, onValueChange, history = EMPTY_NOTE_HISTORY, activityId,
  onFocus, onBlur, onSelect, onScroll, onKeyDown, onCompositionStart, onCompositionEnd,
  disabled, readOnly, className, style, ...props
}, forwardedRef) => {
  const personalWords = useTextDictionary();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  const [isComposing, setIsComposing] = useState(false);
  const [focused, setFocused] = useState(false);
  const [caret, setCaret] = useState({ value, start: value.length, end: value.length });
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [mirrorStyle, setMirrorStyle] = useState<React.CSSProperties>({});
  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const index = useMemo(() => getNoteAutocompleteIndex(history, personalWords), [history, personalWords]);
  useImperativeHandle(forwardedRef, () => inputRef.current!, []);

  const readCaret = () => {
    const input = inputRef.current;
    if (input) setCaret((current) => {
      const next = { value: input.value, start: input.selectionStart, end: input.selectionEnd };
      return current.value === next.value && current.start === next.start && current.end === next.end ? current : next;
    });
  };
  useLayoutEffect(() => { readCaret(); setDismissed(null); }, [value, activityId, personalWords]);
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
      // WebView reports system-zoomed font metrics, then zooms copied px values again.
      // Measure an explicit 100px probe instead of changing the user's font preferences.
      const probe = input.ownerDocument.createElement('span');
      probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden;text-size-adjust:none;-webkit-text-size-adjust:none';
      probe.style.setProperty('font-size', '100px', 'important');
      probe.style.setProperty('line-height', '100px', 'important');
      input.parentElement!.append(probe);
      const probeStyle = window.getComputedStyle(probe);
      const fontZoom = parseFloat(probeStyle.fontSize) / 100;
      const lineZoom = parseFloat(probeStyle.lineHeight) / 100;
      probe.remove();
      if (Number.isFinite(fontZoom) && fontZoom > 0) next.fontSize = `${parseFloat(computed.fontSize) / fontZoom}px`;
      if (Number.isFinite(lineZoom) && lineZoom > 0 && computed.lineHeight.endsWith('px')) {
        next.lineHeight = `${parseFloat(computed.lineHeight) / lineZoom}px`;
      }
      const borderWidth = parseFloat(computed.borderLeftWidth) + parseFloat(computed.borderRightWidth);
      const scrollbarWidth = Math.max(0, input.offsetWidth - input.clientWidth - Math.round(borderWidth));
      next.width = parseFloat(computed.width) - scrollbarWidth;
      next.height = computed.height;
      next.top = input.offsetTop;
      next.left = input.offsetLeft;
      next.borderStyle = 'solid';
      next.borderColor = 'transparent';
      next.color = 'transparent';
      next.whiteSpace = props.wrap === 'off' ? 'pre' : 'pre-wrap';
      setMirrorStyle({ ...next, ...NOTE_TEXT_SCALING });
      setScroll({ top: input.scrollTop, left: input.scrollLeft });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(input);
    document.fonts.addEventListener('loadingdone', update);
    return () => { observer.disconnect(); document.fonts.removeEventListener('loadingdone', update); };
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

  return <div className="relative" style={NOTE_TEXT_SCALING}>
    <textarea {...props} ref={inputRef} value={value} disabled={disabled} readOnly={readOnly}
      className={className} style={{ ...style, ...NOTE_TEXT_SCALING }} aria-autocomplete="inline"
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
        className="absolute bottom-2 right-3 border-0 bg-transparent px-2 py-1 text-[11px] text-stone-500 hover:text-stone-800 active:scale-95">
        Tab
      </button>
    </>}
  </div>;
});
NoteAutocompleteTextarea.displayName = 'NoteAutocompleteTextarea';
