/**
 * @file uiIconService.ts
 * @description UI 图标主题服务 - 管理应用内所有 UI 图标的主题切换
 * 
 * ## 图标系统说明
 * 
 * ### 图标分组 (共80个图标)
 * - **Group 1 (1-16)**: 核心功能图标 - 同步、设置、管理、日历等应用核心功能
 * - **Group 2 (17-32)**: 日常生活图标 - 首页、睡眠、通勤、用餐等日常活动
 * - **Group 3 (33-48)**: 学习工作图标 - 学习、会议、编程、论文等工作学习相关
 * - **Group 4 (49-64)**: 娱乐社交图标 - 探索、社交、游戏、旅行等娱乐活动
 * - **Group 5 (65-80)**: 个人成长图标 - 自我、思考、锻炼、冥想等个人发展
 * 
 * ### 主题系统
 * - 支持多套视觉风格主题 (default, purple, color, color2, prince, cat, forest, plant)
 * - 每个主题包含完整的80个图标
 * - 图标文件格式: `/uiicon/{theme}/{编号}.webp` (带PNG降级)
 * - 编号格式: 01-80 (两位数字，前导零)
 * 
 * ### 使用方式
 * ```typescript
 * // 获取图标路径
 * const iconPath = uiIconService.getIconPath('sync');
 * 
 * // 切换主题
 * uiIconService.setTheme('cat');
 * 
 * // 获取图标中文标签
 * const label = uiIconService.getIconLabel('sync'); // "同步"
 * 
 * // 按分组获取图标
 * const dailyIcons = uiIconService.getIconsByGroup('daily');
 * ```
 */

import React from 'react';

// UI 图标类型定义
export type UIIconType =
    // Group 1: 核心功能图标 (1-16)
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
    | 'data-view'      // 16. 数据视图
    // Group 2: 日常生活图标 (17-32)
    | 'home'           // 17. 首页/家
    | 'sleep'          // 18. 睡眠
    | 'commute'        // 19. 通勤
    | 'meal'           // 20. 用餐
    | 'housework'      // 21. 家务
    | 'hygiene'        // 22. 卫生
    | 'shopping'       // 23. 购物
    | 'chores'         // 24. 杂务
    | 'medical'        // 25. 医疗
    | 'haircut'        // 26. 理发
    | 'cooking'        // 27. 烹饪
    | 'pet'            // 28. 宠物
    | 'walk'           // 29. 散步
    | 'nap'            // 30. 小憩
    | 'water'          // 31. 喝水
    | 'weather'        // 32. 天气
    // Group 3: 学习工作图标 (33-48)
    | 'study'          // 33. 学习
    | 'meeting'        // 34. 会议
    | 'laptop'         // 35. 笔记本电脑
    | 'book'           // 36. 书籍
    | 'code'           // 37. 编程
    | 'thesis'         // 38. 论文
    | 'language'       // 39. 语言
    | 'money'          // 40. 金钱
    | 'wallet'         // 41. 钱包
    | 'folder'         // 42. 文件夹
    | 'tools'          // 43. 工具
    | 'input'          // 44. 输入/信号
    | 'phd'            // 45. 博士/学术
    | 'wisdom'         // 46. 智慧
    | 'ai'             // 47. 人工智能
    | 'briefcase'      // 48. 公文包
    // Group 4: 娱乐社交图标 (49-64)
    | 'explore'        // 49. 探索
    | 'love'           // 50. 爱/喜欢
    | 'handshake'      // 51. 握手
    | 'social'         // 52. 社交
    | 'chat'           // 53. 聊天
    | 'surf'           // 54. 上网
    | 'watch'          // 55. 观看
    | 'game'           // 56. 游戏
    | 'mystery'        // 57. 神秘
    | 'design'         // 58. 设计
    | 'music'          // 59. 音乐
    | 'craft'          // 60. 手工
    | 'brush'          // 61. 书法
    | 'travel'         // 62. 旅行
    | 'photo'          // 63. 摄影
    | 'movie'          // 64. 电影
    // Group 5: 个人成长与系统图标 (65-80)
    | 'self'           // 65. 自我
    | 'think'          // 66. 思考
    | 'workout'        // 67. 锻炼
    | 'meditation'     // 68. 冥想
    | 'piano'          // 69. 钢琴
    | 'art'            // 70. 艺术
    | 'volunteer'      // 71. 志愿
    | 'novel'          // 72. 小说
    | 'search'         // 73. 搜索
    | 'user'           // 74. 用户
    | 'location'       // 75. 位置
    | 'bell'           // 76. 通知
    | 'trash'          // 77. 删除
    | 'lock'           // 78. 锁定
    | 'star'           // 79. 星标
    | 'share';         // 80. 分享

// 图标编号映射（对应文件名）
const ICON_NUMBER_MAP: Record<UIIconType, string> = {
    // Group 1: 核心功能图标 (1-16)
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
    'data-view': '16',
    // Group 2: 日常生活图标 (17-32)
    'home': '17',
    'sleep': '18',
    'commute': '19',
    'meal': '20',
    'housework': '21',
    'hygiene': '22',
    'shopping': '23',
    'chores': '24',
    'medical': '25',
    'haircut': '26',
    'cooking': '27',
    'pet': '28',
    'walk': '29',
    'nap': '30',
    'water': '31',
    'weather': '32',
    // Group 3: 学习工作图标 (33-48)
    'study': '33',
    'meeting': '34',
    'laptop': '35',
    'book': '36',
    'code': '37',
    'thesis': '38',
    'language': '39',
    'money': '40',
    'wallet': '41',
    'folder': '42',
    'tools': '43',
    'input': '44',
    'phd': '45',
    'wisdom': '46',
    'ai': '47',
    'briefcase': '48',
    // Group 4: 娱乐社交图标 (49-64)
    'explore': '49',
    'love': '50',
    'handshake': '51',
    'social': '52',
    'chat': '53',
    'surf': '54',
    'watch': '55',
    'game': '56',
    'mystery': '57',
    'design': '58',
    'music': '59',
    'craft': '60',
    'brush': '61',
    'travel': '62',
    'photo': '63',
    'movie': '64',
    // Group 5: 个人成长与系统图标 (65-80)
    'self': '65',
    'think': '66',
    'workout': '67',
    'meditation': '68',
    'piano': '69',
    'art': '70',
    'volunteer': '71',
    'novel': '72',
    'search': '73',
    'user': '74',
    'location': '75',
    'bell': '76',
    'trash': '77',
    'lock': '78',
    'star': '79',
    'share': '80'
};

// 可用的主题列表
export const UI_ICON_THEMES = ['default', 'purple', 'color', 'prince', 'cat', 'forest', 'plant', 'water'] as const;
export type UIIconTheme = typeof UI_ICON_THEMES[number];

// 图标分组定义
export const ICON_GROUPS = {
    core: {
        name: '功能',
        range: [1, 16],
        icons: [
            'sync', 'settings', 'manage', 'calendar', 'add-record', 'timer', 'ai-assist', 'tags',
            'scope', 'chronicle', 'memoir', 'reading', 'editing', 'sort-asc', 'sort-desc', 'data-view'
        ] as UIIconType[]
    },
    daily: {
        name: '生活',
        range: [17, 32],
        icons: [
            'home', 'sleep', 'commute', 'meal', 'housework', 'hygiene', 'shopping', 'chores',
            'medical', 'haircut', 'cooking', 'pet', 'walk', 'nap', 'water', 'weather'
        ] as UIIconType[]
    },
    work: {
        name: '工作',
        range: [33, 48],
        icons: [
            'study', 'meeting', 'laptop', 'book', 'code', 'thesis', 'language', 'money',
            'wallet', 'folder', 'tools', 'input', 'phd', 'wisdom', 'ai', 'briefcase'
        ] as UIIconType[]
    },
    entertainment: {
        name: '社交',
        range: [49, 64],
        icons: [
            'explore', 'love', 'handshake', 'social', 'chat', 'surf', 'watch', 'game',
            'mystery', 'design', 'music', 'craft', 'brush', 'travel', 'photo', 'movie'
        ] as UIIconType[]
    },
    personal: {
        name: '成长',
        range: [65, 80],
        icons: [
            'self', 'think', 'workout', 'meditation', 'piano', 'art', 'volunteer', 'novel',
            'search', 'user', 'location', 'bell', 'trash', 'lock', 'star', 'share'
        ] as UIIconType[]
    }
} as const;

// 图标中文名称映射（可选，用于显示）
export const ICON_LABELS: Record<UIIconType, string> = {
    // Group 1: 核心功能
    'sync': '同步', 'settings': '设置', 'manage': '管理', 'calendar': '日历',
    'add-record': '记录', 'timer': '计时', 'ai-assist': 'AI助手', 'tags': '标签',
    'scope': '领域', 'chronicle': '编年史', 'memoir': '回忆录', 'reading': '阅读',
    'editing': '编辑', 'sort-asc': '升序', 'sort-desc': '降序', 'data-view': '数据',
    // Group 2: 日常生活
    'home': '首页', 'sleep': '睡眠', 'commute': '通勤', 'meal': '用餐',
    'housework': '家务', 'hygiene': '卫生', 'shopping': '购物', 'chores': '杂务',
    'medical': '医疗', 'haircut': '理发', 'cooking': '烹饪', 'pet': '宠物',
    'walk': '散步', 'nap': '小憩', 'water': '喝水', 'weather': '天气',
    // Group 3: 学习工作
    'study': '学习', 'meeting': '会议', 'laptop': '电脑', 'book': '书籍',
    'code': '编程', 'thesis': '论文', 'language': '语言', 'money': '金钱',
    'wallet': '钱包', 'folder': '文件夹', 'tools': '工具', 'input': '输入',
    'phd': '博士', 'wisdom': '智慧', 'ai': 'AI', 'briefcase': '公文包',
    // Group 4: 娱乐社交
    'explore': '探索', 'love': '喜欢', 'handshake': '握手', 'social': '社交',
    'chat': '聊天', 'surf': '上网', 'watch': '观看', 'game': '游戏',
    'mystery': '神秘', 'design': '设计', 'music': '音乐', 'craft': '手工',
    'brush': '书法', 'travel': '旅行', 'photo': '摄影', 'movie': '电影',
    // Group 5: 个人成长
    'self': '自我', 'think': '思考', 'workout': '锻炼', 'meditation': '冥想',
    'piano': '钢琴', 'art': '艺术', 'volunteer': '志愿', 'novel': '小说',
    'search': '搜索', 'user': '用户', 'location': '位置', 'bell': '通知',
    'trash': '删除', 'lock': '锁定', 'star': '星标', 'share': '分享'
};

/**
 * 默认 Emoji 到 UIIconType 的映射表
 * 仅包含 constants.ts 中实际使用的 Emoji
 */
export const DEFAULT_EMOJI_TO_ICON_MAP: Record<string, UIIconType> = {
    // Categories (分类)
    '🏠': 'home',           // 生活
    '💤': 'sleep',          // 睡眠
    '🎓': 'study',          // 学习
    '🪞': 'self',           // 与自己
    '🤝': 'handshake',      // 与他人
    '🧭': 'explore',        // 探索世界
    '🎡': 'art',            // 爱欲再生产
    
    // Activities (标签)
    '🚇': 'commute',        // 通勤
    '🍱': 'meal',           // 饮食
    '🧹': 'housework',      // 家务
    '🚿': 'hygiene',        // 洗护
    '🛒': 'shopping',       // 购物
    '🧾': 'chores',         // 杂务
    '🛌': 'sleep',          // 睡觉
    '🔋': 'nap',            // 小憩
    '🏫': 'meeting',        // 上课开会
    '💻': 'laptop',         // 网课自学
    '📖': 'book',           // 书籍文献
    '👾': 'code',           // 代码编程
    '✒️': 'thesis',         // 论文写作
    '✒': 'thesis',          // 论文写作 (无变体选择器)
    '🧠': 'think',          // 日记复盘
    '🗂️': 'folder',        // 整理收集
    '🗂': 'folder',         // 整理收集 (无变体选择器)
    '⚙️': 'settings',       // 工具开发
    '⚙': 'settings',        // 工具开发 (无变体选择器)
    '🏃': 'workout',        // 运动健身
    '💰': 'money',          // 兼职工作
    '🕸️': 'social',        // 社会织网
    '🕸': 'social',         // 社会织网 (无变体选择器)
    '🎨': 'design',         // 设计
    '🎵': 'music',          // 音乐
    '🧶': 'craft',          // 手工
    '🖌️': 'brush',         // 书法
    '🖌': 'brush',          // 书法 (无变体选择器)
    '🍵': 'chat',           // 闲聊瞎扯
    '🏄': 'surf',           // 网上冲浪
    '🍿': 'watch',          // 看文看剧
    '🎮': 'game',           // 玩玩游戏
    '🔮': 'mystery',        // 不可名状
    
    // Scopes (领域)
    '🚩': 'phd',            // 专业输入
    '🏛️': 'phd',           // 博士课题
    '🏛': 'phd',            // 博士课题 (无变体选择器)
    '🦉': 'wisdom',         // 博雅通识
    '⚡️': 'ai',            // AI玩具
    '⚡': 'ai',             // AI玩具 (无变体选择器)
    
    // TodoCategories (待办分类)
    '📚': 'book',           // 学习计划
    
    // CheckTemplates (日课模板)
    '💧': 'water',          // 早起喝水
    '🛏️': 'sleep',         // 整理床铺
    '🛏': 'sleep',          // 整理床铺 (无变体选择器)
    '💊': 'medical',        // 吃维生素
    '🧘': 'meditation',     // 冥想
    '👔': 'shopping',       // 准备明天衣物
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
     * @param format 图片格式，默认 'png'（优先），降级为 'webp'
     * @returns 图标路径
     */
    getIconPath(iconType: UIIconType, format: 'png' | 'webp' = 'png'): string {
        // 如果是默认主题，返回空字符串（使用原有的 Emoji 图标）
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
     * 获取图标的中文标签
     */
    getIconLabel(iconType: UIIconType): string {
        return ICON_LABELS[iconType] || iconType;
    }

    /**
     * 获取图标所属的分组
     */
    getIconGroup(iconType: UIIconType): keyof typeof ICON_GROUPS | null {
        for (const [groupKey, group] of Object.entries(ICON_GROUPS)) {
            if (group.icons.includes(iconType)) {
                return groupKey as keyof typeof ICON_GROUPS;
            }
        }
        return null;
    }

    /**
     * 根据分组获取所有图标
     */
    getIconsByGroup(groupKey: keyof typeof ICON_GROUPS): UIIconType[] {
        return ICON_GROUPS[groupKey].icons;
    }

    /**
     * 获取所有图标类型
     */
    getAllIcons(): UIIconType[] {
        return Object.keys(ICON_NUMBER_MAP) as UIIconType[];
    }

    /**
     * 将 Emoji 转换为 UIIconType
     * @param emoji Emoji 字符
     * @returns UIIconType 或 null（如果没有映射）
     */
    emojiToIconType(emoji: string): UIIconType | null {
        // 移除 emoji 的变体选择器（如 ️）
        const cleanEmoji = emoji.replace(/\uFE0F/g, '');
        return DEFAULT_EMOJI_TO_ICON_MAP[cleanEmoji] || DEFAULT_EMOJI_TO_ICON_MAP[emoji] || null;
    }

    /**
     * 解析图标字符串
     * @param iconStr 图标字符串，可能是 "ui:iconType" 或普通 Emoji
     * @returns { isUIIcon: boolean, value: string }
     */
    parseIconString(iconStr: string): { isUIIcon: boolean; value: string } {
        if (iconStr.startsWith('ui:')) {
            return {
                isUIIcon: true,
                value: iconStr.substring(3) // 移除 "ui:" 前缀
            };
        }
        return {
            isUIIcon: false,
            value: iconStr
        };
    }

    /**
     * 将 Emoji 转换为 UI 图标格式字符串
     * @param emoji Emoji 字符
     * @returns "ui:iconType" 或原 Emoji（如果没有映射）
     */
    convertEmojiToUIIcon(emoji: string): string {
        const iconType = this.emojiToIconType(emoji);
        return iconType ? `ui:${iconType}` : emoji;
    }

    /**
     * 将 UI 图标格式字符串转换回 Emoji
     * @param uiIconStr UI 图标字符串（格式：ui:iconType）
     * @returns Emoji 字符或 '❓'（如果无法转换）
     */
    convertUIIconToEmoji(uiIconStr: string): string {
        // 如果不是 UI 图标格式，直接返回
        if (!uiIconStr.startsWith('ui:')) {
            return uiIconStr;
        }

        // 提取 iconType
        const iconType = uiIconStr.substring(3) as UIIconType;

        // 在映射表中查找对应的 Emoji
        for (const [emoji, type] of Object.entries(DEFAULT_EMOJI_TO_ICON_MAP)) {
            if (type === iconType) {
                return emoji;
            }
        }

        // 如果找不到对应的 Emoji，返回一个"待选择"的图标
        return '❓';
    }

    /**
     * 检查图标字符串是否为默认 Emoji（可以被替换）
     * @param iconStr 图标字符串
     * @returns boolean
     */
    isDefaultEmoji(iconStr: string): boolean {
        if (iconStr.startsWith('ui:')) {
            return false; // 已经是 UI 图标格式
        }
        return this.emojiToIconType(iconStr) !== null;
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
