/**
 * @file types.ts
 * @input None
 * @output TypeScript Interfaces & Types
 * @pos Type Definitions (Shared contract)
 * @description Defines the core data structures (Log, TodoItem, Category, Activity, Filter order metadata, etc.) used throughout the application.
 * @updated 2026-04-20: Added configurable todo duplication options for quick-copy editing.
 * @updated 2026-04-20: Added todo schedule and recurrence rule types for week-view planning.
 * @updated 2026-04-19: Added reusable note template definitions for detail-page editing and inline note recommendations.
 * @updated 2026-04-18: Added custom sticker set and sticker record types for synced mood sticker uploads.
 * @updated 2026-04-17: Added achievement filter-duration rules with inline filter expressions.
 * @updated 2026-04-18: Expanded widget session metadata to match the slot-based widget model, including shortcut slots.
 * @updated 2026-04-15: Added nightLatestStart auto-check comparison type for cross-midnight sleep rules.
 *
 * 鈿狅笍 Once I am updated, be sure to update my header comment and the folder's md.
 */
export interface NoteTemplate {
  id: string;
  name: string;
  content: string;
  order?: number;
}

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
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Prefix icon/emoji (for default theme)
  uiIcon?: string; // UI icon ID (for custom theme, e.g., "ui:purple:01")
  activities: Activity[];
  themeColor: string; // Hex color for stats chart
  enableFocusScore?: boolean; // Default for all activities in category
  enableMoodScore?: boolean; // Default for all activities in category for mood tracking
  heatmapMin?: number; // Custom heatmap scale (Minutes)
  heatmapMax?: number;
  noteTemplates?: NoteTemplate[];
}

// Scope (棰嗗煙) - orthogonal to Tags
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
  keywords?: string[]; // 鍏抽敭瀛楀垪琛紝鐢ㄤ簬蹇€熷尮閰嶅拰缁熻
}

// Goal (鐩爣) - attached to Scope
export interface Goal {
  id: string;
  title: string;        // e.g., "Q1 骞块煹鏂囩尞鏀诲潥"

  // 馃敆 鍏宠仈閫昏緫
  scopeId: string;      // 蹇呭～锛氶毝灞炰簬鍝釜棰嗗煙 (e.g., 馃毄 涓撲笟杈撳叆)

  // 馃幆 鏍稿績鎸囨爣 (Metrics)
  metric:
  | 'duration_raw'      // 鍘熷鏃堕暱 
  | 'task_count'        // 寰呭姙鏁伴噺 
  | 'duration_weighted' // 鏈夋晥鏃堕暱 (涓撴敞搴﹀姞鏉? 
  | 'frequency_days'    // 娲昏穬澶╂暟 
  | 'duration_limit'    // 鏃堕暱涓婇檺 (鍙嶅悜)
  | 'record_count';     // 记录条数

  targetValue: number;  // 鐩爣闃堝€?

  // 馃搮 鏃堕棿缁村害 (Time-bound)
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD

  // 馃攳 楂樼骇绛涢€夊櫒 (Advanced Filters)
  // 寰呭姙妯″紡绛涢€夛紙浠呯敤浜?task_count锛?
  filterTodoCategories?: string[];  // 闄愬畾寰呭姙娓呭崟 ID 鍒楄〃

  // 璁板綍妯″紡绛涢€夛紙鐢ㄤ簬 duration/frequency 鐩稿叧鎸囨爣锛?
  filterActivityIds?: string[];     // 闄愬畾鏍囩锛圓ctivity锛塈D 鍒楄〃
  filterTodoCategorySource?: string[];  // 闄愬畾鍏宠仈鐨勫緟鍔炴竻鍗曟潵婧?

  // 鐘舵€?
  status: 'active' | 'completed' | 'failed' | 'archived';

  // 馃摑 濂栧姳/澶囨敞 (Gamification)
  motivation?: string;
  
  // 馃幆 澶х洰鏍囧叧鑱?(Major Goal)
  majorGoalId?: string;  // 鍏宠仈鐨勫ぇ鐩爣 ID锛堝鏋滀负绌猴紝鍒欐槸鐙珛鐩爣锛?
  order?: number;        // 鍦ㄥぇ鐩爣涓殑鎺掑簭锛堟寜鏃堕棿鑷姩鎺掑簭锛?
}

// MajorGoal (澶х洰鏍? - 鍚岀被鍨嬬洰鏍囩殑鏃堕棿搴忓垪鍒嗙粍
export interface MajorGoal {
  id: string;
  title: string;              // 澶х洰鏍囧悕绉帮紝濡?"Q1 骞块煹鏂囩尞鏀诲潥"
  scopeId: string;            // 鎵€灞為鍩?
  
  // 鏍稿績锛氭寚瀹氱粺涓€鐨勭洰鏍囩被鍨?
  metric: Goal['metric'];     // 鎵€鏈夊瓙鐩爣蹇呴』鏄繖涓被鍨?
  
  // 鐩爣鍊硷紙鐙珛瀛樺偍锛?
  targetValue: number;        // 鐩爣绯诲垪鐨勬€荤洰鏍囧€?
  
  // 鏃堕棿鑼冨洿锛堟墜鍔ㄥ～鍐欙級
  startDate: string;          // 寮€濮嬫椂闂?
  endDate: string;            // 缁撴潫鏃堕棿
  
  // 鎻忚堪涓庡姩鏈?
  description?: string;       // 璇︾粏鎻忚堪
  motivation?: string;        // 璁剧珛杩欎釜澶х洰鏍囩殑鍘熷洜
  
  // 绛涢€夊櫒锛堢户鎵跨粰鎵€鏈夊瓙鐩爣锛?
  filterActivityIds?: string[];           // 闄愬畾鏍囩 ID 鍒楄〃
  filterTodoCategories?: string[];        // 闄愬畾寰呭姙娓呭崟 ID 鍒楄〃
  filterTodoCategorySource?: string[];    // 闄愬畾鍏宠仈鐨勫緟鍔炴竻鍗曟潵婧?
  
  // 鐘舵€?
  status: 'active' | 'completed' | 'archived';
  
  // 鍏冩暟鎹?
  createdAt: string;
  updatedAt: string;
  order?: number;             // 鍦ㄩ鍩熷唴鐨勬帓搴?
}

export interface ActiveSession {
  id: string; // Unique session ID
  activityId: string;
  categoryId: string; // Added to link back to category
  activityName: string;
  activityIcon: string;
  activityUiIcon?: string; // UI 鍥炬爣锛堢敤浜庤嚜瀹氫箟涓婚锛?
  startTime: number; // Timestamp
  linkedTodoId?: string; // New: Link to a specific todo task
  scopeIds?: string[]; // NEW: Link to multiple Scopes (棰嗗煙) - changed from scopeId
  title?: string;
  note?: string;
  progressIncrement?: number; // New: Carry over to Log
  focusScore?: number; // 1-5
  moodScore?: number; // 1-5 mood rating
  reactions?: string[]; // Emoji reactions
  source?: 'app' | 'widget';
  widgetType?: 'timer' | 'daily' | 'shortcut';
  slotIndex?: number;
  templateId?: string;
  appWidgetId?: number;
}

// 璇勮鎺ュ彛
export interface Comment {
  id: string;
  content: string;
  createdAt: number; // 鏃堕棿鎴?
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
  scopeIds?: string[]; // NEW: Link to multiple Scopes (棰嗗煙) - changed from scopeId
  progressIncrement?: number; // New: Units of progress contributed by this session
  focusScore?: number; // 1-5
  moodScore?: number; // 1-5 mood rating
  images?: string[]; // (NEW) Array of image filenames/identifiers
  comments?: Comment[]; // (NEW) 璇勮鍒楄〃
  reactions?: string[]; // (NEW) 鍙嶅簲鍒楄〃 (Emoji list)
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
}

export interface TodoDuplicateOptions {
  title: string;
  clearDates?: boolean;
  clearTags?: boolean;
  clearScopes?: boolean;
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

  // Schedule / Planning
  scheduledDate?: string; // YYYY-MM-DD
  deadlineDate?: string; // YYYY-MM-DD
  recurrenceRule?: TodoRecurrenceRule;
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

export interface AchievementRule {
  id: string;
  name: string;
  enabled: boolean;
  effectType: 'earn' | 'spend';
  targetType: AchievementRuleTargetType;
  targetIds: string[];
  filterExpression?: string;
  unitAmount: number;
  deltaPerUnit: number;
  roundingMode: 'floor';
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

export interface AchievementSealPreview {
  startDate: string;
  endDate: string;
  earnedStars: number;
  spentStars: number;
  sealableStars: number;
  snapshotIds: string[];
  redemptionRecordIds: string[];
}

export interface AchievementMeta {
  achievementStartDate: string | null;
  activeBottleCarryoverStars: number;
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
  SCENE = 'SCENE', // NEW: Scene View
}

// ========== Scene View (鍦烘櫙瑙嗗浘) ==========

// 鍦烘櫙鍗＄墖绫诲瀷
export type SceneCardType = 'timer' | 'todo' | 'checklist' | 'navigation' | 'principle' | 'reference' | 'stats';

// 鍦烘櫙鍗＄墖鍔ㄤ綔閰嶇疆
export interface SceneCardAction {
  type: 'startTimer' | 'startTodo' | 'toggleCheck' | 'navigate' | 'reference' | 'none';
  // 璁℃椂鍔ㄤ綔
  activityId?: string;
  categoryId?: string;
  // 寰呭姙鍔ㄤ綔
  todoId?: string;
  // 鏃ヨ鍔ㄤ綔
  checkItemId?: string;
  checkActionMode?: 'toggle' | 'increment' | 'reset';
  // 瀵艰埅鍔ㄤ綔
  targetView?: string;
  // 寮曠敤鍔ㄤ綔
  sourceType?: 'dailyReview' | 'weeklyReview' | 'monthlyReview';
  dateOffset?: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth';
  questionId?: string;
  fallbackText?: string;
  // 搴旂敤璺宠浆閰嶇疆锛堜粎Android锛?
  launchApp?: boolean; // 鏄惁鍚敤搴旂敤璺宠浆
  appPackageName?: string; // Android搴旂敤鍖呭悕
  appName?: string; // 搴旂敤鏄剧ず鍚嶇О
}

// 鍦烘櫙鍗＄墖鏁版嵁
export interface SceneCardData {
  id: string;
  type: SceneCardType;
  
  // 鏄剧ず鍐呭
  title: string; // 鍗＄墖鏍囬锛堝彲涓庤Е鍙戝璞″悕绉颁笉鍚岋級
  icon?: string; // Emoji 鍥炬爣
  uiIcon?: string; // UI 鍥炬爣 ID
  color?: string; // 鍗＄墖涓婚鑹诧紙鍙嚜瀹氫箟锛屼笉璁剧疆鍒欎娇鐢ㄧ被鍨嬮粯璁よ壊锛?
  
  // 鑷畾涔夋枃瀛?
  frontText?: string; // 姝ｉ潰鑷畾涔夋枃瀛楋紙婵€鍔辫绛夛級
  backText?: string; // 鍙嶉潰鑷畾涔夋枃瀛楋紙瀹屾垚鎻愮ず绛夛級
  
  // 蹇嵎瑙﹀彂鍔ㄤ綔
  action: SceneCardAction;
  
  // 璁℃椂鐩稿叧锛堜粎 timer 鍜?todo 绫诲瀷锛?
  autoEnterFocus?: boolean; // 鏄惁鑷姩杩涘叆娌夋蹈寮忚鏃?
  
  // 寰呭姙杩涘害锛堜粎 todo 绫诲瀷锛?
  progress?: number;
  totalAmount?: number;
  
  // 缁熻鏁版嵁锛堜粎 stats 绫诲瀷锛?
  statValue?: string;
  statMinutes?: number; // 缁熻鍊硷紙鍒嗛挓鏁帮紝鐢ㄤ簬杩涘害鏉¤绠楋級
  statLabel?: string;
  filterActivityIds?: string[]; // 闄愬畾鏍囩 ID 鍒楄〃锛堢敤浜庣粺璁＄瓫閫夛級
  
  // 鐩爣鍊艰缃紙浠?stats 绫诲瀷锛?
  enableGoal?: boolean; // 鏄惁鍚敤鐩爣鍊?
  goalValue?: number; // 鐩爣鍊硷紙鍒嗛挓锛?
  goalType?: 'min' | 'max'; // 鐩爣绫诲瀷锛歮in=澶т簬璇ュ€硷紝max=灏忎簬璇ュ€?
  
  // 寮曠敤鍐呭锛堜粎 reference 绫诲瀷锛岃繍琛屾椂鍔ㄦ€佽绠楋級
  referencedQuestion?: string;  // 寮曠敤鐨勯棶棰樻枃鏈?
  referencedAnswer?: string;    // 寮曠敤鐨勫洖绛斿唴瀹?
  
  // 鍘熷垯鏉ユ簮锛堜粎 principle 绫诲瀷锛?
  principleSource?: 'library' | 'manual' | 'random'; // 鍘熷垯鏉ユ簮锛歭ibrary=浠庡師鍒欏簱閫夋嫨锛宮anual=鎵嬪姩杈撳叆锛宺andom=闅忔満閫夊彇
  principleId?: string; // 鍘熷垯搴撲腑鐨勫師鍒橧D锛堝綋 principleSource 涓?'library' 鏃朵娇鐢級
  
  // 鏃ヨ鐘舵€侊紙浠?checklist 绫诲瀷锛?
  isCompleted?: boolean;
  checkItemContent?: string; // 鏃ヨ鍐呭锛堢敤浜庤绠楀潥鎸佸ぉ鏁帮級
  checkManualMode?: 'binary' | 'count';
  checkCurrentCount?: number;
  checkTargetCount?: number;
}

// 鏃堕棿娈靛畾涔?
export interface TimeSlot {
  id: string;
  name: string;
  icon: string; // Emoji
  uiIcon?: string; // UI 鍥炬爣 ID (鏍煎紡: ui:iconType)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  displayTitle?: string; // 鍙€夌殑鏄剧ず鏍囬锛屽鏋滄湁鍒欐樉绀烘爣棰橈紝鍚﹀垯鏄剧ず鏃堕棿娈?
  disableAutoSwitch?: boolean; // 鏄惁绂佺敤鑷姩璺宠浆鍒版鏃堕棿娈?
  cards: SceneCardData[]; // 璇ユ椂闂存鐨勫崱鐗囧垪琛?
}

// 鍦烘櫙缁勮嚜鍔ㄥ垏鎹㈣鍒欐ā寮?
export type SceneGroupAutoSwitchMode = 'disabled' | 'weekday' | 'weekend' | 'dateRange' | 'customWeekdays';

// 鍦烘櫙瑙嗗浘鍒囨崲妯″紡
export type SceneGroupSwitchMode = 'manual' | 'auto';

// 鍦烘櫙缁勮嚜鍔ㄥ垏鎹㈤厤缃?
export interface SceneGroupAutoSwitchConfig {
  mode: SceneGroupAutoSwitchMode;
  startDate?: string; // YYYYMMDD锛堜粎 dateRange 妯″紡锛?
  endDate?: string; // YYYYMMDD锛堜粎 dateRange 妯″紡锛?
  weekdays?: number[]; // 0-6锛堜粎 customWeekdays 妯″紡锛?=鍛ㄦ棩锛?
}

// 鍦烘櫙缁勫畾涔夛紙鍦烘櫙缁?-> 鏃堕棿娈碉級
export interface SceneGroup {
  id: string;
  name: string;
  timeSlots: TimeSlot[];
  autoSwitch?: SceneGroupAutoSwitchConfig;
}

// 鍦烘櫙缁勫瓨鍌ㄧ姸鎬?
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

// Auto Link Rule (鑷姩鍏宠仈瑙勫垯)
export interface AutoLinkRule {
  id: string;
  activityId: string; // 鍏宠仈鐨?Activity ID
  scopeId: string;    // 鑷姩鍏宠仈鐨?Scope ID
}

// ========== Daily Review (姣忔棩鍥為【) ==========

// 鍥為【妯℃澘闂绫诲瀷
export type QuestionType = 'text' | 'choice' | 'rating';

// 鍥為【妯℃澘闂
export interface ReviewQuestion {
  id: string;
  question: string;
  type: QuestionType;
  choices?: string[]; // 閫夋嫨棰橀€夐」锛岀敤鍒嗗彿鍒嗛殧
  icon?: string; // 鎵撳垎棰樼殑Lucide鍥炬爣鍚嶇О锛屽'star', 'heart'绛?
  colorId?: string; // 鎵撳垎棰樼殑棰滆壊ID锛屽搴?COLOR_OPTIONS
}

// 鍥為【妯℃澘
export interface ReviewTemplate {
  id: string;
  title: string;
  uiIcon?: string; // UI icon ID (for custom theme, e.g., "ui:purple:01")
  questions: ReviewQuestion[];
  isSystem: boolean; // 鏄惁绯荤粺棰勮
  order: number;
  isDailyTemplate: boolean;         // 鏄惁鐢ㄤ簬姣忔棩鍥為【
  isWeeklyTemplate?: boolean;       // 鏄惁鐢ㄤ簬鍛ㄥ洖椤?
  isMonthlyTemplate?: boolean;      // 鏄惁鐢ㄤ簬鏈堝洖椤?
  syncToTimeline: boolean;          // 鏄惁鍚屾鍒版椂闂磋酱鏄剧ず
}

// 鍥為【妯℃澘蹇収 (鍒涘缓鍥為【鏃朵繚瀛樼殑妯℃澘鐘舵€?
export interface ReviewTemplateSnapshot {
  id: string;
  title: string;
  questions: ReviewQuestion[];
  order?: number; // 鍙€?鐢ㄤ簬鎺掑簭
  syncToTimeline?: boolean; // 鏄惁鍚屾鍒版椂闂磋酱鏄剧ず
}

// 闂鍥炵瓟
export interface ReviewAnswer {
  questionId: string;
  question: string; // 淇濆瓨闂鏂囨湰锛屼互闃叉ā鏉胯淇敼
  answer: string; // 鏂囨湰绛旀鎴栭€夋嫨鐨勯€夐」
}

// 姣忔棩鍥為【
export interface DailyReview {
  id: string;
  date: string; // YYYY-MM-DD鏍煎紡
  createdAt: number;
  updatedAt: number;
  answers: ReviewAnswer[]; // 寮曞闂瓟鐨勭瓟妗?
  checkItems?: CheckItem[]; // New: 姣忔棩鏃ヨ
  checkCategorySyncToTimeline?: { [category: string]: boolean }; // 鏃ヨ鍒嗙粍鏄惁鍚屾鍒版椂闂磋酱
  summary?: string; // 鎵嬪姩鍙欎簨锛氫竴鍙ヨ瘽鎬荤粨浠婂ぉ
  summaryUpdatedAt?: number;
  moodEmoji?: string; // 浠婃棩蹇冩儏 emoji
  narrative?: string; // AI鐢熸垚鐨勫彊浜?
  narrativeUpdatedAt?: number;
  isEdited?: boolean; // 鍙欎簨鏄惁琚墜鍔ㄧ紪杈戣繃
  templateSnapshot?: ReviewTemplateSnapshot[]; // 鍒涘缓鏃剁殑妯℃澘蹇収
}

// 姣忔棩鏃ヨ
export interface CheckItem {
  id: string;
  category?: string; // 鎵€灞炵殑妯℃澘鏍囬鎴栧垎缁?
  content: string;
  icon?: string; // Icon from template (emoji)
  uiIcon?: string; // UI 鍥炬爣 ID (鏍煎紡: ui:iconType)
  isCompleted: boolean;
  type?: 'manual' | 'auto'; // 绫诲瀷锛氭墜鍔ㄦ垨鑷姩锛堥粯璁や负 manual锛?
  manualMode?: 'binary' | 'count'; // 鎵嬪姩妯″紡锛氫簩鍊煎嬀閫夋垨娆℃暟璁℃暟锛堜粎褰?type='manual' 鏃舵湁鏁堬級
  currentCount?: number; // 褰撳墠娆℃暟锛堜粎褰?manualMode='count' 鏃舵湁鏁堬級
  targetCount?: number; // 鐩爣娆℃暟锛堜粎褰?manualMode='count' 鏃舵湁鏁堬級
  autoConfig?: AutoCheckConfig; // 鑷姩鏃ヨ閰嶇疆锛堜粎褰?type='auto' 鏃舵湁鏁堬級
}

// 鏃ヨ瀹氫箟 (鐢ㄤ簬妯℃澘)
export interface CheckTemplateItem {
  id: string; // Add ID for better tracking
  content: string;
  icon?: string; // Preset icon (emoji or Lucide name)
  uiIcon?: string; // UI 鍥炬爣 ID (鏍煎紡: ui:iconType)
  type?: 'manual' | 'auto'; // 绫诲瀷锛氭墜鍔ㄦ垨鑷姩锛堥粯璁や负 manual锛?
  manualMode?: 'binary' | 'count'; // 鎵嬪姩妯″紡锛氫簩鍊煎嬀閫夋垨娆℃暟璁℃暟锛堜粎褰?type='manual' 鏃舵湁鏁堬級
  targetCount?: number; // 鐩爣娆℃暟锛堜粎褰?manualMode='count' 鏃舵湁鏁堬級
  autoConfig?: AutoCheckConfig; // 鑷姩鏃ヨ閰嶇疆锛堜粎褰?type='auto' 鏃舵湁鏁堬級
}

// 鑷姩鏃ヨ閰嶇疆
export interface AutoCheckConfig {
  filterExpression: string; // 绛涢€夎〃杈惧紡锛堝 "#瀛︿範 %涓撲笟杈撳叆"锛?
  comparisonType: 'duration' | 'earliestStart' | 'latestStart' | 'nightLatestStart' | 'earliestEnd' | 'latestEnd' | 'count'; // 鍒ゆ柇绫诲瀷
  operator: '>=' | '<=' | '>' | '<' | '='; // 姣旇緝杩愮畻绗?
  targetValue: number; // 鐩爣鍊硷紙鍒嗛挓鏁帮紝鏃跺埢鐢ㄥ垎閽熻〃绀哄 480=8:00锛屾鏁板氨鏄暟瀛楋級
}

// 鏃ヨ妯℃澘
export interface CheckTemplate {
  id: string;
  title: string;
  icon?: string; // 妯℃澘鍥炬爣 (emoji)
  uiIcon?: string; // 妯℃澘 UI 鍥炬爣 ID (鏍煎紡: ui:iconType)
  items: CheckTemplateItem[]; // Updated to object array
  enabled: boolean;
  order: number;
  isDaily: boolean; // 鏄惁鏄瘡鏃ュ繀鍋?
  syncToTimeline?: boolean; // 鏄惁鍚屾鍒版椂闂磋酱
}

// 姣忓懆鍥為【
export interface WeeklyReview {
  id: string;
  weekStartDate: string; // YYYY-MM-DD鏍煎紡锛屽懆鐨勭涓€澶?
  weekEndDate: string;   // YYYY-MM-DD鏍煎紡锛屽懆鐨勬渶鍚庝竴澶?
  createdAt: number;
  updatedAt: number;
  answers: ReviewAnswer[]; // 寮曞闂瓟鐨勭瓟妗?
  summary?: string; // 鎵嬪姩鍙欎簨锛氫竴鍙ヨ瘽鎬荤粨鏈懆
  summaryUpdatedAt?: number;
  narrative?: string; // AI鐢熸垚鐨勫彊浜?
  narrativeUpdatedAt?: number;
  isEdited?: boolean; // 鍙欎簨鏄惁琚墜鍔ㄧ紪杈戣繃
  templateSnapshot?: ReviewTemplateSnapshot[]; // 鍒涘缓鏃剁殑妯℃澘蹇収
}

// 姣忔湀鍥為【
export interface MonthlyReview {
  id: string;
  monthStartDate: string; // YYYY-MM-DD鏍煎紡锛屾湀鐨勭涓€澶?
  monthEndDate: string;   // YYYY-MM-DD鏍煎紡锛屾湀 鐨勬渶鍚庝竴澶?
  createdAt: number;
  updatedAt: number;
  answers: ReviewAnswer[]; // 寮曞闂瓟鐨勭瓟妗?
  summary?: string; // 鎵嬪姩鍙欎簨锛氫竴鍙ヨ瘽鎬荤粨鏈湀
  summaryUpdatedAt?: number;
  narrative?: string; // AI鐢熸垚鐨勫彊浜?
  narrativeUpdatedAt?: number;
  isEdited?: boolean; // 鍙欎簨鏄惁琚墜鍔ㄧ紪杈戣繃
  templateSnapshot?: ReviewTemplateSnapshot[]; // 鍒涘缓鏃剁殑妯℃澘蹇収
  cite?: string; // 鐢ㄦ埛鑷畾涔夌殑鏈湀寮曡█
}


// Narrative Template (AI 鍙欎簨妯℃澘)
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
  description: string; // 绠€鐭弿杩帮紝鐢ㄤ簬UI灞曠ず
  prompt: string; // 鎻愮ず璇嶅唴瀹? 
  isCustom?: boolean; // Whether created by user
  icon?: string;
  isDaily?: boolean;    // 鏄惁鐢ㄤ簬鏃ュ洖椤?
  isWeekly?: boolean;   // 鏄惁鐢ㄤ簬鍛ㄥ洖椤?
  isMonthly?: boolean;  // 鏄惁鐢ㄤ簬鏈堝洖椤?
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

// ========== Custom Filter (鑷畾涔夌瓫閫夊櫒) ==========

// 鑷畾涔夌瓫閫夊櫒
export interface Filter {
  id: string;
  name: string;                    // 绛涢€夊櫒鍚嶇О
  filterExpression: string;        // 鍘熷绛涢€夎〃杈惧紡,濡?鐟滀冀 #杩愬姩 %鍋ュ悍 @鏌旈煣"
  createdAt: number;               // 鍒涘缓鏃堕棿
  order?: number;                  // 鏄剧ず椤哄簭锛岀敤浜庤嚜瀹氫箟鎺掑簭
  icon?: string;                   //  鍙€夊浘鏍?
}

// 瑙ｆ瀽鍚庣殑绛涢€夋潯浠?
export interface ParsedFilterCondition {
  tags: string[][];                // # 寮曞鐨勬爣绛惧叧閿瘝缁?(澶栧眰AND, 鍐呭眰OR)
  scopes: string[][];              // % 寮曞鐨勯鍩熷叧閿瘝缁?(澶栧眰AND, 鍐呭眰OR)
  todos: string[][];               // @ 寮曞鐨勪唬鍔炲叧閿瘝缁?(澶栧眰AND, 鍐呭眰OR)
  notes: string[][];               // 鏃犵鍙风殑鍏ㄦ枃澶囨敞鍏抽敭璇嶇粍 (澶栧眰AND, 鍐呭眰OR)
  reactions: string[][];           // ^ 寮曞鐨?Reaction Emoji 鍏抽敭璇嶇粍 (澶栧眰AND, 鍐呭眰OR)
}

// Memoir 绛涢€夐厤缃?
export interface MemoirFilterConfig {
  hasImage: boolean;           // 鏄惁甯︽湁鍥剧墖
  hasReaction?: boolean;       // 鏄惁甯︽湁鍙嶅簲
  minNoteLength: number;       // 澶囨敞鏈€灏忓瓧鏁?
  relatedTagIds: string[];     // 鍏宠仈鏍囩 ID锛圓ctivity ID锛?
  relatedScopeIds: string[];   // 鍏宠仈棰嗗煙 ID
  showDailyReviews?: boolean;  // 鏂板锛氭樉绀烘瘡鏃ュ洖椤?
  showWeeklyReviews?: boolean; // 鏂板锛氭樉绀烘瘡鍛ㄥ洖椤?
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


