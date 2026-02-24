/**
 * @file scenePresets.ts
 * @description 场景设置预设数据 - 用于新手指引和重置功能
 */
import { TimeSlot } from '../types';

export const DEFAULT_SCENE_PRESETS: TimeSlot[] = [
  {
    id: 'morning',
    name: '早晨',
    icon: '🌅',
    startTime: '06:00',
    endTime: '09:00',
    cards: [
      { 
        id: '1', 
        type: 'checklist', 
        title: '起床喝一杯水', 
        frontText: '完成今日打卡',
        backText: '太棒了，今天又完成一项！',
        action: { type: 'toggleCheck', checkItemId: 'manual_1' }
      },
      { 
        id: '2', 
        type: 'timer', 
        title: '洗漱', 
        frontText: '点击开始计时',
        backText: '正在进行中...',
        action: { type: 'startTimer', activityId: 'hygiene', categoryId: 'life' }
      },
      { 
        id: '3', 
        type: 'text', 
        title: '晨间提醒', 
        frontText: '早晨是一天的开始',
        backText: '清晨的第一个小时，决定了一天的基调。用心对待每个早晨，就是在善待自己的人生。',
        action: { type: 'none' }
      },
    ]
  },
  {
    id: 'forenoon',
    name: '上午',
    icon: '☀️',
    startTime: '09:00',
    endTime: '12:00',
    cards: [
      { 
        id: '4', 
        type: 'todo', 
        title: '完成毕业论文第三章', 
        frontText: '点击开始专注',
        backText: '专注进行中...',
        action: { type: 'startTodo', todoId: 't_thesis_1' }
      },
      { 
        id: '5', 
        type: 'text', 
        title: '专注力法则', 
        frontText: '上午是黄金时段',
        backText: '上午9-12点是大脑最清醒的时段，适合处理需要深度思考的重要任务。珍惜这段时光，远离干扰。',
        action: { type: 'none' }
      },
    ]
  },
  {
    id: 'noon',
    name: '中午',
    icon: '🌤️',
    startTime: '12:00',
    endTime: '14:00',
    cards: [
      { 
        id: '6', 
        type: 'timer', 
        title: '午餐', 
        frontText: '点击开始计时',
        backText: '正在用餐中...',
        action: { type: 'startTimer', activityId: 'meal', categoryId: 'life' }
      },
      { 
        id: '7', 
        type: 'text', 
        title: '休息的艺术', 
        frontText: '休息也是生产力',
        backText: '真正的休息不是无所事事，而是让身心得到恢复。午休20分钟，能让下午的效率提升30%。',
        action: { type: 'none' }
      },
    ]
  },
  {
    id: 'afternoon',
    name: '下午',
    icon: '🌞',
    startTime: '14:00',
    endTime: '18:00',
    cards: [
      { 
        id: '8', 
        type: 'timer', 
        title: '代码编程', 
        frontText: '点击开始计时',
        backText: '正在编程中...',
        action: { type: 'startTimer', activityId: 'coding', categoryId: 'study' }
      },
      { 
        id: '9', 
        type: 'checklist', 
        title: '写日记/复盘', 
        frontText: '完成今日打卡',
        backText: '完成了，保持反思习惯',
        action: { type: 'toggleCheck', checkItemId: 'manual_3' }
      },
    ]
  },
  {
    id: 'evening',
    name: '晚上',
    icon: '🌆',
    startTime: '18:00',
    endTime: '22:00',
    cards: [
      { 
        id: '10', 
        type: 'todo', 
        title: '看完《百年孤独》', 
        frontText: '点击开始专注',
        backText: '阅读进行中...',
        action: { type: 'startTodo', todoId: 't_hobby_1' }
      },
      { 
        id: '11', 
        type: 'checklist', 
        title: '感恩三件事', 
        frontText: '完成今日打卡',
        backText: '完成了，充实的一天',
        action: { type: 'toggleCheck', checkItemId: 'manual_4' }
      },
      { 
        id: '12', 
        type: 'text', 
        title: '复盘的力量', 
        frontText: '每日反思成长',
        backText: '不复盘的经历只是经历，复盘后的经历才是经验。每天花10分钟回顾，一年后你会感谢今天的自己。',
        action: { type: 'none' }
      },
    ]
  },
  {
    id: 'night',
    name: '深夜',
    icon: '🌙',
    startTime: '22:00',
    endTime: '06:00',
    cards: [
      { 
        id: '13', 
        type: 'timer', 
        title: '睡觉', 
        frontText: '点击开始计时',
        backText: '正在休息中...',
        action: { type: 'startTimer', activityId: 'sleep_act', categoryId: 'sleep' }
      },
      { 
        id: '14', 
        type: 'checklist', 
        title: '整理床铺', 
        frontText: '完成今日打卡',
        backText: '完成了，准备休息',
        action: { type: 'toggleCheck', checkItemId: 'manual_2' }
      },
      { 
        id: '15', 
        type: 'text', 
        title: '睡眠的重要性', 
        frontText: '优质睡眠是基石',
        backText: '睡眠不是浪费时间，而是在为明天充电。保证7-8小时的优质睡眠，是一切高效工作的前提。',
        action: { type: 'none' }
      },
    ]
  }
];
