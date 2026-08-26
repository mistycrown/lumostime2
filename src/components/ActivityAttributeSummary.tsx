/**
 * @file ActivityAttributeSummary.tsx
 * @input Activity definitions and an ID-based record attribute snapshot.
 * @output Compact attribute labels for timeline records.
 * @pos Component (Timeline Metadata)
 * @description Resolves stored attribute and option IDs to their current names so renamed definitions are reflected in history.
 * @updated 2026-08-25: Added compact attribute rendering below timeline notes.
 * @updated 2026-08-26: Slightly increased timeline attribute text size for readability.
 */
import React, { useMemo } from 'react';
import { Activity, ActivityAttributeValue } from '../types';
import { getSortedActivityAttributes } from '../utils/activityAttributeUtils';

interface ActivityAttributeSummaryProps {
  activity?: Activity;
  values?: ActivityAttributeValue[];
  className?: string;
}

const MISSING_ATTRIBUTE = '\u5df2\u5220\u9664\u5c5e\u6027';
const MISSING_OPTION = '\u5df2\u5220\u9664\u9009\u9879';

export const ActivityAttributeSummary: React.FC<ActivityAttributeSummaryProps> = ({
  activity,
  values,
  className = ''
}) => {
  const rows = useMemo(() => {
    if (!values || values.length === 0) return [];

    const definitions = new Map(getSortedActivityAttributes(activity).map((attribute) => [attribute.id, attribute]));
    return values.map((value) => {
      const definition = definitions.get(value.attributeId);
      const name = definition?.name || MISSING_ATTRIBUTE;

      if ('optionId' in value) {
        const option = definition?.options?.find((item) => item.id === value.optionId);
        return `${name}: ${option?.label || MISSING_OPTION}`;
      }

      if ('optionIds' in value) {
        const labels = value.optionIds.map((optionId) => (
          definition?.options?.find((item) => item.id === optionId)?.label || MISSING_OPTION
        ));
        return `${name}: ${labels.join('\u3001')}`;
      }

      return `${name}: ${String(value.value)}`;
    });
  }, [activity, values]);

  if (rows.length === 0) return null;

  return (
    <div className={`mt-1 mb-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] leading-relaxed text-stone-400 ${className}`}>
      {rows.map((row, index) => (
        <span key={`${row}-${index}`} className="min-w-0 max-w-full break-words">
          {row}
        </span>
      ))}
    </div>
  );
};
