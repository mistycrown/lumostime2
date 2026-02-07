/**
 * @file TodoAssociation.tsx
 * @input todos, categories, linked ID
 * @output Todo Selection UI
 * @pos Component (Input)
 * @description A specialized selector for linking a log entry to a specific Todo item, grouped by category.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useEffect } from 'react';
import { TodoItem, TodoCategory } from '../types';
import { CheckCircle2, Circle, ListTodo, TrendingUp, Ban } from 'lucide-react';

interface TodoAssociationProps {
    todos: TodoItem[];
    todoCategories: TodoCategory[];
    linkedTodoId: string | undefined;
    onChange: (todoId: string | undefined) => void;
    renderExtraContent?: (todoId: string) => React.ReactNode;
}

export const TodoAssociation: React.FC<TodoAssociationProps> = ({ todos, todoCategories, linkedTodoId, onChange, renderExtraContent }) => {
    // Internal state for selected category filter
    const [selectedCatId, setSelectedCatId] = useState<string | null>(() => {
        if (linkedTodoId) {
            const t = todos.find(t => t.id === linkedTodoId);
            if (t) return t.categoryId;
        }
        // Default to null (no category selected, list collapsed)
        return null;
    });

    // Sync selected category if linkedTodoId changes externally to a valid todo
    useEffect(() => {
        if (linkedTodoId) {
            const t = todos.find(t => t.id === linkedTodoId);
            if (t && t.categoryId !== selectedCatId) {
                setSelectedCatId(t.categoryId);
            }
        }
    }, [linkedTodoId, todos]);

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Associated Todo</span>
                {!!linkedTodoId && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange(undefined);
                        }}
                        className="text-xs font-medium text-stone-400 hover:text-red-400 transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Category Grid */}
            <div className="grid grid-cols-4 gap-2 mb-2">
                {todoCategories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCatId(selectedCatId === cat.id ? null : cat.id)}
                        className={`
                            px-2 py-2 rounded-lg text-[10px] font-medium text-center border transition-colors flex items-center justify-center gap-1.5 truncate
                            ${selectedCatId === cat.id
                                ? 'bg-stone-50 text-stone-500'
                                : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'
                            }
                        `}
                        style={selectedCatId === cat.id ? { borderColor: 'var(--accent-color)' } : {}}
                    >
                        <span>{cat.icon}</span>
                        <span className="truncate">{cat.name}</span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="space-y-0">
                {selectedCatId && (
                    <>
                        {todos
                            .filter(t => t.categoryId === selectedCatId && !t.isCompleted)
                            .map(todo => (
                                <div
                                    key={todo.id}
                                    className="group"
                                >
                                    <button
                                        onClick={() => onChange(linkedTodoId === todo.id ? undefined : todo.id)}
                                        className={`w-full text-left px-4 py-2 rounded-2xl flex items-center gap-3 transition-all ${linkedTodoId === todo.id
                                            ? 'bg-transparent text-stone-900' // Selected: No border, no background
                                            : 'bg-transparent text-stone-400 hover:bg-stone-50'
                                            }`}
                                        style={{
                                            backgroundColor: linkedTodoId === todo.id ? 'transparent' : 'transparent',
                                        }}
                                    >
                                        {linkedTodoId === todo.id ? (
                                            <CheckCircle2 size={18} className="text-stone-900 fill-stone-100" />
                                        ) : (
                                            <Circle size={18} className="text-stone-300" />
                                        )}
                                        <div className="flex-1 truncate">
                                            <span className={`text-sm ${linkedTodoId === todo.id ? 'font-bold text-stone-900' : 'font-medium text-stone-500'}`}>{todo.title}</span>
                                        </div>
                                        {todo.isProgress && (
                                            <TrendingUp size={14} className="text-stone-300" />
                                        )}
                                    </button>
                                    {linkedTodoId === todo.id && renderExtraContent && (
                                        <div className="animate-in slide-in-from-top-1 pl-[50px] pr-4 pb-0">
                                            {renderExtraContent(todo.id)}
                                        </div>
                                    )}
                                </div>
                            ))
                        }

                        {todos.filter(t => t.categoryId === selectedCatId && !t.isCompleted).length === 0 && (
                            <div className="text-center py-6 text-stone-300 text-xs italic border border-dashed border-stone-100 rounded-2xl">
                                当前分类下无待办事项
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
