/**
 * @file useTodoManager.ts
 * @input DataContext (todos, setTodos, todoCategories, setTodoCategories, logs, setLogs), NavigationContext (modal states), CategoryScopeContext (categories), ToastContext (addToast), SessionContext (startActivity), SettingsContext (autoLinkRules)
 * @output Todo CRUD Operations (handleSaveTodo, handleDeleteTodo, handleToggleTodo, handleDuplicateTodo, handleBatchAddTodos), Modal Control (openAddTodoModal, openEditTodoModal, closeTodoModal), Focus Management (handleStartTodoFocus), Progress Update (updateTodoProgress)
 * @pos Hook (Data Manager)
 * @description Todo data manager hook for CRUD, focus launch, child-task inheritance sync, cascade delete behavior, nested detail-page return state, and lightweight schedule-field normalization.
 * @updated 2026-06-06: Moved duplicate shaping into shared utilities and now clears duplicated todo cover images by default.
 * @updated 2026-06-06: Clears duplicated todo cover images by default so quick-copy tasks start without inheriting the original cover asset.
 * @updated 2026-05-14: Normalizes `maybeDates` and recurrence `skipDates` on save/duplicate/batch-add so tentative future dates stay deduplicated and stale past `maybe` entries do not accumulate in persisted todo data.
 * @updated 2026-05-13: Blocked focus starts and subtask creation for quick reminder todos so lightweight memo items stay reminder-only even if they reach shared manager paths.
 * @updated 2026-05-12: Prefer live todo records when opening detail pages so auto-save comparisons do not loop on stale snapshots.
 * @updated 2026-05-12: Added todo-detail history stacking so opening a child task from a parent detail page returns back to the parent detail instead of closing to the root todo view.
 * @updated 2026-05-11: Added an idempotent complete-only helper so focus-log flows can save first and then finish the linked todo without reopening already completed tasks.
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
import { pushTodoDetailHistory } from '../utils/todoDetailNavigation';
import { isQuickTodo } from '../utils/todoKindUtils';
import { getRealTodoCategories } from '../utils/todoQuickCategoryUtils';
import { buildDuplicatedTodo, normalizeTodoScheduleFields } from '../utils/todoDuplicateUtils';

export const useTodoManager = () => {
  const { todos, setTodos, todoCategories, setTodoCategories, logs, setLogs } = useData();
  const { categories } = useCategoryScope();
  const {
    isTodoModalOpen,
    setIsTodoModalOpen,
    editingTodo,
    setEditingTodo,
    todoCategoryToAdd,
    setTodoCategoryToAdd,
    setNewTodoDraft,
    setIsTodoManaging,
    setTodoDetailHistory,
    closeTodoDetail
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

  const handleCompleteTodo = (id: string) => {
    const targetTodo = todos.find((todo) => todo.id === id);
    if (!targetTodo) {
      return false;
    }

    if (targetTodo.isCompleted) {
      return true;
    }

    const completedAt = new Date().toISOString();
    setTodos((prev) => syncSubtaskProgressToParentTodos(prev.map((todo) => (
      todo.id === id
        ? {
            ...todo,
            isCompleted: true,
            completedAt: todo.completedAt || completedAt
          }
        : todo
    ))));
    return true;
  };

  const handleStartTodoFocus = (todo: TodoItem) => {
    if (isQuickTodo(todo)) {
      addToast('info', '小事仅用于备忘与排期，不支持计时。');
      return;
    }

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
    setTodoDetailHistory([]);
    setEditingTodo(null);
    setTodoCategoryToAdd(categoryId);
    setNewTodoDraft(draft ?? null);
    setIsTodoModalOpen(true);
  };

  const openAddSubtaskModal = (parentTodo: TodoItem) => {
    if (isQuickTodo(parentTodo)) {
      addToast('info', '小事不支持子任务。');
      return;
    }

    if (parentTodo.recurrenceRule) {
      addToast('info', '循环任务不能添加子任务');
      return;
    }

    openAddTodoModal(parentTodo.categoryId, buildSubtaskDraft(parentTodo));
  };

  const openEditTodoModal = (todo: TodoItem) => {
    const liveTodo = todos.find((item) => item.id === todo.id) || todo;

    setTodoDetailHistory((previousHistory) => {
      if (!isTodoModalOpen || !editingTodo) {
        return [];
      }

      const currentLiveTodo = todos.find((item) => item.id === editingTodo.id) || editingTodo;
      return pushTodoDetailHistory(previousHistory, currentLiveTodo, liveTodo);
    });
    setEditingTodo(liveTodo);
    setTodoCategoryToAdd(liveTodo.categoryId);
    setNewTodoDraft(null);
    setIsTodoModalOpen(true);
  };

  const closeTodoModal = () => {
    closeTodoDetail();
  };

  const handleSaveTodo = (todo: TodoItem) => {
    setTodos((prev) => {
      const normalizedTodo = normalizeTodoHierarchy(normalizeTodoScheduleFields(todo), prev);
      const exists = prev.find((item) => item.id === normalizedTodo.id);
      let nextTodos = exists
        ? prev.map((item) => item.id === normalizedTodo.id ? normalizedTodo : item)
        : [normalizedTodo, ...prev];

      if (!normalizedTodo.parentTodoId) {
        nextTodos = syncDirectChildTodosWithParent(nextTodos, normalizedTodo);
      }

      return syncSubtaskProgressToParentTodos(nextTodos);
    });

    if (editingTodo?.id === todo.id) {
      const normalizedTodo = normalizeTodoHierarchy(normalizeTodoScheduleFields(todo), todos);
      setEditingTodo(normalizedTodo);
      setTodoCategoryToAdd(normalizedTodo.categoryId);
    }
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
    const parentTodo = getParentTodo(todos, todo);

    const duplicatedTodo: TodoItem = buildDuplicatedTodo(todo, {
      ...options,
      childOrder: todo.parentTodoId ? getNextChildOrder(todos, todo.parentTodoId) : undefined
    });

    const normalizedTodo = parentTodo
      ? applyParentTodoInheritance(duplicatedTodo, parentTodo)
      : normalizeTodoHierarchy(duplicatedTodo, todos);

    setTodos((prev) => syncSubtaskProgressToParentTodos([normalizedTodo, ...prev]));
    addToast('success', 'Task duplicated');
  };

  const handleBatchAddTodos = (newTodosData: Partial<TodoItem>[]) => {
    const realTodoCategories = getRealTodoCategories(todoCategories);
    const newTodos: TodoItem[] = newTodosData.map((data) => {
      const baseTodo: TodoItem = normalizeTodoScheduleFields({
        id: crypto.randomUUID(),
        categoryId: data.categoryId || realTodoCategories[0]?.id || todoCategories[0].id,
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
      } as TodoItem);

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
    handleCompleteTodo,
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
