import React, { useState, useEffect } from 'react';
import { TodoCategory, TodoItem } from '../types';
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2, ArrowUp, ArrowDown, X, Check } from 'lucide-react';

interface TodoBatchManageViewProps {
    onBack: () => void;
    categories: TodoCategory[];
    todos: TodoItem[];
    onSave: (categories: TodoCategory[], todos: TodoItem[]) => void;
}

interface CategoryWithTodos extends TodoCategory {
    items: TodoItem[];
}

export const TodoBatchManageView: React.FC<TodoBatchManageViewProps> = ({ onBack, categories: initialCategories, todos: initialTodos, onSave }) => {
    // Initialize state by merging categories and todos (only show uncompleted todos)
    const [data, setData] = useState<CategoryWithTodos[]>(() => {
        return initialCategories.map(cat => ({
            ...cat,
            items: initialTodos.filter(t => t.categoryId === cat.id && !t.isCompleted)
        }));
    });

    const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(initialCategories.map(c => c.id)));

    // Drag state
    const [draggedItem, setDraggedItem] = useState<{ item: TodoItem, sourceCategoryId: string } | null>(null);
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
            const newData = [...data];
            [newData[index], newData[index - 1]] = [newData[index - 1], newData[index]];
            setData(newData);
        } else if (direction === 'down' && index < data.length - 1) {
            const newData = [...data];
            [newData[index], newData[index + 1]] = [newData[index + 1], newData[index]];
            setData(newData);
        }
    };

    const moveItem = (catIndex: number, itemIndex: number, direction: 'up' | 'down') => {
        const newData = [...data];
        const items = newData[catIndex].items;

        if (direction === 'up' && itemIndex > 0) {
            [items[itemIndex], items[itemIndex - 1]] = [items[itemIndex - 1], items[itemIndex]];
            setData(newData);
        } else if (direction === 'down' && itemIndex < items.length - 1) {
            [items[itemIndex], items[itemIndex + 1]] = [items[itemIndex + 1], items[itemIndex]];
            setData(newData);
        }
    };

    // --- CRUD Logic ---
    const handleAddCategory = () => {
        const newCat: CategoryWithTodos = {
            id: crypto.randomUUID(),
            name: '新列表',
            icon: '📝',
            items: []
        };
        setData([...data, newCat]);
        setExpandedCats(prev => new Set(prev).add(newCat.id));
    };

    const handleDeleteCategory = (catId: string) => {
        setData(prev => prev.filter(c => c.id !== catId));
    };

    const handleAddItem = (catId: string) => {
        const newItem: TodoItem = {
            id: crypto.randomUUID(),
            categoryId: catId,
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

    // --- Drag Logic ---
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
        setDragOverCategory(null);
        if (!draggedItem) return;
        const { item, sourceCategoryId } = draggedItem;
        if (sourceCategoryId === targetCategoryId) return;

        setData(prev => {
            const newData = [...prev];
            const sourceCat = newData.find(c => c.id === sourceCategoryId);
            const targetCat = newData.find(c => c.id === targetCategoryId);
            if (sourceCat && targetCat) {
                sourceCat.items = sourceCat.items.filter(i => i.id !== item.id);
                // Update item's categoryId
                const movedItem = { ...item, categoryId: targetCategoryId };
                targetCat.items.push(movedItem);
            }
            return newData;
        });
        setDraggedItem(null);
    };

    const handleSave = () => {
        // Separate categories and todos
        const finalCategories: TodoCategory[] = data.map(({ id, name, icon }) => ({ id, name, icon }));

        // Get all edited uncompleted todos
        const editedTodos: TodoItem[] = data.flatMap(c => c.items.map(t => ({ ...t, categoryId: c.id })));

        // Get completed todos from original data (they were not loaded into edit state)
        const completedTodos = initialTodos.filter(t => t.isCompleted);

        // Merge edited todos with completed todos
        const finalTodos = [...editedTodos, ...completedTodos];

        onSave(finalCategories, finalTodos);
    };

    return (
        <div className="h-full bg-[#faf9f6] flex flex-col">
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

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">
                {data.map((category, catIndex) => (
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
                                <button onClick={() => moveCategory(catIndex, 'up')} disabled={catIndex === 0} className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30">
                                    <ArrowUp size={16} />
                                </button>
                                <button onClick={() => moveCategory(catIndex, 'down')} disabled={catIndex === data.length - 1} className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30">
                                    <ArrowDown size={16} />
                                </button>
                                <button onClick={() => handleAddItem(category.id)} className="p-1 text-stone-400 hover:text-stone-700">
                                    <Plus size={18} />
                                </button>
                                <button onClick={() => handleDeleteCategory(category.id)} className="p-1 text-stone-300 hover:text-red-500">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Items List */}
                        {expandedCats.has(category.id) && (
                            <div className="p-2 space-y-1">
                                {category.items.map((item, itemIndex) => (
                                    <div
                                        key={item.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, item, category.id)}
                                        className="flex items-center gap-3 p-2 bg-white border border-stone-100 rounded-xl hover:border-stone-300 group cursor-move active:shadow-lg active:scale-[1.02] transition-all"
                                    >
                                        <GripVertical size={14} className="text-stone-300 shrink-0" />

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
        </div>
    );
};
