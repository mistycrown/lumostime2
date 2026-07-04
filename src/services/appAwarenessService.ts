/**
 * @file appAwarenessService.ts
 * @input localStorage-backed app-awareness settings and run snapshots
 * @output Normalized workflow templates, app bindings, and active run helpers
 * @pos Service
 * @description Centralizes persistence and normalization for the Android-only app-awareness feature so settings views and runtime hooks share one consistent data model.
 * @updated 2026-06-21: Renamed the preset workflow, removed the default text-length cap, and refreshed normalization copy for the latest app-awareness node model.
 */
import {
  AppAwarenessActivityOption,
  AppAwarenessAppBinding,
  AppAwarenessChoiceOption,
  AppAwarenessExpectedDurationStep,
  AppAwarenessRun,
  AppAwarenessSingleChoiceStep,
  AppAwarenessStartRecordStep,
  AppAwarenessStepType,
  AppAwarenessTextQuestionStep,
  AppAwarenessWorkflowStep,
  AppAwarenessWorkflowTemplate
} from '../types';
import { SETTINGS_KEYS, storage } from '../constants/storageKeys';

const now = () => Date.now();
const PRESET_TEMPLATE_ID = 'preset-redbook-awareness';
const PRESET_TEMPLATE_NAME = '默认觉察';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isChoiceOption = (value: unknown): value is AppAwarenessChoiceOption => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const option = value as Record<string, unknown>;
  return isNonEmptyString(option.id) && isNonEmptyString(option.label) && isNonEmptyString(option.value);
};

const isActivityOption = (value: unknown): value is AppAwarenessActivityOption => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const option = value as Record<string, unknown>;
  return (
    isNonEmptyString(option.id) &&
    isNonEmptyString(option.categoryId) &&
    isNonEmptyString(option.activityId) &&
    isNonEmptyString(option.label) &&
    (option.icon === undefined || typeof option.icon === 'string')
  );
};

const normalizeStepTitle = (value: unknown, fallback: string): string =>
  isNonEmptyString(value) ? value.trim() : fallback;

const normalizeTextQuestionStep = (value: Partial<AppAwarenessTextQuestionStep>): AppAwarenessTextQuestionStep => ({
  id: isNonEmptyString(value.id) ? value.id : crypto.randomUUID(),
  type: 'text_question',
  title: normalizeStepTitle(value.title, '填写目的'),
  description: typeof value.description === 'string' ? value.description : undefined,
  required: value.required !== false,
  answerKey: isNonEmptyString(value.answerKey) ? value.answerKey : 'purpose',
  placeholder: typeof value.placeholder === 'string' ? value.placeholder : '这次打开它是为了做什么？'
});

const normalizeSingleChoiceStep = (value: Partial<AppAwarenessSingleChoiceStep>): AppAwarenessSingleChoiceStep => ({
  id: isNonEmptyString(value.id) ? value.id : crypto.randomUUID(),
  type: 'single_choice',
  title: normalizeStepTitle(value.title, '这次主要在做什么'),
  description: typeof value.description === 'string' ? value.description : undefined,
  required: value.required !== false,
  answerKey: isNonEmptyString(value.answerKey) ? value.answerKey : 'usage',
  options: Array.isArray(value.options) && value.options.every(isChoiceOption)
    ? value.options
    : [
        { id: crypto.randomUUID(), label: '网上冲浪', value: '网上冲浪' },
        { id: crypto.randomUUID(), label: '搜索东西', value: '搜索东西' }
      ]
});

const normalizeExpectedDurationStep = (value: Partial<AppAwarenessExpectedDurationStep>): AppAwarenessExpectedDurationStep => ({
  id: isNonEmptyString(value.id) ? value.id : crypto.randomUUID(),
  type: 'expected_duration',
  title: normalizeStepTitle(value.title, '预计用多久'),
  description: typeof value.description === 'string' ? value.description : undefined,
  required: value.required !== false,
  answerKey: isNonEmptyString(value.answerKey) ? value.answerKey : 'durationMinutes',
  durationMinutesOptions: Array.isArray(value.durationMinutesOptions)
    ? value.durationMinutesOptions.filter(isFiniteNumber).map((item) => Math.max(1, Math.round(item)))
    : [5, 10, 20, 30],
  allowCustomDuration: value.allowCustomDuration === true
});

const normalizeStartRecordStep = (value: Partial<AppAwarenessStartRecordStep>): AppAwarenessStartRecordStep => ({
  id: isNonEmptyString(value.id) ? value.id : crypto.randomUUID(),
  type: 'start_record',
  title: normalizeStepTitle(value.title, '选择活动并开始记录'),
  description: typeof value.description === 'string' ? value.description : undefined,
  required: value.required !== false,
  answerKey: isNonEmptyString(value.answerKey) ? value.answerKey : 'selectedActivity',
  activityOptions: Array.isArray(value.activityOptions) && value.activityOptions.every(isActivityOption)
    ? value.activityOptions
    : [],
  durationSource:
    value.durationSource === 'fixed' || value.durationSource === 'none' || value.durationSource === 'from_step'
      ? value.durationSource
      : 'from_step',
  defaultDurationMinutes: isFiniteNumber(value.defaultDurationMinutes)
    ? Math.max(1, Math.round(value.defaultDurationMinutes))
    : undefined,
  allowContinueExtensions: value.allowContinueExtensions !== false,
  extensionMinutesOptions: Array.isArray(value.extensionMinutesOptions)
    ? value.extensionMinutesOptions.filter(isFiniteNumber).map((item) => Math.max(1, Math.round(item)))
    : [5, 15, 30]
});

const normalizeWorkflowStep = (value: unknown): AppAwarenessWorkflowStep | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const step = value as Partial<AppAwarenessWorkflowStep> & { type?: AppAwarenessStepType };
  switch (step.type) {
    case 'text_question':
      return normalizeTextQuestionStep(step);
    case 'single_choice':
      return normalizeSingleChoiceStep(step);
    case 'cooldown_wait':
      return {
        id: isNonEmptyString(step.id) ? step.id : crypto.randomUUID(),
        type: 'cooldown_wait',
        title: normalizeStepTitle(step.title, '先冷静一下'),
        description: typeof step.description === 'string' ? step.description : undefined,
        required: step.required !== false,
        durationSeconds:
          typeof (step as { durationSeconds?: unknown }).durationSeconds === 'number'
            ? Math.max(1, Math.round((step as { durationSeconds: number }).durationSeconds))
            : 30
      };
    case 'expected_duration':
      return normalizeExpectedDurationStep(step as Partial<AppAwarenessExpectedDurationStep>);
    case 'start_record':
      return normalizeStartRecordStep(step as Partial<AppAwarenessStartRecordStep>);
    default:
      return null;
  }
};

const normalizeWorkflowTemplate = (value: unknown, index = 0): AppAwarenessWorkflowTemplate | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const template = value as Partial<AppAwarenessWorkflowTemplate>;
  const steps = Array.isArray(template.steps)
    ? template.steps.map(normalizeWorkflowStep).filter((item): item is AppAwarenessWorkflowStep => item !== null)
    : [];

  if (!isNonEmptyString(template.name) && !isNonEmptyString(template.id)) {
    return null;
  }

  const normalizedId = isNonEmptyString(template.id) ? template.id : `app-awareness-template-${index + 1}`;
  const isPreset = Boolean(template.isPreset);
  const isDefaultPreset = normalizedId === PRESET_TEMPLATE_ID;

  return {
    id: normalizedId,
    name: isDefaultPreset ? PRESET_TEMPLATE_NAME : isNonEmptyString(template.name) ? template.name.trim() : '未命名模板',
    description: isDefaultPreset
      ? '先冷静，再明确目的和预计时长，最后开始记录。'
      : typeof template.description === 'string'
        ? template.description
        : undefined,
    isPreset,
    enabled: template.enabled !== false,
    allowClose: template.allowClose !== false,
    steps,
    createdAt: isFiniteNumber(template.createdAt) ? template.createdAt : now(),
    updatedAt: isFiniteNumber(template.updatedAt) ? template.updatedAt : now()
  };
};

const normalizeBinding = (value: unknown): AppAwarenessAppBinding | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const binding = value as Partial<AppAwarenessAppBinding>;
  if (!isNonEmptyString(binding.packageName) || !isNonEmptyString(binding.appName) || !isNonEmptyString(binding.workflowTemplateId)) {
    return null;
  }

  return {
    packageName: binding.packageName.trim(),
    appName: binding.appName.trim(),
    workflowTemplateId: binding.workflowTemplateId.trim(),
    enabled: binding.enabled !== false,
    updatedAt: isFiniteNumber(binding.updatedAt) ? binding.updatedAt : now()
  };
};

const normalizeRun = (value: unknown): AppAwarenessRun | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const run = value as Partial<AppAwarenessRun>;
  if (!isNonEmptyString(run.id) || !isNonEmptyString(run.templateId) || !isNonEmptyString(run.packageName) || !isNonEmptyString(run.appName)) {
    return null;
  }

  return {
    id: run.id.trim(),
    templateId: run.templateId.trim(),
    packageName: run.packageName.trim(),
    appName: run.appName.trim(),
    status: typeof run.status === 'string' ? run.status : 'running_step',
    currentStepIndex: isFiniteNumber(run.currentStepIndex) ? Math.max(0, Math.round(run.currentStepIndex)) : 0,
    answers: run.answers && typeof run.answers === 'object' ? run.answers : {},
    startedAt: isFiniteNumber(run.startedAt) ? run.startedAt : now(),
    stepStartedAt: isFiniteNumber(run.stepStartedAt) ? run.stepStartedAt : undefined,
    stepEndsAt: isFiniteNumber(run.stepEndsAt) ? run.stepEndsAt : undefined,
    completedAt: isFiniteNumber(run.completedAt) ? run.completedAt : undefined,
    linkedSessionId: isNonEmptyString(run.linkedSessionId) ? run.linkedSessionId.trim() : undefined,
    expectedTimer:
      run.expectedTimer &&
      isFiniteNumber(run.expectedTimer.startedAt) &&
      isFiniteNumber(run.expectedTimer.durationMinutes) &&
      isFiniteNumber(run.expectedTimer.scheduledEndAt) &&
      Array.isArray(run.expectedTimer.extensionHistory)
        ? {
            startedAt: run.expectedTimer.startedAt,
            durationMinutes: run.expectedTimer.durationMinutes,
            scheduledEndAt: run.expectedTimer.scheduledEndAt,
            extensionHistory: run.expectedTimer.extensionHistory.filter(isFiniteNumber),
            reminderIssuedAt: isFiniteNumber(run.expectedTimer.reminderIssuedAt)
              ? run.expectedTimer.reminderIssuedAt
              : undefined
          }
        : undefined
  };
};

const buildPresetTemplates = (): AppAwarenessWorkflowTemplate[] => {
  const createdAt = now();
  return [
    {
      id: PRESET_TEMPLATE_ID,
      name: PRESET_TEMPLATE_NAME,
      description: '先冷静，再明确目的和预计时长，最后开始记录。',
      isPreset: true,
      enabled: true,
      allowClose: true,
      createdAt,
      updatedAt: createdAt,
      steps: [
        {
          id: crypto.randomUUID(),
          type: 'cooldown_wait',
          title: '先冷静 30 秒',
          durationSeconds: 30
        },
        normalizeTextQuestionStep({
          id: crypto.randomUUID(),
          title: '你现在打开它是为了什么？',
          answerKey: 'purpose',
          placeholder: '例如：搜耳机测评 / 回消息 / 放空一会儿'
        }),
        normalizeSingleChoiceStep({
          id: crypto.randomUUID(),
          title: '这次主要在做什么',
          answerKey: 'usage',
          options: [
            { id: crypto.randomUUID(), label: '网上冲浪', value: '网上冲浪' },
            { id: crypto.randomUUID(), label: '搜索东西', value: '搜索东西' },
            { id: crypto.randomUUID(), label: '处理消息', value: '处理消息' }
          ]
        }),
        normalizeExpectedDurationStep({
          id: crypto.randomUUID(),
          title: '预计用多久',
          answerKey: 'durationMinutes',
          durationMinutesOptions: [5, 10, 20, 30]
        }),
        normalizeStartRecordStep({
          id: crypto.randomUUID(),
          title: '选择活动并开始记录',
          answerKey: 'selectedActivity',
          durationSource: 'from_step'
        })
      ]
    }
  ];
};

const normalizeTemplates = (value: unknown): AppAwarenessWorkflowTemplate[] => {
  if (!Array.isArray(value)) {
    return buildPresetTemplates();
  }

  const normalized = value
    .map((item, index) => normalizeWorkflowTemplate(item, index))
    .filter((item): item is AppAwarenessWorkflowTemplate => item !== null);

  return normalized.length > 0 ? normalized : buildPresetTemplates();
};

const normalizeBindings = (value: unknown): AppAwarenessAppBinding[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const deduped = new Map<string, AppAwarenessAppBinding>();
  value.forEach((item) => {
    const binding = normalizeBinding(item);
    if (binding) {
      deduped.set(binding.packageName, binding);
    }
  });

  return Array.from(deduped.values()).sort((left, right) => left.appName.localeCompare(right.appName, 'zh-CN'));
};

export const summarizeAppAwarenessTemplate = (template: AppAwarenessWorkflowTemplate): string =>
  template.steps.map((step) => {
    switch (step.type) {
      case 'text_question':
        return '问答题';
      case 'single_choice':
        return '选择题';
      case 'cooldown_wait':
        return `冷静 ${step.durationSeconds}s`;
      case 'expected_duration':
        return '预计时长';
      case 'start_record':
        return '开始记录';
      default:
        return '步骤';
    }
  }).join(' · ');

export const appAwarenessService = {
  getTemplates(): AppAwarenessWorkflowTemplate[] {
    return normalizeTemplates(storage.getJSON<unknown>(SETTINGS_KEYS.APP_AWARENESS_TEMPLATES, buildPresetTemplates()));
  },

  saveTemplates(templates: AppAwarenessWorkflowTemplate[]): boolean {
    return storage.setJSON(SETTINGS_KEYS.APP_AWARENESS_TEMPLATES, normalizeTemplates(templates));
  },

  getBindings(): AppAwarenessAppBinding[] {
    return normalizeBindings(storage.getJSON<unknown>(SETTINGS_KEYS.APP_AWARENESS_BINDINGS, []));
  },

  saveBindings(bindings: AppAwarenessAppBinding[]): boolean {
    return storage.setJSON(SETTINGS_KEYS.APP_AWARENESS_BINDINGS, normalizeBindings(bindings));
  },

  getActiveRun(): AppAwarenessRun | null {
    return normalizeRun(storage.getJSON<unknown>(SETTINGS_KEYS.APP_AWARENESS_ACTIVE_RUN, null));
  },

  saveActiveRun(run: AppAwarenessRun | null): boolean {
    if (!run) {
      return storage.remove(SETTINGS_KEYS.APP_AWARENESS_ACTIVE_RUN);
    }

    const normalized = normalizeRun(run);
    return normalized ? storage.setJSON(SETTINGS_KEYS.APP_AWARENESS_ACTIVE_RUN, normalized) : false;
  },

  buildPresetTemplates
};
