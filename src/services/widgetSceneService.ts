/**
 * @file widgetSceneService.ts
 * @input Scene group storage state, categories, todos, and check templates
 * @output Native scene widget payload builders for the dedicated Android 4x3 scene widget
 * @pos Service
 * @description Resolves scene-group time slots into native-friendly timer, todo, and checklist widget items so Android can render and refresh the dedicated scene widget without reimplementing React-side business lookups.
 * @updated 2026-05-02: Added full scene widget payload builders that mirror scene groups, slot timing, and actionable card metadata for the dedicated 4x3 scene widget.
 * @updated 2026-05-05: Mirrored scene card third-party app launch metadata into native payloads so the Android scene widget can match in-app launch behavior.
 */
import type {
  Activity,
  Category,
  CheckTemplate,
  SceneCardData,
  SceneGroupAutoSwitchConfig,
  SceneGroupState,
  TimeSlot,
  TodoItem
} from '../types';
import type {
  DailyWidgetManualMode,
  WidgetBridgeSceneGroup,
  WidgetBridgeSceneGroupAutoSwitchConfig,
  WidgetBridgeSceneGroupSwitchMode,
  WidgetBridgeSceneItem,
  WidgetBridgeScenePayload,
  WidgetBridgeSceneTimeSlot
} from '../plugins/WidgetBridgePlugin';
import { getDailyCheckTemplateMeta } from '../utils/dailyCheckUtils';
import { getColorHexForCharts, getSceneCardColorPresentation } from '../utils/colorAdapterUtils';
import { loadSceneGroupStateFromStorage } from '../utils/sceneGroupStorage';
import {
  getUIIconAssetPathWithFallback,
  uiIconService,
  type UIIconType
} from './uiIconService';

const FALLBACK_SCENE_WIDGET_ICON = '\u2022';
const FALLBACK_SCENE_WIDGET_COLOR = '#E7E5E4';

type ResolvedSceneIcon = {
  icon: string;
  uiIconAssetPath: string | null;
  uiIconFallbackAssetPath: string | null;
};

type ResolvedSceneTodoTarget = {
  activityId: string;
  categoryId: string;
  icon: ResolvedSceneIcon;
  color: string;
  scopeIds: string[] | null;
};

const normalizeSceneSwitchMode = (mode?: string | null): WidgetBridgeSceneGroupSwitchMode =>
  mode === 'auto' ? 'auto' : 'manual';

const normalizeSceneManualMode = (manualMode?: string | null): DailyWidgetManualMode | null => {
  if (manualMode === 'count') {
    return 'count';
  }
  if (manualMode === 'binary') {
    return 'binary';
  }
  return null;
};

const normalizeSceneAutoSwitchMode = (
  mode?: string | null
): WidgetBridgeSceneGroupAutoSwitchConfig['mode'] => {
  if (mode === 'weekday' || mode === 'weekend' || mode === 'dateRange' || mode === 'customWeekdays') {
    return mode;
  }
  return 'disabled';
};

const normalizeSceneIcon = (
  icon?: string | null,
  uiIcon?: string | null,
  fallback: string = FALLBACK_SCENE_WIDGET_ICON
): string => {
  const trimmedIcon = typeof icon === 'string' ? icon.trim() : '';
  if (trimmedIcon) {
    return trimmedIcon;
  }

  const trimmedUiIcon = typeof uiIcon === 'string' ? uiIcon.trim() : '';
  if (trimmedUiIcon) {
    return uiIconService.convertUIIconToEmoji(trimmedUiIcon) || fallback;
  }

  return fallback;
};

const resolveSceneIcon = (
  icon?: string | null,
  uiIcon?: string | null,
  fallback: string = FALLBACK_SCENE_WIDGET_ICON
): ResolvedSceneIcon => {
  const normalizedIcon = normalizeSceneIcon(icon, uiIcon, fallback);
  const trimmedUiIcon = typeof uiIcon === 'string' ? uiIcon.trim() : '';

  if (!trimmedUiIcon || !uiIconService.isCustomTheme()) {
    return {
      icon: normalizedIcon,
      uiIconAssetPath: null,
      uiIconFallbackAssetPath: null
    };
  }

  const parsed = uiIconService.parseIconString(trimmedUiIcon);
  if (!parsed.isUIIcon) {
    return {
      icon: normalizedIcon,
      uiIconAssetPath: null,
      uiIconFallbackAssetPath: null
    };
  }

  const assets = getUIIconAssetPathWithFallback(
    parsed.value as UIIconType,
    uiIconService.getCurrentTheme()
  );

  return {
    icon: normalizedIcon,
    uiIconAssetPath: assets.primary,
    uiIconFallbackAssetPath: assets.fallback
  };
};

const resolveSceneColor = (
  cardColor?: string | null,
  fallbackColor: string = FALLBACK_SCENE_WIDGET_COLOR
): string => {
  const normalizedCardColor = typeof cardColor === 'string' ? cardColor.trim() : '';
  if (normalizedCardColor) {
    return getSceneCardColorPresentation(normalizedCardColor).accentColor;
  }

  const normalizedFallbackColor = typeof fallbackColor === 'string' ? fallbackColor.trim() : '';
  return normalizedFallbackColor || FALLBACK_SCENE_WIDGET_COLOR;
};

const resolveSceneTimerTarget = (
  categories: Category[],
  categoryId?: string | null,
  activityId?: string | null
): { category: Category; activity: Activity } | null => {
  if (!categoryId || !activityId) {
    return null;
  }

  const category = categories.find((item) => item.id === categoryId);
  const activity = category?.activities.find((item) => item.id === activityId);
  if (!category || !activity) {
    return null;
  }

  return { category, activity };
};

const resolveSceneTodoTarget = (
  todo: TodoItem,
  todos: TodoItem[],
  categories: Category[]
): ResolvedSceneTodoTarget | null => {
  const candidateTodos: TodoItem[] = [todo];
  const parentTodo = todo.parentTodoId
    ? todos.find((item) => item.id === todo.parentTodoId)
    : null;

  if (parentTodo) {
    candidateTodos.push(parentTodo);
  }

  for (const candidate of candidateTodos) {
    const linkedCategory = candidate.linkedCategoryId
      ? categories.find((category) => category.id === candidate.linkedCategoryId)
      : undefined;
    const linkedActivity = candidate.linkedActivityId
      ? linkedCategory?.activities.find((activity) => activity.id === candidate.linkedActivityId)
        || categories.flatMap((category) => category.activities).find((activity) => activity.id === candidate.linkedActivityId)
      : undefined;

    if (!linkedActivity) {
      continue;
    }

    const resolvedCategory = linkedCategory
      || categories.find((category) => category.activities.some((activity) => activity.id === linkedActivity.id));

    if (!resolvedCategory) {
      continue;
    }

    return {
      activityId: linkedActivity.id,
      categoryId: resolvedCategory.id,
      icon: resolveSceneIcon(
        linkedActivity.icon || resolvedCategory.icon,
        linkedActivity.uiIcon || resolvedCategory.uiIcon
      ),
      color: getColorHexForCharts(linkedActivity.color || resolvedCategory.themeColor || '') || FALLBACK_SCENE_WIDGET_COLOR,
      scopeIds: todo.defaultScopeIds?.filter(Boolean) ?? null
    };
  }

  return null;
};

const buildTimerSceneItem = (card: SceneCardData, categories: Category[]): WidgetBridgeSceneItem | null => {
  const target = resolveSceneTimerTarget(categories, card.action.categoryId, card.action.activityId);
  if (!target) {
    return null;
  }

  return {
    id: card.id,
    itemType: 'timer',
    title: card.title?.trim() || target.activity.name,
    ...resolveSceneIcon(
      target.activity.icon || target.category.icon,
      target.activity.uiIcon || target.category.uiIcon
    ),
    color: resolveSceneColor(card.color, getColorHexForCharts(target.activity.color || target.category.themeColor || '') || FALLBACK_SCENE_WIDGET_COLOR),
    activityId: target.activity.id,
    categoryId: target.category.id,
    linkedTodoId: null,
    scopeIds: null,
    checkTemplateId: null,
    checkItemId: null,
    checkManualMode: null,
    checkTargetCount: null,
    launchApp: Boolean(card.action.launchApp && card.action.appPackageName),
    appPackageName: card.action.appPackageName?.trim() || null,
    appName: card.action.appName?.trim() || null
  };
};

const buildTodoSceneItem = (
  card: SceneCardData,
  todos: TodoItem[],
  categories: Category[]
): WidgetBridgeSceneItem | null => {
  const todoId = card.action.todoId;
  if (!todoId) {
    return null;
  }

  const todo = todos.find((item) => item.id === todoId);
  if (!todo) {
    return null;
  }

  const target = resolveSceneTodoTarget(todo, todos, categories);
  if (!target) {
    return null;
  }

  return {
    id: card.id,
    itemType: 'todo',
    title: card.title?.trim() || todo.title,
    ...target.icon,
    color: resolveSceneColor(card.color, target.color),
    activityId: target.activityId,
    categoryId: target.categoryId,
    linkedTodoId: todo.id,
    scopeIds: target.scopeIds,
    checkTemplateId: null,
    checkItemId: null,
    checkManualMode: null,
    checkTargetCount: null,
    launchApp: Boolean(card.action.launchApp && card.action.appPackageName),
    appPackageName: card.action.appPackageName?.trim() || null,
    appName: card.action.appName?.trim() || null
  };
};

const buildChecklistSceneItem = (
  card: SceneCardData,
  checkTemplates: CheckTemplate[]
): WidgetBridgeSceneItem | null => {
  const checkItemId = card.action.checkItemId;
  if (!checkItemId) {
    return null;
  }

  const binding = getDailyCheckTemplateMeta(checkTemplates, checkItemId);
  if (!binding) {
    return null;
  }

  return {
    id: card.id,
    itemType: 'checklist',
    title: card.title?.trim() || binding.content,
    ...resolveSceneIcon(binding.icon, binding.uiIcon, '\u2713'),
    color: resolveSceneColor(card.color, FALLBACK_SCENE_WIDGET_COLOR),
    activityId: null,
    categoryId: null,
    linkedTodoId: null,
    scopeIds: null,
    checkTemplateId: binding.checkTemplateId,
    checkItemId: binding.checkItemId,
    checkManualMode: normalizeSceneManualMode(binding.manualMode),
    checkTargetCount: binding.targetCount,
    launchApp: false,
    appPackageName: null,
    appName: null
  };
};

const buildSceneItemsForTimeSlot = (
  timeSlot: TimeSlot,
  categories: Category[],
  todos: TodoItem[],
  checkTemplates: CheckTemplate[]
): WidgetBridgeSceneItem[] =>
  timeSlot.cards.reduce<WidgetBridgeSceneItem[]>((items, card) => {
    let nextItem: WidgetBridgeSceneItem | null = null;

    if (card.type === 'timer' && card.action.type === 'startTimer') {
      nextItem = buildTimerSceneItem(card, categories);
    } else if (card.type === 'todo' && card.action.type === 'startTodo') {
      nextItem = buildTodoSceneItem(card, todos, categories);
    } else if (card.type === 'checklist' && card.action.type === 'toggleCheck') {
      nextItem = buildChecklistSceneItem(card, checkTemplates);
    }

    if (nextItem) {
      items.push(nextItem);
    }
    return items;
  }, []);

const buildSceneTimeSlotPayload = (
  timeSlot: TimeSlot,
  categories: Category[],
  todos: TodoItem[],
  checkTemplates: CheckTemplate[]
): WidgetBridgeSceneTimeSlot => ({
  id: timeSlot.id,
  name: timeSlot.name,
  icon: normalizeSceneIcon(timeSlot.icon, timeSlot.uiIcon, FALLBACK_SCENE_WIDGET_ICON),
  startTime: timeSlot.startTime,
  endTime: timeSlot.endTime,
  disableAutoSwitch: Boolean(timeSlot.disableAutoSwitch),
  items: buildSceneItemsForTimeSlot(timeSlot, categories, todos, checkTemplates)
});

const buildSceneAutoSwitchConfig = (
  config?: SceneGroupAutoSwitchConfig | null
): WidgetBridgeSceneGroupAutoSwitchConfig => ({
  mode: normalizeSceneAutoSwitchMode(config?.mode),
  startDate: config?.startDate || null,
  endDate: config?.endDate || null,
  weekdays: config?.weekdays?.filter((day) => Number.isInteger(day)) ?? null
});

const buildSceneGroupPayload = (
  group: { id: string; name: string; autoSwitch?: SceneGroupAutoSwitchConfig; timeSlots: TimeSlot[] },
  categories: Category[],
  todos: TodoItem[],
  checkTemplates: CheckTemplate[]
): WidgetBridgeSceneGroup => ({
  id: group.id,
  name: group.name,
  autoSwitch: buildSceneAutoSwitchConfig(group.autoSwitch),
  timeSlots: group.timeSlots.map((timeSlot) => buildSceneTimeSlotPayload(timeSlot, categories, todos, checkTemplates))
});

export const buildSceneWidgetPayload = ({
  sceneGroupState,
  categories,
  todos,
  checkTemplates,
  now = Date.now()
}: {
  sceneGroupState: SceneGroupState;
  categories: Category[];
  todos: TodoItem[];
  checkTemplates: CheckTemplate[];
  now?: number;
}): WidgetBridgeScenePayload => ({
  switchMode: normalizeSceneSwitchMode(sceneGroupState.switchMode),
  activeGroupId: sceneGroupState.activeGroupId || null,
  groups: sceneGroupState.groups.map((group) => buildSceneGroupPayload(group, categories, todos, checkTemplates)),
  syncedAt: now
});

export const buildSceneWidgetPayloadFromStorage = ({
  categories,
  todos,
  checkTemplates,
  now = Date.now()
}: {
  categories: Category[];
  todos: TodoItem[];
  checkTemplates: CheckTemplate[];
  now?: number;
}): WidgetBridgeScenePayload =>
  buildSceneWidgetPayload({
    sceneGroupState: loadSceneGroupStateFromStorage(),
    categories,
    todos,
    checkTemplates,
    now
  });
