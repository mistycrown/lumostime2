/**
 * @file WidgetSettingsView.tsx
 * @input Widget templates, categories, Android bridge availability
 * @output A template-based widget configuration page with multi-size editing
 * @pos View
 * @description Lets the user create, name, resize, edit, and manage multiple Android timer widget templates, while desktop widget instances only bind to templates.
 * @updated 2026-04-13: Removed redundant native refreshes and keep local template state aligned with native save results.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Plus, Save, Trash2 } from 'lucide-react';
import { CustomSelect } from '../../components/CustomSelect';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ToastType } from '../../components/Toast';
import WidgetBridge from '../../plugins/WidgetBridgePlugin';
import {
  DEFAULT_WIDGET_SIZE,
  WidgetTemplate,
  buildWidgetTimerSlotConfig,
  countTemplateBoundInstances,
  createEmptyWidgetTemplateSlot,
  createWidgetTemplate,
  getWidgetGridBySize,
  getWidgetSizeLabel,
  getWidgetSlotCountBySize,
  isNativeAndroidWidgetSupported,
  loadWidgetTemplatesFromStorage,
  normalizeWidgetSize,
  normalizeWidgetTemplateSlots,
  normalizeWidgetTemplates,
  rebuildWidgetTemplate,
  rebuildWidgetTimerSlotConfig,
  saveWidgetTemplatesToStorage,
  updateWidgetTemplateSize,
  updateWidgetTemplateSlots,
  WIDGET_SIZE_OPTIONS
} from '../../services/widgetTimerService';
import { getSoftColorCircleStyle } from '../../utils/colorAdapterUtils';
import { Category } from '../../types';

interface WidgetSettingsViewProps {
  onBack: () => void;
  onToast: (type: ToastType, message: string) => void;
  categories: Category[];
}

const getTemplateSlotSummary = (template: WidgetTemplate): string => {
  const configuredLabels = template.slots
    .map((slot) => slot.label?.trim())
    .filter((label): label is string => Boolean(label));

  if (configuredLabels.length === 0) {
    return '未配置任何活动';
  }

  const previewLabels = configuredLabels.slice(0, 4).join('、');
  const restCount = configuredLabels.length - 4;
  return restCount > 0 ? `${previewLabels} 等 ${configuredLabels.length} 个活动` : previewLabels;
};

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

  const sizeOptions = useMemo(
    () =>
      WIDGET_SIZE_OPTIONS.map((size) => ({
        value: size,
        label: `${getWidgetSizeLabel(size)} · ${getWidgetSlotCountBySize(size)} 个槽位`
      })),
    []
  );

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
      let effectiveBindings = bindings;

      const nextTemplates =
        nativeTemplates.length > 0 ? normalizeWidgetTemplates(nativeTemplates) : localTemplates;

      if (nativeTemplates.length === 0 && localTemplates.length > 0) {
        await WidgetBridge.saveTemplates({ templates: localTemplates });
        const { bindings: refreshedBindings } = await WidgetBridge.getInstanceBindings();
        effectiveBindings = refreshedBindings;
      }

      setTemplates(nextTemplates);
      saveWidgetTemplatesToStorage(nextTemplates);

      const counts = nextTemplates.reduce<Record<string, number>>((accumulator, template) => {
        accumulator[template.id] = countTemplateBoundInstances(effectiveBindings, template.id);
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
    const previousTemplates = templates;
    const previousBindingCounts = bindingCounts;
    setIsSaving(true);

    try {
      if (isNativeAndroidWidgetSupported()) {
        await WidgetBridge.saveTemplates({ templates: normalizedTemplates });
        try {
          const { bindings } = await WidgetBridge.getInstanceBindings();
          const counts = normalizedTemplates.reduce<Record<string, number>>((accumulator, template) => {
            accumulator[template.id] = countTemplateBoundInstances(bindings, template.id);
            return accumulator;
          }, {});
          setBindingCounts(counts);
        } catch (error) {
          console.error('[WidgetSettingsView] Failed to refresh widget binding counts', error);
          setBindingCounts(previousBindingCounts);
        }
      } else {
        setBindingCounts({});
      }

      setTemplates(normalizedTemplates);
      saveWidgetTemplatesToStorage(normalizedTemplates);
      onToast('success', successMessage);
      return true;
    } catch (error) {
      console.error('[WidgetSettingsView] Failed to persist widget templates', error);
      setTemplates(previousTemplates);
      saveWidgetTemplatesToStorage(previousTemplates);
      setBindingCounts(previousBindingCounts);
      onToast('error', '保存小组件模板失败');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTemplate = async () => {
    const nextTemplate = createWidgetTemplate(`小组件 ${templates.length + 1}`, DEFAULT_WIDGET_SIZE);
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

  const updateDraftSize = (sizeValue: string) => {
    const nextSize = normalizeWidgetSize(sizeValue);
    setEditingTemplateDraft((previousDraft) => {
      if (!previousDraft) {
        return previousDraft;
      }
      return updateWidgetTemplateSize(previousDraft, nextSize);
    });
  };

  const updateDraftSlot = (slotIndex: number, value: string) => {
    setEditingTemplateDraft((previousDraft) => {
      if (!previousDraft) {
        return previousDraft;
      }

      const nextSlots = normalizeWidgetTemplateSlots(previousDraft.slots, previousDraft.size);
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

      return updateWidgetTemplateSlots(previousDraft, nextSlots);
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

    return normalizeWidgetTemplateSlots(editingTemplateDraft.slots, editingTemplateDraft.size).map((slot) =>
      rebuildWidgetTimerSlotConfig(slot, categories)
    );
  }, [categories, editingTemplateDraft]);

  const previewGrid = useMemo(() => {
    if (!editingTemplateDraft) {
      return getWidgetGridBySize(DEFAULT_WIDGET_SIZE);
    }
    return getWidgetGridBySize(editingTemplateDraft.size);
  }, [editingTemplateDraft]);

  const draftSlotCount = editingTemplateDraft
    ? getWidgetSlotCountBySize(editingTemplateDraft.size)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#fdfbf7] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] font-serif animate-in slide-in-from-right duration-300">
      <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-stone-100 bg-[#fdfbf7]/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (editingTemplateDraft) {
                setEditingTemplateDraft(null);
                return;
              }
              onBack();
            }}
            className="p-1 text-stone-400 hover:text-stone-600"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-lg font-bold text-stone-800">
            {editingTemplateDraft ? '小组件详情' : '小组件计时器'}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6 pb-40">
        {editingTemplateDraft ? (
          <>
            <div className="space-y-4 rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm">
              <div>
                <h3 className="font-bold text-stone-800">名称</h3>
                <p className="mt-1 text-xs text-stone-400">
                  这里设置的小组件名称，会实时显示在桌面标题区域。
                </p>
              </div>

              <input
                value={editingTemplateDraft.name}
                onChange={(event) => updateDraftName(event.target.value)}
                placeholder="输入小组件名称"
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 outline-none focus:border-stone-400"
              />
            </div>

            <div className="space-y-4 rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm">
              <div>
                <h3 className="font-bold text-stone-800">小组件尺寸</h3>
                <p className="mt-1 text-xs text-stone-400">
                  切换尺寸时会自动保留前面的活动，超出的槽位会裁掉，不足的槽位会补空。
                </p>
              </div>

              <CustomSelect
                value={editingTemplateDraft.size}
                options={sizeOptions}
                onChange={updateDraftSize}
                placeholder="选择一个尺寸"
              />

              <div className="rounded-2xl bg-stone-50 px-4 py-3 text-xs text-stone-500">
                当前尺寸：{getWidgetSizeLabel(editingTemplateDraft.size)}，共 {draftSlotCount} 个活动槽位。
              </div>
            </div>

            <div className="space-y-4 rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm">
              <div>
                <h3 className="font-bold text-stone-800">模板预览</h3>
                <p className="mt-1 text-xs text-stone-400">
                  桌面上同尺寸并绑定这个模板的小组件，会显示成下面的布局。
                </p>
              </div>

              <div className="mx-auto w-full max-w-[320px]">
                <div
                  className="rounded-[28px] border border-stone-100 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]"
                  style={{ aspectRatio: `${previewGrid.columns} / ${previewGrid.rows + 0.45}` }}
                >
                  <div className="mb-3 truncate text-center text-[11px] text-stone-400">
                    {editingTemplateDraft.name.trim() || '标题占位'}
                  </div>
                  <div
                    className="grid h-[calc(100%-24px)] gap-2.5"
                    style={{
                      gridTemplateColumns: `repeat(${previewGrid.columns}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${previewGrid.rows}, minmax(0, 1fr))`
                    }}
                  >
                    {draftPreviewSlots.map((slot) => (
                      <div key={slot.slotIndex} className="flex items-center justify-center">
                        <div
                          className="flex aspect-square h-full w-full max-h-[72px] max-w-[72px] items-center justify-center rounded-full border border-stone-100 text-[28px] leading-none"
                          style={getSoftColorCircleStyle(slot.color || '#EEF2F7', 0.15)}
                        >
                          <span>{slot.icon || '\u2022'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
              <div>
                <h3 className="font-bold text-stone-800">活动槽位</h3>
                <p className="mt-1 text-xs text-stone-400">
                  编辑模板里的活动后，所有绑定这个模板且尺寸一致的桌面实例都会一起更新。
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
                    dropdownPosition="top"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-4 rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
              <div>
                <h3 className="font-bold text-stone-800">保存说明</h3>
                <p className="mt-1 text-xs leading-6 text-stone-400">
                  保存后，绑定这个模板的桌面小组件会一起刷新。桌面实例本身不会单独保存活动配置。
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleSaveDraft()}
                disabled={isSaving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-800 py-3 font-bold text-white shadow-lg shadow-stone-200 transition-all active:scale-[0.98] disabled:opacity-60"
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
          <>
            <button
              type="button"
              onClick={() => void handleCreateTemplate()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50"
              disabled={isSaving}
            >
              <Plus size={16} />
              <span>新建小组件模板</span>
            </button>

            <div className="space-y-3 rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-10 text-center">
              <p className="text-sm font-bold text-stone-700">还没有小组件模板</p>
              <p className="text-xs leading-6 text-stone-400">
                点击上面的“新建小组件模板”创建第一个模板。
              </p>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void handleCreateTemplate()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50"
              disabled={isSaving}
            >
              <Plus size={16} />
              <span>新建小组件模板</span>
            </button>

            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="group flex items-start justify-between rounded-2xl border border-stone-100 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-colors hover:bg-stone-50"
                >
                  <button
                    type="button"
                    onClick={() => openEditor(template)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <h4 className="truncate text-[15px] font-bold text-stone-800">{template.name}</h4>
                    <p className="mt-1 text-xs text-stone-500">
                      尺寸：{getWidgetSizeLabel(template.size)} · {getWidgetSlotCountBySize(template.size)} 个槽位
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-400">
                      标签：{getTemplateSlotSummary(template)}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(template)}
                    className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </>
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
