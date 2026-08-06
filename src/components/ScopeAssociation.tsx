/**
 * @file ScopeAssociation.tsx
 * @updated 2026-08-06: Hide archived scopes from association options.
 * @updated 2026-08-02: Reused the shared adaptive association option grid so scope chips stay readable in narrow panels.
 * @updated 2026-07-21: Updated record-detail scope chips to use outline-only selection.
 * @input scopes list, selected IDs
 * @output Scope Selection Grid
 * @pos Component (Input)
 * @description A grid of toggleable buttons for associating scopes (tags) with a log or todo item.
 * @updated 2026-05-09: Sorted scopes by shared selection order so scope pickers match scope-management ordering.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useMemo } from 'react';
import { Scope } from '../types';
import { AssociationOptionGrid } from './AssociationOptionGrid';
import { sortScopesForSelection } from '../utils/scopeSortUtils';
import { getActiveScopes } from '../utils/archiveUtils';

interface ScopeAssociationProps {
  scopes: Scope[];
  selectedScopeIds: string[] | undefined;
  onSelect: (scopeIds: string[] | undefined) => void;
}

export const ScopeAssociation: React.FC<ScopeAssociationProps> = ({ scopes, selectedScopeIds = [], onSelect }) => {
  const sortedScopes = useMemo(() => sortScopesForSelection(getActiveScopes(scopes)), [scopes]);

  const handleToggle = (scopeId: string) => {
    const currentIds = selectedScopeIds || [];
    const isSelected = currentIds.includes(scopeId);

    if (isSelected) {
      const newIds = currentIds.filter(id => id !== scopeId);
      onSelect(newIds.length > 0 ? newIds : undefined);
    } else {
      onSelect([...currentIds, scopeId]);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Associated Scope</h3>
        {selectedScopeIds && selectedScopeIds.length > 0 && (
          <button
            onClick={() => onSelect(undefined)}
            className="text-xs font-medium text-stone-400 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <AssociationOptionGrid
        items={sortedScopes}
        isSelected={(scope) => selectedScopeIds?.includes(scope.id) || false}
        onSelect={(scope) => handleToggle(scope.id)}
        selectedClassName="record-association-selected bg-stone-800 text-white border-stone-500"
        unselectedClassName="bg-transparent text-stone-500 hover:bg-stone-100"
        iconClassName="text-xs"
        fallbackIcon="📍"
      />
    </div>
  );
};
