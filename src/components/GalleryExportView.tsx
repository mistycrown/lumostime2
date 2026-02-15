/**
 * @file GalleryExportView.tsx
 * @description 画廊导出视图 - 将画廊导出为美观的图片
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, Download, Palette, LayoutTemplate, Calendar } from 'lucide-react';
import { Log, Category, DailyReview } from '../types';
import { 
    format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, 
    startOfMonth, endOfMonth, isSameMonth, getYear, getDay, 
    subWeeks, addWeeks, subMonths, addMonths, subYears, addYears 
} from 'date-fns';
import zhCN from 'date-fns/locale/zh-CN';
import * as htmlToImage from 'html-to-image';

interface GalleryExportViewProps {
    logs: Log[];
    categories: Category[];
    dailyReviews?: DailyReview[];
    onBack: () => void;
}

// 数据类型定义
interface DiaryEntry {
    id: string;
    date: Date;
    content: string;
    imageUrl?: string;
}

type TimePeriod = 'week' | 'month' | 'year';
type LayoutStyle = 'magazine' | 'minimal' | 'newspaper' | 'film';

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
    categories,
    dailyReviews = [],
    onBack
}) => {
    const [currentTheme, setCurrentTheme] = useState(THEMES[0]);
    const [currentLayout, setCurrentLayout] = useState<LayoutStyle>('magazine');
    const [currentPeriod, setCurrentPeriod] = useState<TimePeriod>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isExporting, setIsExporting] = useState(false);
    
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
            
            let imageUrl: string | undefined;
            let content = '';
            let logWithImage: Log | undefined;
            
            // 找到第一张图片
            for (const log of dayLogs) {
                if (log.images && log.images.length > 0) {
                    imageUrl = log.images[0];
                    logWithImage = log;
                    break;
                }
            }
            
            // 2. 确定文字内容
            if (imageUrl && logWithImage?.note) {
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
            if (imageUrl || content) {
                entries.push({
                    id: `entry-${dayStr}`,
                    date: day,
                    content: content || '',
                    imageUrl
                });
            }
        });
        
        return entries;
    }, [logs, dailyReviews, currentDate]);

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

    const handleExport = async () => {
        if (exportRef.current && !isExporting) {
            setIsExporting(true);
            setTimeout(async () => {
                try {
                    if (!exportRef.current) return;
                    const dataUrl = await htmlToImage.toPng(exportRef.current, {
                        quality: 1.0,
                        backgroundColor: currentTheme.colors.paper,
                        pixelRatio: 2
                    });
                    const link = document.createElement('a');
                    link.download = `gallery-${currentPeriod}-${format(currentDate, 'yyyy-MM-dd')}.png`;
                    link.href = dataUrl;
                    link.click();
                } catch (error) {
                    console.error('Export failed:', error);
                } finally {
                    setIsExporting(false);
                }
            }, 100);
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
                        className="text-stone-600 hover:text-stone-800 p-1 active:scale-95 transition-transform disabled:opacity-50"
                    >
                        <Download size={20} />
                    </button>
                </div>
            </div>

            {/* Main Content Area - 预览区域 */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6">
                <div className="max-w-md mx-auto">
                    <div 
                        ref={exportRef}
                        className="shadow-2xl"
                        style={{ backgroundColor: currentTheme.colors.paper }}
                    >
                        {/* TODO: 在这里渲染周/月/年视图 */}
                        <div className="p-8 text-center">
                            <p className="text-sm text-stone-400">预览区域</p>
                            <p className="text-xs text-stone-300 mt-2">主题: {currentTheme.name}</p>
                            <p className="text-xs text-stone-300">样式: {LAYOUT_STYLES.find(s => s.key === currentLayout)?.label}</p>
                            <p className="text-xs text-stone-300">时间段: {TIME_PERIODS.find(p => p.key === currentPeriod)?.label}</p>
                            <p className="text-xs text-stone-300 mt-2">数据条目: {diaryEntries.length}</p>
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
                        <div className="flex justify-between gap-2">
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
                    </section>

                    {/* 时间段选择 */}
                    <section>
                        <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-3 tracking-wider font-serif">
                            <Calendar size={14} />
                            时间段
                        </div>
                        <div className="flex justify-between gap-2">
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
                    </section>
                </div>
            </div>
        </div>
    );
};
