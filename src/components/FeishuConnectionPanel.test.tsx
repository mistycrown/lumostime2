/**
 * @file FeishuConnectionPanel.test.tsx
 * @input Unconfigured, loading, disconnected and connected presentation states.
 * @output Regression coverage for the missing user authorization button.
 * @pos Feishu settings UI tests.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { FeishuConnectionPanel } from './FeishuConnectionPanel';
import type { FeishuConnectionStatus } from '../services/feishuCalendarClient';

const render = (connection: FeishuConnectionStatus | null) => renderToStaticMarkup(<FeishuConnectionPanel
  connection={connection} busy={false} onConnect={() => {}} onDisconnect={() => {}} />);

it('always shows an actionable connect button when loading, unconfigured or disconnected', () => {
  for (const connection of [null, { configured: false, status: 'disconnected' as const }, { configured: true, status: 'disconnected' as const }]) {
    const html = render(connection);
    expect(html).toContain('连接飞书</button>');
    expect(html).not.toContain(' disabled=""');
    expect(html).not.toContain('type="password"');
  }
});

it('offers reconnect after failure/expiry and disconnect after successful authorization', () => {
  expect(render({ configured: true, status: 'error' })).toContain('重新连接飞书');
  expect(render({ configured: true, status: 'expired' })).toContain('重新连接飞书');
  expect(render({ configured: true, status: 'connected', userName: '测试用户' })).toContain('断开连接');
  expect(render({ configured: true, status: 'pending' })).toContain('等待飞书授权');
});
