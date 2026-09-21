import { describe, expect, it } from 'vitest';
import {
  extractQuickAddNoteDescription,
  isQuickAddNoteCommand,
  QUICK_ADD_NOTE_PREFIX
} from './quickAddNote';

describe('quickAddNote', () => {
  it('extracts the note description after the command prefix', () => {
    expect(extractQuickAddNoteDescription(`${QUICK_ADD_NOTE_PREFIX} 记录实验中的异常`)).toBe('记录实验中的异常');
  });

  it('rejects plain text and empty commands', () => {
    expect(extractQuickAddNoteDescription('记录实验中的异常')).toBeNull();
    expect(isQuickAddNoteCommand(`${QUICK_ADD_NOTE_PREFIX}   `)).toBe(false);
  });
});
