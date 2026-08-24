/**
 * @file ActivityAttributeStatistics.tsx
 * @input One Activity and its actual Logs.
 * @output Numeric summaries and option coverage statistics.
 * @pos Activity detail analytics component
 * @description Calculates the base Activity custom-attribute statistics without duplicating labels in logs.
 * @updated 2026-08-24: Created for Activity custom attributes.
 */
import React, { useMemo } from 'react';
import { Activity, ActivityAttributeDefinition, ActivityAttributeOption, ActivityAttributeType, Log } from '../types';
import { getSortedActivityAttributes } from '../utils/activityAttributeUtils';

type StatisticsAttribute = Pick<ActivityAttributeDefinition, 'id' | 'name' | 'type' | 'options'>;

const inferAttributeType = (value: NonNullable<Log['attributeValues']>[number]): ActivityAttributeType => {
  if ('optionIds' in value) return 'multi';
  if ('optionId' in value) return 'single';
  return typeof value.value === 'number' ? 'number' : 'text';
};

const formatNumber = (value: number) => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value);

interface ActivityAttributeStatisticsProps {
  activity: Activity;
  logs: Log[];
}

export const ActivityAttributeStatistics: React.FC<ActivityAttributeStatisticsProps> = ({ activity, logs }) => {
  const attributes = useMemo<StatisticsAttribute[]>(() => {
    const definitions = getSortedActivityAttributes(activity);
    const knownIds = new Set(definitions.map((definition) => definition.id));
    const missingDefinitions = new Map<string, StatisticsAttribute>();

    logs.forEach((log) => (log.attributeValues || []).forEach((value) => {
      if (!knownIds.has(value.attributeId) && !missingDefinitions.has(value.attributeId)) {
        missingDefinitions.set(value.attributeId, {
          id: value.attributeId,
          name: '已删除属性',
          type: inferAttributeType(value),
          options: []
        });
      }
    }));

    return [...definitions, ...missingDefinitions.values()].filter((attribute) =>
      logs.some((log) => (log.attributeValues || []).some((value) => value.attributeId === attribute.id))
    ).filter((attribute) => attribute.type !== 'text');
  }, [activity, logs]);

  if (attributes.length === 0) {
    return <div className="py-20 text-center text-sm text-stone-300">暂无可统计的属性数据</div>;
  }

  return (
    <div className="space-y-9">
      {attributes.map((attribute) => {
        const values = logs.flatMap((log) => (log.attributeValues || []).filter((value) => value.attributeId === attribute.id));

        if (attribute.type === 'text') return null;

        if (attribute.type === 'number') {
          const numbers = values.flatMap((value) => 'value' in value && typeof value.value === 'number' ? [value.value] : []);
          if (numbers.length === 0) return null;
          const sum = numbers.reduce((total, value) => total + value, 0);
          const metrics = [
            ['已填写', String(numbers.length)],
            ['合计', formatNumber(sum)],
            ['平均', formatNumber(sum / numbers.length)],
            ['最小', formatNumber(Math.min(...numbers))],
            ['最大', formatNumber(Math.max(...numbers))]
          ];
          return (
            <section key={attribute.id}>
              <h2 className="text-base font-semibold text-stone-800 mb-4">{attribute.name}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 border-y border-stone-100">
                {metrics.map(([label, value]) => (
                  <div key={label} className="py-3 sm:px-3 border-b sm:border-b-0 sm:border-r last:border-r-0 border-stone-100">
                    <div className="text-[10px] uppercase tracking-wide text-stone-400">{label}</div>
                    <div className="mt-1 text-base font-mono text-stone-800">{value}</div>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        const selectedByOption = new Map<string, number>();
        const filledRecordCount = values.length;
        values.forEach((value) => {
          const optionIds = 'optionId' in value ? [value.optionId] : 'optionIds' in value ? value.optionIds : [];
          optionIds.forEach((optionId) => selectedByOption.set(optionId, (selectedByOption.get(optionId) || 0) + 1));
        });

        const options = new Map<string, ActivityAttributeOption>((attribute.options || []).map((option) => [option.id, option]));
        selectedByOption.forEach((_count, optionId) => {
          if (!options.has(optionId)) options.set(optionId, { id: optionId, label: '已删除选项' });
        });

        return (
          <section key={attribute.id}>
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <h2 className="text-base font-semibold text-stone-800">{attribute.name}</h2>
              <span className="text-xs text-stone-400">{filledRecordCount} 条已填写</span>
            </div>
            <div className="space-y-3">
              {[...options.values()].filter((option) => selectedByOption.has(option.id)).map((option) => {
                const count = selectedByOption.get(option.id) || 0;
                const percentage = filledRecordCount === 0 ? 0 : Math.round((count / filledRecordCount) * 100);
                return (
                  <div key={option.id}>
                    <div className="flex items-center justify-between gap-4 text-sm mb-1.5">
                      <span className="min-w-0 truncate text-stone-600">{option.label}</span>
                      <span className="shrink-0 font-mono text-stone-400">{count} · {percentage}%</span>
                    </div>
                    <div className="h-1 bg-stone-100 overflow-hidden">
                      <div className="h-full bg-stone-700" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
