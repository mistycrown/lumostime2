/**
 * @file sceneTimelineMatchUtils.ts
 * @input Scene slot definitions, scene cards, timeline logs, and a reference time
 * @output Current-slot time windows plus timer/todo timeline-match decisions
 * @pos Utils
 * @description Resolves whether a scene timer or todo card should be forced onto its back side because the current slot already has a matching timeline record.
 * @updated 2026-05-10: Added current-slot window and log-matching helpers for scene-card back-side forcing, including overnight slots.
 */

import type { Log, SceneCardData, TimeSlot } from '../types';

export interface SceneSlotWindow {
  startTime: number;
  endTime: number;
}

const parseSlotClock = (clockText: string): [number, number] => {
  const [hour, minute] = clockText.split(':').map(Number);
  return [hour, minute];
};

export const getCurrentSceneSlotWindow = (
  slot: Pick<TimeSlot, 'startTime' | 'endTime'>,
  now: Date = new Date()
): SceneSlotWindow | null => {
  const [startHour, startMinute] = parseSlotClock(slot.startTime);
  const [endHour, endMinute] = parseSlotClock(slot.endTime);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isOvernight = endMinutes < startMinutes;
  const baseDate = new Date(now);

  const buildBoundary = (dayOffset: number, hour: number, minute: number): number => {
    const boundary = new Date(baseDate);
    boundary.setDate(boundary.getDate() + dayOffset);
    boundary.setHours(hour, minute, 0, 0);
    return boundary.getTime();
  };

  if (!isOvernight) {
    if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
      return null;
    }
    return {
      startTime: buildBoundary(0, startHour, startMinute),
      endTime: buildBoundary(0, endHour, endMinute),
    };
  }

  if (currentMinutes >= startMinutes) {
    return {
      startTime: buildBoundary(0, startHour, startMinute),
      endTime: buildBoundary(1, endHour, endMinute),
    };
  }

  if (currentMinutes < endMinutes) {
    return {
      startTime: buildBoundary(-1, startHour, startMinute),
      endTime: buildBoundary(0, endHour, endMinute),
    };
  }

  return null;
};

export const doesSceneCardMatchCurrentSlotTimeline = (
  card: SceneCardData,
  logs: Log[],
  slotWindow: SceneSlotWindow | null
): boolean => {
  if (!slotWindow) {
    return false;
  }

  return logs.some((log) => {
    const overlapsSlot = log.startTime < slotWindow.endTime && log.endTime > slotWindow.startTime;
    if (!overlapsSlot) {
      return false;
    }

    if (card.type === 'timer' && card.action.type === 'startTimer') {
      return log.activityId === card.action.activityId && log.categoryId === card.action.categoryId;
    }

    if (card.type === 'todo' && card.action.type === 'startTodo') {
      return log.linkedTodoId === card.action.todoId;
    }

    return false;
  });
};
