/**
 * @file themePackageService.test.ts
 * @input Synthetic ZIP archives containing theme manifests and assets
 * @output Regression coverage for theme package parsing and safety validation
 * @pos Test (Theme Package Import)
 * @description Verifies manifest validation, optional sections, required paired assets, and archive path safety.
 * @updated 2026-09-26: Added parser coverage for version-one theme packages.
 * @updated 2026-09-26: Added validation coverage for custom achievement-bottle frames.
 * @updated 2026-09-26: Ensures empty template directory markers are ignored.
 */

import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  parseThemePackage,
  ThemePackageValidationError
} from './themePackageService';

const createZip = async (manifest: Record<string, unknown>, files: Record<string, string> = {}): Promise<Blob> => {
  const zip = new JSZip();
  zip.file('theme.json', JSON.stringify(manifest));
  Object.entries(files).forEach(([path, content]) => zip.file(path, content));
  return zip.generateAsync({ type: 'blob' });
};

const baseManifest = {
  format: 'lumostime-theme-package',
  schemaVersion: 1,
  package: {
    id: 'moonlit-garden',
    name: '月下花园',
    version: '1.0.0',
    preview: 'assets/preview.webp'
  },
  config: {
    background: {
      source: 'asset',
      file: 'assets/background/main.webp'
    }
  }
};

describe('parseThemePackage', () => {
  it('parses a minimal package and returns referenced assets', async () => {
    const result = await parseThemePackage(await createZip(baseManifest, {
      'assets/preview.webp': 'preview',
      'assets/background/main.webp': 'background'
    }));

    expect(result.manifest.package.id).toBe('moonlit-garden');
    expect(result.assets.has('assets/background/main.webp')).toBe(true);
    expect(result.assets.get('assets/background/main.webp')?.type).toBe('image/webp');
  });

  it('allows optional configuration sections to be omitted', async () => {
    const manifest = {
      ...baseManifest,
      config: {}
    };

    const result = await parseThemePackage(await createZip(manifest, {
      'assets/preview.webp': 'preview'
    }));

    expect(result.manifest.config).toEqual({});
  });

  it('requires both Memoir background sizes when either is declared', async () => {
    const manifest = {
      ...baseManifest,
      config: {
        memoirCalendar: {
          background: {
            fiveWeek: 'assets/memoir-calendar/five-week.webp'
          }
        }
      }
    };

    await expect(parseThemePackage(await createZip(manifest, {
      'assets/preview.webp': 'preview',
      'assets/memoir-calendar/five-week.webp': 'five'
    }))).rejects.toMatchObject({
      code: 'INVALID_CONFIGURATION',
      path: 'config.memoirCalendar.background'
    });
  });

  it('requires at least one frame for a custom achievement bottle icon pack', async () => {
    const manifest = {
      ...baseManifest,
      config: {
        achievementBottle: {
          iconPack: { source: 'asset', id: 'moon-stars', frames: [] }
        }
      }
    };

    await expect(parseThemePackage(await createZip(manifest, {
      'assets/preview.webp': 'preview'
    }))).rejects.toMatchObject({
      code: 'INVALID_CONFIGURATION',
      path: 'config.achievementBottle.iconPack.frames'
    });
  });

  it('rejects unsafe archive paths', async () => {
    const zip = new JSZip();
    zip.file('theme.json', JSON.stringify(baseManifest));
    zip.file('../escape.webp', 'escape');

    await expect(parseThemePackage(await zip.generateAsync({ type: 'blob' }))).rejects.toBeInstanceOf(ThemePackageValidationError);
  });

  it('ignores empty-directory markers from the editable template', async () => {
    const zip = new JSZip();
    zip.file('theme.json', JSON.stringify({
      ...baseManifest,
      package: { ...baseManifest.package, preview: undefined },
      config: {}
    }));
    zip.file('assets/background/.gitkeep', '');

    const result = await parseThemePackage(await zip.generateAsync({ type: 'blob' }));
    expect(result.assets.size).toBe(0);
  });
});
