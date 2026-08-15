/**
 * @file AppAwarenessSettingsView.tsx
 * @input App-awareness templates, bindings, Android installed-app list, and category/activity data
 * @output Workflow-template edits plus app-to-workflow binding updates
 * @pos View (Settings Sub-page)
 * @description Provides the in-app configuration surface for the Android-only app-awareness feature, including linear workflow template editing and target-app workflow bindings.
 * @updated 2026-07-06: Added workflow viability validation before leaving the editor or binding apps so app-awareness cannot save dead-end overlays.
 * @updated 2026-06-21: Added enter-to-create choice options, space-delimited duration inputs, shared custom-select styling, and save-time validation that keeps `开始记录` at the end of the workflow.
 * @updated 2026-06-21: Let workflow number fields keep raw draft input so cooldown seconds, fixed duration, and duration-option lists can be fully cleared and rewritten.
 * @updated 2026-06-21: Rebuilt the settings UX with UTF-8-safe copy, top-level permission gating, cleaner toggle controls, and refined workflow node editors.
 * @updated 2026-07-21: Added dark-mode semantic states for notices, toggles, and selected workflow activities.
 * @updated 2026-07-22: Preserve native line breaks while editing single-choice option lists.
 * @updated 2026-08-12: Unified software and Android hardware back handling so nested workflow pages return to their immediate parent before Settings.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  ListChecks,
  MessageSquareText,
  PlayCircle,
  Plus,
  Search,
  ShieldAlert,
  Smartphone,
  Trash2,
  X
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import {
  AppAwarenessActivityOption,
  AppAwarenessAppBinding,
  AppAwarenessChoiceOption,
  AppAwarenessExpectedDurationStep,
  AppAwarenessSingleChoiceStep,
  AppAwarenessStartRecordStep,
  AppAwarenessStepType,
  AppAwarenessTextQuestionStep,
  AppAwarenessWorkflowStep,
  AppAwarenessWorkflowTemplate,
  Category
} from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { summarizeAppAwarenessTemplate } from '../services/appAwarenessService';
import AppUsage from '../plugins/AppUsagePlugin';
import FocusNotification from '../plugins/FocusNotificationPlugin';
import { CustomSelect } from '../components/CustomSelect';
import { getActiveActivities } from '../utils/archiveUtils';
import { registerHardwareBackHandler } from '../utils/hardwareBackHandlerStack';

interface Props {
  onBack: () => void;
  categories: Category[];
}

interface InstalledApp {
  packageName: string;
  label: string;
  icon: string;
}

type PageMode = 'home' | 'templates' | 'template-editor' | 'bindings';

const flattenActivityOptions = (categories: Category[]): AppAwarenessActivityOption[] =>
  categories.flatMap((category) =>
    getActiveActivities(category).map((activity) => ({
      id: `${category.id}:${activity.id}`,
      categoryId: category.id,
      activityId: activity.id,
      label: activity.name,
      icon: activity.icon
    }))
  );

const getActivityOptionDisplayLabel = (option: Pick<AppAwarenessActivityOption, 'label'>): string => {
  const segments = option.label.split('/');
  return (segments[segments.length - 1] || option.label).trim();
};

const buildChoiceOptionsFromText = (value: string): AppAwarenessChoiceOption[] =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((label, index) => ({
      id: `choice-${index}-${label}`,
      label,
      value: label
    }));

const serializeChoiceOptions = (options: AppAwarenessChoiceOption[]): string =>
  options.map((option) => option.label).join('\n');

const serializeDurationOptions = (options: number[]): string =>
  options.join(' ');

const parseDurationOptions = (value: string): number[] =>
  value
    .split(/\s+/)
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((item) => Math.max(1, Math.round(item)));

const buildStep = (type: AppAwarenessStepType): AppAwarenessWorkflowStep => {
  switch (type) {
    case 'text_question':
      return {
        id: crypto.randomUUID(),
        type,
        title: '填写目的',
        answerKey: 'purpose',
        placeholder: '这次打开它是为了做什么？',
        required: true
      };
    case 'single_choice':
      return {
        id: crypto.randomUUID(),
        type,
        title: '这次主要在做什么',
        answerKey: 'usage',
        options: [
          { id: crypto.randomUUID(), label: '网上冲浪', value: '网上冲浪' },
          { id: crypto.randomUUID(), label: '搜索东西', value: '搜索东西' }
        ],
        required: true
      };
    case 'cooldown_wait':
      return {
        id: crypto.randomUUID(),
        type,
        title: '先冷静一下',
        durationSeconds: 30,
        required: true
      };
    case 'expected_duration':
      return {
        id: crypto.randomUUID(),
        type,
        title: '预计用多久',
        answerKey: 'durationMinutes',
        durationMinutesOptions: [5, 10, 20, 30],
        required: true
      };
    case 'start_record':
      return {
        id: crypto.randomUUID(),
        type,
        title: '选择活动并开始记录',
        answerKey: 'selectedActivity',
        activityOptions: [],
        durationSource: 'from_step',
        allowContinueExtensions: true,
        extensionMinutesOptions: [5, 15, 30],
        required: true
      };
    default:
      return {
        id: crypto.randomUUID(),
        type: 'text_question',
        title: '填写目的',
        answerKey: 'purpose',
        placeholder: '这次打开它是为了做什么？',
        required: true
      };
  }
};

const buildCustomTemplate = (): AppAwarenessWorkflowTemplate => {
  const createdAt = Date.now();
  return {
    id: crypto.randomUUID(),
    name: '新工作流模板',
    description: '',
    isPreset: false,
    enabled: true,
    allowClose: true,
    createdAt,
    updatedAt: createdAt,
    steps: []
  };
};

const getStepIcon = (type: AppAwarenessStepType) => {
  switch (type) {
    case 'text_question':
      return <MessageSquareText size={16} className="text-blue-500" />;
    case 'single_choice':
      return <ListChecks size={16} className="text-amber-500" />;
    case 'cooldown_wait':
      return <Clock3 size={16} className="text-teal-500" />;
    case 'expected_duration':
      return <Clock3 size={16} className="text-violet-500" />;
    case 'start_record':
      return <PlayCircle size={16} className="text-rose-500" />;
    default:
      return <MessageSquareText size={16} className="text-stone-500" />;
  }
};

export const AppAwarenessSettingsView: React.FC<Props> = ({ onBack, categories }) => {
  const {
    appAwarenessTemplates,
    setAppAwarenessTemplates,
    appAwarenessBindings,
    setAppAwarenessBindings,
    appRules
  } = useSettings();
  const { addToast } = useToast();
  const [mode, setMode] = useState<PageMode>('home');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasFloatingPermission, setHasFloatingPermission] = useState(false);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBindingApp, setSelectedBindingApp] = useState<InstalledApp | null>(null);
  const [stepFieldDrafts, setStepFieldDrafts] = useState<Record<string, string>>({});

  const activityOptions = useMemo(() => flattenActivityOptions(categories), [categories]);
  const editingTemplate = useMemo(
    () => appAwarenessTemplates.find((template) => template.id === editingTemplateId) || null,
    [appAwarenessTemplates, editingTemplateId]
  );

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    const load = async () => {
      try {
        const [accessibilityPermission, floatingPermission] = await Promise.all([
          AppUsage.checkAccessibilityPermission(),
          FocusNotification.checkFloatingPermission()
        ]);
        setHasPermission(accessibilityPermission.granted);
        setHasFloatingPermission(floatingPermission.granted);
      } catch (error) {
        console.error('[AppAwarenessSettingsView] Failed to check app-awareness permissions', error);
      }

      setIsLoadingApps(true);
      try {
        const result = await AppUsage.getInstalledApps();
        const nextApps = (result.apps || []).sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'));
        setInstalledApps(nextApps);
      } catch (error) {
        console.error('[AppAwarenessSettingsView] Failed to load installed apps', error);
      } finally {
        setIsLoadingApps(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    const handleResume = async () => {
      try {
        const [accessibilityPermission, floatingPermission] = await Promise.all([
          AppUsage.checkAccessibilityPermission(),
          FocusNotification.checkFloatingPermission()
        ]);
        setHasPermission(accessibilityPermission.granted);
        setHasFloatingPermission(floatingPermission.granted);
      } catch (error) {
        console.error('[AppAwarenessSettingsView] Failed to refresh app-awareness permissions', error);
      }
    };

    document.addEventListener('resume', handleResume);
    return () => document.removeEventListener('resume', handleResume);
  }, []);

  useEffect(() => {
    if (!selectedBindingApp) {
      return;
    }

    const stillExists = installedApps.find((app) => app.packageName === selectedBindingApp.packageName);
    if (!stillExists) {
      setSelectedBindingApp(null);
      return;
    }

    if (stillExists.label !== selectedBindingApp.label || stillExists.icon !== selectedBindingApp.icon) {
      setSelectedBindingApp(stillExists);
    }
  }, [installedApps, selectedBindingApp]);

  const presetTemplates = appAwarenessTemplates.filter((template) => template.isPreset);
  const customTemplates = appAwarenessTemplates.filter((template) => !template.isPreset);
  const filteredApps = installedApps.filter((app) => {
    if (!searchQuery.trim()) {
      return true;
    }

    const query = searchQuery.trim().toLowerCase();
    return app.label.toLowerCase().includes(query) || app.packageName.toLowerCase().includes(query);
  });

  const buildStepFieldDraftKey = (stepId: string, field: string): string => `${stepId}:${field}`;

  const readStepFieldDraft = (stepId: string, field: string, fallback: string): string =>
    stepFieldDrafts[buildStepFieldDraftKey(stepId, field)] ?? fallback;

  const writeStepFieldDraft = (stepId: string, field: string, value: string) => {
    const key = buildStepFieldDraftKey(stepId, field);
    setStepFieldDrafts((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  };

  const clearStepFieldDraft = (stepId: string, field: string) => {
    const key = buildStepFieldDraftKey(stepId, field);
    setStepFieldDrafts((prev) => {
      if (!(key in prev)) {
        return prev;
      }

      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const normalizePositiveIntegerInput = (value: string, fallback: number): number => {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  const canSaveTemplate = (template: AppAwarenessWorkflowTemplate): boolean => {
    const startRecordIndex = template.steps.findIndex((step) => step.type === 'start_record');
    return startRecordIndex < 0 || startRecordIndex === template.steps.length - 1;
  };

  const getTemplateValidationError = (template: AppAwarenessWorkflowTemplate): string | null => {
    if (!canSaveTemplate(template)) {
      return '“开始记录”节点必须放在工作流最后，调整后才能返回保存。';
    }

    const hasActionableStep = template.steps.some((step) => step.type !== 'cooldown_wait');
    if (!hasActionableStep && template.allowClose === false) {
      return '这个工作流没有可操作步骤，并且不允许关闭，会让悬浮面板卡住。';
    }

    for (const step of template.steps) {
      if (step.type === 'single_choice' && step.options.length === 0) {
        return '选择题至少需要 1 个选项。';
      }

      if (step.type === 'expected_duration' && step.durationMinutesOptions.length === 0) {
        return '“预计时长”至少需要 1 个时长选项。';
      }

      if (step.type === 'start_record' && step.activityOptions.length === 0) {
        return '“开始记录”至少需要选择 1 个可记录活动。';
      }

      if (
        step.type === 'start_record' &&
        step.allowContinueExtensions !== false &&
        (step.extensionMinutesOptions || []).length === 0
      ) {
        return '允许延长时，“延长选项”至少需要 1 个时长。';
      }
    }

    return null;
  };

  const handleBackFromTemplateEditor = () => {
    const validationError = editingTemplate ? getTemplateValidationError(editingTemplate) : null;
    if (validationError) {
      addToast('error', validationError);
      return;
    }

    setEditingTemplateId(null);
    setMode('templates');
  };

  const handleInternalBack = (): boolean => {
    if (selectedBindingApp) {
      setSelectedBindingApp(null);
      return true;
    }

    if (mode === 'template-editor') {
      handleBackFromTemplateEditor();
      return true;
    }

    if (mode === 'templates') {
      setEditingTemplateId(null);
      setMode('home');
      return true;
    }

    if (mode === 'bindings') {
      setSearchQuery('');
      setMode('home');
      return true;
    }

    return false;
  };

  useEffect(() => {
    if (mode === 'home' && !selectedBindingApp) {
      return;
    }

    return registerHardwareBackHandler(handleInternalBack);
  }, [mode, selectedBindingApp, handleInternalBack]);

  const syncBindingsSnapshot = async (bindings: AppAwarenessAppBinding[]) => {
    if (Capacitor.getPlatform() !== 'android' || typeof AppUsage.syncAppAwarenessBindings !== 'function') {
      return;
    }

    try {
      const payload = bindings.reduce<Record<string, string>>((acc, binding) => {
        if (binding.enabled) {
          acc[binding.packageName] = binding.workflowTemplateId;
        }
        return acc;
      }, {});
      await AppUsage.syncAppAwarenessBindings({ bindings: payload });
    } catch (error) {
      console.error('[AppAwarenessSettingsView] Failed to sync native app-awareness bindings', error);
    }
  };

  const updateBindings = (nextBindings: AppAwarenessAppBinding[]) => {
    setAppAwarenessBindings(nextBindings);
    void syncBindingsSnapshot(nextBindings);
  };

  const updateTemplate = (
    templateId: string,
    recipe: (template: AppAwarenessWorkflowTemplate) => AppAwarenessWorkflowTemplate
  ) => {
    setAppAwarenessTemplates((prev) =>
      prev.map((template) => (template.id === templateId ? recipe(template) : template))
    );
  };

  const handleDuplicateTemplate = (template: AppAwarenessWorkflowTemplate) => {
    const createdAt = Date.now();
    const duplicate: AppAwarenessWorkflowTemplate = {
      ...template,
      id: crypto.randomUUID(),
      name: `${template.name} 副本`,
      isPreset: false,
      createdAt,
      updatedAt: createdAt,
      steps: template.steps.map((step) => ({ ...step, id: crypto.randomUUID() }))
    };
    setAppAwarenessTemplates((prev) => [...prev, duplicate]);
    setEditingTemplateId(duplicate.id);
    setMode('template-editor');
  };

  const handleCreateTemplate = () => {
    const template = buildCustomTemplate();
    setAppAwarenessTemplates((prev) => [...prev, template]);
    setEditingTemplateId(template.id);
    setMode('template-editor');
  };

  const handleDeleteTemplate = (templateId: string) => {
    const nextBindings = appAwarenessBindings.filter((binding) => binding.workflowTemplateId !== templateId);
    setAppAwarenessTemplates((prev) => prev.filter((template) => template.id !== templateId));
    updateBindings(nextBindings);
    if (editingTemplateId === templateId) {
      setEditingTemplateId(null);
      setMode('templates');
    }
  };

  const handleSelectBinding = (app: InstalledApp, workflowTemplateId: string | null) => {
    const selectedTemplate = workflowTemplateId
      ? appAwarenessTemplates.find((template) => template.id === workflowTemplateId)
      : null;
    const validationError = selectedTemplate ? getTemplateValidationError(selectedTemplate) : null;
    if (validationError) {
      addToast('error', validationError);
      return;
    }

    const nextBindings = workflowTemplateId
      ? [
          ...appAwarenessBindings.filter((binding) => binding.packageName !== app.packageName),
          {
            packageName: app.packageName,
            appName: app.label,
            workflowTemplateId,
            enabled: true,
            updatedAt: Date.now()
          }
        ].sort((left, right) => left.appName.localeCompare(right.appName, 'zh-CN'))
      : appAwarenessBindings.filter((binding) => binding.packageName !== app.packageName);

    updateBindings(nextBindings);
    setSelectedBindingApp(null);
  };

  const renderHeader = (title: string, onLeftClick: () => void, rightSlot?: React.ReactNode) => (
    <div
      className="flex items-center justify-between px-4 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md shrink-0"
      style={{
        height: 'calc(3.5rem + var(--app-safe-area-top))',
        paddingTop: 'var(--app-safe-area-top)'
      }}
    >
      <button onClick={onLeftClick} className="p-2 -ml-2 text-stone-500 hover:text-stone-700">
        <ArrowLeft size={22} />
      </button>
      <div className="font-bold text-stone-800">{title}</div>
      <div className="min-w-[2rem] flex justify-end">{rightSlot}</div>
    </div>
  );

  const renderToggleButton = (checked: boolean, onToggle: () => void, label: string) => (
    <button
      type="button"
      onClick={onToggle}
      className="app-awareness-toggle w-full rounded-2xl border border-stone-200 bg-[#fdfbf7] px-4 py-3 text-stone-700 transition-colors hover:bg-stone-50"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span
          className={`app-awareness-toggle-track relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
            checked ? 'bg-stone-800' : 'bg-stone-200'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </span>
      </div>
    </button>
  );

  const renderPermissionCard = () => {
    const hasAllPermissions = hasPermission && hasFloatingPermission;
    if (hasAllPermissions || Capacitor.getPlatform() !== 'android') {
      return null;
    }

    return (
      <div
        onClick={() => {
          if (!hasPermission) {
            void AppUsage.requestAccessibilityPermission().catch((error) => console.error(error));
            return;
          }

          if (!hasFloatingPermission) {
            void FocusNotification.requestFloatingPermission().catch((error) => console.error(error));
          }
        }}
        className="app-awareness-permission-notice flex cursor-pointer items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100">
            <ShieldAlert size={22} className="text-amber-700" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-amber-950">需要开启必要权限</div>
            <div className="mt-1 text-xs leading-relaxed text-amber-800">
              {!hasPermission && !hasFloatingPermission
                ? '应用感知需要无障碍权限来识别当前前台应用，也需要悬浮窗权限把工作流显示在目标应用上方。'
                : !hasPermission
                  ? '没有无障碍权限时，应用感知无法识别当前前台应用，也不会自动触发悬浮工作流。'
                  : '没有悬浮窗权限时，应用感知即使检测到目标应用，也无法把工作流显示在对应应用上方。'}
            </div>
          </div>
        </div>
        <ChevronRight size={18} className="text-amber-500" />
      </div>
    );
  };

  const renderHome = () => (
    <>
      {renderHeader('应用感知', onBack)}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {renderPermissionCard()}

        <div className="app-awareness-info-notice rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-blue-700">
          <div className="font-bold text-blue-900 mb-1">应用感知覆盖说明</div>
          <p>检测到已绑定应用打开后，应用感知会优先于“应用关联标签规则”生效，并通过悬浮工作流逐步引导用户明确目的、预计时长和活动记录。</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <button
            type="button"
            onClick={() => setMode('templates')}
            className="w-full flex items-center justify-between p-4 text-left active:bg-stone-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                <ListChecks size={18} className="text-stone-700" />
              </div>
              <div>
                <div className="font-semibold text-stone-800">工作流模板</div>
                <div className="text-xs text-stone-500">{appAwarenessTemplates.length} 个模板，支持线性步骤编辑</div>
              </div>
            </div>
            <ChevronRight size={18} className="text-stone-300" />
          </button>
          <button
            type="button"
            onClick={() => setMode('bindings')}
            className="w-full flex items-center justify-between border-t border-stone-100 p-4 text-left active:bg-stone-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                <Smartphone size={18} className="text-stone-700" />
              </div>
              <div>
                <div className="font-semibold text-stone-800">启动应用设置</div>
                <div className="text-xs text-stone-500">{appAwarenessBindings.length} 个应用已绑定工作流</div>
              </div>
            </div>
            <ChevronRight size={18} className="text-stone-300" />
          </button>
        </div>
      </div>
    </>
  );

  const renderTemplates = () => (
    <>
      {renderHeader(
        '工作流模板',
        handleInternalBack,
        <button type="button" onClick={handleCreateTemplate} className="p-2 text-stone-500 hover:text-stone-700">
          <Plus size={18} />
        </button>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <div className="mb-3 pl-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">预设模板</div>
          <div className="space-y-3">
            {presetTemplates.map((template) => (
              <div key={template.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-stone-800">{template.name}</div>
                    <div className="mt-1 text-xs leading-relaxed text-stone-500">{template.description || summarizeAppAwarenessTemplate(template)}</div>
                    <div className="mt-2 text-[11px] text-stone-400">{template.steps.length} 步 · {summarizeAppAwarenessTemplate(template)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDuplicateTemplate(template)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-200"
                  >
                    <Copy size={14} />
                    复制
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 pl-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">我的模板</div>
          <div className="space-y-3">
            {customTemplates.map((template) => (
              <div key={template.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => {
                      setEditingTemplateId(template.id);
                      setMode('template-editor');
                    }}
                  >
                    <div className="font-semibold text-stone-800">{template.name}</div>
                    <div className="mt-1 text-xs leading-relaxed text-stone-500">{template.description || summarizeAppAwarenessTemplate(template)}</div>
                    <div className="mt-2 text-[11px] text-stone-400">{template.steps.length} 步 · {summarizeAppAwarenessTemplate(template)}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTemplateId(template.id);
                        setMode('template-editor');
                      }}
                      className="p-2 text-stone-400 hover:text-stone-700"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-2 text-stone-400 hover:text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {customTemplates.length === 0 && (
              <div className="rounded-2xl border border-dashed border-stone-300 p-5 text-center text-sm text-stone-400">
                还没有自定义模板，点右上角新建一个试试。
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  const renderTemplateEditor = () => {
    if (!editingTemplate) {
      return renderTemplates();
    }

    return (
      <>
        {renderHeader(
          '编辑工作流',
          handleInternalBack
        )}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">模板名称</div>
              <input
                value={editingTemplate.name}
                onChange={(event) => updateTemplate(editingTemplate.id, (template) => ({
                  ...template,
                  name: event.target.value,
                  updatedAt: Date.now()
                }))}
                className="w-full rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-2 text-sm text-stone-800 focus:border-stone-400 focus:outline-none"
                placeholder="模板名称"
              />
            </div>
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">模板说明</div>
              <textarea
                value={editingTemplate.description || ''}
                onChange={(event) => updateTemplate(editingTemplate.id, (template) => ({
                  ...template,
                  description: event.target.value,
                  updatedAt: Date.now()
                }))}
                rows={3}
                className="w-full rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-2 text-sm text-stone-800 focus:border-stone-400 focus:outline-none"
                placeholder="这条工作流适合什么场景？"
              />
            </div>
            {renderToggleButton(
              editingTemplate.allowClose !== false,
              () => updateTemplate(editingTemplate.id, (template) => ({
                ...template,
                allowClose: template.allowClose === false,
                updatedAt: Date.now()
              })),
              '允许关闭'
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">新增节点</div>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['text_question', '问答题'],
                ['single_choice', '选择题'],
                ['cooldown_wait', '冷静节点'],
                ['expected_duration', '预计时长'],
                ['start_record', '开始记录']
              ] as [AppAwarenessStepType, string][]).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateTemplate(editingTemplate.id, (template) => ({
                    ...template,
                    updatedAt: Date.now(),
                    steps: [...template.steps, buildStep(type)]
                  }))}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {editingTemplate.steps.map((step, index) => (
              <div key={step.id} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                    {getStepIcon(step.type)}
                    <span>{index + 1}. {step.title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateTemplate(editingTemplate.id, (template) => {
                        if (index === 0) {
                          return template;
                        }
                        const steps = [...template.steps];
                        [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]];
                        return { ...template, steps, updatedAt: Date.now() };
                      })}
                      className="p-2 text-stone-400 hover:text-stone-700"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateTemplate(editingTemplate.id, (template) => {
                        if (index === template.steps.length - 1) {
                          return template;
                        }
                        const steps = [...template.steps];
                        [steps[index], steps[index + 1]] = [steps[index + 1], steps[index]];
                        return { ...template, steps, updatedAt: Date.now() };
                      })}
                      className="p-2 text-stone-400 hover:text-stone-700"
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateTemplate(editingTemplate.id, (template) => ({
                        ...template,
                        steps: template.steps.filter((item) => item.id !== step.id),
                        updatedAt: Date.now()
                      }))}
                      className="p-2 text-stone-400 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <label className="text-sm">
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">标题</div>
                    <input
                      value={step.title}
                      onChange={(event) => updateTemplate(editingTemplate.id, (template) => ({
                        ...template,
                        steps: template.steps.map((item) => item.id === step.id ? { ...item, title: event.target.value } : item),
                        updatedAt: Date.now()
                      }))}
                      className="w-full rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-2 text-sm text-stone-800 focus:border-stone-400 focus:outline-none"
                    />
                  </label>

                  {(step.type === 'text_question' || step.type === 'single_choice' || step.type === 'expected_duration' || step.type === 'start_record') && (
                    <label className="text-sm">
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">答案键名</div>
                      <input
                        value={step.answerKey}
                        onChange={(event) => updateTemplate(editingTemplate.id, (template) => ({
                          ...template,
                          steps: template.steps.map((item) => item.id === step.id ? { ...item, answerKey: event.target.value } as AppAwarenessWorkflowStep : item),
                          updatedAt: Date.now()
                        }))}
                        className="w-full rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-2 text-sm text-stone-800 focus:border-stone-400 focus:outline-none"
                      />
                    </label>
                  )}

                  {step.type === 'text_question' && (
                    <label className="text-sm">
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">占位文案</div>
                      <input
                        value={step.placeholder || ''}
                        onChange={(event) => updateTemplate(editingTemplate.id, (template) => ({
                          ...template,
                          steps: template.steps.map((item) => item.id === step.id ? { ...item, placeholder: event.target.value } as AppAwarenessTextQuestionStep : item),
                          updatedAt: Date.now()
                        }))}
                        className="w-full rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-2 text-sm text-stone-800 focus:border-stone-400 focus:outline-none"
                      />
                    </label>
                  )}

                  {step.type === 'single_choice' && (
                    <label className="text-sm">
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">选项列表</div>
                      <textarea
                        rows={4}
                        value={readStepFieldDraft(step.id, 'choiceOptions', serializeChoiceOptions(step.options))}
                        onChange={(event) => {
                          const value = event.target.value;
                          writeStepFieldDraft(step.id, 'choiceOptions', value);
                          updateTemplate(editingTemplate.id, (template) => ({
                            ...template,
                            steps: template.steps.map((item) => item.id === step.id ? {
                              ...item,
                              options: buildChoiceOptionsFromText(value)
                            } as AppAwarenessSingleChoiceStep : item),
                            updatedAt: Date.now()
                          }));
                        }}
                        onBlur={() => clearStepFieldDraft(step.id, 'choiceOptions')}
                        className="w-full rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-2 text-sm text-stone-800 focus:border-stone-400 focus:outline-none"
                        placeholder={'网上冲浪\n搜索东西\n处理消息'}
                      />
                    </label>
                  )}

                  {step.type === 'cooldown_wait' && (
                    <label className="text-sm">
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">冷静秒数</div>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={readStepFieldDraft(step.id, 'durationSeconds', String(step.durationSeconds))}
                        onChange={(event) => writeStepFieldDraft(step.id, 'durationSeconds', event.target.value)}
                        onBlur={() => {
                          const rawValue = readStepFieldDraft(step.id, 'durationSeconds', String(step.durationSeconds));
                          updateTemplate(editingTemplate.id, (template) => ({
                            ...template,
                            steps: template.steps.map((item) => item.id === step.id ? {
                              ...item,
                              durationSeconds: normalizePositiveIntegerInput(rawValue, 30)
                            } : item),
                            updatedAt: Date.now()
                          }));
                          clearStepFieldDraft(step.id, 'durationSeconds');
                        }}
                        className="w-full rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-2 text-sm text-stone-800 focus:border-stone-400 focus:outline-none"
                      />
                    </label>
                  )}

                  {step.type === 'expected_duration' && (
                    <label className="text-sm">
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">时长选项（分钟，空格分隔）</div>
                      <input
                        value={readStepFieldDraft(
                          step.id,
                          'durationMinutesOptions',
                          serializeDurationOptions(step.durationMinutesOptions)
                        )}
                        onChange={(event) => writeStepFieldDraft(step.id, 'durationMinutesOptions', event.target.value)}
                        onBlur={() => {
                          const rawValue = readStepFieldDraft(
                            step.id,
                            'durationMinutesOptions',
                            serializeDurationOptions(step.durationMinutesOptions)
                          );
                          updateTemplate(editingTemplate.id, (template) => ({
                            ...template,
                            steps: template.steps.map((item) => item.id === step.id ? {
                              ...item,
                              durationMinutesOptions: parseDurationOptions(rawValue)
                            } as AppAwarenessExpectedDurationStep : item),
                            updatedAt: Date.now()
                          }));
                          clearStepFieldDraft(step.id, 'durationMinutesOptions');
                        }}
                        className="w-full rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-2 text-sm text-stone-800 focus:border-stone-400 focus:outline-none"
                      />
                    </label>
                  )}

                  {step.type === 'start_record' && (
                    <>
                      <label className="text-sm">
                        <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">预计时长来源</div>
                        <CustomSelect
                          value={step.durationSource || 'from_step'}
                          options={[
                            { value: 'from_step', label: '使用前面的“预计时长”节点' },
                            { value: 'fixed', label: '固定时长' },
                            { value: 'none', label: '不带预计时长' }
                          ]}
                          onChange={(value) => updateTemplate(editingTemplate.id, (template) => ({
                            ...template,
                            steps: template.steps.map((item) => item.id === step.id ? {
                              ...item,
                              durationSource: value as AppAwarenessStartRecordStep['durationSource']
                            } as AppAwarenessStartRecordStep : item),
                            updatedAt: Date.now()
                          }))}
                          className="w-full"
                        />
                      </label>

                      {step.durationSource === 'fixed' && (
                        <label className="text-sm">
                          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">固定时长（分钟）</div>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={readStepFieldDraft(step.id, 'defaultDurationMinutes', String(step.defaultDurationMinutes || 15))}
                            onChange={(event) => writeStepFieldDraft(step.id, 'defaultDurationMinutes', event.target.value)}
                            onBlur={() => {
                              const rawValue = readStepFieldDraft(
                                step.id,
                                'defaultDurationMinutes',
                                String(step.defaultDurationMinutes || 15)
                              );
                              updateTemplate(editingTemplate.id, (template) => ({
                                ...template,
                                steps: template.steps.map((item) => item.id === step.id ? {
                                  ...item,
                                  defaultDurationMinutes: normalizePositiveIntegerInput(rawValue, 15)
                                } as AppAwarenessStartRecordStep : item),
                                updatedAt: Date.now()
                              }));
                              clearStepFieldDraft(step.id, 'defaultDurationMinutes');
                            }}
                            className="w-full rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-2 text-sm text-stone-800 focus:border-stone-400 focus:outline-none"
                          />
                        </label>
                      )}

                      {renderToggleButton(
                        step.allowContinueExtensions !== false,
                        () => updateTemplate(editingTemplate.id, (template) => ({
                          ...template,
                          steps: template.steps.map((item) => item.id === step.id ? {
                            ...item,
                            allowContinueExtensions: item.allowContinueExtensions === false
                          } as AppAwarenessStartRecordStep : item),
                          updatedAt: Date.now()
                        })),
                        '倒计时到点后允许继续延长'
                      )}

                      <label className="text-sm">
                        <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">延长选项（分钟，空格分隔）</div>
                        <input
                          value={readStepFieldDraft(
                            step.id,
                            'extensionMinutesOptions',
                            serializeDurationOptions(step.extensionMinutesOptions || [5, 15, 30])
                          )}
                          onChange={(event) => writeStepFieldDraft(step.id, 'extensionMinutesOptions', event.target.value)}
                          onBlur={() => {
                            const rawValue = readStepFieldDraft(
                              step.id,
                              'extensionMinutesOptions',
                              serializeDurationOptions(step.extensionMinutesOptions || [5, 15, 30])
                            );
                            updateTemplate(editingTemplate.id, (template) => ({
                              ...template,
                              steps: template.steps.map((item) => item.id === step.id ? {
                                ...item,
                                extensionMinutesOptions: parseDurationOptions(rawValue)
                              } as AppAwarenessStartRecordStep : item),
                              updatedAt: Date.now()
                            }));
                            clearStepFieldDraft(step.id, 'extensionMinutesOptions');
                          }}
                          className="w-full rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-2 text-sm text-stone-800 focus:border-stone-400 focus:outline-none"
                        />
                      </label>

                      <div>
                        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">可选活动</div>
                        <div className="grid grid-cols-2 gap-2">
                          {activityOptions.map((option) => {
                            const selected = step.activityOptions.some((item) => item.id === option.id);
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => updateTemplate(editingTemplate.id, (template) => ({
                                  ...template,
                                  steps: template.steps.map((item) => {
                                    if (item.id !== step.id) {
                                      return item;
                                    }

                                    const exists = item.activityOptions.some((activity) => activity.id === option.id);
                                    return {
                                      ...item,
                                      activityOptions: exists
                                        ? item.activityOptions.filter((activity) => activity.id !== option.id)
                                        : [...item.activityOptions, option]
                                    } as AppAwarenessStartRecordStep;
                                  }),
                                  updatedAt: Date.now()
                                }))}
                                className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                                  selected
                                    ? 'app-awareness-activity-selected border-stone-700 bg-stone-100 text-stone-900'
                                    : 'border-stone-200 bg-[#fdfbf7] text-stone-600 hover:bg-stone-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{option.icon || '•'}</span>
                                  <span className="truncate">{getActivityOptionDisplayLabel(option)}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {editingTemplate.steps.length === 0 && (
              <div className="rounded-2xl border border-dashed border-stone-300 p-5 text-center text-sm text-stone-400">
                这条工作流还没有节点，先从上面加一个吧。
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderBindings = () => (
    <>
      {renderHeader(
        '启动应用设置',
        handleInternalBack
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="搜索应用名称或包名"
            className="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-9 pr-4 text-sm text-stone-800 focus:border-stone-400 focus:outline-none"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          {isLoadingApps ? (
            <div className="p-8 text-center text-sm text-stone-400">正在加载应用列表...</div>
          ) : filteredApps.length === 0 ? (
            <div className="p-8 text-center text-sm text-stone-400">没有找到匹配的应用。</div>
          ) : (
            filteredApps.map((app, index) => {
              const binding = appAwarenessBindings.find((item) => item.packageName === app.packageName);
              const boundTemplate = binding
                ? appAwarenessTemplates.find((template) => template.id === binding.workflowTemplateId)
                : null;
              const hasTagRule = Boolean(appRules[app.packageName]);
              const isLast = index === filteredApps.length - 1;

              return (
                <button
                  key={app.packageName}
                  type="button"
                  onClick={() => setSelectedBindingApp(app)}
                  className={`flex w-full items-center gap-3 p-4 text-left active:bg-stone-50 ${!isLast ? 'border-b border-stone-100' : ''}`}
                >
                  <div className="h-10 w-10 shrink-0">
                    {app.icon ? (
                      <img src={app.icon} className="h-full w-full rounded-lg object-contain" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-lg bg-stone-100">
                        <Smartphone size={16} className="text-stone-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-stone-800">{app.label}</div>
                    <div className="truncate text-[10px] text-stone-400">{app.packageName}</div>
                    {boundTemplate ? (
                      <div className="mt-1 truncate text-[11px] text-stone-500">已绑定：{boundTemplate.name}</div>
                    ) : (
                      <div className="mt-1 text-[11px] text-stone-400">未绑定工作流</div>
                    )}
                    {boundTemplate && hasTagRule && (
                      <div className="mt-1 text-[11px] text-amber-600">已覆盖此应用的标签规则</div>
                    )}
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-stone-300" />
                </button>
              );
            })
          )}
        </div>
      </div>

      {selectedBindingApp && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-[#fdfbf7]">
          {renderHeader(
            selectedBindingApp.label,
            handleInternalBack,
            <button type="button" onClick={() => setSelectedBindingApp(null)} className="p-2 text-stone-500 hover:text-stone-700">
              <X size={18} />
            </button>
          )}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-3">
              {appAwarenessTemplates.map((template) => {
                const isSelected = appAwarenessBindings.some(
                  (binding) =>
                    binding.packageName === selectedBindingApp.packageName &&
                    binding.workflowTemplateId === template.id
                );

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectBinding(selectedBindingApp, template.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                      isSelected ? 'border-stone-700 bg-stone-100' : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-stone-800">{template.name}</div>
                        <div className="mt-1 text-xs leading-relaxed text-stone-500">{template.description || summarizeAppAwarenessTemplate(template)}</div>
                        <div className="mt-2 text-[11px] text-stone-400">{template.steps.length} 步 · {summarizeAppAwarenessTemplate(template)}</div>
                      </div>
                      {isSelected && <Check size={18} className="shrink-0 text-stone-700" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => handleSelectBinding(selectedBindingApp, null)}
              className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              取消绑定
            </button>
          </div>
        </div>
      )}
    </>
  );

  if (mode === 'templates') {
    return <div className="app-awareness-view fixed inset-0 z-50 flex flex-col bg-[#fdfbf7] font-serif">{renderTemplates()}</div>;
  }

  if (mode === 'template-editor') {
    return <div className="app-awareness-view fixed inset-0 z-50 flex flex-col bg-[#fdfbf7] font-serif">{renderTemplateEditor()}</div>;
  }

  if (mode === 'bindings') {
    return <div className="app-awareness-view fixed inset-0 z-50 flex flex-col bg-[#fdfbf7] font-serif">{renderBindings()}</div>;
  }

  return <div className="app-awareness-view fixed inset-0 z-50 flex flex-col bg-[#fdfbf7] font-serif">{renderHome()}</div>;
};
