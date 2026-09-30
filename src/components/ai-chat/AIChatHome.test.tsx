/**
 * @file AIChatHome.test.tsx
 * @input AI home composer component source
 * @output Regression coverage for the full-width composer background
 * @pos Test
 */
import { describe, expect, it } from 'vitest';

const filesystem = process.getBuiltinModule('fs');
const source = filesystem?.readFileSync(new URL('./AIChatHome.tsx', import.meta.url), 'utf8') ?? '';

describe('AIChatHome composer background', () => {
  it('extends the themed surface through the bottom viewport edge', () => {
    expect(source).toContain('absolute inset-x-0 bottom-0 z-20 px-4 pb-4 sm:px-8 sm:pb-5" style={{ backgroundColor: theme.shellLayerBg }}');
    expect(source).not.toContain('className="pointer-events-auto relative mx-auto max-w-6xl pt-3" style={{ backgroundColor: theme.shellLayerBg }}');
  });

  it('opens the chat view from composer focus without sending the draft', () => {
    expect(source).toContain('onFocusChat: (text: string) => void;');
    expect(source).toContain('onFocus={() => onFocusChat(quickChatText)}');
    expect(source).toContain("if (event.key === 'Enter') { event.preventDefault(); sendQuickChat(); }");
  });
});
