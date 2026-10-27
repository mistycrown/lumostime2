/**
 * @file appAwarenessService.test.ts
 * @updated 2026-10-27: Covers startup with missing randomUUID and avoids regenerating saved template IDs.
 * @input Persisted master switch, mixed app bindings and template enabled states
 * @output Regression coverage for suspend, reload and restore behavior
 * @pos Test
 * @updated 2026-10-18: Verifies the master switch preserves all individual settings across repeated toggles.
 */
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { installRandomUUIDFallback } from '../utils/cryptoCompatibility';
import { SETTINGS_KEYS } from '../constants/storageKeys';
import { appAwarenessService, buildAppAwarenessNativeBindings } from './appAwarenessService';

describe('legacy WebView startup', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  test('loads a new installation without native randomUUID', () => {
    const cryptoProvider = { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) } as Crypto;
    vi.stubGlobal('crypto', cryptoProvider);
    installRandomUUIDFallback();
    const templates = appAwarenessService.getTemplates();
    expect(templates).toHaveLength(1);
    expect(templates[0].steps).toHaveLength(5);
    expect(templates[0].steps[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('loads valid persisted templates without generating unused preset IDs', () => {
    const templates = appAwarenessService.buildPresetTemplates();
    appAwarenessService.saveTemplates(templates);
    const persistedTemplates = appAwarenessService.getTemplates();
    vi.stubGlobal('crypto', {});
    expect(appAwarenessService.getTemplates()).toEqual(persistedTemplates);
  });
});

describe('app-awareness master switch', () => {
  beforeEach(() => localStorage.clear());

  test('defaults to enabled for existing installations and persists an explicit off state', () => {
    expect(appAwarenessService.getEnabled()).toBe(true);
    expect(appAwarenessService.saveEnabled(false)).toBe(true);
    expect(appAwarenessService.getEnabled()).toBe(false);
    expect(localStorage.getItem(SETTINGS_KEYS.APP_AWARENESS_ENABLED)).toBe('false');
    expect(appAwarenessService.saveEnabled(true)).toBe(true);
    expect(appAwarenessService.getEnabled()).toBe(true);
  });

  test('suspends native bindings and restores mixed individual states after reloading', () => {
    const bindings = [
      { packageName: 'app.enabled', appName: 'Enabled', workflowTemplateId: 'workflow', enabled: true, updatedAt: 1 },
      { packageName: 'app.disabled', appName: 'Disabled', workflowTemplateId: 'workflow', enabled: false, updatedAt: 2 }
    ];
    const templates = appAwarenessService.buildPresetTemplates().map((template) => ({ ...template, enabled: false }));
    appAwarenessService.saveBindings(bindings);
    appAwarenessService.saveTemplates(templates);
    const savedBindings = localStorage.getItem(SETTINGS_KEYS.APP_AWARENESS_BINDINGS);
    const savedTemplates = localStorage.getItem(SETTINGS_KEYS.APP_AWARENESS_TEMPLATES);

    for (let cycle = 0; cycle < 3; cycle++) {
      appAwarenessService.saveEnabled(false);
      expect(buildAppAwarenessNativeBindings(appAwarenessService.getEnabled(), appAwarenessService.getBindings())).toEqual({});
      expect(localStorage.getItem(SETTINGS_KEYS.APP_AWARENESS_BINDINGS)).toBe(savedBindings);
      expect(localStorage.getItem(SETTINGS_KEYS.APP_AWARENESS_TEMPLATES)).toBe(savedTemplates);
      appAwarenessService.saveEnabled(true);
      expect(buildAppAwarenessNativeBindings(appAwarenessService.getEnabled(), appAwarenessService.getBindings()))
        .toEqual({ 'app.enabled': 'workflow' });
      expect(appAwarenessService.getBindings().find((binding) => binding.packageName === 'app.disabled')?.enabled).toBe(false);
      expect(appAwarenessService.getTemplates()[0].enabled).toBe(false);
    }
  });

  test('keeps native bindings empty when individual settings change while disabled', () => {
    appAwarenessService.saveEnabled(false);
    appAwarenessService.saveBindings([
      { packageName: 'new.app', appName: 'New', workflowTemplateId: 'new-template', enabled: true, updatedAt: 3 }
    ]);
    expect(buildAppAwarenessNativeBindings(appAwarenessService.getEnabled(), appAwarenessService.getBindings())).toEqual({});
    expect(buildAppAwarenessNativeBindings(true, appAwarenessService.getBindings())).toEqual({ 'new.app': 'new-template' });
    expect(buildAppAwarenessNativeBindings(true, [])).toEqual({});
  });
});
