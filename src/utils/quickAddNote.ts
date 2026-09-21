/**
 * @file quickAddNote.ts
 * @input User-entered AI chat text
 * @output Quick-add-note command prefix and extracted note description
 * @pos Utility (AI Note Shortcut)
 * @description Centralizes the explicit command marker used by the AI quick-add-note flow.
 */

export const QUICK_ADD_NOTE_PREFIX = '快速添加备注：';

export const extractQuickAddNoteDescription = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed.startsWith(QUICK_ADD_NOTE_PREFIX)) {
    return null;
  }

  return trimmed.slice(QUICK_ADD_NOTE_PREFIX.length).trim() || null;
};

export const isQuickAddNoteCommand = (value: string): boolean => (
  extractQuickAddNoteDescription(value) !== null
);
