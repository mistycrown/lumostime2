/**
 * @file SettingsContext.tsx
 * @description 管理应用设置和用户偏好（不包括 Review 系统，Review 由 ReviewContext 管理），并兼容自定义筛选器排序。
 * @updated 2026-05-10: Replaced the old boolean timer auto-open flag with a three-state post-start jump mode and legacy storage migration.
 * @updated 2026-04-25: Added configurable timeline quick-action preferences for the timeline header.
 * @updated 2026-07-21: Added persistent calendar number typography preferences shared by app and desktop month views.
 * @updated 2026-07-29: Added persistent Chronicle layout, todo-column collapse state, and schedule-canvas start preferences.
 */
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import {
    AppAwarenessAppBinding,
    AppAwarenessRun,
    AppAwarenessWorkflowTemplate,
    AppView,
    AutoLinkRule,
    CustomStickerRecord,
    CustomStickerSetRecord,
    Filter,
    MemoirFilterConfig,
    NarrativeTemplate
} from '../types';
import { DEFAULT_USER_PERSONAL_INFO } from '../constants';
import { THEME_KEYS } from '../constants/storageKeys';
import { appAwarenessService } from '../services/appAwarenessService';
import { uiIconService } from '../services/uiIconService';
import { fontService } from '../services/fontService';
import {
    DEFAULT_TIMELINE_STYLE_THEME,
    TimelineStyleConfigMap,
    TimelineStyleTheme,
    getDefaultTimelineStyleConfigs,
    isTimelineStyleTheme,
    normalizeTimelineStyleConfigs
} from '../services/timelineStyleService';
import {
    DEFAULT_TIMELINE_LAYOUT_MODE,
    DEFAULT_TIMELINE_CANVAS_START_HOUR,
    isTimelineCanvasStartHour,
    isTimelineLayoutMode,
    type TimelineLayoutMode
} from '../services/timelineLayoutService';
import {
    AchievementBottleStyle,
    DEFAULT_ACHIEVEMENT_BOTTLE_STYLE,
    isAchievementBottleStyle
} from '../services/achievementBottleStyleService';
import {
    AchievementBottleIconPack,
    DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK,
    isAchievementBottleIconPack
} from '../services/achievementBottleIconPackService';
import {
    DEFAULT_CALENDAR_NUMBER_STYLE,
    isCalendarNumberStyle,
    type CalendarNumberStyle
} from '../services/calendarNumberStyleService';
import { normalizeFiltersOrder } from '../utils/filterUtils';
import {
    getLocalDataTimestamp,
    isLocalDataTimestampUpdateLocked,
    updateLocalDataTimestamp
} from '../utils/localDataTimestamp';
import { normalizeCustomStickerState } from '../services/customStickerAssetService';
import {
    normalizeImmersiveTimerOrientation,
    type ImmersiveTimerOrientation
} from '../utils/immersiveOrientation';
import {
    DEFAULT_TIMELINE_QUICK_ACTIONS,
    normalizeTimelineQuickActions,
    type TimelineQuickActionKey
} from '../constants/timelineQuickActions';
import {
    AUTO_START_TIMER_JUMP_MODE_STORAGE_KEY,
    LEGACY_AUTO_OPEN_FOCUS_DETAIL_STORAGE_KEY,
    readStoredAutoStartTimerJumpMode,
    type AutoStartTimerJumpMode
} from '../utils/autoStartTimerJumpMode';
import {
    applyThemeMode,
    DISPLAY_MODE_STORAGE_KEY,
    readStoredThemeMode,
    type ThemeMode
} from '../utils/displayMode';

export type DefaultArchiveView = 'CHRONICLE' | 'MEMOIR';
export type DefaultIndexView = 'TAGS' | 'SCOPE';
export type DefaultRecordView = 'TIMER' | 'SCENE';
export type TimelineSortOrder = 'asc' | 'desc';
export type EmojiStyle = 'native' | 'twemoji' | 'openmoji';
export type ScheduleStyle = 'default' | 'classic' | 'minimal' | 'solid';
export type DefaultSelectorPage = 'emoji' | string; // 'emoji' 或 sticker set ID (如 'water', 'water-1', 'water-2')
export type SceneCardTimerMode = 'realtime' | 'backfill'; // 'realtime' 正计时, 'backfill' 补记
export type { ImmersiveTimerOrientation } from '../utils/immersiveOrientation';
export type { TimelineQuickActionKey } from '../constants/timelineQuickActions';
export type { AutoStartTimerJumpMode } from '../utils/autoStartTimerJumpMode';
export type { ThemeMode } from '../utils/displayMode';
export type { TimelineLayoutMode } from '../services/timelineLayoutService';

interface SettingsContextType {
    // 基础偏好设置
    minIdleTimeThreshold: number;
    setMinIdleTimeThreshold: React.Dispatch<React.SetStateAction<number>>;

    defaultView: AppView;
    setDefaultView: React.Dispatch<React.SetStateAction<AppView>>;

    defaultArchiveView: DefaultArchiveView;
    setDefaultArchiveView: React.Dispatch<React.SetStateAction<DefaultArchiveView>>;

    defaultIndexView: DefaultIndexView;
    setDefaultIndexView: React.Dispatch<React.SetStateAction<DefaultIndexView>>;

    defaultRecordView: DefaultRecordView;
    setDefaultRecordView: React.Dispatch<React.SetStateAction<DefaultRecordView>>;
    immersiveTimerDefaultOrientation: ImmersiveTimerOrientation;
    setImmersiveTimerDefaultOrientation: React.Dispatch<React.SetStateAction<ImmersiveTimerOrientation>>;

    // 自动关联规则
    autoLinkRules: AutoLinkRule[];
    setAutoLinkRules: React.Dispatch<React.SetStateAction<AutoLinkRule[]>>;

    // 自动应用规则开关
    autoApplyAutoLinkRules: boolean;
    setAutoApplyAutoLinkRules: React.Dispatch<React.SetStateAction<boolean>>;
    
    // 自动应用待办关联开关
    autoApplyTodoLink: boolean;
    setAutoApplyTodoLink: React.Dispatch<React.SetStateAction<boolean>>;

    // 交互偏好
    autoFocusNote: boolean;
    setAutoFocusNote: React.Dispatch<React.SetStateAction<boolean>>;

    autoStartTimerJumpMode: AutoStartTimerJumpMode;
    setAutoStartTimerJumpMode: React.Dispatch<React.SetStateAction<AutoStartTimerJumpMode>>;

    timelineGalleryMode: boolean;
    setTimelineGalleryMode: React.Dispatch<React.SetStateAction<boolean>>;
    timelineSortOrder: TimelineSortOrder;
    setTimelineSortOrder: React.Dispatch<React.SetStateAction<TimelineSortOrder>>;
    timelineQuickActions: TimelineQuickActionKey[];
    setTimelineQuickActions: React.Dispatch<React.SetStateAction<TimelineQuickActionKey[]>>;
    timelineLayout: TimelineLayoutMode;
    setTimelineLayout: React.Dispatch<React.SetStateAction<TimelineLayoutMode>>;
    timelineTodoSidebarCollapsed: boolean;
    setTimelineTodoSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    timelineCanvasStartHour: number;
    setTimelineCanvasStartHour: React.Dispatch<React.SetStateAction<number>>;

    // 折叠字数设置
    collapseThreshold: number;
    setCollapseThreshold: React.Dispatch<React.SetStateAction<number>>;

    // UI 主题
    uiIconTheme: string;
    setUiIconTheme: React.Dispatch<React.SetStateAction<string>>;

    // 配色方案
    colorScheme: string;
    setColorScheme: React.Dispatch<React.SetStateAction<string>>;

    themeMode: ThemeMode;
    setThemeMode: React.Dispatch<React.SetStateAction<ThemeMode>>;

    // 字体设置
    fontFamily: string;
    setFontFamily: React.Dispatch<React.SetStateAction<string>>;

    // 日程图样式
    scheduleStyle: ScheduleStyle;
    setScheduleStyle: React.Dispatch<React.SetStateAction<ScheduleStyle>>;
    calendarNumberStyle: CalendarNumberStyle;
    setCalendarNumberStyle: React.Dispatch<React.SetStateAction<CalendarNumberStyle>>;
    calendarLunarDisplay: boolean;
    setCalendarLunarDisplay: React.Dispatch<React.SetStateAction<boolean>>;
    achievementBottleStyle: AchievementBottleStyle;
    setAchievementBottleStyle: React.Dispatch<React.SetStateAction<AchievementBottleStyle>>;
    achievementBottleIconPack: AchievementBottleIconPack;
    setAchievementBottleIconPack: React.Dispatch<React.SetStateAction<AchievementBottleIconPack>>;

    timelineStyleTheme: TimelineStyleTheme;
    setTimelineStyleTheme: React.Dispatch<React.SetStateAction<TimelineStyleTheme>>;
    timelineStyleConfigs: TimelineStyleConfigMap;
    setTimelineStyleConfigs: React.Dispatch<React.SetStateAction<TimelineStyleConfigMap>>;
    timelineStyleAdjusterOpen: boolean;
    setTimelineStyleAdjusterOpen: React.Dispatch<React.SetStateAction<boolean>>;

    // Emoji 风格设置
    emojiStyle: EmojiStyle;
    setEmojiStyle: React.Dispatch<React.SetStateAction<EmojiStyle>>;

    // Selector 默认页设置
    defaultSelectorPage: DefaultSelectorPage;
    setDefaultSelectorPage: React.Dispatch<React.SetStateAction<DefaultSelectorPage>>;

    // 应用规则
    appRules: { [packageName: string]: string };
    setAppRules: React.Dispatch<React.SetStateAction<{ [packageName: string]: string }>>;
    appAwarenessTemplates: AppAwarenessWorkflowTemplate[];
    setAppAwarenessTemplates: React.Dispatch<React.SetStateAction<AppAwarenessWorkflowTemplate[]>>;
    appAwarenessBindings: AppAwarenessAppBinding[];
    setAppAwarenessBindings: React.Dispatch<React.SetStateAction<AppAwarenessAppBinding[]>>;
    appAwarenessActiveRun: AppAwarenessRun | null;
    setAppAwarenessActiveRun: React.Dispatch<React.SetStateAction<AppAwarenessRun | null>>;

    // AI 设置
    customNarrativeTemplates: NarrativeTemplate[];
    setCustomNarrativeTemplates: React.Dispatch<React.SetStateAction<NarrativeTemplate[]>>;

    userPersonalInfo: string;
    setUserPersonalInfo: React.Dispatch<React.SetStateAction<string>>;

    // 筛选器
    customStickerSets: CustomStickerSetRecord[];
    setCustomStickerSets: React.Dispatch<React.SetStateAction<CustomStickerSetRecord[]>>;
    customStickers: CustomStickerRecord[];
    setCustomStickers: React.Dispatch<React.SetStateAction<CustomStickerRecord[]>>;
    filters: Filter[];
    setFilters: React.Dispatch<React.SetStateAction<Filter[]>>;

    // Memoir 筛选配置
    memoirFilterConfig: MemoirFilterConfig;
    setMemoirFilterConfig: React.Dispatch<React.SetStateAction<MemoirFilterConfig>>;

    // 同步相关
    lastSyncTime: number;
    setLastSyncTime: React.Dispatch<React.SetStateAction<number>>;
    updateLastSyncTime: () => void;

    dataLastModified: number;
    setDataLastModified: React.Dispatch<React.SetStateAction<number>>;
    updateDataLastModified: () => void;
    isRestoring: React.MutableRefObject<boolean>;
    isSyncing: boolean;
    setIsSyncing: React.Dispatch<React.SetStateAction<boolean>>;
    
    // 手动同步模式
    manualSyncMode: boolean;
    setManualSyncMode: React.Dispatch<React.SetStateAction<boolean>>;

    // 场景卡片计时模式
    sceneCardTimerMode: SceneCardTimerMode;
    setSceneCardTimerMode: React.Dispatch<React.SetStateAction<SceneCardTimerMode>>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const buildInitialCustomStickerState = (): {
    customStickerSets: CustomStickerSetRecord[];
    customStickers: CustomStickerRecord[];
} => {
    try {
        const storedSets = localStorage.getItem('lumostime_custom_sticker_sets_v2');
        const storedStickers = localStorage.getItem('lumostime_custom_stickers_v2');

        return normalizeCustomStickerState(
            storedSets ? JSON.parse(storedSets) : [],
            storedStickers ? JSON.parse(storedStickers) : []
        );
    } catch (error) {
        console.error('[SettingsContext] Failed to parse stored custom sticker state', error);
        return {
            customStickerSets: [],
            customStickers: []
        };
    }
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const hasInitializedSyncRelevantTimestampRef = useRef(false);

    // 基础偏好
    const [minIdleTimeThreshold, setMinIdleTimeThreshold] = useState<number>(() => {
        const saved = localStorage.getItem('lumos_min_idle_time');
        return saved ? parseInt(saved) : 1;
    });

    const [defaultView, setDefaultView] = useState<AppView>(() => {
        const saved = localStorage.getItem('lumos_default_view');
        return (saved as AppView) || AppView.RECORD;
    });

    const [defaultArchiveView, setDefaultArchiveView] = useState<DefaultArchiveView>(() => {
        const saved = localStorage.getItem('lumos_default_archive_view');
        return (saved as DefaultArchiveView) || 'CHRONICLE';
    });

    const [defaultIndexView, setDefaultIndexView] = useState<DefaultIndexView>(() => {
        const saved = localStorage.getItem('lumos_default_index_view');
        return (saved as DefaultIndexView) || 'TAGS';
    });

    const [defaultRecordView, setDefaultRecordView] = useState<DefaultRecordView>(() => {
        const saved = localStorage.getItem('lumos_default_record_view');
        return (saved as DefaultRecordView) || 'TIMER';
    });
    const [immersiveTimerDefaultOrientation, setImmersiveTimerDefaultOrientation] = useState<ImmersiveTimerOrientation>(() => {
        const stored = localStorage.getItem('lumostime_immersive_timer_default_orientation');
        return normalizeImmersiveTimerOrientation(stored);
    });

    // 自动关联规则
    const [autoLinkRules, setAutoLinkRules] = useState<AutoLinkRule[]>(() => {
        const stored = localStorage.getItem('lumostime_autoLinkRules');
        return stored ? JSON.parse(stored) : [];
    });

    // 自动应用规则开关
    const [autoApplyAutoLinkRules, setAutoApplyAutoLinkRules] = useState<boolean>(() => {
        const stored = localStorage.getItem('lumostime_autoApplyAutoLinkRules');
        return stored ? JSON.parse(stored) : true; // 默认开启
    });
    
    // 自动应用待办关联开关
    const [autoApplyTodoLink, setAutoApplyTodoLink] = useState<boolean>(() => {
        const stored = localStorage.getItem('lumostime_autoApplyTodoLink');
        return stored ? JSON.parse(stored) : true; // 默认开启
    });

    const [appRules, setAppRules] = useState<{ [packageName: string]: string }>({});
    const [appAwarenessTemplates, setAppAwarenessTemplates] = useState<AppAwarenessWorkflowTemplate[]>(
        () => appAwarenessService.getTemplates()
    );
    const [appAwarenessBindings, setAppAwarenessBindings] = useState<AppAwarenessAppBinding[]>(
        () => appAwarenessService.getBindings()
    );
    const [appAwarenessActiveRun, setAppAwarenessActiveRun] = useState<AppAwarenessRun | null>(
        () => appAwarenessService.getActiveRun()
    );

    // AI 设置
    const [customNarrativeTemplates, setCustomNarrativeTemplates] = useState<NarrativeTemplate[]>(() => {
        const stored = localStorage.getItem('lumostime_custom_narrative_templates');
        if (stored) return JSON.parse(stored);

        const oldPrompt = localStorage.getItem('lumostime_ai_narrative_prompt');
        if (oldPrompt && oldPrompt.trim() !== '') {
            return [{
                id: 'custom_migrated',
                title: '我的自定义模版',
                description: '从旧版本迁移的自定义提示向',
                prompt: oldPrompt,
                isCustom: true
            }];
        }
        return [];
    });

    const [userPersonalInfo, setUserPersonalInfo] = useState<string>(() => {
        const stored = localStorage.getItem('lumostime_user_personal_info');
        if (stored) return stored;
        return DEFAULT_USER_PERSONAL_INFO;
    });

    // 筛选器
    const [customStickerSets, setCustomStickerSets] = useState<CustomStickerSetRecord[]>(() => {
        return buildInitialCustomStickerState().customStickerSets;
    });

    const [customStickers, setCustomStickers] = useState<CustomStickerRecord[]>(() => {
        return buildInitialCustomStickerState().customStickers;
    });

    const [filters, setFilters] = useState<Filter[]>(() => {
        const stored = localStorage.getItem('lumostime_filters');
        return stored ? normalizeFiltersOrder(JSON.parse(stored)) : [];
    });

    // Memoir 筛选配置
    const [memoirFilterConfig, setMemoirFilterConfig] = useState<MemoirFilterConfig>(() => {
        const stored = localStorage.getItem('lumostime_memoir_filter_config');
        return stored ? JSON.parse(stored) : {
            hasImage: false,
            hasReaction: false,
            minNoteLength: 40,
            relatedTagIds: [],
            relatedScopeIds: [],
            showDailyReviews: true,
            showWeeklyReviews: true
        };
    });

    // 同步相关
    const [lastSyncTime, setLastSyncTime] = useState<number>(() => {
        const saved = localStorage.getItem('lumos_last_sync_time');
        return saved ? parseInt(saved) : 0;
    });

    const [dataLastModified, setDataLastModified] = useState<number>(() => {
        const saved = localStorage.getItem('lumos_data_last_modified');
        return saved ? parseInt(saved) : Date.now();
    });

    const isRestoring = useRef(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // 手动同步模式
    const [manualSyncMode, setManualSyncMode] = useState<boolean>(() => {
        const stored = localStorage.getItem('lumostime_manual_sync_mode');
        return stored ? stored === 'true' : true; // 默认为 true（手动同步）
    });

    // 场景卡片计时模式
    const [sceneCardTimerMode, setSceneCardTimerMode] = useState<SceneCardTimerMode>(() => {
        const stored = localStorage.getItem('lumostime_scene_card_timer_mode');
        return (stored as SceneCardTimerMode) || 'realtime'; // 默认为正计时
    });

    const updateLastSyncTime = () => {
        const now = Date.now();
        setLastSyncTime(now);
        localStorage.setItem('lumos_last_sync_time', now.toString());
    };

    // 持久化效果
    useEffect(() => {
        localStorage.setItem('lumos_min_idle_time', minIdleTimeThreshold.toString());
    }, [minIdleTimeThreshold]);

    useEffect(() => {
        localStorage.setItem('lumos_default_view', defaultView);
    }, [defaultView]);

    useEffect(() => {
        localStorage.setItem('lumos_default_archive_view', defaultArchiveView);
    }, [defaultArchiveView]);

    useEffect(() => {
        localStorage.setItem('lumos_default_index_view', defaultIndexView);
    }, [defaultIndexView]);

    useEffect(() => {
        localStorage.setItem('lumos_default_record_view', defaultRecordView);
    }, [defaultRecordView]);

    useEffect(() => {
        localStorage.setItem('lumostime_immersive_timer_default_orientation', immersiveTimerDefaultOrientation);
    }, [immersiveTimerDefaultOrientation]);

    useEffect(() => {
        localStorage.setItem('lumostime_autoLinkRules', JSON.stringify(autoLinkRules));
    }, [autoLinkRules]);

    useEffect(() => {
        localStorage.setItem('lumostime_autoApplyAutoLinkRules', JSON.stringify(autoApplyAutoLinkRules));
    }, [autoApplyAutoLinkRules]);
    
    useEffect(() => {
        localStorage.setItem('lumostime_autoApplyTodoLink', JSON.stringify(autoApplyTodoLink));
    }, [autoApplyTodoLink]);

    useEffect(() => {
        appAwarenessService.saveTemplates(appAwarenessTemplates);
    }, [appAwarenessTemplates]);

    useEffect(() => {
        appAwarenessService.saveBindings(appAwarenessBindings);
    }, [appAwarenessBindings]);

    useEffect(() => {
        appAwarenessService.saveActiveRun(appAwarenessActiveRun);
    }, [appAwarenessActiveRun]);

    const [autoFocusNote, setAutoFocusNote] = useState<boolean>(() => {
        const stored = localStorage.getItem('lumostime_auto_focus_note');
        return stored !== 'false'; // Default to true
    });

    useEffect(() => {
        localStorage.setItem('lumostime_auto_focus_note', autoFocusNote.toString());
    }, [autoFocusNote]);

    const [autoStartTimerJumpMode, setAutoStartTimerJumpMode] = useState<AutoStartTimerJumpMode>(() => {
        return readStoredAutoStartTimerJumpMode(localStorage);
    });

    useEffect(() => {
        localStorage.setItem(AUTO_START_TIMER_JUMP_MODE_STORAGE_KEY, autoStartTimerJumpMode);
        localStorage.setItem(
            LEGACY_AUTO_OPEN_FOCUS_DETAIL_STORAGE_KEY,
            String(autoStartTimerJumpMode !== 'none')
        );
    }, [autoStartTimerJumpMode]);

    const [timelineGalleryMode, setTimelineGalleryMode] = useState<boolean>(() => {
        const stored = localStorage.getItem('lumostime_timeline_gallery_mode');
        return stored === 'true'; // Default to false
    });

    useEffect(() => {
        localStorage.setItem('lumostime_timeline_gallery_mode', timelineGalleryMode.toString());
    }, [timelineGalleryMode]);

    const [timelineSortOrder, setTimelineSortOrder] = useState<TimelineSortOrder>(() => {
        const stored =
            localStorage.getItem('lumostime_timeline_sort_order') ||
            localStorage.getItem('lumos_timeline_sort');
        return stored === 'desc' ? 'desc' : 'asc';
    });

    useEffect(() => {
        localStorage.setItem('lumostime_timeline_sort_order', timelineSortOrder);
        localStorage.setItem('lumos_timeline_sort', timelineSortOrder);
    }, [timelineSortOrder]);

    const [timelineQuickActions, setTimelineQuickActions] = useState<TimelineQuickActionKey[]>(() => {
        const stored = localStorage.getItem('lumostime_timeline_quick_actions');

        if (!stored) {
            return [...DEFAULT_TIMELINE_QUICK_ACTIONS];
        }

        try {
            return normalizeTimelineQuickActions(JSON.parse(stored));
        } catch (error) {
            console.error('[SettingsContext] Failed to parse timeline quick actions:', error);
            return [...DEFAULT_TIMELINE_QUICK_ACTIONS];
        }
    });

    useEffect(() => {
        localStorage.setItem('lumostime_timeline_quick_actions', JSON.stringify(timelineQuickActions));
    }, [timelineQuickActions]);

    const [collapseThreshold, setCollapseThreshold] = useState<number>(() => {
        const stored = localStorage.getItem('lumostime_collapse_threshold');
        return stored ? parseInt(stored) : 9999; // Default to 9999 (no collapse)
    });

    useEffect(() => {
        localStorage.setItem('lumostime_collapse_threshold', collapseThreshold.toString());
    }, [collapseThreshold]);

    const [uiIconTheme, setUiIconTheme] = useState<string>(() => {
        const stored = localStorage.getItem('lumostime_ui_icon_theme');
        return stored || 'default'; // Default to default (built-in icons)
    });

    useEffect(() => {
        localStorage.setItem('lumostime_ui_icon_theme', uiIconTheme);
        // 同步到 uiIconService
        uiIconService.setTheme(uiIconTheme as any);
    }, [uiIconTheme]);

    const [colorScheme, setColorScheme] = useState<string>(() => {
        const stored = localStorage.getItem('lumostime_color_scheme');
        return stored || 'default';
    });

    const [themeMode, setThemeMode] = useState<ThemeMode>(() => readStoredThemeMode(localStorage));

    const [fontFamily, setFontFamily] = useState<string>(() => {
        const stored = localStorage.getItem('lumostime_font_family');
        return stored || 'default';
    });

    const [scheduleStyle, setScheduleStyle] = useState<ScheduleStyle>(() => {
        const stored = localStorage.getItem(THEME_KEYS.SCHEDULE_STYLE);
        if (stored === 'outline') return 'minimal';
        if (stored === 'classic' || stored === 'minimal' || stored === 'solid' || stored === 'default') {
            return stored;
        }
        return 'default';
    });

    const [calendarNumberStyle, setCalendarNumberStyle] = useState<CalendarNumberStyle>(() => {
        const stored = localStorage.getItem(THEME_KEYS.CALENDAR_NUMBER_STYLE);
        return isCalendarNumberStyle(stored)
            ? stored
            : DEFAULT_CALENDAR_NUMBER_STYLE;
    });

    const [calendarLunarDisplay, setCalendarLunarDisplay] = useState<boolean>(() => (
        localStorage.getItem(THEME_KEYS.CALENDAR_LUNAR_DISPLAY) === 'true'
    ));

    const [achievementBottleStyle, setAchievementBottleStyle] = useState<AchievementBottleStyle>(() => {
        const stored = localStorage.getItem(THEME_KEYS.ACHIEVEMENT_BOTTLE_STYLE);
        return isAchievementBottleStyle(stored)
            ? stored
            : DEFAULT_ACHIEVEMENT_BOTTLE_STYLE;
    });

    const [achievementBottleIconPack, setAchievementBottleIconPack] = useState<AchievementBottleIconPack>(() => {
        const stored = localStorage.getItem(THEME_KEYS.ACHIEVEMENT_BOTTLE_ICON_PACK);
        return isAchievementBottleIconPack(stored)
            ? stored
            : DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK;
    });

    const [timelineStyleTheme, setTimelineStyleTheme] = useState<TimelineStyleTheme>(() => {
        const stored = localStorage.getItem(THEME_KEYS.TIMELINE_STYLE_THEME);
        return isTimelineStyleTheme(stored) ? stored : DEFAULT_TIMELINE_STYLE_THEME;
    });

    const [timelineStyleConfigs, setTimelineStyleConfigs] = useState<TimelineStyleConfigMap>(() => {
        const stored = localStorage.getItem(THEME_KEYS.TIMELINE_STYLE_CONFIGS);
        if (!stored) return getDefaultTimelineStyleConfigs();

        try {
            return normalizeTimelineStyleConfigs(JSON.parse(stored));
        } catch (error) {
            console.error('[SettingsContext] Failed to parse timeline style configs:', error);
            return getDefaultTimelineStyleConfigs();
        }
    });
    const [timelineStyleAdjusterOpen, setTimelineStyleAdjusterOpen] = useState(false);

    const [timelineLayout, setTimelineLayout] = useState<TimelineLayoutMode>(() => {
        const stored = localStorage.getItem(THEME_KEYS.TIMELINE_LAYOUT);
        return isTimelineLayoutMode(stored) ? stored : DEFAULT_TIMELINE_LAYOUT_MODE;
    });
    const [timelineTodoSidebarCollapsed, setTimelineTodoSidebarCollapsed] = useState<boolean>(() => (
        localStorage.getItem(THEME_KEYS.TIMELINE_TODO_SIDEBAR_COLLAPSED) === 'true'
    ));
    const [timelineCanvasStartHour, setTimelineCanvasStartHour] = useState<number>(() => {
        const stored = Number(localStorage.getItem(THEME_KEYS.TIMELINE_CANVAS_START_HOUR));
        return isTimelineCanvasStartHour(stored) ? stored : DEFAULT_TIMELINE_CANVAS_START_HOUR;
    });

    const [emojiStyle, setEmojiStyle] = useState<EmojiStyle>(() => {
        const stored = localStorage.getItem('lumostime_emoji_style');
        // 向后兼容：如果之前使用 useTwemoji，转换为新格式
        if (!stored) {
            const oldTwemoji = localStorage.getItem('lumostime_use_twemoji');
            if (oldTwemoji === 'true') {
                return 'twemoji';
            }
        }
        return (stored as EmojiStyle) || 'native';
    });

    const [defaultSelectorPage, setDefaultSelectorPage] = useState<DefaultSelectorPage>(() => {
        const stored = localStorage.getItem('lumostime_default_selector_page');
        return stored || 'emoji';
    });

    useEffect(() => {
        localStorage.setItem('lumostime_color_scheme', colorScheme);
        // 同步到 colorSchemeService
        import('../services/colorSchemeService').then(({ colorSchemeService }) => {
            colorSchemeService.setScheme(colorScheme as any);
        });
    }, [colorScheme]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const applyCurrentMode = () => applyThemeMode(
            document.documentElement,
            themeMode,
            mediaQuery.matches
        );

        localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, themeMode);
        applyCurrentMode();

        if (themeMode !== 'system') {
            return undefined;
        }

        mediaQuery.addEventListener('change', applyCurrentMode);
        return () => mediaQuery.removeEventListener('change', applyCurrentMode);
    }, [themeMode]);

    useEffect(() => {
        localStorage.setItem('lumostime_font_family', fontFamily);
        // 同步到 fontService
        fontService.setFont(fontFamily);
    }, [fontFamily]);

    useEffect(() => {
        localStorage.setItem(THEME_KEYS.SCHEDULE_STYLE, scheduleStyle);
    }, [scheduleStyle]);

    useEffect(() => {
        localStorage.setItem(THEME_KEYS.CALENDAR_NUMBER_STYLE, calendarNumberStyle);
        window.dispatchEvent(new Event('lumostime:calendar-number-style-changed'));
    }, [calendarNumberStyle]);

    useEffect(() => {
        localStorage.setItem(THEME_KEYS.CALENDAR_LUNAR_DISPLAY, String(calendarLunarDisplay));
        window.dispatchEvent(new Event('lumostime:calendar-lunar-display-changed'));
    }, [calendarLunarDisplay]);

    useEffect(() => {
        localStorage.setItem(THEME_KEYS.ACHIEVEMENT_BOTTLE_STYLE, achievementBottleStyle);
    }, [achievementBottleStyle]);

    useEffect(() => {
        localStorage.setItem(THEME_KEYS.ACHIEVEMENT_BOTTLE_ICON_PACK, achievementBottleIconPack);
    }, [achievementBottleIconPack]);

    useEffect(() => {
        localStorage.setItem(THEME_KEYS.TIMELINE_STYLE_THEME, timelineStyleTheme);
    }, [timelineStyleTheme]);

    useEffect(() => {
        localStorage.setItem(THEME_KEYS.TIMELINE_STYLE_CONFIGS, JSON.stringify(timelineStyleConfigs));
    }, [timelineStyleConfigs]);

    useEffect(() => {
        localStorage.setItem(THEME_KEYS.TIMELINE_LAYOUT, timelineLayout);
    }, [timelineLayout]);

    useEffect(() => {
        localStorage.setItem(THEME_KEYS.TIMELINE_TODO_SIDEBAR_COLLAPSED, String(timelineTodoSidebarCollapsed));
    }, [timelineTodoSidebarCollapsed]);

    useEffect(() => {
        localStorage.setItem(THEME_KEYS.TIMELINE_CANVAS_START_HOUR, String(timelineCanvasStartHour));
    }, [timelineCanvasStartHour]);

    useEffect(() => {
        localStorage.setItem('lumostime_emoji_style', emojiStyle);
    }, [emojiStyle]);

    useEffect(() => {
        localStorage.setItem('lumostime_default_selector_page', defaultSelectorPage);
    }, [defaultSelectorPage]);

    useEffect(() => {
        localStorage.setItem('lumostime_custom_narrative_templates', JSON.stringify(customNarrativeTemplates));
    }, [customNarrativeTemplates]);

    useEffect(() => {
        localStorage.setItem('lumostime_user_personal_info', userPersonalInfo);
    }, [userPersonalInfo]);

    useEffect(() => {
        localStorage.setItem('lumostime_custom_sticker_sets_v2', JSON.stringify(customStickerSets));
        localStorage.setItem('lumostime_custom_sticker_sets', JSON.stringify(customStickerSets));
        window.dispatchEvent(new CustomEvent('stickerSetsChanged'));
    }, [customStickerSets]);

    useEffect(() => {
        localStorage.setItem('lumostime_custom_stickers_v2', JSON.stringify(customStickers));
        window.dispatchEvent(new CustomEvent('stickerSetsChanged'));
    }, [customStickers]);

    useEffect(() => {
        const normalizedFilters = normalizeFiltersOrder(filters);
        if (JSON.stringify(filters) !== JSON.stringify(normalizedFilters)) {
            setFilters(normalizedFilters);
            return;
        }

        localStorage.setItem('lumostime_filters', JSON.stringify(normalizedFilters));
    }, [filters]);

    useEffect(() => {
        if (!hasInitializedSyncRelevantTimestampRef.current) {
            hasInitializedSyncRelevantTimestampRef.current = true;
            return;
        }

        if (isRestoring.current || isLocalDataTimestampUpdateLocked()) {
            console.log('[SettingsContext] Skipping local data timestamp update (restore/lock active)');
            return;
        }

        const previous = getLocalDataTimestamp();
        const now = updateLocalDataTimestamp();
        console.log(
            `[SettingsContext] Sync-relevant settings changed, updated local timestamp: ${previous} -> ${now} (${new Date(now).toLocaleTimeString()})`
        );
    }, [
        autoLinkRules,
        appAwarenessTemplates,
        appAwarenessBindings,
        customNarrativeTemplates,
        customStickerSets,
        customStickers,
        filters,
        userPersonalInfo
    ]);

    useEffect(() => {
        localStorage.setItem('lumostime_memoir_filter_config', JSON.stringify(memoirFilterConfig));
    }, [memoirFilterConfig]);

    useEffect(() => {
        localStorage.setItem('lumos_data_last_modified', dataLastModified.toString());
    }, [dataLastModified]);
    
    useEffect(() => {
        localStorage.setItem('lumostime_manual_sync_mode', manualSyncMode.toString());
    }, [manualSyncMode]);

    useEffect(() => {
        localStorage.setItem('lumostime_scene_card_timer_mode', sceneCardTimerMode);
    }, [sceneCardTimerMode]);

    return (
        <SettingsContext.Provider value={{
            minIdleTimeThreshold,
            setMinIdleTimeThreshold,
            defaultView,
            setDefaultView,
            defaultArchiveView,
            setDefaultArchiveView,
            defaultIndexView,
            setDefaultIndexView,
            defaultRecordView,
            setDefaultRecordView,
            immersiveTimerDefaultOrientation,
            setImmersiveTimerDefaultOrientation,
            autoLinkRules,
            setAutoLinkRules,
            autoApplyAutoLinkRules,
            setAutoApplyAutoLinkRules,
            autoApplyTodoLink,
            setAutoApplyTodoLink,
            autoFocusNote,
            setAutoFocusNote,
            autoStartTimerJumpMode,
            setAutoStartTimerJumpMode,
            timelineGalleryMode,
            setTimelineGalleryMode,
            timelineSortOrder,
            setTimelineSortOrder,
            timelineQuickActions,
            setTimelineQuickActions,
            timelineLayout,
            setTimelineLayout,
            timelineTodoSidebarCollapsed,
            setTimelineTodoSidebarCollapsed,
            timelineCanvasStartHour,
            setTimelineCanvasStartHour,
            collapseThreshold,
            setCollapseThreshold,
            uiIconTheme,
            setUiIconTheme,
            colorScheme,
            setColorScheme,
            themeMode,
            setThemeMode,
            fontFamily,
            setFontFamily,
            scheduleStyle,
            setScheduleStyle,
            calendarNumberStyle,
            setCalendarNumberStyle,
            calendarLunarDisplay,
            setCalendarLunarDisplay,
            achievementBottleStyle,
            setAchievementBottleStyle,
            achievementBottleIconPack,
            setAchievementBottleIconPack,
            timelineStyleTheme,
            setTimelineStyleTheme,
            timelineStyleConfigs,
            setTimelineStyleConfigs,
            timelineStyleAdjusterOpen,
            setTimelineStyleAdjusterOpen,
            emojiStyle,
            setEmojiStyle,
            defaultSelectorPage,
            setDefaultSelectorPage,
            appRules,
            setAppRules,
            appAwarenessTemplates,
            setAppAwarenessTemplates,
            appAwarenessBindings,
            setAppAwarenessBindings,
            appAwarenessActiveRun,
            setAppAwarenessActiveRun,
            customNarrativeTemplates,
            setCustomNarrativeTemplates,
            userPersonalInfo,
            setUserPersonalInfo,
            customStickerSets,
            setCustomStickerSets,
            customStickers,
            setCustomStickers,
            filters,
            setFilters,
            memoirFilterConfig,
            setMemoirFilterConfig,
            lastSyncTime,
            setLastSyncTime,
            updateLastSyncTime,
            dataLastModified,
            setDataLastModified,
            updateDataLastModified: () => {
                // 只在未被锁定时更新时间戳
                // 避免在数据恢复期间更新
                if (!isRestoring.current) {
                    const now = Date.now();
                    setDataLastModified(now);
                    // localStorage 会由 useEffect 自动同步，无需手动设置
                }
            },
            isRestoring,
            isSyncing,
            setIsSyncing,
            manualSyncMode,
            setManualSyncMode,
            sceneCardTimerMode,
            setSceneCardTimerMode
        }}>
            {children}
        </SettingsContext.Provider>
    );
};
