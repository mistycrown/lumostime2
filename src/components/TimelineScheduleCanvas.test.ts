/**
 * @file TimelineScheduleCanvas.test.ts
 * @input Sample time intervals including overlap boundaries
 * @output Regression coverage for parallel schedule block columns
 * @pos Test
 * @updated 2026-07-29: Added overlap-column layout coverage.
 */
import { describe, expect, test } from 'vitest';
import { layoutParallelScheduleBlocks } from './TimelineScheduleCanvas';

describe('layoutParallelScheduleBlocks', () => {
  test('places overlapping records in separate equal-width columns', () => {
    const blocks = layoutParallelScheduleBlocks([
      { id: 'first', startMinutes: 60, endMinutes: 180 },
      { id: 'second', startMinutes: 90, endMinutes: 150 },
      { id: 'third', startMinutes: 120, endMinutes: 210 }
    ]);

    expect(blocks.map(({ id, column, columnCount }) => ({ id, column, columnCount }))).toEqual([
      { id: 'first', column: 0, columnCount: 3 },
      { id: 'second', column: 1, columnCount: 3 },
      { id: 'third', column: 2, columnCount: 3 }
    ]);
  });

  test('reuses a released column and keeps adjacent records independent', () => {
    const blocks = layoutParallelScheduleBlocks([
      { id: 'first', startMinutes: 60, endMinutes: 120 },
      { id: 'second', startMinutes: 90, endMinutes: 180 },
      { id: 'third', startMinutes: 120, endMinutes: 210 },
      { id: 'later', startMinutes: 240, endMinutes: 300 }
    ]);

    expect(blocks.find((block) => block.id === 'third')).toMatchObject({ column: 0, columnCount: 2 });
    expect(blocks.find((block) => block.id === 'later')).toMatchObject({ column: 0, columnCount: 1 });
  });
});
