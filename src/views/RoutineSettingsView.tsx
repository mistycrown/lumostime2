/**
 * @file RoutineSettingsView.tsx
 * @input Routine 配置、计时分类与活动
 * @output Routine 的新建、编辑、排序和删除操作
 * @pos View (Settings Subview)
 * @description 管理记录页可快速启动的连续计时 Routine。
 * @updated 2026-08-26: Added first Routine settings editor.
 */
import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Save, Trash2, X } from 'lucide-react';
import type { Category, Routine, RoutineStep } from '../types';

interface RoutineSettingsViewProps {
  routines: Routine[];
  categories: Category[];
  onUpdateRoutines: (routines: Routine[]) => void;
  onBack: () => void;
  onToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

const createRoutine = (categoryId: string): Routine => ({
  id: crypto.randomUUID(),
  name: '',
  icon: '↻',
  categoryId,
  steps: [],
  createdAt: Date.now(),
  updatedAt: Date.now()
});

const createStep = (category: Category): RoutineStep => ({
  id: crypto.randomUUID(),
  activityId: category.activities[0]?.id || '',
  categoryId: category.id,
  order: 0
});

export const RoutineSettingsView: React.FC<RoutineSettingsViewProps> = ({
  routines,
  categories,
  onUpdateRoutines,
  onBack,
  onToast
}) => {
  const activeCategories = useMemo(
    () => categories.filter(category => category.activities.some(activity => !activity.isArchived)),
    [categories]
  );
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const updateStep = (stepId: string, patch: Partial<RoutineStep>) => {
    if (!editingRoutine) return;
    updateEditing({
      steps: editingRoutine.steps.map(step => step.id === stepId ? { ...step, ...patch } : step)
    });
  };

  const addStep = () => {
    if (!editingRoutine) return;
    const category = activeCategories.find(item => item.id === editingRoutine.categoryId);
    if (!category || category.activities.length === 0) return;
    updateEditing({
      steps: [...editingRoutine.steps, { ...createStep(category), order: editingRoutine.steps.length }]
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
    if (editingId === routineId) setEditingId(null);
  };

  const saveAndBack = () => {
    if (editingRoutine && (!editingRoutine.name.trim() || editingRoutine.steps.length === 0)) {
      onToast?.('error', 'Routine 需要名称和至少一个步骤');
      return;
    }
    onToast?.('success', 'Routine 已保存');
    onBack();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#fdfbf7] font-serif pt-[var(--app-safe-area-top)] pb-[env(safe-area-inset-bottom)]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-stone-100 bg-[#fdfbf7]/90 px-4 backdrop-blur-md">
        <button type="button" onClick={onBack} className="p-2 text-stone-400 hover:text-stone-700" aria-label="返回">
          <ArrowLeft size={22} />
        </button>
        <span className="text-lg font-bold text-stone-800">Routine 设置</span>
        <button type="button" onClick={beginCreate} className="p-2 text-stone-500 hover:text-stone-800" aria-label="新建 Routine">
          <Plus size={22} />
        </button>
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
                      <div key={routine.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${index > 0 ? 'border-t border-stone-100' : ''}`}>
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="text-lg">{routine.icon || '↻'}</span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-stone-700">{routine.name || '未命名 Routine'}</div>
                            <div className="text-xs text-stone-400">{routine.steps.length} 步</div>
                          </div>
                        </div>
                        <button type="button" onClick={() => setEditingId(routine.id)} className="shrink-0 text-xs text-stone-500 hover:text-stone-800">编辑</button>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
            {routines.length === 0 && <div className="py-16 text-center text-sm text-stone-400">还没有 Routine</div>}
            <button type="button" onClick={beginCreate} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 py-3 text-sm text-stone-500 hover:border-stone-400 hover:text-stone-700">
              <Plus size={16} /> 新建 Routine
            </button>
          </div>
        )}

        {editingRoutine && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setEditingId(null)} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"><ArrowLeft size={16} /> 返回列表</button>
              <button type="button" onClick={saveAndBack} className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--accent-color)' }}><Save size={15} /> 保存</button>
            </div>
            <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
              <label className="block text-xs font-semibold text-stone-500">名称<input value={editingRoutine.name} onChange={event => updateEditing({ name: event.target.value })} placeholder="例如：晨间日常" className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400" /></label>
              <label className="block text-xs font-semibold text-stone-500">图标<input value={editingRoutine.icon || ''} onChange={event => updateEditing({ icon: event.target.value })} className="mt-1 w-20 rounded-lg border border-stone-200 px-3 py-2 text-center text-lg outline-none focus:border-stone-400" /></label>
              <label className="block text-xs font-semibold text-stone-500">所属分类<select value={editingRoutine.categoryId} onChange={event => updateEditing({ categoryId: event.target.value, steps: [] })} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400">{activeCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            </div>

            <section className="space-y-2">
              <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-stone-700">步骤</h2><button type="button" onClick={addStep} className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800"><Plus size={15} /> 添加步骤</button></div>
              {editingRoutine.steps.map((step, index) => {
                const category = categories.find(item => item.id === step.categoryId);
                const activities = category?.activities.filter(activity => !activity.isArchived) || [];
                return <div key={step.id} className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-2"><span className="w-6 text-center text-xs text-stone-400">{index + 1}</span><select value={step.activityId} onChange={event => updateStep(step.id, { activityId: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 py-2 text-sm">{activities.map(activity => <option key={activity.id} value={activity.id}>{activity.name}</option>)}</select><button type="button" onClick={() => moveStep(index, -1)} className="p-1 text-stone-400 hover:text-stone-700" aria-label="上移"><ArrowUp size={15} /></button><button type="button" onClick={() => moveStep(index, 1)} className="p-1 text-stone-400 hover:text-stone-700" aria-label="下移"><ArrowDown size={15} /></button><button type="button" onClick={() => updateEditing({ steps: editingRoutine.steps.filter(item => item.id !== step.id).map((item, order) => ({ ...item, order })) })} className="p-1 text-stone-400 hover:text-rose-600" aria-label="删除步骤"><X size={15} /></button></div>;
              })}
              {editingRoutine.steps.length === 0 && <div className="rounded-xl border border-dashed border-stone-300 py-8 text-center text-sm text-stone-400">添加至少一个活动步骤</div>}
            </section>

            <button type="button" onClick={() => deleteRoutine(editingRoutine.id)} className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700"><Trash2 size={16} /> 删除 Routine</button>
          </div>
        )}
      </main>
    </div>
  );
};
