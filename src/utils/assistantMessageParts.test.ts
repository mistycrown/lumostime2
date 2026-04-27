import { describe, expect, it } from 'vitest';
import { buildAssistantDisplayParts, normalizeAssistantDisplayParts } from './assistantMessageParts';

describe('assistantMessageParts', () => {
  it('prefers structured reply parts when they are present and usable', () => {
    expect(buildAssistantDisplayParts(
      '我在。先慢一点。',
      ['  我在。', '先慢一点。  ']
    )).toEqual(['我在。', '先慢一点。']);
  });

  it('falls back to paragraph splitting when no structured parts are provided', () => {
    expect(buildAssistantDisplayParts('先收一下。\n\n然后只做下一步。')).toEqual([
      '先收一下。',
      '然后只做下一步。'
    ]);
  });

  it('uses conservative sentence splitting instead of fragmenting very short replies', () => {
    expect(buildAssistantDisplayParts('我在。你先喝口水。然后我们只做下一步。')).toEqual([
      '我在。',
      '你先喝口水。',
      '然后我们只做下一步。'
    ]);
    expect(buildAssistantDisplayParts('好。行。')).toBeUndefined();
  });

  it('normalizes persisted display parts and falls back to content when needed', () => {
    expect(normalizeAssistantDisplayParts([' 先确认一下。 ', '', '然后继续。'])).toEqual([
      '先确认一下。',
      '然后继续。'
    ]);
    expect(normalizeAssistantDisplayParts([], '先确认一下。\n\n然后继续。')).toEqual([
      '先确认一下。',
      '然后继续。'
    ]);
  });
});
