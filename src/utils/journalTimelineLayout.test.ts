/**
 * @file journalTimelineLayout.test.ts
 * @input Local-day records, adjacent intervals and overlapping Plan/Trace blocks
 * @output Clock geometry, midnight and overlap-lane regressions
 * @updated 2026-10-23: Verifies proportional weekly calendar blocks independently of log detail pages.
 */
import { describe, expect, it } from 'vitest';
import { journalClockMinute, layoutJournalTimeline } from './journalTimelineLayout';
import type { JournalLog } from './journalExport';
const day = '2026-08-10';
const stamp = (hour: number) => new Date(2026, 7, 10, hour).getTime();
const record = (start: number, end: number, id: string): JournalLog => ({ source: { id } as never, start: stamp(start), end: stamp(end), seconds: (end - start) * 3600, activity: '阅读', category: '学习' });
describe('weekly journal grid', () => {
  it('maps midnight and clock hours onto the full 24-hour grid', () => {
    expect(journalClockMinute(stamp(0), day)).toBe(0);
    expect(journalClockMinute(stamp(9), day)).toBe(540);
    expect(journalClockMinute(stamp(24), day)).toBe(1440);
    const [block] = layoutJournalTimeline([record(9, 12, 'a')], day);
    expect(block).toMatchObject({ startMinute: 540, endMinute: 720, lane: 0, laneCount: 1 });
  });
  it('gives overlapping records separate lanes and lets later independent records use full width', () => {
    const blocks = layoutJournalTimeline([record(9, 12, 'a'), record(10, 11, 'b'), record(11, 13, 'c'), record(14, 15, 'd')], day);
    expect(blocks.slice(0, 3).map((block) => block.laneCount)).toEqual([2, 2, 2]);
    expect(blocks[0].lane).not.toBe(blocks[1].lane);
    expect(blocks[1].lane).toBe(blocks[2].lane);
    expect(blocks[3].laneCount).toBe(1);
  });
  it('keeps adjacent intervals in one lane and never mutates source order', () => {
    const records = [record(10, 11, 'late'), record(9, 10, 'early')];
    expect(layoutJournalTimeline(records, day).map((block) => block.laneCount)).toEqual([1, 1]);
    expect(records[0].source.id).toBe('late');
  });
});
