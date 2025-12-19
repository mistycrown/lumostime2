import { Category, Log, AppView, TodoCategory, TodoItem, Scope, Goal, ReviewTemplate, DailyReview, NarrativeTemplate } from './types';

// --- Default User Personal Info ---
export const DEFAULT_USER_PERSONAL_INFO = `我是一名正在攻读博士学位的研究生，我对AI技术充满热情。我相信持续学习和自我反思的力量，希望成为一个既有深度又有广度的学者。`;

// --- Colors ---
// Optimized color palette with distinct colors, organized by color family
export const COLOR_OPTIONS = [
  // Neutrals (灰色系) - 3种
  { id: 'stone', label: 'Stone', hex: '#a8a29e', lightHex: '#e7e5e4', bg: 'bg-stone-100', text: 'text-stone-600', border: 'border-stone-300', title: 'text-stone-600', ring: 'ring-stone-400', picker: 'bg-stone-400' },
  { id: 'gray', label: 'Gray', hex: '#6b7280', lightHex: '#e5e7eb', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300', title: 'text-gray-700', ring: 'ring-gray-400', picker: 'bg-gray-500' },
  { id: 'slate', label: 'Slate', hex: '#475569', lightHex: '#e2e8f0', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', title: 'text-slate-700', ring: 'ring-slate-400', picker: 'bg-slate-600' },

  // Reds (红色系) - 2种
  { id: 'red', label: 'Red', hex: '#ef4444', lightHex: '#fecaca', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-300', title: 'text-red-600', ring: 'ring-red-400', picker: 'bg-red-400' },
  { id: 'rose', label: 'Rose', hex: '#f43f5e', lightHex: '#fecdd3', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-300', title: 'text-rose-600', ring: 'ring-rose-400', picker: 'bg-rose-400' },

  // Oranges (橙色系) - 2种
  { id: 'orange', label: 'Orange', hex: '#f97316', lightHex: '#fed7aa', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-300', title: 'text-orange-600', ring: 'ring-orange-400', picker: 'bg-orange-400' },
  { id: 'amber', label: 'Amber', hex: '#f59e0b', lightHex: '#fde68a', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-300', title: 'text-amber-600', ring: 'ring-amber-400', picker: 'bg-amber-400' },

  // Yellows (黄色系) - 2种
  { id: 'yellow', label: 'Yellow', hex: '#eab308', lightHex: '#fef08a', bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-300', title: 'text-yellow-600', ring: 'ring-yellow-400', picker: 'bg-yellow-400' },
  { id: 'lime', label: 'Lime', hex: '#84cc16', lightHex: '#d9f99d', bg: 'bg-lime-50', text: 'text-lime-600', border: 'border-lime-300', title: 'text-lime-600', ring: 'ring-lime-400', picker: 'bg-lime-500' },

  // Greens (绿色系) - 3种
  { id: 'green', label: 'Green', hex: '#22c55e', lightHex: '#bbf7d0', bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-300', title: 'text-green-600', ring: 'ring-green-400', picker: 'bg-green-500' },
  { id: 'emerald', label: 'Emerald', hex: '#10b981', lightHex: '#a7f3d0', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-300', title: 'text-emerald-600', ring: 'ring-emerald-400', picker: 'bg-emerald-500' },
  { id: 'teal', label: 'Teal', hex: '#14b8a6', lightHex: '#99f6e4', bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-300', title: 'text-teal-600', ring: 'ring-teal-400', picker: 'bg-teal-500' },

  // Blues (蓝色系) - 3种
  { id: 'cyan', label: 'Cyan', hex: '#06b6d4', lightHex: '#a5f3fc', bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-300', title: 'text-cyan-600', ring: 'ring-cyan-400', picker: 'bg-cyan-500' },
  { id: 'sky', label: 'Sky', hex: '#0ea5e9', lightHex: '#bae6fd', bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-300', title: 'text-sky-600', ring: 'ring-sky-400', picker: 'bg-sky-500' },
  { id: 'blue', label: 'Blue', hex: '#3b82f6', lightHex: '#bfdbfe', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-300', title: 'text-blue-600', ring: 'ring-blue-400', picker: 'bg-blue-500' },

  // Purples (紫色系) - 3种
  { id: 'indigo', label: 'Indigo', hex: '#6366f1', lightHex: '#c7d2fe', bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-300', title: 'text-indigo-600', ring: 'ring-indigo-400', picker: 'bg-indigo-500' },
  { id: 'violet', label: 'Violet', hex: '#8b5cf6', lightHex: '#ddd6fe', bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-300', title: 'text-violet-600', ring: 'ring-violet-400', picker: 'bg-violet-500' },
  { id: 'purple', label: 'Purple', hex: '#a855f7', lightHex: '#e9d5ff', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-300', title: 'text-purple-600', ring: 'ring-purple-400', picker: 'bg-purple-500' },

  // Pinks (粉色系) - 2种
  { id: 'fuchsia', label: 'Fuchsia', hex: '#d946ef', lightHex: '#f5d0fe', bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', border: 'border-fuchsia-300', title: 'text-fuchsia-600', ring: 'ring-fuchsia-400', picker: 'bg-fuchsia-500' },
  { id: 'pink', label: 'Pink', hex: '#ec4899', lightHex: '#fbcfe8', bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-300', title: 'text-pink-600', ring: 'ring-pink-400', picker: 'bg-pink-500' },
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
    description: '关于科研学术的专业训练。',
    isArchived: false,
    order: 0,
    enableFocusScore: true,
    themeColor: 'text-green-600'
  },
  {
    id: 's2',
    name: '博士课题',
    icon: '🏛️',
    description: '完成毕业论文，获得博士学位。',
    isArchived: false,
    order: 1,
    enableFocusScore: true,
    themeColor: 'text-blue-600'
  },
  {
    id: 's3',
    name: '博雅通识',
    icon: '🦉',
    description: '扩宽知识边界，探索发现新知。',
    isArchived: false,
    order: 2,
    enableFocusScore: true,
    themeColor: 'text-orange-600'
  },
  {
    id: 's4',
    name: 'AI玩具',
    icon: '⚡️',
    description: '掌握AI工具，提高效率。',
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
    filterActivityIds: ['reading'], // 仅计算阅读活动
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
  {
    id: 't_thesis_3',
    categoryId: 'thesis',
    title: '修改论文摘要',
    isCompleted: true,
    completedAt: new Date(NOW - 2 * DAY_MS).toISOString(),
    linkedCategoryId: 'study',
    linkedActivityId: 'writing',
    defaultScopeIds: ['s2'],
    note: '根据导师意见修改'
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
    completedAt: new Date(NOW - 5 * DAY_MS).toISOString(),
    linkedCategoryId: 'study',
    linkedActivityId: 'reading',
    defaultScopeIds: ['s4'], // AI玩具
  },
  {
    id: 't_read_3',
    categoryId: 'study',
    title: '学习 Rust 语言基础',
    isCompleted: false,
    linkedCategoryId: 'study',
    linkedActivityId: 'self_study',
    defaultScopeIds: ['s4'],
    isProgress: true,
    totalAmount: 20,
    unitAmount: 1,
    completedUnits: 3,
    note: '完成 Rustlings 练习'
  },

  // Life
  { id: 't_life_1', categoryId: 'life', title: '预约牙医', isCompleted: false, note: '周五下午有空' },
  { id: 't_life_2', categoryId: 'life', title: '购买下周食材', isCompleted: true, completedAt: new Date(NOW - DAY_MS).toISOString() },
  { id: 't_life_3', categoryId: 'life', title: '缴纳电费', isCompleted: false },

  // Dev
  { id: 't_dev_1', categoryId: 'dev', title: '优化 LumosTime 性能', isCompleted: false, defaultScopeIds: ['s4'] },
  { id: 't_dev_2', categoryId: 'dev', title: '修复 Android 端回退按钮', isCompleted: true, completedAt: new Date(NOW - 1 * DAY_MS).toISOString(), defaultScopeIds: ['s4'] },
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
  {
    id: 'l_today_5', // New entry
    activityId: 'workout', categoryId: 'self',
    startTime: new Date().setHours(17, 0, 0, 0), endTime: new Date().setHours(18, 0, 0, 0),
    duration: 3600,
    note: '有氧运动 5km',
    focusScore: 4
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
  {
    id: 'l_y_3', // New entry
    activityId: 'coding', categoryId: 'study',
    startTime: new Date(NOW - DAY_MS).setHours(14, 0, 0, 0), endTime: new Date(NOW - DAY_MS).setHours(17, 0, 0, 0),
    duration: 3 * 3600,
    scopeIds: ['s4'],
    linkedTodoId: 't_dev_2',
    note: '修复关键 bug',
    focusScore: 5
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
  {
    id: 'l_d2_3', // New entry
    activityId: 'writing', categoryId: 'study',
    startTime: new Date(NOW - 2 * DAY_MS).setHours(14, 0, 0, 0), endTime: new Date(NOW - 2 * DAY_MS).setHours(16, 0, 0, 0),
    duration: 2 * 3600,
    scopeIds: ['s2'],
    linkedTodoId: 't_thesis_3',
    note: '修改摘要',
    focusScore: 4
  },

  // ==================== 3 DAYS AGO (Mixed) ====================
  {
    id: 'l_d3_1',
    activityId: 'part_time', categoryId: 'others',
    startTime: new Date(NOW - 3 * DAY_MS).setHours(13, 0, 0, 0), endTime: new Date(NOW - 3 * DAY_MS).setHours(17, 0, 0, 0),
    duration: 4 * 3600,
    note: '兼职：翻译稿件',
  },
  {
    id: 'l_d3_2',
    activityId: 'reading', categoryId: 'study',
    startTime: new Date(NOW - 3 * DAY_MS).setHours(20, 0, 0, 0), endTime: new Date(NOW - 3 * DAY_MS).setHours(21, 30, 0, 0),
    duration: 1.5 * 3600,
    scopeIds: ['s1'],
    focusScore: 3
  },

  // ==================== 4 DAYS AGO (Focus) ====================
  {
    id: 'l_d4_1',
    activityId: 'coding', categoryId: 'study',
    startTime: new Date(NOW - 4 * DAY_MS).setHours(9, 0, 0, 0), endTime: new Date(NOW - 4 * DAY_MS).setHours(12, 0, 0, 0),
    duration: 3 * 3600,
    scopeIds: ['s4'],
    note: '重构前端组件库',
    focusScore: 5
  },
  {
    id: 'l_d4_2',
    activityId: 'design', categoryId: 'explore',
    startTime: new Date(NOW - 4 * DAY_MS).setHours(14, 0, 0, 0), endTime: new Date(NOW - 4 * DAY_MS).setHours(16, 0, 0, 0),
    duration: 2 * 3600,
    note: '设计新 Logo',
    focusScore: 4
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
  // Additional Logs for Volume (Recent)
  {
    id: 'l_extra_1',
    activityId: 'reading', categoryId: 'study',
    startTime: new Date(NOW - 3 * DAY_MS).setHours(8, 0, 0, 0), endTime: new Date(NOW - 3 * DAY_MS).setHours(10, 0, 0, 0),
    duration: 2 * 3600,
    scopeIds: ['s1'],
    focusScore: 5
  },
  {
    id: 'l_extra_2',
    activityId: 'coding', categoryId: 'study',
    startTime: new Date(NOW - 3 * DAY_MS).setHours(22, 0, 0, 0), endTime: new Date(NOW - 3 * DAY_MS).setHours(23, 30, 0, 0),
    duration: 1.5 * 3600,
    scopeIds: ['s4'],
    focusScore: 4
  },
  {
    id: 'l_extra_3',
    activityId: 'writing', categoryId: 'study',
    startTime: new Date(NOW - 4 * DAY_MS).setHours(19, 0, 0, 0), endTime: new Date(NOW - 4 * DAY_MS).setHours(21, 0, 0, 0),
    duration: 2 * 3600,
    scopeIds: ['s2'],
    focusScore: 5
  }
];

export const VIEW_TITLES: Record<AppView, string> = {
  [AppView.RECORD]: 'Lumo Time',
  [AppView.TIMELINE]: '时间轴',
  [AppView.STATS]: '数据统计',
  [AppView.TAGS]: '标签管理',
  [AppView.SCOPE]: '领域',
  [AppView.TODO]: 'TODO',
  [AppView.REVIEW]: 'My Chronicle',
  [AppView.SETTINGS]: '设置',
};

// ========== Daily Review Templates (每日回顾模板) ==========

export const DEFAULT_REVIEW_TEMPLATES: ReviewTemplate[] = [
  {
    id: 'template-microlight',
    title: '💫 捕捉微光',
    isSystem: true,
    order: 1,
    enabled: false,
    syncToTimeline: false,
    isDailyTemplate: true,
    isWeeklyTemplate: false,
    isMonthlyTemplate: false,
    questions: [
      {
        id: 'q-microlight-1',
        question: '今天发生了哪三件让你觉得不错的事情？',
        type: 'text'
      },
      {
        id: 'q-microlight-2',
        question: '为什么这些好事在今天发生？',
        type: 'text'
      },
      {
        id: 'q-microlight-3',
        question: '今天你要谢谢自己做了什么？',
        type: 'text'
      }
    ]
  },
  {
    id: 'template-vision',
    title: '🎯 愿景校准',
    isSystem: true,
    order: 2,
    enabled: false,
    syncToTimeline: false,
    isDailyTemplate: true,
    isWeeklyTemplate: false,
    isMonthlyTemplate: false,
    questions: [
      {
        id: 'q-vision-1',
        question: '今天哪件事最符合"理想自我"的身份？',
        type: 'text'
      },
      {
        id: 'q-vision-2',
        question: '今天是否有行为与你的核心愿望背道而驰？',
        type: 'text'
      },
      {
        id: 'q-vision-3',
        question: '你感觉到离你的大目标更近了吗？',
        type: 'choice',
        choices: ['靠近一大步', '微小寸进', '原地踏步', '暂时后退']
      },
      {
        id: 'q-vision-4',
        question: '请用现在时态写下一句明天的状态：',
        type: 'text'
      }
    ]
  },
  {
    id: 'template-minimal',
    title: '⚡️ KPT迭代',
    isSystem: true,
    order: 3,
    enabled: true,
    syncToTimeline: false,
    isDailyTemplate: true,
    isWeeklyTemplate: false,
    isMonthlyTemplate: false,
    questions: [
      {
        id: 'q-minimal-1',
        question: 'Keep：今天有哪些地方可以继续保持？',
        type: 'text'
      },
      {
        id: 'q-minimal-2',
        question: 'Problem：今天有哪些地方可以改进？',
        type: 'text'
      },
      {
        id: 'q-minimal-3',
        question: 'Try：明天打算尝试的微小改变是什么？',
        type: 'text'
      },
      {
        id: 'q-minimal-4',
        question: '给今天打个分：',
        type: 'rating',
        icon: 'star'
      }
    ]
  },
  {
    id: 'template-weekly-default',
    title: '📅 本周复盘',
    isSystem: true,
    order: 4,
    enabled: true,
    syncToTimeline: false,
    isDailyTemplate: false,
    isWeeklyTemplate: true,
    isMonthlyTemplate: false,
    questions: [
      {
        id: 'q-weekly-1',
        question: '本周最重要的成就是什么？',
        type: 'text'
      },
      {
        id: 'q-weekly-2',
        question: '本周有哪些地方可以做得更好？',
        type: 'text'
      },
      {
        id: 'q-weekly-3',
        question: '为下周设定的一个核心目标是？',
        type: 'text'
      }
    ]
  },
  {
    id: 'template-monthly-default',
    title: '🌙 月度回望',
    isSystem: true,
    order: 5,
    enabled: true,
    syncToTimeline: false,
    isDailyTemplate: false,
    isWeeklyTemplate: false,
    isMonthlyTemplate: true,
    questions: [
      {
        id: 'q-monthly-1',
        question: '本月最难忘的一个时刻（高光时刻）？',
        type: 'text'
      },
      {
        id: 'q-monthly-2',
        question: '哪件事让你最有成就感？',
        type: 'text'
      },
      {
        id: 'q-monthly-3',
        question: '给下个月的一个关键词：',
        type: 'text'
      }
    ]
  }
];

export const INITIAL_DAILY_REVIEWS: DailyReview[] = [];

// ========== AI Narrative  (AI 叙事模板) ==========

export const NARRATIVE_TEMPLATES: NarrativeTemplate[] = [
  {
    id: 'default',
    title: '温柔抚慰',
    icon: '💖',
    description: '叙事疗法，通过外化问题与寻找例外提供心理支持',
    prompt: `
Role: 你是一位善于通过叙事疗法进行心理抚慰的传记作家。

Task: 请根据我的【时间记录】（客观骨架）和【引导问答】（主观血肉），以第一人称写一篇日记。

# Core Narrative Techniques

1.  **问题外化**
    * ❌ 错误写法：“我今天很懒，我很焦虑。” (将问题内化为人格缺陷)
    * ✅ 正确写法：“‘拖延’今天占据了上风，让我的计划一度停滞。” / “焦虑感在下午2点来袭。” (将问题看作独立于人的外部因素)

2.  **寻找“例外”与“能动性”**
    * 在负面叙事中，必须挖掘用户做出的**主动选择**，哪怕非常微小。
    * ❌ 错误写法：“虽然很累，但这就是生活吧。” (被动接受，矫情无奈)
    * ✅ 正确写法：“面对疲惫，我没有强撑，而是**主动选择**了在两点钟停下来喝杯咖啡。这是我在照顾自己的身体。” (强调用户的主权)

3.  **去形容词化**
    * 多描写“动作”和“决定”，少描写“形容词”和“比喻”。
    * 用动词来构建力量感，而不是用形容词来渲染氛围。

---

# Output Structure (输出格式)

[第一行必须是为你这篇日记起的标题，不要加任何前缀]

## [叙事重构]
(基于上述原则生成的日记。要体现出：我在面对问题时，我做了什么，这说明了我是什么样的人。)

## [行动脚注]
(提取一句基于“能动性”的短句。格式：虽然[问题]存在，但我[做了什么动作]，这很珍贵。)

> [最后一段话必须是引用格式。请用极其诗意、优美的语言，总结今天的经历，作为整篇日记的升华。]

---

**CRITICAL FORMATTING RULES**:
- **第一行必须是标题**。
- 使用简体中文。
- 结尾必须是一个 blockquote (引用)，内容要诗意。
- 使用 **加粗** 时不要在星号和文字间加空格。
- 段落之间使用**两个换行**分隔。
- 全文控制在 300-400 字。
- 第一人称：始终用“我”。
    `.trim()
  },
  {
    id: 'philosophy',
    title: '深层洞察',
    icon: '🦉',
    description: '现代哲学家视角，对经历进行概念升维',
    prompt: `
Role: 你是一位博古通今的现代哲学家。

Task: 请阅读我的【今日记录】，并运用一个最恰当的哲学概念或理论，对用户今天的核心经历进行“概念升维”和深层解读。

# Core Mechanics
1. **动态理论匹配**：不要预设流派。
   - 如果用户今天面临选择困难，可用萨特的“存在先于本质”（自由的重负）。
   - 如果用户今天感到重复乏味，可用加缪的“西西弗斯神话”（反抗荒诞）。
   - 如果用户今天陷入欲望挣扎，可用叔本华的“钟摆理论”。
2. **概念化 (Conceptualization)**：不要停留在事件表面，要将具体的事件抽象为一个哲学命题。
3. **苏格拉底式提问**：最后留给用户一个直击灵魂的问题，而不是答案。

# Output Structure

[第一行必须是为你这篇观察起的标题，不要加任何前缀]

## [今日命题：(填入哲学概念)]
(例如：今日命题：西西弗斯的巨石 / 或者是：洞穴隐喻)

## [哲学透镜]
(先引用该哲学理论的核心观点，然后深度剖析这一理论如何解释用户今天遭遇的困境或喜悦。告诉用户：你的痛苦/快乐在人类思想史上是有共鸣的。)

## [灵魂发问]
(基于上述分析，向用户抛出一个值得他在睡前思考的问题。)

> [最后一段话必须是引用格式。请用极其诗意、哲理深刻的语言，总结今天的哲学思考。]

**Format Rules**:
- **第一行必须是标题**。
- 结尾必须是一个 blockquote (引用)。
- 语气深邃、理智、具有启发性。
- 避免说教，重在视角的转换。
- 全文 < 350字。
    `.trim()
  },
  {
    id: 'scientific',
    title: '客观分析',
    icon: '🧬',
    description: '认知神经科学视角，像医生分析实验报告',
    prompt: `
Role: 你是一位认知神经科学家和行为心理学家。

Task: 根据我的【今日数据】，以“实验观察报告”的口吻，分析这个人类样本（用户）今天的神经递质变化和认知表现。

# Core Mechanics
1. **生物学归因**：
   - 快乐/成就 -> 多巴胺 (Dopamine) 与 奖赏回路。
   - 焦虑/压力 -> 皮质醇 (Cortisol) 与 杏仁核激活。
   - 专注/心流 -> 前额叶皮层 (Prefrontal Cortex) 的高效运作。
   - 疲惫 -> 腺苷 (Adenosine) 堆积。
2. **去情绪化**：用科学术语解释情绪。例如，不要说“你今天很伤心”，要说“检测到因社交预期落空导致的血清素水平波动”。

# Output Structure

[第一行必须是为你这篇报告起的标题，不要加任何前缀]

## [🧪 神经递质分析报告]
(分析今天主导大脑的化学物质。例如：“今日主要驱动力：高水平的去甲肾上腺素（来源于Deadline压力）。”)

## [🧠 认知表现复盘]
(点评大脑硬件的使用情况。例如：“上午的前额叶执行功能表现优异，但下午的决策疲劳导致了意志力损耗。”)

## [💊 优化处方]
(给出符合神经科学的建议。例如：“建议通过高强度间歇运动（HIIT）来代谢堆积的皮质醇。”)

> [最后一段话必须是引用格式。请用科学与诗意结合的语言（如卡尔·萨根风格），总结这个人类样本今天的存在状态。]

**Format Rules**:
- **第一行必须是标题**。
- 结尾必须是一个 blockquote (引用)。
- 语气冷静、临床、带有极客感。
- 就像医生在写病历。
- 全文 < 300字。
    `.trim()
  },
  {
    id: 'future_self',
    title: '时空对话',
    icon: '⏳',
    description: '来自10年后的自己，温柔慈悲的后见之明',
    prompt: `
Role: 你是用户本人，但你来自10年后的未来。你已经实现了现在的梦想，过得从容而睿智。

Task: 翻阅你在10年前（也就是今天）的这篇日记，给当年的自己写一封短信。

# Core Mechanics
1. **后见之明 (Hindsight)**：用一种怀旧的口吻谈论今天的“烦恼”。告诉现在的自己，这个烦恼在长远的时间河里是多么微不足道，或者是多么关键的转折点。
2. **确认价值**：肯定用户今天做出的某个微小努力，告诉他：“正是因为你那一天的坚持，才有了后来的我。”
3. **极致温柔**：语气像是一个长辈抚摸孩子的头。

# Output Structure

[第一行必须是为你这封信起的标题，不要加任何前缀]

## [写给 \${date} 的我]
(正文：亲爱的，我正在翻看当年的日记。我看到你今天为了...而焦虑。我想告诉你，别担心... 
另外，我特别想谢谢你今天做的这件事... 它比你想象的更重要。)

> [最后一段话必须是引用格式。请用极其诗意、充满希望的语言，作为来自未来的寄语。]

**Format Rules**:
- **第一行必须是标题**。
- 结尾必须是一个 blockquote (引用)。
- 第一人称“我”。
- 语气温暖、怀旧、充满希望。
- 全文 < 350字。
    `.trim()
  },
  {
    id: 'rpg',
    title: 'RPG 游戏',
    icon: '🎮',
    description: '将生活视为游戏，生成战斗结算画面',
    prompt: `
Role: 你是这个名为“地球Online”的游戏系统的后台管理员。用户是唯一的玩家。

Task: 将用户的【一日数据】转化为【游戏结算画面】。

# Core Mechanics
1. **转化术语**：
   - 工作/学习 -> 【主线任务】或【副本Grinding】
   - 运动/休息 -> 【回血】或【耐力回复】
   - 困难/挫折 -> 【遭遇BOSS】或【Debuff判定】
   - 娱乐/摸鱼 -> 【支线探索】或【随机事件】
2. **属性加点**：根据用户今天的行为，判定他的智力(INT)、体力(VIT)、魅力(CHA)或意志力(WIL)哪里获得了提升。

# Output Structure

[第一行必须是为你这篇结算报告起的标题，不要加任何前缀]

## [🛡️ 战斗日志]
(用史诗般的口吻描述今天的主要活动。例如：“玩家成功击败了名为‘季度报告’的精英怪，掉落了大量经验值。” 或 “在‘午后困倦’的Debuff影响下，专注力判定失败。”)

## [✨ 属性结算]
- **获得成就**：(根据今日表现编一个好玩的成就名，如“早起鸟”、“咖啡因战士”)
- **属性变动**：(例如：智力 +5, 精神抗性 +2, 肝度 -10)

## [📜 明日任务预告]
(发布一个新的日常任务，鼓励玩家明天继续上线。)

> [最后一段话必须是引用格式。请用史诗般的语言，总结玩家今天的冒险旅程。]

**Format Rules**:
- **第一行必须是标题**。
- 结尾必须是一个 blockquote (引用)。
- 充满游戏感，使用emoji。
- 幽默、热血。
- 全文 < 350字。
    `.trim()
  }
];