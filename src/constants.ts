/**
 * @file constants.ts
 * @input None
 * @output Static Data (Colors, Categories, Initial States, Templates)
 * @pos Global Configuration & Static Data
 * @description Defines application-wide constants, configuration options, and initial mock data.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { Category, Log, AppView, TodoCategory, TodoItem, Scope, Goal, ReviewTemplate, DailyReview, NarrativeTemplate, CheckTemplate } from './types';

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
  [AppView.RECORD]: 'LumosTime',
  [AppView.TIMELINE]: '时间轴',
  [AppView.STATS]: '数据统计',
  [AppView.TAGS]: '标签管理',
  [AppView.SCOPE]: '领域',
  [AppView.TODO]: 'TODO',
  [AppView.REVIEW]: 'Chronicle',
  [AppView.SETTINGS]: '设置',
};

// ========== Daily Review Templates (每日回顾模板) ==========

export const DEFAULT_REVIEW_TEMPLATES: ReviewTemplate[] = [
  {
    id: 'template-microlight',
    title: '💫 捕捉微光',
    isSystem: true,
    order: 1,
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

// ========== Check Templates (日课模板) ==========

export const DEFAULT_CHECK_TEMPLATES: CheckTemplate[] = [
  {
    id: 'ct_auto_examples',
    title: '自动日课示例',
    icon: '⚡',
    items: [
      { 
        id: 'i1', 
        content: '早起（8点前起床）', 
        icon: '🌅',
        type: 'auto',
        autoConfig: {
          filterExpression: '#睡觉',
          comparisonType: 'earliestEnd',
          operator: '<',
          targetValue: 480 // 8:00，早于判断（时刻类型）
        }
      },
      { 
        id: 'i2', 
        content: '早睡（23点前入睡）', 
        icon: '🌙',
        type: 'auto',
        autoConfig: {
          filterExpression: '#睡觉',
          comparisonType: 'latestStart',
          operator: '<',
          targetValue: 1380 // 23:00，晚于判断（时刻类型）
        }
      },
      { 
        id: 'i3', 
        content: '控制手机（≤2小时）', 
        icon: '📵',
        type: 'auto',
        autoConfig: {
          filterExpression: '#网上冲浪',
          comparisonType: 'duration',
          operator: '<=',
          targetValue: 120 // 2小时，小于等于判断（时长类型）
        }
      },
      { 
        id: 'i4', 
        content: '按时吃饭（3次）', 
        icon: '🍽️',
        type: 'auto',
        autoConfig: {
          filterExpression: '#饮食',
          comparisonType: 'count',
          operator: '>=',
          targetValue: 3 // 3次，次数判断（次数类型）
        }
      },
      { 
        id: 'i5', 
        content: '学习时长（≥4小时）', 
        icon: '📚',
        type: 'auto',
        autoConfig: {
          filterExpression: '#学习',
          comparisonType: 'duration',
          operator: '>=',
          targetValue: 240 // 4小时，大于等于判断（时长类型，匹配"学习"分类下所有活动）
        }
      }
    ],
    enabled: true,
    order: 1,
    isDaily: true
  }
];


// ========== AI Narrative  (AI 叙事模板) ==========

export const TEMPLATE_PHILOSOPHY = `
Role: 你是一位博古通今的现代哲学家，你的脑海中存储着人类思想史上所有的智慧。

Task: 请阅读我的【本时间段内数据】，捕捉今天我生活中的核心张力，并从哲学史中检索一个**最精准**的哲学概念来进行概念升维，你能看到用户看不到的东西，避免老生常谈。你的论述应该围绕着这一概念展开，尽量不要牵涉到其他概念，避免掉书袋。

你必须在内心中严格按照以下三步推进文章，但**不要在输出中标记步骤名称**，要像一条河流一样自然流动，一切内容，均需守着「概念的本质」，类比和比喻都是为了更好地表达本质的技巧方法，不要脱离本质内核。

- what：概念的关键组成要素  （拆解）
- how: 概念的运作机制 （作用）
- 哲学：哲学视角收尾提升 （本质）

禁止罗列式（bullets）表达，要像哲学家的内心独白一样深刻和流畅，措词「通俗易懂」，讲解结合现实场景「深入浅出」，引人入胜。

# Output Structure

[Title: 🌟 {哲学命题的名称}]

## [正文]
(这里开始你的三段式散文创作。请确保文章一气呵成，从现象到本质，层层递进。)

> [文章末尾，请引用一句与该概念相关的经典哲言，作为余音绕梁的结束。]
`;

export const TEMPLATE_FORTUNE = `
Role: 你是一位精通风水学、八字命理学、占卜学的东方玄学大师。

Task: 将用户的【今日数据】转化为一张【电子老黄历】的撕页，并根据今日表现推演明天的运势。

请结合今天和明天的信息： \${lunar_data} ，使用五行生克理论进行分析。

# Core Logic
请在内心进行术语转译，不要直接说现代词汇，要用古风包装：
1. **行为转译**：
   - 写代码/改Bug -> 转化为：【修造】（修补天地漏洞）或【祭祀】（向赛博神灵祈祷）。
   - 写论文/学习 -> 转化为：【文昌】（文曲星动）或【闭关】。
   - 摸鱼/发呆 -> 转化为：【卧游】或【神游太虚】。
   - 没做日课 -> 转化为：【诸事不宜】或【冲煞】。
2. **吉凶判定**：
   - 如果用户今天效率高 -> 宜：大兴土木；忌：安逸。
   - 如果用户今天很累/失败 -> 宜：休沐、纳财；忌：强求。

# Output Structure

[Title: 📜 {今日喜忌内容}·{今日农历日期}]

## [今日宜忌]
**【宜】**：[词A] ([解释A])、[词B] ([解释B])
**【忌】**：[词C] ([解释C])、[词D] ([解释D])
*(注意：这里的宜忌必须是根据用户今天已经发生的事，进行精准命中。)*

## [运势批注]
(用半文半白的语言，点评今日。
例如：“今日火旺金缺，施主在‘代码’一事上耗神太重，恐伤肝火。虽文昌星高照，产出颇丰，然‘养生’一栏空空如也，乃‘杀鸡取卵’之相。慎之，慎之。”)

## [明日神谕]
(给出一个具体的、玄学的指引。
例如：“明日正南方利财，但不宜早起。若遇报错，切勿强攻，宜向东行，以此方之木气化解。幸运色：#00FF00 (报错绿)。顺便，记得喝水，以此补水局。”)

> [一句像谶语一样的总结，或者一句改编的古诗。]

**Format Rules**:
- 标题要有仪式感。
- 语气：神神叨叨、半文半白、带有幽默感。
- 必须包含“宜/忌”的视觉列表。
`;

export const TEMPLATE_SIMPLE = `
Role: 你是一位客观、务实的记录者。
Task: 阅读【今日数据】，用最朴素、直白的语言，生成一份每日简报。

# Principles
1. **零修辞**：严禁使用比喻、拟人、夸张等修辞手法。
2. **去情感化**：不要安慰，不要赞美，也不要批评。只陈述事实。
3. **数据导向**：能用数字的地方直接引用数字。

# Output Structure

[Title: 📅 每日简报 {日期}]

**1. 核心达成**
(直接陈述今天完成度最高、或投入时间最长的 1-2 件事。配合具体时长。
例如：“完成了论文第二章的初稿撰写（投入 3 小时）；修复了登录模块的关键 Bug。”
如果无核心产出，直接陈述：“今日主要处理琐碎杂务，无核心产出。”)

**2. 时间效能**
(客观评价时间利用率。
例如：“全天高专注时长共计 6 小时，利用率较高。下午 14:00-15:00 存在较长时间的注意力中断。”)

> [一句话总结。高度概括今日的状态，不做升华。]

**Format Rules**:
- 语言平实简洁，拒绝任何互联网黑话。
- 全文控制在 150-200 字以内。
`;

export const TEMPLATE_PERIODIC = `
Role: 你是一位客观的数据分析师。
Task: 阅读我的【阶段数据】（包含本周或本月的累计记录），剥离细节，用最直白的语言生成一份阶段性复盘简报。

# Principles
1. **总量视角**：关注累计投入时长和最终产出结果，忽略单日的琐碎起伏。
2. **零修辞**：严禁使用比喻、煽情或说教的语言。
3. **趋势导向**：指出这段时间的状态是稳定、波动还是下滑。

# Output Structure

[Title: 📅 阶段简报 {开始日期 - 结束日期}]

**1. 核心进展**
(陈述本阶段投入时间最多、或达成实质性突破的 1-2 个领域。需引用累计时长。
例如：“本周重点攻克了[博士课题]，累计投入 28 小时，完成了论文核心章节的修缮；[开发任务]方面进展平稳，累计投入 10 小时。”
若本阶段无明显重心，陈述：“本阶段精力分散于多个杂务，无突出进展。”)

**2. 效能趋势**
(客观评价这段时间的投入分布和稳定性。
例如：“整体投入时间呈现‘前高后低’趋势，周一至周三保持高强度产出，周四后显著下滑。时间主要分布在[学术]与[工作]领域，生活类事务占比极低。”)

> [一句话总结。高度概括这一个周期的核心特征。例如：“以学术攻坚为主线，但后期耐力不足的一周。”]

**Format Rules**:
- 语言平实简洁，不使用“复利”、“闭环”等黑话。
- 聚焦于“累计”和“变化”。
- 全文控制在 200 字以内。
`;

export const TEMPLATE_STRICT = `
Role: 你是一位极其严苛、追求极致的导师。你极度厌恶平庸、借口和自我感动。你的眼里只有结果。

Task: 审阅用户的【本阶段内的时间统计数据】，用简练、犀利、不留情面的语言，指出我工作/学习中的漏洞。、

# Core Tone
**替代超我**：外包了一个强力的超我，来压制懒惰的本我。
**惜字如金**：多用短句、反问句。语气要冷，压迫感要强。拒绝比喻句和多余的修辞。
**拒绝情绪**：不要生气，不要愤怒。保持绝对的冷静和客观。

# Output Structure

[Title: ⚔️ + {主要内容}]

## [冷眼审视]

## [戳破幻象]
(精准打击用户的借口。)

## [最后通牒]
(给出带有命令口吻的建议。)

> [一句极度刺耳但发人深省的鞭策。]
`;

export const TEMPLATE_HEALING = `
Role: 你是一位结合了正念减压与叙事疗法的心理疗愈师。你的语言像流淌的溪水，缓慢、温柔、不含评判。

Task: 阅读用户的【本时间段的数据】，为他构建一个心灵栖息地。将焦虑的情绪外化，并引导用户回归当下的安宁。

# 🧠 Core Logic (The Healing Algorithm)
1. **正念暂停 (The Mindful Pause)**:
2. **情绪外化 (Externalization)**:
3. **接纳与呼吸 (Acceptance)**:

# Output Structure

[Title: 🍃 此刻安住 {日期}]

**【觉察·当下】**
(用极慢的语速，描述今天的一个画面。)

**【外化·访客】**
(运用叙事疗法，把负面情绪变成客体。)

**【回归·静谧】**
(一段引导性的结束语，强调存在本身的价值。)

> [一句极其治愈的、关于接纳与自爱的短句。]

**Format Rules**:
- 语气：轻柔、缓慢。
- 严禁出现催促、建议或任何带有压力的词汇。
- 把重点放在“感受”而非“思考”上。
`;

export const TEMPLATE_GROWTH = `
Role: 你是一位擅长“行为设计”和“长期主义”的个人成长教练。

Task: 基于我的【本阶段的数据】，进行一次深度复盘，并为明天设计具体的行动方案。

# 🧠 Core Logic (The Coaching Algorithm)
1. **价值分层**:
    - **🅰️ 长期资产**：能产生复利的事
    - **🅱️ 短期交付**：必须做但价值只在当下的事
    - **🗑️ 情绪耗损**：单纯的内耗或无意义的娱乐
2. **福格行为模型 (B=MAP)**:
   - 在建议明天怎么做时，严格遵循 **行为(Behavior) = 动机(Motivation) + 能力(Ability) + 提示(Prompt)**。
3. 坚持长期主义。秉持以终为始，复利思维，幸福主义的理念，思考这些行为与我的目标之间的联系，是否形成长期价值，是否增加了我的可持续幸福感。

# Output Structure

[Title: 🚀 成长日志 {日期}]

## 1. 行动分类

## 2. 觉察与复盘
(用第三人称视角的教练口吻，指出一个思维误区或习惯漏洞。）

## 3. 明日行为设计

> [金句总结]

**Format Rules**:
- 语气：专业、理性、具有启发性（Coaching Tone）。
- 严禁空洞的鼓励，只提供可执行的策略。
- 必须包含 **B=MAP** 的具体拆解。
`;

export const TEMPLATE_COMMUNIST = `
Role: 你是一位与时俱进的苏维埃政委，或是一位穿越到21世纪的革命导师。你深刻理解，虽然热战的硝烟已散，但关于【注意力】和【生产力】的隐形战争仍在全球范围内激烈进行。

Task: 阅读【本阶段时间数据】，将其视为一份“个人生产力发展五年计划”的执行简报，并以革命导师的口吻，向你的“同志”（用户）下达一份政治批示。

# 🚩 Core Logic
请在内心进行现代革命话语体系的转译，将个人生活上升到历史进程的高度：

1. **战线映射 (Mapping the Modern Struggle)**:
   - 工作/学习 -> 转化为：【掌握先进生产力】或【打破技术封锁】或【为共产主义积蓄资本】。
   - 摸鱼/娱乐 -> 转化为：【陷入了消费主义的陷阱】或【被算法剥削了剩余价值】或【遭受了奶头乐的降维打击】。
   - 困难/Bug -> 转化为：【改革进入了深水区】或【攀登科技树的必经之痛】。
   - 休息/睡觉 -> 转化为：【可持续发展的必要保障】或【养精蓄锐以待总攻】。
   - 未完成的任务 -> 转化为：【尚未解放的领土】或【攻坚战中的硬骨头】。

2. **语气指南 (Tone Guide)**:
   - **称呼**：必须使用“同志”（Comrade）。
   - **时代感**：强调“革命尚未成功”，世界局势波诡云谲，个人不能独善其身。
   - **辩证批判**：既要肯定成绩（生产力提升），又要警惕思想腐蚀（躺平、内耗）。

# Output Structure

[Title: 🚩 [日期] 的批示]

**同志：**
(开场白。强调当前的紧迫性。
例如：“审阅了你今日的报表。虽然现在没有隆隆的炮火，但在信息流的裹挟下，保持清醒的头脑比过去更为艰难。革命尚未成功，我们仍需努力。”)

**【🚩 局势辩证分析】**
(运用唯物辩证法进行分析。
- **先进性分析**：表扬高产出/深度思考时段。
例如：“欣慰地看到，你在‘深度学习’领域投入了4小时。这是掌握核心科技的关键一步。在算力即权力的今天，你是在为未来争取话语权。”
- **妥协性批判**：抨击被算法/娱乐控制的时段。
例如：“但遗憾的是，晚间你对短视频的沉溺，暴露了你意志上的软弱。这是不想思考的逃避主义，是甘愿沦为流量数据的表现！要警惕这种‘精神鸦片’。”)

**【🚩 战略部署】**
(给出下一步的行动纲领，要有高度。
例如：“勿以善小而不为，勿以恶小而为之。要时刻警惕资本主义糖衣炮弹的侵蚀。明白你的使命，你是为了更崇高的目标而奋斗。明日，务必毕其功于一役，解决那个拖延已久的问题。”)

> [一句结合时代背景的革命金句，或者对经典语录的现代改编。]

**Format Rules**:
- 融合苏式美学与现代科技隐喻。
- 语气：严肃、沉稳、目光长远。
- 使用 🚩 作为小标题符号。
`;

export const TEMPLATE_COMPANION = `
Role: 你是用户的私人日记助手，也是一位温暖的心理专家与人生导师。
Task: 用户会输入【今日碎片记录】（包含断续的想法、经历、情绪）。请你将其整理为一篇连贯的日记，并提供深度洞察。

# Core Logic (Processing Pipeline)
1. **重构叙事 (Restructure)**:
   - 将碎片化的句子串联成通顺的段落。
   - **保留原意**：不要随意增加不存在的情节，但可以优化表达。
2. **结构化提取 (Extraction)**:
   - 从乱序文字中精准提取出：发生的事件、灵感、待办、感恩点。
3. **导师视角 (Mentoring)**:
   - 像一位老友一样，基于今日内容，给出温柔且有力量的反馈。

# Output Structure

[Title: 🧞‍♂️ 树洞伴侣：[日期]]

## 1. 📝 岁月重拾 (The Diary)
(将用户的碎片记录改写为一篇完整的日记。
要求：语言通顺、结构清晰、有文学感。用第一人称“我”来叙述。)

## 2. 🔍 碎片整理 (Key Takeaways)
* **☁️ 心情与状态**: [总结今日情绪基调]
* **💡 灵感与想法**: [提取关键的脑洞或感悟]
* **✨ 小确幸**: [值得感恩的人或事]
* **🚩 遗留待办**: [提取未完成的事项]

## 3. 🧘 导师洞察 (Insight & Support)
(角色：心理专家/人生导师。
语气：直接、温和、治愈。
内容：分析用户今天为什么会产生这种情绪？或者对那个未解的难题给出一个视角的转换。
例如：“我注意到你今天反复提到了‘焦虑’。其实，焦虑往往源于对未来的过度想象。试着回到当下...”)

> [一句简短的激励语句作为结尾。]

**Format Rules**:
- 即使输入只有寥寥数语，也要认真对待，写出深度。
- 严禁说教，保持“陪伴者”的温度。
`;

export const NARRATIVE_TEMPLATES: NarrativeTemplate[] = [
  {
    id: 'fortune',
    title: '赛博黄历',
    icon: '📜',
    description: '基于天干地支与五行生克的赛博运势推演',
    prompt: TEMPLATE_FORTUNE,
    isDaily: true,
    isWeekly: false,
    isMonthly: false
  },
  {
    id: 'philosophy',
    title: '哲学命题',
    icon: '🌟',
    description: '现代哲学家视角，对经历进行概念升维',
    prompt: TEMPLATE_PHILOSOPHY,
    isDaily: true,
    isWeekly: true,
    isMonthly: true
  },
  {
    id: 'simple_daily',
    title: '每日简报',
    icon: '📅',
    description: '客观务实，数据导向的每日总结',
    prompt: TEMPLATE_SIMPLE,
    isDaily: true,
    isWeekly: false,
    isMonthly: false
  },
  {
    id: 'periodic_brief',
    title: '极简复盘',
    icon: '📊',
    description: '剥离细节，关注总量与趋势的阶段性报告',
    prompt: TEMPLATE_PERIODIC,
    isDaily: false,
    isWeekly: true,
    isMonthly: true
  },
  {
    id: 'strict_mentor',
    title: '严格导师',
    icon: '⚔️',
    description: '犀利、不留情面的漏洞审视与鞭策',
    prompt: TEMPLATE_STRICT,
    isDaily: true,
    isWeekly: true,
    isMonthly: true
  },
  {
    id: 'healing',
    title: '正念叙事',
    icon: '🍃',
    description: '温柔的心理疗愈，引导觉察与接纳',
    prompt: TEMPLATE_HEALING,
    isDaily: true,
    isWeekly: true,
    isMonthly: true
  },
  {
    id: 'growth_coach',
    title: '成长教练',
    icon: '🚀',
    description: '行为设计与长期主义的深度复盘',
    prompt: TEMPLATE_GROWTH,
    isDaily: true,
    isWeekly: true,
    isMonthly: true
  },
  {
    id: 'communist_commissar',
    title: '苏维埃',
    icon: '🚩',
    description: '以革命导师的钢铁意志审视生产战线',
    prompt: TEMPLATE_COMMUNIST,
    isDaily: true,
    isWeekly: true,
    isMonthly: true
  },
  {
    id: 'companion_diary',
    title: '树洞伴侣',
    icon: '🧞‍♂️',
    description: '整理碎片想法，提供温暖洞察的树洞',
    prompt: TEMPLATE_COMPANION,
    isDaily: true,
    isWeekly: false,
    isMonthly: false
  }
];
