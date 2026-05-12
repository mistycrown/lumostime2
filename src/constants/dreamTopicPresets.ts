/**
 * @file dreamTopicPresets.ts
 * @input None
 * @output Shared Dream topic preset definitions
 * @description Centralizes the built-in Dream concern-topic presets so the Dream system can seed a stable first-run topic set without hardcoding labels inside services or UI components.
 * @updated 2026-05-12: Added the initial built-in Dream topic presets for schedule, health, energy, execution, and long-term pressure tracking.
 */

export interface DreamTopicPreset {
  id: string;
  title: string;
  note: string;
}

export const DREAM_TOPIC_PRESETS: DreamTopicPreset[] = [
  {
    id: 'preset-schedule',
    title: '作息',
    note: '重点关注晚睡、起床过晚、作息是否继续后移。'
  },
  {
    id: 'preset-health',
    title: '健康',
    note: '重点关注身体不适、恢复状态，以及是否长期硬扛。'
  },
  {
    id: 'preset-energy',
    title: '精力状态',
    note: '重点关注疲劳、透支、白天恢复情况和整体精神波动。'
  },
  {
    id: 'preset-execution',
    title: '执行状态',
    note: '重点关注拖延、卡住、推不动，以及是否能持续推进关键任务。'
  },
  {
    id: 'preset-pressure',
    title: '长期压力',
    note: '重点关注高压是否持续积累，以及任务负荷是否长期偏高。'
  }
];
