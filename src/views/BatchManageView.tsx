/**
 * @file BatchManageView.tsx
 * @updated 2026-08-06: Added archive and restore actions for activities.
 * @updated 2026-08-26: Defers tag deletion checks until batch submission and supports per-tag migration targets.
 * @updated 2026-08-26: Added category archive and restore controls with cascading child-tag state updates.
 * @updated 2026-09-11: Restored activity drag-and-drop sorting and cross-category movement with an explicit leading drag handle.
 * @input Categories, Activities
 * @output Updated Category Structure
 * @pos View (Settings Sub-page)
 * @description A dedicated management interface for batch editing categories and activities, including creating, renaming, deleting, and reordering.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Category, Activity } from '../types';
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2, ArrowUp, ArrowDown, X, Check, Archive, ArchiveRestore, AlertTriangle } from 'lucide-react';
import { UIIconSelectorCompact } from '../components/UIIconSelector';
import { IconRenderer } from '../components/IconRenderer';
import { uiIconService } from '../services/uiIconService';
import { useSettings } from '../contexts/SettingsContext';
import { COLOR_OPTIONS } from '../constants';
import { useCustomColors } from '../hooks/useCustomColors';
import { getColorPreviewValue, isStoredColorSelected } from '../utils/colorUtils';
import type { ActivityMigrationImpact } from '../utils/activityReferenceMigration';
import { setCategoryArchiveState } from '../utils/archiveUtils';

interface BatchManageViewProps {
    onBack: () => void;
    categories: Category[];
    onSave: (categories: Category[]) => void;
    onPreviewActivityMigration?: (sourceActivityId: string) => ActivityMigrationImpact;
    onApplyTagBatchChanges?: (
        categories: Category[],
        migrations: Array<{ sourceActivityId: string; targetActivityId: string }>
    ) => Promise<ActivityMigrationImpact[]>;
}

export const BatchManageView: React.FC<BatchManageViewProps> = ({ onBack, categories: initialCategories, onSave, onPreviewActivityMigration, onApplyTagBatchChanges }) => {
    const [categories, setCategories] = useState<Category[]>(JSON.parse(JSON.stringify(initialCategories)));
    const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(initialCategories.map(c => c.id)));
    const [isReorderMode, setIsReorderMode] = useState(false);

    // Icon selector state - for both categories and activities
    const [iconSelectorOpen, setIconSelectorOpen] = useState<{ type: 'category' | 'activity', id: string } | null>(null);
    
    // Color picker state - for both categories and activities
    const [colorPickerOpen, setColorPickerOpen] = useState<{ type: 'category' | 'activity', id: string } | null>(null);
    
    const { uiIconTheme } = useSettings();
    const isCustomIconEnabled = uiIconService.isCustomTheme();
    const customColors = useCustomColors();

    // Drag state for activity sorting and cross-category movement.
    const [draggedActivity, setDraggedActivity] = useState<{ activity: Activity, sourceCategoryId: string } | null>(null);
    const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
    const [dragOverActivity, setDragOverActivity] = useState<{ categoryId: string; activityId: string; position: 'before' | 'after' } | null>(null);
    const [isTouchDragging, setIsTouchDragging] = useState(false);
    const touchDraggingActivityRef = useRef<{ activity: Activity; sourceCategoryId: string } | null>(null);
    const touchDragTargetRef = useRef<{ categoryId: string; activityId?: string; position?: 'before' | 'after' } | null>(null);
    const [migrationReviewOpen, setMigrationReviewOpen] = useState(false);
    const [migrationSelections, setMigrationSelections] = useState<Record<string, string>>({});
    const [migrationImpacts, setMigrationImpacts] = useState<Record<string, ActivityMigrationImpact>>({});
    const [openMigrationMenu, setOpenMigrationMenu] = useState<string | null>(null);
    const [migrationMenuAnchor, setMigrationMenuAnchor] = useState<{ top: number; bottom: number; left: number; width: number } | null>(null);
    const [isApplyingBatch, setIsApplyingBatch] = useState(false);
    const [migrationError, setMigrationError] = useState('');

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
        setCategories(prev => prev.map(category => category.id === catId
            ? { ...category, activities: category.activities.filter(activity => activity.id !== actId) }
            : category
        ));
    };

    const deletedActivities = useMemo(() => {
        const currentActivityIds = new Set(categories.flatMap(category => category.activities).map(activity => activity.id));
        return initialCategories.flatMap(category => category.activities
            .filter(activity => !currentActivityIds.has(activity.id))
            .map(activity => ({ activity, category })));
    }, [categories, initialCategories]);

    const migrationTargetOptions = useMemo(() => {
        const deletedIds = new Set(deletedActivities.map(({ activity }) => activity.id));
        const originalActivityIds = new Set(initialCategories.flatMap(category => category.activities).map(activity => activity.id));
        return categories.flatMap(category => category.activities
            .filter(activity => originalActivityIds.has(activity.id) && category.isArchived !== true && !deletedIds.has(activity.id) && activity.isArchived !== true)
            .map(activity => ({ activity, category })));
    }, [categories, deletedActivities, initialCategories]);

    const handleSubmit = () => {
        if (deletedActivities.length === 0) {
            onSave(categories);
            return;
        }

        const nextSelections: Record<string, string> = {};
        const nextImpacts: Record<string, ActivityMigrationImpact> = {};
        deletedActivities.forEach(({ activity }) => {
            if (onPreviewActivityMigration) {
                nextImpacts[activity.id] = onPreviewActivityMigration(activity.id);
            }
        });
        setMigrationSelections(nextSelections);
        setMigrationImpacts(nextImpacts);
        setMigrationError('');
        setOpenMigrationMenu(null);
        setMigrationMenuAnchor(null);
        setMigrationReviewOpen(true);
    };

    const handleApplyBatch = async () => {
        if (!onApplyTagBatchChanges) {
            onSave(categories);
            return;
        }
        const missingTarget = deletedActivities.some(({ activity }) => !migrationSelections[activity.id]);
        if (missingTarget) {
            setMigrationError('请为每个待删除标签选择迁移目标。');
            return;
        }
        setIsApplyingBatch(true);
        setMigrationError('');
        try {
            await onApplyTagBatchChanges(
                categories,
                deletedActivities.map(({ activity }) => ({
                    sourceActivityId: activity.id,
                    targetActivityId: migrationSelections[activity.id]
                }))
            );
            setMigrationReviewOpen(false);
            onBack();
        } catch (error) {
            setMigrationError(error instanceof Error ? error.message : '迁移失败，批量修改未应用。');
        } finally {
            setIsApplyingBatch(false);
        }
    };

    const handleToggleActivityArchive = (catId: string, actId: string) => {
        setCategories(prev => prev.map(c => c.id === catId
            ? { ...c, activities: c.activities.map(a => a.id === actId ? { ...a, isArchived: a.isArchived !== true } : a) }
            : c
        ));
    };

    const handleToggleCategoryArchive = (catId: string) => {
        setCategories(prev => prev.map(category => (
            category.id === catId
                ? setCategoryArchiveState(category, category.isArchived !== true)
                : category
        )));
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
        return getColorPreviewValue(colorStr, 'activity');
    };

    // Get color hex from category themeColor (use lightHex for display)
    const getColorFromCategoryThemeColor = (themeColor: string): string => {
        return getColorPreviewValue(themeColor, 'category');
    };

    // --- Drag Logic ---
    const handleDragStart = (e: React.DragEvent, activity: Activity, categoryId: string) => {
        setDraggedActivity({ activity, sourceCategoryId: categoryId });
        setDragOverActivity(null);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', activity.id);
    };

    const handleDragOver = (e: React.DragEvent, categoryId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCategory(categoryId);
        setDragOverActivity(null);
    };

    const handleActivityDragOver = (e: React.DragEvent, categoryId: string, activityId: string) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        const rect = e.currentTarget.getBoundingClientRect();
        setDragOverCategory(categoryId);
        setDragOverActivity({
            categoryId,
            activityId,
            position: e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
        });
    };

    const clearDragState = () => {
        setDraggedActivity(null);
        setDragOverCategory(null);
        setDragOverActivity(null);
    };

    const toggleReorderMode = () => {
        clearDragState();
        touchDraggingActivityRef.current = null;
        touchDragTargetRef.current = null;
        setIsTouchDragging(false);
        setIsReorderMode(previous => {
            if (!previous) setExpandedCats(new Set(categories.map(category => category.id)));
            return !previous;
        });
    };

    const applyActivityDrop = (dragged: { activity: Activity; sourceCategoryId: string }, targetCategoryId: string, targetActivity?: { activityId: string; position: 'before' | 'after' }) => {
        const { activity, sourceCategoryId } = dragged;
        setCategories(prev => {
            const nextCategories = prev.map(category => ({ ...category, activities: [...category.activities] }));
            const sourceCat = nextCategories.find(category => category.id === sourceCategoryId);
            const targetCat = nextCategories.find(category => category.id === targetCategoryId);
            if (!sourceCat || !targetCat) return prev;

            const sourceIndex = sourceCat.activities.findIndex(item => item.id === activity.id);
            if (sourceIndex < 0) return prev;
            sourceCat.activities.splice(sourceIndex, 1);

            let targetIndex = targetCat.activities.length;
            if (targetActivity) {
                const overIndex = targetCat.activities.findIndex(item => item.id === targetActivity.activityId);
                if (overIndex >= 0) {
                    targetIndex = targetActivity.position === 'before' ? overIndex : overIndex + 1;
                }
            }
            targetCat.activities.splice(Math.max(0, targetIndex), 0, activity);
            return nextCategories;
        });
    };

    const handleDrop = (e: React.DragEvent, targetCategoryId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedActivity) return;
        const targetActivity = dragOverActivity?.categoryId === targetCategoryId
            ? { activityId: dragOverActivity.activityId, position: dragOverActivity.position }
            : undefined;
        applyActivityDrop(draggedActivity, targetCategoryId, targetActivity);
        clearDragState();
    };

    useEffect(() => {
        if (!isTouchDragging) return;
        const resolveTouchTarget = (clientX: number, clientY: number) => {
            const element = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
            const activityElement = element?.closest('[data-tag-batch-activity]') as HTMLElement | null;
            const categoryElement = element?.closest('[data-tag-batch-category]') as HTMLElement | null;
            const categoryId = activityElement?.dataset.tagBatchCategory || categoryElement?.dataset.tagBatchCategory;
            if (!categoryId) return;
            if (activityElement?.dataset.tagBatchActivity) {
                const rect = activityElement.getBoundingClientRect();
                const target = {
                    categoryId,
                    activityId: activityElement.dataset.tagBatchActivity,
                    position: clientY < rect.top + rect.height / 2 ? 'before' as const : 'after' as const
                };
                touchDragTargetRef.current = target;
                setDragOverCategory(categoryId);
                setDragOverActivity(target);
            } else {
                touchDragTargetRef.current = { categoryId };
                setDragOverCategory(categoryId);
                setDragOverActivity(null);
            }
        };
        const handleTouchMove = (event: TouchEvent) => {
            const touch = event.touches[0];
            if (!touch || !touchDraggingActivityRef.current) return;
            if (event.cancelable) event.preventDefault();
            resolveTouchTarget(touch.clientX, touch.clientY);
        };
        const handleTouchEnd = () => {
            const dragged = touchDraggingActivityRef.current;
            const target = touchDragTargetRef.current;
            if (dragged && target) {
                applyActivityDrop(dragged, target.categoryId, target.activityId && target.position ? { activityId: target.activityId, position: target.position } : undefined);
            }
            touchDraggingActivityRef.current = null;
            touchDragTargetRef.current = null;
            setIsTouchDragging(false);
            clearDragState();
        };
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', handleTouchEnd);
        return () => {
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [isTouchDragging]);

    const handleTouchDragStart = (activity: Activity, categoryId: string, event: React.TouchEvent<HTMLDivElement>) => {
        if (!isReorderMode) return;
        const touch = event.touches[0];
        if (!touch) return;
        const dragged = { activity, sourceCategoryId: categoryId };
        touchDraggingActivityRef.current = dragged;
        touchDragTargetRef.current = { categoryId };
        setDraggedActivity(dragged);
        setDragOverCategory(categoryId);
        setIsTouchDragging(true);
    };

    return (
        <div className="h-full bg-[#faf9f6] flex flex-col pt-[var(--app-safe-area-top)]">
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-5 bg-[#fdfbf7] border-b border-stone-100 sticky top-0 z-20">
                <button onClick={onBack} className="p-2 -ml-2 text-stone-400 hover:text-stone-600 transition-colors">
                    <X size={24} />
                </button>
                <h1 className="font-serif font-bold text-lg text-stone-800">Tag Management</h1>
                <button onClick={handleSubmit} className="p-2 -mr-2 text-stone-400 hover:text-stone-600 transition-colors" title="提交批量修改">
                    <Check size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">
                {categories.map((category, catIndex) => (
                    <div
                        key={category.id}
                        data-tag-batch-category={category.id}
                        className={`bg-white rounded-2xl border transition-colors overflow-hidden ${category.isArchived === true ? 'opacity-60' : ''} ${isReorderMode && dragOverCategory === category.id ? 'border-orange-500 ring-1 ring-orange-500 bg-orange-50' : 'border-stone-200'}`}
                        onDragOver={isReorderMode ? (e) => handleDragOver(e, category.id) : undefined}
                        onDrop={isReorderMode ? (e) => handleDrop(e, category.id) : undefined}
                    >
                        {/* Category Header */}
                        <div className="flex items-center gap-2 p-3 border-b border-stone-50 bg-stone-50/50">
                            <button onClick={() => toggleExpand(category.id)} className="text-stone-400 shrink-0">
                                {expandedCats.has(category.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>

                            {isReorderMode ? (
                                <div className="flex-1 min-w-0 font-bold text-stone-800 truncate">{category.icon}{category.name}</div>
                            ) : (
                                <input
                                    className="bg-transparent font-bold text-stone-800 flex-1 outline-none placeholder:text-stone-300 min-w-0"
                                    value={`${category.icon}${category.name}`}
                                    onChange={(e) => handleNameChange(category.id, null, e.target.value)}
                                />
                            )}

                            {/* Category Actions */}
                            {!isReorderMode && <div className="flex items-center gap-1 shrink-0">
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
                                        className={`w-8 h-8 rounded-md transition-all flex items-center justify-center ${
                                            iconSelectorOpen?.type === 'category' && iconSelectorOpen?.id === category.id 
                                                ? 'bg-[var(--accent-color)]/10' 
                                                : 'border border-stone-200 hover:border-stone-300 bg-white'
                                        }`}
                                        style={iconSelectorOpen?.type === 'category' && iconSelectorOpen?.id === category.id ? { border: '0.5px solid var(--accent-color)' } : undefined}
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
                                <button
                                    type="button"
                                    onClick={() => handleToggleCategoryArchive(category.id)}
                                    className="p-1 text-stone-300 hover:text-amber-500"
                                    title={category.isArchived === true ? '恢复分类' : '归档分类'}
                                >
                                    {category.isArchived === true ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                                </button>
                                <button onClick={() => handleDeleteCategory(category.id)} className="p-1 text-stone-300 hover:text-red-500">
                                    <Trash2 size={16} />
                                </button>
                            </div>}
                        </div>

                        {/* Color Picker Dropdown for Category */}
                        {!isReorderMode && colorPickerOpen?.type === 'category' && colorPickerOpen?.id === category.id && (
                            <div className="p-3 border-b border-stone-100 bg-stone-50/30">
                                <div className="flex gap-2 flex-wrap">
                                    {COLOR_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => handleCategoryColorChange(category.id, opt.title)}
                                            title={opt.label}
                                            className={`w-8 h-8 rounded-full ${opt.bg} transition-all hover:scale-110 ${
                                                isStoredColorSelected(category.themeColor, opt.title)
                                                    ? `ring-2 ${opt.ring} ring-offset-2` 
                                                    : ''
                                            }`}
                                        />
                                    ))}
                                    {customColors.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleCategoryColorChange(category.id, item.color)}
                                            title={item.color}
                                            className={`w-8 h-8 rounded-full border border-stone-300 transition-all hover:scale-110 ${
                                                isStoredColorSelected(category.themeColor, item.color)
                                                    ? 'ring-2 ring-stone-400 ring-offset-2'
                                                    : ''
                                            }`}
                                            style={{ backgroundColor: item.color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Icon Selector Dropdown for Category */}
                        {!isReorderMode && isCustomIconEnabled && iconSelectorOpen?.type === 'category' && iconSelectorOpen?.id === category.id && (
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
                                            data-tag-batch-activity={activity.id}
                                            data-tag-batch-category={category.id}
                                            draggable={isReorderMode}
                                            onDragStart={isReorderMode ? (e) => handleDragStart(e, activity, category.id) : undefined}
                                            onDragEnd={isReorderMode ? clearDragState : undefined}
                                            onDragOver={isReorderMode ? (e) => handleActivityDragOver(e, category.id, activity.id) : undefined}
                                            onDrop={isReorderMode ? (e) => handleDrop(e, category.id) : undefined}
                                            onTouchStart={isReorderMode ? (e) => handleTouchDragStart(activity, category.id, e) : undefined}
                                            className={`flex items-center gap-3 p-2 bg-white border border-stone-100 rounded-xl hover:border-stone-300 group transition-all ${activity.isArchived === true ? 'opacity-55' : ''} ${isReorderMode ? 'cursor-grab touch-none active:cursor-grabbing active:shadow-lg active:scale-[1.02]' : ''} ${isReorderMode && dragOverActivity?.categoryId === category.id && dragOverActivity.activityId === activity.id ? 'border-orange-300' : ''}`}
                                        >
                                            <GripVertical size={14} className={`shrink-0 ${isReorderMode ? 'text-orange-400' : 'text-stone-300'}`} />

                                            {/* Combined Input for Icon + Name */}
                                            {isReorderMode ? (
                                                <div className="flex-1 min-w-0 truncate text-sm font-medium text-stone-700">{activity.icon}{activity.name}</div>
                                            ) : <div className="flex-1 flex items-center gap-2 min-w-0">
                                                <input
                                                    className="w-full bg-transparent outline-none text-sm font-medium text-stone-700 min-w-0"
                                                    value={`${activity.icon}${activity.name}`}
                                                    onChange={(e) => handleNameChange(category.id, activity.id, e.target.value)}
                                                />
                                            </div>}

                                            {/* Color Picker Button */}
                                            {!isReorderMode && <button
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
                                            </button>}

                                            {/* Activity Actions */}
                                            {!isReorderMode && <div className="flex items-center gap-1 shrink-0">
                                                {/* Icon Selector Button for Activity - Show current UI icon preview */}
                                                {isCustomIconEnabled && (
                                                    <button 
                                                        onClick={() => setIconSelectorOpen(
                                                            iconSelectorOpen?.type === 'activity' && iconSelectorOpen?.id === activity.id 
                                                                ? null 
                                                                : { type: 'activity', id: activity.id }
                                                        )} 
                                                        className={`w-7 h-7 rounded-md transition-all flex items-center justify-center ${
                                                            iconSelectorOpen?.type === 'activity' && iconSelectorOpen?.id === activity.id 
                                                                ? 'bg-[var(--accent-color)]/10' 
                                                                : 'border border-stone-200 hover:border-stone-300 bg-white'
                                                        }`}
                                                        style={iconSelectorOpen?.type === 'activity' && iconSelectorOpen?.id === activity.id ? { border: '0.5px solid var(--accent-color)' } : undefined}
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
                                                <button
                                                    onClick={() => handleToggleActivityArchive(category.id, activity.id)}
                                                    className="p-1 text-stone-300 hover:text-amber-500"
                                                    title={activity.isArchived === true ? '恢复' : '归档'}
                                                >
                                                    {activity.isArchived === true ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                                                </button>
                                                <button onClick={() => moveActivity(catIndex, actIndex, 'up')} disabled={actIndex === 0} className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30">
                                                    <ArrowUp size={14} />
                                                </button>
                                                <button onClick={() => moveActivity(catIndex, actIndex, 'down')} disabled={actIndex === category.activities.length - 1} className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30">
                                                    <ArrowDown size={14} />
                                                </button>
                                                <button onClick={() => handleDeleteActivity(category.id, activity.id)} className="p-1 text-stone-200 hover:text-red-400" title="迁移并删除标签">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>}
                                        </div>

                                        {/* Color Picker Dropdown */}
                                        {!isReorderMode && colorPickerOpen?.type === 'activity' && colorPickerOpen?.id === activity.id && (
                                            <div className="p-3 mt-1 bg-stone-50/50 rounded-xl border border-stone-100">
                                                <div className="flex gap-2 flex-wrap">
                                                    {COLOR_OPTIONS.map(opt => (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => handleActivityColorChange(category.id, activity.id, `${opt.bg} ${opt.text}`)}
                                                            title={opt.label}
                                                            className={`w-8 h-8 rounded-full ${opt.bg} transition-all hover:scale-110 ${
                                                                isStoredColorSelected(activity.color, `${opt.bg} ${opt.text}`)
                                                                    ? `ring-2 ${opt.ring} ring-offset-2` 
                                                                    : ''
                                                            }`}
                                                        />
                                                    ))}
                                                    {customColors.map((item) => (
                                                        <button
                                                            key={item.id}
                                                            onClick={() => handleActivityColorChange(category.id, activity.id, item.color)}
                                                            title={item.color}
                                                            className={`w-8 h-8 rounded-full border border-stone-300 transition-all hover:scale-110 ${
                                                                isStoredColorSelected(activity.color, item.color)
                                                                    ? 'ring-2 ring-stone-400 ring-offset-2'
                                                                    : ''
                                                            }`}
                                                            style={{ backgroundColor: item.color }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Icon Selector Dropdown for Activity */}
                                        {!isReorderMode && isCustomIconEnabled && iconSelectorOpen?.type === 'activity' && iconSelectorOpen?.id === activity.id && (
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
                    className={`${isReorderMode ? 'hidden' : 'w-full py-2.5 border-2 border-dashed border-stone-200 rounded-2xl text-stone-400 text-sm font-bold hover:border-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center gap-2'}`}
                >
                    <Plus size={20} />
                    <span>添加新分类</span>
                </button>
                <button
                    type="button"
                    onClick={toggleReorderMode}
                    className="mt-6 flex w-full items-center gap-2 border-0 bg-transparent px-1 py-1 text-left text-xs font-medium text-stone-400 transition-colors hover:text-stone-600"
                    title={isReorderMode ? '退出调整顺序' : '进入调整顺序模式'}
                >
                    <GripVertical size={14} />
                    <span>{isReorderMode ? '完成调整' : '调整顺序'}</span>
                </button>
            </div>
            {migrationReviewOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
                    <div className="flex h-[min(640px,calc(100vh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-stone-200 bg-[#fdfbf7] shadow-2xl">
                        <div className="flex items-start gap-3 border-b border-stone-100 p-5">
                            <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={20} />
                            <div>
                                <h2 className="font-bold text-stone-800">提交前确认标签迁移</h2>
                                <p className="mt-1 text-sm leading-6 text-stone-500">检测到以下标签将被删除。请选择每个标签的历史记录和待办迁移目标，确认后才会应用全部批量修改。</p>
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
                            {deletedActivities.map(({ activity, category }) => {
                                const selectedTarget = migrationTargetOptions.find(({ activity: candidate }) => candidate.id === migrationSelections[activity.id]);
                                const impact = migrationImpacts[activity.id];
                                return (
                                    <div key={activity.id} className="rounded-xl border border-stone-200 bg-white p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-bold text-stone-800">{activity.icon}{activity.name}</div>
                                                <div className="mt-0.5 truncate text-xs text-stone-400">{category.name}</div>
                                            </div>
                                            <Trash2 size={15} className="shrink-0 text-red-300" />
                                        </div>
                                        <div className="relative mt-3">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    if (openMigrationMenu === activity.id) {
                                                        setOpenMigrationMenu(null);
                                                        setMigrationMenuAnchor(null);
                                                        return;
                                                    }
                                                    const rect = event.currentTarget.getBoundingClientRect();
                                                    setOpenMigrationMenu(activity.id);
                                                    setMigrationMenuAnchor({ top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width });
                                                }}
                                                className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-left text-sm text-stone-700 transition-colors hover:border-stone-400"
                                                aria-expanded={openMigrationMenu === activity.id}
                                            >
                                                <span className={selectedTarget ? 'text-stone-800' : 'text-stone-400'}>
                                                    {selectedTarget ? `${selectedTarget.category.name} / ${selectedTarget.activity.icon}${selectedTarget.activity.name}` : '选择未归档标签作为迁移目标'}
                                                </span>
                                                <ChevronDown size={16} className={`shrink-0 text-stone-400 transition-transform ${openMigrationMenu === activity.id ? 'rotate-180' : ''}`} />
                                            </button>
                                            {openMigrationMenu === activity.id && (
                                                <>
                                                    <button type="button" aria-label="关闭标签目标菜单" className="fixed inset-0 z-[109] cursor-default" onClick={() => { setOpenMigrationMenu(null); setMigrationMenuAnchor(null); }} />
                                                    {migrationMenuAnchor && (() => {
                                                        const spaceAbove = migrationMenuAnchor.top - 16;
                                                        const spaceBelow = window.innerHeight - migrationMenuAnchor.bottom - 16;
                                                        const openAbove = spaceAbove >= spaceBelow;
                                                        const maxHeight = Math.max(96, Math.min(288, openAbove ? spaceAbove : spaceBelow));
                                                        return (
                                                            <div
                                                                className="fixed z-[110] overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
                                                                style={{
                                                                    left: migrationMenuAnchor.left,
                                                                    width: migrationMenuAnchor.width,
                                                                    maxHeight,
                                                                    ...(openAbove
                                                                        ? { bottom: window.innerHeight - migrationMenuAnchor.top + 8 }
                                                                        : { top: migrationMenuAnchor.bottom + 8 })
                                                                }}
                                                            >
                                                        {migrationTargetOptions.length === 0 ? (
                                                            <div className="px-3 py-3 text-xs text-stone-400">没有可用的未归档标签</div>
                                                        ) : migrationTargetOptions.map(({ activity: candidate, category: candidateCategory }) => (
                                                            <button
                                                                key={candidate.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setMigrationSelections(previous => ({ ...previous, [activity.id]: candidate.id }));
                                                                    setOpenMigrationMenu(null);
                                                                    setMigrationMenuAnchor(null);
                                                                }}
                                                                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-stone-50 ${candidate.id === migrationSelections[activity.id] ? 'bg-stone-100 font-bold' : 'text-stone-700'}`}
                                                            >
                                                                <span className="shrink-0 text-base">{candidate.icon}</span>
                                                                <span className="min-w-0 flex-1 truncate">{candidateCategory.name} / {candidate.name}</span>
                                                                {candidate.id === migrationSelections[activity.id] && <Check size={15} className="shrink-0 text-stone-600" />}
                                                            </button>
                                                        ))}
                                                            </div>
                                                        );
                                                    })()}
                                                </>
                                            )}
                                        </div>
                                        {impact && (
                                            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-stone-400">
                                                <span>历史记录 {impact.logs}</span>
                                                <span>待办 {impact.todos}</span>
                                                <span>当前计时 {impact.activeSessions}</span>
                                                <span>规则/应用 {impact.autoLinkRules + impact.appRules}</span>
                                                <span>场景/小组件 {impact.sceneCards + impact.widgetSlots}</span>
                                                <span>筛选条件 {impact.goalFilters + impact.memoirFilters + impact.timePalFilters}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {migrationTargetOptions.length === 0 && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-600">当前没有可用的迁移目标，请取消后保留至少一个未归档标签。</p>}
                            {migrationError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-600">{migrationError}</p>}
                        </div>
                        <div className="flex gap-3 border-t border-stone-100 bg-white p-4">
                            <button type="button" onClick={() => { setMigrationReviewOpen(false); setOpenMigrationMenu(null); setMigrationMenuAnchor(null); setMigrationError(''); }} disabled={isApplyingBatch} className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-600">取消</button>
                            <button type="button" onClick={handleApplyBatch} disabled={isApplyingBatch || migrationTargetOptions.length === 0} className="flex-1 rounded-xl bg-stone-900 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{isApplyingBatch ? '正在应用…' : '确定并应用修改'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
