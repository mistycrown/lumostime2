/**
 * @file GalleryExportView.tsx
 * @description 画廊导出视图 - 将画廊导出为美观的图片
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, Download, Palette, LayoutTemplate, Calendar, Loader2 } from 'lucide-react';
import { Log, Category, DailyReview } from '../types';

// Toast type definition
type ToastType = 'success' | 'error' | 'info';
import { 
    format, eachDayOfInterval, getYear,
    subWeeks, addWeeks, subMonths, addMonths, subYears, addYears
} from 'date-fns';
import * as htmlToImage from 'html-to-image';
import { WeekView, MonthView, YearView } from './GalleryExport/DiaryViews';
import { DiaryEntry } from './GalleryExport/DiaryComponents';
import { imageService } from '../services/imageService';

interface GalleryExportViewProps {
    logs: Log[];
    categories: Category[];
    dailyReviews?: DailyReview[];
    onBack: () => void;
    onToast?: (type: ToastType, message: string) => void;
}

// 数据类型定义
type TimePeriod = 'week' | 'month' | 'year';
type LayoutStyle = 'magazine' | 'minimal' | 'newspaper' | 'film';
type Orientation = 'portrait' | 'landscape';

interface ColorTheme {
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

// 主题颜色定义（完全参照示例）
const THEMES: ColorTheme[] = [
    {
        id: 'classic',
        name: '纯白',
        colors: {
            paper: '#fdfbf7',
            ink: '#2c2c2c',
            inkLight: '#888888',
            accent: '#e5e5e5',
            border: '#e5e5e5',
            highlight: '#ffffff'
        }
    },
    {
        id: 'morandi-haze',
        name: '莫兰迪雾兰',
        colors: {
            paper: '#F0F4F8',
            ink: '#485665',
            inkLight: '#8FA1B3',
            accent: '#B0C4DE',
            border: '#D9E2EC',
            highlight: '#FFFFFF'
        }
    },
    {
        id: 'morandi-olive',
        name: '莫兰迪青苔',
        colors: {
            paper: '#F2F3EE',
            ink: '#5C6356',
            inkLight: '#99A092',
            accent: '#BCC6B3',
            border: '#E1E6DE',
            highlight: '#FFFFFF'
        }
    },
    {
        id: 'morandi-clay',
        name: '莫兰迪陶土',
        colors: {
            paper: '#F9F6F2',
            ink: '#6B584F',
            inkLight: '#A69288',
            accent: '#D4C5BF',
            border: '#EBE3DE',
            highlight: '#FFFFFF'
        }
    },
    {
        id: 'cn-rouge',
        name: '胭脂',
        colors: {
            paper: '#FCF6F6',
            ink: '#5E1821',
            inkLight: '#A85A63',
            accent: '#D68990',
            border: '#F2D3D6',
            highlight: '#FFFFFF'
        }
    },
    {
        id: 'cn-bamboo',
        name: '竹青',
        colors: {
            paper: '#F5F9F5',
            ink: '#1A4032',
            inkLight: '#4F7565',
            accent: '#83AFA0',
            border: '#CFE6DE',
            highlight: '#FFFFFF'
        }
    },
    {
        id: 'cn-indigo',
        name: '黛蓝',
        colors: {
            paper: '#F4F6F9',
            ink: '#1C2C42',
            inkLight: '#4E607A',
            accent: '#7D92B0',
            border: '#D1DBE8',
            highlight: '#FFFFFF'
        }
    }
];

// 排版样式
const LAYOUT_STYLES: { key: LayoutStyle; label: string }[] = [
    { key: 'magazine', label: '杂志' },
    { key: 'minimal', label: '极简' },
    { key: 'newspaper', label: '报纸' },
    { key: 'film', label: '胶片' }
];

// 时间段
const TIME_PERIODS: { key: TimePeriod; label: string }[] = [
    { key: 'week', label: '周' },
    { key: 'month', label: '月' },
    { key: 'year', label: '年' }
];

export const GalleryExportView: React.FC<GalleryExportViewProps> = ({
    logs,
    dailyReviews = [],
    onBack,
    onToast
}) => {
    const [currentTheme, setCurrentTheme] = useState(THEMES[0]);
    const [currentLayout, setCurrentLayout] = useState<LayoutStyle>('magazine');
    const [currentPeriod, setCurrentPeriod] = useState<TimePeriod>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isExporting, setIsExporting] = useState(false);
    const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
    const [orientation, setOrientation] = useState<Orientation>('portrait');
    
    const exportRef = useRef<HTMLDivElement>(null);

    // 数据转换：从 logs 和 dailyReviews 提取数据
    const diaryEntries = useMemo(() => {
        const entries: DiaryEntry[] = [];
        const year = getYear(currentDate);
        
        // 获取该年所有日期
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);
        const allDays = eachDayOfInterval({ start: startDate, end: endDate });
        
        allDays.forEach(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            
            // 1. 查找该天的第一张图片
            const dayLogs = logs.filter(log => {
                const logDate = new Date(log.startTime);
                return format(logDate, 'yyyy-MM-dd') === dayStr;
            });
            
            let imageFilename: string | undefined;
            let content = '';
            let logWithImage: Log | undefined;
            
            // 找到第一张图片
            for (const log of dayLogs) {
                if (log.images && log.images.length > 0) {
                    imageFilename = log.images[0];
                    logWithImage = log;
                    break;
                }
            }
            
            // 2. 确定文字内容
            if (imageFilename && logWithImage?.note) {
                // 如果有图片，使用该图片对应的备注
                content = logWithImage.note;
            } else {
                // 如果没有图片，查找当天的"一句话总结"
                const review = dailyReviews.find(r => r.date === dayStr);
                if (review?.narrative) {
                    // 从叙事中提取一句话总结（通常是第一行或引用部分）
                    const lines = review.narrative.split('\n').filter(l => l.trim());
                    if (lines.length > 0) {
                        // 尝试提取引用部分（> 开头）或第一行
                        const quoteLine = lines.find(l => l.startsWith('>'));
                        content = quoteLine ? quoteLine.replace(/^>\s*/, '') : lines[0];
                    }
                }
            }
            
            // 只有当有图片或有内容时才添加条目
            if (imageFilename || content) {
                entries.push({
                    id: `entry-${dayStr}`,
                    date: day,
                    content: content || '',
                    imageUrl: imageFilename ? imageUrls.get(imageFilename) : undefined
                });
            }
        });
        
        return entries;
    }, [logs, dailyReviews, currentDate, imageUrls]);

    // 加载图片URL
    useEffect(() => {
        const loadImageUrls = async () => {
            const urlMap = new Map<string, string>();
            const imageFilenames = new Set<string>();
            
            // 收集所有需要的图片文件名
            logs.forEach(log => {
                if (log.images && log.images.length > 0) {
                    imageFilenames.add(log.images[0]);
                }
            });
            
            // 批量加载图片URL（使用缩略图以提高性能）
            for (const filename of imageFilenames) {
                try {
                    const url = await imageService.getImageUrl(filename, 'thumbnail');
                    if (url) {
                        urlMap.set(filename, url);
                    }
                } catch (error) {
                    console.error(`Failed to load image URL: ${filename}`, error);
                }
            }
            
            setImageUrls(urlMap);
        };
        
        loadImageUrls();
    }, [logs]);

    // 导航逻辑
    const handlePrev = () => {
        if (currentPeriod === 'week') setCurrentDate(d => subWeeks(d, 1));
        else if (currentPeriod === 'month') setCurrentDate(d => subMonths(d, 1));
        else setCurrentDate(d => subYears(d, 1));
    };

    const handleNext = () => {
        if (currentPeriod === 'week') setCurrentDate(d => addWeeks(d, 1));
        else if (currentPeriod === 'month') setCurrentDate(d => addMonths(d, 1));
        else setCurrentDate(d => addYears(d, 1));
    };

    // 将blob URL转换为base64 data URL
    const convertBlobUrlToDataUrl = async (blobUrl: string): Promise<string> => {
        try {
            const response = await fetch(blobUrl);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Failed to convert blob URL:', blobUrl, error);
            return '';
        }
    };

    const handleExport = async () => {
        if (exportRef.current && !isExporting) {
            setIsExporting(true);
            try {
                // 1. 将所有blob URL转换为base64 data URL
                const images = exportRef.current.querySelectorAll('img');
                const conversionPromises = Array.from(images).map(async (img) => {
                    if (img.src && img.src.startsWith('blob:')) {
                        const dataUrl = await convertBlobUrlToDataUrl(img.src);
                        if (dataUrl) {
                            img.src = dataUrl;
                        }
                    }
                });
                
                await Promise.all(conversionPromises);
                
                // 2. 等待所有图片加载完成
                const imageLoadPromises = Array.from(images).map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = () => {
                            console.warn('Image failed to load:', img.src);
                            resolve(); // 即使失败也继续
                        };
                        // 超时保护
                        setTimeout(resolve, 3000);
                    });
                });
                
                await Promise.all(imageLoadPromises);
                
                // 额外延迟确保渲染完成
                await new Promise(r => setTimeout(r, 200));

                const options = {
                    cacheBust: true,
                    pixelRatio: 2,
                    useCORS: true,
                    backgroundColor: currentTheme.colors.paper
                };

                let dataUrl: string;
                try {
                    dataUrl = await htmlToImage.toPng(exportRef.current, options);
                } catch (firstErr) {
                    console.warn("First export attempt failed, retrying with skipFonts...", firstErr);
                    try {
                        dataUrl = await htmlToImage.toPng(exportRef.current, { ...options, skipFonts: true });
                    } catch (secondErr) {
                        console.error("Second export attempt also failed:", secondErr);
                        throw new Error('图片导出失败，请重试');
                    }
                }
                
                const link = document.createElement('a');
                link.download = `gallery-${currentPeriod}-${format(currentDate, 'yyyy-MM-dd')}.png`;
                link.href = dataUrl;
                link.click();
                
                if (onToast) {
                    onToast('success', '图片已保存');
                }
            } catch (error) {
                console.error('Export failed:', error);
                if (onToast) {
                    onToast('error', '导出失败，请重试');
                }
            } finally {
                setIsExporting(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-[#faf9f6] flex flex-col text-slate-800 font-sans z-50">
            {/* Header - 标题栏 */}
            <div className="flex-shrink-0 pt-[env(safe-area-inset-top)]">
                <div className="flex items-center justify-between gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
                    <button
                        onClick={onBack}
                        className="text-stone-400 hover:text-stone-600 p-1 active:scale-95 transition-transform"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-stone-800 font-bold text-lg flex-1 text-center font-serif">分享画廊</span>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="text-stone-600 hover:text-stone-800 p-1 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        {isExporting ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <Download size={20} />
                        )}
                    </button>
                </div>
            </div>

            {/* Main Content Area - 预览区域 */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 bg-stone-100">
                <div className={orientation === 'landscape' ? 'max-w-4xl mx-auto' : 'max-w-md mx-auto'}>
                    <div className="shadow-2xl w-full">
                        <div
                            ref={exportRef}
                            className="w-full overflow-hidden"
                            style={{ backgroundColor: currentTheme.colors.paper }}
                        >
                        {currentPeriod === 'week' && (
                            <WeekView 
                                date={currentDate}
                                entries={diaryEntries}
                                theme={currentTheme}
                                layoutStyle={currentLayout}
                                orientation={orientation}
                            />
                        )}
                        {currentPeriod === 'month' && (
                            <MonthView 
                                date={currentDate}
                                entries={diaryEntries}
                                theme={currentTheme}
                                layoutStyle={currentLayout}
                                orientation={orientation}
                            />
                        )}
                        {currentPeriod === 'year' && (
                            <YearView 
                                date={currentDate}
                                entries={diaryEntries}
                                theme={currentTheme}
                                layoutStyle={currentLayout}
                                orientation={orientation}
                            />
                        )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Control Bar - 底部控制栏 */}
            <div className="flex-shrink-0 border-t border-stone-100 bg-white/80 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
                <div className="px-4 py-4 space-y-4">
                    {/* 主题颜色选择 */}
                    <section>
                        <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-3 tracking-wider font-serif">
                            <Palette size={14} />
                            主题颜色
                        </div>
                        <div className="flex justify-between gap-2">
                            {THEMES.map((theme) => (
                                <button
                                    key={theme.name}
                                    onClick={() => setCurrentTheme(theme)}
                                    className={`flex-1 flex items-center justify-center transition-all ${
                                        currentTheme.name === theme.name 
                                            ? 'scale-110' 
                                            : 'opacity-60 hover:opacity-100'
                                    }`}
                                >
                                    <div 
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                                            currentTheme.name === theme.name
                                                ? 'ring-2 ring-offset-2 ring-stone-400'
                                                : 'border-transparent'
                                        }`}
                                        style={{ backgroundColor: theme.colors.accent }}
                                    />
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* 排版样式选择 */}
                    <section>
                        <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-3 tracking-wider font-serif">
                            <LayoutTemplate size={14} />
                            排版样式
                        </div>
                        <div className="flex justify-between items-center gap-2">
                            {/* 左侧：样式选择 */}
                            <div className="flex gap-2 flex-1">
                                {LAYOUT_STYLES.map((style) => (
                                    <button
                                        key={style.key}
                                        onClick={() => setCurrentLayout(style.key)}
                                        className={`flex-1 px-2 py-1.5 rounded-full text-[10px] font-medium border transition-all font-serif ${
                                            currentLayout === style.key
                                                ? 'bg-stone-100 border-stone-400 text-stone-900'
                                                : 'border-stone-300 text-stone-600 hover:border-stone-400'
                                        }`}
                                    >
                                        {style.label}
                                    </button>
                                ))}
                            </div>
                            
                            {/* 右侧：横竖屏切换 */}
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setOrientation('portrait')}
                                    className={`p-1.5 rounded-full border transition-all ${
                                        orientation === 'portrait'
                                            ? 'bg-stone-100 border-stone-400 text-stone-900'
                                            : 'border-stone-300 text-stone-600 hover:border-stone-400'
                                    }`}
                                    title="竖屏"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="7" y="2" width="10" height="20" rx="2" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setOrientation('landscape')}
                                    className={`p-1.5 rounded-full border transition-all ${
                                        orientation === 'landscape'
                                            ? 'bg-stone-100 border-stone-400 text-stone-900'
                                            : 'border-stone-300 text-stone-600 hover:border-stone-400'
                                    }`}
                                    title="横屏"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="7" width="20" height="10" rx="2" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* 时间段选择 */}
                    <section>
                        <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-3 tracking-wider font-serif">
                            <Calendar size={14} />
                            时间段
                        </div>
                        <div className="flex justify-between items-center gap-2">
                            {/* 左侧：周期选择 */}
                            <div className="flex gap-2 flex-1">
                                {TIME_PERIODS.map((period) => (
                                    <button
                                        key={period.key}
                                        onClick={() => setCurrentPeriod(period.key)}
                                        className={`flex-1 px-2 py-1.5 rounded-full text-[10px] font-medium border transition-all font-serif ${
                                            currentPeriod === period.key
                                                ? 'bg-stone-100 border-stone-400 text-stone-900'
                                                : 'border-stone-300 text-stone-600 hover:border-stone-400'
                                        }`}
                                    >
                                        {period.label}
                                    </button>
                                ))}
                            </div>
                            
                            {/* 右侧：导航按钮 */}
                            <div className="flex gap-1">
                                <button
                                    onClick={handlePrev}
                                    className="px-2 py-1.5 rounded-full text-[10px] font-medium border border-stone-300 text-stone-600 hover:border-stone-400 hover:bg-stone-50 transition-all"
                                    title="上一周期"
                                >
                                    ←
                                </button>
                                <button
                                    onClick={() => setCurrentDate(new Date())}
                                    className="px-2 py-1.5 rounded-full text-[10px] font-medium border border-stone-300 text-stone-600 hover:border-stone-400 hover:bg-stone-50 transition-all font-serif"
                                    title="回到今天"
                                >
                                    今
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="px-2 py-1.5 rounded-full text-[10px] font-medium border border-stone-300 text-stone-600 hover:border-stone-400 hover:bg-stone-50 transition-all"
                                    title="下一周期"
                                >
                                    →
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
