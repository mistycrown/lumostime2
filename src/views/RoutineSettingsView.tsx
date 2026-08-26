/**
 * @file RoutineSettingsView.tsx
 * @input Routine 配置、计时分类与活动
 * @output Routine 的新建、编辑、排序和删除操作
 * @pos View (Settings Subview)
 * @description 管理记录页可快速启动的连续计时 Routine。
 * @updated 2026-08-26: Aligns Routine icon editing with batch tags and adds static step notes.
 * @updated 2026-08-26: Reworked the editor to use nested back navigation, shared selectors, and cross-category steps.
 */
import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import type { Category, Routine, RoutineStep } from '../types';
import { CustomSelect } from '../components/CustomSelect';
import { IconRenderer } from '../components/IconRenderer';
import { TagAssociation } from '../components/TagAssociation';
import { UIIconSelectorCompact } from '../components/UIIconSelector';
import { useSettings } from '../contexts/SettingsContext';

interface RoutineSettingsViewProps {
  routines: Routine[];
  categories: Category[];
  onUpdateRoutines: (routines: Routine[]) => void;
  onBack: () => void;
  onToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

const createRoutine = (categoryId: string): Routine => ({
  id: crypto.randomUUID(),
  name: '新建 Routine',
  icon: '新',
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

export const RoutineSettingsView: React.FC<RoutineSettingsViewProps> = ({
  routines,
  categories,
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
  const [isUIIconSelectorOpen, setIsUIIconSelectorOpen] = useState(false);
  const editingRoutine = editingId ? routines.find(routine => routine.id === editingId) : undefined;

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

  const updateRoutineName = (name: string) => {
    if (!editingRoutine) return;
    const previousFirstCharacter = Array.from(editingRoutine.name)[0] || '';
    const nextFirstCharacter = Array.from(name)[0] || '';
    updateEditing({
      name,
      icon: editingRoutine.icon === previousFirstCharacter ? nextFirstCharacter : editingRoutine.icon
    });
  };

  const updateStep = (stepId: string, patch: Partial<RoutineStep>) => {
    if (!editingRoutine) return;
    updateEditing({
      steps: editingRoutine.steps.map(step => step.id === stepId ? { ...step, ...patch } : step)
    });
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
      setIsUIIconSelectorOpen(false);
    }
  };

  const leaveCurrentLevel = () => {
    setExpandedStepId(null);
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
                    value={editingRoutine.icon || ''}
                    onChange={event => updateEditing({ icon: event.target.value, uiIcon: '' })}
                    aria-label="Routine emoji 图标"
                    className="w-9 shrink-0 bg-transparent py-2 text-center text-xl outline-none focus:outline-none focus:ring-0"
                  />
                  <input
                    value={editingRoutine.name}
                    onChange={event => updateRoutineName(event.target.value)}
                    aria-label="Routine 名称"
                    placeholder="例如：晨间日常"
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
                const activity = categories.flatMap(category => category.activities).find(item => item.id === step.activityId);
                const selectedCategoryId = step.categoryId || categories.find(category => category.activities.some(item => item.id === step.activityId))?.id || activeCategories[0]?.id || '';
                return (
                  <div key={step.id} className="space-y-2">
                    <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-2">
                      <span className="w-6 text-center text-xs text-stone-400">{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => setExpandedStepId(current => current === step.id ? null : step.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left outline-none hover:bg-stone-50 focus:outline-none focus:ring-0"
                        aria-expanded={expandedStepId === step.id}
                      >
                        <IconRenderer icon={activity?.icon || '＋'} uiIcon={activity?.uiIcon} className="text-lg" />
                        <span className={`truncate text-sm ${activity ? 'text-stone-700' : 'text-stone-400'}`}>{activity?.name || '选择计时项目'}</span>
                        <ChevronRight size={15} className={`ml-auto shrink-0 text-stone-300 transition-transform ${expandedStepId === step.id ? 'rotate-90' : ''}`} />
                      </button>
                      <button type="button" onClick={() => moveStep(index, -1)} className="p-1 text-stone-400 outline-none hover:text-stone-700 focus:outline-none focus:ring-0" aria-label="上移"><ArrowUp size={15} /></button>
                      <button type="button" onClick={() => moveStep(index, 1)} className="p-1 text-stone-400 outline-none hover:text-stone-700 focus:outline-none focus:ring-0" aria-label="下移"><ArrowDown size={15} /></button>
                      <button type="button" onClick={() => updateEditing({ steps: editingRoutine.steps.filter(item => item.id !== step.id).map((item, order) => ({ ...item, order })) })} className="p-1 text-stone-400 outline-none hover:text-rose-600 focus:outline-none focus:ring-0" aria-label="删除步骤"><X size={15} /></button>
                    </div>
                    {expandedStepId === step.id && (
                      <div className="rounded-xl border border-stone-200 bg-white p-3">
                        <TagAssociation
                          categories={categories}
                          selectedCategoryId={selectedCategoryId}
                          selectedActivityId={step.activityId}
                          onCategorySelect={categoryId => updateStep(step.id, { categoryId, activityId: '' })}
                          onActivitySelect={activityId => {
                            if (!activityId) return;
                            const nextCategory = categories.find(category => category.activities.some(item => item.id === activityId));
                            updateStep(step.id, { activityId, categoryId: nextCategory?.id || step.categoryId });
                            setExpandedStepId(null);
                          }}
                        />
                        <label className="mt-3 block border-t border-stone-100 pt-3 text-xs font-semibold text-stone-500">
                          备注
                          <textarea
                            value={step.note || ''}
                            onChange={event => updateStep(step.id, { note: event.target.value })}
                            rows={2}
                            className="mt-1 w-full resize-none border-b border-stone-200 bg-transparent px-0 py-2 text-sm font-normal text-stone-800 outline-none transition-colors focus:border-stone-500 focus:outline-none focus:ring-0"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
              {editingRoutine.steps.length === 0 && <div className="rounded-xl border border-dashed border-stone-300 py-8 text-center text-sm text-stone-400">添加至少一个活动步骤</div>}
            </section>

            <button type="button" onClick={() => deleteRoutine(editingRoutine.id)} className="flex items-center gap-2 text-sm text-rose-600 outline-none hover:text-rose-700 focus:outline-none focus:ring-0"><Trash2 size={16} /> 删除 Routine</button>
          </div>
        )}
      </main>
    </div>
  );
};
