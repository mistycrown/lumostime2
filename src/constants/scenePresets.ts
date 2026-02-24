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
        title: '早起打卡', 
        frontText: '完成今日打卡',
        backText: '太棒了，今天又完成一项！',
        action: { type: 'toggleCheck', checkItemId: 'check-1' }
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
        type: 'timer', 
        title: '享用早餐', 
        frontText: '开始美好的一天',
        backText: '享受早餐时光',
        action: { type: 'startTimer', activityId: 'meal', categoryId: 'life' }
      },
      { 
        id: '4', 
        type: 'text', 
        title: '今日提醒', 
        frontText: '点击查看详情',
        content: '记得今天下午3点有组会，提前准备好汇报材料。晚上和朋友约了晚饭，不要忘记哦！',
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
        id: '5', 
        type: 'timer', 
        title: '上课/开会', 
        frontText: '开始专注学习',
        backText: '学习中，保持专注',
        action: { type: 'startTimer', activityId: 'meeting', categoryId: 'study' }
      },
      { 
        id: '6', 
        type: 'timer', 
        title: '阅读文献', 
        frontText: '开始阅读',
        backText: '阅读中，积累知识',
        action: { type: 'startTimer', activityId: 'reading', categoryId: 'study' }
      },
      { 
        id: '7', 
        type: 'todo', 
        title: '完成论文第三章', 
        frontText: '开始这个任务吧',
        backText: '任务进行中，继续努力',
        progress: 3,
        totalAmount: 10,
        action: { type: 'startTodo', todoId: 'todo-1' }
      },
      { 
        id: '8', 
        type: 'stats', 
        title: '今日专注时长', 
        frontText: '查看详细数据',
        statValue: '2h 30m',
        statLabel: '目标: 6小时',
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
        id: '9', 
        type: 'timer', 
        title: '午餐时间', 
        frontText: '享用午餐',
        backText: '用餐中，补充能量',
        action: { type: 'startTimer', activityId: 'meal', categoryId: 'life' }
      },
      { 
        id: '10', 
        type: 'timer', 
        title: '午间小憩', 
        frontText: '休息一下，充充电',
        backText: '休息中，恢复精力',
        action: { type: 'startTimer', activityId: 'nap', categoryId: 'sleep' }
      },
      { 
        id: '11', 
        type: 'checklist', 
        title: '午后散步', 
        frontText: '完成今日打卡',
        backText: '完成了，保持健康习惯',
        action: { type: 'toggleCheck', checkItemId: 'check-2' }
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
        id: '12', 
        type: 'timer', 
        title: '论文写作', 
        frontText: '开始创作吧',
        backText: '写作中，思绪飞扬',
        action: { type: 'startTimer', activityId: 'writing', categoryId: 'study' }
      },
      { 
        id: '13', 
        type: 'timer', 
        title: '代码编程', 
        frontText: '开始编码',
        backText: '编程中，创造价值',
        action: { type: 'startTimer', activityId: 'coding', categoryId: 'study' }
      },
      { 
        id: '14', 
        type: 'todo', 
        title: '修复Bug #234', 
        frontText: '开始修复',
        backText: '修复中，即将完成',
        progress: 0,
        totalAmount: 1,
        action: { type: 'startTodo', todoId: 'todo-2' }
      },
      { 
        id: '15', 
        type: 'navigation', 
        title: '查看时间轴', 
        frontText: '查看更多内容',
        action: { type: 'navigate', targetView: 'timeline' }
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
        id: '16', 
        type: 'timer', 
        title: '晚餐时光', 
        frontText: '享用晚餐',
        backText: '用餐中，享受美食',
        action: { type: 'startTimer', activityId: 'meal', categoryId: 'life' }
      },
      { 
        id: '17', 
        type: 'timer', 
        title: '运动健身', 
        frontText: '动起来，保持活力',
        backText: '运动中，挥洒汗水',
        action: { type: 'startTimer', activityId: 'workout', categoryId: 'self' }
      },
      { 
        id: '18', 
        type: 'checklist', 
        title: '晚间阅读', 
        frontText: '完成今日打卡',
        backText: '完成了，充实的一天',
        action: { type: 'toggleCheck', checkItemId: 'check-3' }
      },
      { 
        id: '19', 
        type: 'navigation', 
        title: '今日回顾', 
        frontText: '回顾今天的收获',
        action: { type: 'navigate', targetView: 'daily-review' }
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
        id: '20', 
        type: 'timer', 
        title: '睡前洗漱', 
        frontText: '准备休息',
        backText: '洗漱中，准备入睡',
        action: { type: 'startTimer', activityId: 'hygiene', categoryId: 'life' }
      },
      { 
        id: '21', 
        type: 'text', 
        title: '明日计划', 
        frontText: '点击查看详情',
        content: '明天上午9点开组会，记得提前准备PPT。下午完成实验报告，晚上整理本周笔记。',
        action: { type: 'none' }
      },
      { 
        id: '22', 
        type: 'checklist', 
        title: '睡前冥想', 
        frontText: '完成今日打卡',
        backText: '完成了，安心入睡',
        action: { type: 'toggleCheck', checkItemId: 'check-4' }
      },
      { 
        id: '23', 
        type: 'stats', 
        title: '今日总结', 
        frontText: '查看详细数据',
        statValue: '8h 45m',
        statLabel: '有效专注时长',
        action: { type: 'none' }
      },
    ]
  }
];
