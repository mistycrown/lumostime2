/**
 * @file desktopWidgetState.ts
 * @input Native widget state filenames, layout changes, legacy renderer preferences
 * @output Atomic UTF-8 widget snapshots and persisted startup selections
 * @pos Electron persistence
 * @description Keeps window layouts and enabled state together, including across shutdowns.
 * @updated 2026-10-13: Added native startup preferences with one-time legacy migration.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export type DesktopWidgetStartupType = 'today' | 'month' | 'quick' | 'timer' | 'ai';
export type PersistedWidgetWindowState = {
  enabled?: boolean;
  bounds?: { x: number; y: number; width: number; height: number };
  hiddenToEdge?: boolean;
  hiddenEdge?: 'left' | 'right';
};

export const DESKTOP_WIDGET_STATE_FILES: Record<DesktopWidgetStartupType, string> = {
  today: 'desktop-widget-state.json',
  month: 'desktop-month-widget-state.json',
  quick: 'desktop-quick-widget-state.json',
  timer: 'desktop-timer-widget-state.json',
  ai: 'desktop-ai-widget-state.json'
};

export class DesktopWidgetStateStore {
  constructor(private readonly directory: string) {}

  read(type: DesktopWidgetStartupType): PersistedWidgetWindowState {
    try {
      const state = JSON.parse(readFileSync(this.getPath(type), 'utf8'));
      return state && typeof state === 'object' && !Array.isArray(state) ? state : {};
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        console.error(`[Electron] Failed to read ${type} widget state`, error);
      }
      return {};
    }
  }

  update(type: DesktopWidgetStartupType, patch: PersistedWidgetWindowState): void {
    const state = { ...this.read(type), ...patch };
    const filePath = this.getPath(type);
    // Synchronous atomic writes prevent close/shutdown from interrupting a queued save,
    // and keep successive move/resize/enable updates from overwriting each other.
    mkdirSync(this.directory, { recursive: true });
    writeFileSync(`${filePath}.tmp`, JSON.stringify(state, null, 2), 'utf8');
    renameSync(`${filePath}.tmp`, filePath);
  }

  migrateLegacyPreferences(legacyTypes: unknown): void {
    if (!Array.isArray(legacyTypes)) {
      return;
    }
    for (const type of Object.keys(DESKTOP_WIDGET_STATE_FILES) as DesktopWidgetStartupType[]) {
      if (typeof this.read(type).enabled !== 'boolean') {
        this.update(type, { enabled: legacyTypes.includes(type) });
      }
    }
  }

  getEnabledTypes(): DesktopWidgetStartupType[] {
    return (Object.keys(DESKTOP_WIDGET_STATE_FILES) as DesktopWidgetStartupType[])
      .filter((type) => this.read(type).enabled === true);
  }

  private getPath(type: DesktopWidgetStartupType): string {
    return path.join(this.directory, DESKTOP_WIDGET_STATE_FILES[type]);
  }
}
