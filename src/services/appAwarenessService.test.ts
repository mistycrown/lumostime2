/**
 * @file appAwarenessService.test.ts
 * @input Persisted master switch, mixed app bindings and template enabled states
 * @output Regression coverage for suspend, reload and restore behavior
 * @pos Test
 * @updated 2026-10-18: Verifies the master switch preserves all individual settings across repeated toggles.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { SETTINGS_KEYS } from '../constants/storageKeys';
import { appAwarenessService, buildAppAwarenessNativeBindings } from './appAwarenessService';

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
