/**
 * @file BatchManageView.tsx
 * @input Categories, Activities
 * @output Updated Category Structure
 * @pos View (Settings Sub-page)
 * @description A dedicated management interface for batch editing categories and activities, including creating, renaming, deleting, and reordering.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState } from 'react';
import { Category, Activity } from '../types';
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2, ArrowUp, ArrowDown, X, Check, Palette } from 'lucide-react';
import { UIIconSelectorCompact } from '../components/UIIconSelector';
import { IconRenderer } from '../components/IconRenderer';
import { uiIconService } from '../services/uiIconService';
import { useSettings } from '../contexts/SettingsContext';
import { COLOR_OPTIONS } from '../constants';

interface BatchManageViewProps {
    onBack: () => void;
    categories: Category[];
    onSave: (categories: Category[]) => void;
}

export const BatchManageView: React.FC<BatchManageViewProps> = ({ onBack, categories: initialCategories, onSave }) => {
    const [categories, setCategories] = useState<Category[]>(JSON.parse(JSON.stringify(initialCategories)));
    const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(initialCategories.map(c => c.id)));

    // Icon selector state - for both categories and activities
    const [iconSelectorOpen, setIconSelectorOpen] = useState<{ type: 'category' | 'activity', id: string } | null>(null);
    
    // Color picker state - for both categories and activities
    const [colorPickerOpen, setColorPickerOpen] = useState<{ type: 'category' | 'activity', id: string } | null>(null);
    
    const { uiIconTheme } = useSettings();
    const isCustomIconEnabled = uiIconService.isCustomTheme();

    // Drag state (kept for reference, but user said it's unusable, so we rely on buttons now)
    const [draggedActivity, setDraggedActivity] = useState<{ activity: Activity, sourceCategoryId: string } | null>(null);
    const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedCats);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedCats(newSet);
    };

    // --- Move Logic (Buttons) ---
    const moveCategory = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index > 0) {
            const newCats = [...categories];
            [newCats[index], newCats[index - 1]] = [newCats[index - 1], newCats[index]];
            setCategories(newCats);
        } else if (direction === 'down' && index < categories.length - 1) {
            const newCats = [...categories];
            [newCats[index], newCats[index + 1]] = [newCats[index + 1], newCats[index]];
            setCategories(newCats);
        }
    };

    const moveActivity = (catIndex: number, actIndex: number, direction: 'up' | 'down') => {
        const newCats = [...categories];
        const activities = newCats[catIndex].activities;

        if (direction === 'up' && actIndex > 0) {
            [activities[actIndex], activities[actIndex - 1]] = [activities[actIndex - 1], activities[actIndex]];
            setCategories(newCats);
        } else if (direction === 'down' && actIndex < activities.length - 1) {
            [activities[actIndex], activities[actIndex + 1]] = [activities[actIndex + 1], activities[actIndex]];
            setCategories(newCats);
        }
    };

    // --- CRUD Logic ---
    const handleAddCategory = () => {
        const newCat: Category = {
            id: crypto.randomUUID(),
            name: '新分类',
            icon: '📁',
            themeColor: 'text-stone-500',
            activities: []
        };
        setCategories([...categories, newCat]);
        setExpandedCats(prev => new Set(prev).add(newCat.id));
    };

    const handleDeleteCategory = (catId: string) => {
        // No confirm as requested
        setCategories(prev => prev.filter(c => c.id !== catId));
    };

    const handleAddActivity = (catId: string) => {
        const newActivity: Activity = {
            id: crypto.randomUUID(),
            name: '新活动',
            icon: '📝',
            color: 'bg-stone-100 text-stone-600'
        };

        setCategories(prev => prev.map(c => {
            if (c.id === catId) {
                return { ...c, activities: [...c.activities, newActivity] };
            }
            return c;
        }));
    };

    const handleDeleteActivity = (catId: string, actId: string) => {
        // No confirm as requested
        setCategories(prev => prev.map(c => {
            if (c.id === catId) {
                return { ...c, activities: c.activities.filter(a => a.id !== actId) };
            }
            return c;
        }));
    };

    const handleNameChange = (catId: string, actId: string | null, newName: string) => {
        setCategories(prev => prev.map(c => {
            if (c.id === catId) {
                if (actId === null) {
                    // Edit Category Name & Icon
                    // Logic: First char is icon if provided
                    const firstChar = Array.from(newName)[0] || '';
                    const icon = firstChar;
                    const name = newName.slice(firstChar.length).trim();

                    // If empty, keep defaults or allow empty? 
                    // Let's just update. If user deletes all, it becomes empty.
                    return { ...c, icon, name };
                } else {
                    // Edit Activity Name & Icon
                    const updatedActivities = c.activities.map(a => {
                        if (a.id === actId) {
                            const firstChar = Array.from(newName)[0] || '';
                            const icon = firstChar;
                            const name = newName.slice(firstChar.length).trim();
                            return { ...a, icon, name };
                        }
                        return a;
                    });
                    return { ...c, activities: updatedActivities };
                }
            }
            return c;
        }));
    };

    // Handle icon selection for categories
    const handleCategoryIconSelect = (catId: string, uiIconString: string) => {
        setCategories(prev => prev.map(c => {
            if (c.id === catId) {
                return { ...c, uiIcon: uiIconString };
            }
            return c;
        }));
        setIconSelectorOpen(null);
    };

    // Handle icon selection for activities
    const handleActivityIconSelect = (catId: string, actId: string, uiIconString: string) => {
        setCategories(prev => prev.map(c => {
            if (c.id === catId) {
                return {
                    ...c,
                    activities: c.activities.map(a => {
                        if (a.id === actId) {
                            return { ...a, uiIcon: uiIconString };
                        }
                        return a;
                    })
                };
            }
            return c;
        }));
        setIconSelectorOpen(null);
    };

    // Handle color selection for categories
    const handleCategoryColorChange = (catId: string, color: string) => {
        setCategories(prev => prev.map(c => {
            if (c.id === catId) {
                return { ...c, themeColor: color };
            }
            return c;
        }));
        setColorPickerOpen(null); // Close color picker after selection
    };

    // Handle color selection for activities
    const handleActivityColorChange = (catId: string, actId: string, color: string) => {
        setCategories(prev => prev.map(c => {
            if (c.id === catId) {
                return {
                    ...c,
                    activities: c.activities.map(a => {
                        if (a.id === actId) {
                            return { ...a, color };
                        }
                        return a;
                    })
                };
            }
            return c;
        }));
        setColorPickerOpen(null); // Close color picker after selection
    };

    // Get color hex from activity color string (use lightHex for display)
    const getColorFromActivityColor = (colorStr: string): string => {
        if (!colorStr) return '#e7e5e4';
        
        // Match bg-{color}-{shade} pattern
        const match = colorStr.match(/bg-([a-z]+)-/);
        if (match) {
            const colorName = match[1];
            const option = COLOR_OPTIONS.find(opt => opt.id === colorName);
            if (option) {
                return option.lightHex; // Use lightHex for lighter color
            }
        }
        return '#e7e5e4';
    };

    // Get color hex from category themeColor (use lightHex for display)
    const getColorFromCategoryThemeColor = (themeColor: string): string => {
        if (!themeColor) return '#e7e5e4';
        
        // Match text-{color}-{shade} pattern
        const match = themeColor.match(/text-([a-z]+)-/);
        if (match) {
            const colorName = match[1];
            const option = COLOR_OPTIONS.find(opt => opt.id === colorName);
            if (option) {
                return option.lightHex; // Use lightHex for lighter color
            }
        }
        return '#e7e5e4';
    };

    // --- Drag Logic (Kept but optional now) ---
    const handleDragStart = (e: React.DragEvent, activity: Activity, categoryId: string) => {
        setDraggedActivity({ activity, sourceCategoryId: categoryId });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, categoryId: string) => {
        e.preventDefault();
        setDragOverCategory(categoryId);
    };

    const handleDrop = (e: React.DragEvent, targetCategoryId: string) => {
        e.preventDefault();
        setDragOverCategory(null);
        if (!draggedActivity) return;
        const { activity, sourceCategoryId } = draggedActivity;
        if (sourceCategoryId === targetCategoryId) return;

        setCategories(prev => {
            const newCats = [...prev];
            const sourceCat = newCats.find(c => c.id === sourceCategoryId);
            const targetCat = newCats.find(c => c.id === targetCategoryId);
            if (sourceCat && targetCat) {
                sourceCat.activities = sourceCat.activities.filter(a => a.id !== activity.id);
                targetCat.activities.push(activity);
            }
            return newCats;
        });
        setDraggedActivity(null);
    };

    return (
        <div className="h-full bg-[#faf9f6] flex flex-col pt-[env(safe-area-inset-top)]">
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-5 bg-[#fdfbf7] border-b border-stone-100 sticky top-0 z-20">
                <button onClick={onBack} className="p-2 -ml-2 text-stone-400 hover:text-stone-600 transition-colors">
                    <X size={24} />
                </button>
                <h1 className="font-serif font-bold text-lg text-stone-800">Tag Management</h1>
                <button onClick={() => onSave(categories)} className="p-2 -mr-2 text-stone-400 hover:text-stone-600 transition-colors">
                    <Check size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">
                {categories.map((category, catIndex) => (
                    <div
                        key={category.id}
                        className={`bg-white rounded-2xl border transition-colors overflow-hidden ${dragOverCategory === category.id ? 'border-orange-500 ring-1 ring-orange-500 bg-orange-50' : 'border-stone-200'}`}
                        onDragOver={(e) => handleDragOver(e, category.id)}
                        onDrop={(e) => handleDrop(e, category.id)}
                    >
                        {/* Category Header */}
                        <div className="flex items-center gap-2 p-3 border-b border-stone-50 bg-stone-50/50">
                            <button onClick={() => toggleExpand(category.id)} className="text-stone-400 shrink-0">
                                {expandedCats.has(category.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>

                            {/* Category Input (Icon + Name) */}
                            <input
                                className="bg-transparent font-bold text-stone-800 flex-1 outline-none placeholder:text-stone-300 min-w-0"
                                value={`${category.icon}${category.name}`}
                                onChange={(e) => handleNameChange(category.id, null, e.target.value)}
                            />

                            {/* Category Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                                {/* Color Picker Button for Category */}
                                <button
                                    onClick={() => setColorPickerOpen(
                                        colorPickerOpen?.type === 'category' && colorPickerOpen?.id === category.id 
                                            ? null 
                                            : { type: 'category', id: category.id }
                                    )}
                                    className="p-1.5 rounded-lg transition-all shrink-0 hover:bg-stone-100"
                                    title="选择颜色"
                                >
                                    <div 
                                        className="w-4 h-4 rounded-full border border-stone-300"
                                        style={{ backgroundColor: getColorFromCategoryThemeColor(category.themeColor) }}
                                    />
                                </button>
                                
                                {/* Icon Selector Button - Show current UI icon preview */}
                                {isCustomIconEnabled && (
                                    <button 
                                        onClick={() => setIconSelectorOpen(
                                            iconSelectorOpen?.type === 'category' && iconSelectorOpen?.id === category.id 
                                                ? null 
                                                : { type: 'category', id: category.id }
                                        )} 
                                        className={`w-8 h-8 rounded-md transition-all border flex items-center justify-center ${
                                            iconSelectorOpen?.type === 'category' && iconSelectorOpen?.id === category.id 
                                                ? 'border-orange-500 bg-orange-50' 
                                                : 'border-stone-200 hover:border-stone-300 bg-white'
                                        }`}
                                        title="选择 UI 图标"
                                    >
                                        {category.uiIcon ? (
                                            <IconRenderer 
                                                icon={category.icon} 
                                                uiIcon={category.uiIcon}
                                                size={16}
                                            />
                                        ) : (
                                            <span className="text-stone-300 text-xs">+</span>
                                        )}
                                    </button>
                                )}
                                <button onClick={() => moveCategory(catIndex, 'up')} disabled={catIndex === 0} className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30">
                                    <ArrowUp size={16} />
                                </button>
                                <button onClick={() => moveCategory(catIndex, 'down')} disabled={catIndex === categories.length - 1} className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30">
                                    <ArrowDown size={16} />
                                </button>
                                <button onClick={() => handleAddActivity(category.id)} className="p-1 text-stone-400 hover:text-stone-700">
                                    <Plus size={18} />
                                </button>
                                <button onClick={() => handleDeleteCategory(category.id)} className="p-1 text-stone-300 hover:text-red-500">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Color Picker Dropdown for Category */}
                        {colorPickerOpen?.type === 'category' && colorPickerOpen?.id === category.id && (
                            <div className="p-3 border-b border-stone-100 bg-stone-50/30">
                                <div className="flex gap-2 flex-wrap">
                                    {COLOR_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => handleCategoryColorChange(category.id, opt.title)}
                                            title={opt.label}
                                            className={`w-8 h-8 rounded-full ${opt.bg} transition-all hover:scale-110 ${
                                                category.themeColor.includes(opt.id) 
                                                    ? `ring-2 ${opt.ring} ring-offset-2` 
                                                    : ''
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Icon Selector Dropdown for Category */}
                        {isCustomIconEnabled && iconSelectorOpen?.type === 'category' && iconSelectorOpen?.id === category.id && (
                            <div className="p-4 border-b border-stone-100 bg-stone-50/30">
                                <UIIconSelectorCompact
                                    currentIcon=""
                                    currentUiIcon={category.uiIcon}
                                    onSelectDual={(emoji, uiIcon) => handleCategoryIconSelect(category.id, uiIcon)}
                                />
                            </div>
                        )}

                        {/* Activities List */}
                        {expandedCats.has(category.id) && (
                            <div className="p-2 space-y-1">
                                {category.activities.map((activity, actIndex) => (
                                    <div key={activity.id}>
                                        <div
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, activity, category.id)}
                                            className="flex items-center gap-3 p-2 bg-white border border-stone-100 rounded-xl hover:border-stone-300 group cursor-move active:shadow-lg active:scale-[1.02] transition-all"
                                        >
                                            <GripVertical size={14} className="text-stone-300 shrink-0" />

                                            {/* Combined Input for Icon + Name */}
                                            <div className="flex-1 flex items-center gap-2 min-w-0">
                                                <input
                                                    className="w-full bg-transparent outline-none text-sm font-medium text-stone-700 min-w-0"
                                                    value={`${activity.icon}${activity.name}`}
                                                    onChange={(e) => handleNameChange(category.id, activity.id, e.target.value)}
                                                />
                                            </div>

                                            {/* Color Picker Button */}
                                            <button
                                                onClick={() => setColorPickerOpen(
                                                    colorPickerOpen?.type === 'activity' && colorPickerOpen?.id === activity.id 
                                                        ? null 
                                                        : { type: 'activity', id: activity.id }
                                                )}
                                                className="p-1.5 rounded-lg transition-all shrink-0 hover:bg-stone-100"
                                                title="选择颜色"
                                            >
                                                <div 
                                                    className="w-4 h-4 rounded-full border border-stone-300"
                                                    style={{ backgroundColor: getColorFromActivityColor(activity.color) }}
                                                />
                                            </button>

                                            {/* Activity Actions */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                {/* Icon Selector Button for Activity - Show current UI icon preview */}
                                                {isCustomIconEnabled && (
                                                    <button 
                                                        onClick={() => setIconSelectorOpen(
                                                            iconSelectorOpen?.type === 'activity' && iconSelectorOpen?.id === activity.id 
                                                                ? null 
                                                                : { type: 'activity', id: activity.id }
                                                        )} 
                                                        className={`w-7 h-7 rounded-md transition-all border flex items-center justify-center ${
                                                            iconSelectorOpen?.type === 'activity' && iconSelectorOpen?.id === activity.id 
                                                                ? 'border-orange-500 bg-orange-50' 
                                                                : 'border-stone-200 hover:border-stone-300 bg-white'
                                                        }`}
                                                        title="选择 UI 图标"
                                                    >
                                                        {activity.uiIcon ? (
                                                            <IconRenderer 
                                                                icon={activity.icon} 
                                                                uiIcon={activity.uiIcon}
                                                                size={14}
                                                            />
                                                        ) : (
                                                            <span className="text-stone-300 text-xs">+</span>
                                                        )}
                                                    </button>
                                                )}
                                                <button onClick={() => moveActivity(catIndex, actIndex, 'up')} disabled={actIndex === 0} className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30">
                                                    <ArrowUp size={14} />
                                                </button>
                                                <button onClick={() => moveActivity(catIndex, actIndex, 'down')} disabled={actIndex === category.activities.length - 1} className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30">
                                                    <ArrowDown size={14} />
                                                </button>
                                                <button onClick={() => handleDeleteActivity(category.id, activity.id)} className="p-1 text-stone-200 hover:text-red-400">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Color Picker Dropdown */}
                                        {colorPickerOpen?.type === 'activity' && colorPickerOpen?.id === activity.id && (
                                            <div className="p-3 mt-1 bg-stone-50/50 rounded-xl border border-stone-100">
                                                <div className="flex gap-2 flex-wrap">
                                                    {COLOR_OPTIONS.map(opt => (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => handleActivityColorChange(category.id, activity.id, `${opt.bg} ${opt.text}`)}
                                                            title={opt.label}
                                                            className={`w-8 h-8 rounded-full ${opt.bg} transition-all hover:scale-110 ${
                                                                activity.color.includes(opt.bg) 
                                                                    ? `ring-2 ${opt.ring} ring-offset-2` 
                                                                    : ''
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Icon Selector Dropdown for Activity */}
                                        {isCustomIconEnabled && iconSelectorOpen?.type === 'activity' && iconSelectorOpen?.id === activity.id && (
                                            <div className="p-3 mt-1 bg-stone-50/50 rounded-xl border border-stone-100">
                                                <UIIconSelectorCompact
                                                    currentIcon=""
                                                    currentUiIcon={activity.uiIcon}
                                                    onSelectDual={(emoji, uiIcon) => handleActivityIconSelect(category.id, activity.id, uiIcon)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {category.activities.length === 0 && (
                                    <div className="text-center py-4 text-xs text-stone-300 italic">
                                        拖拽项目至此
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {/* Add Category Button */}
                <button
                    onClick={handleAddCategory}
                    className="w-full py-2.5 border-2 border-dashed border-stone-200 rounded-2xl text-stone-400 text-sm font-bold hover:border-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus size={20} />
                    <span>添加新分类</span>
                </button>
            </div>
        </div>
    );
};
