/**
 * @file sceneGroupStorage.ts
 * @input localStorage sceneGroupState / sceneTimeSlots
 * @output SceneGroupState helpers for load/save/migrate
 * @description 场景组存储工具：统一读写场景组，并兼容旧版 sceneTimeSlots 数据。
 */
import { DEFAULT_SCENE_PRESETS } from '../constants/scenePresets';
import { SceneGroup, SceneGroupState, TimeSlot } from '../types';

export const SCENE_GROUP_STATE_KEY = 'sceneGroupState';
export const SCENE_TIME_SLOTS_LEGACY_KEY = 'sceneTimeSlots';
export const DEFAULT_SCENE_GROUP_ID = 'scene-group-default';

const cloneTimeSlots = (timeSlots: TimeSlot[]): TimeSlot[] => {
  return JSON.parse(JSON.stringify(timeSlots));
};

const normalizeGroupName = (name?: string): string => {
  if (!name) return '默认分组';
  const trimmed = name.trim();
  return trimmed || '默认分组';
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
        timeSlots: cloneTimeSlots(fallbackSlots)
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
      timeSlots: Array.isArray(group.timeSlots) ? group.timeSlots : []
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
