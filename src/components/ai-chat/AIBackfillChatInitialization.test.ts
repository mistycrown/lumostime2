/**
 * @file AIBackfillChatInitialization.test.ts
 * @input Shortcut payloads from local persistence
 * @output Regression coverage for shortcut normalization
 * @pos Test (AI Integration)
 * @description Ensures malformed shortcut entries cannot leak into the homepage or composer menus.
 */
import { describe, expect, it } from 'vitest';
import { normalizeShortcuts } from './AIBackfillChatInitialization';

describe('normalizeShortcuts', () => {
  it('keeps valid entries, trims text, and defaults enabled to true', () => {
    expect(normalizeShortcuts([
      { id: ' shortcut-1 ', title: ' 整理今天 ', content: ' 帮我整理今天的记录。 ' },
      { id: 'disabled', title: '停用', content: '不要显示', enabled: false },
      { id: '', title: '无效', content: '缺少 id' },
      { id: 'empty', title: '', content: '缺少名称' }
    ])).toEqual([
      { id: 'shortcut-1', title: '整理今天', content: '帮我整理今天的记录。', enabled: true },
      { id: 'disabled', title: '停用', content: '不要显示', enabled: false }
    ]);
  });
});
