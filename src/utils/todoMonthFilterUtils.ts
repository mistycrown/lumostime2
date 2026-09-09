/**
 * @file todoMonthFilterUtils.ts
 * @input Persisted Todo month-view filter settings
 * @output Normalized display-filter presets and filter-mode helpers
 * @pos Utils (Todo month view)
 * @description Keeps month-view filter settings resilient to malformed or legacy localStorage values.
 */

export type TodoMonthFilterMode = 'none' | 'hidden' | 'visible';

export interface TodoMonthFilterPreset {
  id: string;
  name: string;
  filterExpression: string;
}

export const normalizeTodoMonthFilterPresets = (value: unknown): TodoMonthFilterPreset[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item, index) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Partial<TodoMonthFilterPreset>;
    const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
    const filterExpression = typeof candidate.filterExpression === 'string'
      ? candidate.filterExpression.trim()
      : '';

    if (!name || !filterExpression) {
      return [];
    }

    return [{
      id: typeof candidate.id === 'string' && candidate.id.trim()
        ? candidate.id
        : `month-filter-${index}-${Date.now()}`,
      name,
      filterExpression
    }];
  });
};

export const normalizeTodoMonthFilterMode = (value: unknown): TodoMonthFilterMode => (
  value === 'hidden' || value === 'visible' ? value : 'none'
);

export const getTodoMonthFilterExpression = ({
  mode,
  hiddenFilterExpression,
  presets,
  activePresetId
}: {
  mode: TodoMonthFilterMode;
  hiddenFilterExpression: string;
  presets: TodoMonthFilterPreset[];
  activePresetId: string;
}): string => {
  if (mode === 'hidden') {
    return hiddenFilterExpression.trim();
  }

  if (mode === 'visible') {
    return presets.find((preset) => preset.id === activePresetId)?.filterExpression || '';
  }

  return '';
};
