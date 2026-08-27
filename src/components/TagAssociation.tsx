/**
 * @file TagAssociation.tsx
 * @updated 2026-08-25: Clears the previously selected activity before applying a new category so controlled parents cannot overwrite the category selection with stale state.
 * @updated 2026-08-26: Supports an optional compact title and clear action for embedded settings editors.
 * @updated 2026-08-06: Hide archived activities and scopes from association options.
 * @updated 2026-08-02: Reused the shared adaptive association option grid so tag categories stay readable in narrow panels.
 * @updated 2026-07-21: Replaced record-detail selection shadows with outline-based dark-mode states.
 * @input categories, activities, selected IDs
 * @output Tag Selection UI
 * @pos Component (Input)
 * @description A specialized selector for associating a category and activity (tag) with a log entry.
 * Supports both built-in Tailwind palette classes and custom HEX colors with soft translucent fills.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */
import React from 'react';
import { Category } from '../types';
import { AssociationOptionGrid } from './AssociationOptionGrid';
import { IconRenderer } from './IconRenderer';
import { getTagCirclePresentation } from '../utils/colorAdapterUtils';
import { getActiveActivities } from '../utils/archiveUtils';

interface TagAssociationProps {
  categories: Category[];
  selectedCategoryId: string;
  selectedActivityId: string;
  onCategorySelect: (categoryId: string) => void;
  onActivitySelect: (activityId: string) => void;
  title?: string;
  onClear?: () => void;
}

export const TagAssociation: React.FC<TagAssociationProps> = ({
  categories,
  selectedCategoryId,
  selectedActivityId,
  onCategorySelect,
  onActivitySelect,
  title,
  onClear
}) => {
  const activeCategories = categories
    .map(category => ({ ...category, activities: getActiveActivities(category) }))
    .filter(category => category.activities.length > 0);
  const selectedCategory = activeCategories.find(c => c.id === selectedCategoryId) || activeCategories[0];

  return (
    <div className="w-full space-y-4">
      {title && (
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">{title}</h3>
          {onClear && selectedActivityId && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-stone-400 transition-colors hover:text-red-400"
            >
              Clear
            </button>
          )}
        </div>
      )}
      {/* Category Grid */}
      <AssociationOptionGrid
        items={activeCategories}
        isSelected={(cat) => selectedCategoryId === cat.id}
        onSelect={(cat) => {
          onActivitySelect('');
          onCategorySelect(cat.id);
        }}
        selectedClassName="record-association-selected border-stone-700 text-stone-800"
        unselectedClassName="bg-transparent text-stone-500 hover:bg-stone-100"
        iconClassName="text-xs"
      />

      {/* Activity Grid */}
      <div className="grid grid-cols-4 gap-3">
        {selectedCategory?.activities.map(act => {
          const isActive = selectedActivityId === act.id;
          const colorPresentation = getTagCirclePresentation(act.color || '', 0.2);
          return (
            <button
              key={act.id}
              onClick={() => onActivitySelect(act.id)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 active:scale-95 hover:bg-stone-50"
            >
              <div
                style={{
                  ...colorPresentation.style,
                  ...(isActive ? { transform: 'scale(1.1)' } : {})
                }}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all
                  ${colorPresentation.className}
                  ${isActive ? 'record-association-activity-selected' : ''}
                `}
              >
                <IconRenderer icon={act.icon} uiIcon={act.uiIcon} className="text-xl" />
              </div>
              <span className={`text-xs text-center font-medium leading-tight ${isActive ? 'text-stone-900 font-bold' : 'text-stone-400'}`}>
                {act.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
