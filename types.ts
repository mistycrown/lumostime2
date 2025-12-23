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
  icon: string; // Emoji or Lucide icon name
  color: string; // Tailwind color class for background
  heatmapMin?: number; // Custom heatmap scale (Minutes)
  heatmapMax?: number;
  enableFocusScore?: boolean; // Override parent setting
  keywords?: string[]; // (NEW) Keywords for finer classification
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Prefix icon/emoji
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
  icon: string; // Emoji icon
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
  motivation?: string;  // e.g., "完成奖励自己一套新香具"
}

export interface ActiveSession {
  id: string; // Unique session ID
  activityId: string;
  categoryId: string; // Added to link back to category
  activityName: string;
  activityIcon: string;
  startTime: number; // Timestamp
  linkedTodoId?: string; // New: Link to a specific todo task
  scopeIds?: string[]; // NEW: Link to multiple Scopes (领域) - changed from scopeId
  title?: string;
  note?: string;
  progressIncrement?: number; // New: Carry over to Log
  focusScore?: number; // 1-5
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
}

export interface TodoCategory {
  id: string;
  name: string;
  icon: string;
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

  // Progress/Habit Features
  isProgress?: boolean;
  totalAmount?: number; // Total quantity (e.g. 365 pages)
  unitAmount?: number;  // Quantity per unit (e.g. 50 pages)
  completedUnits?: number; // Number of units completed

  // Heatmap Customization (in Minutes)
  heatmapMin?: number;
  heatmapMax?: number;
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
  questions: ReviewQuestion[];
  isSystem: boolean; // 是否系统预设
  order: number;
  enabled: boolean; // 是否启用
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
  narrative?: string; // AI生成的叙事
  narrativeUpdatedAt?: number;
  isEdited?: boolean; // 叙事是否被手动编辑过
  templateSnapshot?: ReviewTemplateSnapshot[]; // 创建时的模板快照
}

// 每周回顾
export interface WeeklyReview {
  id: string;
  weekStartDate: string; // YYYY-MM-DD格式，周的第一天
  weekEndDate: string;   // YYYY-MM-DD格式，周的最后一天
  createdAt: number;
  updatedAt: number;
  answers: ReviewAnswer[]; // 引导问答的答案
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
  narrative?: string; // AI生成的叙事
  narrativeUpdatedAt?: number;
  isEdited?: boolean; // 叙事是否被手动编辑过
  templateSnapshot?: ReviewTemplateSnapshot[]; // 创建时的模板快照
}

// Narrative Template (AI 叙事模板)
export interface NarrativeTemplate {
  id: string;
  title: string;
  description: string; // 简短描述，用于UI展示
  prompt: string; // 提示词内容
  isCustom?: boolean; // Whether created by user
  icon?: string;
}