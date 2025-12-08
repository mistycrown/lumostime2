import { Category, Log, AppView, TodoCategory, TodoItem, Scope, Goal } from './types';

// --- Colors ---
// Provide a palette for consistent usage (Tailwind text classes mapped to implicit bg via component logic)
// The user requested "Optional Colors Option". We can define them here for reference or use them in future Settings.
export const COLOR_OPTIONS = [
  { id: 'stone', label: 'Stone', hex: '#f5f5f4', bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200', title: 'text-stone-600', ring: 'ring-stone-300' },
  { id: 'red', label: 'Red', hex: '#fee2e2', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', title: 'text-red-600', ring: 'ring-red-300' },
  { id: 'orange', label: 'Orange', hex: '#ffedd5', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', title: 'text-orange-600', ring: 'ring-orange-300' },
  { id: 'amber', label: 'Amber', hex: '#fef3c7', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', title: 'text-amber-600', ring: 'ring-amber-300' },
  { id: 'yellow', label: 'Yellow', hex: '#fef9c3', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', title: 'text-yellow-600', ring: 'ring-yellow-300' },
  { id: 'lime', label: 'Lime', hex: '#ecfccb', bg: 'bg-lime-100', text: 'text-lime-700', border: 'border-lime-200', title: 'text-lime-600', ring: 'ring-lime-300' },
  { id: 'green', label: 'Green', hex: '#dcfce7', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', title: 'text-green-600', ring: 'ring-green-300' },
  { id: 'emerald', label: 'Emerald', hex: '#d1fae5', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', title: 'text-emerald-600', ring: 'ring-emerald-300' },
  { id: 'teal', label: 'Teal', hex: '#ccfbf1', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', title: 'text-teal-600', ring: 'ring-teal-300' },
  { id: 'cyan', label: 'Cyan', hex: '#cffafe', bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', title: 'text-cyan-600', ring: 'ring-cyan-300' },
  { id: 'sky', label: 'Sky', hex: '#e0f2fe', bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200', title: 'text-sky-600', ring: 'ring-sky-300' },
  { id: 'blue', label: 'Blue', hex: '#dbeafe', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', title: 'text-blue-600', ring: 'ring-blue-300' },
  { id: 'indigo', label: 'Indigo', hex: '#e0e7ff', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', title: 'text-indigo-600', ring: 'ring-indigo-300' },
  { id: 'violet', label: 'Violet', hex: '#ede9fe', bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', title: 'text-violet-600', ring: 'ring-violet-300' },
  { id: 'purple', label: 'Purple', hex: '#f3e8ff', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', title: 'text-purple-600', ring: 'ring-purple-300' },
  { id: 'fuchsia', label: 'Fuchsia', hex: '#fae8ff', bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', border: 'border-fuchsia-200', title: 'text-fuchsia-600', ring: 'ring-fuchsia-300' },
  { id: 'pink', label: 'Pink', hex: '#fce7f3', bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', title: 'text-pink-600', ring: 'ring-pink-300' },
  { id: 'rose', label: 'Rose', hex: '#ffe4e6', bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', title: 'text-rose-600', ring: 'ring-rose-300' },
];


export const CATEGORIES: Category[] = [
  {
    id: 'life',
    name: '生活',
    icon: '🏠',
    themeColor: 'text-amber-600',
    activities: [
      { id: 'commute', name: '通勤', icon: '🚇', color: 'bg-amber-100 text-amber-700', heatmapMin: 0, heatmapMax: 240 },
      { id: 'meal', name: '饮食', icon: '🍱', color: 'bg-orange-100 text-orange-700', heatmapMin: 0, heatmapMax: 240 },
      { id: 'housework', name: '家务', icon: '🧹', color: 'bg-yellow-100 text-yellow-700', heatmapMin: 0, heatmapMax: 240 },
      { id: 'hygiene', name: '洗护', icon: '🚿', color: 'bg-amber-50 text-amber-600', heatmapMin: 0, heatmapMax: 240 },
      { id: 'shopping', name: '购物', icon: '🛒', color: 'bg-yellow-50 text-yellow-600', heatmapMin: 0, heatmapMax: 240 },
      { id: 'chores', name: '杂务', icon: '🧾', color: 'bg-orange-50 text-orange-600', heatmapMin: 0, heatmapMax: 240 },
    ]
  },
  {
    id: 'sleep',
    name: '睡眠',
    icon: '💤',
    themeColor: 'text-stone-600',
    activities: [
      { id: 'sleep_act', name: '睡觉', icon: '🛌', color: 'bg-stone-100 text-stone-700', heatmapMin: 300, heatmapMax: 660 },
      { id: 'nap', name: '小憩', icon: '🔋', color: 'bg-stone-50 text-stone-600', heatmapMin: 0, heatmapMax: 60 },
    ]
  },
  {
    id: 'study',
    name: '学习',
    icon: '🎓',
    themeColor: 'text-emerald-600',
    enableFocusScore: true,
    activities: [
      { id: 'meeting', name: '上课开会', icon: '🏫', color: 'bg-emerald-100 text-emerald-700', heatmapMin: 0, heatmapMax: 240 },
      { id: 'self_study', name: '网课自学', icon: '💻', color: 'bg-teal-100 text-teal-700', heatmapMin: 0, heatmapMax: 240 },
      { id: 'reading', name: '书籍文献', icon: '📖', color: 'bg-green-100 text-green-700', heatmapMin: 0, heatmapMax: 240 },
      { id: 'coding', name: '代码编程', icon: '👾', color: 'bg-cyan-100 text-cyan-700', heatmapMin: 0, heatmapMax: 240 },
      { id: 'writing', name: '论文写作', icon: '✒️', color: 'bg-lime-100 text-lime-700', heatmapMin: 0, heatmapMax: 240 },
    ]
  },
  {
    id: 'self',
    name: '与自己',
    icon: '🪞',
    themeColor: 'text-purple-600',
    activities: [
      { id: 'journal', name: '日记复盘', icon: '🧠', color: 'bg-purple-100 text-purple-700', heatmapMin: 0, heatmapMax: 240 },
      { id: 'organize', name: '整理收集', icon: '🗂️', color: 'bg-fuchsia-100 text-fuchsia-700', heatmapMin: 0, heatmapMax: 240 },
      { id: 'dev', name: '工具开发', icon: '⚙️', color: 'bg-violet-100 text-violet-700', heatmapMin: 0, heatmapMax: 240 },
      { id: 'workout', name: '运动健身', icon: '🏃', color: 'bg-purple-50 text-purple-600', heatmapMin: 0, heatmapMax: 240 },
    ]
  },
  {
    id: 'others',
    name: '与他人',
    icon: '🤝',
    themeColor: 'text-blue-600',
    activities: [
      { id: 'part_time', name: '兼职工作', icon: '💰', color: 'bg-blue-100 text-blue-700', heatmapMin: 0, heatmapMax: 240 },
      { id: 'social', name: '社会织网', icon: '🕸️', color: 'bg-sky-100 text-sky-700', heatmapMin: 0, heatmapMax: 240 },
    ]
  },
  {
    id: 'explore',
    name: '探索世界',
    icon: '🧭',
    themeColor: 'text-cyan-600',
    activities: [
      { id: 'design', name: '设计', icon: '🎨', color: 'bg-cyan-100 text-cyan-700', heatmapMin: 0, heatmapMax: 240 },
      { id: 'music', name: '音乐', icon: '🎵', color: 'bg-sky-50 text-sky-600', heatmapMin: 0, heatmapMax: 240 },
      { id: 'craft', name: '手工', icon: '🧶', color: 'bg-blue-50 text-blue-600', heatmapMin: 0, heatmapMax: 240 },
      { id: 'calligraphy', name: '书法', icon: '🖌️', color: 'bg-indigo-50 text-indigo-600', heatmapMin: 0, heatmapMax: 240 },
    ]
  },
  {
    id: 'eros',
    name: '爱欲再生产',
    icon: '🎡',
    themeColor: 'text-red-600',
    activities: [
      { id: 'chat', name: '闲聊瞎扯', icon: '🍵', color: 'bg-red-100 text-red-700', heatmapMin: 0, heatmapMax: 240 },
      { id: 'surf', name: '网上冲浪', icon: '🏄', color: 'bg-rose-100 text-rose-700', heatmapMin: 0, heatmapMax: 240 },
      { id: 'watch', name: '看文看剧', icon: '🍿', color: 'bg-red-50 text-red-600', heatmapMin: 0, heatmapMax: 240 },
      { id: 'game', name: '玩玩游戏', icon: '🎮', color: 'bg-rose-50 text-rose-600', heatmapMin: 0, heatmapMax: 240 },
      { id: 'chaos', name: '不可名状', icon: '🔮', color: 'bg-red-200 text-red-800', heatmapMin: 0, heatmapMax: 240 },
    ]
  }
];

export const SCOPES: Scope[] = [
  {
    id: 's1',
    name: '专业输入',
    icon: '🚩',
    description: '操千曲而后晓声，观千剑而后识器。',
    isArchived: false,
    order: 0,
    enableFocusScore: true,
    themeColor: 'text-green-600'
  },
  {
    id: 's2',
    name: '博士课题',
    icon: '🏛️',
    description: '修辞立其诚，所以居业也。',
    isArchived: false,
    order: 1,
    enableFocusScore: true,
    themeColor: 'text-blue-600'
  },
  {
    id: 's3',
    name: '博雅通识',
    icon: '🦉',
    description: '风檐展书读，古道照颜色。',
    isArchived: false,
    order: 2,
    enableFocusScore: true,
    themeColor: 'text-orange-600'
  },
  {
    id: 's4',
    name: 'AI玩具',
    icon: '⚡️',
    description: '满眼生机转化钧，天工人巧日争新。',
    isArchived: false,
    order: 3,
    enableFocusScore: true,
    themeColor: 'text-pink-600'
  }
];

export const MOCK_TODO_CATEGORIES: TodoCategory[] = [
  { id: 'thesis', name: '毕业论文', icon: '🎓' },
  { id: 'study', name: '学习计划', icon: '📚' },
  { id: 'life', name: '生活杂务', icon: '🏠' },
  { id: 'dev', name: '开发任务', icon: '⚙️' },
];

export const INITIAL_GOALS: Goal[] = [
  {
    id: 'goal_1',
    title: 'Q1 广韵文献攻坚',
    scopeId: 's1', // 专业输入
    filterTags: ['reading'], // 仅计算阅读活动
    startDate: '2025-01-01',
    endDate: '2025-03-31',
    metric: 'duration_raw',
    targetValue: 100 * 3600, // 100小时（秒）
    status: 'active',
    motivation: '完成奖励自己一套新香具'
  },
  {
    id: 'goal_2',
    title: '博士论文冲刺',
    scopeId: 's2', // 博士课题
    startDate: '2025-12-01',
    endDate: '2025-12-31',
    metric: 'duration_weighted', // 有效时长
    targetValue: 50 * 3600, // 50小时有效时长
    status: 'active'
  },
  {
    id: 'goal_3',
    title: 'AI项目持续学习',
    scopeId: 's4', // AI玩具
    startDate: '2025-12-01',
    endDate: '2025-12-31',
    metric: 'frequency_days', // 活跃天数
    targetValue: 20, // 20天
    status: 'active'
  }
];

const NOW = Date.now();
const DAY_MS = 86400000;

export const INITIAL_TODOS: TodoItem[] = [
  // Thesis (Linked to PhD Project Scope & Study Category)
  {
    id: 't_thesis_1',
    categoryId: 'thesis',
    title: '完成文献综述初稿',
    isCompleted: false,
    linkedCategoryId: 'study', // Study
    linkedActivityId: 'writing', // Writing
    defaultScopeIds: ['s2'], // 博士课题
    isProgress: true,
    totalAmount: 20,
    unitAmount: 1,
    completedUnits: 12,
    note: '需包含近5年核心期刊',
    heatmapMin: 0,
    heatmapMax: 240
  },
  {
    id: 't_thesis_2',
    categoryId: 'thesis',
    title: '整理实验数据',
    isCompleted: false,
    linkedCategoryId: 'study',
    linkedActivityId: 'coding', // Coding
    defaultScopeIds: ['s2'],
    note: '导出 CSV 并预处理'
  },

  // Reading (Linked to Professional Input Scope)
  {
    id: 't_read_1',
    categoryId: 'study',
    title: '阅读《资本论》第一卷',
    isCompleted: false,
    linkedCategoryId: 'study',
    linkedActivityId: 'reading',
    defaultScopeIds: ['s1'], // 专业输入
    isProgress: true,
    totalAmount: 800,
    unitAmount: 20,
    completedUnits: 150,
    note: '每天阅读20页',
    heatmapMin: 0,
    heatmapMax: 240
  },
  {
    id: 't_read_2',
    categoryId: 'study',
    title: '研读 Transformer 架构论文',
    isCompleted: true,
    linkedCategoryId: 'study',
    linkedActivityId: 'reading',
    defaultScopeIds: ['s4'], // AI玩具
  },

  // Life
  { id: 't_life_1', categoryId: 'life', title: '预约牙医', isCompleted: false, note: '周五下午有空' },
  { id: 't_life_2', categoryId: 'life', title: '购买下周食材', isCompleted: true },

  // Dev
  { id: 't_dev_1', categoryId: 'dev', title: '优化 LumoTime 性能', isCompleted: false, defaultScopeIds: ['s4'] },
];

export const INITIAL_LOGS: Log[] = [
  // ==================== TODAY (Dec 7) ====================
  {
    id: 'l_today_1',
    activityId: 'sleep_act', categoryId: 'sleep',
    startTime: new Date().setHours(0, 30, 0, 0), endTime: new Date().setHours(7, 30, 0, 0),
    duration: 7 * 3600,
  },
  {
    id: 'l_today_2',
    activityId: 'hygiene', categoryId: 'life',
    startTime: new Date().setHours(7, 30, 0, 0), endTime: new Date().setHours(7, 50, 0, 0),
    duration: 20 * 60,
  },
  {
    id: 'l_today_3',
    activityId: 'reading', categoryId: 'study', // Reading -> Professional Input
    startTime: new Date().setHours(9, 0, 0, 0), endTime: new Date().setHours(11, 0, 0, 0),
    duration: 2 * 3600,
    scopeIds: ['s1'], // 专业输入
    linkedTodoId: 't_read_1',
    progressIncrement: 20,
    note: '资本论第4章',
    focusScore: 4
  },
  {
    id: 'l_today_4',
    activityId: 'coding', categoryId: 'study', // Coding -> AI Toys
    startTime: new Date().setHours(14, 0, 0, 0), endTime: new Date().setHours(16, 30, 0, 0),
    duration: 2.5 * 3600,
    scopeIds: ['s4'], // AI玩具
    note: '尝试新的 LLM API',
    focusScore: 5
  },

  // ==================== YESTERDAY ====================
  {
    id: 'l_y_1',
    activityId: 'writing', categoryId: 'study', // Writing -> PhD Project
    startTime: new Date(NOW - DAY_MS).setHours(9, 30, 0, 0), endTime: new Date(NOW - DAY_MS).setHours(12, 30, 0, 0),
    duration: 3 * 3600,
    scopeIds: ['s2'], // 博士课题
    linkedTodoId: 't_thesis_1',
    note: '综述第二节撰写',
    focusScore: 5
  },
  {
    id: 'l_y_2',
    activityId: 'journal', categoryId: 'self', // Journal -> Liberal Arts
    startTime: new Date(NOW - DAY_MS).setHours(21, 0, 0, 0), endTime: new Date(NOW - DAY_MS).setHours(21, 45, 0, 0),
    duration: 45 * 60,
    scopeIds: ['s3'], // 博雅通识
    note: '夜间反思'
  },

  // ==================== 2 DAYS AGO ====================
  {
    id: 'l_d2_1',
    activityId: 'meeting', categoryId: 'study', // Meeting -> PhD Project
    startTime: new Date(NOW - 2 * DAY_MS).setHours(10, 0, 0, 0), endTime: new Date(NOW - 2 * DAY_MS).setHours(11, 30, 0, 0),
    duration: 1.5 * 3600,
    scopeIds: ['s2'],
    note: '导师组会',
    focusScore: 3
  },
  {
    id: 'l_d2_2',
    activityId: 'game', categoryId: 'eros',
    startTime: new Date(NOW - 2 * DAY_MS).setHours(20, 0, 0, 0), endTime: new Date(NOW - 2 * DAY_MS).setHours(23, 0, 0, 0),
    duration: 3 * 3600,
    note: '黑神话：悟空',
    focusScore: 5
  },

  // ==================== LAST WEEK (Spread out data) ====================
  // 5 days ago - Deep Work Day
  {
    id: 'l_d5_1',
    activityId: 'writing', categoryId: 'study',
    startTime: new Date(NOW - 5 * DAY_MS).setHours(8, 0, 0, 0), endTime: new Date(NOW - 5 * DAY_MS).setHours(11, 0, 0, 0),
    duration: 3 * 3600,
    scopeIds: ['s2'],
    focusScore: 5
  },
  {
    id: 'l_d5_2',
    activityId: 'reading', categoryId: 'study',
    startTime: new Date(NOW - 5 * DAY_MS).setHours(14, 0, 0, 0), endTime: new Date(NOW - 5 * DAY_MS).setHours(16, 0, 0, 0),
    duration: 2 * 3600,
    scopeIds: ['s1'],
    focusScore: 4
  },

  // 10 days ago - Leisure Day
  {
    id: 'l_d10_1',
    activityId: 'social', categoryId: 'others',
    startTime: new Date(NOW - 10 * DAY_MS).setHours(18, 0, 0, 0), endTime: new Date(NOW - 10 * DAY_MS).setHours(22, 0, 0, 0),
    duration: 4 * 3600,
    note: '聚餐',
  },

  // ==================== LAST MONTH (Nov) ====================
  // Nov 15th
  {
    id: 'l_m1_1',
    activityId: 'coding', categoryId: 'study',
    startTime: new Date('2025-11-15T10:00:00').getTime(), endTime: new Date('2025-11-15T13:00:00').getTime(),
    duration: 3 * 3600,
    scopeIds: ['s4'], // AI Toys
    focusScore: 5,
    note: 'Dev AI Agent'
  },
  {
    id: 'l_m1_2',
    activityId: 'reading', categoryId: 'study',
    startTime: new Date('2025-11-15T15:00:00').getTime(), endTime: new Date('2025-11-15T17:00:00').getTime(),
    duration: 2 * 3600,
    scopeIds: ['s3'], // Liberal Arts
    note: 'History Book'
  },

  // Nov 20th
  {
    id: 'l_m1_3',
    activityId: 'writing', categoryId: 'study',
    startTime: new Date('2025-11-20T09:00:00').getTime(), endTime: new Date('2025-11-20T12:00:00').getTime(),
    duration: 3 * 3600,
    scopeIds: ['s2'],
    focusScore: 4
  },
  // Nov 5th
  {
    id: 'l_m1_4',
    activityId: 'journal', categoryId: 'self',
    startTime: new Date('2025-11-05T21:00:00').getTime(), endTime: new Date('2025-11-05T22:00:00').getTime(),
    duration: 3600,
    scopeIds: ['s3'],
  },

  // ==================== OCT ====================
  {
    id: 'l_m2_1',
    activityId: 'writing', categoryId: 'study',
    startTime: new Date('2025-10-10T09:00:00').getTime(), endTime: new Date('2025-10-10T11:00:00').getTime(),
    duration: 2 * 3600,
    scopeIds: ['s2'], // PhD
  },
  {
    id: 'l_m2_2',
    activityId: 'coding', categoryId: 'study',
    startTime: new Date('2025-10-12T14:00:00').getTime(), endTime: new Date('2025-10-12T18:00:00').getTime(),
    duration: 4 * 3600,
    scopeIds: ['s4'], // AI
    focusScore: 5
  },
];

export const VIEW_TITLES: Record<AppView, string> = {
  [AppView.RECORD]: 'Lumos Time',
  [AppView.TIMELINE]: '时间轴',
  [AppView.STATS]: '数据统计',
  [AppView.TAGS]: '标签管理',
  [AppView.SCOPE]: '领域',
  [AppView.TODO]: 'TODO',
  [AppView.SETTINGS]: '设置',
};