/**
 * @file RoutineChecklistPreview.tsx
 * @input Markdown checklist text and compact display options
 * @output Read-only visual checklist rows for timeline surfaces
 * @pos Component (Timeline)
 * @description Renders Routine Markdown checklist notes as themed checkbox rows instead of raw Markdown.
 * @updated 2026-08-26: Added shared checklist preview for timeline cards and schedule blocks.
 */
import React from 'react';
import { Check } from 'lucide-react';
import { isRoutineChecklistMarkdown, parseRoutineChecklist } from '../utils/routineChecklist';

interface RoutineChecklistPreviewProps {
  markdown: string;
  compact?: boolean;
  className?: string;
}

export const RoutineChecklistPreview: React.FC<RoutineChecklistPreviewProps> = ({
  markdown,
  compact = false,
  className = ''
}) => {
  if (!isRoutineChecklistMarkdown(markdown)) return null;

  const entries = parseRoutineChecklist(markdown);
  if (entries.length === 0) return null;

  return (
    <div className={`space-y-1 ${compact ? 'text-[10px] leading-3' : 'text-sm leading-5'} ${className}`}>
      {entries.map((entry, index) => (
        <div key={`${index}-${entry.text}`} className="flex min-w-0 items-start gap-1.5">
          <span
            aria-hidden="true"
            className={`mt-0.5 flex shrink-0 items-center justify-center rounded-[4px] border ${compact ? 'h-3 w-3 border-[1.5px]' : 'h-4 w-4 border-2'} ${entry.completed ? 'border-[var(--accent-color)] bg-[var(--accent-color)] text-white' : 'border-stone-300 bg-white text-transparent'}`}
          >
            <Check size={compact ? 8 : 11} strokeWidth={3} />
          </span>
          <span className={`min-w-0 break-words ${entry.completed ? 'text-stone-400 line-through' : ''}`}>
            {entry.text}
          </span>
        </div>
      ))}
    </div>
  );
};
