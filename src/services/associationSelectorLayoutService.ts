/**
 * @file associationSelectorLayoutService.ts
 * @input Stored association selector column preference
 * @output Normalized three-column or four-column selector layout values
 * @pos Service (UI preference)
 * @description Centralizes the layout options shared by category, scope, tag-category, and todo-category association selectors.
 * @updated 2026-08-06: Added persistent selector column layout options for the shared association picker grid.
 */

export type AssociationSelectorColumns = 3 | 4;

export const DEFAULT_ASSOCIATION_SELECTOR_COLUMNS: AssociationSelectorColumns = 3;

export const ASSOCIATION_SELECTOR_COLUMN_OPTIONS: Array<{
  value: AssociationSelectorColumns;
  label: string;
}> = [
  { value: 3, label: '三列' },
  { value: 4, label: '四列' }
];

export const normalizeAssociationSelectorColumns = (value: unknown): AssociationSelectorColumns => {
  if (value === 3 || value === '3') {
    return 3;
  }

  if (value === 4 || value === '4') {
    return 4;
  }

  return DEFAULT_ASSOCIATION_SELECTOR_COLUMNS;
};
