import { describe, expect, it } from 'vitest';
import {
  extractQuickAddTodoDescription,
  isQuickAddTodoCommand,
  QUICK_ADD_TODO_PREFIX
} from './quickAddTodo';

describe('quickAddTodo', () => {
  it('extracts only the explicit quick-add command description', () => {
    expect(extractQuickAddTodoDescription(`${QUICK_ADD_TODO_PREFIX} 买牛奶`)).toBe('买牛奶');
    expect(extractQuickAddTodoDescription('买牛奶')).toBeNull();
    expect(extractQuickAddTodoDescription(`${QUICK_ADD_TODO_PREFIX}   `)).toBeNull();
  });

  it('recognizes the command without matching ordinary text', () => {
    expect(isQuickAddTodoCommand(`${QUICK_ADD_TODO_PREFIX} 整理桌面`)).toBe(true);
    expect(isQuickAddTodoCommand('快速添加待办-整理桌面')).toBe(false);
  });
});
