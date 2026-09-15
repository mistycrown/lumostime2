/**
 * @file PrincipleLibraryView.test.ts
 * @input Principle/self-belief list reorder helper
 * @output Regression coverage for adjacent card ordering and boundary handling
 */
import { describe, expect, it } from 'vitest';
import { moveItem } from './PrincipleLibraryView';

describe('PrincipleLibraryView card ordering', () => {
    it('swaps an item with its adjacent item', () => {
        const items = ['first', 'second', 'third'];

        expect(moveItem(items, 1, -1)).toEqual(['second', 'first', 'third']);
        expect(moveItem(items, 1, 1)).toEqual(['first', 'third', 'second']);
        expect(items).toEqual(['first', 'second', 'third']);
    });

    it('keeps the list unchanged when moving beyond either boundary', () => {
        const items = ['first', 'second'];

        expect(moveItem(items, 0, -1)).toEqual(items);
        expect(moveItem(items, 1, 1)).toEqual(items);
        expect(moveItem(items, -1, 1)).toEqual(items);
    });
});
