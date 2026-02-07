/**
 * @file uiIconService.ts
 * @description UI 图标主题服务 - 管理应用内所有 UI 图标的主题切换
 */

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
export const UI_ICON_THEMES = ['default', 'purple'] as const;
export type UIIconTheme = typeof UI_ICON_THEMES[number];

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
