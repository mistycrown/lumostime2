/**
 * @file desktopWidgetState.test.ts
 * @input Temporary native widget snapshots and legacy startup preferences
 * @output Regression coverage for restart persistence and legacy migration
 * @pos Electron tests
 * @updated 2026-10-13: Covers merged layout saves, explicit close, and corrupt files.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DesktopWidgetStateStore, DESKTOP_WIDGET_STATE_FILES } from './desktopWidgetState';

const directories: string[] = [];
const createStore = () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'lumostime-widget-test-'));
  directories.push(directory);
  return { directory, store: new DesktopWidgetStateStore(directory) };
};

afterEach(() => {
  directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true }));
  vi.restoreAllMocks();
});

describe('native desktop widget state', () => {
  it('keeps enabled state, latest layout and AI docking together across process restarts', () => {
    const { directory, store } = createStore();
    const bounds = { x: 140, y: 80, width: 440, height: 620 };
    store.update('ai', { enabled: true });
    store.update('ai', { bounds, hiddenToEdge: true, hiddenEdge: 'right' });
    const restarted = new DesktopWidgetStateStore(directory);
    expect(restarted.getEnabledTypes()).toEqual(['ai']);
    expect(restarted.read('ai')).toEqual({ enabled: true, bounds, hiddenToEdge: true, hiddenEdge: 'right' });
    expect(JSON.parse(readFileSync(path.join(directory, DESKTOP_WIDGET_STATE_FILES.ai), 'utf8'))).toEqual(restarted.read('ai'));
  });

  it('does not resurrect explicitly closed windows from stale renderer preferences', () => {
    const { store } = createStore();
    store.update('today', { enabled: false });
    store.migrateLegacyPreferences(['today', 'quick']);
    store.migrateLegacyPreferences(['today', 'month']);
    expect(store.getEnabledTypes()).toEqual(['quick']);
    expect(store.read('today').enabled).toBe(false);
    expect(store.read('month').enabled).toBe(false);
  });

  it('migrates existing bounds-only files without moving the window', () => {
    const { directory, store } = createStore();
    const bounds = { x: -780, y: 30, width: 360, height: 520 };
    writeFileSync(path.join(directory, DESKTOP_WIDGET_STATE_FILES.quick), JSON.stringify({ bounds }), 'utf8');
    store.migrateLegacyPreferences(['quick', 'timer', 'invalid']);
    expect(store.getEnabledTypes()).toEqual(['quick', 'timer']);
    expect(store.read('quick')).toEqual({ bounds, enabled: true });
    store.update('quick', { enabled: false });
    store.update('quick', { bounds: { ...bounds, x: -600 } });
    expect(store.read('quick').enabled).toBe(false);
  });

  it('recovers missing or corrupt state while ignoring invalid migration payloads', () => {
    const { directory, store } = createStore();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    writeFileSync(path.join(directory, DESKTOP_WIDGET_STATE_FILES.today), '{broken', 'utf8');
    expect(store.read('today')).toEqual({});
    store.migrateLegacyPreferences(null);
    expect(store.getEnabledTypes()).toEqual([]);
    store.migrateLegacyPreferences(['today']);
    expect(store.getEnabledTypes()).toEqual(['today']);
  });
});
