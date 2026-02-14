/**
 * @file fontService.ts
 * @description 字体管理服务 - 管理应用字体切换和持久化
 */

export interface FontOption {
    id: string;
    name: string;
    displayName: string;
    description: string;
    fontFamily: string; // CSS font-family 值
    type: 'system' | 'custom'; // system: 系统默认, custom: 自定义字体
}

// 可用字体列表
const FONT_OPTIONS: FontOption[] = [
    {
        id: 'default',
        name: 'default',
        displayName: '默认',
        description: '',
        fontFamily: '"Noto Serif SC", serif',
        type: 'system'
    },
    {
        id: 'lxgw-wenkai',
        name: 'lxgw-wenkai',
        displayName: '霞鹜文楷',
        description: '',
        fontFamily: '"LXGW WenKai", "Noto Serif SC", serif',
        type: 'custom'
    },
    {
        id: 'lxgw-neo-zhisong',
        name: 'lxgw-neo-zhisong',
        displayName: '霞鹜新致宋',
        description: '',
        fontFamily: '"LXGW Neo ZhiSong", "Noto Serif SC", serif',
        type: 'custom'
    },
    {
        id: 'ding-lie-song',
        name: 'ding-lie-song',
        displayName: '鼎烈宋体',
        description: '',
        fontFamily: '"Ding Lie Song", "Noto Serif SC", serif',
        type: 'custom'
    },
    {
        id: 'zhuque-fangsong',
        name: 'zhuque-fangsong',
        displayName: '朱雀仿宋',
        description: '',
        fontFamily: '"Zhuque Fangsong", "Noto Serif SC", serif',
        type: 'custom'
    }
];

const STORAGE_KEY = 'lumostime_font_family';

class FontService {
    private currentFont: string = 'default';

    constructor() {
        this.loadCurrentFont();
    }

    /**
     * 加载当前字体设置
     */
    private loadCurrentFont() {
        const saved = localStorage.getItem(STORAGE_KEY);
        this.currentFont = saved || 'default';
        console.log('[FontService] 加载字体设置:', this.currentFont);
    }

    /**
     * 获取所有可用字体
     */
    getAllFonts(): FontOption[] {
        return FONT_OPTIONS;
    }

    /**
     * 获取当前字体
     */
    getCurrentFont(): string {
        return this.currentFont;
    }

    /**
     * 获取当前字体配置
     */
    getCurrentFontOption(): FontOption {
        return FONT_OPTIONS.find(f => f.id === this.currentFont) || FONT_OPTIONS[0];
    }

    /**
     * 设置字体
     */
    setFont(fontId: string): { success: boolean; message: string } {
        const font = FONT_OPTIONS.find(f => f.id === fontId);
        
        if (!font) {
            return {
                success: false,
                message: '字体不存在'
            };
        }

        try {
            // 保存到 localStorage
            localStorage.setItem(STORAGE_KEY, fontId);
            this.currentFont = fontId;

            // 应用字体到 body
            this.applyFont(font);

            console.log('[FontService] 字体已切换:', fontId);
            return {
                success: true,
                message: `已切换到 ${font.displayName}`
            };
        } catch (error) {
            console.error('[FontService] 切换字体失败:', error);
            return {
                success: false,
                message: '切换字体失败'
            };
        }
    }

    /**
     * 应用字体到页面
     */
    private applyFont(font: FontOption) {
        document.body.style.fontFamily = font.fontFamily;
        
        // 同时更新 CSS 变量（如果需要）
        document.documentElement.style.setProperty('--font-family', font.fontFamily);
    }

    /**
     * 初始化字体（在应用启动时调用）
     */
    initializeFont() {
        const currentFontOption = this.getCurrentFontOption();
        this.applyFont(currentFontOption);
        console.log('[FontService] 字体初始化完成:', currentFontOption.displayName);
    }
}

// 导出单例
export const fontService = new FontService();
