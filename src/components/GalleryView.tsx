/**
 * @file GalleryView.tsx
 * @description 画廊视图 - 以瀑布流方式展示所有带图片的记录
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Log, Category, DailyReview } from '../types';
import { ChevronLeft, Share2 } from 'lucide-react';
import { ToastType } from './Toast';
import { imageService } from '../services/imageService';
import { IconRenderer } from './IconRenderer';
import { ImagePreviewModal } from './ImagePreviewModal';
import { GalleryExportView } from './GalleryExportView';

interface GalleryViewProps {
    logs: Log[];
    categories: Category[];
    dailyReviews?: DailyReview[];
    onClose: () => void;
    onEditLog: (log: Log) => void;
    refreshKey?: number;
    onToast?: (type: ToastType, message: string) => void;
}

interface GalleryItem {
    log: Log;
    image: string;
    categoryName?: string;
    categoryIcon?: string;
    categoryUiIcon?: string;
    categoryColor?: string;
    activityName?: string;
    activityIcon?: string;
    activityUiIcon?: string;
}

// 图片组件 - 优化：使用缩略图 + 懒加载
const GalleryImage: React.FC<{ 
    filename: string; 
    refreshKey?: number;
}> = ({ filename, refreshKey = 0 }) => {
    const [src, setSrc] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const imgRef = useRef<HTMLDivElement>(null);
    const [isInView, setIsInView] = useState(false);

    // 懒加载：使用 IntersectionObserver
    useEffect(() => {
        if (!imgRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.disconnect();
                    }
                });
            },
            {
                rootMargin: '200px', // 提前200px开始加载
            }
        );

        observer.observe(imgRef.current);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isInView) return;

        const loadImage = async () => {
            try {
                setIsLoading(true);
                // 优化：使用缩略图而不是原图
                const url = await imageService.getImageUrl(filename, 'thumbnail');
                if (url) {
                    setSrc(url);
                    setError('');
                } else {
                    setError('图片URL为空');
                }
            } catch (err: any) {
                console.error(`[GalleryImage] 加载图片失败: ${filename}`, err);
                setError(`加载失败: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        loadImage();
    }, [filename, refreshKey, isInView]);

    if (error) {
        return (
            <div ref={imgRef} className="w-full aspect-square bg-stone-50 flex items-center justify-center border border-stone-200">
                <span className="text-stone-300 text-xs font-serif">Image unavailable</span>
            </div>
        );
    }

    if (!isInView || isLoading || !src) {
        return (
            <div ref={imgRef} className="w-full aspect-square bg-stone-50 flex items-center justify-center border border-stone-200">
                {isInView && <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-400 rounded-full animate-spin" />}
            </div>
        );
    }

    return (
        <img
            ref={imgRef as any}
            src={src}
            alt="gallery"
            className="w-full object-cover border border-stone-200"
            loading="lazy"
            onError={() => setError('图片加载失败')}
        />
    );
};

export const GalleryView: React.FC<GalleryViewProps> = ({
    logs,
    categories,
    dailyReviews = [],
    onClose,
    onEditLog,
    refreshKey = 0,
    onToast
}) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [displayCount, setDisplayCount] = useState(12); // 优化：初始显示12张图片
    const LOAD_MORE_COUNT = 12; // 优化：每次加载12张
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [activeMonth, setActiveMonth] = useState<string | null>(null);
    const [showSidebar, setShowSidebar] = useState(false);
    const [showExportView, setShowExportView] = useState(false);

    // 提取所有带图片的记录
    const galleryItems = useMemo(() => {
        const items: GalleryItem[] = [];
        
        logs.forEach(log => {
            if (log.images && log.images.length > 0) {
                const category = categories.find(c => c.id === log.categoryId);
                const activity = category?.activities.find(a => a.id === log.activityId);
                
                log.images.forEach(image => {
                    items.push({
                        log,
                        image,
                        categoryName: category?.name,
                        categoryIcon: category?.icon,
                        categoryUiIcon: category?.uiIcon,
                        categoryColor: category?.themeColor,
                        activityName: activity?.name,
                        activityIcon: activity?.icon,
                        activityUiIcon: activity?.uiIcon
                    });
                });
            }
        });
        
        // 按时间倒序排列
        return items.sort((a, b) => b.log.startTime - a.log.startTime);
    }, [logs, categories]);

    // 当前显示的图片（根据 displayCount 截取）
    const visibleItems = useMemo(() => {
        return galleryItems.slice(0, displayCount);
    }, [galleryItems, displayCount]);

    // Note: 瀑布流分配在每个月份组内部完成，不需要全局状态

    // 按月份分组图片
    const monthGroups = useMemo(() => {
        const groups: { [key: string]: GalleryItem[] } = {};
        
        visibleItems.forEach(item => {
            const date = new Date(item.log.startTime);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!groups[monthKey]) {
                groups[monthKey] = [];
            }
            groups[monthKey].push(item);
        });
        
        // 按时间倒序排列月份
        return Object.keys(groups)
            .sort((a, b) => b.localeCompare(a))
            .map(monthKey => ({
                monthKey,
                items: groups[monthKey]
            }));
    }, [visibleItems]);

    // 提取所有月份用于导航
    const allMonths = useMemo(() => {
        const months: { monthKey: string; displayText: string }[] = [];
        
        galleryItems.forEach(item => {
            const date = new Date(item.log.startTime);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!months.find(m => m.monthKey === monthKey)) {
                const year = date.getFullYear();
                const month = date.getMonth() + 1;
                months.push({
                    monthKey,
                    displayText: String(month).padStart(2, '0')
                });
            }
        });
        
        // 按时间倒序排列
        return months.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    }, [galleryItems]);



    // 监听滚动
    useEffect(() => {
        const handleScroll = (e: Event) => {
            const target = e.target as HTMLElement;
            setIsScrolled(target.scrollTop > 10);

            // 检测是否接近底部，触发加载更多
            const scrollHeight = target.scrollHeight;
            const scrollTop = target.scrollTop;
            const clientHeight = target.clientHeight;
            
            // 当滚动到距离底部 500px 时，加载更多
            if (scrollHeight - scrollTop - clientHeight < 500) {
                if (displayCount < galleryItems.length) {
                    setDisplayCount(prev => Math.min(prev + LOAD_MORE_COUNT, galleryItems.length));
                }
            }

            // 检测当前可见的月份
            const monthElements = document.querySelectorAll('[data-month]');
            let currentMonth: string | null = null;
            
            monthElements.forEach(el => {
                const rect = el.getBoundingClientRect();
                // 如果元素在视口中间附近
                if (rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) {
                    currentMonth = el.getAttribute('data-month');
                }
            });
            
            if (currentMonth) {
                setActiveMonth(currentMonth);
            }

            // 显示/隐藏侧边栏
            setShowSidebar(scrollTop > 200);
        };

        const scrollContainer = document.getElementById('gallery-content');
        scrollContainer?.addEventListener('scroll', handleScroll);

        return () => {
            scrollContainer?.removeEventListener('scroll', handleScroll);
        };
    }, [displayCount, galleryItems.length]);

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${month}/${day} · ${hours}:${minutes}`;
    };

    return (
        <div className="fixed inset-0 bg-[#faf9f6] z-50 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {/* Sticky Header */}
            <header className={`sticky top-0 z-40 transition-all duration-300 ${isScrolled
                ? 'bg-[#faf9f6]/90 backdrop-blur-md shadow-sm h-12'
                : 'bg-[#faf9f6]/80 backdrop-blur-sm h-14'
                }`}>
                <div className="h-full flex items-center justify-between px-5">
                    <button
                        onClick={onClose}
                        className="p-2 text-stone-400 active:text-stone-600 transition-colors active:scale-95"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <h1 className={`font-serif text-stone-800 font-bold transition-all duration-300 ${isScrolled ? 'text-base' : 'text-lg'
                        }`}>
                        Gallery
                    </h1>
                    <button
                        onClick={() => setShowExportView(true)}
                        className="p-2 text-stone-400 active:text-stone-600 transition-colors active:scale-95"
                    >
                        <Share2 size={20} />
                    </button>
                </div>
            </header>

            {/* 瀑布流内容 */}
            <div id="gallery-content" className="flex-1 overflow-y-auto scrollbar-hide">
                {galleryItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full px-6">
                        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
                            <span className="text-2xl opacity-30">📷</span>
                        </div>
                        <p className="text-stone-400 text-sm font-serif italic">No images found</p>
                    </div>
                ) : (
                    <div className="px-5 py-6">
                        {/* 按月份分组渲染 */}
                        {monthGroups.map(({ monthKey, items }) => {
                            // 为每个月份分配左右两栏
                            const leftItems: GalleryItem[] = [];
                            const rightItems: GalleryItem[] = [];
                            
                            items.forEach((item, index) => {
                                if (index % 2 === 0) {
                                    leftItems.push(item);
                                } else {
                                    rightItems.push(item);
                                }
                            });

                            const date = new Date(items[0].log.startTime);
                            const month = date.getMonth() + 1;

                            return (
                                <div 
                                    key={monthKey} 
                                    id={`gallery-month-${monthKey}`}
                                    data-month={monthKey}
                                    className="mb-12"
                                >
                                    {/* 月份标题 */}
                                    <div className="mb-6 flex items-center gap-3">
                                        <h2 className="text-sm font-serif text-stone-400">
                                            {date.getFullYear()}年{month}月
                                        </h2>
                                        <div className="flex-1 h-px bg-stone-200"></div>
                                    </div>

                                    {/* 瀑布流网格 */}
                                    <div className="flex gap-4 max-w-4xl mx-auto">
                                        {/* 左栏 */}
                                        <div className="flex-1 space-y-6">
                                            {leftItems.map((item, index) => (
                                                <div
                                                    key={`${monthKey}-left-${item.log.id}-${item.image}-${index}`}
                                                    className="cursor-pointer"
                                                >
                                                    <div 
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const url = await imageService.getImageUrl(item.image, 'original');
                                                            if (url) setPreviewImage(url);
                                                        }}
                                                        className="active:opacity-70 transition-opacity"
                                                    >
                                                        <GalleryImage 
                                                            filename={item.image} 
                                                            refreshKey={refreshKey}
                                                        />
                                                    </div>
                                                    
                                                    {/* 卡片信息 - 点击进入编辑 */}
                                                    <div 
                                                        className="mt-3 space-y-2 active:opacity-70 transition-opacity"
                                                        onClick={() => onEditLog(item.log)}
                                                    >
                                                        {/* 第一行：日期 */}
                                                        <div className="text-[10px] text-stone-400 font-mono">
                                                            {formatTime(item.log.startTime)}
                                                        </div>
                                                        
                                                        {/* 第二行：标签（仅显示二级标签） */}
                                                        {item.activityName && (
                                                            <div className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded inline-flex items-center gap-1 bg-stone-50/30">
                                                                <span style={{ color: item.categoryColor }} className="font-bold">#</span>
                                                                <IconRenderer 
                                                                    icon={item.activityIcon || ''} 
                                                                    uiIcon={item.activityUiIcon}
                                                                    className="text-xs" 
                                                                />
                                                                <span>{item.activityName}</span>
                                                            </div>
                                                        )}

                                                        {/* 第三行：备注 */}
                                                        {item.log.note && (
                                                            <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed font-light">
                                                                {item.log.note}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* 右栏 */}
                                        <div className="flex-1 space-y-6">
                                            {rightItems.map((item, index) => (
                                                <div
                                                    key={`${monthKey}-right-${item.log.id}-${item.image}-${index}`}
                                                    className="cursor-pointer"
                                                >
                                                    <div 
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const url = await imageService.getImageUrl(item.image, 'original');
                                                            if (url) setPreviewImage(url);
                                                        }}
                                                        className="active:opacity-70 transition-opacity"
                                                    >
                                                        <GalleryImage 
                                                            filename={item.image} 
                                                            refreshKey={refreshKey}
                                                        />
                                                    </div>
                                                    
                                                    {/* 卡片信息 - 点击进入编辑 */}
                                                    <div 
                                                        className="mt-3 space-y-2 active:opacity-70 transition-opacity"
                                                        onClick={() => onEditLog(item.log)}
                                                    >
                                                        {/* 第一行：日期 */}
                                                        <div className="text-[10px] text-stone-400 font-mono">
                                                            {formatTime(item.log.startTime)}
                                                        </div>
                                                        
                                                        {/* 第二行：标签（仅显示二级标签） */}
                                                        {item.activityName && (
                                                            <div className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded inline-flex items-center gap-1 bg-stone-50/30">
                                                                <span style={{ color: item.categoryColor }} className="font-bold">#</span>
                                                                <IconRenderer 
                                                                    icon={item.activityIcon || ''} 
                                                                    uiIcon={item.activityUiIcon}
                                                                    className="text-xs" 
                                                                />
                                                                <span>{item.activityName}</span>
                                                            </div>
                                                        )}

                                                        {/* 第三行：备注 */}
                                                        {item.log.note && (
                                                            <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed font-light">
                                                                {item.log.note}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* End indicator */}
                        {displayCount >= galleryItems.length ? (
                            <div className="mt-16 mb-8 flex flex-col items-center justify-center gap-2 text-stone-300">
                                <div className="w-1 h-1 rounded-full bg-stone-300"></div>
                                <div className="w-1 h-1 rounded-full bg-stone-300"></div>
                                <div className="w-1 h-1 rounded-full bg-stone-300"></div>
                                <span className="text-xs font-serif italic mt-2">End of Gallery</span>
                            </div>
                        ) : (
                            <div className="mt-12 mb-8 flex flex-col items-center justify-center gap-3 text-stone-400">
                                <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-500 rounded-full animate-spin" />
                                <span className="text-xs font-serif">Loading more...</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 图片预览模态框 */}
            <ImagePreviewModal
                imageUrl={previewImage}
                onClose={() => setPreviewImage(null)}
            />

            {/* 月份导航侧边栏 */}
            {allMonths.length > 1 && (
                <div
                    className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-3 py-4 rounded-l-xl h-[216px] overflow-y-auto no-scrollbar scroll-smooth transition-opacity duration-300 ${showSidebar ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                    {allMonths.map(({ monthKey, displayText }) => {
                        const isActive = activeMonth === monthKey;
                        return (
                            <button
                                key={monthKey}
                                onClick={() => {
                                    const el = document.getElementById(`gallery-month-${monthKey}`);
                                    if (el) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }}
                                className="group relative flex items-center justify-center w-8 h-5 select-none touch-manipulation shrink-0"
                            >
                                <span className={`
                                    font-serif text-[10px] transition-all duration-300
                                    ${isActive
                                        ? 'text-stone-900 font-bold scale-150 origin-right'
                                        : 'text-stone-300 font-medium'}
                                `}>
                                    {displayText}
                                </span>
                                <div className={`
                                    absolute -left-1 w-1 h-1 rounded-full bg-stone-900 transition-all duration-300
                                    ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
                                `}></div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* 画廊导出视图 */}
            {showExportView && (
                <GalleryExportView
                    logs={logs}
                    dailyReviews={dailyReviews}
                    onBack={() => setShowExportView(false)}
                    onToast={onToast}
                />
            )}
        </div>
    );
};
