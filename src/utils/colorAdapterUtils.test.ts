import { describe, expect, it } from 'vitest';
import { getTagCirclePresentation } from './colorAdapterUtils';

describe('colorAdapterUtils tag selector presentation', () => {
  it('keeps built-in tailwind classes unchanged', () => {
    expect(getTagCirclePresentation('bg-blue-100 text-blue-600')).toEqual({
      className: 'bg-blue-100 text-blue-600',
    });
  });

  it('renders custom hex colors as soft translucent circles', () => {
    expect(getTagCirclePresentation('#AABBCC')).toEqual({
      className: '',
      style: {
        backgroundColor: 'rgba(170, 187, 204, 0.2)',
        color: '#aabbcc',
        border: '1px solid rgba(170, 187, 204, 0.32)',
      },
    });
  });
});
