/**
 * @file SettingsContext.tsx
 * @description 管理应用设置和用户偏好（不包括 Review 系统，Review 由 ReviewContext 管理）
 */
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { AppView, AutoLinkRule, Filter, NarrativeTemplate, MemoirFilterConfig } from '../types';
import { DEFAULT_USER_PERSONAL_INFO } from '../constants';

export type DefaultArchiveView = 'CHRONICLE' | 'MEMOIR';
export type DefaultIndexView = 'TAGS' | 'SCOPE';

interface SettingsContextType {
    // 基础偏好设置
    startWeekOnSunday: boolean;
    setStartWeekOnSunday: React.Dispatch<React.SetStateAction<boolean>>;

    minIdleTimeThreshold: number;
    setMinIdleTimeThreshold: React.Dispatch<React.SetStateAction<number>>;

    defaultView: AppView;
    setDefaultView: React.Dispatch<React.SetStateAction<AppView>>;

    defaultArchiveView: DefaultArchiveView;
    setDefaultArchiveView: React.Dispatch<React.SetStateAction<DefaultArchiveView>>;

    defaultIndexView: DefaultIndexView;
    setDefaultIndexView: React.Dispatch<React.SetStateAction<DefaultIndexView>>;

    // 自动关联规则
    autoLinkRules: AutoLinkRule[];
    setAutoLinkRules: React.Dispatch<React.SetStateAction<AutoLinkRule[]>>;

    // 交互偏好
    autoFocusNote: boolean;
    setAutoFocusNote: React.Dispatch<React.SetStateAction<boolean>>;

    // 应用规则
    appRules: { [packageName: string]: string };
    setAppRules: React.Dispatch<React.SetStateAction<{ [packageName: string]: string }>>;

    // AI 设置
    customNarrativeTemplates: NarrativeTemplate[];
    setCustomNarrativeTemplates: React.Dispatch<React.SetStateAction<NarrativeTemplate[]>>;

    userPersonalInfo: string;
    setUserPersonalInfo: React.Dispatch<React.SetStateAction<string>>;

    // 筛选器
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
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // 基础偏好
    const [startWeekOnSunday, setStartWeekOnSunday] = useState(false);

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

    // 自动关联规则
    const [autoLinkRules, setAutoLinkRules] = useState<AutoLinkRule[]>(() => {
        const stored = localStorage.getItem('lumostime_autoLinkRules');
        return stored ? JSON.parse(stored) : [];
    });

    const [appRules, setAppRules] = useState<{ [packageName: string]: string }>({});

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
    const [filters, setFilters] = useState<Filter[]>(() => {
        const stored = localStorage.getItem('lumostime_filters');
        return stored ? JSON.parse(stored) : [];
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
        localStorage.setItem('lumostime_autoLinkRules', JSON.stringify(autoLinkRules));
    }, [autoLinkRules]);

    const [autoFocusNote, setAutoFocusNote] = useState<boolean>(() => {
        const stored = localStorage.getItem('lumostime_auto_focus_note');
        return stored !== 'false'; // Default to true
    });

    useEffect(() => {
        localStorage.setItem('lumostime_auto_focus_note', autoFocusNote.toString());
    }, [autoFocusNote]);

    useEffect(() => {
        localStorage.setItem('lumostime_custom_narrative_templates', JSON.stringify(customNarrativeTemplates));
    }, [customNarrativeTemplates]);

    useEffect(() => {
        localStorage.setItem('lumostime_user_personal_info', userPersonalInfo);
    }, [userPersonalInfo]);

    useEffect(() => {
        localStorage.setItem('lumostime_filters', JSON.stringify(filters));
    }, [filters]);

    useEffect(() => {
        localStorage.setItem('lumostime_memoir_filter_config', JSON.stringify(memoirFilterConfig));
    }, [memoirFilterConfig]);

    useEffect(() => {
        localStorage.setItem('lumos_data_last_modified', dataLastModified.toString());
    }, [dataLastModified]);

    return (
        <SettingsContext.Provider value={{
            startWeekOnSunday,
            setStartWeekOnSunday,
            minIdleTimeThreshold,
            setMinIdleTimeThreshold,
            defaultView,
            setDefaultView,
            defaultArchiveView,
            setDefaultArchiveView,
            defaultIndexView,
            setDefaultIndexView,
            autoLinkRules,
            setAutoLinkRules,
            autoFocusNote,
            setAutoFocusNote,
            appRules,
            setAppRules,
            customNarrativeTemplates,
            setCustomNarrativeTemplates,
            userPersonalInfo,
            setUserPersonalInfo,
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
                const now = Date.now();
                setDataLastModified(now);
                localStorage.setItem('lumos_data_last_modified', now.toString());
            },
            isRestoring
        }}>
            {children}
        </SettingsContext.Provider>
    );
};
