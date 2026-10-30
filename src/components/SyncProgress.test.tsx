/**
 * @file SyncProgress.test.tsx
 * @input Transfer stages with known or unknown image counts
 * @output Regression checks for accessible progress without fabricated percentages
 * @updated 2026-10-30: Covers idle, data stages, partial image processing and empty queues.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { SyncProgress } from './SyncProgress';

it('hides idle status and announces stages without inventing a percentage', () => {
  expect(renderToStaticMarkup(<SyncProgress progress={null} />)).toBe('');
  const markup = renderToStaticMarkup(<SyncProgress progress={{ message: '正在校验云端数据...' }} />);
  expect(markup).toContain('role="status"');
  expect(markup).toContain('正在校验云端数据...');
  expect(markup).not.toContain('<progress');
  expect(markup).not.toContain('%');
});

it('shows genuine image counts and a labelled progress bar', () => {
  const markup = renderToStaticMarkup(<SyncProgress progress={{ message: '正在下载图片...', counts: { completed: 3, total: 20 } }} />);
  expect(markup).toContain('已处理 3/20');
  expect(markup).toContain('value="3" max="20"');
  expect(markup).toContain('aria-label="图片处理进度"');
  expect(renderToStaticMarkup(<SyncProgress progress={{ message: '正在下载图片...', counts: { completed: 0, total: 0 } }} />)).not.toContain('<progress');
});
