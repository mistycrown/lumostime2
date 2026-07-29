/**
 * @file TagAssociation.tsx
 * @updated 2026-07-21: Replaced record-detail selection shadows with outline-based dark-mode states.
 * @input categories, activities, selected IDs
 * @output Tag Selection UI
 * @pos Component (Input)
 * @description A specialized selector for associating a category and activity (tag) with a log entry.
 * Supports both built-in Tailwind palette classes and custom HEX colors with soft translucent fills.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React from 'react';
import { Category } from '../types';
import { IconRenderer } from './IconRenderer';
import { getTagCirclePresentation } from '../utils/colorAdapterUtils';

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
            {/* Category Grid */}
            <div className="grid grid-cols-4 gap-2">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => {
                            onCategorySelect(cat.id);
                            // 切换分类时不自动选中活动，清空选中状态
                            onActivitySelect('');
                        }}
                        className={`
                            px-2 py-2 rounded-lg text-[10px] font-medium text-center transition-colors flex items-center justify-center gap-1.5 truncate
                            ${selectedCategoryId === cat.id
                                ? 'record-association-selected border border-stone-700 text-stone-800'
                                : 'bg-transparent text-stone-500 hover:bg-stone-100'}
                        `}
                    >
                        <IconRenderer icon={cat.icon} uiIcon={cat.uiIcon} className="text-xs" />
                        <span className="truncate">{cat.name}</span>
                    </button>
                ))}
            </div>

            {/* Activity Grid */}
            <div className="grid grid-cols-4 gap-3">
                {selectedCategory.activities.map(act => {
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
