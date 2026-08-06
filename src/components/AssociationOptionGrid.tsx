/**
 * @file AssociationOptionGrid.tsx
 * @input Association option items, selected-state resolver, and click handler
 * @output Responsive association option grid
 * @pos Component (Input)
 * @description Shared option grid for todo category, tag category, and scope association chips. It keeps labels readable with two-line wrapping and a persisted three-column or four-column layout preference.
 * @updated 2026-08-02: Added todo category usage and preserved the original compact text size while keeping adaptive columns.
 * @updated 2026-08-06: Reads the shared association-selector column preference so category, scope, tag, and todo pickers can switch between three and four columns.
 */
import React from 'react';
import { useOptionalSettings } from '../contexts/SettingsContext';
import { DEFAULT_ASSOCIATION_SELECTOR_COLUMNS } from '../services/associationSelectorLayoutService';
import { IconRenderer } from './IconRenderer';

export interface AssociationOptionGridItem {
  id: string;
  name: string;
  icon?: string;
  uiIcon?: string;
}

interface AssociationOptionGridProps<TItem extends AssociationOptionGridItem> {
  items: TItem[];
  isSelected: (item: TItem) => boolean;
  onSelect: (item: TItem) => void;
  selectedClassName: string;
  unselectedClassName: string;
  className?: string;
  iconClassName?: string;
  fallbackIcon?: string;
  getButtonClassName?: (item: TItem, isSelected: boolean) => string | undefined;
  getButtonStyle?: (item: TItem, isSelected: boolean) => React.CSSProperties | undefined;
}

const joinClassNames = (...classNames: Array<string | false | undefined>): string => (
  classNames.filter(Boolean).join(' ')
);

export const AssociationOptionGrid = <TItem extends AssociationOptionGridItem>({
  items,
  isSelected,
  onSelect,
  selectedClassName,
  unselectedClassName,
  className,
  iconClassName = 'text-xs',
  fallbackIcon = '',
  getButtonClassName,
  getButtonStyle
}: AssociationOptionGridProps<TItem>) => {
  const settings = useOptionalSettings();
  const columnCount = settings?.associationSelectorColumns ?? DEFAULT_ASSOCIATION_SELECTOR_COLUMNS;

  return (
    <div
      className={joinClassNames('association-option-grid-wrap', className)}
      data-association-columns={columnCount}
    >
      <div className="association-option-grid">
        {items.map((item) => {
          const selected = isSelected(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              aria-pressed={selected}
              title={item.name}
              className={joinClassNames(
                'association-option-button',
                selected ? selectedClassName : unselectedClassName,
                getButtonClassName?.(item, selected)
              )}
              style={getButtonStyle?.(item, selected)}
            >
              <span className="association-option-icon">
                <IconRenderer icon={item.icon || fallbackIcon} uiIcon={item.uiIcon} className={iconClassName} />
              </span>
              <span className="association-option-label">{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
