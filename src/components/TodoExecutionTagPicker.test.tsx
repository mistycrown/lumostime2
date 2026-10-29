import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TodoExecutionTagPicker } from './TodoExecutionTagPicker';

describe('TodoExecutionTagPicker', () => {
  it('renders existing execution tags and the lightweight add entry', () => {
    const html = renderToStaticMarkup(
      <TodoExecutionTagPicker
        executionTags={[
          { id: 'energy:high', name: '\u9ad8\u7cbe\u529b', group: 'energy', source: 'preset' },
          { id: 'custom:quiet', name: '\u9700\u8981\u5b89\u9759', group: 'custom', source: 'user' }
        ]}
        onChange={vi.fn()}
      />
    );

    expect(html).toContain('\u9ad8\u7cbe\u529b');
    expect(html).toContain('\u9700\u8981\u5b89\u9759');
    expect(html).toContain('\u6dfb\u52a0');
    expect(html).toContain('aria-expanded="false"');
  });
});
