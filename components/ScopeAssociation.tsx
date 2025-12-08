import React from 'react';
import { Scope } from '../types';
import { Target } from 'lucide-react';

interface ScopeAssociationProps {
    scopes: Scope[];
    selectedScopeIds: string[] | undefined; // Changed from selectedScopeId
    onSelect: (scopeIds: string[] | undefined) => void; // Changed signature
}

export const ScopeAssociation: React.FC<ScopeAssociationProps> = ({ scopes, selectedScopeIds = [], onSelect }) => {
    const handleToggle = (scopeId: string) => {
        const currentIds = selectedScopeIds || [];
        const isSelected = currentIds.includes(scopeId);

        if (isSelected) {
            // Remove from selection
            const newIds = currentIds.filter(id => id !== scopeId);
            onSelect(newIds.length > 0 ? newIds : undefined);
        } else {
            // Add to selection
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

            <div className="grid grid-cols-4 gap-2">
                {scopes.map(scope => {
                    const isSelected = selectedScopeIds?.includes(scope.id) || false;
                    return (
                        <button
                            key={scope.id}
                            onClick={() => handleToggle(scope.id)}
                            className={`px-2 py-2 rounded-lg text-[10px] font-medium text-center border transition-colors flex items-center justify-center gap-1.5 truncate ${isSelected
                                ? 'bg-stone-900 text-white border-stone-900'
                                : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'
                                }`}
                        >
                            <span>{scope.icon || '📍'}</span>
                            <span className="truncate">{scope.name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
