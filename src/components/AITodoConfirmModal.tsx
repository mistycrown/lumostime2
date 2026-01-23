import React, { useState, useEffect } from 'react';
import { X, Check, Plus, Trash2, Sparkles, Folder, Lightbulb, CheckCircle2 } from 'lucide-react';
import { TodoCategory, Category, Scope, Activity, AutoLinkRule } from '../types';

export interface ParsedTask {
    id: string; // Temporary ID
    title: string;
    categoryId: string; // TodoCategory ID
    linkedActivityId?: string; // Activity ID
    linkedCategoryId?: string; // Activity Category ID (derived or specific)
    defaultScopeIds: string[];
}

interface AITodoConfirmModalProps {
    onClose: () => void;
    onSave: (tasks: ParsedTask[]) => void;
    initialTasks: ParsedTask[];
    todoCategories: TodoCategory[];
    activityCategories: Category[];
    scopes: Scope[];
    autoLinkRules?: AutoLinkRule[];
}

export const AITodoConfirmModal: React.FC<AITodoConfirmModalProps> = ({
    onClose,
    onSave,
    initialTasks,
    todoCategories,
    activityCategories,
    scopes,
    autoLinkRules = []
}) => {
    const [tasks, setTasks] = useState<ParsedTask[]>(initialTasks);
    // Track active activity category tab for each task
    const [activeTabMap, setActiveTabMap] = useState<Record<string, string>>({});

    useEffect(() => {
        setTasks(initialTasks);
        // Initialize tabs based on pre-selected activity or default to first category
        const initialTabs: Record<string, string> = {};
        initialTasks.forEach(t => {
            if (t.linkedCategoryId) {
                initialTabs[t.id] = t.linkedCategoryId;
            } else if (t.linkedActivityId) {
                // Try to find the category that contains this activity
                const foundCat = activityCategories.find(c => c.activities.some(a => a.id === t.linkedActivityId));
                if (foundCat) {
                    initialTabs[t.id] = foundCat.id;
                }
            }

            // Fallback if still no tab assigned
            if (!initialTabs[t.id] && activityCategories.length > 0) {
                initialTabs[t.id] = activityCategories[0].id;
            }
        });
        setActiveTabMap(initialTabs);
    }, [initialTasks, activityCategories]);

    const updateTask = (index: number, updates: Partial<ParsedTask>) => {
        const newTasks = [...tasks];
        newTasks[index] = { ...newTasks[index], ...updates };

        // Auto-derive linkedCategoryId if linkedActivityId changes, but ONLY if we are setting it, not clearing it
        // Actually for the Tab UI, selecting an activity implies selecting its category.
        if (updates.linkedActivityId) {
            const foundCat = activityCategories.find(c => c.activities.some(a => a.id === updates.linkedActivityId));
            if (foundCat) {
                newTasks[index].linkedCategoryId = foundCat.id;
            }
        }

        setTasks(newTasks);
    };

    const addTask = () => {
        const newTask: ParsedTask = {
            id: Date.now().toString(),
            title: '',
            categoryId: todoCategories[0]?.id || '',
            defaultScopeIds: []
        };
        setTasks([...tasks, newTask]);
        setActiveTabMap(prev => ({
            ...prev,
            [newTask.id]: activityCategories[0]?.id || ''
        }));
    };

    const removeTask = (index: number) => {
        const newTasks = [...tasks];
        newTasks.splice(index, 1);
        setTasks(newTasks);
        if (newTasks.length === 0) {
            // Optional: Close modal if empty? Or keep open? User might want to add.
        }
    };

    const handleTabClick = (taskId: string, categoryId: string) => {
        setActiveTabMap(prev => ({ ...prev, [taskId]: categoryId }));
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200 font-serif">
            <div className="bg-[#fdfbf7] w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-white/80 backdrop-blur sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                            <Sparkles size={16} />
                        </div>
                        <h2 className="font-bold text-stone-800 text-lg">AI Integration</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-stone-100 rounded-full text-stone-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#faf9f6]">
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 pb-20">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Review ({tasks.length})</h3>
                            <button
                                onClick={addTask}
                                className="text-stone-600 text-xs font-bold flex items-center gap-1 hover:bg-stone-100 px-3 py-1.5 rounded-full transition-colors bg-white border border-stone-100"
                            >
                                <Plus size={14} /> Add
                            </button>
                        </div>

                        <div className="space-y-4">
                            {tasks.map((task, index) => {
                                const activeTabId = activeTabMap[task.id] || activityCategories[0]?.id;
                                const activeCategory = activityCategories.find(c => c.id === activeTabId);

                                return (
                                    <div key={task.id} className="bg-white p-5 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-stone-100 relative group transition-all hover:shadow-lg hover:border-stone-200">
                                        <div className="space-y-6">

                                            {/* Top Row: Task Name & Delete */}
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-[10px] font-bold text-stone-300 uppercase tracking-wider block">Task Name</label>
                                                    <button
                                                        onClick={() => removeTask(index)}
                                                        className="text-stone-300 hover:text-red-500 p-1 -mr-1 rounded-full hover:bg-red-50 transition-colors"
                                                        title="Delete Entry"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <input
                                                    className="w-full bg-transparent border-b border-stone-200 px-0 py-2 text-base font-medium text-stone-800 placeholder:text-stone-300 outline-none focus:border-stone-400 transition-all"
                                                    placeholder="Describe task..."
                                                    type="text"
                                                    value={task.title}
                                                    onChange={(e) => updateTask(index, { title: e.target.value })}
                                                />
                                            </div>

                                            {/* List Selection */}
                                            <div>
                                                <label className="text-[10px] font-bold text-stone-300 uppercase tracking-wider mb-2 block">List</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {todoCategories.map(cat => (
                                                        <button
                                                            key={cat.id}
                                                            onClick={() => updateTask(index, { categoryId: cat.id })}
                                                            className={`
                                                                px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1.5
                                                                ${task.categoryId === cat.id
                                                                    ? 'bg-stone-800 text-white shadow-md'
                                                                    : 'bg-stone-50 text-stone-500 border border-stone-100 hover:bg-stone-100'}
                                                            `}
                                                        >
                                                            <span>{cat.icon}</span>
                                                            {task.categoryId === cat.id && <span>{cat.name}</span>}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Activity Selection */}
                                            <div className="pt-2">
                                                <label className="text-[10px] font-bold text-stone-300 uppercase tracking-wider mb-2 block">ASSOCIATED TAG</label>

                                                {/* Category Tabs */}
                                                <div className="grid grid-cols-4 gap-2 mb-3">
                                                    {activityCategories.map(cat => (
                                                        <button
                                                            key={cat.id}
                                                            onClick={() => handleTabClick(task.id, cat.id)}
                                                            className={`
                                                                px-2 py-2 rounded-lg text-[10px] font-medium text-center border transition-colors truncate
                                                                ${activeTabId === cat.id
                                                                    ? 'bg-stone-900 text-white border-stone-900'
                                                                    : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'}
                                                            `}
                                                        >
                                                            {cat.name}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Activities Grid */}
                                                {activeCategory && (
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {activeCategory.activities.map(act => {
                                                            const isSelected = task.linkedActivityId === act.id;
                                                            return (
                                                                <button
                                                                    key={act.id}
                                                                    onClick={() => updateTask(index, { linkedActivityId: isSelected ? undefined : act.id, linkedCategoryId: activeCategory.id })}
                                                                    className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 active:scale-95 hover:bg-stone-50"
                                                                >
                                                                    <div className={`
                                                                        w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all
                                                                        ${isSelected
                                                                            ? 'ring-1 ring-stone-300 ring-offset-1 scale-110 bg-green-100 text-green-700'
                                                                            : 'bg-stone-100 text-stone-400'}
                                                                    `}>
                                                                        {act.icon}
                                                                    </div>
                                                                    <span className={`text-[10px] text-center font-medium leading-tight ${isSelected ? 'text-stone-900 font-bold' : 'text-stone-400'}`}>
                                                                        {act.name}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Scope Selection */}
                                            <div className="pt-2">
                                                <label className="text-[10px] font-bold text-stone-300 uppercase tracking-wider mb-2 block">ASSOCIATED SCOPE</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {scopes.map(scope => {
                                                        const isSelected = task.defaultScopeIds.includes(scope.id);
                                                        return (
                                                            <button
                                                                key={scope.id}
                                                                onClick={() => {
                                                                    const newIds = isSelected
                                                                        ? task.defaultScopeIds.filter(id => id !== scope.id)
                                                                        : [...task.defaultScopeIds, scope.id];
                                                                    updateTask(index, { defaultScopeIds: newIds });
                                                                }}
                                                                className={`
                                                                    px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5
                                                                    ${isSelected
                                                                        ? 'bg-stone-800 text-white shadow-md'
                                                                        : 'bg-stone-50 text-stone-400 border border-transparent hover:bg-stone-100'}
                                                                `}
                                                                title={scope.name}
                                                            >
                                                                <span className={isSelected ? '' : ''}>{scope.icon}</span>
                                                                {isSelected && <span>{scope.name}</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 bg-white border-t border-stone-100 shrink-0">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-4 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold hover:bg-stone-50 transition-colors"
                        >
                            Back
                        </button>
                        <button
                            onClick={() => onSave(tasks)}
                            className="flex-1 py-4 bg-stone-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors shadow-xl shadow-stone-200 active:scale-[0.98]"
                        >
                            <Check size={20} />
                            <span>Save All ({tasks.length})</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
