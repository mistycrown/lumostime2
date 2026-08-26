/**
 * @file TodoBatchManageView.tsx
 * @input Todos, Categories
 * @output Updated Categories/Todos (Reorder, CRUD)
 * @pos View (Modal/Page)
 * @description A specialized view for bulk management of To-Do items and categories with deferred reference cleanup for deleted todos.
 * @updated 2026-08-26: Detects every deleted todo on submit and requires migration or unlink decisions for referenced history and timers.
 * @updated 2026-05-13: Added touch drag-and-drop support plus more reliable category drop targeting so mobile batch management can move todos across categories again.
 * @updated 2026-05-13: Added the reserved `未来` bucket alongside `小事`, keeping both system categories visible in batch management while locking their names and placement.
 * @updated 2026-05-13: Added the reserved `小事` bucket to batch management so its color can be configured and quick-todo items can be manually ordered without exposing the bucket as a normal todo list category.
 * @updated 2026-04-23: Hid subtasks from the batch-management list while preserving hidden child todos and completed todos during save.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ActiveSession, Log, TodoCategory, TodoItem } from '../types';
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2, ArrowUp, ArrowDown, X, Check } from 'lucide-react';
import { UIIconSelectorCompact } from '../components/UIIconSelector';
import { IconRenderer } from '../components/IconRenderer';
import { useSettings } from '../contexts/SettingsContext';
import { COLOR_OPTIONS } from '../constants';
import { useCustomColors } from '../hooks/useCustomColors';
import { getColorPreviewValue, isStoredColorSelected } from '../utils/colorUtils';
import { applyParentTodoInheritance, isSubtask } from '../utils/todoHierarchyUtils';
import { isQuickTodo } from '../utils/todoKindUtils';
import {
    ensureQuickTodoCategory,
    FUTURE_TODO_CATEGORY_ID,
    FUTURE_TODO_CATEGORY_NAME,
    getRealTodoCategories,
    isFutureTodoCategoryId,
    isQuickTodoCategoryId,
    QUICK_TODO_CATEGORY_ID,
    QUICK_TODO_CATEGORY_NAME
} from '../utils/todoQuickCategoryUtils';
import { ReferenceDeleteModal } from '../components/ReferenceDeleteModal';
import { getDeletedTodoIds, getTodoReferenceImpact, type ReferenceDeleteDecision } from '../utils/referenceDeletion';

interface TodoBatchManageViewProps {
    onBack: () => void;
    categories: TodoCategory[];
    todos: TodoItem[];
    logs: Log[];
    activeSessions: ActiveSession[];
    onSave: (categories: TodoCategory[], todos: TodoItem[]) => void;
    onSaveWithTodoReferences?: (categories: TodoCategory[], todos: TodoItem[], decisions: Record<string, ReferenceDeleteDecision>) => void;
}

interface CategoryWithTodos extends TodoCategory {
    items: TodoItem[];
}

const getVisibleBatchTodos = (todos: TodoItem[], categoryId: string): TodoItem[] => (
    todos.filter((todo) => {
        if (todo.isCompleted || isSubtask(todo)) {
            return false;
        }

        if (isQuickTodoCategoryId(categoryId)) {
            return isQuickTodo(todo);
        }

        return !isQuickTodo(todo) && todo.categoryId === categoryId;
    })
);

const isSystemTodoCategoryId = (categoryId: string): boolean => (
    isQuickTodoCategoryId(categoryId) || isFutureTodoCategoryId(categoryId)
);

export const TodoBatchManageView: React.FC<TodoBatchManageViewProps> = ({ onBack, categories: initialCategories, todos: initialTodos, logs, activeSessions, onSave, onSaveWithTodoReferences }) => {
    const normalizedInitialCategories = React.useMemo(
        () => ensureQuickTodoCategory(initialCategories),
        [initialCategories]
    );
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const touchDragActivatedRef = useRef(false);
    const touchDraggingItemRef = useRef<{ item: TodoItem, sourceCategoryId: string } | null>(null);
    const touchDragTargetCategoryRef = useRef<string | null>(null);
    const touchDragPointRef = useRef<{ x: number; y: number; title: string } | null>(null);
    const touchDragFrameRef = useRef<number | null>(null);
    const touchAutoScrollFrameRef = useRef<number | null>(null);
    const touchAutoScrollSpeedRef = useRef(0);
    // Initialize state by merging categories and todos (only show uncompleted parent todos)
    const [data, setData] = useState<CategoryWithTodos[]>(() => {
        return normalizedInitialCategories.map(cat => ({
            ...cat,
            items: getVisibleBatchTodos(initialTodos, cat.id)
        }));
    });

    const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(normalizedInitialCategories.map(c => c.id)));
    
    // Icon selector state
    const [iconSelectorOpen, setIconSelectorOpen] = useState<string | null>(null);
    const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
    const { uiIconTheme } = useSettings();
    const isCustomIconEnabled = uiIconTheme !== 'default';
    const customColors = useCustomColors();

    // Drag state
    const [draggedItem, setDraggedItem] = useState<{ item: TodoItem, sourceCategoryId: string } | null>(null);
    const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
    const [touchDragPreview, setTouchDragPreview] = useState<{ x: number; y: number; title: string } | null>(null);
    const [isTouchDragging, setIsTouchDragging] = useState(false);
    const [todoDeleteReview, setTodoDeleteReview] = useState<{ categories: TodoCategory[]; todos: TodoItem[]; ids: string[]; index: number; decisions: Record<string, ReferenceDeleteDecision> } | null>(null);

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedCats);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedCats(newSet);
    };

    // --- Move Logic (Buttons) ---
    const moveCategory = (index: number, direction: 'up' | 'down') => {
        if (isSystemTodoCategoryId(data[index]?.id)) {
            return;
        }

        if (direction === 'up' && index > 0) {
            const newData = [...data];
            if (isSystemTodoCategoryId(newData[index - 1]?.id)) {
                return;
            }
            [newData[index], newData[index - 1]] = [newData[index - 1], newData[index]];
            setData(newData);
        } else if (direction === 'down' && index < data.length - 1) {
            const newData = [...data];
            if (isSystemTodoCategoryId(newData[index + 1]?.id)) {
                return;
            }
            [newData[index], newData[index + 1]] = [newData[index + 1], newData[index]];
            setData(newData);
        }
    };

    const moveItem = (catIndex: number, itemIndex: number, direction: 'up' | 'down') => {
        setData(prev => prev.map((category, currentCatIndex) => {
            if (currentCatIndex !== catIndex) {
                return category;
            }

            const items = [...category.items];
            if (direction === 'up' && itemIndex > 0) {
                [items[itemIndex], items[itemIndex - 1]] = [items[itemIndex - 1], items[itemIndex]];
                return { ...category, items };
            }

            if (direction === 'down' && itemIndex < items.length - 1) {
                [items[itemIndex], items[itemIndex + 1]] = [items[itemIndex + 1], items[itemIndex]];
                return { ...category, items };
            }

            return category;
        }));
    };

    // --- CRUD Logic ---
    const handleAddCategory = () => {
        const newCat: CategoryWithTodos = {
            id: crypto.randomUUID(),
            name: '新列表',
            icon: '📝',
            color: undefined,
            items: []
        };
        setData(prev => {
            const firstSystemCategoryIndex = prev.findIndex(category => isSystemTodoCategoryId(category.id));
            if (firstSystemCategoryIndex === -1) {
                return [...prev, newCat];
            }

            const next = [...prev];
            next.splice(firstSystemCategoryIndex, 0, newCat);
            return next;
        });
        setExpandedCats(prev => new Set(prev).add(newCat.id));
    };

    const handleDeleteCategory = (catId: string) => {
        if (isSystemTodoCategoryId(catId)) {
            return;
        }

        setData(prev => prev.filter(c => c.id !== catId));
    };

    const handleAddItem = (catId: string) => {
        const newItem: TodoItem = {
            id: crypto.randomUUID(),
            categoryId: catId,
            kind: isQuickTodoCategoryId(catId) ? 'quick' : 'project',
            title: '新任务',
            isCompleted: false
        };

        setData(prev => prev.map(c => {
            if (c.id === catId) {
                return { ...c, items: [...c.items, newItem] };
            }
            return c;
        }));
    };

    const handleDeleteItem = (catId: string, itemId: string) => {
        setData(prev => prev.map(c => {
            if (c.id === catId) {
                return { ...c, items: c.items.filter(i => i.id !== itemId) };
            }
            return c;
        }));
    };

    const handleNameChange = (catId: string, itemId: string | null, newName: string) => {
        setData(prev => prev.map(c => {
            if (c.id === catId) {
                if (itemId === null) {
                    if (isQuickTodoCategoryId(catId)) {
                        return c;
                    }

                    if (isFutureTodoCategoryId(catId)) {
                        return c;
                    }

                    // Edit Category Name & Icon
                    const firstChar = Array.from(newName)[0] || '';
                    const icon = firstChar;
                    const name = newName.slice(firstChar.length).trim();
                    return { ...c, icon, name };
                } else {
                    // Edit Item Title
                    const updatedItems = c.items.map(i => {
                        if (i.id === itemId) {
                            return { ...i, title: newName };
                        }
                        return i;
                    });
                    return { ...c, items: updatedItems };
                }
            }
            return c;
        }));
    };

    // Handle icon selection from UI Icon Selector
    const handleIconSelect = (catId: string, uiIconString: string) => {
        setData(prev => prev.map(c => {
            if (c.id === catId) {
                return { ...c, uiIcon: uiIconString };
            }
            return c;
        }));
        setIconSelectorOpen(null);
    };

    const handleCategoryColorChange = (catId: string, color: string) => {
        setData(prev => prev.map(c => {
            if (c.id === catId) {
                return { ...c, color };
            }
            return c;
        }));
        setColorPickerOpen(null);
    };

    // --- Drag Logic ---
    const resetDragState = () => {
        setDraggedItem(null);
        setDragOverCategory(null);
        setTouchDragPreview(null);
        setIsTouchDragging(false);
        touchDragActivatedRef.current = false;
        touchDraggingItemRef.current = null;
        touchDragTargetCategoryRef.current = null;
        touchDragPointRef.current = null;
        touchAutoScrollSpeedRef.current = 0;

        if (touchAutoScrollFrameRef.current !== null) {
            window.cancelAnimationFrame(touchAutoScrollFrameRef.current);
            touchAutoScrollFrameRef.current = null;
        }

        if (touchDragFrameRef.current !== null) {
            window.cancelAnimationFrame(touchDragFrameRef.current);
            touchDragFrameRef.current = null;
        }
    };

    const moveDraggedItemToCategory = (
        activeDraggedItem: { item: TodoItem, sourceCategoryId: string },
        targetCategoryId: string
    ) => {
        const { item, sourceCategoryId } = activeDraggedItem;
        if (sourceCategoryId === targetCategoryId) {
            return;
        }

        if (isQuickTodoCategoryId(targetCategoryId) && !isQuickTodo(item)) {
            return;
        }

        setData(prev => {
            const sourceCat = prev.find(c => c.id === sourceCategoryId);
            const targetCat = prev.find(c => c.id === targetCategoryId);
            if (!sourceCat || !targetCat) {
                return prev;
            }

            const movedItem: TodoItem = {
                ...item,
                categoryId: isQuickTodoCategoryId(targetCategoryId) ? QUICK_TODO_CATEGORY_ID : targetCategoryId,
                kind: isQuickTodoCategoryId(targetCategoryId) ? 'quick' : 'project'
            };

            return prev.map((category) => {
                if (category.id === sourceCategoryId) {
                    return {
                        ...category,
                        items: category.items.filter(i => i.id !== item.id)
                    };
                }

                if (category.id === targetCategoryId) {
                    return {
                        ...category,
                        items: [...category.items, movedItem]
                    };
                }

                return category;
            });
        });
    };

    const handleDragStart = (e: React.DragEvent, item: TodoItem, categoryId: string) => {
        setDraggedItem({ item, sourceCategoryId: categoryId });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, categoryId: string) => {
        e.preventDefault();
        setDragOverCategory(categoryId);
    };

    const handleDrop = (e: React.DragEvent, targetCategoryId: string) => {
        e.preventDefault();
        if (!draggedItem) return;
        moveDraggedItemToCategory(draggedItem, targetCategoryId);
        resetDragState();
    };

    const resolveDropCategoryFromPoint = (clientX: number, clientY: number): string | null => {
        const targetElement = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
        const dropTarget = targetElement?.closest('[data-todo-batch-drop-category]') as HTMLElement | null;
        return dropTarget?.dataset.todoBatchDropCategory || null;
    };

    const flushTouchDragPreview = () => {
        const point = touchDragPointRef.current;
        if (!point) {
            touchDragFrameRef.current = null;
            return;
        }

        const nextCategoryId = resolveDropCategoryFromPoint(point.x, point.y);
        touchDragTargetCategoryRef.current = nextCategoryId;
        setDragOverCategory((current) => current === nextCategoryId ? current : nextCategoryId);
        setTouchDragPreview((current) => (
            current
            && current.x === point.x
            && current.y === point.y
            && current.title === point.title
        )
            ? current
            : { ...point });
        touchDragFrameRef.current = null;
    };

    const queueTouchDragPreviewUpdate = (point: { x: number; y: number; title: string }) => {
        touchDragPointRef.current = point;
        if (touchDragFrameRef.current === null) {
            touchDragFrameRef.current = window.requestAnimationFrame(flushTouchDragPreview);
        }
    };

    const stopTouchAutoScroll = () => {
        touchAutoScrollSpeedRef.current = 0;
        if (touchAutoScrollFrameRef.current !== null) {
            window.cancelAnimationFrame(touchAutoScrollFrameRef.current);
            touchAutoScrollFrameRef.current = null;
        }
    };

    const stepTouchAutoScroll = () => {
        const container = scrollRef.current;
        const point = touchDragPointRef.current;
        const speed = touchAutoScrollSpeedRef.current;

        if (!container || !point || speed === 0) {
            touchAutoScrollFrameRef.current = null;
            return;
        }

        const previousScrollTop = container.scrollTop;
        container.scrollTop += speed;
        queueTouchDragPreviewUpdate(point);

        if (container.scrollTop === previousScrollTop) {
            stopTouchAutoScroll();
            return;
        }

        touchAutoScrollFrameRef.current = window.requestAnimationFrame(stepTouchAutoScroll);
    };

    const updateTouchAutoScroll = (clientY: number) => {
        const container = scrollRef.current;
        if (!container) {
            return;
        }

        const rect = container.getBoundingClientRect();
        const threshold = Math.min(96, Math.max(56, rect.height * 0.16));
        let nextSpeed = 0;

        if (clientY < rect.top + threshold) {
            const intensity = (rect.top + threshold - clientY) / threshold;
            nextSpeed = -Math.max(6, intensity * 20);
        } else if (clientY > rect.bottom - threshold) {
            const intensity = (clientY - (rect.bottom - threshold)) / threshold;
            nextSpeed = Math.max(6, intensity * 20);
        }

        if (nextSpeed === 0) {
            stopTouchAutoScroll();
            return;
        }

        touchAutoScrollSpeedRef.current = nextSpeed;
        if (touchAutoScrollFrameRef.current === null) {
            touchAutoScrollFrameRef.current = window.requestAnimationFrame(stepTouchAutoScroll);
        }
    };

    const handleTouchDragStart = (item: TodoItem, categoryId: string, event: React.TouchEvent<HTMLDivElement>) => {
        const touch = event.touches[0];
        if (!touch) {
            return;
        }

        const nextDraggedItem = { item, sourceCategoryId: categoryId };
        setDraggedItem(nextDraggedItem);
        setTouchDragPreview({
            x: touch.clientX,
            y: touch.clientY,
            title: item.title
        });
        touchDragPointRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            title: item.title
        };
        setIsTouchDragging(true);
        touchDragActivatedRef.current = true;
        touchDraggingItemRef.current = nextDraggedItem;
        touchDragTargetCategoryRef.current = null;
    };

    useEffect(() => {
        if (!isTouchDragging) {
            return;
        }

        const handleWindowTouchMove = (event: TouchEvent) => {
            if (!touchDragActivatedRef.current) {
                return;
            }

            const touch = event.touches[0];
            const activeDraggedItem = touchDraggingItemRef.current;
            if (!touch || !activeDraggedItem) {
                return;
            }

            if (event.cancelable) {
                event.preventDefault();
            }

            queueTouchDragPreviewUpdate({
                x: touch.clientX,
                y: touch.clientY,
                title: activeDraggedItem.item.title
            });
            updateTouchAutoScroll(touch.clientY);
        };

        const handleWindowTouchEnd = () => {
            if (!touchDragActivatedRef.current) {
                return;
            }

            const activeDraggedItem = touchDraggingItemRef.current;
            const targetCategoryId = touchDragTargetCategoryRef.current;
            if (targetCategoryId && activeDraggedItem) {
                moveDraggedItemToCategory(activeDraggedItem, targetCategoryId);
            }

            stopTouchAutoScroll();
            resetDragState();
        };

        window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
        window.addEventListener('touchend', handleWindowTouchEnd);
        window.addEventListener('touchcancel', handleWindowTouchEnd);

        return () => {
            stopTouchAutoScroll();
            if (touchDragFrameRef.current !== null) {
                window.cancelAnimationFrame(touchDragFrameRef.current);
                touchDragFrameRef.current = null;
            }
            window.removeEventListener('touchmove', handleWindowTouchMove);
            window.removeEventListener('touchend', handleWindowTouchEnd);
            window.removeEventListener('touchcancel', handleWindowTouchEnd);
        };
    }, [isTouchDragging]);

    const handleSave = () => {
        const finalCategories: TodoCategory[] = ensureQuickTodoCategory(
            data.map(({ id, name, icon, uiIcon, color }) => ({ id, name, icon, uiIcon, color }))
        );
        const realCategoryIds = new Set(getRealTodoCategories(finalCategories).map((category) => category.id));
        const remainingCategoryIds = new Set(finalCategories.map((category) => category.id));
        const initialVisibleTodoIds = new Set(
            initialTodos
                .filter((todo) => !todo.isCompleted && !isSubtask(todo))
                .map((todo) => todo.id)
        );
        const editedRootTodos: TodoItem[] = data.flatMap((category) => (
            category.items.map((todo) => ({
                ...todo,
                categoryId: isQuickTodoCategoryId(category.id) ? QUICK_TODO_CATEGORY_ID : category.id,
                kind: isQuickTodoCategoryId(category.id) ? 'quick' : 'project'
            }))
        ));
        const preservedHiddenTodos = initialTodos.filter((todo) => !initialVisibleTodoIds.has(todo.id));
        const preservedRootTodos = preservedHiddenTodos.filter((todo) => (
            !isSubtask(todo) && (
                isQuickTodo(todo)
                    ? remainingCategoryIds.has(QUICK_TODO_CATEGORY_ID)
                    : realCategoryIds.has(todo.categoryId)
            )
        )).map((todo) => (
            isQuickTodo(todo)
                ? { ...todo, categoryId: QUICK_TODO_CATEGORY_ID }
                : todo
        ));
        const rootTodoMap = new Map<string, TodoItem>(
            [...editedRootTodos, ...preservedRootTodos].map((todo) => [todo.id, todo])
        );
        const preservedSubtasks = preservedHiddenTodos
            .filter((todo) => isSubtask(todo))
            .map((todo) => {
                const parentTodo = todo.parentTodoId ? rootTodoMap.get(todo.parentTodoId) : null;
                if (!parentTodo || !remainingCategoryIds.has(parentTodo.categoryId)) {
                    return null;
                }

                return applyParentTodoInheritance(todo, parentTodo);
            })
            .filter((todo): todo is TodoItem => Boolean(todo));
        const finalTodos = [...editedRootTodos, ...preservedRootTodos, ...preservedSubtasks];

        const deletedTodoIds = getDeletedTodoIds(initialTodos, finalTodos);
        const impactedTodoIds = deletedTodoIds.filter((todoId) => {
            const impact = getTodoReferenceImpact(logs, activeSessions, [todoId]);
            return impact.logs > 0 || impact.activeSessions > 0;
        });

        if (impactedTodoIds.length > 0 && onSaveWithTodoReferences) {
            setTodoDeleteReview({
                categories: finalCategories,
                todos: finalTodos,
                ids: impactedTodoIds,
                index: 0,
                decisions: {}
            });
            return;
        }

        onSave(finalCategories, finalTodos);
    };

    return (
        <div className="h-full bg-[#faf9f6] flex flex-col pt-[var(--app-safe-area-top)]">
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-5 bg-[#fdfbf7] border-b border-stone-100 sticky top-0 z-20">
                <button onClick={onBack} className="p-2 -ml-2 text-stone-400 hover:text-stone-600 transition-colors">
                    <X size={24} />
                </button>
                <h1 className="font-serif font-bold text-lg text-stone-800">Todo Management</h1>
                <button onClick={handleSave} className="p-2 -mr-2 text-stone-400 hover:text-stone-600 transition-colors">
                    <Check size={24} />
                </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">
                {data.map((category, catIndex) => (
                    (() => {
                        const isQuickCategory = isQuickTodoCategoryId(category.id);
                        const isFutureCategory = isFutureTodoCategoryId(category.id);
                        const isSystemCategory = isQuickCategory || isFutureCategory;
                        return (
                    <div
                        key={category.id}
                        data-todo-batch-drop-category={category.id}
                        className={`bg-white rounded-2xl border transition-colors overflow-hidden ${dragOverCategory === category.id ? 'border-orange-500 ring-1 ring-orange-500 bg-orange-50' : 'border-stone-200'}`}
                        onDragOver={(e) => handleDragOver(e, category.id)}
                        onDragLeave={() => {
                            if (dragOverCategory === category.id) {
                                setDragOverCategory(null);
                            }
                        }}
                        onDrop={(e) => handleDrop(e, category.id)}
                    >
                        {/* Category Header */}
                        <div className="flex items-center gap-2 p-3 border-b border-stone-50 bg-stone-50/50">
                            <button onClick={() => toggleExpand(category.id)} className="text-stone-400 shrink-0">
                                {expandedCats.has(category.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>

                            {/* Category Input (Icon + Name) */}
                            {isSystemCategory ? (
                                <div className="bg-transparent font-bold text-stone-800 flex-1 min-w-0">
                                    {`${category.icon}${isFutureCategory ? FUTURE_TODO_CATEGORY_NAME : QUICK_TODO_CATEGORY_NAME}`}
                                </div>
                            ) : (
                                <input
                                    className="bg-transparent font-bold text-stone-800 flex-1 outline-none placeholder:text-stone-300 min-w-0"
                                    value={`${category.icon}${category.name}`}
                                    onChange={(e) => handleNameChange(category.id, null, e.target.value)}
                                />
                            )}

                            {/* Category Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => setColorPickerOpen(colorPickerOpen === category.id ? null : category.id)}
                                    className="p-1.5 rounded-lg transition-all shrink-0 hover:bg-stone-100"
                                    title="閫夋嫨棰滆壊"
                                >
                                    <div
                                        className="w-4 h-4 rounded-full border border-stone-300"
                                        style={{ backgroundColor: getColorPreviewValue(category.color || '', 'category') }}
                                    />
                                </button>
                                {/* Icon Selector Button - Show current UI icon preview */}
                                {isCustomIconEnabled && !isSystemCategory && (
                                    <button 
                                        onClick={() => setIconSelectorOpen(iconSelectorOpen === category.id ? null : category.id)} 
                                        className={`w-8 h-8 rounded-md transition-all flex items-center justify-center ${iconSelectorOpen === category.id ? 'bg-[var(--accent-color)]/10' : 'border border-stone-200 hover:border-stone-300 bg-white'}`}
                                        style={iconSelectorOpen === category.id ? { border: '0.5px solid var(--accent-color)' } : undefined}
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
                                <button onClick={() => moveCategory(catIndex, 'up')} disabled={catIndex === 0 || isSystemCategory} className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30">
                                    <ArrowUp size={16} />
                                </button>
                                <button onClick={() => moveCategory(catIndex, 'down')} disabled={catIndex === data.length - 1 || isSystemCategory} className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30">
                                    <ArrowDown size={16} />
                                </button>
                                <button onClick={() => handleAddItem(category.id)} className="p-1 text-stone-400 hover:text-stone-700">
                                    <Plus size={18} />
                                </button>
                                <button onClick={() => handleDeleteCategory(category.id)} disabled={isSystemCategory} className="p-1 text-stone-300 hover:text-red-500 disabled:opacity-20 disabled:hover:text-stone-300">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Color Selector Dropdown */}
                        {colorPickerOpen === category.id && (
                            <div className="p-3 border-b border-stone-100 bg-stone-50/30">
                                <div className="flex gap-2 flex-wrap">
                                    {COLOR_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => handleCategoryColorChange(category.id, opt.title)}
                                            title={opt.label}
                                            className={`w-8 h-8 rounded-full ${opt.bg} transition-all hover:scale-110 ${
                                                isStoredColorSelected(category.color, opt.title)
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
                                                isStoredColorSelected(category.color, item.color)
                                                    ? 'ring-2 ring-stone-400 ring-offset-2'
                                                    : ''
                                            }`}
                                            style={{ backgroundColor: item.color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Icon Selector Dropdown */}
                        {isCustomIconEnabled && !isSystemCategory && iconSelectorOpen === category.id && (
                            <div className="p-4 border-b border-stone-100 bg-stone-50/30">
                                <UIIconSelectorCompact
                                    currentIcon=""
                                    currentUiIcon={category.uiIcon}
                                    onSelectDual={(emoji, uiIcon) => handleIconSelect(category.id, uiIcon)}
                                />
                            </div>
                        )}

                        {/* Items List */}
                        {expandedCats.has(category.id) && (
                            <div className="p-2 space-y-1">
                                {category.items.map((item, itemIndex) => (
                                    <div
                                        key={item.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, item, category.id)}
                                        onDragEnd={resetDragState}
                                        className="flex items-center gap-3 p-2 bg-white border border-stone-100 rounded-xl hover:border-stone-300 group cursor-move active:shadow-lg active:scale-[1.02] transition-all"
                                    >
                                        <div
                                            className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
                                            onTouchStart={(event) => handleTouchDragStart(item, category.id, event)}
                                        >
                                            <GripVertical size={14} className="text-stone-300" />
                                        </div>

                                        {/* Item Title Input */}
                                        <div className="flex-1 flex items-center gap-2 min-w-0">
                                            <input
                                                className="w-full bg-transparent outline-none text-sm font-medium text-stone-700 min-w-0"
                                                value={item.title}
                                                onChange={(e) => handleNameChange(category.id, item.id, e.target.value)}
                                            />
                                        </div>

                                        {/* Item Actions */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button onClick={() => moveItem(catIndex, itemIndex, 'up')} disabled={itemIndex === 0} className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30">
                                                <ArrowUp size={14} />
                                            </button>
                                            <button onClick={() => moveItem(catIndex, itemIndex, 'down')} disabled={itemIndex === category.items.length - 1} className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30">
                                                <ArrowDown size={14} />
                                            </button>
                                            <button onClick={() => handleDeleteItem(category.id, item.id)} className="p-1 text-stone-200 hover:text-red-400">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {category.items.length === 0 && (
                                    <div className="text-center py-4 text-xs text-stone-300 italic">
                                        拖拽任务至此
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                        );
                    })()
                ))}

                {/* Add Category Button */}
                <button
                    onClick={handleAddCategory}
                    className="w-full py-2.5 border-2 border-dashed border-stone-200 rounded-2xl text-stone-400 text-sm font-bold hover:border-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus size={20} />
                    <span>添加新列表</span>
                </button>
            </div>

            {todoDeleteReview && (() => {
                const todoId = todoDeleteReview.ids[todoDeleteReview.index];
                const sourceTodo = initialTodos.find((todo) => todo.id === todoId);
                if (!sourceTodo) return null;
                const deletedTodoIds = new Set(getDeletedTodoIds(initialTodos, todoDeleteReview.todos));
                const migrationTargets = todoDeleteReview.todos
                    .filter((todo) => !todo.isCompleted && !deletedTodoIds.has(todo.id))
                    .map((todo) => ({ id: todo.id, name: todo.title }));
                return (
                    <ReferenceDeleteModal
                        isOpen
                        title="提交前确认待办关联"
                        description="检测到该待办将被删除。请选择历史记录与当前计时的迁移目标，或取消这些关联。"
                        sourceName={sourceTodo.title}
                        targetLabel="待办"
                        impact={getTodoReferenceImpact(logs, activeSessions, [todoId])}
                        targets={migrationTargets}
                        onClose={() => setTodoDeleteReview(null)}
                        onConfirm={(decision) => {
                            const decisions = { ...todoDeleteReview.decisions, [todoId]: decision };
                            const nextIndex = todoDeleteReview.index + 1;
                            if (nextIndex < todoDeleteReview.ids.length) {
                                setTodoDeleteReview({ ...todoDeleteReview, index: nextIndex, decisions });
                                return;
                            }
                            onSaveWithTodoReferences?.(todoDeleteReview.categories, todoDeleteReview.todos, decisions);
                            setTodoDeleteReview(null);
                        }}
                    />
                );
            })()}

            {touchDragPreview && (
                <div
                    className="pointer-events-none fixed z-[140] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-stone-200 bg-white/92 px-3 py-2 text-sm text-stone-700 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
                    style={{ left: touchDragPreview.x, top: touchDragPreview.y }}
                >
                    <div className="max-w-[12rem] truncate">{touchDragPreview.title}</div>
                </div>
            )}
        </div>
    );
};
