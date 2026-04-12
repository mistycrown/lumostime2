/**
 * @file OnThisDayView.test.tsx
 * @input OnThisDayView module exports
 * @output Regression coverage for historical review quote rendering and multiline note content
 * @pos Test
 * @description Ensures the On This Day review tab uses quote-style answers and preserves line breaks for historical review and note content.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OnThisDayView } from './OnThisDayView';

vi.hoisted(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
    configurable: true,
  });

  Object.defineProperty(globalThis, 'indexedDB', {
    value: {
      open: vi.fn(),
    },
    configurable: true,
  });
});

vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({
    scheduleStyle: 'timeline',
    timelineStyleTheme: 'default',
    timelineStyleConfigs: { default: {} },
  }),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('../contexts/PrivacyContext', () => ({
  usePrivacy: () => ({ isPrivacyMode: false }),
}));

vi.mock('../components/ConfirmModal', () => ({
  ConfirmModal: () => null,
}));

vi.mock('../components/TimelineImage', () => ({
  TimelineImage: () => null,
}));

vi.mock('../components/IconRenderer', () => ({
  IconRenderer: () => null,
}));

vi.mock('../components/TimelineStyleRail', () => ({
  TimelineStyleRail: () => null,
}));

describe('OnThisDayView formatting', () => {
  it('renders review answers as quoted multiline content in the review tab', () => {
    const markup = renderToStaticMarkup(
      <OnThisDayView
        date={new Date('2026-04-12T12:00:00')}
        logs={[]}
        dailyReviews={[
          {
            id: 'review-1',
            date: '2025-04-12',
            createdAt: 0,
            updatedAt: 0,
            summary: '第一行\n第二行',
            answers: [
              {
                questionId: 'question-1',
                question: '今天发生了什么？',
                answer: '这是一个测试\n换行测试',
              },
            ],
          } as any,
        ]}
        categories={[]}
        scopes={[]}
        todos={[]}
        onThisDayEntries={[]}
        onUpdateOnThisDayEntries={() => {}}
        initialTab="review"
      />
    );

    expect(markup).toContain('第一行\n第二行');
    expect(markup).toContain('这是一个测试\n换行测试');
    expect(markup).toContain('border-l-2 border-stone-200 pl-4 text-[15px] leading-7 text-stone-700 whitespace-pre-wrap');
  });

  it('preserves multiline note content in the notes tab', () => {
    const markup = renderToStaticMarkup(
      <OnThisDayView
        date={new Date('2026-04-12T12:00:00')}
        logs={[]}
        dailyReviews={[]}
        categories={[]}
        scopes={[]}
        todos={[]}
        onThisDayEntries={[
          {
            id: 'entry-1',
            monthDay: '04-12',
            createdAt: 0,
            updatedAt: 0,
            notes: [
              {
                id: 'note-1',
                content: '笺注第一行\n笺注第二行',
                createdAt: 0,
              },
            ],
          },
        ]}
        onUpdateOnThisDayEntries={() => {}}
        initialTab="notes"
      />
    );

    expect(markup).toContain('笺注第一行\n笺注第二行');
    expect(markup).toContain('<p class="text-[15px] leading-7 text-stone-700 whitespace-pre-wrap">笺注第一行');
  });
});
