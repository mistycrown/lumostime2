/**
 * @file ColorSchemeSelector.tsx
 * @description 配色方案选择器组件
 */

import React from 'react';
import { Check } from 'lucide-react';

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

interface ColorSchemeSelectorProps {
    currentScheme: ColorScheme;
    onSchemeChange: (scheme: ColorScheme) => void;
}

// 配色方案配置
interface SchemeConfig {
    id: ColorScheme;
    name: string;
    category: string;
    bgGradient: string;
    mainColor: string;
    borderColor: string;
    ringColor: string;
}

const COLOR_SCHEMES: SchemeConfig[] = [
    // 默认
    {
        id: 'default',
        name: '默认',
        category: '经典',
        bgGradient: 'from-stone-100 to-stone-200',
        mainColor: '#1c1917',
        borderColor: '#e7e5e4',
        ringColor: '#78716c'
    },
    
    // 莫兰迪色系
    {
        id: 'morandi-purple',
        name: '莫兰迪紫',
        category: '莫兰迪',
        bgGradient: 'from-[#f7f5f9] to-[#f0ebf5]',
        mainColor: '#8b6fa8',
        borderColor: '#e8e3ed',
        ringColor: '#8b6fa8'
    },
    {
        id: 'morandi-blue',
        name: '莫兰迪蓝',
        category: '莫兰迪',
        bgGradient: 'from-[#f5f7f9] to-[#ebf0f5]',
        mainColor: '#6b8ca8',
        borderColor: '#e3e9ee',
        ringColor: '#6b8ca8'
    },
    {
        id: 'morandi-green',
        name: '莫兰迪绿',
        category: '莫兰迪',
        bgGradient: 'from-[#f6f8f5] to-[#edf2eb]',
        mainColor: '#7a9176',
        borderColor: '#e5ebe3',
        ringColor: '#7a9176'
    },
    {
        id: 'morandi-pink',
        name: '莫兰迪粉',
        category: '莫兰迪',
        bgGradient: 'from-[#faf7f8] to-[#f5eef1]',
        mainColor: '#b88595',
        borderColor: '#f0e8eb',
        ringColor: '#b88595'
    },
    {
        id: 'morandi-orange',
        name: '莫兰迪橙',
        category: '莫兰迪',
        bgGradient: 'from-[#faf8f6] to-[#f5f0eb]',
        mainColor: '#c89b7a',
        borderColor: '#f0ebe5',
        ringColor: '#c89b7a'
    },
    {
        id: 'morandi-gray',
        name: '莫兰迪灰',
        category: '莫兰迪',
        bgGradient: 'from-[#f7f7f7] to-[#f0f0f0]',
        mainColor: '#8a8a8a',
        borderColor: '#e8e8e8',
        ringColor: '#8a8a8a'
    },
    {
        id: 'morandi-yellow',
        name: '莫兰迪黄',
        category: '莫兰迪',
        bgGradient: 'from-[#faf9f5] to-[#f5f2eb]',
        mainColor: '#c9b577',
        borderColor: '#f0ede3',
        ringColor: '#c9b577'
    },
    {
        id: 'morandi-red',
        name: '莫兰迪红',
        category: '莫兰迪',
        bgGradient: 'from-[#faf7f7] to-[#f5eeee]',
        mainColor: '#b87d7d',
        borderColor: '#f0e8e8',
        ringColor: '#b87d7d'
    },
    {
        id: 'morandi-cyan',
        name: '莫兰迪青',
        category: '莫兰迪',
        bgGradient: 'from-[#f6f9f8] to-[#edf3f2]',
        mainColor: '#7aa8a0',
        borderColor: '#e5eeec',
        ringColor: '#7aa8a0'
    },
    {
        id: 'morandi-brown',
        name: '莫兰迪棕',
        category: '莫兰迪',
        bgGradient: 'from-[#f9f7f6] to-[#f3efeb]',
        mainColor: '#a08570',
        borderColor: '#ede9e5',
        ringColor: '#a08570'
    },
    {
        id: 'morandi-lavender',
        name: '薰衣草',
        category: '莫兰迪',
        bgGradient: 'from-[#f8f7fa] to-[#f2eff5]',
        mainColor: '#9d8fb8',
        borderColor: '#ebe8f0',
        ringColor: '#9d8fb8'
    },
    {
        id: 'morandi-peach',
        name: '莫兰迪桃',
        category: '莫兰迪',
        bgGradient: 'from-[#fdf9f8] to-[#f9f1ee]',
        mainColor: '#d4a59a',
        borderColor: '#f5ebe8',
        ringColor: '#d4a59a'
    },
    {
        id: 'morandi-olive',
        name: '橄榄绿',
        category: '莫兰迪',
        bgGradient: 'from-[#f7f8f6] to-[#f0f2ed]',
        mainColor: '#8d9177',
        borderColor: '#e9ebe5',
        ringColor: '#8d9177'
    },
    
    // 焦糖拿铁色系
    {
        id: 'latte-caramel',
        name: '焦糖拿铁',
        category: '风格',
        bgGradient: 'from-[#faf0e6] to-[#f5ebe0]',
        mainColor: '#d2b48c',
        borderColor: '#f0e6d8',
        ringColor: '#8b4513'
    },
    
    // 暗黑学院风
    {
        id: 'dark-academia',
        name: '学院风',
        category: '风格',
        bgGradient: 'from-[#f5f5dc] to-[#eeeec8]',
        mainColor: '#556b2f',
        borderColor: '#e8e8d0',
        ringColor: '#556b2f'
    },
    
    // 克莱因蓝/深海色系
    {
        id: 'klein-blue',
        name: '克莱因蓝',
        category: '风格',
        bgGradient: 'from-[#f0f8ff] to-[#e6f2ff]',
        mainColor: '#002fa7',
        borderColor: '#d6e9ff',
        ringColor: '#002fa7'
    },
    {
        id: 'midnight-ocean',
        name: '午夜深海',
        category: '风格',
        bgGradient: 'from-[#f0f4ff] to-[#e6edff]',
        mainColor: '#191970',
        borderColor: '#dce6ff',
        ringColor: '#191970'
    },
    
    // 胶片/复古电影色系
    {
        id: 'film-japanese',
        name: '日系胶片',
        category: '风格',
        bgGradient: 'from-[#f5f9f9] to-[#ebf3f3]',
        mainColor: '#5f9ea0',
        borderColor: '#e0eded',
        ringColor: '#5f9ea0'
    },
    {
        id: 'film-hongkong',
        name: '港风复古',
        category: '风格',
        bgGradient: 'from-[#f5f9f5] to-[#ebf3eb]',
        mainColor: '#006400',
        borderColor: '#e0ede0',
        ringColor: '#006400'
    },
    
    // 中国传统色系
    {
        id: 'dunhuang-moon',
        name: '月牙泉',
        category: '传统',
        bgGradient: 'from-[#f4f8fc] to-[#e8f1f9]',
        mainColor: '#5b9bd5',
        borderColor: '#deeaf6',
        ringColor: '#5b9bd5'
    },
    {
        id: 'dunhuang-feitian',
        name: '飞天',
        category: '传统',
        bgGradient: 'from-[#fdf9f4] to-[#faf3ea]',
        mainColor: '#d4a574',
        borderColor: '#f5ebe0',
        ringColor: '#d4a574'
    },
    {
        id: 'dunhuang-cinnabar',
        name: '朱砂',
        category: '传统',
        bgGradient: 'from-[#fef5f7] to-[#fceaef]',
        mainColor: '#c93756',
        borderColor: '#fde0e6',
        ringColor: '#c93756'
    },
    {
        id: 'chinese-red',
        name: '中国红',
        category: '传统',
        bgGradient: 'from-[#fef5f6] to-[#fceaed]',
        mainColor: '#dc143c',
        borderColor: '#fddfe4',
        ringColor: '#dc143c'
    },
    {
        id: 'blue-white-porcelain',
        name: '青花瓷',
        category: '传统',
        bgGradient: 'from-[#f4f7fb] to-[#e8eff7]',
        mainColor: '#4169a8',
        borderColor: '#dfe7f2',
        ringColor: '#4169a8'
    },
    {
        id: 'bamboo-green',
        name: '竹青',
        category: '传统',
        bgGradient: 'from-[#f5f9f6] to-[#eaf3ed]',
        mainColor: '#5a9367',
        borderColor: '#e0ede3',
        ringColor: '#5a9367'
    },
    {
        id: 'sky-blue',
        name: '霁青',
        category: '传统',
        bgGradient: 'from-[#f5f9fc] to-[#eaf3f9]',
        mainColor: '#5698c3',
        borderColor: '#e0eef6',
        ringColor: '#5698c3'
    },
    {
        id: 'rouge',
        name: '胭脂',
        category: '传统',
        bgGradient: 'from-[#fef6f9] to-[#fcedf3]',
        mainColor: '#e05d8c',
        borderColor: '#fde3ec',
        ringColor: '#e05d8c'
    }
];

/**
 * 配色方案选择器
 */
export const ColorSchemeSelector: React.FC<ColorSchemeSelectorProps> = ({
    currentScheme,
    onSchemeChange
}) => {
    // 按分类分组
    const categories = ['经典', '莫兰迪', '风格', '传统'];
    
    return (
        <div className="space-y-6">
            {categories.map(category => {
                const schemes = COLOR_SCHEMES.filter(s => s.category === category);
                if (schemes.length === 0) return null;
                
                return (
                    <div key={category}>
                        <h3 className="text-xs font-medium text-stone-400 mb-3 uppercase tracking-wider">
                            {category}
                        </h3>
                        {/* 使用 auto-fill 和 max-width 限制最大尺寸 */}
                        <div className="grid gap-2" style={{ 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
                            maxWidth: '100%'
                        }}>
                            {schemes.map(scheme => (
                                <button
                                    key={scheme.id}
                                    onClick={() => onSchemeChange(scheme.id)}
                                    className={`relative rounded-lg transition-all overflow-hidden ${
                                        currentScheme === scheme.id
                                            ? `ring-2`
                                            : 'ring-1 ring-stone-200 hover:ring-stone-300'
                                    }`}
                                    style={{ 
                                        aspectRatio: '1',
                                        maxWidth: '96px', // 限制最大宽度
                                        ...(currentScheme === scheme.id ? { 
                                            '--tw-ring-color': scheme.ringColor 
                                        } as any : {})
                                    }}
                                >
                                    <div className={`w-full h-full bg-gradient-to-br ${scheme.bgGradient} flex items-center justify-center`}>
                                        <div 
                                            className="w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center"
                                            style={{ borderColor: scheme.borderColor, borderWidth: '1px' }}
                                        >
                                            <div 
                                                className="w-4 h-4 rounded-full"
                                                style={{ backgroundColor: scheme.mainColor }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* 选中标记 */}
                                    {currentScheme === scheme.id && (
                                        <div 
                                            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-lg z-10"
                                            style={{ backgroundColor: scheme.mainColor }}
                                        >
                                            <Check size={12} className="text-white" />
                                        </div>
                                    )}
                                    
                                    {/* 名称标签 */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent py-1.5 px-2">
                                        <p className="text-[10px] font-medium text-white text-center leading-tight">
                                            {scheme.name}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
