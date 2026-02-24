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
        frontText: '一杯清水，唤醒沉睡的细胞',
        backText: '身体开始苏醒，新的一天从此刻流淌',
        action: { type: 'toggleCheck', checkItemId: 'manual_1' }
      },
      { 
        id: '2', 
        type: 'checklist', 
        title: '整理床铺', 
        frontText: '整理空间，也是整理内心',
        backText: '「外在的秩序，带来内在的平静。」—— 《怦然心动的人生整理魔法》',
        action: { type: 'toggleCheck', checkItemId: 'manual_2' }
      },
      { 
        id: '3', 
        type: 'timer', 
        title: '洗漱', 
        frontText: '以洁净之心，迎接清晨的光',
        backText: '焕然一新，如同晨露洗过的叶片',
        action: { type: 'startTimer', activityId: 'hygiene', categoryId: 'life' }
      },
      { 
        id: '4', 
        type: 'timer', 
        title: '早餐', 
        frontText: '用一顿好早餐，开启充实的一天',
        backText: '晨间的仪式感，从好好吃饭开始',
        action: { type: 'startTimer', activityId: 'meal', categoryId: 'life' }
      },
      { 
        id: '5', 
        type: 'principle', 
        title: '拥抱现实', 
        frontText: '痛苦 + 反思 = 进步',
        backText: '面对现实，不要逃避问题。每个挫折都是进化的机会，关键在于从中学习和成长。',
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
        id: '6', 
        type: 'todo', 
        title: '完成毕业论文第三章', 
        frontText: '趁思维清明，攻克今日之峰',
        backText: '每一步攀登，都让山顶更近一寸',
        action: { type: 'startTodo', todoId: 't_thesis_1' }
      },
      { 
        id: '7', 
        type: 'principle', 
        title: '极度求真', 
        frontText: '真理比正确更重要',
        backText: '不要让自我妨碍真相。保持开放心态，积极寻求不同意见，勇于承认错误。',
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
        id: '8', 
        type: 'timer', 
        title: '午餐', 
        frontText: '慢食，是对生活的温柔以待',
        backText: '每一口咀嚼，都是对当下的感知',
        action: { type: 'startTimer', activityId: 'meal', categoryId: 'life' }
      },
      { 
        id: '9', 
        type: 'timer', 
        title: '午睡', 
        frontText: '让身心在午后小憩中复苏',
        backText: '短暂的休憩，是下午效率的源泉',
        action: { type: 'startTimer', activityId: 'nap', categoryId: 'sleep' }
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
        id: '10', 
        type: 'timer', 
        title: '代码编程', 
        frontText: '在逻辑与创造之间，构筑你的世界',
        backText: '专注的时光，是送给未来的礼物',
        action: { type: 'startTimer', activityId: 'coding', categoryId: 'study' }
      },
      { 
        id: '11', 
        type: 'principle', 
        title: '五步流程', 
        frontText: '目标 → 问题 → 诊断 → 方案 → 执行',
        backText: '这是实现任何目标的通用公式。每一步都要做到位，不要跳过任何环节。',
        action: { type: 'none' }
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
        id: '12', 
        type: 'timer', 
        title: '晚餐', 
        frontText: '在暮色中，享受一天的收尾时光',
        backText: '晚餐的温度，是生活的温柔',
        action: { type: 'startTimer', activityId: 'meal', categoryId: 'life' }
      },
      { 
        id: '13', 
        type: 'timer', 
        title: '运动健身', 
        frontText: '让身体舒展，让心灵自由',
        backText: '汗水是身体写给自己的情书',
        action: { type: 'startTimer', activityId: 'workout', categoryId: 'self' }
      },
      { 
        id: '14', 
        type: 'todo', 
        title: '看完《百年孤独》', 
        frontText: '在文字的迷宫里，寻找另一个自己',
        backText: '阅读，是灵魂的远行',
        action: { type: 'startTodo', todoId: 't_hobby_1' }
      },
      { 
        id: '15', 
        type: 'checklist', 
        title: '写日记/复盘', 
        frontText: '记录，是与自己的对话',
        backText: '「未经审视的人生不值得过。」—— 苏格拉底',
        action: { type: 'toggleCheck', checkItemId: 'manual_3' }
      },
      { 
        id: '16', 
        type: 'navigation', 
        title: '今日回顾', 
        frontText: '回望来时路',
        backText: '「每一天都是一次小小的人生。」—— 《微习惯》斯蒂芬·盖斯',
        action: { type: 'navigate', targetView: 'daily-review-today' }
      },
      { 
        id: '17', 
        type: 'checklist', 
        title: '感恩三件事', 
        frontText: '在平凡中，发现值得感激的光',
        backText: '「感恩是通往幸福的最短路径。」—— 《幸福的方法》泰勒·本-沙哈尔',
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
        id: '18', 
        type: 'stats', 
        title: '今日深度工作', 
        frontText: '回望今日的专注时光',
        backText: '每一分钟的投入，都在塑造更好的自己',
        action: { type: 'none' },
        filterActivityIds: ['coding', 'writing', 'reading', 'self_study'],
        enableGoal: true,
        goalValue: 180, // 3小时
        goalType: 'min'
      },
      { 
        id: '19', 
        type: 'stats', 
        title: '今日运动时长', 
        frontText: '身体的觉醒，从规律开始',
        backText: '「运动不是为了惩罚身体，而是为了庆祝它能做什么。」—— 《运动改造大脑》',
        action: { type: 'none' },
        filterActivityIds: ['workout'],
        enableGoal: true,
        goalValue: 30, // 30分钟/天
        goalType: 'min'
      },
      { 
        id: '20', 
        type: 'stats', 
        title: '今日摸鱼时长', 
        frontText: '偶尔放空，也是生活的一部分',
        backText: '「适度的休闲，是为了更好地出发。」',
        action: { type: 'none' },
        filterActivityIds: ['chat', 'surf', 'watch', 'game'],
        enableGoal: true,
        goalValue: 120, // 2小时
        goalType: 'max'
      },
      { 
        id: '21', 
        type: 'navigation', 
        title: '今日统计', 
        frontText: '时间的流向，藏着生命的密码',
        backText: '「你把时间花在哪里，你就会成为什么样的人。」—— 《奇特的一生》',
        action: { type: 'navigate', targetView: 'stats-today' }
      },
      { 
        id: '22', 
        type: 'timer', 
        title: '睡觉', 
        frontText: '放下执念，让夜晚拥抱疲惫的灵魂',
        backText: '安眠，是对今日最好的告别',
        action: { type: 'startTimer', activityId: 'sleep_act', categoryId: 'sleep' }
      },
    ]
  }
];
