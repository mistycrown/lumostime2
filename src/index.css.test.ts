/**
 * @file index.css.test.ts
 * @input Global transparent-title stylesheet rules
 * @output Regression coverage for page-local navigation background suppression
 * @pos Test
 */
import { describe, expect, it } from 'vitest';

const filesystem = process.getBuiltinModule('fs');
const stylesheet = filesystem?.readFileSync(new URL('./index.css', import.meta.url), 'utf8') ?? '';

describe('transparent title page backgrounds', () => {
  it('suppresses only Todo and Record local image layers', () => {
    const localImageRule = stylesheet.match(
      /\.transparent-title-bar-active\s+\.record-page-background-image[\s\S]*?\}/
    )?.[0] ?? '';

    expect(localImageRule).toContain('.scene-page-background-image');
    expect(localImageRule).toContain('.todo-page-background-image');
    expect(localImageRule).toContain('display: none');
    expect(localImageRule).not.toContain('memoir');
  });
});
