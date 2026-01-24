/**
 * @file BatchFocusRecordManageView.tsx
 * @input Logs, Categories, Scopes, Todos
 * @output Batch operations on focus records
 * @pos View (Batch Management)
 * @description Batch management interface for focus records. Allows filtering, selecting, and performing batch operations on time logs.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Log, Category, Scope, TodoItem, TodoCategory } from '../types';
import { ToastType } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { CustomSelect } from '../components/CustomSelect';
import { parseFilterExpression, matchesFilter, FilterContext } from '../utils/filterUtils';

interface BatchFocusRecordManageViewProps {
    onBack: () => void;
    logs: Log[];
    onUpdateLogs: (logs: Log[]) => void;
    categories: Category[];
    scopes: Scope[];
    todos: TodoItem[];
    todoCategories: TodoCategory[];
    onToast: (type: ToastType, message: string) => void;
}

// Operation types for batch operations
type OperationType = 'add_scope' | 'remove_scope' | 'replace_scope' | 'link_todo' | 'unlink_todo' | 'change_activity';

// Operation parameters
interface OperationParams {
    scopeIds?: string[];
    sourceScopeId?: string;
    targetScopeId?: string;
    todoId?: string;
    activityId?: string;
    categoryId?: string;
}

/**
 * Parse 8-digit date string (YYYYMMDD) to Date object
 * @param dateStr - 8-digit date string like "20240115"
 * @returns Date object or null if invalid
 */
function parseDate8Digit(dateStr: string): Date | null {
    if (!dateStr || dateStr.length !== 8) return null;

    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10);
    const day = parseInt(dateStr.substring(6, 8), 10);

    // Validate date components
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    const date = new Date(year, month - 1, day);

    // Check if date is valid (handles invalid dates like Feb 30)
    if (date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day) {
        return null;
    }

    return date;
}

/**
 * Filter logs by time range
 * @param logs - Array of logs to filter
 * @param startDate - Start date in YYYYMMDD format (inclusive), empty means from first log
 * @param endDate - End date in YYYYMMDD format (inclusive), empty means to last log
 * @returns Filtered array of logs
 */
function filterByTimeRange(
    logs: Log[],
    startDate: string,
    endDate: string
): Log[] {
    // If no dates specified, return all logs
    if (!startDate && !endDate) {
        return logs;
    }

    // Parse dates
    const startDateObj = startDate ? parseDate8Digit(startDate) : null;
    const endDateObj = endDate ? parseDate8Digit(endDate) : null;

    // Calculate timestamp boundaries
    const startTimestamp = startDateObj
        ? startDateObj.setHours(0, 0, 0, 0)
        : -Infinity;
    const endTimestamp = endDateObj
        ? endDateObj.setHours(23, 59, 59, 999)
        : Infinity;

    // Filter logs within the time range
    return logs.filter(log =>
        log.startTime >= startTimestamp && log.startTime <= endTimestamp
    );
}

/**
 * Get filtered logs combining time range and filter expression (Task 8.2)
 * @param logs - Array of all logs
 * @param startDate - Start date in YYYYMMDD format (inclusive), empty means from first log
 * @param endDate - End date in YYYYMMDD format (inclusive), empty means to last log
 * @param filterExpression - Filter expression string
 * @param context - Filter context with categories, scopes, todos, etc.
 * @returns Filtered array of logs
 */
function getCombinedFilteredLogs(
    logs: Log[],
    startDate: string,
    endDate: string,
    filterExpression: string,
    context: FilterContext
): Log[] {
    // 1. First apply time range filtering
    let filtered = filterByTimeRange(logs, startDate, endDate);

    // 2. If there's a filter expression, apply filterUtils logic
    if (filterExpression.trim()) {
        const condition = parseFilterExpression(filterExpression);
        filtered = filtered.filter(log =>
            matchesFilter(log, condition, context)
        );
    }

    return filtered;
}

/**
 * Add scopes to selected logs (Task 6.3)
 * Avoids duplicate scope IDs
 * @param logs - Array of all logs
 * @param selectedIds - Set of selected log IDs
 * @param scopeIds - Array of scope IDs to add
 * @returns Updated array of logs
 */
function addScopeToLogs(
    logs: Log[],
    selectedIds: Set<string>,
    scopeIds: string[]
): Log[] {
    return logs.map(log => {
        // Skip unselected logs
        if (!selectedIds.has(log.id)) return log;

        // Get current scopes (or empty array if undefined)
        const currentScopes = log.scopeIds || [];

        // Add new scopes, avoiding duplicates using Set
        const newScopes = [...new Set([...currentScopes, ...scopeIds])];

        return { ...log, scopeIds: newScopes };
    });
}

/**
 * Remove scopes from selected logs (Task 9.1)
 * Skips logs that don't contain the specified scopes
 * @param logs - Array of all logs
 * @param selectedIds - Set of selected log IDs
 * @param scopeIds - Array of scope IDs to remove
 * @returns Updated array of logs
 */
function removeScopeFromLogs(
    logs: Log[],
    selectedIds: Set<string>,
    scopeIds: string[]
): Log[] {
    return logs.map(log => {
        // Skip unselected logs
        if (!selectedIds.has(log.id)) return log;

        // Get current scopes (or empty array if undefined)
        const currentScopes = log.scopeIds || [];

        // Remove specified scopes
        const newScopes = currentScopes.filter(id => !scopeIds.includes(id));

        return { ...log, scopeIds: newScopes };
    });
}

/**
 * Replace scope in selected logs (Task 9.3)
 * Skips logs that don't contain the source scope
 * Avoids duplicate target scope IDs
 * @param logs - Array of all logs
 * @param selectedIds - Set of selected log IDs
 * @param sourceScopeId - Source scope ID to replace
 * @param targetScopeId - Target scope ID to replace with
 * @returns Updated array of logs
 */
function replaceScopeInLogs(
    logs: Log[],
    selectedIds: Set<string>,
    sourceScopeId: string,
    targetScopeId: string
): Log[] {
    return logs.map(log => {
        // Skip unselected logs
        if (!selectedIds.has(log.id)) return log;

        // Get current scopes (or empty array if undefined)
        const currentScopes = log.scopeIds || [];

        // Skip if log doesn't contain source scope
        if (!currentScopes.includes(sourceScopeId)) return log;

        // Replace source scope with target scope
        const newScopes = currentScopes.map(id =>
            id === sourceScopeId ? targetScopeId : id
        );

        // Remove duplicates using Set
        const uniqueScopes = [...new Set(newScopes)];

        return { ...log, scopeIds: uniqueScopes };
    });
}

/**
 * Link todo to selected logs (Task 11.1)
 * Overwrites any existing todo links
 * @param logs - Array of all logs
 * @param selectedIds - Set of selected log IDs
 * @param todoId - Todo ID to link
 * @returns Updated array of logs
 */
function linkTodoToLogs(
    logs: Log[],
    selectedIds: Set<string>,
    todoId: string
): Log[] {
    return logs.map(log => {
        // Skip unselected logs
        if (!selectedIds.has(log.id)) return log;

        // Set the linkedTodoId (overwrites existing)
        return { ...log, linkedTodoId: todoId };
    });
}

/**
 * Unlink todo from selected logs (Task 11.3)
 * Sets linkedTodoId to undefined
 * @param logs - Array of all logs
 * @param selectedIds - Set of selected log IDs
 * @returns Updated array of logs
 */
function unlinkTodoFromLogs(
    logs: Log[],
    selectedIds: Set<string>
): Log[] {
    return logs.map(log => {
        // Skip unselected logs
        if (!selectedIds.has(log.id)) return log;

        // Remove the linkedTodoId
        return { ...log, linkedTodoId: undefined };
    });
}

/**
 * Change activity for selected logs
 * Updates both activityId and categoryId for selected logs
 * @param logs - Array of all logs
 * @param selectedIds - Set of selected log IDs
 * @param activityId - New activity ID
 * @param categoryId - New category ID (parent of the activity)
 * @returns Updated array of logs
 */
function changeActivityInLogs(
    logs: Log[],
    selectedIds: Set<string>,
    activityId: string,
    categoryId: string
): Log[] {
    return logs.map(log => {
        // Skip unselected logs
        if (!selectedIds.has(log.id)) return log;

        // Update both activityId and categoryId
        return {
            ...log,
            activityId: activityId,
            categoryId: categoryId
        };
    });
}

/**
 * Format timestamp to readable date and time string
 */
function formatDateTime(timestamp: number): string {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
}

/**
 * Format duration in seconds to readable string
 */
function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

/**
 * RecordItem component - displays a single log record with selection checkbox
 */
interface RecordItemProps {
    log: Log;
    categories: Category[];
    scopes: Scope[];
    todos: TodoItem[];
    isSelected: boolean;
    onToggle: () => void;
}

const RecordItem: React.FC<RecordItemProps> = ({
    log,
    categories,
    scopes,
    todos,
    isSelected,
    onToggle
}) => {
    // Find category and activity
    const category = categories.find(c => c.id === log.categoryId);
    const activity = category?.activities.find(a => a.id === log.activityId);

    // Find linked scopes
    const linkedScopes = log.scopeIds
        ?.map(scopeId => scopes.find(s => s.id === scopeId))
        .filter((s): s is Scope => s !== undefined) || [];

    // Find linked todo
    const linkedTodo = log.linkedTodoId
        ? todos.find(t => t.id === log.linkedTodoId)
        : undefined;

    return (
        <div
            className={`rounded-xl p-4 space-y-3 transition-all cursor-pointer ${isSelected
                ? 'bg-stone-50/50 border-2 border-stone-300 shadow-sm'
                : 'bg-stone-50/10 hover:bg-stone-50/30'
                }`}
            onClick={onToggle}
        >
            {/* Time and Duration */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-stone-600">
                    <span>{formatDateTime(log.startTime)}</span>
                    <span className="text-stone-400">→</span>
                    <span>{formatDateTime(log.endTime)}</span>
                </div>
                <span className="text-sm font-medium text-stone-700">
                    {formatDuration(log.duration)}
                </span>
            </div>

            {/* Activity and Category - Combined with # */}
            <div className="flex items-center gap-2">
                <span className="text-lg">{activity?.icon || '📝'}</span>
                <span className="text-sm font-medium text-stone-800">
                    {activity?.name || '未知活动'}
                </span>
            </div>

            {/* Tags Row: Category (#), Scopes (%), Todo (@) - All in one line */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Category Tag */}
                {category && (
                    <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                        <span className="font-bold" style={{ color: category.themeColor || '#a8a29e' }}>#</span>
                        <span>{category.icon}</span>
                        <span className="flex items-center">
                            <span>{category.name}</span>
                            <span className="text-stone-400 mx-1">/</span>
                            <span>{activity?.name || '未知活动'}</span>
                        </span>
                    </span>
                )}

                {/* Scopes */}
                {linkedScopes.map(scope => (
                    <span
                        key={scope.id}
                        className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30"
                    >
                        <span className="text-stone-400 font-bold">%</span>
                        <span>{scope.icon}</span>
                        <span>{scope.name}</span>
                    </span>
                ))}

                {/* Todo */}
                {linkedTodo && (
                    <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                        <span className="text-stone-400 font-bold">@</span>
                        <span className="line-clamp-1">{linkedTodo.title}</span>
                    </span>
                )}
            </div>

            {/* Note - Direct on background without border */}
            {log.note && (
                <div className="text-xs text-stone-500 line-clamp-2">
                    {log.note}
                </div>
            )}

            {/* Focus Score */}
            {log.focusScore !== undefined && (
                <div className="flex items-center gap-1 text-xs text-stone-500">
                    <span>⭐</span>
                    <span>专注度: {log.focusScore}/5</span>
                </div>
            )}
        </div>
    );
};

/**
 * RecordListHeader component - displays selection controls
 */
interface RecordListHeaderProps {
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onDeselectAll: () => void;
}

const RecordListHeader: React.FC<RecordListHeaderProps> = ({
    selectedCount,
    totalCount,
    onSelectAll,
    onDeselectAll
}) => {
    const allSelected = selectedCount === totalCount && totalCount > 0;

    return (
        <div className="flex items-center justify-between mb-2 pb-3 border-b border-stone-100">
            <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-stone-800">
                    记录列表
                </h3>
                <span className="text-sm text-stone-500">
                    已选 <span className="font-semibold text-stone-700">{selectedCount}</span> / {totalCount} 条
                </span>
            </div>

            <div className="flex items-center gap-2">
                {allSelected ? (
                    <button
                        onClick={onDeselectAll}
                        className="text-xs px-3 py-1.5 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                    >
                        取消全选
                    </button>
                ) : (
                    <button
                        onClick={onSelectAll}
                        className="text-xs px-3 py-1.5 rounded-lg bg-stone-600 text-white hover:bg-stone-700 transition-colors"
                    >
                        全选
                    </button>
                )}
            </div>
        </div>
    );
};

/**
 * RecordListSection component - displays the list of filtered records
 */
interface RecordListSectionProps {
    logs: Log[];
    categories: Category[];
    scopes: Scope[];
    todos: TodoItem[];
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
}

const RecordListSection: React.FC<RecordListSectionProps> = ({
    logs,
    categories,
    scopes,
    todos,
    selectedIds,
    onToggleSelect,
    onSelectAll,
    onDeselectAll
}) => {
    // Empty state
    if (logs.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-center py-8">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-sm text-stone-500">
                        没有找到匹配的记录
                    </p>
                    <p className="text-xs text-stone-400 mt-1">
                        请调整筛选条件
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <RecordListHeader
                selectedCount={selectedIds.size}
                totalCount={logs.length}
                onSelectAll={onSelectAll}
                onDeselectAll={onDeselectAll}
            />

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {logs.map(log => (
                    <RecordItem
                        key={log.id}
                        log={log}
                        categories={categories}
                        scopes={scopes}
                        todos={todos}
                        isSelected={selectedIds.has(log.id)}
                        onToggle={() => onToggleSelect(log.id)}
                    />
                ))}
            </div>
        </div>
    );
};

/**
 * ScopeSelector component - multi-select scope picker
 */
interface ScopeSelectorProps {
    scopes: Scope[];
    selectedScopeIds: string[];
    onChange: (scopeIds: string[]) => void;
}

const ScopeSelector: React.FC<ScopeSelectorProps> = ({
    scopes,
    selectedScopeIds,
    onChange
}) => {
    const handleToggleScope = (scopeId: string) => {
        if (selectedScopeIds.includes(scopeId)) {
            onChange(selectedScopeIds.filter(id => id !== scopeId));
        } else {
            onChange([...selectedScopeIds, scopeId]);
        }
    };

    // Filter out archived scopes and sort by order
    const activeScopes = scopes
        .filter(scope => !scope.isArchived)
        .sort((a, b) => a.order - b.order);

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-stone-700">
                选择领域 (可多选)
            </label>

            {activeScopes.length === 0 ? (
                <div className="text-sm text-stone-400 py-4 text-center">
                    暂无可用领域
                </div>
            ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {activeScopes.map(scope => {
                        const isSelected = selectedScopeIds.includes(scope.id);
                        return (
                            <div
                                key={scope.id}
                                onClick={() => handleToggleScope(scope.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${isSelected
                                    ? 'border-2 border-stone-300 bg-stone-50/50'
                                    : 'bg-stone-50/10 hover:bg-stone-50/30'
                                    }`}
                            >
                                <span className="text-lg">{scope.icon}</span>
                                <span className="text-sm font-medium text-stone-700 flex-1">
                                    {scope.name}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedScopeIds.length > 0 && (
                <p className="text-xs text-stone-500">
                    已选择 {selectedScopeIds.length} 个领域
                </p>
            )}
        </div>
    );
};

/**
 * ScopeReplaceSelector component - single-select scope picker for source and target
 */
interface ScopeReplaceSelectorProps {
    scopes: Scope[];
    sourceScopeId: string | undefined;
    targetScopeId: string | undefined;
    onSourceChange: (scopeId: string | undefined) => void;
    onTargetChange: (scopeId: string | undefined) => void;
}

const ScopeReplaceSelector: React.FC<ScopeReplaceSelectorProps> = ({
    scopes,
    sourceScopeId,
    targetScopeId,
    onSourceChange,
    onTargetChange
}) => {
    // Filter out archived scopes and sort by order
    const activeScopes = scopes
        .filter(scope => !scope.isArchived)
        .sort((a, b) => a.order - b.order);

    // Create options for CustomSelect
    const sourceOptions = activeScopes.map(scope => ({
        value: scope.id,
        label: scope.name,
        icon: <span>{scope.icon}</span>
    }));

    const targetOptions = activeScopes
        .filter(scope => scope.id !== sourceScopeId) // Exclude source scope from target options
        .map(scope => ({
            value: scope.id,
            label: scope.name,
            icon: <span>{scope.icon}</span>
        }));

    return (
        <div className="space-y-4">
            <label className="block text-sm font-medium text-stone-700">
                替换领域设置
            </label>

            {/* Source Scope Selection */}
            <div className="space-y-2">
                <CustomSelect
                    label="源领域 (要被替换的领域)"
                    value={sourceScopeId || ''}
                    onChange={(value) => onSourceChange(value || undefined)}
                    options={sourceOptions}
                    placeholder="请选择源领域"
                />
            </div>

            {/* Target Scope Selection */}
            <div className="space-y-2">
                <CustomSelect
                    label="目标领域 (替换后的领域)"
                    value={targetScopeId || ''}
                    onChange={(value) => onTargetChange(value || undefined)}
                    options={targetOptions}
                    placeholder="请选择目标领域"
                />
            </div>

            {sourceScopeId && targetScopeId && (
                <div className="text-xs text-stone-500 bg-stone-50 p-3 rounded-lg">
                    <p>将把所有选中记录中的 <strong>{scopes.find(s => s.id === sourceScopeId)?.name}</strong> 替换为 <strong>{scopes.find(s => s.id === targetScopeId)?.name}</strong></p>
                </div>
            )}
        </div>
    );
};

/**
 * TodoSelector component - single-select todo picker
 */
interface TodoSelectorProps {
    todos: TodoItem[];
    todoCategories: TodoCategory[];
    selectedTodoId: string | undefined;
    onChange: (todoId: string | undefined) => void;
}

const TodoSelector: React.FC<TodoSelectorProps> = ({
    todos,
    todoCategories,
    selectedTodoId,
    onChange
}) => {
    // Group todos by category and filter out completed ones
    const activeTodos = todos.filter(todo => !todo.isCompleted);

    // Create options grouped by category
    const todoOptions = activeTodos.map(todo => {
        const category = todoCategories.find(c => c.id === todo.categoryId);
        return {
            value: todo.id,
            label: todo.title,
            icon: <span>{category?.icon || '📝'}</span>,
            categoryName: category?.name || '未分类'
        };
    });

    // Sort by category name, then by todo title
    todoOptions.sort((a, b) => {
        if (a.categoryName !== b.categoryName) {
            return a.categoryName.localeCompare(b.categoryName);
        }
        return a.label.localeCompare(b.label);
    });

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-stone-700">
                选择待办任务
            </label>

            {activeTodos.length === 0 ? (
                <div className="text-sm text-stone-400 py-4 text-center">
                    暂无可用的待办任务
                </div>
            ) : (
                <CustomSelect
                    label=""
                    value={selectedTodoId || ''}
                    onChange={(value) => onChange(value || undefined)}
                    options={todoOptions}
                    placeholder="请选择待办任务"
                />
            )}

            {selectedTodoId && (
                <div className="text-xs text-stone-500 bg-stone-50 p-3 rounded-lg">
                    <p>将为所有选中记录关联此待办任务</p>
                </div>
            )}
        </div>
    );
};

/**
 * ActivitySelector component - single-select activity picker
 */
interface ActivitySelectorProps {
    categories: Category[];
    selectedActivityId: string | undefined;
    selectedCategoryId: string | undefined;
    onChange: (activityId: string | undefined, categoryId: string | undefined) => void;
}

const ActivitySelector: React.FC<ActivitySelectorProps> = ({
    categories,
    selectedActivityId,
    selectedCategoryId,
    onChange
}) => {
    // Create options grouped by category
    const activityOptions: Array<{
        value: string;
        label: string;
        icon: React.ReactNode;
        categoryName: string;
        categoryId: string;
    }> = [];

    categories.forEach(category => {
        category.activities.forEach(activity => {
            activityOptions.push({
                value: activity.id,
                label: `${category.name} / ${activity.name}`,
                icon: <span>{activity.icon}</span>,
                categoryName: category.name,
                categoryId: category.id
            });
        });
    });

    // Sort by category name, then by activity name
    activityOptions.sort((a, b) => {
        if (a.categoryName !== b.categoryName) {
            return a.categoryName.localeCompare(b.categoryName);
        }
        return a.label.localeCompare(b.label);
    });

    const handleActivityChange = (activityId: string | undefined) => {
        if (!activityId) {
            onChange(undefined, undefined);
            return;
        }

        const selectedOption = activityOptions.find(opt => opt.value === activityId);
        if (selectedOption) {
            onChange(activityId, selectedOption.categoryId);
        }
    };

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-stone-700">
                选择新标签
            </label>

            {activityOptions.length === 0 ? (
                <div className="text-sm text-stone-400 py-4 text-center">
                    暂无可用标签
                </div>
            ) : (
                <CustomSelect
                    label=""
                    value={selectedActivityId || ''}
                    onChange={handleActivityChange}
                    options={activityOptions}
                    placeholder="请选择标签"
                />
            )}

            {selectedActivityId && selectedCategoryId && (
                <div className="text-xs text-stone-500 bg-stone-50 p-3 rounded-lg">
                    <p>将把所有选中记录的标签更改为此标签</p>
                </div>
            )}
        </div>
    );
};

/**
 * OperationSection component - operation selection and execution
 */
interface OperationSectionProps {
    operationType: OperationType | null;
    operationParams: OperationParams | null;
    onOperationTypeChange: (type: OperationType) => void;
    onOperationParamsChange: (params: OperationParams) => void;
    onExecute: () => void;
    selectedCount: number;
    categories: Category[];
    scopes: Scope[];
    todos: TodoItem[];
    todoCategories: TodoCategory[];
}

const OperationSection: React.FC<OperationSectionProps> = ({
    operationType,
    operationParams,
    onOperationTypeChange,
    onOperationParamsChange,
    onExecute,
    selectedCount,
    categories,
    scopes,
    todos,
    todoCategories
}) => {
    // Create options for operation type selector
    const operationOptions = [
        { value: 'add_scope', label: '添加领域', icon: <span>➕</span> },
        { value: 'remove_scope', label: '移除领域', icon: <span>➖</span> },
        { value: 'replace_scope', label: '替换领域', icon: <span>🔄</span> },
        { value: 'link_todo', label: '关联待办', icon: <span>🔗</span> },
        { value: 'unlink_todo', label: '取消待办关联', icon: <span>🔓</span> },
        { value: 'change_activity', label: '更改标签', icon: <span>🏷️</span> }
    ];

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-stone-800 mb-4">批量操作</h3>

            {/* Operation Type Selector */}
            <div className="space-y-3">
                <CustomSelect
                    label="操作类型"
                    value={operationType || ''}
                    onChange={(value) => onOperationTypeChange(value as OperationType)}
                    options={operationOptions}
                    placeholder="请选择操作类型"
                />
            </div>

            {/* Operation Panel */}
            {operationType === 'add_scope' && (
                <div className="pt-3 border-t border-stone-100">
                    <ScopeSelector
                        scopes={scopes}
                        selectedScopeIds={operationParams?.scopeIds || []}
                        onChange={(scopeIds) => onOperationParamsChange({ scopeIds })}
                    />
                </div>
            )}

            {operationType === 'remove_scope' && (
                <div className="pt-3 border-t border-stone-100">
                    <ScopeSelector
                        scopes={scopes}
                        selectedScopeIds={operationParams?.scopeIds || []}
                        onChange={(scopeIds) => onOperationParamsChange({ scopeIds })}
                    />
                </div>
            )}

            {operationType === 'replace_scope' && (
                <div className="pt-3 border-t border-stone-100">
                    <ScopeReplaceSelector
                        scopes={scopes}
                        sourceScopeId={operationParams?.sourceScopeId}
                        targetScopeId={operationParams?.targetScopeId}
                        onSourceChange={(sourceScopeId) => onOperationParamsChange({
                            ...operationParams,
                            sourceScopeId
                        })}
                        onTargetChange={(targetScopeId) => onOperationParamsChange({
                            ...operationParams,
                            targetScopeId
                        })}
                    />
                </div>
            )}

            {operationType === 'link_todo' && (
                <div className="pt-3 border-t border-stone-100">
                    <TodoSelector
                        todos={todos}
                        todoCategories={todoCategories}
                        selectedTodoId={operationParams?.todoId}
                        onChange={(todoId) => onOperationParamsChange({ todoId })}
                    />
                </div>
            )}

            {operationType === 'unlink_todo' && (
                <div className="pt-3 border-t border-stone-100">
                    <div className="text-sm text-stone-600 bg-stone-50 p-3 rounded-lg">
                        <p>将取消所有选中记录的待办关联</p>
                    </div>
                </div>
            )}

            {operationType === 'change_activity' && (
                <div className="pt-3 border-t border-stone-100">
                    <ActivitySelector
                        categories={categories}
                        selectedActivityId={operationParams?.activityId}
                        selectedCategoryId={operationParams?.categoryId}
                        onChange={(activityId, categoryId) => onOperationParamsChange({
                            activityId,
                            categoryId
                        })}
                    />
                </div>
            )}

            {/* Execute Button */}
            <div className="pt-3 border-t border-stone-100">
                <button
                    onClick={onExecute}
                    disabled={
                        !operationType ||
                        selectedCount === 0 ||
                        ((operationType === 'add_scope' || operationType === 'remove_scope') && (!operationParams?.scopeIds || operationParams.scopeIds.length === 0)) ||
                        (operationType === 'replace_scope' && (!operationParams?.sourceScopeId || !operationParams?.targetScopeId)) ||
                        (operationType === 'link_todo' && !operationParams?.todoId) ||
                        (operationType === 'change_activity' && (!operationParams?.activityId || !operationParams?.categoryId))
                        // unlink_todo doesn't need any parameters, so no additional condition needed
                    }
                    className={`w-full py-3 rounded-xl font-medium transition-colors ${!operationType ||
                        selectedCount === 0 ||
                        ((operationType === 'add_scope' || operationType === 'remove_scope') && (!operationParams?.scopeIds || operationParams.scopeIds.length === 0)) ||
                        (operationType === 'replace_scope' && (!operationParams?.sourceScopeId || !operationParams?.targetScopeId)) ||
                        (operationType === 'link_todo' && !operationParams?.todoId) ||
                        (operationType === 'change_activity' && (!operationParams?.activityId || !operationParams?.categoryId))
                        // unlink_todo doesn't need any parameters, so no additional condition needed
                        ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                        : 'bg-stone-600 text-white hover:bg-stone-700'
                        }`}
                >
                    执行操作 ({selectedCount} 条记录)
                </button>
            </div>
        </div>
    );
};

export const BatchFocusRecordManageView: React.FC<BatchFocusRecordManageViewProps> = ({
    onBack,
    logs,
    onUpdateLogs,
    categories,
    scopes,
    todos,
    todoCategories,
    onToast
}) => {
    // State for time range filtering
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // State for filter expression (Task 8.1)
    const [filterExpression, setFilterExpression] = useState<string>('');

    // State for record selection (Task 5.1)
    const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());

    // State for manual search trigger
    const [isSearched, setIsSearched] = useState(false);

    // State for batch operations (Task 6)
    const [operationType, setOperationType] = useState<OperationType | null>(null);
    const [operationParams, setOperationParams] = useState<OperationParams | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Suppress unused variable warnings for now - these will be used in future tasks
    void todoCategories;

    // Apply combined filtering and sorting (Task 8.2)
    const filteredLogs = useMemo(() => {
        // Create filter context
        const context: FilterContext = {
            categories,
            scopes,
            todos,
            todoCategories
        };

        // Apply combined filtering (time range + filter expression)
        if (!isSearched) return [];
        const filtered = getCombinedFilteredLogs(logs, startDate, endDate, filterExpression, context);

        // Sort by startTime in descending order (most recent first)
        return filtered.sort((a, b) => b.startTime - a.startTime);
    }, [logs, startDate, endDate, filterExpression, categories, scopes, todos, todoCategories, isSearched]);

    // Default select all filtered records (Task 5.1 - Requirement 2.3)
    useEffect(() => {
        const allFilteredIds = new Set(filteredLogs.map(log => log.id));
        setSelectedLogIds(allFilteredIds);
    }, [filteredLogs]);

    // Selection handlers (Task 5.2, 5.3)
    const handleToggleSelect = (id: string) => {
        setSelectedLogIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        const allIds = new Set(filteredLogs.map(log => log.id));
        setSelectedLogIds(allIds);
    };

    const handleDeselectAll = () => {
        setSelectedLogIds(new Set());
    };

    // Operation handlers (Task 6)
    const handleOperationTypeChange = (type: OperationType) => {
        setOperationType(type);
        setOperationParams(null); // Reset params when changing operation type
    };

    const handleOperationParamsChange = (params: OperationParams) => {
        setOperationParams(params);
    };

    const handleExecuteClick = () => {
        // Show confirmation modal (Task 6.4)
        setShowConfirmModal(true);
    };

    const handleConfirmOperation = () => {
        // Execute the batch operation (Task 6.4)
        if (!operationType) {
            setShowConfirmModal(false);
            return;
        }

        // Check if required parameters are present for operations that need them
        if ((operationType === 'add_scope' || operationType === 'remove_scope') && (!operationParams?.scopeIds || operationParams.scopeIds.length === 0)) {
            setShowConfirmModal(false);
            return;
        }

        if (operationType === 'replace_scope' && (!operationParams?.sourceScopeId || !operationParams?.targetScopeId)) {
            setShowConfirmModal(false);
            return;
        }

        if (operationType === 'link_todo' && !operationParams?.todoId) {
            setShowConfirmModal(false);
            return;
        }

        if (operationType === 'change_activity' && (!operationParams?.activityId || !operationParams?.categoryId)) {
            setShowConfirmModal(false);
            return;
        }

        // unlink_todo doesn't need any parameters, so no check needed

        try {
            let updatedLogs = logs;

            // Execute operation based on type
            if (operationType === 'add_scope' && operationParams.scopeIds) {
                updatedLogs = addScopeToLogs(logs, selectedLogIds, operationParams.scopeIds);
            } else if (operationType === 'remove_scope' && operationParams.scopeIds) {
                updatedLogs = removeScopeFromLogs(logs, selectedLogIds, operationParams.scopeIds);
            } else if (operationType === 'replace_scope' && operationParams.sourceScopeId && operationParams.targetScopeId) {
                updatedLogs = replaceScopeInLogs(logs, selectedLogIds, operationParams.sourceScopeId, operationParams.targetScopeId);
            } else if (operationType === 'link_todo' && operationParams.todoId) {
                updatedLogs = linkTodoToLogs(logs, selectedLogIds, operationParams.todoId);
            } else if (operationType === 'unlink_todo') {
                updatedLogs = unlinkTodoFromLogs(logs, selectedLogIds);
            } else if (operationType === 'change_activity' && operationParams.activityId && operationParams.categoryId) {
                updatedLogs = changeActivityInLogs(logs, selectedLogIds, operationParams.activityId, operationParams.categoryId);
            }

            // Update logs in DataContext
            onUpdateLogs(updatedLogs);

            // Show success message
            let successMessage = '';
            if (operationType === 'add_scope' || operationType === 'remove_scope') {
                const scopeNames = operationParams.scopeIds
                    ?.map(id => scopes.find(s => s.id === id)?.name)
                    .filter(Boolean)
                    .join('、') || '';

                const operationText = operationType === 'add_scope' ? '添加领域' : '移除领域';
                successMessage = `成功为 ${selectedLogIds.size} 条记录${operationText}: ${scopeNames}`;
            } else if (operationType === 'replace_scope') {
                const sourceName = scopes.find(s => s.id === operationParams.sourceScopeId)?.name || '';
                const targetName = scopes.find(s => s.id === operationParams.targetScopeId)?.name || '';
                successMessage = `成功为 ${selectedLogIds.size} 条记录替换领域: ${sourceName} → ${targetName}`;
            } else if (operationType === 'link_todo') {
                const todoName = todos.find(t => t.id === operationParams.todoId)?.title || '';
                successMessage = `成功为 ${selectedLogIds.size} 条记录关联待办: ${todoName}`;
            } else if (operationType === 'unlink_todo') {
                successMessage = `成功为 ${selectedLogIds.size} 条记录取消待办关联`;
            } else if (operationType === 'change_activity') {
                const category = categories.find(c => c.id === operationParams.categoryId);
                const activity = category?.activities.find(a => a.id === operationParams.activityId);
                const activityName = activity ? `${category?.name} / ${activity.name}` : '未知标签';
                successMessage = `成功为 ${selectedLogIds.size} 条记录更改标签为: ${activityName}`;
            }

            onToast('success', successMessage);

            // Close modal and reset operation state
            setShowConfirmModal(false);
            setOperationType(null);
            setOperationParams(null);
        } catch (error) {
            console.error('Batch operation failed:', error);
            onToast('error', '操作执行失败，请重试');
            setShowConfirmModal(false);
        }
    };

    // Validate date input (8 digits)
    const isValidDateFormat = (date: string): boolean => {
        if (!date) return true; // Empty is valid
        return /^\d{8}$/.test(date);
    };

    const startDateValid = isValidDateFormat(startDate);
    const endDateValid = isValidDateFormat(endDate);

    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0">
                <button
                    onClick={onBack}
                    className="text-stone-400 hover:text-stone-600 p-1"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">批量管理记录</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-40">
                {/* Filter Section */}
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-semibold text-stone-800 mb-4">筛选条件</h3>

                    {/* Time Range Filter */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-stone-700">
                            时间范围
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Start Date */}
                            <div>
                                <label className="block text-xs text-stone-500 mb-1">
                                    开始日期 (YYYYMMDD)
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="如: 20240101"
                                    value={startDate}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                                        setStartDate(value);
                                        setIsSearched(false);
                                    }}
                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${startDateValid
                                        ? 'border-stone-200 focus:ring-stone-300'
                                        : 'border-red-300 focus:ring-red-300'
                                        }`}
                                />
                                {!startDateValid && (
                                    <p className="text-xs text-red-500 mt-1">请输入8位数字</p>
                                )}
                            </div>

                            {/* End Date */}
                            <div>
                                <label className="block text-xs text-stone-500 mb-1">
                                    结束日期 (YYYYMMDD)
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="如: 20241231"
                                    value={endDate}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                                        setEndDate(value);
                                        setIsSearched(false);
                                    }}
                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${endDateValid
                                        ? 'border-stone-200 focus:ring-stone-300'
                                        : 'border-red-300 focus:ring-red-300'
                                        }`}
                                />
                                {!endDateValid && (
                                    <p className="text-xs text-red-500 mt-1">请输入8位数字</p>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-stone-400">
                            提示: 不填写表示不限制该端点
                        </p>
                    </div>

                    {/* Filter Stats */}
                    <div className="pt-3 border-t border-stone-100">
                        <p className="text-sm text-stone-600">
                            匹配记录: <span className="font-semibold text-stone-800">{filteredLogs.length}</span> 条
                        </p>
                    </div>

                    {/* Filter Expression Input (Task 8.1) */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-stone-700">
                            筛选表达式
                        </label>
                        <div className="space-y-2">
                            <textarea
                                placeholder="输入筛选表达式，如: #运动 %健康 @任务名 备注关键词"
                                value={filterExpression}
                                onChange={(e) => {
                                    setFilterExpression(e.target.value);
                                    setIsSearched(false);
                                }}
                                rows={2}
                                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none"
                            />
                            <div className="text-xs text-stone-400 space-y-1">
                                <p>语法: #活动 %领域 @待办 备注关键词 | 用OR表示或关系</p>
                            </div>
                        </div>

                        {/* Search Button */}
                        <div className="pt-3 border-t border-stone-100 flex justify-end">
                            <button
                                onClick={() => setIsSearched(true)}
                                className="px-6 py-2 bg-stone-800 text-white text-sm font-bold rounded-xl shadow-md active:scale-95 transition-all"
                            >
                                检索记录
                            </button>
                        </div>
                    </div>
                </div>

                {/* Placeholder for future sections */}
                {isSearched && (
                    <RecordListSection
                        logs={filteredLogs}
                        categories={categories}
                        scopes={scopes}
                        todos={todos}
                        selectedIds={selectedLogIds}
                        onToggleSelect={handleToggleSelect}
                        onSelectAll={handleSelectAll}
                        onDeselectAll={handleDeselectAll}
                    />
                )}

                {/* Operation Section (Task 6.1) */}
                {isSearched && (
                    <OperationSection
                        operationType={operationType}
                        operationParams={operationParams}
                        onOperationTypeChange={handleOperationTypeChange}
                        onOperationParamsChange={handleOperationParamsChange}
                        onExecute={handleExecuteClick}
                        selectedCount={selectedLogIds.size}
                        categories={categories}
                        scopes={scopes}
                        todos={todos}
                        todoCategories={todoCategories}
                    />
                )}
            </div>

            {/* Confirm Modal (Task 6.4) */}
            <ConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmOperation}
                title="确认批量操作"
                description={
                    operationType === 'add_scope' && operationParams?.scopeIds
                        ? `即将为 ${selectedLogIds.size} 条记录添加领域: ${operationParams.scopeIds
                            .map(id => scopes.find(s => s.id === id)?.name)
                            .filter(Boolean)
                            .join('、')
                        }`
                        : operationType === 'remove_scope' && operationParams?.scopeIds
                            ? `即将为 ${selectedLogIds.size} 条记录移除领域: ${operationParams.scopeIds
                                .map(id => scopes.find(s => s.id === id)?.name)
                                .filter(Boolean)
                                .join('、')
                            }`
                            : operationType === 'replace_scope' && operationParams?.sourceScopeId && operationParams?.targetScopeId
                                ? `即将为 ${selectedLogIds.size} 条记录替换领域: ${scopes.find(s => s.id === operationParams.sourceScopeId)?.name
                                } → ${scopes.find(s => s.id === operationParams.targetScopeId)?.name
                                }`
                                : operationType === 'link_todo' && operationParams?.todoId
                                    ? `即将为 ${selectedLogIds.size} 条记录关联待办: ${todos.find(t => t.id === operationParams.todoId)?.title
                                    }`
                                    : operationType === 'unlink_todo'
                                        ? `即将为 ${selectedLogIds.size} 条记录取消待办关联`
                                        : operationType === 'change_activity' && operationParams?.activityId && operationParams?.categoryId
                                            ? `即将为 ${selectedLogIds.size} 条记录更改标签为: ${(() => {
                                                const category = categories.find(c => c.id === operationParams.categoryId);
                                                const activity = category?.activities.find(a => a.id === operationParams.activityId);
                                                return activity ? `${category?.name} / ${activity.name}` : '未知标签';
                                            })()
                                            }`
                                            : `即将对 ${selectedLogIds.size} 条记录执行操作，是否继续？`
                }
                confirmText="确认执行"
                cancelText="取消"
                type="info"
            />
        </div>
    );
};
