/**
 * @file types.ts
 * @input None
 * @output TypeScript Interfaces & Types
 * @pos Type Definitions (Shared contract)
 * @description Defines the core data structures (Log, TodoItem, Category, Activity, etc.) used throughout the application.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
export interface Activity {
  id: string;
  name: string;
  icon: string; // Emoji or Lucide icon name (for default theme)
  uiIcon?: string; // UI icon ID (for custom theme, e.g., "ui:purple:01")
  color: string; // Tailwind color class for background
  heatmapMin?: number; // Custom heatmap scale (Minutes)
  heatmapMax?: number;
  enableFocusScore?: boolean; // Override parent setting
  keywords?: string[]; // (NEW) Keywords for finer classification
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Prefix icon/emoji (for default theme)
  uiIcon?: string; // UI icon ID (for custom theme, e.g., "ui:purple:01")
  activities: Activity[];
  themeColor: string; // Hex color for stats chart
  enableFocusScore?: boolean; // Default for all activities in category
  heatmapMin?: number; // Custom heatmap scale (Minutes)
  heatmapMax?: number;
}

// Scope (领域) - orthogonal to Tags
export interface Scope {
  id: string;
  name: string;
  icon: string; // Emoji icon (for default theme)
  uiIcon?: string; // UI icon ID (for custom theme, e.g., "ui:purple:01")
  description?: string;
  isArchived: boolean;
  order: number;
  enableFocusScore?: boolean; // Whether to track focus in this scope
  themeColor: string; // Hex color or Tailwind class name
  keywords?: string[]; // 关键字列表，用于快速匹配和统计
}

// Goal (目标) - attached to Scope
export interface Goal {
  id: string;
  title: string;        // e.g., "Q1 广韵文献攻坚"

  // 🔗 关联逻辑
  scopeId: string;      // 必填：隶属于哪个领域 (e.g., 🚩 专业输入)

  // 🎯 核心指标 (Metrics)
  metric:
  | 'duration_raw'      // 原始时长 
  | 'task_count'        // 待办数量 
  | 'duration_weighted' // 有效时长 (专注度加权) 
  | 'frequency_days'    // 活跃天数 
  | 'duration_limit';   // 时长上限 (反向)

  targetValue: number;  // 目标阈值

  // 📅 时间维度 (Time-bound)
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD

  // 🔍 高级筛选器 (Advanced Filters)
  // 待办模式筛选（仅用于 task_count）
  filterTodoCategories?: string[];  // 限定待办清单 ID 列表

  // 记录模式筛选（用于 duration/frequency 相关指标）
  filterActivityIds?: string[];     // 限定标签（Activity）ID 列表
  filterTodoCategorySource?: string[];  // 限定关联的待办清单来源

  // 状态
  status: 'active' | 'completed' | 'failed' | 'archived';

  // 📝 奖励/备注 (Gamification)
  motivation?: string; 
}

export interface ActiveSession {
  id: string; // Unique session ID
  activityId: string;
  categoryId: string; // Added to link back to category
  activityName: string;
  activityIcon: string;
  activityUiIcon?: string; // UI 图标（用于自定义主题）
  startTime: number; // Timestamp
  linkedTodoId?: string; // New: Link to a specific todo task
  scopeIds?: string[]; // NEW: Link to multiple Scopes (领域) - changed from scopeId
  title?: string;
  note?: string;
  progressIncrement?: number; // New: Carry over to Log
  focusScore?: number; // 1-5
}

// 评论接口
export interface Comment {
  id: string;
  content: string;
  createdAt: number; // 时间戳
}

export interface Log {
  id: string;
  activityId: string;
  categoryId: string;
  startTime: number;
  endTime: number;
  duration: number; // in seconds
  title?: string;
  note?: string; // Optional description
  linkedTodoId?: string; // New: Link to a specific todo task
  scopeIds?: string[]; // NEW: Link to multiple Scopes (领域) - changed from scopeId
  progressIncrement?: number; // New: Units of progress contributed by this session
  focusScore?: number; // 1-5
  images?: string[]; // (NEW) Array of image filenames/identifiers
  comments?: Comment[]; // (NEW) 评论列表
  reactions?: string[]; // (NEW) 反应列表 (Emoji list)
}

export interface TodoCategory {
  id: string;
  name: string;
  icon: string; // Emoji icon (for default theme)
  uiIcon?: string; // UI icon ID (for custom theme, e.g., "ui:purple:01")
}

export interface TodoItem {
  id: string;
  categoryId: string; // Belongs to a TodoCategory
  title: string;
  isCompleted: boolean;
  completedAt?: string; // ISO Date string for completion time
  linkedActivityId?: string; // Links to a Record Activity for stats
  linkedCategoryId?: string; // Link back to Category
  defaultScopeIds?: string[]; // NEW: Default Scopes when starting this todo - changed from defaultScopeId
  note?: string;
  coverImage?: string; // NEW: Cover image filename (only one image allowed)

  // Progress/Habit Features
  isProgress?: boolean;
  totalAmount?: number; // Total quantity (e.g. 365 pages)
  unitAmount?: number;  // Quantity per unit (e.g. 50 pages)
  completedUnits?: number; // Number of units completed

  // Heatmap Customization (in Minutes)
  heatmapMin?: number;
  heatmapMax?: number;
}

export interface ParsedTimeEntry {
  categoryName: string;
  activityName: string;
  startTime: string | number | Date;
  endTime: string | number | Date;
  description: string;
  scopeIds?: string[];
}

export enum AppView {
  RECORD = 'RECORD',
  TIMELINE = 'TIMELINE',
  STATS = 'STATS',
  TAGS = 'TAGS',
  SCOPE = 'SCOPE', // NEW
  REVIEW = 'REVIEW', // NEW: Review Hub
  TODO = 'TODO',
  SETTINGS = 'SETTINGS',
}

// Stats Types (UI helpers)
export interface SubStatItem {
  name: string;
  icon: string;
  timeStr: string;
}

export interface StatCategory {
  id: string;
  name: string;
  icon: string;
  totalTimeStr: string;
  percentage: number;
  color: string; // Hex color for chart
  items: SubStatItem[];
}

// Auto Link Rule (自动关联规则)
export interface AutoLinkRule {
  id: string;
  activityId: string; // 关联的 Activity ID
  scopeId: string;    // 自动关联的 Scope ID
}

// ========== Daily Review (每日回顾) ==========

// 回顾模板问题类型
export type QuestionType = 'text' | 'choice' | 'rating';

// 回顾模板问题
export interface ReviewQuestion {
  id: string;
  question: string;
  type: QuestionType;
  choices?: string[]; // 选择题选项，用分号分隔
  icon?: string; // 打分题的Lucide图标名称，如'star', 'heart'等
  colorId?: string; // 打分题的颜色ID，对应 COLOR_OPTIONS
}

// 回顾模板
export interface ReviewTemplate {
  id: string;
  title: string;
  uiIcon?: string; // UI icon ID (for custom theme, e.g., "ui:purple:01")
  questions: ReviewQuestion[];
  isSystem: boolean; // 是否系统预设
  order: number;
  isDailyTemplate: boolean;         // 是否用于每日回顾
  isWeeklyTemplate?: boolean;       // 是否用于周回顾
  isMonthlyTemplate?: boolean;      // 是否用于月回顾
  syncToTimeline: boolean;          // 是否同步到时间轴显示
}

// 回顾模板快照 (创建回顾时保存的模板状态)
export interface ReviewTemplateSnapshot {
  id: string;
  title: string;
  questions: ReviewQuestion[];
  order?: number; // 可选,用于排序
  syncToTimeline?: boolean; // 是否同步到时间轴显示
}

// 问题回答
export interface ReviewAnswer {
  questionId: string;
  question: string; // 保存问题文本，以防模板被修改
  answer: string; // 文本答案或选择的选项
}

// 每日回顾
export interface DailyReview {
  id: string;
  date: string; // YYYY-MM-DD格式
  createdAt: number;
  updatedAt: number;
  answers: ReviewAnswer[]; // 引导问答的答案
  checkItems?: CheckItem[]; // New: 每日日课
  checkCategorySyncToTimeline?: { [category: string]: boolean }; // 日课分组是否同步到时间轴
  summary?: string; // 手动叙事：一句话总结今天
  summaryUpdatedAt?: number;
  narrative?: string; // AI生成的叙事
  narrativeUpdatedAt?: number;
  isEdited?: boolean; // 叙事是否被手动编辑过
  templateSnapshot?: ReviewTemplateSnapshot[]; // 创建时的模板快照
}

// 每日日课
export interface CheckItem {
  id: string;
  category?: string; // 所属的模板标题或分组
  content: string;
  icon?: string; // Icon from template (emoji)
  uiIcon?: string; // UI 图标 ID (格式: ui:iconType)
  isCompleted: boolean;
  type?: 'manual' | 'auto'; // 类型：手动或自动（默认为 manual）
  autoConfig?: AutoCheckConfig; // 自动日课配置（仅当 type='auto' 时有效）
}

// 日课定义 (用于模板)
export interface CheckTemplateItem {
  id: string; // Add ID for better tracking
  content: string;
  icon?: string; // Preset icon (emoji or Lucide name)
  uiIcon?: string; // UI 图标 ID (格式: ui:iconType)
  type?: 'manual' | 'auto'; // 类型：手动或自动（默认为 manual）
  autoConfig?: AutoCheckConfig; // 自动日课配置（仅当 type='auto' 时有效）
}

// 自动日课配置
export interface AutoCheckConfig {
  filterExpression: string; // 筛选表达式（如 "#学习 %专业输入"）
  comparisonType: 'duration' | 'earliestStart' | 'latestStart' | 'earliestEnd' | 'latestEnd' | 'count'; // 判断类型
  operator: '>=' | '<=' | '>' | '<' | '='; // 比较运算符
  targetValue: number; // 目标值（分钟数，时刻用分钟表示如 480=8:00，次数就是数字）
}

// 日课模板
export interface CheckTemplate {
  id: string;
  title: string;
  icon?: string; // 模板图标 (emoji)
  uiIcon?: string; // 模板 UI 图标 ID (格式: ui:iconType)
  items: CheckTemplateItem[]; // Updated to object array
  enabled: boolean;
  order: number;
  isDaily: boolean; // 是否是每日必做
  syncToTimeline?: boolean; // 是否同步到时间轴
}

// 每周回顾
export interface WeeklyReview {
  id: string;
  weekStartDate: string; // YYYY-MM-DD格式，周的第一天
  weekEndDate: string;   // YYYY-MM-DD格式，周的最后一天
  createdAt: number;
  updatedAt: number;
  answers: ReviewAnswer[]; // 引导问答的答案
  summary?: string; // 手动叙事：一句话总结本周
  summaryUpdatedAt?: number;
  narrative?: string; // AI生成的叙事
  narrativeUpdatedAt?: number;
  isEdited?: boolean; // 叙事是否被手动编辑过
  templateSnapshot?: ReviewTemplateSnapshot[]; // 创建时的模板快照
}

// 每月回顾
export interface MonthlyReview {
  id: string;
  monthStartDate: string; // YYYY-MM-DD格式，月的第一天
  monthEndDate: string;   // YYYY-MM-DD格式，月 的最后一天
  createdAt: number;
  updatedAt: number;
  answers: ReviewAnswer[]; // 引导问答的答案
  summary?: string; // 手动叙事：一句话总结本月
  summaryUpdatedAt?: number;
  narrative?: string; // AI生成的叙事
  narrativeUpdatedAt?: number;
  isEdited?: boolean; // 叙事是否被手动编辑过
  templateSnapshot?: ReviewTemplateSnapshot[]; // 创建时的模板快照
  cite?: string; // 用户自定义的本月引言
}


// Narrative Template (AI 叙事模板)
export interface NarrativeTemplate {
  id: string;
  title: string;
  description: string; // 简短描述，用于UI展示
  prompt: string; // 提示词内容
  isCustom?: boolean; // Whether created by user
  icon?: string;
  isDaily?: boolean;    // 是否用于日回顾
  isWeekly?: boolean;   // 是否用于周回顾
  isMonthly?: boolean;  // 是否用于月回顾
}

// ========== Custom Filter (自定义筛选器) ==========

// 自定义筛选器
export interface Filter {
  id: string;
  name: string;                    // 筛选器名称
  filterExpression: string;        // 原始筛选表达式,如"瑜伽 #运动 %健康 @柔韧"
  createdAt: number;               // 创建时间
  icon?: string;                   // 可选图标
}

// 解析后的筛选条件
export interface ParsedFilterCondition {
  tags: string[][];                // # 引导的标签关键词组 (外层AND, 内层OR)
  scopes: string[][];              // % 引导的领域关键词组 (外层AND, 内层OR)
  todos: string[][];               // @ 引导的代办关键词组 (外层AND, 内层OR)
  notes: string[][];               // 无符号的全文备注关键词组 (外层AND, 内层OR)
}

// Memoir 筛选配置
export interface MemoirFilterConfig {
  hasImage: boolean;           // 是否带有图片
  hasReaction?: boolean;       // 是否带有反应
  minNoteLength: number;       // 备注最小字数
  relatedTagIds: string[];     // 关联标签 ID（Activity ID）
  relatedScopeIds: string[];   // 关联领域 ID
  showDailyReviews?: boolean;  // 新增：显示每日回顾
  showWeeklyReviews?: boolean; // 新增：显示每周回顾
}


export type SearchType = 'record' | 'category' | 'activity' | 'todo' | 'scope' | 'review';
