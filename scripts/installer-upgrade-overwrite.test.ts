// @vitest-environment node
import { describe, expect, it } from 'vitest';
import packageJson from '../package.json';

describe('Windows upgrade overwrite installer customization', () => {
  it('wires a custom NSIS include with retry-based old-install cleanup for upgrades', async () => {
    const typedPackageJson = packageJson as {
      build?: {
        nsis?: {
          include?: string;
        };
      };
    };

    expect(typedPackageJson.build?.nsis?.include).toBe('build/installer-overwrite-hooks.nsh');

    const hooksModule = await import('../build/installer-overwrite-hooks.nsh?raw');
    const hooksContent = hooksModule.default;

    expect(hooksContent).toContain('!macro customRemoveFiles');
    expect(hooksContent).toContain('!macro customUnInstallCheck');
    expect(hooksContent).toContain('!macro customUnInstallCheckCurrentUser');
    expect(hooksContent).toContain('Legacy uninstaller reported cleanup error code 2');
    expect(hooksContent).toContain('Call un.removeInstallDirWithRetries');
    expect(hooksContent).toContain('Call un.atomicRMDir');
    expect(hooksContent).toContain('Call un.restoreFiles');
    expect(hooksContent).toContain('RMDir /r $INSTDIR');
    expect(hooksContent).toContain('Continuing upgrade with remaining files in place');
  });
});
