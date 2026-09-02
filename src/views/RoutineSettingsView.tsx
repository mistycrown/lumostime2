/**
 * @file RoutineSettingsView.tsx
 * @input Routine 配置、计时分类与活动
 * @output Routine 的新建、编辑、排序和删除操作
 * @pos View (Settings Subview)
 * @description 管理记录页可快速启动的连续计时 Routine。
 * @updated 2026-08-26: Replaces static step notes with editable Markdown checklist templates.
 * @updated 2026-08-26: Uses a single-line combined emoji and Routine name input with a default emoji.
 * @updated 2026-08-26: Adds expandable Activity, Scope, Todo, and Markdown checklist step selectors.
 * @updated 2026-08-26: Matches daily-check rows with a non-interactive summary line and direct selector expansion.
 * @updated 2026-08-26: Uses neutral checklist toggles and selects item text on focus for quick replacement.
 * @updated 2026-08-26: Defers checklist text persistence until the input loses focus.
 * @updated 2026-08-26: Reworked the editor to use nested back navigation, shared selectors, and cross-category steps.
 * @updated 2026-08-26: Lets hardware back return from an editor to the Routine list and gives each selector a compact title/clear header.
 * @updated 2026-08-26: Splits step association and ordering actions into responsive rows on narrow screens.
 * @updated 2026-08-27: Keeps Routine checklist completion markers neutral gray across themes.
 * @updated 2026-09-02: Requires confirmation before deleting a Routine from the editor.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Check, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import type { Category, Routine, RoutineStep, Scope, TodoCategory, TodoItem } from '../types';
import { CustomSelect } from '../components/CustomSelect';
import { IconRenderer } from '../components/IconRenderer';
import { TagAssociation } from '../components/TagAssociation';
import { ScopeAssociation } from '../components/ScopeAssociation';
import { TodoAssociation } from '../components/TodoAssociation';
import { UIIconSelectorCompact } from '../components/UIIconSelector';
import { ConfirmModal } from '../components/ConfirmModal';
import { useSettings } from '../contexts/SettingsContext';
import { registerHardwareBackHandler } from '../utils/hardwareBackHandlerStack';
import { addRoutineChecklistItem, parseRoutineChecklist, serializeRoutineChecklist, updateRoutineChecklistItem } from '../utils/routineChecklist';

interface RoutineSettingsViewProps {
  routines: Routine[];
  categories: Category[];
  scopes: Scope[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  onUpdateRoutines: (routines: Routine[]) => void;
  onBack: () => void;
  onToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

const createRoutine = (categoryId: string): Routine => ({
  id: crypto.randomUUID(),
  name: '新建 Routine',
  icon: '✨',
  categoryId,
  steps: [],
  createdAt: Date.now(),
  updatedAt: Date.now()
});

const createStep = (): RoutineStep => ({
  id: crypto.randomUUID(),
  activityId: '',
  categoryId: '',
  order: 0
});

interface ChecklistEditorProps {
  markdown: string;
  onChange: (markdown: string) => void;
}

const ChecklistEditor: React.FC<ChecklistEditorProps> = ({ markdown, onChange }) => {
  const entries = parseRoutineChecklist(markdown);
  const [draftTexts, setDraftTexts] = useState<Record<number, string>>({});

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Checklist</h3>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setDraftTexts({});
              onChange('');
            }}
            className="text-xs font-medium text-stone-400 transition-colors hover:text-red-400"
          >
            Clear
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {entries.map((entry, index) => (
          <div key={`${index}-${entry.text}`} className="flex items-center gap-2 py-1">
            <button
              type="button"
              onClick={() => {
                setDraftTexts({});
                onChange(updateRoutineChecklistItem(markdown, index, { completed: !entry.completed }));
              }}
              aria-pressed={entry.completed}
              aria-label={`Checklist ${index + 1} 完成状态`}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all focus:outline-none focus:ring-2 focus:ring-stone-200 ${entry.completed ? 'border-stone-400 bg-stone-400 text-white shadow-sm' : 'border-stone-300 bg-white text-transparent hover:border-stone-400'}`}
            >
              <Check size={13} strokeWidth={3} />
            </button>
            <input
              value={draftTexts[index] ?? entry.text}
              onFocus={event => {
                setDraftTexts(current => current[index] === undefined ? { ...current, [index]: entry.text } : current);
                event.currentTarget.select();
              }}
              onChange={event => setDraftTexts(current => ({ ...current, [index]: event.target.value }))}
              onBlur={() => {
                const draftText = draftTexts[index];
                if (draftText !== undefined && draftText !== entry.text) {
                  onChange(updateRoutineChecklistItem(markdown, index, { text: draftText }));
                }
                setDraftTexts(current => {
                  const next = { ...current };
                  delete next[index];
                  return next;
                });
              }}
              className="min-w-0 flex-1 bg-transparent py-1 text-sm text-stone-700 outline-none focus:ring-0"
              aria-label={`Checklist ${index + 1} 内容`}
            />
            <button
              type="button"
              onClick={() => {
                setDraftTexts({});
                onChange(serializeRoutineChecklist(entries.filter((_item, itemIndex) => itemIndex !== index)));
              }}
              className="p-1 text-stone-300 hover:text-rose-500"
              aria-label="删除 checklist 条目"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {entries.length === 0 && <div className="py-2 text-xs text-stone-400">暂无 checklist 条目</div>}
      </div>
      <button
        type="button"
        onClick={() => {
          setDraftTexts({});
          onChange(addRoutineChecklistItem(markdown));
        }}
        className="mt-1 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-stone-500 hover:bg-stone-50 hover:text-stone-800"
        aria-label="添加 checklist 条目"
      >
        <Plus size={14} /> 添加条目
      </button>
    </div>
  );
};

export const RoutineSettingsView: React.FC<RoutineSettingsViewProps> = ({
  routines,
  categories,
  scopes,
  todos,
  todoCategories,
  onUpdateRoutines,
  onBack,
  onToast
}) => {
  const { uiIconTheme } = useSettings();
  const isCustomThemeEnabled = uiIconTheme !== 'default';
  const activeCategories = useMemo(
    () => categories.filter(category => category.activities.some(activity => !activity.isArchived)),
    [categories]
  );
  const categoryOptions = useMemo(
    () => activeCategories.map(category => ({
      value: category.id,
      label: category.name,
      icon: <IconRenderer icon={category.icon} uiIcon={category.uiIcon} className="text-base" />
    })),
    [activeCategories]
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [expandedPicker, setExpandedPicker] = useState<'activity' | 'scope' | 'todo' | 'checklist' | null>(null);
  const [isUIIconSelectorOpen, setIsUIIconSelectorOpen] = useState(false);
  const [pendingDeleteRoutineId, setPendingDeleteRoutineId] = useState<string | null>(null);
  const editingRoutine = editingId ? routines.find(routine => routine.id === editingId) : undefined;

  useEffect(() => {
    if (!editingId) return;

    return registerHardwareBackHandler(() => {
      if (pendingDeleteRoutineId) {
        setPendingDeleteRoutineId(null);
        return true;
      }
      setEditingId(null);
      setExpandedStepId(null);
      setExpandedPicker(null);
      setIsUIIconSelectorOpen(false);
      return true;
    });
  }, [editingId, pendingDeleteRoutineId]);

  const beginCreate = () => {
    const category = activeCategories[0];
    if (!category) {
      onToast?.('error', '请先创建至少一个计时活动');
      return;
    }
    const routine = createRoutine(category.id);
    onUpdateRoutines([...routines, routine]);
    setEditingId(routine.id);
  };

  const updateEditing = (patch: Partial<Routine>) => {
    if (!editingRoutine) return;
    onUpdateRoutines(routines.map(routine => routine.id === editingRoutine.id
      ? { ...routine, ...patch, updatedAt: Date.now() }
      : routine));
  };

  const getRoutineNameInputValue = () => {
    if (!editingRoutine) return '';
    const icon = editingRoutine.icon || '';
    const nameCharacters = Array.from(editingRoutine.name);
    const iconCharacters = Array.from(icon);
    const storedNameStartsWithIcon = iconCharacters.length > 0
      && nameCharacters.slice(0, iconCharacters.length).join('') === icon;
    return `${icon}${storedNameStartsWithIcon ? nameCharacters.slice(iconCharacters.length).join('') : editingRoutine.name}`;
  };

  const updateRoutineName = (combinedValue: string) => {
    if (!editingRoutine) return;
    const characters = Array.from(combinedValue);
    const icon = characters[0] || '';
    const name = characters.slice(1).join('').trim();
    updateEditing({
      name,
      icon,
      uiIcon: ''
    });
  };

  const updateStep = (stepId: string, patch: Partial<RoutineStep>) => {
    if (!editingRoutine) return;
    updateEditing({
      steps: editingRoutine.steps.map(step => step.id === stepId ? { ...step, ...patch } : step)
    });
  };

  const getStepContext = (step: RoutineStep) => {
    const todo = step.linkedTodoId ? todos.find(item => item.id === step.linkedTodoId) : undefined;
    const activityId = todo?.linkedActivityId || step.activityId;
    const categoryId = todo?.linkedCategoryId || step.categoryId;
    const activity = categories
      .find(category => category.id === categoryId)
      ?.activities.find(item => item.id === activityId);
    const selectedScopeIds = todo?.defaultScopeIds || step.scopeIds || [];
    const selectedScopes = selectedScopeIds
      .map(scopeId => scopes.find(scope => scope.id === scopeId))
      .filter((scope): scope is Scope => Boolean(scope));
    return { todo, activity, selectedScopes };
  };

  const toggleStepPicker = (stepId: string, picker: 'activity' | 'scope' | 'todo' | 'checklist') => {
    setExpandedStepId(stepId);
    setExpandedPicker(current => current === picker ? null : picker);
  };

  const addStep = () => {
    if (!editingRoutine) return;
    updateEditing({
      steps: [...editingRoutine.steps, { ...createStep(), order: editingRoutine.steps.length }]
    });
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    if (!editingRoutine) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= editingRoutine.steps.length) return;
    const steps = [...editingRoutine.steps];
    [steps[index], steps[nextIndex]] = [steps[nextIndex], steps[index]];
    updateEditing({ steps: steps.map((step, order) => ({ ...step, order })) });
  };

  const deleteRoutine = (routineId: string) => {
    onUpdateRoutines(routines.filter(routine => routine.id !== routineId));
    if (editingId === routineId) {
      setEditingId(null);
      setExpandedStepId(null);
      setExpandedPicker(null);
      setIsUIIconSelectorOpen(false);
    }
  };

  const leaveCurrentLevel = () => {
    setExpandedStepId(null);
    setExpandedPicker(null);
    setIsUIIconSelectorOpen(false);
    if (editingRoutine) {
      setEditingId(null);
      return;
    }
    onBack();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#fdfbf7] font-serif pt-[var(--app-safe-area-top)] pb-[env(safe-area-inset-bottom)]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-stone-100 bg-[#fdfbf7]/90 px-4 backdrop-blur-md">
        <button type="button" onClick={leaveCurrentLevel} className="p-2 text-stone-400 outline-none hover:text-stone-700 focus:outline-none focus:ring-0" aria-label="返回">
          <ArrowLeft size={22} />
        </button>
        <span className="text-lg font-bold text-stone-800">{editingRoutine ? (editingRoutine.name || '编辑 Routine') : 'Routine 设置'}</span>
        <span className="w-9" aria-hidden="true" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {!editingRoutine && (
          <div className="space-y-5">
            {activeCategories.map(category => {
              const categoryRoutines = routines.filter(routine => routine.categoryId === category.id);
              if (categoryRoutines.length === 0) return null;
              return (
                <section key={category.id}>
                  <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-stone-400">{category.name}</h2>
                  <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                    {categoryRoutines.map((routine, index) => (
                      <button
                        key={routine.id}
                        type="button"
                        onClick={() => setEditingId(routine.id)}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-stone-50 focus:outline-none focus:ring-0 ${index > 0 ? 'border-t border-stone-100' : ''}`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <IconRenderer icon={routine.icon || '↻'} uiIcon={routine.uiIcon} className="text-lg" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-stone-700">{routine.name || '未命名 Routine'}</span>
                            <span className="block text-xs text-stone-400">{routine.steps.length} 步</span>
                          </span>
                        </span>
                        <ChevronRight size={17} className="shrink-0 text-stone-300" />
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
            {routines.length === 0 && <div className="py-16 text-center text-sm text-stone-400">还没有 Routine</div>}
            <button type="button" onClick={beginCreate} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 py-3 text-sm text-stone-500 outline-none hover:border-stone-400 hover:text-stone-700 focus:outline-none focus:ring-0">
              <Plus size={16} /> 新建 Routine
            </button>
          </div>
        )}

        {editingRoutine && (
          <div className="space-y-7">
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-stone-700">基本信息</h2>
              <div className="border-b border-stone-200">
                <div className="flex items-center gap-2 py-1">
                  <input
                    value={getRoutineNameInputValue()}
                    onChange={event => updateRoutineName(event.target.value)}
                    aria-label="Routine emoji 与名称"
                    placeholder="例如：🌅晨间日常"
                    className="min-w-0 flex-1 bg-transparent py-2 text-sm text-stone-800 outline-none focus:outline-none focus:ring-0"
                  />
                  {isCustomThemeEnabled && (
                    <button
                      type="button"
                      onClick={() => setIsUIIconSelectorOpen(current => !current)}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${isUIIconSelectorOpen ? 'bg-[var(--accent-color)]/10' : 'hover:bg-stone-100'}`}
                      title="选择 UI 图标"
                      aria-label="选择 UI 图标"
                    >
                      {editingRoutine.uiIcon ? (
                        <IconRenderer icon={editingRoutine.icon || ''} uiIcon={editingRoutine.uiIcon} size={16} />
                      ) : (
                        <span className="text-sm text-stone-400">+</span>
                      )}
                    </button>
                  )}
                </div>
                {isCustomThemeEnabled && isUIIconSelectorOpen && (
                  <div className="border-t border-stone-100 py-3">
                    <UIIconSelectorCompact
                      currentIcon=""
                      currentUiIcon={editingRoutine.uiIcon}
                      onSelectDual={(_emoji, uiIcon) => {
                        updateEditing({ uiIcon });
                        setIsUIIconSelectorOpen(false);
                      }}
                    />
                  </div>
                )}
              </div>
              <CustomSelect
                label="所属分类"
                value={editingRoutine.categoryId}
                options={categoryOptions}
                onChange={categoryId => updateEditing({ categoryId })}
                dropdownPosition="auto"
              />
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-stone-700">步骤</h2>
                <button type="button" onClick={addStep} className="flex items-center gap-1 text-xs text-stone-500 outline-none hover:text-stone-800 focus:outline-none focus:ring-0"><Plus size={15} /> 添加步骤</button>
              </div>
              {editingRoutine.steps.map((step, index) => {
                const { todo, activity, selectedScopes } = getStepContext(step);
                const summaryParts = [
                  activity ? `#${activity.name}` : '',
                  todo ? `@${todo.title}` : '',
                  ...selectedScopes.map(scope => `%${scope.name}`)
                ].filter(Boolean);
                const isExpanded = expandedStepId === step.id && expandedPicker !== null;
                const selectedCategoryId = step.categoryId || categories.find(category => category.activities.some(item => item.id === step.activityId))?.id || activeCategories[0]?.id || '';
                return (
                  <div key={step.id} className={`space-y-1.5 ${isExpanded && index < editingRoutine.steps.length - 1 ? 'pb-5' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 shrink-0 text-center text-xs text-stone-300">{index + 1}</span>
                      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-left">
                        <span className={`truncate text-sm ${summaryParts.length > 0 ? 'text-stone-700' : 'text-stone-400'}`}>
                          {summaryParts.join('  ') || '选择步骤关联'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-[1.375rem] grid gap-1.5 min-[440px]:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="flex flex-wrap gap-1.5 min-[440px]:justify-end">
                        <button
                          type="button"
                          onClick={() => !todo && toggleStepPicker(step.id, 'activity')}
                          disabled={Boolean(todo)}
                          className={`flex h-9 shrink-0 items-center justify-center rounded-lg border px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${step.activityId && !todo ? 'border-blue-100 bg-blue-50 text-blue-600' : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'}`}
                        >标签</button>
                        <button
                          type="button"
                          onClick={() => !todo && toggleStepPicker(step.id, 'scope')}
                          disabled={Boolean(todo)}
                          className={`flex h-9 shrink-0 items-center justify-center rounded-lg border px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${selectedScopes.length > 0 && !todo ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'}`}
                        >领域</button>
                        <button
                          type="button"
                          onClick={() => toggleStepPicker(step.id, 'todo')}
                          className={`flex h-9 shrink-0 items-center justify-center rounded-lg border px-2.5 text-xs font-medium transition-colors ${todo ? 'border-violet-100 bg-violet-50 text-violet-600' : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'}`}
                        >待办</button>
                        <button
                          type="button"
                          onClick={() => toggleStepPicker(step.id, 'checklist')}
                          className={`flex h-9 shrink-0 items-center justify-center rounded-lg border px-2.5 text-xs font-medium transition-colors ${step.checklistMarkdown ? 'border-amber-100 bg-amber-50 text-amber-600' : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'}`}
                        >清单</button>
                      </div>
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => moveStep(index, -1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 transition-colors hover:border-stone-300" aria-label="上移"><ArrowUp size={16} /></button>
                        <button type="button" onClick={() => moveStep(index, 1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 transition-colors hover:border-stone-300" aria-label="下移"><ArrowDown size={16} /></button>
                        <button type="button" onClick={() => updateEditing({ steps: editingRoutine.steps.filter(item => item.id !== step.id).map((item, order) => ({ ...item, order })) })} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-300 transition-colors hover:text-rose-500" aria-label="删除步骤"><X size={16} /></button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="ml-6 pt-2">
                        {expandedPicker === 'activity' && !todo && (
                          <div className="pt-3">
                            <TagAssociation
                              categories={categories}
                              selectedCategoryId={selectedCategoryId}
                              selectedActivityId={step.activityId}
                              onCategorySelect={categoryId => updateStep(step.id, { categoryId, activityId: '' })}
                              onActivitySelect={activityId => {
                                if (!activityId) return;
                                const nextCategory = categories.find(category => category.activities.some(item => item.id === activityId));
                                updateStep(step.id, { activityId, categoryId: nextCategory?.id || step.categoryId });
                                setExpandedPicker(null);
                              }}
                              title="Tag"
                              onClear={() => updateStep(step.id, { activityId: '', categoryId: '' })}
                            />
                          </div>
                        )}
                        {expandedPicker === 'scope' && !todo && (
                          <div className="pt-3">
                            <ScopeAssociation
                              scopes={scopes}
                              selectedScopeIds={step.scopeIds}
                              onSelect={scopeIds => updateStep(step.id, { scopeIds })}
                              title="Scope"
                            />
                          </div>
                        )}
                        {expandedPicker === 'todo' && (
                          <div className="pt-3">
                            <TodoAssociation
                              todos={todos}
                              todoCategories={todoCategories}
                              linkedTodoId={step.linkedTodoId}
                              onChange={linkedTodoId => {
                                const linkedTodo = linkedTodoId ? todos.find(item => item.id === linkedTodoId) : undefined;
                                updateStep(step.id, linkedTodo ? {
                                  linkedTodoId,
                                  activityId: linkedTodo.linkedActivityId || '',
                                  categoryId: linkedTodo.linkedCategoryId || '',
                                  scopeIds: undefined
                                } : {
                                  linkedTodoId: undefined,
                                  activityId: '',
                                  categoryId: '',
                                  scopeIds: undefined
                                });
                                setExpandedPicker(null);
                              }}
                              enableHierarchy
                              title="Todo"
                            />
                          </div>
                        )}
                        {expandedPicker === 'checklist' && (
                          <ChecklistEditor
                            markdown={step.checklistMarkdown || ''}
                            onChange={checklistMarkdown => updateStep(step.id, { checklistMarkdown, note: undefined })}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {editingRoutine.steps.length === 0 && <div className="rounded-xl border border-dashed border-stone-300 py-8 text-center text-sm text-stone-400">添加至少一个活动步骤</div>}
            </section>

            <button type="button" onClick={() => setPendingDeleteRoutineId(editingRoutine.id)} className="flex items-center gap-2 text-sm text-rose-600 outline-none hover:text-rose-700 focus:outline-none focus:ring-0"><Trash2 size={16} /> 删除 Routine</button>
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={pendingDeleteRoutineId !== null}
        onClose={() => setPendingDeleteRoutineId(null)}
        onConfirm={() => {
          if (pendingDeleteRoutineId) {
            deleteRoutine(pendingDeleteRoutineId);
          }
          setPendingDeleteRoutineId(null);
        }}
        title="删除 Routine"
        description="确定要删除这个 Routine 吗？此操作无法撤销。"
        confirmText="删除"
        cancelText="取消"
        type="danger"
      />
    </div>
  );
};
