/**
 * @file uiIconService.ts
 * @description UI 图标主题服务 - 管理应用内所有 UI 图标的主题切换
 */

import React from 'react';

// UI 图标类型定义
export type UIIconType =
    | 'sync'           // 1. 同步按钮
    | 'settings'       // 2. 设置
    | 'manage'         // 3. 管理
    | 'calendar'       // 4. 日历
    | 'add-record'     // 5. 增加记录
    | 'timer'          // 6. 打点计时
    | 'ai-assist'      // 7. AI 补记
    | 'tags'           // 8. 索引页切换到标签
    | 'scope'          // 9. 索引页切换到领域
    | 'chronicle'      // 10. 档案页切换到编年史
    | 'memoir'         // 11. 档案页切换到回忆录
    | 'reading'        // 12. 阅读模式
    | 'editing'        // 13. 编辑模式
    | 'sort-asc'       // 14. 正向排序
    | 'sort-desc'      // 15. 反向排序
    | 'data-view';     // 16. 数据视图

// 图标编号映射（对应文件名）
const ICON_NUMBER_MAP: Record<UIIconType, string> = {
    'sync': '01',
    'settings': '02',
    'manage': '03',
    'calendar': '04',
    'add-record': '05',
    'timer': '06',
    'ai-assist': '07',
    'tags': '08',
    'scope': '09',
    'chronicle': '10',
    'memoir': '11',
    'reading': '12',
    'editing': '13',
    'sort-asc': '14',
    'sort-desc': '15',
    'data-view': '16'
};

// 可用的主题列表
export const UI_ICON_THEMES = ['default', 'purple', 'color', 'color2', 'prince'] as const;
export type UIIconTheme = typeof UI_ICON_THEMES[number];

// 主题样式配置
export interface ThemeStyleConfig {
    // 悬浮按钮样式
    floatingButton?: {
        backgroundColor?: string;
        borderColor?: string;
        borderWidth?: string;
        shadow?: string;
    };
    // 顶部栏按钮样式
    headerButton?: {
        backgroundColor?: string;
        borderColor?: string;
        borderWidth?: string;
    };
    // 其他按钮样式可以继续扩展
}

// 主题样式配置映射
const THEME_STYLES: Record<UIIconTheme, ThemeStyleConfig> = {
    'default': {
        // 默认主题使用 Lucide 图标，不需要特殊样式
    },
    'purple': {
        floatingButton: {
            backgroundColor: '#ffffff',
            borderColor: 'rgba(147, 51, 234, 0.15)', // purple-600 with 15% opacity
            borderWidth: '0.5px',
            shadow: '0 4px 6px -1px rgba(147, 51, 234, 0.1), 0 2px 4px -1px rgba(147, 51, 234, 0.06)'
        },
        headerButton: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: '0'
        }
    },
    'color': {
        floatingButton: {
            backgroundColor: '#ffffff',
            borderColor: 'rgba(59, 130, 246, 0.15)', // blue-500 with 15% opacity
            borderWidth: '0.5px',
            shadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)'
        },
        headerButton: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: '0'
        }
    },
    'color2': {
        floatingButton: {
            backgroundColor: '#ffffff',
            borderColor: 'rgba(16, 185, 129, 0.15)', // green-500 with 15% opacity
            borderWidth: '0.5px',
            shadow: '0 4px 6px -1px rgba(16, 185, 129, 0.1), 0 2px 4px -1px rgba(16, 185, 129, 0.06)'
        },
        headerButton: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: '0'
        }
    },
    'prince': {
        floatingButton: {
            backgroundColor: '#fef3c7', // amber-100
            borderColor: 'rgba(245, 158, 11, 0.25)', // amber-500 with 25% opacity
            borderWidth: '0.5px',
            shadow: '0 4px 6px -1px rgba(245, 158, 11, 0.1), 0 2px 4px -1px rgba(245, 158, 11, 0.06)'
        },
        headerButton: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: '0'
        }
    }
};

/**
 * UI 图标服务类
 */
class UIIconService {
    private currentTheme: UIIconTheme = 'default';
    private readonly STORAGE_KEY = 'lumostime_ui_icon_theme';

    constructor() {
        this.loadTheme();
    }

    /**
     * 加载当前主题
     */
    private loadTheme() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved && UI_ICON_THEMES.includes(saved as UIIconTheme)) {
            this.currentTheme = saved as UIIconTheme;
        }
    }

    /**
     * 获取当前主题
     */
    getCurrentTheme(): UIIconTheme {
        return this.currentTheme;
    }

    /**
     * 设置主题
     */
    setTheme(theme: UIIconTheme) {
        this.currentTheme = theme;
        localStorage.setItem(this.STORAGE_KEY, theme);
        // 触发主题变更事件
        window.dispatchEvent(new CustomEvent('ui-icon-theme-changed', { detail: { theme } }));
    }

    /**
     * 获取图标路径
     * @param iconType 图标类型
     * @param format 图片格式，默认 'webp'，调试时可用 'png'
     * @returns 图标路径
     */
    getIconPath(iconType: UIIconType, format: 'png' | 'webp' = 'webp'): string {
        // 如果是默认主题，返回空字符串（使用原有的 Lucide 图标）
        if (this.currentTheme === 'default') {
            return '';
        }

        const iconNumber = ICON_NUMBER_MAP[iconType];
        return `/uiicon/${this.currentTheme}/${iconNumber}.${format}`;
    }

    /**
     * 获取图标路径（带降级支持）
     * 优先使用 WebP，如果加载失败则降级到 PNG
     * @param iconType 图标类型
     * @returns { primary: string, fallback: string }
     */
    getIconPathWithFallback(iconType: UIIconType): { primary: string; fallback: string } {
        if (this.currentTheme === 'default') {
            return { primary: '', fallback: '' };
        }

        const iconNumber = ICON_NUMBER_MAP[iconType];
        return {
            primary: `/uiicon/${this.currentTheme}/${iconNumber}.webp`,
            fallback: `/uiicon/${this.currentTheme}/${iconNumber}.png`
        };
    }

    /**
     * 检查是否使用自定义主题
     */
    isCustomTheme(): boolean {
        return this.currentTheme !== 'default';
    }

    /**
     * 获取当前主题的样式配置
     */
    getThemeStyles(): ThemeStyleConfig {
        return THEME_STYLES[this.currentTheme] || {};
    }

    /**
     * 获取悬浮按钮样式
     */
    getFloatingButtonStyle(): React.CSSProperties {
        const styles = this.getThemeStyles();
        if (!styles.floatingButton) return {};

        return {
            backgroundColor: styles.floatingButton.backgroundColor,
            borderColor: styles.floatingButton.borderColor,
            borderWidth: styles.floatingButton.borderWidth,
            borderStyle: styles.floatingButton.borderWidth ? 'solid' : undefined,
            boxShadow: styles.floatingButton.shadow
        };
    }

    /**
     * 获取顶部栏按钮样式
     */
    getHeaderButtonStyle(): React.CSSProperties {
        const styles = this.getThemeStyles();
        if (!styles.headerButton) return {};

        return {
            backgroundColor: styles.headerButton.backgroundColor,
            borderColor: styles.headerButton.borderColor,
            borderWidth: styles.headerButton.borderWidth,
            borderStyle: styles.headerButton.borderWidth && styles.headerButton.borderWidth !== '0' ? 'solid' : undefined
        };
    }
}

// 导出单例
export const uiIconService = new UIIconService();

/**
 * React Hook - 获取 UI 图标路径
 */
export const useUIIcon = (iconType: UIIconType) => {
    const theme = uiIconService.getCurrentTheme();
    const isCustom = theme !== 'default';
    const paths = uiIconService.getIconPathWithFallback(iconType);

    return {
        isCustomTheme: isCustom,
        iconPath: paths.primary,
        fallbackPath: paths.fallback,
        theme
    };
};

/**
 * React Hook - 检测当前是否使用自定义主题
 */
export const useIsCustomTheme = () => {
    const [isCustom, setIsCustom] = React.useState(uiIconService.isCustomTheme());

    React.useEffect(() => {
        const handleThemeChange = () => {
            setIsCustom(uiIconService.isCustomTheme());
        };

        window.addEventListener('ui-icon-theme-changed', handleThemeChange);
        return () => {
            window.removeEventListener('ui-icon-theme-changed', handleThemeChange);
        };
    }, []);

    return isCustom;
};

/**
 * React Hook - 获取主题样式
 */
export const useThemeStyles = () => {
    const [styles, setStyles] = React.useState(uiIconService.getThemeStyles());

    React.useEffect(() => {
        const handleThemeChange = () => {
            setStyles(uiIconService.getThemeStyles());
        };

        window.addEventListener('ui-icon-theme-changed', handleThemeChange);
        return () => {
            window.removeEventListener('ui-icon-theme-changed', handleThemeChange);
        };
    }, []);

    return styles;
};

/**
 * React Hook - 获取悬浮按钮样式
 */
export const useFloatingButtonStyle = () => {
    const [style, setStyle] = React.useState(uiIconService.getFloatingButtonStyle());

    React.useEffect(() => {
        const handleThemeChange = () => {
            setStyle(uiIconService.getFloatingButtonStyle());
        };

        window.addEventListener('ui-icon-theme-changed', handleThemeChange);
        return () => {
            window.removeEventListener('ui-icon-theme-changed', handleThemeChange);
        };
    }, []);

    return style;
};
