/**
 * @file themePackageService.test.ts
 * @input Synthetic ZIP archives containing theme manifests and assets
 * @output Regression coverage for theme package parsing and safety validation
 * @pos Test (Theme Package Import)
 * @description Verifies manifest validation, optional sections, required paired assets, and archive path safety.
 * @updated 2026-09-26: Added parser coverage for version-one theme packages.
 * @updated 2026-09-26: Added validation coverage for custom achievement-bottle frames.
 * @updated 2026-09-26: Ensures empty template directory markers are ignored.
 * @updated 2026-09-26: Covers single-image fill-mode backgrounds and mode/image mismatches.
 * @updated 2026-09-26: Covers explicit legacy-navigation theme package configuration.
 * @updated 2026-09-26: Covers custom achievement-bottle icon-pack assets.
 * @updated 2026-09-27: Rejects packages that define more than one card-background group.
 * @updated 2026-09-29: Covers scalable global floating-button background resources.
 * @updated 2026-09-29: Covers schema-version-two text-only navigation mode.
 * @updated 2026-09-29: Covers explicit default floating-button backgrounds.
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
  it('accepts a complete numbered UIIcon directory', async () => {
    const iconFiles = Object.fromEntries(Array.from({ length: 96 }, (_, index) => {
      const number = String(index + 1).padStart(2, '0');
      return [`assets/uiicon/${number}.${index % 2 === 0 ? 'webp' : 'png'}`, number];
    }));
    const manifest = {
      format: 'lumostime-theme-package',
      schemaVersion: 2,
      package: { id: 'complete-icons', name: 'Complete Icons', version: '1.0.0' },
      resources: { uiIcons: [{ id: 'complete', numberedDirectory: 'assets/uiicon' }] },
      apply: { uiIcon: { resourceId: 'complete' } }
    };

    const result = await parseThemePackage(await createZip(manifest, iconFiles));
    expect(result.assets).toHaveLength(96);
    expect(result.manifest.config.uiIcon).toMatchObject({
      source: 'asset',
      numberedDirectory: 'assets/uiicon'
    });
  });

  it('rejects incomplete numbered UIIcon directories', async () => {
    const iconFiles = Object.fromEntries(Array.from({ length: 95 }, (_, index) => {
      const number = String(index + 1).padStart(2, '0');
      return [`assets/uiicon/${number}.webp`, number];
    }));
    const manifest = {
      format: 'lumostime-theme-package',
      schemaVersion: 2,
      package: { id: 'incomplete-icons', name: 'Incomplete Icons', version: '1.0.0' },
      resources: { uiIcons: [{ id: 'incomplete', numberedDirectory: 'assets/uiicon' }] },
      apply: { uiIcon: { resourceId: 'incomplete' } }
    };

    await expect(parseThemePackage(await createZip(manifest, iconFiles))).rejects.toMatchObject({
      code: 'INVALID_CONFIGURATION',
      path: 'config.uiIcon.numberedDirectory'
    });
  });

  it('parses a minimal package and returns referenced assets', async () => {
    const result = await parseThemePackage(await createZip(baseManifest, {
      'assets/preview.webp': 'preview',
      'assets/background/main.webp': 'background'
    }));

    expect(result.manifest.package.id).toBe('moonlit-garden');
    expect(result.assets.has('assets/background/main.webp')).toBe(true);
    expect(result.assets.get('assets/background/main.webp')?.type).toBe('image/webp');
  });

  it('adapts schema-version-two resources and apply selections to the existing config model', async () => {
    const manifest = {
      format: 'lumostime-theme-package',
      schemaVersion: 2,
      package: { id: 'split-theme', name: '分区主题', version: '1.0.0' },
      resources: {
        backgrounds: [{ id: 'main', file: 'assets/background/main.webp' }],
        cardBackgroundGroups: [{ id: 'cards', name: 'Cards', alignment: 'right-bottom', files: ['assets/cards/one.webp'] }],
        stickers: [
          { id: 'one', name: 'One', items: [{ id: 'one-1', file: 'assets/stickers/one/1.webp' }] },
          { id: 'two', name: 'Two', items: [{ id: 'two-1', file: 'assets/stickers/two/1.webp' }] }
        ]
      },
      apply: {
        background: { resourceId: 'main', opacity: 0.3 },
        cardBackground: { groupId: 'cards', opacity: 0.25 },
        stickers: {
          defaultPage: 'one',
          enabled: true,
          groups: [{ id: 'all', name: 'All', sourceSetIds: ['one', 'two'] }]
        }
      }
    };
    const result = await parseThemePackage(await createZip(manifest, {
      'assets/background/main.webp': 'background',
      'assets/cards/one.webp': 'card',
      'assets/stickers/one/1.webp': 'one',
      'assets/stickers/two/1.webp': 'two'
    }));

    expect(result.manifest.config.background).toEqual({
      id: 'main', file: 'assets/background/main.webp', opacity: 0.3
    });
    expect(result.manifest.config.stickers).toHaveLength(2);
    expect(result.manifest.config.stickerSelector).toEqual({
      defaultPage: 'one',
      enabled: true,
      groups: [{ id: 'all', name: 'All', sourceSetIds: ['one', 'two'] }]
    });
    expect(result.manifest.config.cardBackground).toEqual({
      id: 'cards',
      name: 'Cards',
      alignment: 'right-bottom',
      files: ['assets/cards/one.webp'],
      groupId: 'cards',
      opacity: 0.25
    });
    expect(result.assets.size).toBe(4);
  });

  it('rejects apply selections that reference an undeclared resource ID', async () => {
    await expect(parseThemePackage(await createZip({
      format: 'lumostime-theme-package',
      schemaVersion: 2,
      package: { id: 'invalid-theme', name: 'Invalid', version: '1.0.0' },
      resources: { backgrounds: [] },
      apply: { background: { resourceId: 'missing' } }
    }))).rejects.toMatchObject({
      code: 'INVALID_CONFIGURATION',
      path: 'apply.background.resourceId'
    });
  });

  it('adapts a text-only navigation icon mode', async () => {
    const manifest = {
      format: 'lumostime-theme-package',
      schemaVersion: 2,
      package: { id: 'text-navigation', name: 'Text Navigation', version: '1.0.0' },
      resources: {},
      apply: { navigation: { mode: 'modern', iconMode: 'text' } }
    };

    const result = await parseThemePackage(await createZip(manifest));
    expect(result.manifest.config.navigation).toEqual({ mode: 'modern', iconMode: 'text' });
  });

  it('adapts a floating-button background resource and validates its scale', async () => {
    const manifest = {
      format: 'lumostime-theme-package',
      schemaVersion: 2,
      package: { id: 'button-theme', name: 'Button Theme', version: '1.0.0' },
      resources: {
        floatingButtonBackgrounds: [{ id: 'flower', image: 'assets/floating-button-backgrounds/flower.webp' }]
      },
      apply: { floatingButtonBackground: { resourceId: 'flower', scale: 135 } }
    };

    const result = await parseThemePackage(await createZip(manifest, {
      'assets/floating-button-backgrounds/flower.webp': 'flower'
    }));

    expect(result.manifest.config.floatingButtonBackground).toEqual({
      id: 'flower',
      image: 'assets/floating-button-backgrounds/flower.webp',
      scale: 135
    });

    await expect(parseThemePackage(await createZip({
      ...manifest,
      apply: { floatingButtonBackground: { resourceId: 'flower', scale: 201 } }
    }, { 'assets/floating-button-backgrounds/flower.webp': 'flower' }))).rejects.toMatchObject({
      code: 'INVALID_CONFIGURATION',
      path: 'apply.floatingButtonBackground.scale'
    });
  });

  it('accepts an explicit default floating-button background', async () => {
    const result = await parseThemePackage(await createZip({
      format: 'lumostime-theme-package',
      schemaVersion: 2,
      package: { id: 'default-button', name: 'Default Button', version: '1.0.0' },
      resources: {},
      apply: { floatingButtonBackground: { none: true } }
    }));

    expect(result.manifest.config.floatingButtonBackground).toEqual({ none: true });
  });

  it('rejects an undeclared floating-button background selection', async () => {
    await expect(parseThemePackage(await createZip({
      format: 'lumostime-theme-package',
      schemaVersion: 2,
      package: { id: 'missing-button', name: 'Missing Button', version: '1.0.0' },
      resources: { floatingButtonBackgrounds: [] },
      apply: { floatingButtonBackground: { resourceId: 'missing' } }
    }))).rejects.toMatchObject({
      code: 'INVALID_CONFIGURATION',
      path: 'apply.floatingButtonBackground.resourceId'
    });
  });

  it('requires a floating-button resource ID and image asset path', async () => {
    const base = {
      format: 'lumostime-theme-package',
      schemaVersion: 2,
      package: { id: 'invalid-button', name: 'Invalid Button', version: '1.0.0' }
    };
    await expect(parseThemePackage(await createZip({
      ...base,
      resources: { floatingButtonBackgrounds: [{ id: 'flower', image: 'assets/floating-button-backgrounds/flower.ttf' }] },
      apply: { floatingButtonBackground: { resourceId: 'flower' } }
    }, { 'assets/floating-button-backgrounds/flower.ttf': 'font' }))).rejects.toMatchObject({
      code: 'INVALID_CONFIGURATION',
      path: 'resources.floatingButtonBackgrounds[0].image'
    });
    await expect(parseThemePackage(await createZip({
      ...base,
      resources: { floatingButtonBackgrounds: [] },
      apply: { floatingButtonBackground: { scale: 100 } }
    }))).rejects.toMatchObject({
      code: 'INVALID_CONFIGURATION',
      path: 'apply.floatingButtonBackground.resourceId'
    });
  });

  it('rejects packages that define more than one card-background group', async () => {
    await expect(parseThemePackage(await createZip({
      format: 'lumostime-theme-package',
      schemaVersion: 2,
      package: { id: 'too-many-cards', name: 'Too Many Cards', version: '1.0.0' },
      resources: {
        cardBackgroundGroups: [
          { id: 'first', files: ['assets/card-backgrounds/first.webp'] },
          { id: 'second', files: ['assets/card-backgrounds/second.webp'] }
        ]
      },
      apply: {}
    }, {
      'assets/card-backgrounds/first.webp': 'first',
      'assets/card-backgrounds/second.webp': 'second'
    }))).rejects.toMatchObject({
      code: 'INVALID_CONFIGURATION',
      path: 'resources.cardBackgroundGroups'
    });
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

  it('rejects a Memoir background that uses a legacy paired-image field', async () => {
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

  it('accepts a single image for a Memoir background', async () => {
    const manifest = {
      ...baseManifest,
      config: {
        memoirCalendar: {
          background: {
            image: 'assets/memoir-calendar/fill.webp'
          }
        }
      }
    };

    const result = await parseThemePackage(await createZip(manifest, {
      'assets/preview.webp': 'preview',
      'assets/memoir-calendar/fill.webp': 'fill'
    }));

    expect(result.manifest.config.memoirCalendar).toMatchObject({
      background: { image: 'assets/memoir-calendar/fill.webp' }
    });
  });

  it('rejects a Memoir background that mixes a mode with paired-image fields', async () => {
    const manifest = {
      ...baseManifest,
      config: {
        memoirCalendar: {
          background: {
            mode: 'fill',
            fiveWeek: 'assets/memoir-calendar/five.webp',
            sixWeek: 'assets/memoir-calendar/six.webp'
          }
        }
      }
    };

    await expect(parseThemePackage(await createZip(manifest, {
      'assets/preview.webp': 'preview',
      'assets/memoir-calendar/five.webp': 'five',
      'assets/memoir-calendar/six.webp': 'six'
    }))).rejects.toMatchObject({
      code: 'INVALID_CONFIGURATION',
      path: 'config.memoirCalendar.background'
    });
  });

  it('accepts explicit legacy navigation decorations', async () => {
    const manifest = {
      ...baseManifest,
      config: { navigation: { mode: 'legacy', decorationId: 'pencil' } }
    };

    const result = await parseThemePackage(await createZip(manifest, {
      'assets/preview.webp': 'preview'
    }));

    expect(result.manifest.config.navigation).toEqual({ mode: 'legacy', decorationId: 'pencil' });
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

  it('accepts custom achievement-bottle frames referenced from package assets', async () => {
    const manifest = {
      ...baseManifest,
      config: {
        achievementBottle: {
          iconPack: {
            source: 'asset',
            id: 'test-bottle',
            name: 'Test Bottle',
            frames: ['assets/achievement-bottle/test-bottle/01.webp', 'assets/achievement-bottle/test-bottle/02.png']
          }
        }
      }
    };
    const result = await parseThemePackage(await createZip(manifest, {
      'assets/preview.webp': 'preview',
      'assets/achievement-bottle/test-bottle/01.webp': 'frame-1',
      'assets/achievement-bottle/test-bottle/02.png': 'frame-2'
    }));

    expect(result.assets.has('assets/achievement-bottle/test-bottle/01.webp')).toBe(true);
    expect(result.manifest.config.achievementBottle).toMatchObject({
      iconPack: { source: 'asset', id: 'test-bottle', name: 'Test Bottle' }
    });
  });

  it('rejects custom achievement-bottle frames that are not supported image paths', async () => {
    const manifest = {
      ...baseManifest,
      config: {
        achievementBottle: {
          iconPack: { source: 'asset', id: 'test-bottle', frames: ['assets/achievement-bottle/test-bottle/frame.gif'] }
        }
      }
    };

    await expect(parseThemePackage(await createZip(manifest, {
      'assets/preview.webp': 'preview',
      'assets/achievement-bottle/test-bottle/frame.gif': 'frame'
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
