/**
 * @file manualCheckTemplates.ts
 * @description 手动日课模板常量 - 只包含需要人工打卡的日课项
 * 
 * 手动日课的特点：
 * 1. 瞬时性：不需要持续时间，只需要"做了"或"没做"
 * 2. 主观性：需要人工判断，无法通过时间记录自动检测
 * 3. 一次性：每天只需要做一次的事情，不需要累计计数
 */

import { CheckTemplate } from '../types';

export const DEFAULT_MANUAL_CHECK_TEMPLATES: CheckTemplate[] = [
  {
    id: 'ct_manual_daily',
    title: '手动日课示例',
    icon: '✅',
    items: [
      { 
        id: 'manual_1', 
        content: '起床喝一杯水', 
        icon: '💧',
        type: 'manual',
        manualMode: 'binary'
      },
      { 
        id: 'manual_2', 
        content: '整理床铺', 
        icon: '🛏️',
        type: 'manual',
        manualMode: 'binary'
      },
      { 
        id: 'manual_3', 
        content: '写日记/复盘', 
        icon: '📔',
        type: 'manual',
        manualMode: 'binary'
      },
      { 
        id: 'manual_4', 
        content: '感恩三件事', 
        icon: '🙏',
        type: 'manual',
        manualMode: 'binary'
      },
      { 
        id: 'manual_5', 
        content: '今日目标达成', 
        icon: '🎯',
        type: 'manual',
        manualMode: 'binary'
      }
    ],
    enabled: true,
    order: 2,
    isDaily: true,
    syncToTimeline: false
  }
];
