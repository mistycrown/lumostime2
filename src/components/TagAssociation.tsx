/**
 * @file TagAssociation.tsx
 * @input categories, activities, selected IDs
 * @output Tag Selection UI
 * @pos Component (Input)
 * @description A specialized selector for associating a category and activity (tag) with a log entry.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React from 'react';
import { Category } from '../types';

interface TagAssociationProps {
    categories: Category[];
    selectedCategoryId: string;
    selectedActivityId: string;
    onCategorySelect: (categoryId: string) => void;
    onActivitySelect: (activityId: string) => void;
}

export const TagAssociation: React.FC<TagAssociationProps> = ({
    categories,
    selectedCategoryId,
    selectedActivityId,
    onCategorySelect,
    onActivitySelect
}) => {
    const selectedCategory = categories.find(c => c.id === selectedCategoryId) || categories[0];

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Associated Tag</span>
            </div>

            {/* Category Grid */}
            <div className="grid grid-cols-4 gap-2">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => {
                            onCategorySelect(cat.id);
                            onActivitySelect(cat.activities[0].id);
                        }}
                        className={`
                            px-2 py-2 rounded-lg text-[10px] font-medium text-center transition-colors flex items-center justify-center gap-1.5 truncate
                            ${selectedCategoryId === cat.id
                                ? 'btn-template-filled'
                                : 'bg-stone-50 text-stone-500 border border-stone-100 hover:bg-stone-100'}
                        `}
                    >
                        <span>{cat.icon}</span>
                        <span className="truncate">{cat.name}</span>
                    </button>
                ))}
            </div>

            {/* Activity Grid */}
            <div className="grid grid-cols-4 gap-3">
                {selectedCategory.activities.map(act => {
                    const isActive = selectedActivityId === act.id;
                    return (
                        <button
                            key={act.id}
                            onClick={() => onActivitySelect(act.id)}
                            className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 active:scale-95 hover:bg-stone-50"
                        >
                            <div
                                className={`
                                    w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all
                                    ${act.color}
                                `}
                                style={isActive ? {
                                    boxShadow: `0 0 0 1px var(--accent-color)`,
                                    transform: 'scale(1.1)'
                                } : {}}
                            >
                                {act.icon}
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
