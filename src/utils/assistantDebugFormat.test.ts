/**
 * @file assistantDebugFormat.test.ts
 * @input Synthetic malformed AI response payloads
 * @output Regression coverage for assistant debug formatting helpers
 * @pos Tests (Assistant Debug Formatting)
 * @description Verifies that HTML and plain-text non-JSON AI failures are summarized clearly and that the shared debug viewer receives explicit raw-response blocks.
 * @updated 2026-05-14: Added coverage for HTML error-page summaries and raw-response debug block generation.
 */

import { describe, expect, it } from 'vitest';
import { buildNonJsonDebugBlocks, summarizeNonJsonDebugResponse } from './assistantDebugFormat';

describe('assistantDebugFormat', () => {
  it('summarizes HTML error pages with status and title context', () => {
    const summary = summarizeNonJsonDebugResponse({
      rawResponseText: '<!doctype html><html><head><title>502 Bad Gateway</title></head><body><h1>Bad Gateway</h1><p>nginx</p></body></html>'
    }, 502);

    expect(summary).toBe('服务端返回了 HTML 页面（HTTP 502，页面标题：502 Bad Gateway，网关线索：nginx），不是 JSON 响应。');
  });

  it('summarizes plain-text non-json responses with a readable snippet', () => {
    const summary = summarizeNonJsonDebugResponse({
      rawResponseText: 'upstream connect error or disconnect/reset before headers. reset reason: connection timeout'
    }, 503);

    expect(summary).toBe('服务端返回了非 JSON 文本响应（HTTP 503）：upstream connect error or disconnect/reset before headers. reset reason: connection timeout');
  });

  it('builds explicit raw-response debug blocks for malformed responses', () => {
    const blocks = buildNonJsonDebugBlocks({
      rawResponseText: '<!doctype html><html><head><title>403 Forbidden</title></head><body>Cloudflare</body></html>',
      transportError: 'Unexpected token \'<\', "<!doctype "... is not valid JSON'
    });

    expect(blocks.map((block) => block.label)).toEqual([
      '原始响应摘要',
      '解析失败原因',
      '原始响应文本',
      '完整响应体'
    ]);
    expect(blocks[0]?.content).toContain('HTML 页面');
    expect(blocks[1]?.content).toContain('Unexpected token');
    expect(blocks[2]?.content).toContain('<!doctype html>');
    expect(blocks[3]?.content).toContain('transportError');
  });
});
