/**
 * @file WidgetSettingsView.tsx
 * @input Widget templates, categories, Android bridge availability
 * @output A template-based widget configuration page with editor modal
 * @pos View
 * @description Lets the user create, name, edit, and manage multiple Android timer widget templates, while desktop widget instances only bind to templates.
 * @updated 2026-04-13: Simplified template list interactions and moved name editing into the detail page.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Plus, Save, Trash2 } from 'lucide-react';
import { CustomSelect } from '../../components/CustomSelect';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ToastType } from '../../components/Toast';
import WidgetBridge from '../../plugins/WidgetBridgePlugin';
import {
  WidgetTemplate,
  WidgetTemplateSlotConfig,
  buildWidgetTimerSlotConfig,
  countTemplateBoundInstances,
  createEmptyWidgetTemplateSlot,
  createWidgetTemplate,
  isNativeAndroidWidgetSupported,
  loadWidgetTemplatesFromStorage,
  normalizeWidgetTemplateSlots,
  normalizeWidgetTemplates,
  rebuildWidgetTemplate,
  rebuildWidgetTimerSlotConfig,
  saveWidgetTemplatesToStorage,
  updateWidgetTemplateSlots
} from '../../services/widgetTimerService';
import { getSoftColorCircleStyle } from '../../utils/colorAdapterUtils';
import { Category } from '../../types';

interface WidgetSettingsViewProps {
  onBack: () => void;
  onToast: (type: ToastType, message: string) => void;
  categories: Category[];
}

export const WidgetSettingsView: React.FC<WidgetSettingsViewProps> = ({
  onBack,
  onToast,
  categories
}) => {
  const [templates, setTemplates] = useState<WidgetTemplate[]>([]);
  const [bindingCounts, setBindingCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTemplateDraft, setEditingTemplateDraft] = useState<WidgetTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WidgetTemplate | null>(null);

  const activityOptions = useMemo(() => {
    const options = [{ value: '', label: '未配置' }];
    categories.forEach((category) => {
      category.activities.forEach((activity) => {
        options.push({
          value: `${category.id}::${activity.id}`,
          label: `${category.icon} ${category.name} / ${activity.icon} ${activity.name}`
        });
      });
    });
    return options;
  }, [categories]);

  const loadTemplates = async () => {
    const localTemplates = normalizeWidgetTemplates(loadWidgetTemplatesFromStorage());
    setTemplates(localTemplates);

    if (!isNativeAndroidWidgetSupported()) {
      setBindingCounts({});
      setIsLoading(false);
      return;
    }

    try {
      const [{ templates: nativeTemplates }, { bindings }] = await Promise.all([
        WidgetBridge.getTemplates(),
        WidgetBridge.getInstanceBindings()
      ]);

      const nextTemplates =
        nativeTemplates.length > 0 ? normalizeWidgetTemplates(nativeTemplates) : localTemplates;

      if (nativeTemplates.length === 0 && localTemplates.length > 0) {
        await WidgetBridge.saveTemplates({ templates: localTemplates });
        await WidgetBridge.refreshWidget();
      }

      setTemplates(nextTemplates);
      saveWidgetTemplatesToStorage(nextTemplates);

      const counts = nextTemplates.reduce<Record<string, number>>((accumulator, template) => {
        accumulator[template.id] = countTemplateBoundInstances(bindings, template.id);
        return accumulator;
      }, {});
      setBindingCounts(counts);
    } catch (error) {
      console.error('[WidgetSettingsView] Failed to load widget templates', error);
      setBindingCounts({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const persistTemplates = async (nextTemplates: WidgetTemplate[], successMessage: string) => {
    const normalizedTemplates = normalizeWidgetTemplates(nextTemplates);
    setTemplates(normalizedTemplates);
    saveWidgetTemplatesToStorage(normalizedTemplates);
    setIsSaving(true);

    try {
      if (isNativeAndroidWidgetSupported()) {
        await WidgetBridge.saveTemplates({ templates: normalizedTemplates });
        await WidgetBridge.refreshWidget();
        const { bindings } = await WidgetBridge.getInstanceBindings();
        const counts = normalizedTemplates.reduce<Record<string, number>>((accumulator, template) => {
          accumulator[template.id] = countTemplateBoundInstances(bindings, template.id);
          return accumulator;
        }, {});
        setBindingCounts(counts);
      }
      onToast('success', successMessage);
      return true;
    } catch (error) {
      console.error('[WidgetSettingsView] Failed to persist widget templates', error);
      onToast('error', '保存小组件模板失败');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTemplate = async () => {
    const nextTemplate = createWidgetTemplate(`小组件 ${templates.length + 1}`);
    const didSave = await persistTemplates([...templates, nextTemplate], '已创建小组件模板');
    if (didSave) {
      setEditingTemplateDraft(nextTemplate);
    }
  };

  const openEditor = (template: WidgetTemplate) => {
    setEditingTemplateDraft(rebuildWidgetTemplate(template, categories));
  };

  const updateDraftName = (name: string) => {
    setEditingTemplateDraft((previousDraft) => {
      if (!previousDraft) {
        return previousDraft;
      }

      return {
        ...previousDraft,
        name,
        updatedAt: Date.now()
      };
    });
  };

  const updateDraftSlot = (slotIndex: number, value: string) => {
    setEditingTemplateDraft((previousDraft) => {
      if (!previousDraft) {
        return previousDraft;
      }

      const nextSlots = [...previousDraft.slots];
      if (!value) {
        nextSlots[slotIndex] = createEmptyWidgetTemplateSlot(slotIndex);
      } else {
        const [categoryId, activityId] = value.split('::');
        const category = categories.find((item) => item.id === categoryId);
        const activity = category?.activities.find((item) => item.id === activityId);
        if (!category || !activity) {
          return previousDraft;
        }
        nextSlots[slotIndex] = buildWidgetTimerSlotConfig(category, activity, slotIndex);
      }

      return updateWidgetTemplateSlots(previousDraft, normalizeWidgetTemplateSlots(nextSlots));
    });
  };

  const handleSaveDraft = async () => {
    if (!editingTemplateDraft) {
      return;
    }

    const rebuiltDraft = rebuildWidgetTemplate(editingTemplateDraft, categories);
    const nextTemplates = templates.map((template) =>
      template.id === rebuiltDraft.id ? rebuiltDraft : template
    );
    const didSave = await persistTemplates(nextTemplates, '小组件模板已保存');
    if (didSave) {
      setEditingTemplateDraft(null);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTarget) {
      return;
    }

    const bindingCount = bindingCounts[deleteTarget.id] || 0;
    if (bindingCount > 0) {
      onToast('info', '该模板仍被桌面小组件使用，请先移除对应实例');
      setDeleteTarget(null);
      return;
    }

    const nextTemplates = templates.filter((template) => template.id !== deleteTarget.id);
    const didSave = await persistTemplates(nextTemplates, '已删除小组件模板');
    if (didSave) {
      if (editingTemplateDraft?.id === deleteTarget.id) {
        setEditingTemplateDraft(null);
      }
      setDeleteTarget(null);
    }
  };

  const draftPreviewSlots = useMemo(() => {
    if (!editingTemplateDraft) {
      return [];
    }

    return normalizeWidgetTemplateSlots(editingTemplateDraft.slots).map((slot) =>
      rebuildWidgetTimerSlotConfig(slot, categories)
    );
  }, [categories, editingTemplateDraft]);

  return (
    <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-between px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (editingTemplateDraft) {
                setEditingTemplateDraft(null);
                return;
              }
              onBack();
            }}
            className="text-stone-400 hover:text-stone-600 p-1"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-stone-800 font-bold text-lg">
            {editingTemplateDraft ? '小组件详情' : '小组件计时器'}
          </span>
        </div>
        {!editingTemplateDraft && (
          <button
            type="button"
            onClick={() => void handleCreateTemplate()}
            className="flex items-center gap-1 text-sm font-medium text-stone-600 bg-white border border-stone-200 shadow-sm px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors"
            disabled={isSaving}
          >
            <Plus size={16} />
            <span>新建</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 pb-40 space-y-6">
        {editingTemplateDraft ? (
          <>
            <div className="bg-white rounded-[28px] p-6 shadow-sm border border-stone-100 space-y-4">
              <div>
                <h3 className="font-bold text-stone-800">名称</h3>
                <p className="text-xs text-stone-400 mt-1">
                  这里设置的小组件名称，会实时显示在桌面标题区。
                </p>
              </div>

              <input
                value={editingTemplateDraft.name}
                onChange={(event) => updateDraftName(event.target.value)}
                placeholder="输入小组件名称"
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 outline-none focus:border-stone-400"
              />
            </div>

            <div className="bg-white rounded-[28px] p-6 shadow-sm border border-stone-100">
              <div className="mb-4">
                <div>
                  <h3 className="font-bold text-stone-800">模板预览</h3>
                  <p className="text-xs text-stone-400 mt-1">
                    桌面绑定这个模板的小组件都会显示成下面这组活动。
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] bg-white border border-stone-100 shadow-[0_12px_30px_rgba(15,23,42,0.06)] p-5">
                <div className="grid grid-cols-2 gap-3">
                  {draftPreviewSlots.map((slot) => (
                    <div
                      key={slot.slotIndex}
                      className="aspect-square rounded-full flex items-center justify-center border border-stone-100 text-[30px] leading-none"
                      style={getSoftColorCircleStyle(slot.color || '#EEF2F7', 0.15)}
                    >
                      <span>{slot.icon || '\u2022'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 space-y-4">
              <div>
                <h3 className="font-bold text-stone-800">活动槽位</h3>
                <p className="text-xs text-stone-400 mt-1">
                  编辑模板里的 4 个活动后，所有绑定它的桌面实例都会一起更新。
                </p>
              </div>

              {editingTemplateDraft.slots.map((slot, index) => (
                <div key={slot.slotIndex} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-stone-700">槽位 {index + 1}</span>
                    <span className="text-xs text-stone-400">{slot.label || '未配置'}</span>
                  </div>
                  <CustomSelect
                    value={slot.activityId && slot.categoryId ? `${slot.categoryId}::${slot.activityId}` : ''}
                    options={activityOptions}
                    onChange={(value) => updateDraftSlot(slot.slotIndex, value)}
                    placeholder="选择一个活动"
                  />
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 space-y-4">
              <div>
                <h3 className="font-bold text-stone-800">保存说明</h3>
                <p className="text-xs text-stone-400 mt-1 leading-6">
                  保存后，绑定这个模板的桌面小组件会一起刷新。桌面实例本身不会再保存单独配置。
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleSaveDraft()}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-800 text-white font-bold shadow-lg shadow-stone-200 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                <Save size={16} />
                {isSaving ? '保存中...' : '保存模板并刷新'}
              </button>
            </div>
          </>
        ) : isLoading ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-10 text-center text-sm text-stone-400">
            正在加载小组件模板...
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-10 text-center space-y-3">
            <p className="text-sm font-bold text-stone-700">还没有小组件模板</p>
            <p className="text-xs text-stone-400 leading-6">
              点击右上角“新建”创建第一个小组件模板。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => {
              return (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 bg-white border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] rounded-2xl hover:bg-stone-50 transition-colors group"
                >
                  <button
                    type="button"
                    onClick={() => openEditor(template)}
                    className="flex items-center gap-4 flex-1 text-left min-w-0"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-stone-800 text-[15px] truncate">{template.name}</h4>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(template)}
                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteTemplate()}
        title="删除小组件模板"
        description={
          deleteTarget
            ? `确认删除“${deleteTarget.name}”吗？删除后，该模板本身会消失。仍被桌面实例使用的模板不能直接删除。`
            : ''
        }
        confirmText="删除"
        cancelText="取消"
        type="danger"
      />
    </div>
  );
};
