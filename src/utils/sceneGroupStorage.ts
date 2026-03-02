/**
 * @file sceneGroupStorage.ts
 * @input localStorage sceneGroupState / sceneTimeSlots
 * @output SceneGroupState helpers for load/save/migrate
 * @description 场景组存储工具：统一读写场景组，并兼容旧版 sceneTimeSlots 数据。
 */
import { DEFAULT_SCENE_PRESETS } from '../constants/scenePresets';
import { SceneGroup, SceneGroupAutoSwitchConfig, SceneGroupState, TimeSlot } from '../types';

export const SCENE_GROUP_STATE_KEY = 'sceneGroupState';
export const SCENE_TIME_SLOTS_LEGACY_KEY = 'sceneTimeSlots';
export const DEFAULT_SCENE_GROUP_ID = 'scene-group-default';
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DIGIT_DATE_PATTERN = /^\d{8}$/;

const cloneTimeSlots = (timeSlots: TimeSlot[]): TimeSlot[] => {
  return JSON.parse(JSON.stringify(timeSlots));
};

const normalizeGroupName = (name?: string): string => {
  if (!name) return '默认分组';
  const trimmed = name.trim();
  return trimmed || '默认分组';
};

const normalizeAutoSwitchConfig = (config?: Partial<SceneGroupAutoSwitchConfig>): SceneGroupAutoSwitchConfig => {
  const rawMode = config?.mode;
  const mode = rawMode === 'weekend' || rawMode === 'dateRange' || rawMode === 'weekday' ? rawMode : 'weekday';
  const enabled = Boolean(config?.enabled);
  const startDate = normalizeDateKey(config?.startDate);
  const endDate = normalizeDateKey(config?.endDate);
  const isRangeMode = mode === 'dateRange';

  return {
    enabled,
    mode,
    startDate: isRangeMode && startDate ? startDate : undefined,
    endDate: isRangeMode && endDate ? endDate : undefined
  };
};

const getLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeDateKey = (dateStr?: string): string | undefined => {
  if (!dateStr) return undefined;
  const trimmed = dateStr.trim();
  if (DIGIT_DATE_PATTERN.test(trimmed)) {
    return trimmed;
  }
  if (ISO_DATE_PATTERN.test(trimmed)) {
    return trimmed.replace(/-/g, '');
  }
  return undefined;
};

const isValidDateKey = (dateStr?: string): boolean => {
  return Boolean(dateStr && DIGIT_DATE_PATTERN.test(dateStr));
};

export const buildSceneGroupStateFromLegacySlots = (timeSlots: TimeSlot[]): SceneGroupState => {
  const fallbackSlots = timeSlots.length > 0 ? timeSlots : DEFAULT_SCENE_PRESETS;
  return {
    version: 1,
    activeGroupId: DEFAULT_SCENE_GROUP_ID,
    groups: [
      {
        id: DEFAULT_SCENE_GROUP_ID,
        name: '默认分组',
        timeSlots: cloneTimeSlots(fallbackSlots),
        autoSwitch: {
          enabled: false,
          mode: 'weekday'
        }
      }
    ]
  };
};

const normalizeSceneGroupState = (state: Partial<SceneGroupState> | null | undefined): SceneGroupState => {
  const incomingGroups = Array.isArray(state?.groups) ? state!.groups : [];

  const groups: SceneGroup[] = incomingGroups
    .filter(group => group && typeof group.id === 'string')
    .map(group => ({
      id: group.id,
      name: normalizeGroupName(group.name),
      timeSlots: Array.isArray(group.timeSlots) ? group.timeSlots : [],
      autoSwitch: normalizeAutoSwitchConfig(group.autoSwitch)
    }));

  if (groups.length === 0) {
    return buildSceneGroupStateFromLegacySlots(DEFAULT_SCENE_PRESETS);
  }

  const activeGroupExists = groups.some(group => group.id === state?.activeGroupId);
  const activeGroupId = activeGroupExists ? (state!.activeGroupId as string) : groups[0].id;

  return {
    version: 1,
    activeGroupId,
    groups
  };
};

export const getActiveSceneGroup = (state: SceneGroupState): SceneGroup => {
  const group = state.groups.find(item => item.id === state.activeGroupId);
  return group || state.groups[0];
};

export const isSceneGroupAutoSwitchMatched = (group: SceneGroup, date: Date = new Date()): boolean => {
  const config = normalizeAutoSwitchConfig(group.autoSwitch);
  if (!config.enabled) return false;

  const day = date.getDay();
  if (config.mode === 'weekday') {
    return day >= 1 && day <= 5;
  }

  if (config.mode === 'weekend') {
    return day === 0 || day === 6;
  }

  if (config.mode === 'dateRange') {
    if (!isValidDateKey(config.startDate) || !isValidDateKey(config.endDate)) {
      return false;
    }
    const todayKey = normalizeDateKey(getLocalDateKey(date));
    if (!todayKey) {
      return false;
    }
    return todayKey >= config.startDate! && todayKey <= config.endDate!;
  }

  return false;
};

export const findAutoSwitchTargetGroup = (state: SceneGroupState, date: Date = new Date()): SceneGroup | null => {
  for (const group of state.groups) {
    if (isSceneGroupAutoSwitchMatched(group, date)) {
      return group;
    }
  }
  return null;
};

export const saveSceneGroupStateToStorage = (state: SceneGroupState): SceneGroupState => {
  const normalized = normalizeSceneGroupState(state);
  localStorage.setItem(SCENE_GROUP_STATE_KEY, JSON.stringify(normalized));

  // 兼容旧版本：同步写入当前激活分组的 timeSlots
  const activeGroup = getActiveSceneGroup(normalized);
  localStorage.setItem(SCENE_TIME_SLOTS_LEGACY_KEY, JSON.stringify(activeGroup?.timeSlots || []));

  return normalized;
};

export const loadSceneGroupStateFromStorage = (): SceneGroupState => {
  const sceneGroupStateStr = localStorage.getItem(SCENE_GROUP_STATE_KEY);
  if (sceneGroupStateStr) {
    try {
      const parsed = JSON.parse(sceneGroupStateStr) as Partial<SceneGroupState>;
      const normalized = normalizeSceneGroupState(parsed);
      saveSceneGroupStateToStorage(normalized);
      return normalized;
    } catch (error) {
      console.error('[sceneGroupStorage] Failed to parse sceneGroupState:', error);
    }
  }

  const legacySlotsStr = localStorage.getItem(SCENE_TIME_SLOTS_LEGACY_KEY);
  if (legacySlotsStr) {
    try {
      const parsedLegacySlots = JSON.parse(legacySlotsStr) as TimeSlot[];
      const migrated = buildSceneGroupStateFromLegacySlots(Array.isArray(parsedLegacySlots) ? parsedLegacySlots : []);
      saveSceneGroupStateToStorage(migrated);
      return migrated;
    } catch (error) {
      console.error('[sceneGroupStorage] Failed to parse legacy sceneTimeSlots:', error);
    }
  }

  const defaultState = buildSceneGroupStateFromLegacySlots(DEFAULT_SCENE_PRESETS);
  saveSceneGroupStateToStorage(defaultState);
  return defaultState;
};
