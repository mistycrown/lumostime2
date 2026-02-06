/**
 * @file timePalConfig.ts
 * @description 时光小友配置 - 统一管理所有时光小友类型
 */

// 时光小友类型
export type TimePalType = 
    | 'cat' | 'dog' | 'rabbit' | 'monkey' | 'prince' | 'chibi' | 'girl'
    // 新增类型
    | 'buddist' | 'cat2' | 'dog2' | 'dog3' | 'Ghost' | 'girl2' | 'girl3' | 'girl4'
    | 'gui' | 'mouse' | 'panda' | 'pigen' | 'prince2' | 'rabbit2' | 'renzhe' | 'taoist' | 'zombis';

// 时光小友选项配置
export interface TimePalOption {
    type: TimePalType;
    name: string;
    preview: string;
    emoji: string;
}

// 所有可用的时光小友选项
export const TIMEPAL_OPTIONS: TimePalOption[] = [
    // 原有类型
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
    { 
        type: 'girl', 
        name: '女孩', 
        preview: '/time_pal_origin/girl/1.webp',
        emoji: '👧'
    },
    // 新增类型
    { 
        type: 'buddist', 
        name: '佛教', 
        preview: '/time_pal_origin/buddist/1.webp',
        emoji: '🧘'
    },
    { 
        type: 'cat2', 
        name: '猫咪2', 
        preview: '/time_pal_origin/cat2/1.webp',
        emoji: '🐱'
    },
    { 
        type: 'dog2', 
        name: '小狗2', 
        preview: '/time_pal_origin/dog2/1.webp',
        emoji: '🐕'
    },
    { 
        type: 'dog3', 
        name: '小狗3', 
        preview: '/time_pal_origin/dog3/1.webp',
        emoji: '🐕'
    },
    { 
        type: 'Ghost', 
        name: '幽灵', 
        preview: '/time_pal_origin/Ghost/1.webp',
        emoji: '👻'
    },
    { 
        type: 'girl2', 
        name: '女孩2', 
        preview: '/time_pal_origin/girl2/1.webp',
        emoji: '👧'
    },
    { 
        type: 'girl3', 
        name: '女孩3', 
        preview: '/time_pal_origin/girl3/1.webp',
        emoji: '👧'
    },
    { 
        type: 'girl4', 
        name: '女孩4', 
        preview: '/time_pal_origin/girl4/1.webp',
        emoji: '👧'
    },
    { 
        type: 'gui', 
        name: '鬼怪', 
        preview: '/time_pal_origin/gui/1.webp',
        emoji: '👹'
    },
    { 
        type: 'mouse', 
        name: '老鼠', 
        preview: '/time_pal_origin/mouse/1.webp',
        emoji: '🐭'
    },
    { 
        type: 'panda', 
        name: '熊猫', 
        preview: '/time_pal_origin/panda/1.webp',
        emoji: '🐼'
    },
    { 
        type: 'pigen', 
        name: '鸽子', 
        preview: '/time_pal_origin/pigen/1.webp',
        emoji: '🕊️'
    },
    { 
        type: 'prince2', 
        name: '小王子2', 
        preview: '/time_pal_origin/prince2/1.webp',
        emoji: '🤴'
    },
    { 
        type: 'rabbit2', 
        name: '兔子2', 
        preview: '/time_pal_origin/rabbit2/1.webp',
        emoji: '🐇'
    },
    { 
        type: 'renzhe', 
        name: '忍者', 
        preview: '/time_pal_origin/renzhe/1.webp',
        emoji: '🥷'
    },
    { 
        type: 'taoist', 
        name: '道士', 
        preview: '/time_pal_origin/taoist/1.webp',
        emoji: '🧙'
    },
    { 
        type: 'zombis', 
        name: '僵尸', 
        preview: '/time_pal_origin/zombis/1.webp',
        emoji: '🧟'
    },
];

// 获取时光小友图片路径
// 优先尝试 PNG 格式（调试用），如果不存在则使用 webp 格式
export const getTimePalImagePath = (type: TimePalType, level: number): string => {
    // 优先返回 PNG 路径，组件会自动处理降级
    return `/time_pal_origin/${type}/${level}.png`;
};

// 获取备用图片路径（webp 格式）
export const getTimePalImagePathFallback = (type: TimePalType, level: number): string => {
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
