/**
 * @file timePalConfig.ts
 * @description 时光小友配置 - 统一管理所有时光小友类型
 */

// 时光小友类型
export type TimePalType = 'cat' | 'dog' | 'rabbit' | 'monkey' | 'prince' | 'chibi';

// 时光小友选项配置
export interface TimePalOption {
    type: TimePalType;
    name: string;
    preview: string;
    emoji: string;
}

// 所有可用的时光小友选项
export const TIMEPAL_OPTIONS: TimePalOption[] = [
    { 
        type: 'cat', 
        name: '猫咪', 
        preview: '/time_pal_origin/cat/1.webp',
        emoji: '🐱'
    },
    { 
        type: 'dog', 
        name: '小狗', 
        preview: '/time_pal_origin/dog/1.webp',
        emoji: '🐶'
    },
    { 
        type: 'rabbit', 
        name: '兔子', 
        preview: '/time_pal_origin/rabbit/1.webp',
        emoji: '🐰'
    },
    { 
        type: 'monkey', 
        name: '猴子', 
        preview: '/time_pal_origin/monkey/1.webp',
        emoji: '🐵'
    },
    { 
        type: 'prince', 
        name: '小王子', 
        preview: '/time_pal_origin/prince/1.webp',
        emoji: '🤴'
    },
    { 
        type: 'chibi', 
        name: 'Q版', 
        preview: '/time_pal_origin/chibi/1.webp',
        emoji: '👧'
    },
];

// 获取时光小友图片路径
export const getTimePalImagePath = (type: TimePalType, level: number): string => {
    // 所有类型现在都使用统一的数字命名
    return `/time_pal_origin/${type}/${level}.webp`;
};

// 获取降级 emoji
export const getTimePalEmoji = (type: TimePalType): string => {
    const option = TIMEPAL_OPTIONS.find(opt => opt.type === type);
    return option?.emoji || '🐾';
};

// 获取所有类型列表（用于循环切换）
export const getAllTimePalTypes = (): TimePalType[] => {
    return TIMEPAL_OPTIONS.map(opt => opt.type);
};
