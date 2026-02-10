/**
 * @file ModalManager.tsx
 * @input modal states, handlers, data
 * @output Unified Modal Management
 * @pos Component (Manager)
 * @description 统一管理所有应用模态框 - 避免 Props drilling，集中管理 Modal 状态
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React from 'react';
import { AddLogModal } from './AddLogModal';
import { TodoDetailModal } from './TodoDetailModal';
import { GoalEditor } from './GoalEditor';
import { TimerFloating } from './TimerFloating';
import { FocusDetailView } from '../views/FocusDetailView';
import {
    Log,
    TodoItem,
    TodoCategory,
    Category,
    Goal,
    AutoLinkRule,
    ActiveSession
} from '../types';

interface ModalManagerProps {
    // AddLogModal
    isAddModalOpen: boolean;
    editingLog: Log | null;
    initialLogTimes?: { start?: number; end?: number };
    onCloseAddLog: () => void;
    onSaveLog: (log: Log) => void;
    onDeleteLog: (id: string) => void;
    onImageRemove?: (logId: string, filename: string) => void;
    lastLogEndTime?: number;

    // TodoDetailModal
    isTodoModalOpen: boolean;
    isSettingsOpen: boolean;
    editingTodo: TodoItem | null;
    todoCategoryToAdd: string;
    todoCategories: TodoCategory[];
    onCloseTodo: () => void;
    onSaveTodo: (todo: TodoItem) => void;
    onDeleteTodo: (id: string) => void;
    onEditLog: (log: Log) => void;

    // GoalEditor
    isGoalEditorOpen: boolean;
    editingGoal: Goal | null;
    goalScopeId: string;
    onSaveGoal: (goal: Goal) => void;
    onCloseGoal: () => void;

    // TimerFloating
    activeSessions: ActiveSession[];
    focusDetailSessionId: string | null;
    onStopActivity: (id: string) => void;
    onCancelSession: (id: string) => void;
    onClickSession: (session: ActiveSession) => void;

    // FocusDetailView
    onUpdateSession: (session: ActiveSession) => void;
    onCloseFocusDetail: () => void;

    // Common
    categories: Category[];
    scopes: any[];
    autoLinkRules: AutoLinkRule[];
    logs: Log[];
    todos: TodoItem[];
    autoFocusNote?: boolean;
}

export const ModalManager: React.FC<ModalManagerProps> = ({
    isAddModalOpen,
    editingLog,
    initialLogTimes,
    onCloseAddLog,
    onSaveLog,
    onDeleteLog,
    onImageRemove,
    lastLogEndTime,

    isTodoModalOpen,
    isSettingsOpen,
    editingTodo,
    todoCategoryToAdd,
    todoCategories,
    onCloseTodo,
    onSaveTodo,
    onDeleteTodo,
    onEditLog,

    isGoalEditorOpen,
    editingGoal,
    goalScopeId,
    onSaveGoal,
    onCloseGoal,

    activeSessions,
    focusDetailSessionId,
    onStopActivity,
    onCancelSession,
    onClickSession,
    onUpdateSession,
    onCloseFocusDetail,

    categories,
    scopes,
    autoLinkRules,
    logs,
    todos,
    autoFocusNote = true
}) => {
    return (
        <>
            {/* Focus Detail View */}
            {focusDetailSessionId && (
                <FocusDetailView
                    session={activeSessions.find(s => s.id === focusDetailSessionId)!}
                    todos={todos}
                    categories={categories}
                    todoCategories={todoCategories}
                    scopes={scopes}
                    autoLinkRules={autoLinkRules}
                    onClose={onCloseFocusDetail}
                    onComplete={(s) => onStopActivity(s.id)}
                    onUpdate={onUpdateSession}
                    autoFocusNote={autoFocusNote}
                />
            )}

            {/* Active Timer Overlay */}
            {activeSessions.length > 0 && !isSettingsOpen && !focusDetailSessionId && (
                <TimerFloating
                    sessions={activeSessions}
                    todos={todos}
                    onStop={onStopActivity}
                    onCancel={onCancelSession}
                    onClick={onClickSession}
                />
            )}

            {/* Manual Add/Edit Log Modal */}
            {isAddModalOpen && (
                <AddLogModal
                    initialLog={editingLog}
                    initialStartTime={initialLogTimes?.start}
                    initialEndTime={initialLogTimes?.end}
                    onClose={onCloseAddLog}
                    onSave={onSaveLog}
                    onDelete={onDeleteLog}
                    onImageRemove={onImageRemove}
                    categories={categories}
                    todos={todos}
                    todoCategories={todoCategories}
                    scopes={scopes}
                    autoLinkRules={autoLinkRules}
                    lastLogEndTime={lastLogEndTime}
                    autoFocusNote={autoFocusNote}
                    allLogs={logs}
                />
            )}

            {/* Todo Add/Edit Modal */}
            {isTodoModalOpen && !isSettingsOpen && (
                <TodoDetailModal
                    initialTodo={editingTodo}
                    currentCategory={todoCategories.find(c => c.id === todoCategoryToAdd)!}
                    onClose={onCloseTodo}
                    onSave={onSaveTodo}
                    onDelete={onDeleteTodo}
                    logs={logs}
                    onLogUpdate={onSaveLog}
                    onEditLog={onEditLog}
                    todoCategories={todoCategories}
                    categories={categories}
                    scopes={scopes}
                />
            )}

            {/* Goal Editor Modal */}
            {isGoalEditorOpen && (
                <GoalEditor
                    goal={editingGoal || undefined}
                    scopeId={goalScopeId}
                    categories={categories}
                    todoCategories={todoCategories}
                    onSave={onSaveGoal}
                    onClose={onCloseGoal}
                />
            )}
        </>
    );
};
