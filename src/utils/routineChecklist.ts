/**
 * @file routineChecklist.ts
 * @input Markdown checklist text
 * @output Parsed checklist entries and updated Markdown
 * @pos Utility Layer (Routine)
 * @description Keeps Routine checklist templates readable in storage while providing safe editing helpers.
 * @updated 2026-08-26: Added Markdown checklist parsing, serialization, and item editing helpers.
 */

export interface RoutineChecklistEntry {
  text: string;
  completed: boolean;
}

const CHECKLIST_LINE = /^\s*[-*]\s*\[([ xX])\]\s*(.*?)\s*$/;

export const isRoutineChecklistMarkdown = (markdown?: string): boolean => {
  const lines = (markdown || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  return lines.length > 0 && lines.every(line => CHECKLIST_LINE.test(line));
};

export const parseRoutineChecklist = (markdown?: string): RoutineChecklistEntry[] => (
  (markdown || '')
    .split(/\r?\n/)
    .map(line => line.match(CHECKLIST_LINE))
    .filter((match): match is RegExpMatchArray => Boolean(match && match[2]))
    .map(match => ({ text: match[2], completed: match[1].toLowerCase() === 'x' }))
);

export const serializeRoutineChecklist = (entries: RoutineChecklistEntry[]): string => (
  entries
    .filter(entry => entry.text.trim())
    .map(entry => `- [${entry.completed ? 'x' : ' '}] ${entry.text.trim()}`)
    .join('\n')
);

export const updateRoutineChecklistItem = (
  markdown: string | undefined,
  index: number,
  patch: Partial<RoutineChecklistEntry>
): string => {
  const entries = parseRoutineChecklist(markdown);
  if (!entries[index]) return markdown || '';
  entries[index] = { ...entries[index], ...patch };
  return serializeRoutineChecklist(entries);
};

export const toggleRoutineChecklistItem = (markdown: string | undefined, index: number): string => {
  const entries = parseRoutineChecklist(markdown);
  if (!entries[index]) return markdown || '';
  entries[index] = { ...entries[index], completed: !entries[index].completed };
  return serializeRoutineChecklist(entries);
};

export const resetRoutineChecklist = (markdown?: string): string => (
  serializeRoutineChecklist(parseRoutineChecklist(markdown).map(entry => ({ ...entry, completed: false })))
);

export const addRoutineChecklistItem = (markdown: string | undefined): string => (
  serializeRoutineChecklist([
    ...parseRoutineChecklist(markdown),
    { text: '新 checklist 条目', completed: false }
  ])
);
