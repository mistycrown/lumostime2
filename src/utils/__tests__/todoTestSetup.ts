/**
 * @file todoTestSetup.ts
 * @input Node-based todo regression suites with browser storage consumers
 * @output Isolated localStorage implementation before module initialization
 * @pos Test setup
 * @updated 2026-10-16: Enables existing modal and widget suites to load browser services in Node.
 */
const values = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    get length() { return values.size; },
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
    key: (index: number) => Array.from(values.keys())[index] ?? null
  }
});
