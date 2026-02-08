/**
 * @file colorSchemeService.ts
 * @description 配色方案服务 - 管理应用的配色方案
 */

import React from 'react';

// 配色方案类型
export type ColorScheme = 
    | 'default' 
    // 莫兰迪色系
    | 'morandi-purple' 
    | 'morandi-blue' 
    | 'morandi-green' 
    | 'morandi-pink'
    | 'morandi-orange'
    | 'morandi-gray'
    | 'morandi-yellow'
    | 'morandi-red'
    | 'morandi-cyan'
    | 'morandi-brown'
    | 'morandi-lavender'
    | 'morandi-peach'
    | 'morandi-olive'
    // 焦糖拿铁色系
    | 'latte-caramel'
    // 暗黑学院风
    | 'dark-academia'
    // 克莱因蓝/深海色系
    | 'klein-blue'
    | 'midnight-ocean'
    // 胶片/复古电影色系
    | 'film-japanese'
    | 'film-hongkong'
    // 中国传统色系
    | 'dunhuang-moon'
    | 'dunhuang-feitian'
    | 'dunhuang-cinnabar'
    | 'chinese-red'
    | 'blue-white-porcelain'
    | 'bamboo-green'
    | 'sky-blue'
    | 'rouge';

// 配色方案样式配置
export interface ColorSchemeStyleConfig {
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
}

// 配色方案样式映射
const COLOR_SCHEME_STYLES: Record<ColorScheme, ColorSchemeStyleConfig> = {
    'default': {},
    'morandi-purple': {},
    'morandi-blue': {},
    'morandi-green': {},
    'morandi-pink': {},
    'morandi-orange': {},
    'morandi-gray': {},
    'morandi-yellow': {},
    'morandi-red': {},
    'morandi-cyan': {},
    'morandi-brown': {},
    'morandi-lavender': {},
    'morandi-peach': {},
    'morandi-olive': {},
    'latte-caramel': {},
    'dark-academia': {},
    'klein-blue': {},
    'midnight-ocean': {},
    'film-japanese': {},
    'film-hongkong': {},
    'dunhuang-moon': {},
    'dunhuang-feitian': {},
    'dunhuang-cinnabar': {},
    'chinese-red': {},
    'blue-white-porcelain': {},
    'bamboo-green': {},
    'sky-blue': {},
    'rouge': {}
};

/**
 * 配色方案服务类
 */
class ColorSchemeService {
    private currentScheme: ColorScheme = 'default';
    private readonly STORAGE_KEY = 'lumostime_color_scheme';

    constructor() {
        this.loadScheme();
        // 初始化时设置 HTML 属性
        document.documentElement.setAttribute('data-color-scheme', this.currentScheme);
    }

    /**
     * 加载当前配色方案
     */
    private loadScheme() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        const validSchemes: ColorScheme[] = ['default', 'morandi-purple', 'morandi-blue', 'morandi-green', 'morandi-pink'];
        if (saved && validSchemes.includes(saved as ColorScheme)) {
            this.currentScheme = saved as ColorScheme;
        }
    }

    /**
     * 获取当前配色方案
     */
    getCurrentScheme(): ColorScheme {
        return this.currentScheme;
    }

    /**
     * 设置配色方案
     */
    setScheme(scheme: ColorScheme) {
        this.currentScheme = scheme;
        localStorage.setItem(this.STORAGE_KEY, scheme);
        
        // 更新 HTML 的 data-color-scheme 属性
        document.documentElement.setAttribute('data-color-scheme', scheme);
        
        // 触发配色方案变更事件
        window.dispatchEvent(new CustomEvent('color-scheme-changed', { detail: { scheme } }));
    }

    /**
     * 获取当前配色方案的样式配置
     */
    getSchemeStyles(): ColorSchemeStyleConfig {
        return COLOR_SCHEME_STYLES[this.currentScheme] || {};
    }

    /**
     * 获取悬浮按钮样式
     */
    getFloatingButtonStyle(): React.CSSProperties {
        const styles = this.getSchemeStyles();
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
        const styles = this.getSchemeStyles();
        if (!styles.headerButton) return {};

        return {
            backgroundColor: styles.headerButton.backgroundColor,
            borderColor: styles.headerButton.borderColor,
            borderWidth: styles.headerButton.borderWidth,
            borderStyle: styles.headerButton.borderWidth && styles.headerButton.borderWidth !== '0' ? 'solid' : undefined
        };
    }

    /**
     * 检查是否使用自定义配色
     */
    isCustomScheme(): boolean {
        return this.currentScheme !== 'default';
    }
}

// 导出单例
export const colorSchemeService = new ColorSchemeService();

/**
 * React Hook - 获取悬浮按钮样式
 */
export const useFloatingButtonStyle = () => {
    const [style, setStyle] = React.useState(colorSchemeService.getFloatingButtonStyle());

    React.useEffect(() => {
        const handleSchemeChange = () => {
            setStyle(colorSchemeService.getFloatingButtonStyle());
        };

        window.addEventListener('color-scheme-changed', handleSchemeChange);
        return () => {
            window.removeEventListener('color-scheme-changed', handleSchemeChange);
        };
    }, []);

    return style;
};

/**
 * React Hook - 获取配色方案样式
 */
export const useColorSchemeStyles = () => {
    const [styles, setStyles] = React.useState(colorSchemeService.getSchemeStyles());

    React.useEffect(() => {
        const handleSchemeChange = () => {
            setStyles(colorSchemeService.getSchemeStyles());
        };

        window.addEventListener('color-scheme-changed', handleSchemeChange);
        return () => {
            window.removeEventListener('color-scheme-changed', handleSchemeChange);
        };
    }, []);

    return styles;
};
