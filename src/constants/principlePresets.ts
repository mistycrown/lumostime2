/**
 * @file principlePresets.ts
 * @description 原则库预设数据 - 用于初始化和重置功能
 */

export interface PrinciplePreset {
  id: string;
  title: string;
  frontText: string;
  backText: string;
}

export const DEFAULT_PRINCIPLE_PRESETS: PrinciplePreset[] = [
  {
    id: 'preset-1',
    title: '拥抱现实',
    frontText: '痛苦 + 反思 = 进步',
    backText: '接受现实，从中学习'
  },
  {
    id: 'preset-2',
    title: '极度求真',
    frontText: '真理比正确更重要',
    backText: '保持开放心态，追求真相'
  },
  {
    id: 'preset-3',
    title: '五步流程',
    frontText: '目标 → 问题 → 诊断 → 方案 → 执行',
    backText: '系统化解决问题'
  }
];
