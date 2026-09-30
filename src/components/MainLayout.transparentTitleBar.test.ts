/**
 * @file MainLayout.transparentTitleBar.test.ts
 * @input MainLayout transparent-title supported-view declaration
 * @output Regression coverage for Scene transparent title-bar participation
 * @pos Test
 */
import { describe, expect, it } from 'vitest';

const filesystem = process.getBuiltinModule('fs');
const mainLayoutSource = filesystem?.readFileSync(new URL('./MainLayout.tsx', import.meta.url), 'utf8') ?? '';

describe('MainLayout transparent title support', () => {
  it('includes Scene in the supported primary views', () => {
    expect(mainLayoutSource).toMatch(
      /const supportsTransparentTitleBar[\s\S]*?currentView === AppView\.SCENE/
    );
  });
});
