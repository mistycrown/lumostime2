/**
 * @file DiaryComponents.tsx
 * @description 画廊导出的渲染组件 - 缩小版（适配手机屏幕）
 */
import React from 'react';
import { format } from 'date-fns';
import { Newspaper } from 'lucide-react';

// 类型定义
export interface DiaryEntry {
    id: string;
    date: Date;
    content: string;
    imageUrl?: string;
}

export type LayoutStyle = 'magazine' | 'minimal' | 'newspaper' | 'film';

export interface ColorTheme {
    id: string;
    name: string;
    colors: {
        paper: string;
        ink: string;
        inkLight: string;
        accent: string;
        border: string;
        highlight: string;
    };
}

// 字体类辅助函数
export const getFontClass = (style: LayoutStyle) => {
    switch (style) {
        case 'newspaper': return 'font-display';
        case 'film': return 'font-sans';
        case 'minimal': return 'font-sans';
        default: return 'font-serif';
    }
};

// DayCard 组件
interface DayCardProps {
    day: Date;
    heightClass: string;
    entry?: DiaryEntry;
    theme: ColorTheme;
    layoutStyle: LayoutStyle;
}

export const DayCard: React.FC<DayCardProps> = ({ day, heightClass, entry, theme, layoutStyle }) => {
    const hasImage = !!(entry && entry.imageUrl);
    const hasText = !!(entry && entry.content && entry.content.length > 0);
    const isEmpty = !entry;

    const isMinimal = layoutStyle === 'minimal';
    const isNewspaper = layoutStyle === 'newspaper';
    const isFilm = layoutStyle === 'film';

    // 1. Newspaper Renderer
    if (isNewspaper) {
        return (
            <div 
                className={`relative flex flex-col w-full overflow-hidden border-r border-b group p-1.5 ${heightClass}`}
                style={{ backgroundColor: theme.colors.paper, borderColor: theme.colors.ink }}
            >
                <div className="flex items-baseline justify-between border-b pb-0.5 mb-1" style={{ borderColor: theme.colors.ink }}>
                    <span className="font-display font-bold text-sm leading-none" style={{ color: theme.colors.ink }}>{format(day, 'd')}</span>
                    <span className="font-serif text-[8px] uppercase tracking-wider" style={{ color: theme.colors.inkLight }}>{format(day, 'EEE')}</span>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col gap-1">
                    {isEmpty && (
                        <div className="w-full h-full flex items-center justify-center opacity-10">
                            <Newspaper size={16} color={theme.colors.ink} />
                        </div>
                    )}
                    
                    {hasImage && (
                        <div className={`w-full ${hasText ? 'h-[72%]' : 'h-full'} relative overflow-hidden`}>
                            <img 
                                src={entry!.imageUrl} 
                                className="w-full h-full object-cover object-center" 
                                alt="" 
                                crossOrigin="anonymous"
                            />
                            <div 
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    backgroundColor: theme.colors.ink,
                                    opacity: 0.08,
                                    mixBlendMode: 'multiply'
                                }}
                            />
                        </div>
                    )}

                    {hasText && (
                        <div className={`${hasImage ? 'flex-1' : 'h-full'} overflow-hidden`}>
                            <p 
                                className={`font-serif text-[8px] leading-relaxed tracking-wide text-justify ${hasImage ? 'line-clamp-3' : ''}`} 
                                style={{ color: theme.colors.ink }}
                            >
                                {!hasImage && <span className="float-left text-lg font-display font-bold mr-1 leading-none mt-0.5" style={{ color: theme.colors.ink }}>{entry!.content.charAt(0)}</span>}
                                {entry!.content}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 2. Film Renderer
    if (isFilm) {
        return (
            <div 
                className={`relative flex flex-col w-full overflow-hidden group ${heightClass}`}
                style={{ backgroundColor: theme.colors.ink }}
            >
                <div 
                    className="h-2 w-full flex justify-between px-0.5 items-center border-b"
                    style={{ borderColor: theme.colors.inkLight, backgroundColor: 'rgba(0,0,0,0.2)' }}
                >
                    {Array.from({length: 8}).map((_, i) => (
                        <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: theme.colors.paper }}></div>
                    ))}
                </div>

                <div className="flex-1 relative flex flex-col min-h-0">
                    {isEmpty && (
                        <div className="w-full h-full flex items-center justify-center">
                            <span className="font-mono text-[8px] opacity-50" style={{ color: theme.colors.paper }}>NO SIGNAL</span>
                        </div>
                    )}

                    {hasImage && (
                        <div className={`relative w-full ${hasText ? 'h-[70%]' : 'h-full'} overflow-hidden`}>
                            <img src={entry!.imageUrl} className="w-full h-full object-cover object-center" alt="" crossOrigin="anonymous"/>
                            {!hasText && (
                                <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded font-mono text-[8px] shadow-sm" style={{ backgroundColor: theme.colors.ink, color: theme.colors.paper }}>
                                    REC {format(day, 'MM/dd')}
                                </div>
                            )}
                        </div>
                    )}

                    {hasText && (
                        <div 
                            className={`w-full ${hasImage ? 'h-[30%]' : 'h-full'} p-1 flex items-center justify-center text-center relative overflow-hidden`}
                            style={{ backgroundColor: theme.colors.ink }}
                        >
                            <div className="border border-white/20 p-0.5 w-full h-full flex items-center justify-center overflow-hidden" style={{ borderColor: theme.colors.inkLight }}>
                                <p className="font-sans text-[8px] leading-tight tracking-wider overflow-hidden" style={{ color: theme.colors.paper, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                                    {entry!.content}
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {(hasImage || hasText) && (
                        <div className="absolute top-1 left-1 text-[6px] font-mono tracking-widest uppercase opacity-60" style={{ color: theme.colors.paper }}>
                            SCENE {format(day, 'd')} / {format(day, 'EEE')}
                        </div>
                    )}
                </div>

                <div 
                    className="h-2 w-full flex justify-between px-0.5 items-center border-t"
                    style={{ borderColor: theme.colors.inkLight, backgroundColor: 'rgba(0,0,0,0.2)' }}
                >
                    {Array.from({length: 8}).map((_, i) => (
                        <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: theme.colors.paper }}></div>
                    ))}
                </div>
            </div>
        );
    }

    // 3. Minimal Renderer
    if (isMinimal) {
        return (
            <div 
                className={`relative flex flex-col w-full overflow-hidden rounded-lg group ${heightClass}`}
                style={{ backgroundColor: theme.colors.highlight }}
            >
                {isEmpty && (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: theme.colors.border }}></div>
                    </div>
                )}

                {hasImage && (
                    <div className="absolute inset-0 w-full h-full overflow-hidden">
                        <img src={entry!.imageUrl} className="w-full h-full object-cover object-center" alt="" crossOrigin="anonymous"/>
                        {hasText && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>}
                    </div>
                )}

                <div className={`relative z-10 w-full h-full flex flex-col justify-between p-2 ${hasImage && !hasText ? 'text-white' : ''}`}>
                    <div className="text-sm font-bold font-sans" style={{ color: hasImage ? '#fff' : theme.colors.ink }}>{format(day, 'd')}</div>
                    
                    {hasText && (
                        <div className="mt-auto">
                            <p className="text-[8px] font-sans leading-relaxed line-clamp-2" style={{ color: hasImage ? '#fff' : theme.colors.ink }}>
                                {entry!.content}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 4. Magazine Renderer (Default)
    return (
        <div 
            className={`relative flex flex-col w-full overflow-hidden border shadow-sm group ${heightClass}`}
            style={{ backgroundColor: theme.colors.highlight, borderColor: theme.colors.border }}
        >
            <div className="absolute top-0 left-0 bg-white/90 px-1.5 py-0.5 border-b border-r z-10" style={{ borderColor: theme.colors.border }}>
                <span className="font-serif font-bold text-sm" style={{ color: theme.colors.ink }}>{format(day, 'd')}</span>
            </div>

            <div className="flex flex-col h-full">
                {isEmpty && (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                        <div className="w-full h-px mx-4" style={{ backgroundColor: theme.colors.inkLight }}></div>
                    </div>
                )}

                {hasImage && (
                    <div className={`${hasText ? 'h-[70%]' : 'h-full'} w-full relative border-b overflow-hidden`} style={{ borderColor: theme.colors.border }}>
                        <img src={entry!.imageUrl} className="w-full h-full object-cover object-center grayscale-[10%] group-hover:grayscale-0 transition-all" alt="" crossOrigin="anonymous"/>
                    </div>
                )}

                {hasText && (
                    <div className={`flex-1 p-2 flex flex-col ${!hasImage ? 'justify-center' : ''} overflow-hidden`}>
                        <p className={`font-serif text-[8px] leading-relaxed tracking-wide opacity-90 text-justify ${hasImage ? 'line-clamp-3' : ''}`} style={{ color: theme.colors.ink }}>
                            {entry!.content}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
