/**
 * @file TodoDatePickerModal.test.tsx
 * @input TodoDatePickerModal props with malformed date values
 * @output Regression coverage for resilient date-picker rendering
 * @pos Test
 * @description Verifies the shared todo date picker safely falls back when callers provide invalid short-month date strings.
 * @updated 2026-05-18: Added regression coverage so malformed `yyyy-MM-dd` and `yyyy-MM` inputs no longer crash the picker render tree.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';
import { TodoDatePickerModal } from './TodoDatePickerModal';

describe('TodoDatePickerModal regression', () => {
  test('renders safely when opened with an invalid full-date value', () => {
    expect(() => renderToStaticMarkup(
      <TodoDatePickerModal
        isOpen
        title="Invalid Full Date"
        value="2026-02-31"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    )).not.toThrow();
  });

  test('renders safely when opened with an invalid month-only value', () => {
    const html = renderToStaticMarkup(
      <TodoDatePickerModal
        isOpen
        title="Invalid Month"
        initialMonthValue="2026-13"
        mode="month"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('Invalid Month');
  });
});
