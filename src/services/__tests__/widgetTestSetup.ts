/**
 * @file widgetTestSetup.ts
 * @input Node-based widget tests importing browser storage services.
 * @output In-memory localStorage before module initialization.
 * @updated 2026-10-29: Isolates native-widget payload tests from the browser runtime.
 */
import { vi } from 'vitest';

const values = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, String(value)),
  removeItem: (key: string) => values.delete(key),
  clear: () => values.clear()
});
