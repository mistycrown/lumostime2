/**
 * @file types.ts
 * @updated 2026-08-24: Added Activity-level custom attribute definitions and ID-based values on logs and active sessions.
 * @updated 2026-08-06: Added backward-compatible archive state to activities.
 * @updated 2026-08-26: Added backward-compatible archive state to categories so category archiving can cascade to all child activities.
 * @updated 2026-08-09: Added character attributes, experience ledgers, and optional fixed-rule attribute experience effects.
 * @input None
 * @output TypeScript Interfaces & Types
 * @pos Type Definitions (Shared contract)
 * @description Defines the core data structures (Log, TodoItem, Category, Activity, Filter order metadata, etc.) used throughout the application.
 * @updated 2026-07-11: Added per-achievement todo completion subtask inclusion flags so todo-category rules can distinguish parent tasks from subtasks.
 * @updated 2026-06-13: Added local daily newspaper comment-thread types so users can reply to AI annotations without entering global chat history.
 * @updated 2026-07-07: Added achievement account summary fields so current-bottle and history-bottle balances can stay explicit across UI and sealing logic.
 * @updated 2026-06-07: Added structured weekly/monthly AI newspaper types so periodic reviews can persist editorial summary pages alongside existing narratives.
 * @updated 2026-05-21: Added optional todo `createdAt` metadata so collection timelines and older persisted task flows can share one creation-time fallback.
 * @updated 2026-05-16: Added lightweight daily AI newspaper types so Daily Review can persist structured editorial timeline commentary by log ID.
 * @updated 2026-05-13: Added optional monthly recurrence fallback support so 31st-style rules can land on the last day in shorter months when explicitly enabled.
 * @updated 2026-05-13: Added optional todo `kind` support so lightweight quick reminders can share the Todo pipeline while opting out of project-only behavior.
 * @updated 2026-05-12: Added first-pass `DataCollection` and `DataCollectionEntry` types for grouping logs and todos into themed review collections.
 * @updated 2026-05-05: Added optional scene-widget source metadata to active sessions so scene card syncing can stay scoped to one scene group and time slot.
 * @updated 2026-04-25: Added global check streak multiplier config plus category-level streak toggles for achievement weighting.
 * @updated 2026-07-30: Added optional per-item enabled flags for daily check template items.
 * @updated 2026-07-30: Cleaned historical mojibake comments from shared type definitions touched by daily check work.
 * @updated 2026-04-21: Added one-level todo hierarchy support via optional `parentTodoId` and `childOrder` fields.
 * @updated 2026-04-21: Added an optional boolean `pin` flag for prioritizing todos in the today schedule list.
 * @updated 2026-04-20: Added configurable todo duplication options for quick-copy editing.
 * @updated 2026-07-30: Added recurring auto-plan metadata so Repeat todos can materialize locked timeline Plan blocks over a finite future window.
 * @updated 2026-04-20: Added todo schedule and recurrence rule types for week-view planning.
 * @updated 2026-04-19: Added reusable note template definitions for detail-page editing and inline note recommendations.
 * @updated 2026-04-18: Added custom sticker set and sticker record types for synced mood sticker uploads.
 * @updated 2026-04-17: Added achievement filter-duration rules with inline filter expressions.
 * @updated 2026-04-18: Expanded widget session metadata to match the slot-based widget model, including shortcut slots.
 * @updated 2026-08-10: Replaced the cross-midnight sleep rule with nightEarliestStart so split sleep records use the bedtime segment.
 *
 * Note: update this header comment and the folder README when changing this file.
 */
export interface NoteTemplate {
  id: string;
  name: string;
  content: string;
  order?: number;
}

export type ActivityAttributeType = 'text' | 'single' | 'multi' | 'number';

export interface ActivityAttributeOption {
  id: string;
  label: string;
  isArchived?: boolean;
}

export interface ActivityAttributeDefinition {
  id: string;
  name: string;
  type: ActivityAttributeType;
  options?: ActivityAttributeOption[];
  order: number;
  isArchived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type ActivityAttributeValue =
  | { attributeId: string; value: string }
  | { attributeId: string; value: number }
  | { attributeId: string; optionId: string }
  | { attributeId: string; optionIds: string[] };

export interface Activity {
  id: string;
  name: string;
  icon: string; // Emoji or Lucide icon name (for default theme)
  uiIcon?: string; // UI icon ID (for custom theme, e.g., "ui:purple:01")
  color: string; // Tailwind color class for background
  heatmapMin?: number; // Custom heatmap scale (Minutes)
  heatmapMax?: number;
  enableFocusScore?: boolean; // Override parent setting
  enableMoodScore?: boolean; // Override parent setting for mood tracking
  keywords?: string[]; // (NEW) Keywords for finer classification
  noteTemplates?: NoteTemplate[];
  attributes?: ActivityAttributeDefinition[];
  isArchived?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Prefix icon/emoji (for default theme)
  uiIcon?: string; // UI icon ID (for custom theme, e.g., "ui:purple:01")
  isArchived?: boolean;
  activities: Activity[];
  themeColor: string; // Hex color for stats chart
  enableFocusScore?: boolean; // Default for all activities in category
  enableMoodScore?: boolean; // Default for all activities in category for mood tracking
  heatmapMin?: number; // Custom heatmap scale (Minutes)
  heatmapMax?: number;
  noteTemplates?: NoteTemplate[];
}

export interface Scope {
  id: string;
  name: string;
  icon: string; // Emoji icon (for default theme)
  uiIcon?: string; // UI icon ID (for custom theme, e.g., "ui:purple:01")
  description?: string;
  isArchived: boolean;
  order: number;
  enableFocusScore?: boolean; // Whether to track focus in this scope
  enableMoodScore?: boolean; // Whether to track mood in this scope
  themeColor: string; // Hex color or Tailwind class name
  noteTemplates?: NoteTemplate[];
  keywords?: string[];
}

export interface Goal {
  id: string;
  title: string;

  scopeId: string;

  metric:
  | 'duration_raw'
  | 'task_count'
  | 'duration_weighted'
  | 'frequency_days'
  | 'duration_limit'
  | 'record_count';

  targetValue: number;

  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD

  // Filters for task-count goals.
  filterTodoCategories?: string[];

  // Filters for duration and frequency goals.
  filterActivityIds?: string[];
  filterTodoCategorySource?: string[];

  status: 'active' | 'completed' | 'failed' | 'archived';

  motivation?: string;
  
  // Optional parent major-goal grouping.
  majorGoalId?: string;
  order?: number;
}

// Major goal grouping.
export interface MajorGoal {
  id: string;
  title: string;
  scopeId: string;
  
  metric: Goal['metric'];
  
  targetValue: number;
  
  startDate: string;
  endDate: string;
  
  description?: string;
  motivation?: string;
  
  filterActivityIds?: string[];
  filterTodoCategories?: string[];
  filterTodoCategorySource?: string[];
  
  status: 'active' | 'completed' | 'archived';
  
  createdAt: string;
  updatedAt: string;
  order?: number;
}

export interface ActiveSession {
  id: string; // Unique session ID
  activityId: string;
  categoryId: string; // Added to link back to category
  activityName: string;
  activityIcon: string;
  activityUiIcon?: string; // UI
  startTime: number; // Timestamp
  linkedTodoId?: string; // New: Link to a specific todo task
  scopeIds?: string[]; // NEW: Link to multiple Scopes - changed from scopeId
  title?: string;
  note?: string;
  attributeValues?: ActivityAttributeValue[];
  progressIncrement?: number; // New: Carry over to Log
  focusScore?: number; // 1-5
  moodScore?: number; // 1-5 mood rating
  reactions?: string[]; // Emoji reactions
  source?: 'app' | 'widget';
  widgetType?: 'timer' | 'daily' | 'shortcut';
  slotIndex?: number;
  templateId?: string;
  appWidgetId?: number;
  sceneGroupId?: string;
  sceneSlotId?: string;
  sceneItemId?: string;
  appAwarenessMeta?: AppAwarenessSessionMeta;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: number;
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
  attributeValues?: ActivityAttributeValue[];
  linkedTodoId?: string; // New: Link to a specific todo task
  isPlanned?: boolean; // A virtual planning block created from the Chronicle todo sidebar
  planSource?: 'recurrence-auto'; // Marks Plan blocks generated from a Repeat todo rule
  plannedOccurrenceDate?: string; // YYYY-MM-DD occurrence date used for recurring Plan dedupe and locks
  scopeIds?: string[]; // NEW: Link to multiple Scopes - changed from scopeId
  progressIncrement?: number; // New: Units of progress contributed by this session
  focusScore?: number; // 1-5
  moodScore?: number; // 1-5 mood rating
  images?: string[]; // (NEW) Array of image filenames/identifiers
  comments?: Comment[]; // (NEW)
  reactions?: string[]; // (NEW) (Emoji list)
  appAwarenessMeta?: AppAwarenessSessionMeta;
}

export type AppAwarenessStepType =
  | 'text_question'
  | 'single_choice'
  | 'cooldown_wait'
  | 'expected_duration'
  | 'start_record';

export type AppAwarenessRunStatus =
  | 'idle'
  | 'running_step'
  | 'waiting_cooldown'
  | 'paused_away'
  | 'timer_running'
  | 'timer_overtime_pending'
  | 'completed'
  | 'abandoned'
  | 'cancelled';

export interface AppAwarenessChoiceOption {
  id: string;
  label: string;
  value: string;
}

export interface AppAwarenessActivityOption {
  id: string;
  categoryId: string;
  activityId: string;
  label: string;
  icon?: string;
}

export interface AppAwarenessStepBase {
  id: string;
  type: AppAwarenessStepType;
  title: string;
  description?: string;
  required?: boolean;
}

export interface AppAwarenessTextQuestionStep extends AppAwarenessStepBase {
  type: 'text_question';
  answerKey: string;
  placeholder?: string;
  maxLength?: number;
}

export interface AppAwarenessSingleChoiceStep extends AppAwarenessStepBase {
  type: 'single_choice';
  answerKey: string;
  options: AppAwarenessChoiceOption[];
}

export interface AppAwarenessCooldownWaitStep extends AppAwarenessStepBase {
  type: 'cooldown_wait';
  durationSeconds: number;
}

export interface AppAwarenessExpectedDurationStep extends AppAwarenessStepBase {
  type: 'expected_duration';
  answerKey: string;
  durationMinutesOptions: number[];
  allowCustomDuration?: boolean;
}

export interface AppAwarenessStartRecordStep extends AppAwarenessStepBase {
  type: 'start_record';
  answerKey: string;
  activityOptions: AppAwarenessActivityOption[];
  durationSource?: 'from_step' | 'fixed' | 'none';
  defaultDurationMinutes?: number;
  allowContinueExtensions?: boolean;
  extensionMinutesOptions?: number[];
}

export type AppAwarenessWorkflowStep =
  | AppAwarenessTextQuestionStep
  | AppAwarenessSingleChoiceStep
  | AppAwarenessCooldownWaitStep
  | AppAwarenessExpectedDurationStep
  | AppAwarenessStartRecordStep;

export interface AppAwarenessWorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  isPreset: boolean;
  enabled: boolean;
  allowClose?: boolean;
  steps: AppAwarenessWorkflowStep[];
  createdAt: number;
  updatedAt: number;
}

export interface AppAwarenessAppBinding {
  packageName: string;
  appName: string;
  workflowTemplateId: string;
  enabled: boolean;
  updatedAt: number;
}

export interface AppAwarenessExpectedTimerState {
  startedAt: number;
  durationMinutes: number;
  scheduledEndAt: number;
  extensionHistory: number[];
  reminderIssuedAt?: number;
}

export type AppAwarenessAnswerValue =
  | string
  | number
  | boolean
  | {
      categoryId: string;
      activityId: string;
      label: string;
      icon?: string;
    };

export interface AppAwarenessRun {
  id: string;
  templateId: string;
  packageName: string;
  appName: string;
  status: AppAwarenessRunStatus;
  currentStepIndex: number;
  answers: Record<string, AppAwarenessAnswerValue>;
  startedAt: number;
  stepStartedAt?: number;
  stepEndsAt?: number;
  completedAt?: number;
  linkedSessionId?: string;
  expectedTimer?: AppAwarenessExpectedTimerState;
}

export interface AppAwarenessSessionMeta {
  sourceAppPackage: string;
  sourceAppName: string;
  workflowTemplateId: string;
  workflowTemplateName: string;
  answers: Record<string, AppAwarenessAnswerValue>;
  startedAt?: number;
  nativeTimerId?: string;
  expectedDurationMinutes?: number;
  extensionHistory?: number[];
}

export interface TodoCategory {
  id: string;
  name: string;
  icon: string; // Emoji icon (for default theme)
  uiIcon?: string; // UI icon ID (for custom theme, e.g., "ui:purple:01")
  color?: string; // Stored category color for todo stats (Tailwind token or HEX)
}

export type TodoRecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export interface TodoRecurrenceRule {
  frequency: TodoRecurrenceFrequency;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  interval?: number;
  weekdays?: number[]; // weekly: 0-6
  monthDays?: number[]; // monthly: 1-31
  skipDates?: string[]; // recurrence exceptions: hide the generated occurrence on these dates
  fallbackToMonthEnd?: boolean; // monthly only: when the target day does not exist, use that month's last day
}

export interface TodoRecurringPlanConfig {
  enabled: boolean;
  startMinutes: number; // Minutes after local 00:00
  endMinutes: number; // Minutes after local 00:00, same-day only
  horizonCount: number; // Number of recurrence occurrences to keep materialized
}

export interface TodoDuplicateOptions {
  title: string;
  clearDates?: boolean;
  clearTags?: boolean;
  clearScopes?: boolean;
}

export type TodoProgressTrackingMode = 'none' | 'manual' | 'subtasks';
export type TodoKind = 'project' | 'quick';

export interface TodoItem {
  id: string;
  categoryId: string; // Belongs to a TodoCategory
  kind?: TodoKind; // Missing values are treated as `project` for backward compatibility
  parentTodoId?: string; // Optional direct parent todo reference for one-level subtasks
  childOrder?: number; // Stable order among siblings under the same parent
  title: string;
  isCompleted: boolean;
  completedAt?: string; // ISO Date string for completion time
  linkedActivityId?: string; // Links to a Record Activity for stats
  linkedCategoryId?: string; // Link back to Category
  defaultScopeIds?: string[]; // NEW: Default Scopes when starting this todo - changed from defaultScopeId
  createdAt?: number; // Unix timestamp used by legacy and collection timeline fallbacks
  note?: string;
  coverImage?: string; // NEW: Cover image filename (only one image allowed)

  // Progress/Habit Features
  isProgress?: boolean;
  progressTrackingMode?: TodoProgressTrackingMode;
  totalAmount?: number; // Total quantity (e.g. 365 pages)
  unitAmount?: number; // Quantity per unit (e.g. 50 pages)
  completedUnits?: number; // Number of units completed

  // Heatmap Customization (in Minutes)
  heatmapMin?: number;
  heatmapMax?: number;

  // Schedule / Planning
  pin?: boolean; // Defaults to false; lifts the todo to the top of today's schedule tab
  scheduledDate?: string; // YYYY-MM-DD
  deadlineDate?: string; // YYYY-MM-DD
  recurrenceRule?: TodoRecurrenceRule;
  recurringPlan?: TodoRecurringPlanConfig;
  maybeDates?: string[]; // YYYY-MM-DD candidate dates kept only for future possibilities
}

export type DataCollectionItemType = 'log' | 'todo';

export interface DataCollection {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DataCollectionEntry {
  id: string;
  collectionId: string;
  itemType: DataCollectionItemType;
  itemId: string;
  addedAt: number;
}

export interface ParsedTimeEntry {
  categoryName: string;
  activityName: string;
  startTime: string | number | Date;
  endTime: string | number | Date;
  description: string;
  scopeIds?: string[];
}

export type AchievementRuleTargetType = 'activity' | 'scope' | 'todoCategory' | 'checkCategory' | 'filterDuration';

export interface AchievementRuleAttributeEffect {
  attributeId: string;
  expPerUnit: number;
  direction?: 'gain' | 'loss';
}

export interface AchievementRule {
  id: string;
  name: string;
  enabled: boolean;
  effectType: 'earn' | 'spend';
  targetType: AchievementRuleTargetType;
  targetIds: string[];
  useCheckStreakMultiplier?: boolean;
  includeSubtasks?: boolean;
  filterExpression?: string;
  unitAmount: number;
  deltaPerUnit: number;
  roundingMode: 'floor';
  /** Current multi-attribute format. */
  attributeEffects?: AchievementRuleAttributeEffect[];
  /** Legacy single-attribute format retained for backup compatibility. */
  attributeEffect?: AchievementRuleAttributeEffect;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AchievementDailyRuleBreakdown {
  ruleId: string;
  ruleName: string;
  effectType: 'earn' | 'spend';
  targetType: AchievementRuleTargetType;
  matchedValue: number;
  useCheckStreakMultiplier?: boolean;
  includeSubtasks?: boolean;
  filterExpression?: string;
  unitAmount: number;
  deltaPerUnit: number;
  appliedUnits: number;
  delta: number;
  targetIds: string[];
}

export interface AchievementDailySnapshot {
  id: string;
  date: string; // YYYY-MM-DD
  netDelta: number;
  ruleBreakdown: AchievementDailyRuleBreakdown[];
  computedAt: number;
}

export interface AchievementAttribute {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  enabled: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface AchievementGrowthRuleBreakdown {
  ruleId: string;
  ruleName: string;
  targetType: AchievementRuleTargetType;
  attributeId: string;
  attributeName: string;
  matchedValue: number;
  unitAmount: number;
  appliedUnits: number;
  expPerUnit: number;
  deltaExp: number;
  targetIds: string[];
}

export interface AchievementGrowthAttributeChange {
  attributeId: string;
  attributeName: string;
  deltaExp: number;
  ruleBreakdown: AchievementGrowthRuleBreakdown[];
}

export interface AchievementGrowthDailySnapshot {
  id: string;
  date: string;
  attributeChanges: AchievementGrowthAttributeChange[];
  computedAt: number;
}

export interface AchievementLevelProgress {
  level: number;
  currentExperience: number;
  nextLevelExperience: number;
  levelExperienceRange: number;
  progress: number;
}

export interface AchievementReward {
  id: string;
  name: string;
  cost: number;
  description?: string;
  icon?: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AchievementCollection {
  id: string;
  name: string;
  cost: number;
  imagePath?: string;
  description?: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AchievementRedemptionRecord {
  id: string;
  rewardId: string;
  rewardName: string;
  cost: number;
  redeemedAt: number;
  paidFromCarryover?: number;
  paidFromLiveStars?: number;
  note?: string;
}

export interface AchievementCollectionRecord {
  id: string;
  collectionId: string;
  collectionName: string;
  cost: number;
  imagePath?: string;
  redeemedAt: number;
  paidFromCarryover?: number;
  paidFromLiveStars?: number;
  note?: string;
}

export interface AchievementArchivedBottle {
  id: string;
  collectionId: string;
  collectionName: string;
  imagePath?: string;
  periodStartDate: string;
  periodEndDate: string;
  earnedStars: number;
  spentStars: number;
  sealedAmount: number;
  status: 'sealed' | 'shattered';
  sealedAt: number;
  shatteredAt?: number;
  dailySnapshots: AchievementDailySnapshot[];
  redemptionRecords: AchievementRedemptionRecord[];
}

export interface AchievementBottleActionRecord {
  id: string;
  bottleId: string;
  actionType: 'seal' | 'shatter';
  amount: number;
  occurredAt: number;
}

export interface CheckStreakTier {
  thresholdDays: number;
  multiplier: number;
}

export interface CheckStreakConfig {
  enabled: boolean;
  tiers: CheckStreakTier[];
}

export interface AchievementSealPreview {
  startDate: string;
  endDate: string;
  earnedStars: number;
  spentStars: number;
  liveSpentStars: number;
  carryoverSpentStars: number;
  sealableStars: number;
  snapshotIds: string[];
  redemptionRecordIds: string[];
}

export interface AchievementAccountSummary {
  currentStars: number;
  historyStars: number;
  totalStars: number;
}

export interface AchievementMeta {
  achievementStartDate: string | null;
  growthStartDate?: string | null;
  activeBottleCarryoverStars: number;
  checkStreakConfig?: CheckStreakConfig;
}

export enum AppView {
  RECORD = 'RECORD',
  TIMELINE = 'TIMELINE',
  STATS = 'STATS',
  DAILY_CHECKS = 'DAILY_CHECKS',
  DAILY_CHECK_DETAIL = 'DAILY_CHECK_DETAIL',
  TAGS = 'TAGS',
  SCOPE = 'SCOPE', // NEW
  REVIEW = 'REVIEW', // NEW: Review Hub
  TODO = 'TODO',
  SETTINGS = 'SETTINGS',
  SCENE = 'SCENE', // NEW: Scene View
}


export type SceneCardType = 'timer' | 'todo' | 'checklist' | 'navigation' | 'principle' | 'reference' | 'stats';

export interface SceneCardAction {
  type: 'startTimer' | 'startTodo' | 'toggleCheck' | 'navigate' | 'reference' | 'none';
  activityId?: string;
  categoryId?: string;
  todoId?: string;
  checkItemId?: string;
  checkActionMode?: 'toggle' | 'increment' | 'reset';
  targetView?: string;
  sourceType?: 'dailyReview' | 'weeklyReview' | 'monthlyReview';
  dateOffset?: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth';
  questionId?: string;
  fallbackText?: string;
  // Android launch metadata.
  launchApp?: boolean;
  appPackageName?: string; // Android package name
  appName?: string;
}

export interface SceneCardData {
  id: string;
  type: SceneCardType;
  
  title: string;
  icon?: string; // Emoji
  uiIcon?: string; // UI ID
  color?: string;
  
  frontText?: string;
  backText?: string;
  
  action: SceneCardAction;
  
  // Timer/todo behavior.
  autoEnterFocus?: boolean;
  
  // Todo progress.
  progress?: number;
  totalAmount?: number;
  
  // Stats display.
  statValue?: string;
  statMinutes?: number;
  statLabel?: string;
  filterActivityIds?: string[];
  
  // Stats goal.
  enableGoal?: boolean;
  goalValue?: number;
  goalType?: 'min' | 'max'; // min means at least; max means at most
  
  referencedQuestion?: string;
  referencedAnswer?: string;
  
  // Principle card source.
  principleSource?: 'library' | 'manual' | 'random';
  principleId?: string;
  
  // Checklist state.
  isCompleted?: boolean;
  checkItemContent?: string;
  checkManualMode?: 'binary' | 'count';
  checkCurrentCount?: number;
  checkTargetCount?: number;
}

export interface TimeSlot {
  id: string;
  name: string;
  icon: string; // Emoji
  uiIcon?: string; // UI icon ID, formatted as ui:iconType
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  displayTitle?: string;
  disableAutoSwitch?: boolean;
  cards: SceneCardData[];
}

export type SceneGroupAutoSwitchMode = 'disabled' | 'weekday' | 'weekend' | 'dateRange' | 'customWeekdays';

export type SceneGroupSwitchMode = 'manual' | 'auto';

export interface SceneGroupAutoSwitchConfig {
  mode: SceneGroupAutoSwitchMode;
  startDate?: string; // YYYYMMDD, date-range mode only
  endDate?: string; // YYYYMMDD, date-range mode only
  weekdays?: number[]; // 0-6, custom-weekdays mode only
}

export interface SceneGroup {
  id: string;
  name: string;
  timeSlots: TimeSlot[];
  autoSwitch?: SceneGroupAutoSwitchConfig;
}

export interface SceneGroupState {
  version: 1;
  switchMode: SceneGroupSwitchMode;
  activeGroupId: string;
  groups: SceneGroup[];
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

export interface AutoLinkRule {
  id: string;
  activityId: string; // Activity ID
  scopeId: string; // Scope ID
}


export type QuestionType = 'text' | 'choice' | 'rating';

export interface ReviewQuestion {
  id: string;
  question: string;
  type: QuestionType;
  choices?: string[];
  icon?: string; // Lucide 'star', 'heart'
  colorId?: string; // ID COLOR_OPTIONS
}

export interface ReviewTemplate {
  id: string;
  title: string;
  uiIcon?: string; // UI icon ID (for custom theme, e.g., "ui:purple:01")
  questions: ReviewQuestion[];
  isSystem: boolean;
  order: number;
  isDailyTemplate: boolean;
  isWeeklyTemplate?: boolean;
  isMonthlyTemplate?: boolean;
  syncToTimeline: boolean;
}

export interface ReviewTemplateSnapshot {
  id: string;
  title: string;
  questions: ReviewQuestion[];
  order?: number;
  syncToTimeline?: boolean;
}

export interface ReviewAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface DailyNewspaperAnnotation {
  logId: string;
  comment: string;
}

export type DailyNewspaperCommentRole = 'user' | 'assistant';

export interface DailyNewspaperCommentMessage {
  id: string;
  role: DailyNewspaperCommentRole;
  content: string;
  createdAt: number;
}

export interface DailyNewspaperCommentThread {
  logId: string;
  messages: DailyNewspaperCommentMessage[];
  updatedAt: number;
}

export interface DailyNewspaper {
  version: 1;
  date: string;
  title: string;
  assistantReply: string;
  overallComment: string;
  annotations: DailyNewspaperAnnotation[];
  commentThreads?: DailyNewspaperCommentThread[];
  updatedAt: number;
}

export interface WeeklyNewspaperDaySection {
  date: string;
  dayLabel: string;
  dailySummary: string;
  keyPoints: string[];
}

export interface WeeklyNewspaper {
  version: 1;
  weekStartDate: string;
  weekEndDate: string;
  title: string;
  assistantReply: string;
  overallComment: string;
  keyInsights: string[];
  daySections: WeeklyNewspaperDaySection[];
  closingComment: string;
  nextPeriodPlan: string[];
  updatedAt: number;
}

export interface MonthlyNewspaperWeekSection {
  weekStartDate: string;
  weekEndDate: string;
  weekLabel: string;
  weeklySummary: string;
  highlights: string[];
  riskPoint: string;
}

export interface MonthlyNewspaper {
  version: 1;
  monthStartDate: string;
  monthEndDate: string;
  title: string;
  assistantReply: string;
  overallComment: string;
  keyInsights: string[];
  monthlyTheme: string;
  weekSections: MonthlyNewspaperWeekSection[];
  nextPeriodPlan: string[];
  updatedAt: number;
}

// Daily review
export interface DailyReview {
  id: string;
  date: string; // YYYY-MM-DD format
  createdAt: number;
  updatedAt: number;
  answers: ReviewAnswer[]; // Guided question answers
  checkItems?: CheckItem[]; // Daily check items
  checkCategorySyncToTimeline?: { [category: string]: boolean }; // Whether each check group syncs to the timeline
  summary?: string; // Manual one-line summary for the day
  summaryUpdatedAt?: number;
  moodEmoji?: string; // Today's mood emoji
  narrative?: string; // AI-generated narrative
  narrativeUpdatedAt?: number;
  aiNewspaper?: DailyNewspaper;
  isEdited?: boolean; // Whether the narrative was manually edited
  templateSnapshot?: ReviewTemplateSnapshot[]; // Review template snapshot captured when created
}

// Daily check item
export interface CheckItem {
  id: string;
  category?: string; // Template group title or category
  content: string;
  icon?: string; // Icon from template (emoji)
  uiIcon?: string; // UI icon ID, formatted as ui:iconType
  isCompleted: boolean;
  type?: 'manual' | 'auto'; // Manual or automatic check; defaults to manual
  manualMode?: 'binary' | 'count'; // Binary toggle or count mode for manual checks
  currentCount?: number; // Current count for count-mode manual checks
  targetCount?: number; // Target count for count-mode manual checks
  autoConfig?: AutoCheckConfig; // Automatic check config, only valid for auto checks
}

// Daily check template item
export interface CheckTemplateItem {
  id: string; // Stable ID for tracking
  content: string;
  icon?: string; // Preset icon (emoji or Lucide name)
  uiIcon?: string; // UI icon ID, formatted as ui:iconType
  color?: string; // Stored daily-check color (Tailwind token or HEX)
  enabled?: boolean; // Whether this template item should be used; missing values default to true.
  type?: 'manual' | 'auto'; // Manual or automatic check; defaults to manual
  manualMode?: 'binary' | 'count'; // Binary toggle or count mode for manual checks
  targetCount?: number; // Target count for count-mode manual checks
  autoConfig?: AutoCheckConfig; // Automatic check config, only valid for auto checks
}

// Automatic daily check config
export interface AutoCheckConfig {
  filterExpression: string; // Filter expression, for example "#study %deep-work"
  comparisonType: 'duration' | 'earliestStart' | 'latestStart' | 'nightEarliestStart' | 'earliestEnd' | 'latestEnd' | 'count'; // Metric to evaluate
  operator: '>=' | '<=' | '>' | '<' | '='; // Comparison operator
  targetValue: number; // Target value in minutes, clock minutes, or count
}

// Daily check template group
export interface CheckTemplate {
  id: string;
  title: string;
  icon?: string; // Template icon (emoji)
  uiIcon?: string; // Template UI icon ID, formatted as ui:iconType
  items: CheckTemplateItem[]; // Template items
  enabled: boolean;
  order: number;
  isDaily: boolean; // Whether this group is used in daily reviews
  syncToTimeline?: boolean; // Whether this group syncs to the timeline
}

export interface WeeklyReview {
  id: string;
  weekStartDate: string; // YYYY-MM-DD
  weekEndDate: string; // YYYY-MM-DD
  createdAt: number;
  updatedAt: number;
  answers: ReviewAnswer[];
  summary?: string;
  summaryUpdatedAt?: number;
  narrative?: string; // AI
  narrativeUpdatedAt?: number;
  aiNewspaper?: WeeklyNewspaper;
  isEdited?: boolean;
  templateSnapshot?: ReviewTemplateSnapshot[];
}

export interface MonthlyReview {
  id: string;
  monthStartDate: string; // YYYY-MM-DD
  monthEndDate: string; // YYYY-MM-DD
  createdAt: number;
  updatedAt: number;
  answers: ReviewAnswer[];
  summary?: string;
  summaryUpdatedAt?: number;
  narrative?: string; // AI
  narrativeUpdatedAt?: number;
  aiNewspaper?: MonthlyNewspaper;
  isEdited?: boolean;
  templateSnapshot?: ReviewTemplateSnapshot[];
  cite?: string;
}


export interface OnThisDayNote {
  id: string;
  content: string;
  createdAt: number;
}

export interface OnThisDayEntry {
  id: string;
  monthDay: string; // MM-DD
  notes: OnThisDayNote[];
  createdAt: number;
  updatedAt: number;
}

export interface NarrativeTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  isCustom?: boolean; // Whether created by user
  icon?: string;
  isDaily?: boolean;
  isWeekly?: boolean;
  isMonthly?: boolean;
}

// ==================== Theme: Custom Color Group ====================

export interface CustomColorItem {
  id: string;
  color: string; // Hex color value, e.g. "#AABBCC"
  createdAt: number;
}

export interface CustomColorGroup {
  version: 1;
  colors: CustomColorItem[];
  updatedAt: number;
}


export interface Filter {
  id: string;
  name: string;
  filterExpression: string; // Raw filter expression using #, %, @, or free text
  createdAt: number;
  order?: number;
  icon?: string;
}

export interface ParsedFilterCondition {
  tags: string[][]; // # (AND, OR)
  scopes: string[][]; // % (AND, OR)
  todos: string[][]; // @ (AND, OR)
  notes: string[][];
  reactions: string[][]; // ^ Reaction Emoji (AND, OR)
}

// Memoir
export interface MemoirFilterConfig {
  hasImage: boolean;
  hasReaction?: boolean;
  minNoteLength: number;
  relatedTagIds: string[]; // Related activity IDs
  relatedScopeIds: string[];
  showDailyReviews?: boolean;
  showWeeklyReviews?: boolean;
}


export type CustomStickerStatus = 'active' | 'archived';

export interface CustomStickerRecord {
  id: string;
  setId: string;
  imageFilename: string;
  thumbnailFilename?: string;
  label?: string;
  sortOrder: number;
  status: CustomStickerStatus;
  createdAt: number;
  updatedAt: number;
}

export interface CustomStickerSetRecord {
  id: string;
  name: string;
  description?: string;
  stickerIds: string[];
  status: CustomStickerStatus;
  createdAt: number;
  updatedAt: number;
}

export type SearchType = 'record' | 'category' | 'activity' | 'todo' | 'scope' | 'review';


