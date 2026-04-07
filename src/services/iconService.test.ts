import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'web',
    isNativePlatform: () => false,
  },
}));

import { iconService, ICON_OPTIONS } from './iconService';

type MockLinkElement = {
  rel: string;
  href: string;
};

type MockDocument = {
  baseURI: string;
  head: {
    appendChild: ReturnType<typeof vi.fn>;
  };
  body: Record<string, never>;
  createElement: ReturnType<typeof vi.fn>;
  querySelector: ReturnType<typeof vi.fn>;
};

describe('iconService desktop asset paths', () => {
  let favicon: MockLinkElement;
  let appleTouchIcon: MockLinkElement;
  let appendedLinks: MockLinkElement[];
  let mockDocument: MockDocument;

  beforeEach(() => {
    favicon = {
      rel: 'icon',
      href: 'file:///E:/lumostime/resources/app.asar/dist/icon.ico',
    };
    appleTouchIcon = {
      rel: 'apple-touch-icon',
      href: 'file:///E:/lumostime/resources/app.asar/dist/icon.ico',
    };
    appendedLinks = [];

    mockDocument = {
      baseURI: 'file:///E:/lumostime/resources/app.asar/dist/index.html',
      head: {
        appendChild: vi.fn((link: MockLinkElement) => {
          appendedLinks.push(link);
        }),
      },
      body: {},
      createElement: vi.fn(() => ({
        rel: '',
        href: '',
      })),
      querySelector: vi.fn((selector: string) => {
        if (selector === 'link[rel="icon"]') {
          return favicon;
        }

        if (selector === 'link[rel="apple-touch-icon"]') {
          return appleTouchIcon;
        }

        return null;
      }),
    };

    vi.stubGlobal('document', mockDocument);
    vi.stubGlobal('window', {
      ipcRenderer: {
        send: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves desktop icon links against the Electron file base URI', async () => {
    const iconOption = ICON_OPTIONS.find((option) => option.id === 'cat');
    expect(iconOption?.desktopIcon).toBe('/icon_style/icon_cat.png');

    await (iconService as any).setDesktopIcon(iconOption);

    expect(favicon.href).toBe('file:///E:/lumostime/resources/app.asar/dist/icon_style/icon_cat.png');
    expect(appleTouchIcon.href).toBe('file:///E:/lumostime/resources/app.asar/dist/icon_style/icon_cat.png');
    expect((window as any).ipcRenderer.send).toHaveBeenCalledWith('update-app-icon', '/icon_style/icon_cat.png');
    expect(appendedLinks).toHaveLength(0);
  });
});
