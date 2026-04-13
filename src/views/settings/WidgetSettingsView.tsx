/**
 * @file WidgetSettingsView.tsx
 * @input Widget templates, categories, Android bridge availability
 * @output A template-based widget configuration page with editor modal
 * @pos View
 * @description Lets the user create, name, edit, and manage multiple Android timer widget templates, while desktop widget instances only bind to templates.
 * @updated 2026-04-13: Rebuilt the widget settings page from single shared slots to template library management with layered modals.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, LayoutGrid, Pencil, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
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
  renameWidgetTemplate,
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

type NameModalMode = 'create' | 'rename';

export const WidgetSettingsView: React.FC<WidgetSettingsViewProps> = ({
  onBack,
  onToast,
  categories
}) => {
  const [templates, setTemplates] = useState<WidgetTemplate[]>([]);
  const [bindingCounts, setBindingCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [nameModalMode, setNameModalMode] = useState<NameModalMode>('create');
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameTargetTemplateId, setNameTargetTemplateId] = useState<string | null>(null);
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

  const loadTemplates = async (showReloadToast = false) => {
    const localTemplates = normalizeWidgetTemplates(loadWidgetTemplatesFromStorage());
    setTemplates(localTemplates);

    if (!isNativeAndroidWidgetSupported()) {
      setBindingCounts({});
      setIsLoading(false);
      if (showReloadToast) {
        onToast('success', '已重新加载本地小组件模板');
      }
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

      if (showReloadToast) {
        onToast('success', '已重新加载原生小组件模板');
      }
    } catch (error) {
      console.error('[WidgetSettingsView] Failed to load widget templates', error);
      setBindingCounts({});
      if (showReloadToast) {
        onToast('error', '重新加载小组件模板失败');
      }
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

  const openCreateModal = () => {
    setNameModalMode('create');
    setNameDraft(`小组件 ${templates.length + 1}`);
    setNameTargetTemplateId(null);
    setIsNameModalOpen(true);
  };

  const openRenameModal = (template: WidgetTemplate) => {
    setNameModalMode('rename');
    setNameDraft(template.name);
    setNameTargetTemplateId(template.id);
    setIsNameModalOpen(true);
  };

  const handleNameConfirm = async () => {
    const finalName = nameDraft.trim() || `小组件 ${templates.length + 1}`;

    if (nameModalMode === 'create') {
      const nextTemplate = createWidgetTemplate(finalName);
      const didSave = await persistTemplates([...templates, nextTemplate], '已创建小组件模板');
      if (didSave) {
        setEditingTemplateDraft(nextTemplate);
        setIsNameModalOpen(false);
      }
      return;
    }

    const targetTemplate = templates.find((template) => template.id === nameTargetTemplateId);
    if (!targetTemplate) {
      setIsNameModalOpen(false);
      return;
    }

    const nextTemplates = templates.map((template) =>
      template.id === targetTemplate.id ? renameWidgetTemplate(template, finalName) : template
    );
    const didSave = await persistTemplates(nextTemplates, '已重命名小组件模板');
    if (didSave) {
      if (editingTemplateDraft?.id === targetTemplate.id) {
        setEditingTemplateDraft(renameWidgetTemplate(editingTemplateDraft, finalName));
      }
      setIsNameModalOpen(false);
    }
  };

  const openEditor = (template: WidgetTemplate) => {
    setEditingTemplateDraft(rebuildWidgetTemplate(template, categories));
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
      <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onBack} className="text-stone-400 hover:text-stone-600 p-1">
          <ChevronLeft size={24} />
        </button>
        <span className="text-stone-800 font-bold text-lg">小组件模板</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 pb-40 space-y-6">
        <div className="bg-white rounded-[28px] p-6 shadow-sm border border-stone-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 shrink-0">
              <LayoutGrid size={20} />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-stone-800">模板统一编辑，实例只做选择</h3>
              <p className="text-xs text-stone-400 leading-6">
                先在这里创建多个小组件模板并命名。桌面每添加一个小组件实例时，只需要选择绑定哪个模板；后续内容修改仍然统一回到这里完成。
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-stone-800">模板列表</h3>
              <p className="text-xs text-stone-400 mt-1">
                一个模板可以被多个桌面小组件实例复用。
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadTemplates(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-100 text-stone-700 text-sm font-bold active:scale-[0.98] transition-all"
            >
              <RefreshCw size={14} />
              刷新
            </button>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-10 text-center text-sm text-stone-400">
              正在加载小组件模板...
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-10 text-center space-y-3">
              <p className="text-sm font-bold text-stone-700">还没有小组件模板</p>
              <p className="text-xs text-stone-400 leading-6">
                先创建一个模板，之后在桌面添加小组件时就可以选择它。
              </p>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800 text-white font-bold shadow-lg shadow-stone-200 active:scale-[0.98] transition-all"
              >
                <Plus size={16} />
                新建模板
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => {
                const previewSlots = normalizeWidgetTemplateSlots(template.slots).map((slot) =>
                  rebuildWidgetTimerSlotConfig(slot, categories)
                );
                const boundCount = bindingCounts[template.id] || 0;

                return (
                  <button
                    type="button"
                    key={template.id}
                    onClick={() => openEditor(template)}
                    className="w-full text-left rounded-[24px] border border-stone-100 bg-stone-50/70 p-4 hover:border-stone-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-stone-800 truncate">{template.name}</h4>
                          <span className="px-2 py-1 rounded-full bg-stone-100 text-[11px] font-bold text-stone-500">
                            已绑定 {boundCount} 个
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 mt-2">
                          点击进入编辑。桌面实例只会绑定这个模板，不会各自保存独立配置。
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openRenameModal(template);
                          }}
                          className="w-9 h-9 rounded-full bg-white border border-stone-200 text-stone-500 flex items-center justify-center"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteTarget(template);
                          }}
                          className="w-9 h-9 rounded-full bg-white border border-stone-200 text-stone-500 flex items-center justify-center"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[24px] bg-white border border-stone-100 shadow-[0_12px_30px_rgba(15,23,42,0.06)] p-4">
                      <div className="grid grid-cols-2 gap-3">
                        {previewSlots.map((slot) => (
                          <div
                            key={slot.slotIndex}
                            className="aspect-square rounded-full flex items-center justify-center border border-stone-100 text-[28px] leading-none"
                            style={getSoftColorCircleStyle(slot.color || '#EEF2F7', 0.15)}
                          >
                            <span>{slot.icon || '\u2022'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
          <button
            type="button"
            onClick={openCreateModal}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-800 text-white font-bold shadow-lg shadow-stone-200 active:scale-[0.98] transition-all disabled:opacity-60"
            disabled={isSaving}
          >
            <Plus size={16} />
            新建小组件模板
          </button>
        </div>
      </div>

      {isNameModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-sm rounded-[28px] bg-[#fdfbf7] border border-stone-100 shadow-2xl overflow-hidden">
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-stone-800">
                  {nameModalMode === 'create' ? '新建小组件模板' : '重命名小组件模板'}
                </h3>
                <p className="text-xs text-stone-400 mt-2 leading-6">
                  这个名字会在设置页和桌面添加时的模板选择里显示。
                </p>
              </div>

              <input
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                placeholder="输入模板名称"
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 outline-none focus:border-stone-400"
              />
            </div>

            <div className="p-5 bg-white border-t border-stone-100 flex gap-3">
              <button
                type="button"
                onClick={() => setIsNameModalOpen(false)}
                className="flex-1 py-3 rounded-2xl bg-white border border-stone-200 text-stone-600 font-bold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleNameConfirm()}
                disabled={isSaving}
                className="flex-1 py-3 rounded-2xl bg-stone-800 text-white font-bold disabled:opacity-60"
              >
                下一步
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTemplateDraft && (
        <div className="fixed inset-0 z-[70] bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
            <button onClick={() => setEditingTemplateDraft(null)} className="text-stone-400 hover:text-stone-600 p-1">
              <ChevronLeft size={24} />
            </button>
            <div className="min-w-0">
              <span className="text-stone-800 font-bold text-lg truncate block">{editingTemplateDraft.name}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 pb-40 space-y-6">
            <div className="bg-white rounded-[28px] p-6 shadow-sm border border-stone-100">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-stone-800">模板预览</h3>
                  <p className="text-xs text-stone-400 mt-1">
                    桌面绑定这个模板的小组件都会显示成下面这组活动。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openRenameModal(editingTemplateDraft)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-100 text-stone-700 text-sm font-bold"
                >
                  <Pencil size={14} />
                  改名
                </button>
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
          </div>
        </div>
      )}

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
