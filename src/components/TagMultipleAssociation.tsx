/**
 * @file TagMultipleAssociation.tsx
 * @input categories, selected activity IDs
 * @output Multiple Tag Selection UI
 * @pos Component (Input)
 * @description A specialized selector for associating multiple activities (tags) with filtering or configuration.
 * Supports multi-select mode with visual feedback and clear functionality.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState } from 'react';
import { Category } from '../types';
import { IconRenderer } from './IconRenderer';

interface TagMultipleAssociationProps {
    categories: Category[];
    selectedActivityIds: string[];
    onChange: (activityIds: string[]) => void;
    showToggle?: boolean;
    toggleLabel?: string;
    description?: string;
    accentColor?: string; // 用于自定义主题色
}

export const TagMultipleAssociation: React.FC<TagMultipleAssociationProps> = ({
    categories,
    selectedActivityIds,
    onChange,
    showToggle = false,
    toggleLabel = '限定标签（Activity）',
    description = '仅统计选中标签的时间记录',
    accentColor
}) => {
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [isEnabled, setIsEnabled] = useState<boolean>(selectedActivityIds.length > 0);

    const handleToggle = () => {
        const newEnabled = !isEnabled;
        setIsEnabled(newEnabled);
        if (!newEnabled) {
            // 关闭时清空选择
            onChange([]);
            setSelectedCategoryId('');
        }
    };

    const handleActivityToggle = (activityId: string) => {
        if (selectedActivityIds.includes(activityId)) {
            onChange(selectedActivityIds.filter(id => id !== activityId));
        } else {
            onChange([...selectedActivityIds, activityId]);
        }
    };

    const handleClearAll = () => {
        onChange([]);
    };

    // 获取已选择的活动信息用于显示
    const getSelectedActivities = () => {
        return selectedActivityIds
            .map(actId => {
                for (const cat of categories) {
                    const activity = cat.activities.find(a => a.id === actId);
                    if (activity) return activity;
                }
                return null;
            })
            .filter(Boolean);
    };

    const selectedActivities = getSelectedActivities();

    return (
        <div className="space-y-4">
            {/* Header with optional toggle */}
            {showToggle && (
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                        {toggleLabel}
                        <span className="text-stone-300 ml-1">（可选）</span>
                    </label>
                    <button
                        type="button"
                        onClick={handleToggle}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                            isEnabled
                                ? 'text-white'
                                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                        }`}
                        style={isEnabled ? { backgroundColor: accentColor || 'var(--accent-color)' } : {}}
                    >
                        {isEnabled ? '已开启' : '关闭'}
                    </button>
                </div>
            )}

            {description && (showToggle ? isEnabled : true) && (
                <p className="text-xs text-stone-500 mb-3">{description}</p>
            )}

            {/* Content - only show if enabled (when toggle is shown) or always (when no toggle) */}
            {(showToggle ? isEnabled : true) && (
                <>
                    {/* Category Grid */}
                    <div className="grid grid-cols-4 gap-2">
                        {categories.map(cat => {
                            const isSelected = selectedCategoryId === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setSelectedCategoryId(isSelected ? '' : cat.id)}
                                    className={`
                                        px-2 py-2 rounded-lg text-[10px] font-medium text-center transition-colors flex items-center justify-center gap-1.5 truncate
                                        ${isSelected
                                            ? 'btn-template-filled'
                                            : 'bg-stone-50 text-stone-500 border border-stone-100 hover:bg-stone-100'}
                                    `}
                                >
                                    <IconRenderer icon={cat.icon} uiIcon={cat.uiIcon} className="text-xs" />
                                    <span className="truncate">{cat.name}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Activity Grid - Multi-select */}
                    {selectedCategoryId && (
                        <div className="grid grid-cols-4 gap-3 pt-2 animate-in slide-in-from-top-2">
                            {categories
                                .find(c => c.id === selectedCategoryId)
                                ?.activities.map(act => {
                                    const isActive = selectedActivityIds.includes(act.id);
                                    return (
                                        <button
                                            key={act.id}
                                            type="button"
                                            onClick={() => handleActivityToggle(act.id)}
                                            className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 active:scale-95 hover:bg-stone-50"
                                        >
                                            <div
                                                className={`
                                                    w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all
                                                    ${act.color}
                                                `}
                                                style={isActive ? {
                                                    boxShadow: `0 0 0 1px ${accentColor || 'var(--accent-color)'}, 0 0 0 3px white, 0 0 0 4px ${accentColor || 'var(--accent-color)'}`,
                                                    transform: 'scale(1.1)'
                                                } : {}}
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
                    )}

                    {/* Clear Button */}
                    {selectedActivityIds.length > 0 && (
                        <div className="flex justify-end mt-2">
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="text-xs font-medium text-stone-400 hover:text-red-400 transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    )}

                    {/* Selected Tags Display */}
                    {selectedActivities.length > 0 && (
                        <div className="mt-3 text-xs text-stone-500 animate-in fade-in">
                            <span className="font-medium">已选择：</span>
                            {selectedActivities.map((activity, index) => (
                                <span key={activity!.id}>
                                    {activity!.icon} {activity!.name}
                                    {index < selectedActivities.length - 1 ? '、' : ''}
                                </span>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
