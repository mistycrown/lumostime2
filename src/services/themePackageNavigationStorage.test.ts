/**
 * @file themePackageNavigationStorage.test.ts
 * @input Schema-v2 theme ZIPs, legacy native image URLs, and a nearly full localStorage
 * @output Integration coverage for applying navigation assets before startup hydration finishes
 * @pos Test (Theme Package Application)
 * @updated 2026-10-05: Covers quota recovery and subsequent card-background selection.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { parseThemePackage } from './themePackageService';

const images = vi.hoisted(() => ({ getImageUrl: vi.fn() }));
vi.mock('./imageService', () => ({ imageService: images }));
vi.mock('./backgroundService', () => ({ backgroundService: {} }));
vi.mock('./colorSchemeService', () => ({ colorSchemeService: {} }));
vi.mock('./appearanceBackupService', () => ({ APPEARANCE_RESTORED_EVENT: 'appearance-restored' }));

beforeEach(() => {
  vi.resetModules();
  images.getImageUrl.mockReset();
  vi.stubGlobal('window', { dispatchEvent: vi.fn(), addEventListener: vi.fn() });
  vi.stubGlobal('CustomEvent', class { constructor(public type: string, public detail?: unknown) {} });
});

afterEach(() => { vi.unstubAllGlobals(); });

describe.each([
  { key: 'navigation_icon_custom_list_v1', selection: { mode: 'modern', iconsId: 'icons' }, resources: { navigationIcons: [{ id: 'icons', files: { record: 'assets/nav.png' } }] } },
  { key: 'navigation_new_background_custom_list', selection: { mode: 'modern', backgroundId: 'background' }, resources: { navigationBackgrounds: [{ id: 'background', file: 'assets/nav.png' }] } },
  { key: 'navigation_decoration_custom_list', selection: { mode: 'legacy', decorationResourceId: 'decoration' }, resources: { navigationDecorations: [{ id: 'decoration', file: 'assets/nav.png' }] } }
])('packaged $key', ({ key, selection, resources }) => {
  it('waits for legacy compaction before appending assets and applies the card background', async () => {
    const legacy = JSON.stringify([
      { id: 'legacy', name: 'Legacy', type: 'custom', imageFilename: 'legacy.png', url: `data:image/png;base64,${'A'.repeat(6000)}`, thumbnail: '' }
    ]);
    const values = new Map([[key, legacy]]);
    const quota = legacy.length + key.length + 100;
    vi.stubGlobal('localStorage', {
      getItem: (name: string) => values.get(name) ?? null,
      setItem: (name: string, value: string) => {
        const size = [...values].reduce((total, [existingKey, existingValue]) => total + (existingKey === name ? 0 : existingKey.length + existingValue.length), 0);
        if (size + name.length + value.length > quota) throw new DOMException('Storage full', 'QuotaExceededError');
        values.set(name, value);
      },
      removeItem: (name: string) => values.delete(name)
    });
    let resolveLegacy: (url: string) => void = () => undefined;
    images.getImageUrl.mockImplementation((filename: string) => filename === 'legacy.png'
      ? new Promise<string>((resolve) => { resolveLegacy = resolve; })
      : Promise.resolve(`data:image/png;base64,${'B'.repeat(6000)}`));

    const { applyImportedThemePackage } = await import('./themePackageApplicationService');
    const zip = new JSZip();
    zip.file('theme.json', JSON.stringify({
      format: 'lumostime-theme-package', schemaVersion: 2,
      package: { id: 'quota-theme', name: 'Quota Theme', version: '1.0.0' },
      resources: { ...resources, cardBackgroundGroups: [{ id: 'cards', files: ['assets/card.png'] }] },
      apply: { navigation: selection, cardBackground: { groupId: 'cards', opacity: 1 } }
    }));
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
    zip.file('assets/nav.png', png, { base64: true });
    zip.file('assets/card.png', png, { base64: true });
    const parsed = await parseThemePackage(new Blob([await zip.generateAsync({ type: 'uint8array' })]));
    expect(parsed.assets.get('assets/nav.png')?.type).toBe('image/png');
    const applying = applyImportedThemePackage({
      id: 'quota-theme', name: 'Quota Theme', version: '1.0.0', importedAt: 1, updatedAt: 1,
      imageAssets: { 'assets/nav.png': 'nav.png', 'assets/card.png': 'card.png' },
      manifest: parsed.manifest
    });
    // Attach immediately so a regression reports the quota error without an unhandled rejection.
    const result = applying.then((value) => ({ value, error: undefined }), (error: unknown) => ({ value: undefined, error }));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    resolveLegacy('data:image/png;base64,legacy');
    const settled = await result;
    expect(settled.error).toBeUndefined();
    expect(settled.value?.appliedSections).toContain('cardBackground');
    expect(values.get('lumostime_card_background_current_v1')).toBe('theme:quota-theme:card-background-cards');
    const storedAssets = JSON.parse(values.get(key) || '[]');
    expect(storedAssets).toHaveLength(2);
    expect(storedAssets[0]).toMatchObject({ id: 'legacy', imageFilename: 'legacy.png', url: '' });
    expect(storedAssets[1]).toMatchObject({ imageFilename: 'nav.png', url: '' });
    expect(values.get(key)).not.toContain('data:');
  });
});
