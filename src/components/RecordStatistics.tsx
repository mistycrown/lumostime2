/**
 * @file RecordStatistics.tsx
 * @input Entity statistic settings, complete countable logs, and a settings update callback.
 * @output Shared record-duration/note statistic cards for filters and scopes.
 * @pos Component (Detail Statistics)
 * @description Adapts entity settings to the existing card editor without exposing tag attributes.
 * @updated 2026-10-06: Adds the shared two-source statistics panel.
 */
import React, { useMemo } from 'react';
import type { Activity, ActivityStatisticCard, ActivityStatisticCardSource, ActivityStatisticPaletteId, Log } from '../types';
import { ActivityAttributeStatistics } from './ActivityAttributeStatistics';

export interface RecordStatisticSettings {
  statisticCards?: ActivityStatisticCard[];
  statisticPalette?: ActivityStatisticPaletteId;
}

interface RecordStatisticsProps {
  entity: RecordStatisticSettings & { id: string; name: string };
  logs: Log[];
  title: string;
  onChange: (settings: RecordStatisticSettings) => void;
}

const SOURCES: Array<ActivityStatisticCardSource['type']> = ['recordDuration', 'note'];

export const RecordStatistics: React.FC<RecordStatisticsProps> = ({ entity, logs, title, onChange }) => {
  const activity = useMemo<Activity>(() => ({
    id: entity.id,
    name: entity.name,
    icon: 'Clock',
    color: 'text-stone-800',
    statisticCards: entity.statisticCards,
    statisticPalette: entity.statisticPalette
  }), [entity.id, entity.name, entity.statisticCards, entity.statisticPalette]);

  return <ActivityAttributeStatistics
    activity={activity}
    logs={logs}
    title={title}
    allowedSourceTypes={SOURCES}
    onChange={(next) => onChange({ statisticCards: next.statisticCards, statisticPalette: next.statisticPalette })}
  />;
};
