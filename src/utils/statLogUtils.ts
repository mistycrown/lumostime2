/**
 * @file statLogUtils.ts
 * @input Timeline logs
 * @output Shared planned-log filters for statistics and summaries
 * @description Centralizes the rule that planned timeline blocks should not participate in statistics.
 * @updated 2026-08-09: Added the shared planned-log filter used by stats, summaries, and exports.
 */

import { Log } from '../types';

export const isCountableLog = (log: Pick<Log, 'isPlanned'>): boolean => log.isPlanned !== true;

export const filterCountableLogs = <T extends Pick<Log, 'isPlanned'>>(logs: T[]): T[] => (
  logs.filter(isCountableLog)
);
