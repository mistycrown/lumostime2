/**
 * @file BufferedTextarea.tsx
 * @input Saved text, record identity, text commit callback, textarea attributes
 * @output Responsive local text editing with commits on blur, exit and backgrounding
 * @pos Component (Forms)
 * @description Keeps long text input out of global persistence until editing ends.
 */
import React, { forwardRef } from 'react';
import { useBufferedRecord } from '../hooks/useBufferedRecord';

interface BufferedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  value: string;
  draftKey: string;
  onValueCommit: (value: string) => void;
}

const TextareaDraft = forwardRef<HTMLTextAreaElement, BufferedTextareaProps>(
  ({ value, draftKey, onValueCommit, onBlur, ...props }, ref) => {
    const draft = useBufferedRecord({ id: draftKey, text: value }, (record) => onValueCommit(record.text));
    return <textarea {...props} ref={ref} value={draft.value.text}
      onChange={(event) => draft.update({ ...draft.value, text: event.target.value })}
      onBlur={(event) => { draft.commit(); onBlur?.(event); }} />;
  }
);

export const BufferedTextarea = forwardRef<HTMLTextAreaElement, BufferedTextareaProps>(
  (props, ref) => <TextareaDraft key={props.draftKey} {...props} ref={ref} />
);
