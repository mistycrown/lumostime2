/**
 * @file journalTimelineLayout.ts
 * @input Clipped daily journal logs
 * @output Calendar-clock positions and non-overlapping lanes for the weekly time grid
 * @pos Utility (Journal PDF timeline)
 * @updated 2026-10-23: Separates weekly colored time blocks from detailed journal entries.
 */
import type { JournalLog } from './journalExport';
import { formatDateKey } from './todoScheduleUtils';

export const journalClockMinute = (timestamp: number, day: string): number => {
  const date = new Date(timestamp);
  if (formatDateKey(date) > day) return 1440;
  if (formatDateKey(date) < day) return 0;
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
};

export interface JournalTimelineBlock {
  log: JournalLog;
  startMinute: number;
  endMinute: number;
  lane: number;
  laneCount: number;
}

export const layoutJournalTimeline = (logs: JournalLog[], day: string): JournalTimelineBlock[] => {
  const blocks: JournalTimelineBlock[] = [];
  let cluster: JournalTimelineBlock[] = [];
  let clusterEnd = -1;
  let laneEnds: number[] = [];
  const flush = () => { cluster.forEach((block) => { block.laneCount = laneEnds.length; }); blocks.push(...cluster); cluster = []; laneEnds = []; };
  [...logs].sort((a, b) => a.start - b.start || b.end - a.end).forEach((log) => {
    const startMinute = journalClockMinute(log.start, day);
    const endMinute = journalClockMinute(log.end, day);
    if (endMinute <= startMinute) return;
    if (startMinute >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= startMinute);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = endMinute;
    cluster.push({ log, startMinute, endMinute, lane, laneCount: 1 });
    clusterEnd = Math.max(clusterEnd, endMinute);
  });
  flush();
  return blocks;
};
