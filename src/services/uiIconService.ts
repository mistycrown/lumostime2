/**
 * @file uiIconService.ts
 * @input Icon ID, Theme selection, Emoji for matching
 * @output Icon URLs, Icon metadata, Theme switching
 * @pos Service (UI Icon System)
 * @description UI 图标主题服务 - 管理应用内所有 UI 图标的主题切换
 * 
 * ## 图标系统说明
 * 
 * ### 图标分组 (共96个图标)
 * - **Group 1 (1-16)**: 核心功能图标 - 同步、设置、管理、日历等应用核心功能
 * - **Group 2 (17-40)**: 日常生活图标 - 首页、睡眠、通勤、用餐、咖啡、饮品、洗衣、园艺、家庭、约会、礼物、化妆等日常活动
 * - **Group 3 (41-59)**: 学习工作图标 - 学习、会议、编程、论文、汽车、电话、邮件等工作学习相关
 * - **Group 4 (60-78)**: 娱乐社交图标 - 探索、社交、游戏、旅行、账单、快递等娱乐活动
 * - **Group 5 (79-96)**: 个人成长图标 - 自我、思考、锻炼、冥想、瑜伽、游泳、骑行等个人发展
 * 
 * ### 主题系统
 * - 支持多套视觉风格主题 (default, purple, color, prince, cat, forest, plant, water)
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 * - 每个主题包含完整的96个图标
 * - 图标文件格式: `/uiicon/{theme}/{编号}.webp` (带PNG降级)
 * - 编号格式: 01-96 (两位数字，前导零)
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
    // Group 2: 日常生活图标 (17-40)
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
    | 'coffee'         // 33. 咖啡
    | 'drink'          // 34. 饮品
    | 'laundry'        // 35. 洗衣
    | 'gardening'      // 36. 园艺
    | 'family'         // 37. 家庭
    | 'date'           // 38. 约会
    | 'gift'           // 39. 礼物
    | 'makeup'         // 40. 化妆
    // Group 3: 学习工作图标 (41-59)
    | 'study'          // 41. 学习
    | 'meeting'        // 42. 会议
    | 'laptop'         // 43. 笔记本电脑
    | 'book'           // 44. 书籍
    | 'code'           // 45. 编程
    | 'thesis'         // 46. 论文
    | 'language'       // 47. 语言
    | 'money'          // 48. 金钱
    | 'wallet'         // 49. 钱包
    | 'folder'         // 50. 文件夹
    | 'tools'          // 51. 工具
    | 'input'          // 52. 输入/信号
    | 'phd'            // 53. 博士/学术
    | 'wisdom'         // 54. 智慧
    | 'ai'             // 55. 人工智能
    | 'briefcase'      // 56. 公文包
    | 'car'            // 57. 汽车
    | 'call'           // 58. 电话
    | 'email'          // 59. 邮件
    // Group 4: 娱乐社交图标 (60-78)
    | 'explore'        // 60. 探索
    | 'love'           // 61. 爱/喜欢
    | 'handshake'      // 62. 握手
    | 'social'         // 63. 社交
    | 'chat'           // 64. 聊天
    | 'surf'           // 65. 上网
    | 'watch'          // 66. 观看
    | 'game'           // 67. 游戏
    | 'mystery'        // 68. 神秘
    | 'design'         // 69. 设计
    | 'music'          // 70. 音乐
    | 'craft'          // 71. 手工
    | 'brush'          // 72. 书法
    | 'travel'         // 73. 旅行
    | 'photo'          // 74. 摄影
    | 'movie'          // 75. 电影
    | 'bill'           // 76. 账单
    | 'delivery'       // 77. 快递
    | 'novel'          // 78. 小说
    // Group 5: 个人成长与系统图标 (79-96)
    | 'self'           // 79. 自我
    | 'think'          // 80. 思考
    | 'workout'        // 81. 锻炼
    | 'meditation'     // 82. 冥想
    | 'piano'          // 83. 钢琴
    | 'art'            // 84. 艺术
    | 'volunteer'      // 85. 志愿
    | 'yoga'           // 86. 瑜伽
    | 'swim'           // 87. 游泳
    | 'cycling'        // 88. 骑行
    | 'search'         // 89. 搜索
    | 'user'           // 90. 用户
    | 'location'       // 91. 位置
    | 'bell'           // 92. 通知
    | 'trash'          // 93. 删除
    | 'lock'           // 94. 锁定
    | 'star'           // 95. 星标
    | 'share';         // 96. 分享

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
    // Group 2: 日常生活图标 (17-40)
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
    'coffee': '33',
    'drink': '34',
    'laundry': '35',
    'gardening': '36',
    'family': '37',
    'date': '38',
    'gift': '39',
    'makeup': '40',
    // Group 3: 学习工作图标 (41-59)
    'study': '41',
    'meeting': '42',
    'laptop': '43',
    'book': '44',
    'code': '45',
    'thesis': '46',
    'language': '47',
    'money': '48',
    'wallet': '49',
    'folder': '50',
    'tools': '51',
    'input': '52',
    'phd': '53',
    'wisdom': '54',
    'ai': '55',
    'briefcase': '56',
    'car': '57',
    'call': '58',
    'email': '59',
    // Group 4: 娱乐社交图标 (60-78)
    'explore': '60',
    'love': '61',
    'handshake': '62',
    'social': '63',
    'chat': '64',
    'surf': '65',
    'watch': '66',
    'game': '67',
    'mystery': '68',
    'design': '69',
    'music': '70',
    'craft': '71',
    'brush': '72',
    'travel': '73',
    'photo': '74',
    'movie': '75',
    'bill': '76',
    'delivery': '77',
    'novel': '78',
    // Group 5: 个人成长与系统图标 (79-96)
    'self': '79',
    'think': '80',
    'workout': '81',
    'meditation': '82',
    'piano': '83',
    'art': '84',
    'volunteer': '85',
    'yoga': '86',
    'swim': '87',
    'cycling': '88',
    'search': '89',
    'user': '90',
    'location': '91',
    'bell': '92',
    'trash': '93',
    'lock': '94',
    'star': '95',
    'share': '96'
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
        range: [17, 40],
        icons: [
            'home', 'sleep', 'commute', 'meal', 'housework', 'hygiene', 'shopping', 'chores',
            'medical', 'haircut', 'cooking', 'pet', 'walk', 'nap', 'water', 'weather',
            'coffee', 'drink', 'laundry', 'gardening', 'family', 'date', 'gift', 'makeup'
        ] as UIIconType[]
    },
    work: {
        name: '工作',
        range: [41, 59],
        icons: [
            'study', 'meeting', 'laptop', 'book', 'code', 'thesis', 'language', 'money',
            'wallet', 'folder', 'tools', 'input', 'phd', 'wisdom', 'ai', 'briefcase',
            'car', 'call', 'email'
        ] as UIIconType[]
    },
    entertainment: {
        name: '社交',
        range: [60, 78],
        icons: [
            'explore', 'love', 'handshake', 'social', 'chat', 'surf', 'watch', 'game',
            'mystery', 'design', 'music', 'craft', 'brush', 'travel', 'photo', 'movie',
            'bill', 'delivery', 'novel'
        ] as UIIconType[]
    },
    personal: {
        name: '成长',
        range: [79, 96],
        icons: [
            'self', 'think', 'workout', 'meditation', 'piano', 'art', 'volunteer',
            'yoga', 'swim', 'cycling',
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
    'coffee': '咖啡', 'drink': '饮品', 'laundry': '洗衣', 'gardening': '园艺',
    'family': '家庭', 'date': '约会', 'gift': '礼物', 'makeup': '化妆',
    // Group 3: 学习工作
    'study': '学习', 'meeting': '会议', 'laptop': '电脑', 'book': '书籍',
    'code': '编程', 'thesis': '论文', 'language': '语言', 'money': '金钱',
    'wallet': '钱包', 'folder': '文件夹', 'tools': '工具', 'input': '输入',
    'phd': '博士', 'wisdom': '智慧', 'ai': 'AI', 'briefcase': '公文包',
    'car': '汽车', 'call': '电话', 'email': '邮件',
    // Group 4: 娱乐社交
    'explore': '探索', 'love': '喜欢', 'handshake': '握手', 'social': '社交',
    'chat': '聊天', 'surf': '上网', 'watch': '观看', 'game': '游戏',
    'mystery': '神秘', 'design': '设计', 'music': '音乐', 'craft': '手工',
    'brush': '书法', 'travel': '旅行', 'photo': '摄影', 'movie': '电影',
    'bill': '账单', 'delivery': '快递', 'novel': '小说',
    // Group 5: 个人成长
    'self': '自我', 'think': '思考', 'workout': '锻炼', 'meditation': '冥想',
    'piano': '钢琴', 'art': '艺术', 'volunteer': '志愿',
    'yoga': '瑜伽', 'swim': '游泳', 'cycling': '骑行',
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
