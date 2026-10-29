/**
 * @file journalMarkdown.test.ts
 * @input Mixed Chinese CommonMark/GFM narratives
 * @output Coverage for hierarchy, emphasis, nested/task lists and lossless styled wrapping
 * @updated 2026-10-24: Verifies syntax is parsed as structure instead of printed markers.
 * @updated 2026-10-29: Checks aliases retain canonical node targets when mixed with Markdown.
 */
import { describe, expect, it } from 'vitest';
import { parseJournalMarkdown, wrapJournalMarkdownSpans } from './journalMarkdown';

describe('journal narrative Markdown', () => {
  it('preserves node aliases and their styles without interpreting nodes inside code', () => {
    const blocks = parseJournalMarkdown('**[[书签丨阅读]]** 与[[朋友]]，`[[代码]]`。');
    expect(blocks[0].spans).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: '书签', node: '阅读', bold: true }),
      expect.objectContaining({ text: '朋友', node: '朋友' }),
      expect.objectContaining({ text: '[[代码]]', code: true })
    ]));
    const wrapped = wrapJournalMarkdownSpans(blocks[0].spans, 20, (span) => span.text.length);
    expect(wrapped.flat().find((span) => span.text === '书签')?.node).toBe('阅读');
    expect(wrapped.flat().find((span) => span.code)?.node).toBeUndefined();
  });
  it('keeps all six heading levels and nested inline emphasis', () => {
    const headings = parseJournalMarkdown(Array.from({ length: 6 }, (_, index) => '#'.repeat(index + 1) + ' 标题' + index).join('\n\n'));
    expect(headings.map((block) => block.depth)).toEqual([1, 2, 3, 4, 5, 6]);
    const [body] = parseJournalMarkdown('正文 **加粗和*斜体***，~~删除~~与`代码`。');
    expect(body.spans.find((span) => span.text === '加粗和')?.bold).toBe(true);
    expect(body.spans.find((span) => span.text === '斜体')).toMatchObject({ bold: true, italic: true });
    expect(body.spans.find((span) => span.text === '删除')?.strike).toBe(true);
    expect(body.spans.find((span) => span.text === '代码')?.code).toBe(true);
  });
  it('keeps ordered starts, nested lists, task state, quotes, links and code text', () => {
    const blocks = parseJournalMarkdown('3. 有序项目\n   - 子项目\n\n- [x] 已做\n- [ ] 未做\n\n> 引用\n\n[链接][ref]\n\n[ref]: https://example.com\n\n```txt\n# 这是代码\n```');
    expect(blocks.map((block) => block.marker).filter((marker) => marker)).toEqual(['3.', '•']);
    expect(blocks.find((block) => block.spans[0]?.text === '子项目')?.indent).toBe(2);
    expect(blocks.filter((block) => typeof block.checked === 'boolean').map((block) => block.checked)).toEqual([true, false]);
    expect(blocks.find((block) => block.spans[0]?.text === '引用')?.quote).toBe(1);
    expect(blocks.flatMap((block) => block.spans).find((span) => span.text === '链接')?.url).toBe('https://example.com');
    expect(blocks.at(-1)).toMatchObject({ kind: 'code', spans: [{ text: '# 这是代码', code: true }] });
  });
  it('keeps table cells readable and wraps Chinese/emoji without losing style or text', () => {
    const blocks = parseJournalMarkdown('| 项目 | 记录 |\n| --- | --- |\n| 阅读 | 三十页 |');
    expect(blocks.flatMap((block) => block.spans).map((span) => span.text).join('')).toBe('项目: 阅读\n记录: 三十页');
    const spans = [{ text: '春天，', bold: true }, { text: '👩‍💻记录新的开始。', italic: true }];
    const lines = wrapJournalMarkdownSpans(spans, 5, (span) => [...span.text].length);
    expect(lines.flat().map((span) => span.text).join('')).toBe(spans.map((span) => span.text).join(''));
    expect(lines.flat().filter((span) => span.bold).map((span) => span.text).join('')).toBe('春天，');
    expect(lines.flat().some((span) => span.text.includes('👩‍💻'))).toBe(true);
  });
});
