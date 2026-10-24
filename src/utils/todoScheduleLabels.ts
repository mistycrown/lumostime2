/**
 * @file todoScheduleLabels.ts
 * @input Shared schedule badge kinds
 * @output The same ordered labels and text tones for calendar details and PDF agendas
 * @updated 2026-10-24: Extracts the application's existing month-detail badge definitions for export reuse.
 */
import type { TodoDateBadges } from './todoScheduleUtils';

export const TODO_SCHEDULE_BADGES: { key: keyof TodoDateBadges; label: string; color: string; clickable: boolean }[] = [
  { key: 'deadline', label: 'Due', color: '#8f6f6b', clickable: true },
  { key: 'scheduled', label: 'Arrange', color: '#7c8b97', clickable: true },
  { key: 'recurring', label: 'Repeat', color: '#8b8f79', clickable: true },
  { key: 'maybe', label: 'Maybe', color: '#a58863', clickable: true },
  { key: 'planned', label: 'Plan', color: '#8377a1', clickable: true },
  { key: 'completed', label: 'Done', color: '#7f8c84', clickable: true },
  { key: 'inProgress', label: 'Trace', color: '#8b8096', clickable: true }
];

export const getTodoScheduleBadgeLabel = (badge: { key: string; label: string }, activeCount: number): string => {
  if (activeCount <= 1 || ['deadline', 'completed', 'planned'].includes(badge.key)) return badge.label;
  return badge.label.slice(0, 3);
};
