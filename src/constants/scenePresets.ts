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
        frontText: '用一杯水迎接崭新的一天',
        backText: '真棒！身体已经开始苏醒啦',
        action: { type: 'toggleCheck', checkItemId: 'manual_1' }
      },
      { 
        id: '2', 
        type: 'timer', 
        title: '洗漱', 
        frontText: '用洁净开启清爽的一天',
        backText: '完成了！焕然一新的感觉真好',
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
        frontText: '趁着思路清晰，攻克这个任务吧',
        backText: '太棒了！又向目标迈进了一大步',
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
        frontText: '好好享受这顿饭，犒劳辛苦的自己',
        backText: '完成了！美食让生活更有滋味',
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
        frontText: '让代码在指尖流淌，创造属于你的世界',
        backText: '完成了！每一行代码都是你的作品',
        action: { type: 'startTimer', activityId: 'coding', categoryId: 'study' }
      },
      { 
        id: '9', 
        type: 'checklist', 
        title: '写日记/复盘', 
        frontText: '记录今天的思考与成长',
        backText: '完成了！反思让我们变得更好',
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
        frontText: '在书中遇见另一个世界',
        backText: '完成了！阅读让灵魂更加丰盈',
        action: { type: 'startTodo', todoId: 't_hobby_1' }
      },
      { 
        id: '11', 
        type: 'navigation', 
        title: '今日回顾', 
        frontText: '看看今天收获了什么',
        backText: '每一天的努力都值得被看见',
        action: { type: 'navigate', targetView: 'daily-review-today' }
      },
      { 
        id: '12', 
        type: 'checklist', 
        title: '感恩三件事', 
        frontText: '回想今天值得感恩的瞬间',
        backText: '完成了！带着感恩入睡，明天会更好',
        action: { type: 'toggleCheck', checkItemId: 'manual_4' }
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
        id: '14', 
        type: 'navigation', 
        title: '今日统计', 
        frontText: '看看时间都去哪儿了',
        backText: '数据会告诉你，每一刻都有意义',
        action: { type: 'navigate', targetView: 'stats-today' }
      },
      { 
        id: '15', 
        type: 'timer', 
        title: '睡觉', 
        frontText: '放下一切，让身心好好休息',
        backText: '完成了！充足的睡眠是明天的能量源泉',
        action: { type: 'startTimer', activityId: 'sleep_act', categoryId: 'sleep' }
      },
      { 
        id: '16', 
        type: 'checklist', 
        title: '整理床铺', 
        frontText: '为舒适的睡眠做好准备',
        backText: '完成了！整洁的环境带来安心的睡眠',
        action: { type: 'toggleCheck', checkItemId: 'manual_2' }
      },
    ]
  }
];
