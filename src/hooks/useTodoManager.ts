/**
 * @file useTodoManager.ts
 * @input DataContext (todos, setTodos, todoCategories, setTodoCategories, logs, setLogs), NavigationContext (modal states), CategoryScopeContext (categories), ToastContext (addToast), SessionContext (startActivity), SettingsContext (autoLinkRules, updateDataLastModified)
 * @output Todo CRUD Operations (handleSaveTodo, handleDeleteTodo, handleToggleTodo, handleDuplicateTodo, handleBatchAddTodos), Modal Control (openAddTodoModal, openEditTodoModal, closeTodoModal), Focus Management (handleStartTodoFocus), Progress Update (updateTodoProgress)
 * @pos Hook (Data Manager)
 * @description 待办事项数据管理 Hook - 处理待办的增删改查、完成状态切换、专注模式启动、批量操作等
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { useState } from 'react';
import { TodoItem, TodoCategory } from '../types';
import { useData } from '../contexts/DataContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useToast } from '../contexts/ToastContext';
import { useSession } from '../contexts/SessionContext';
import { useSettings } from '../contexts/SettingsContext';

export const useTodoManager = () => {
    const { todos, setTodos, todoCategories, setTodoCategories, logs, setLogs } = useData();
    const { categories } = useCategoryScope();
    const {
        setIsTodoModalOpen,
        setEditingTodo,
        setTodoCategoryToAdd,
        setIsTodoManaging
    } = useNavigation();
    const { addToast } = useToast();
    const { startActivity } = useSession();
    const { autoLinkRules, updateDataLastModified } = useSettings();

    const [isDeleteTodoConfirmOpen, setIsDeleteTodoConfirmOpen] = useState(false);
    const [todoToDeleteId, setTodoToDeleteId] = useState<string | null>(null);

    const handleToggleTodo = (id: string) => {
        setTodos(prev => prev.map(t => {
            if (t.id === id) {
                const isCompleted = !t.isCompleted;
                return {
                    ...t,
                    isCompleted,
                    completedAt: isCompleted ? new Date().toISOString() : undefined
                };
            }
            return t;
        }));
    };

    const handleStartTodoFocus = (todo: TodoItem) => {
        if (todo.linkedCategoryId && todo.linkedActivityId) {
            const cat = categories.find(c => c.id === todo.linkedCategoryId);
            const act = cat?.activities.find(a => a.id === todo.linkedActivityId);

            if (cat && act) {
                startActivity(act, cat.id, autoLinkRules, todo.id, todo.defaultScopeIds);
                return;
            }
        }
        addToast('info', "Please link this task to an activity (Category > Activity) to track statistics.");
        openEditTodoModal(todo);
    };

    const openAddTodoModal = (categoryId: string) => {
        setEditingTodo(null);
        setTodoCategoryToAdd(categoryId);
        setIsTodoModalOpen(true);
    };

    const openEditTodoModal = (todo: TodoItem) => {
        setEditingTodo(todo);
        setTodoCategoryToAdd(todo.categoryId);
        setIsTodoModalOpen(true);
    };

    const closeTodoModal = () => {
        setIsTodoModalOpen(false);
        setEditingTodo(null);
    };

    const handleSaveTodo = (todo: TodoItem) => {
        setTodos(prev => {
            const exists = prev.find(t => t.id === todo.id);
            if (exists) {
                return prev.map(t => t.id === todo.id ? todo : t);
            }
            return [todo, ...prev];
        });
        updateDataLastModified();
    };

    const handleDeleteTodo = (id: string) => {
        const linkedLogs = logs.filter(l => l.linkedTodoId === id);
        if (linkedLogs.length > 0) {
            setTodoToDeleteId(id);
            setIsDeleteTodoConfirmOpen(true);
            return;
        }

        setTodos(prev => prev.filter(t => t.id !== id));
        closeTodoModal();
    };

    const handleConfirmDeleteTodo = () => {
        if (!todoToDeleteId) return;

        setLogs(prev => prev.map(l =>
            l.linkedTodoId === todoToDeleteId
                ? { ...l, linkedTodoId: undefined }
                : l
        ));

        setTodos(prev => prev.filter(t => t.id !== todoToDeleteId));

        setTodoToDeleteId(null);
        setIsDeleteTodoConfirmOpen(false);
        closeTodoModal();
        updateDataLastModified();
        addToast('success', 'Task deleted (history preserved)');
    };

    const handleUpdateTodoData = (newCategories: TodoCategory[], newTodos: TodoItem[]) => {
        setTodoCategories(newCategories);
        setTodos(newTodos);
        setIsTodoManaging(false);
        updateDataLastModified();
    };

    const handleDuplicateTodo = (todo: TodoItem) => {
        const newTodo: TodoItem = {
            ...todo,
            id: crypto.randomUUID(),
            title: `${todo.title} 副本`,
            isCompleted: false,
            completedUnits: 0,
        };
        setTodos(prev => [newTodo, ...prev]);
        updateDataLastModified();
        addToast('success', 'Task duplicated');
    };

    const handleBatchAddTodos = (newTodosData: Partial<TodoItem>[]) => {
        const newTodos: TodoItem[] = newTodosData.map(data => ({
            id: crypto.randomUUID(),
            categoryId: data.categoryId || todoCategories[0].id,
            title: data.title || 'New Task',
            isCompleted: false,
            completedUnits: 0,
            linkedActivityId: data.linkedActivityId,
            linkedCategoryId: data.linkedCategoryId,
            defaultScopeIds: data.defaultScopeIds,
            isProgress: false,
            ...data
        } as TodoItem));

        setTodos(prev => [...newTodos, ...prev]);
        updateDataLastModified();
        addToast('success', `${newTodos.length} tasks added`);
    };

    const updateTodoProgress = (id: string, progressIncrement: number) => {
        setTodos(prev => prev.map(t => {
            if (t.id === id) {
                return {
                    ...t,
                    completedUnits: Math.max(0, (t.completedUnits || 0) + progressIncrement)
                };
            }
            return t;
        }));
    };

    return {
        handleToggleTodo,
        handleStartTodoFocus,
        openAddTodoModal,
        openEditTodoModal,
        closeTodoModal,
        handleSaveTodo,
        handleDeleteTodo,
        handleConfirmDeleteTodo,
        handleUpdateTodoData,
        handleDuplicateTodo,
        handleBatchAddTodos,
        updateTodoProgress,
        isDeleteTodoConfirmOpen,
        setIsDeleteTodoConfirmOpen,
        todoToDeleteId
    };
};
