/**
 * @file WidgetSettingsView.tsx
 * @input Widget templates, categories, daily check templates, todos, scopes, Android bridge availability
 * @output A template-based widget configuration page with per-slot modal editing
 * @pos View
 * @description Lets the user create, rename, resize, edit, and manage Android widget templates while configuring timer and daily widgets from a shared entry.
 * @updated 2026-04-17: Expanded daily widgets to the full timer size matrix and refreshed slot editor guidance.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal';
import { CustomSelect } from '../../components/CustomSelect';
import {
  DailyWidgetSlotConfigDraft,
  DailyWidgetSlotConfigModal
} from '../../components/DailyWidgetSlotConfigModal';
import { IconRenderer } from '../../components/IconRenderer';
import {
  WidgetSlotConfigDraft,
  WidgetSlotConfigModal
} from '../../components/WidgetSlotConfigModal';
import { ToastType } from '../../components/Toast';
import WidgetBridge from '../../plugins/WidgetBridgePlugin';
import {
  DEFAULT_WIDGET_SIZE,
  DEFAULT_DAILY_WIDGET_COLOR,
  WidgetTemplate,
  WidgetTemplateSlotConfig,
  buildDailyWidgetSlotConfig,
  buildTimerWidgetSlotConfig,
  countTemplateBoundInstances,
  createWidgetTemplate,
  findDailyWidgetBinding,
  getWidgetGridBySize,
  getWidgetSizeLabel,
  getWidgetSizeOptionsByType,
  getWidgetSlotCountBySize,
  isNativeAndroidWidgetSupported,
  loadWidgetTemplatesFromStorage,
  normalizeWidgetSize,
  normalizeWidgetTemplateSlots,
  normalizeWidgetTemplates,
  rebuildDailyWidgetSlotConfig,
  rebuildTimerWidgetSlotConfig,
  rebuildWidgetTemplate,
  saveWidgetTemplatesToStorage,
  updateWidgetTemplateSize,
  updateWidgetTemplateSlots
} from '../../services/widgetService';
import { getSoftColorCircleStyle } from '../../utils/colorAdapterUtils';
import { Category, CheckTemplate, Scope, TodoCategory, TodoItem } from '../../types';

interface WidgetSettingsViewProps {
  onBack: () => void;
  onToast: (type: ToastType, message: string) => void;
  categories: Category[];
  checkTemplates: CheckTemplate[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  scopes: Scope[];
}

const AUTO_SAVE_DELAY_MS = 350;
const PREVIEW_MAX_COLUMNS = 4;
const PREVIEW_MAX_ROWS = 2;
const PREVIEW_TITLE_ROW_RATIO = 0.6;
const WIDGET_TYPE_TABS = [
  { value: 'timer', label: '计时器' },
  { value: 'daily', label: '日课' }
] as const;

type WidgetSettingsTab = (typeof WIDGET_TYPE_TABS)[number]['value'];

const getTemplateSlotSummary = (template: WidgetTemplate): string => {
  const configuredLabels = template.slots
    .map((slot) => slot.label?.trim())
    .filter((label): label is string => Boolean(label));

  if (configuredLabels.length === 0) {
    return '还没有配置任何槽位';
  }

  const previewLabels = configuredLabels.slice(0, 4).join('、');
  return configuredLabels.length > 4 ? `${previewLabels} 等 ${configuredLabels.length} 项` : previewLabels;
};

const toTimerSlotDraft = (slot: WidgetTemplateSlotConfig): WidgetSlotConfigDraft => ({
  slotIndex: slot.slotIndex,
  categoryId: slot.categoryId ?? null,
  activityId: slot.activityId ?? null,
  linkedTodoId: slot.linkedTodoId ?? null,
  scopeIds: slot.scopeIds ?? null,
  customIcon: slot.customIcon ?? null
});

const toDailySlotDraft = (slot: WidgetTemplateSlotConfig): DailyWidgetSlotConfigDraft => ({
  slotIndex: slot.slotIndex,
  checkTemplateId: slot.checkTemplateId ?? null,
  checkItemId: slot.checkItemId ?? null,
  customIcon: slot.customIcon ?? null,
  backgroundColor: slot.color ?? DEFAULT_DAILY_WIDGET_COLOR
});

export const WidgetSettingsView: React.FC<WidgetSettingsViewProps> = ({
  onBack,
  onToast,
  categories,
  checkTemplates,
  todos,
  todoCategories,
  scopes
}) => {
  const [templates, setTemplates] = useState<WidgetTemplate[]>([]);
  const [bindingCounts, setBindingCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedWidgetTab, setSelectedWidgetTab] = useState<WidgetSettingsTab>('timer');
  const [editingTemplateDraft, setEditingTemplateDraft] = useState<WidgetTemplate | null>(null);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WidgetTemplate | null>(null);
  const [isDraftDirty, setIsDraftDirty] = useState(false);

  const timerTemplates = useMemo(
    () => templates.filter((template) => template.widgetType === 'timer'),
    [templates]
  );
  const dailyTemplates = useMemo(
    () => templates.filter((template) => template.widgetType === 'daily'),
    [templates]
  );

  const sizeOptions = useMemo(() => {
    const activeWidgetType = editingTemplateDraft?.widgetType || selectedWidgetTab;
    return getWidgetSizeOptionsByType(activeWidgetType).map((size) => ({
      value: size,
      label: `${getWidgetSizeLabel(size)} · ${getWidgetSlotCountBySize(size)} 个槽位`
    }));
  }, [editingTemplateDraft?.widgetType, selectedWidgetTab]);

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

  useEffect(() => {
    if (!editingTemplateDraft || editingSlotIndex === null) {
      return;
    }

    if (editingSlotIndex >= getWidgetSlotCountBySize(editingTemplateDraft.size)) {
      setEditingSlotIndex(null);
    }
  }, [editingSlotIndex, editingTemplateDraft]);

  const persistTemplates = async (nextTemplates: WidgetTemplate[], successMessage?: string) => {
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
      if (successMessage) {
        onToast('success', successMessage);
      }
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

  const persistDraftNow = async (draft: WidgetTemplate) => {
    const rebuiltDraft = rebuildWidgetTemplate(draft, categories, checkTemplates);
    const nextTemplates = templates.map((template) =>
      template.id === rebuiltDraft.id ? rebuiltDraft : template
    );
    const didSave = await persistTemplates(nextTemplates);
    if (didSave) {
      setIsDraftDirty(false);
      setEditingTemplateDraft(rebuiltDraft);
    }
    return didSave;
  };

  useEffect(() => {
    if (!editingTemplateDraft || !isDraftDirty) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistDraftNow(editingTemplateDraft);
    }, AUTO_SAVE_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [categories, checkTemplates, editingTemplateDraft, isDraftDirty, templates]);

  const handleCreateTemplate = async () => {
    const widgetType = selectedWidgetTab;
    const defaultSize = getWidgetSizeOptionsByType(widgetType)[0] || DEFAULT_WIDGET_SIZE;
    const typeIndex = templates.filter((template) => template.widgetType === widgetType).length + 1;
    const nextTemplate = createWidgetTemplate(
      widgetType === 'daily' ? `日课小组件 ${typeIndex}` : `小组件 ${typeIndex}`,
      defaultSize,
      widgetType
    );
    const didSave = await persistTemplates([...templates, nextTemplate], '已创建小组件模板');
    if (didSave) {
      setEditingTemplateDraft(nextTemplate);
      setEditingSlotIndex(null);
      setIsDraftDirty(false);
    }
  };

  const openEditor = (template: WidgetTemplate) => {
    setEditingTemplateDraft(rebuildWidgetTemplate(template, categories, checkTemplates));
    setEditingSlotIndex(null);
    setIsDraftDirty(false);
  };

  const closeEditor = async () => {
    if (editingTemplateDraft && isDraftDirty) {
      await persistDraftNow(editingTemplateDraft);
    }
    setEditingTemplateDraft(null);
    setEditingSlotIndex(null);
    setIsDraftDirty(false);
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
    setIsDraftDirty(true);
  };

  const updateDraftSize = (sizeValue: string) => {
    const nextSize = normalizeWidgetSize(sizeValue);
    setEditingTemplateDraft((previousDraft) => {
      if (!previousDraft) {
        return previousDraft;
      }

      return updateWidgetTemplateSize(previousDraft, nextSize);
    });
    setIsDraftDirty(true);
  };

  const updateTimerDraftSlot = (draft: WidgetSlotConfigDraft) => {
    setEditingTemplateDraft((previousDraft) => {
      if (
        !previousDraft ||
        previousDraft.widgetType !== 'timer' ||
        !draft.categoryId ||
        !draft.activityId
      ) {
        return previousDraft;
      }

      const category = categories.find((item) => item.id === draft.categoryId);
      const activity = category?.activities.find((item) => item.id === draft.activityId);
      if (!category || !activity) {
        return previousDraft;
      }

      const nextSlots = normalizeWidgetTemplateSlots(
        previousDraft.slots,
        previousDraft.size,
        previousDraft.widgetType
      );
      nextSlots[draft.slotIndex] = buildTimerWidgetSlotConfig(category, activity, draft.slotIndex, {
        linkedTodoId: draft.linkedTodoId,
        scopeIds: draft.scopeIds,
        customIcon: draft.customIcon,
        widgetType: previousDraft.widgetType
      });

      return updateWidgetTemplateSlots(previousDraft, nextSlots);
    });

    setEditingSlotIndex(null);
    setIsDraftDirty(true);
  };

  const updateDailyDraftSlot = (draft: DailyWidgetSlotConfigDraft) => {
    setEditingTemplateDraft((previousDraft) => {
      if (!previousDraft || previousDraft.widgetType !== 'daily' || !draft.checkItemId) {
        return previousDraft;
      }

      const binding = findDailyWidgetBinding(checkTemplates, draft.checkItemId);
      if (!binding) {
        return previousDraft;
      }

      const nextSlots = normalizeWidgetTemplateSlots(
        previousDraft.slots,
        previousDraft.size,
        previousDraft.widgetType
      );
      nextSlots[draft.slotIndex] = buildDailyWidgetSlotConfig(binding, draft.slotIndex, {
        customIcon: draft.customIcon,
        backgroundColor: draft.backgroundColor,
        widgetType: previousDraft.widgetType
      });

      return updateWidgetTemplateSlots(previousDraft, nextSlots);
    });

    setEditingSlotIndex(null);
    setIsDraftDirty(true);
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTarget) {
      return;
    }

    const nextTemplates = templates.filter((template) => template.id !== deleteTarget.id);
    const didSave = await persistTemplates(nextTemplates, '已删除小组件模板');
    if (didSave) {
      if (editingTemplateDraft?.id === deleteTarget.id) {
        setEditingTemplateDraft(null);
        setEditingSlotIndex(null);
        setIsDraftDirty(false);
      }
      setDeleteTarget(null);
    }
  };

  const draftPreviewSlots = useMemo(() => {
    if (!editingTemplateDraft) {
      return [];
    }

    return normalizeWidgetTemplateSlots(
      editingTemplateDraft.slots,
      editingTemplateDraft.size,
      editingTemplateDraft.widgetType
    ).map((slot) =>
      editingTemplateDraft.widgetType === 'daily'
        ? rebuildDailyWidgetSlotConfig(slot, checkTemplates)
        : rebuildTimerWidgetSlotConfig(slot, categories)
    );
  }, [categories, checkTemplates, editingTemplateDraft]);

  const previewGrid = useMemo(() => {
    if (!editingTemplateDraft) {
      return getWidgetGridBySize(DEFAULT_WIDGET_SIZE);
    }
    return getWidgetGridBySize(editingTemplateDraft.size);
  }, [editingTemplateDraft]);

  const previewFrameStyle = useMemo<React.CSSProperties>(() => {
    const maxPreviewHeightUnits = PREVIEW_MAX_ROWS + PREVIEW_TITLE_ROW_RATIO;
    return {
      width: `${(previewGrid.columns / PREVIEW_MAX_COLUMNS) * 100}%`,
      height: `${((previewGrid.rows + PREVIEW_TITLE_ROW_RATIO) / maxPreviewHeightUnits) * 100}%`
    };
  }, [previewGrid]);

  const currentEditingSlot = useMemo(() => {
    if (!editingTemplateDraft || editingSlotIndex === null) {
      return null;
    }

    const normalizedSlots = normalizeWidgetTemplateSlots(
      editingTemplateDraft.slots,
      editingTemplateDraft.size,
      editingTemplateDraft.widgetType
    );
    return normalizedSlots.find((slot) => slot.slotIndex === editingSlotIndex) || null;
  }, [editingSlotIndex, editingTemplateDraft]);

  const renderHomeGuide = (
    <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-5 text-sm text-stone-600">
      <div className="font-bold text-stone-800">使用说明</div>
      <div className="mt-3 space-y-2 text-xs leading-6 text-stone-500">
        <div>第一步：新建小组件模板。</div>
        <div>第二步：在系统桌面添加对应尺寸的小组件。</div>
        <div>第三步：如果同尺寸模板有多个，点击小组件标题可以轮换模板。</div>
      </div>
    </div>
  );

  const renderWidgetTypeSelector = !editingTemplateDraft ? (
    <div className="space-y-3 rounded-[28px] border border-stone-100 bg-white p-4 shadow-sm">
      <div>
        <h3 className="font-bold text-stone-800">小组件类型</h3>
        <p className="mt-1 text-xs text-stone-400">
          先选要配置的小组件类型。计时器和日课共用一套模板管理，但各自槽位的绑定规则不同。
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {WIDGET_TYPE_TABS.map((tab) => {
          const isActive = selectedWidgetTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSelectedWidgetTab(tab.value)}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-all ${
                isActive
                  ? 'border-stone-800 bg-stone-800 text-white shadow-sm'
                  : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300 hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  const visibleTemplates = selectedWidgetTab === 'daily' ? dailyTemplates : timerTemplates;
  const isEditingDaily = editingTemplateDraft?.widgetType === 'daily';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#fdfbf7] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] font-serif animate-in slide-in-from-right duration-300">
      <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-stone-100 bg-[#fdfbf7]/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (editingTemplateDraft) {
                void closeEditor();
                return;
              }
              onBack();
            }}
            className="p-1 text-stone-400 hover:text-stone-600"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-stone-800">
              {editingTemplateDraft
                ? `${editingTemplateDraft.widgetType === 'daily' ? '日课' : '计时器'}小组件详情`
                : '小组件'}
            </span>
            {editingTemplateDraft && (
              <span className="text-[11px] text-stone-400">
                {isSaving ? '自动保存中...' : isDraftDirty ? '等待保存...' : '已自动保存'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6 pb-40">
        {renderWidgetTypeSelector}

        {editingTemplateDraft ? (
          <>
            <div className="space-y-4 rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm">
              <div>
                <h3 className="font-bold text-stone-800">名称</h3>
                <p className="mt-1 text-xs text-stone-400">
                  模板名称会显示在桌面小组件的标题区域，方便区分不同模板。
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
                  {isEditingDaily
                    ? '日课小组件现在支持和计时器一致的尺寸；切换尺寸时会保留前面的槽位配置，多出来的槽位会被裁掉，不足的槽位会自动补空。'
                    : '切换尺寸时会保留前面的槽位配置，多出来的槽位会被裁掉，不足的槽位会自动补空。'}
                </p>
              </div>

              <CustomSelect
                value={editingTemplateDraft.size}
                options={sizeOptions}
                onChange={updateDraftSize}
                placeholder="选择一个尺寸"
              />

              <div className="rounded-2xl bg-stone-50 px-4 py-3 text-xs text-stone-500">
                当前尺寸：{getWidgetSizeLabel(editingTemplateDraft.size)}，共 {getWidgetSlotCountBySize(editingTemplateDraft.size)} 个槽位。
              </div>
            </div>

            <div className="space-y-4 rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm">
              <div>
                <h3 className="font-bold text-stone-800">模板预览</h3>
                <p className="mt-1 text-xs text-stone-400">
                  {isEditingDaily
                    ? '直接点击下面任意一个槽位，就能绑定手动日课，并设置图标覆盖和背景颜色。'
                    : '直接点击下面任意一个槽位，就能设置它的图标、标签、待办和领域。'}
                </p>
              </div>

              <div className="mx-auto w-full max-w-[420px]">
                <div className="relative aspect-[20/13] w-full">
                  <div
                    className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col rounded-[28px] bg-stone-50 px-[4.5%] py-[4%] shadow-[0_10px_24px_rgba(120,113,108,0.08)]"
                    style={previewFrameStyle}
                  >
                    <div className="mb-[6%] truncate text-center text-[11px] text-stone-400">
                      {editingTemplateDraft.name.trim() || '标题占位'}
                    </div>
                    <div
                      className="grid min-h-0 flex-1 gap-[7%]"
                      style={{
                        gridTemplateColumns: `repeat(${previewGrid.columns}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${previewGrid.rows}, minmax(0, 1fr))`
                      }}
                    >
                      {draftPreviewSlots.map((slot) => {
                        const isConfigured = isEditingDaily
                          ? Boolean(slot.checkItemId)
                          : Boolean(slot.activityId && slot.categoryId);

                        return (
                          <button
                            key={slot.slotIndex}
                            type="button"
                            onClick={() => setEditingSlotIndex(slot.slotIndex)}
                            className="flex h-full w-full min-h-0 items-center justify-center rounded-full p-[6%] text-center transition-all hover:-translate-y-0.5"
                            style={{ containerType: 'size' }}
                          >
                            <div
                              className="flex min-h-0 min-w-0 items-center justify-center rounded-full leading-none"
                              style={{
                                ...getSoftColorCircleStyle(slot.color || '#EEF2F7', isConfigured ? 0.18 : 0.1),
                                width: '74cqmin',
                                height: '74cqmin'
                              } as React.CSSProperties}
                            >
                              <IconRenderer icon={slot.icon || '\u2022'} size="42cqmin" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : isLoading ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-10 text-center text-sm text-stone-400">
            正在加载小组件模板...
          </div>
        ) : visibleTemplates.length === 0 ? (
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
              <p className="text-sm font-bold text-stone-700">
                {selectedWidgetTab === 'daily' ? '还没有日课小组件模板' : '还没有小组件模板'}
              </p>
              <p className="text-xs leading-6 text-stone-400">
                {selectedWidgetTab === 'daily'
                  ? '点击上面的“新建小组件模板”，就可以开始配置不同尺寸的桌面日课槽位。'
                  : '点击上面的“新建小组件模板”，就可以开始配置桌面计时槽位。'}
              </p>
            </div>

            {renderHomeGuide}
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
              {visibleTemplates.map((template) => (
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
                      {getTemplateSlotSummary(template)}
                    </p>
                    {bindingCounts[template.id] > 0 && (
                      <p className="mt-1 text-[11px] text-stone-400">
                        已绑定 {bindingCounts[template.id]} 个桌面实例
                      </p>
                    )}
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

            {renderHomeGuide}
          </>
        )}
      </div>

      <WidgetSlotConfigModal
        isOpen={Boolean(editingTemplateDraft && currentEditingSlot && editingTemplateDraft.widgetType === 'timer')}
        draft={currentEditingSlot ? toTimerSlotDraft(currentEditingSlot) : null}
        categories={categories}
        todos={todos}
        todoCategories={todoCategories}
        scopes={scopes}
        onClose={() => setEditingSlotIndex(null)}
        onSave={updateTimerDraftSlot}
      />

      <DailyWidgetSlotConfigModal
        isOpen={Boolean(editingTemplateDraft && currentEditingSlot && editingTemplateDraft.widgetType === 'daily')}
        draft={currentEditingSlot ? toDailySlotDraft(currentEditingSlot) : null}
        checkTemplates={checkTemplates}
        onClose={() => setEditingSlotIndex(null)}
        onSave={updateDailyDraftSlot}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteTemplate()}
        title="删除小组件模板"
        description={
          deleteTarget
            ? `确认删除“${deleteTarget.name}”吗？删除后，仍绑定这个模板的桌面小组件会先显示为空槽位。`
            : ''
        }
        confirmText="删除"
        cancelText="取消"
        type="danger"
      />
    </div>
  );
};
