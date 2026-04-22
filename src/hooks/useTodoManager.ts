/**
 * @file useTodoManager.ts
 * @input DataContext (todos, setTodos, todoCategories, setTodoCategories, logs, setLogs), NavigationContext (modal states), CategoryScopeContext (categories), ToastContext (addToast), SessionContext (startActivity), SettingsContext (autoLinkRules)
 * @output Todo CRUD Operations (handleSaveTodo, handleDeleteTodo, handleToggleTodo, handleDuplicateTodo, handleBatchAddTodos), Modal Control (openAddTodoModal, openEditTodoModal, closeTodoModal), Focus Management (handleStartTodoFocus), Progress Update (updateTodoProgress)
 * @pos Hook (Data Manager)
 * @description Todo data manager hook for CRUD, focus launch, child-task inheritance sync, and cascade delete behavior.
 * @updated 2026-04-21: Blocked subtask creation for recurring parent todos so recurrence and child-task management stay mutually exclusive.
 * @updated 2026-04-21: Added one-level subtask support with inherited parent fields, cascade delete, and child draft helpers.
 * @updated 2026-04-21: Reset duplicated and newly created todos to `pin: false` unless explicitly toggled later.
 * @updated 2026-04-20: Added configurable duplicate-copy cleanup for dates, tags, and scopes.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */
import { useState } from 'react';
import { TodoCategory, TodoDuplicateOptions, TodoItem } from '../types';
import { useData } from '../contexts/DataContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useToast } from '../contexts/ToastContext';
import { useSession } from '../contexts/SessionContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  applyParentTodoInheritance,
  getNextChildOrder,
  getParentTodo,
  getTodoCascadeDeleteIds,
  normalizeTodoHierarchy,
  syncDirectChildTodosWithParent
} from '../utils/todoHierarchyUtils';
import { getTodoProgressTrackingMode, syncSubtaskProgressToParentTodos } from '../utils/todoProgressUtils';

export const useTodoManager = () => {
  const { todos, setTodos, todoCategories, setTodoCategories, logs, setLogs } = useData();
  const { categories } = useCategoryScope();
  const {
    setIsTodoModalOpen,
    setEditingTodo,
    todoCategoryToAdd,
    setTodoCategoryToAdd,
    setNewTodoDraft,
    setIsTodoManaging
  } = useNavigation();
  const { addToast } = useToast();
  const { startActivity } = useSession();
  const { autoLinkRules } = useSettings();

  const [isDeleteTodoConfirmOpen, setIsDeleteTodoConfirmOpen] = useState(false);
  const [todoToDeleteId, setTodoToDeleteId] = useState<string | null>(null);
  const [todoDeleteTargetIds, setTodoDeleteTargetIds] = useState<string[]>([]);
  const [todoDeleteChildCount, setTodoDeleteChildCount] = useState(0);

  const buildSubtaskDraft = (parentTodo: TodoItem): Partial<TodoItem> => ({
    parentTodoId: parentTodo.id,
    childOrder: getNextChildOrder(todos, parentTodo.id),
    categoryId: parentTodo.categoryId,
    linkedCategoryId: parentTodo.linkedCategoryId,
    linkedActivityId: parentTodo.linkedActivityId,
    defaultScopeIds: parentTodo.defaultScopeIds ? [...parentTodo.defaultScopeIds] : undefined,
    recurrenceRule: undefined
  });

  const handleToggleTodo = (id: string) => {
    setTodos((prev) => syncSubtaskProgressToParentTodos(prev.map((todo) => {
      if (todo.id !== id) {
        return todo;
      }

      const isCompleted = !todo.isCompleted;
      return {
        ...todo,
        isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : undefined
      };
    })));
  };

  const handleStartTodoFocus = (todo: TodoItem) => {
    if (todo.linkedCategoryId && todo.linkedActivityId) {
      const category = categories.find((item) => item.id === todo.linkedCategoryId);
      const activity = category?.activities.find((item) => item.id === todo.linkedActivityId);

      if (category && activity) {
        startActivity(activity, category.id, autoLinkRules, todo.id, todo.defaultScopeIds);
        return;
      }
    }

    addToast('info', 'Please link this task to an activity (Category > Activity) to track statistics.');
    openEditTodoModal(todo);
  };

  const openAddTodoModal = (categoryId: string, draft?: Partial<TodoItem>) => {
    setEditingTodo(null);
    setTodoCategoryToAdd(categoryId);
    setNewTodoDraft(draft ?? null);
    setIsTodoModalOpen(true);
  };

  const openAddSubtaskModal = (parentTodo: TodoItem) => {
    if (parentTodo.recurrenceRule) {
      addToast('info', '循环任务不能添加子任务');
      return;
    }

    openAddTodoModal(parentTodo.categoryId, buildSubtaskDraft(parentTodo));
  };

  const openEditTodoModal = (todo: TodoItem) => {
    setEditingTodo(todo);
    setTodoCategoryToAdd(todo.categoryId);
    setNewTodoDraft(null);
    setIsTodoModalOpen(true);
  };

  const closeTodoModal = () => {
    setIsTodoModalOpen(false);
    setEditingTodo(null);
    setNewTodoDraft(null);
  };

  const handleSaveTodo = (todo: TodoItem) => {
    setTodos((prev) => {
      const normalizedTodo = normalizeTodoHierarchy(todo, prev);
      const exists = prev.find((item) => item.id === normalizedTodo.id);
      let nextTodos = exists
        ? prev.map((item) => item.id === normalizedTodo.id ? normalizedTodo : item)
        : [normalizedTodo, ...prev];

      if (!normalizedTodo.parentTodoId) {
        nextTodos = syncDirectChildTodosWithParent(nextTodos, normalizedTodo);
      }

      return syncSubtaskProgressToParentTodos(nextTodos);
    });
  };

  const handleDeleteTodo = (id: string) => {
    const deleteTargetIds = getTodoCascadeDeleteIds(todos, id);
    const linkedLogs = logs.filter((log) => log.linkedTodoId && deleteTargetIds.includes(log.linkedTodoId));

    if (linkedLogs.length > 0) {
      setTodoToDeleteId(id);
      setTodoDeleteTargetIds(deleteTargetIds);
      setTodoDeleteChildCount(Math.max(0, deleteTargetIds.length - 1));
      setIsDeleteTodoConfirmOpen(true);
      return;
    }

    setTodos((prev) => syncSubtaskProgressToParentTodos(prev.filter((todo) => !deleteTargetIds.includes(todo.id))));
    closeTodoModal();
  };

  const handleConfirmDeleteTodo = () => {
    if (!todoToDeleteId) {
      return;
    }

    const deleteTargetIds = todoDeleteTargetIds.length > 0 ? todoDeleteTargetIds : [todoToDeleteId];

    setLogs((prev) => prev.map((log) => (
      log.linkedTodoId && deleteTargetIds.includes(log.linkedTodoId)
        ? { ...log, linkedTodoId: undefined }
        : log
    )));

    setTodos((prev) => syncSubtaskProgressToParentTodos(prev.filter((todo) => !deleteTargetIds.includes(todo.id))));

    const deletedChildCount = todoDeleteChildCount;
    setTodoToDeleteId(null);
    setTodoDeleteTargetIds([]);
    setTodoDeleteChildCount(0);
    setIsDeleteTodoConfirmOpen(false);
    closeTodoModal();
    addToast(
      'success',
      deletedChildCount > 0
        ? `Task and ${deletedChildCount} subtasks deleted (history preserved)`
        : 'Task deleted (history preserved)'
    );
  };

  const handleUpdateTodoData = (newCategories: TodoCategory[], newTodos: TodoItem[]) => {
    setTodoCategories(newCategories);
    setTodos(newTodos);
    setIsTodoManaging(false);
  };

  const handleDuplicateTodo = (todo: TodoItem, options?: TodoDuplicateOptions) => {
    const title = options?.title?.trim() || `${todo.title} 鍓湰`;
    const clearDates = options?.clearDates ?? true;
    const clearTags = options?.clearTags ?? false;
    const clearScopes = options?.clearScopes ?? false;
    const parentTodo = getParentTodo(todos, todo);

    const duplicatedTodo: TodoItem = {
      ...todo,
      id: crypto.randomUUID(),
      title,
      isCompleted: false,
      pin: false,
      completedAt: undefined,
      completedUnits: 0,
      parentTodoId: todo.parentTodoId,
      childOrder: todo.parentTodoId ? getNextChildOrder(todos, todo.parentTodoId) : undefined,
      scheduledDate: clearDates ? undefined : todo.scheduledDate,
      deadlineDate: clearDates ? undefined : todo.deadlineDate,
      recurrenceRule: clearDates || todo.parentTodoId ? undefined : todo.recurrenceRule,
      linkedActivityId: clearTags ? undefined : todo.linkedActivityId,
      linkedCategoryId: clearTags ? undefined : todo.linkedCategoryId,
      defaultScopeIds: clearScopes ? undefined : todo.defaultScopeIds
    };

    const normalizedTodo = parentTodo
      ? applyParentTodoInheritance(duplicatedTodo, parentTodo)
      : normalizeTodoHierarchy(duplicatedTodo, todos);

    setTodos((prev) => syncSubtaskProgressToParentTodos([normalizedTodo, ...prev]));
    addToast('success', 'Task duplicated');
  };

  const handleBatchAddTodos = (newTodosData: Partial<TodoItem>[]) => {
    const newTodos: TodoItem[] = newTodosData.map((data) => {
      const baseTodo: TodoItem = {
        id: crypto.randomUUID(),
        categoryId: data.categoryId || todoCategories[0].id,
        title: data.title || 'New Task',
        isCompleted: false,
        pin: false,
        completedUnits: 0,
        linkedActivityId: data.linkedActivityId,
        linkedCategoryId: data.linkedCategoryId,
        defaultScopeIds: data.defaultScopeIds,
        isProgress: false,
        progressTrackingMode: 'none',
        ...data
      } as TodoItem;

      return normalizeTodoHierarchy(baseTodo, todos);
    });

    setTodos((prev) => syncSubtaskProgressToParentTodos([...newTodos, ...prev]));
    addToast('success', `${newTodos.length} tasks added`);
  };

  const updateTodoProgress = (id: string, progressIncrement: number) => {
    setTodos((prev) => syncSubtaskProgressToParentTodos(prev.map((todo) => {
      if (todo.id !== id) {
        return todo;
      }

      if (getTodoProgressTrackingMode(todo, prev) !== 'manual') {
        return todo;
      }

      return {
        ...todo,
        isProgress: true,
        progressTrackingMode: 'manual',
        completedUnits: Math.max(0, (todo.completedUnits || 0) + progressIncrement)
      };
    })));
  };

  return {
    handleToggleTodo,
    handleStartTodoFocus,
    openAddTodoModal,
    openAddSubtaskModal,
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
    todoToDeleteId,
    todoDeleteChildCount,
    todoCategoryToAdd
  };
};
