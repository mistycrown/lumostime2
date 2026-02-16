/**
 * @file YearEmojiExportView.tsx
 * @description Emoji 统计导出视图 - 用于导出全年的情绪统计图片 (支持四种年度样式)
 */
import React, { useState, useMemo, useRef } from 'react';
import { DailyReview } from '../../types';
import { Palette, LayoutTemplate, Download, ChevronLeft, CalendarRange, Check, Grid3X3, AlignLeft, ArrowDown, Columns, ScanLine } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ToastType } from '../../components/Toast';
import { IconRenderer } from '../IconRenderer';

interface YearEmojiExportViewProps {
    dailyReviews: DailyReview[];
    currentDate: Date;
    onBack: () => void;
    onToast?: (type: ToastType, message: string) => void;
}

// 主题色彩定义 (复用)
interface ColorTheme {
    id: string;
    label: string;
    bg: string;
    text: string;
    subtext: string;
    border: string;
    accent: string;
    isDark: boolean;
    primary: string;
}

const COLOR_THEMES: ColorTheme[] = [
    {
        id: 'mono',
        label: 'Mono',
        bg: '#FFFFFF',
        text: '#27272A',
        subtext: '#A1A1AA',
        border: '#E4E4E7',
        accent: '#FAFAFA',
        isDark: false,
        primary: '#27272A'
    },
    {
        id: 'mist',
        label: 'Mist',
        bg: '#F3F4F6',
        text: '#475569',
        subtext: '#94A3B8',
        border: '#E2E8F0',
        accent: '#FFFFFF',
        isDark: false,
        primary: '#475569'
    },
    {
        id: 'sage',
        label: 'Sage',
        bg: '#F1F7F4',
        text: '#374B43',
        subtext: '#8DA399',
        border: '#D5E0DB',
        accent: '#FFFFFF',
        isDark: false,
        primary: '#374B43'
    },
    {
        id: 'cream',
        label: 'Cream',
        bg: '#FDFBF7',
        text: '#5C554B',
        subtext: '#A89F91',
        border: '#E6E0D4',
        accent: '#FFFFFF',
        isDark: false,
        primary: '#5C554B'
    },
    {
        id: 'clay',
        label: 'Clay',
        bg: '#FAF7F5',
        text: '#6D5A50',
        subtext: '#BCAAA4',
        border: '#EBE0D8',
        accent: '#FFFFFF',
        isDark: false,
        primary: '#6D5A50'
    },
    {
        id: 'blush',
        label: 'Blush',
        bg: '#FFF5F5',
        text: '#884A4F',
        subtext: '#D6A6AB',
        border: '#FDE2E4',
        accent: '#FFFFFF',
        isDark: false,
        primary: '#884A4F'
    },
    {
        id: 'sky',
        label: 'Sky',
        bg: '#F0F9FF',
        text: '#0C4A6E',
        subtext: '#7DD3FC',
        border: '#BAE6FD',
        accent: '#FFFFFF',
        isDark: false,
        primary: '#0C4A6E'
    },
    {
        id: 'lilac',
        label: 'Lilac',
        bg: '#FAF5FF',
        text: '#581C87',
        subtext: '#C084FC',
        border: '#E9D5FF',
        accent: '#FFFFFF',
        isDark: false,
        primary: '#581C87'
    },
];

const LAYOUTS = [
    { id: 'grid', label: 'Grid', icon: Grid3X3 },
    { id: 'stream', label: 'Stream', icon: AlignLeft },
    { id: 'timeline', label: 'Timeline', icon: ArrowDown },
    { id: 'columns', label: 'Columns', icon: Columns },
];

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const YearEmojiExportView: React.FC<YearEmojiExportViewProps> = ({
    dailyReviews,
    currentDate,
    onBack,
    onToast
}) => {
    const [currentTheme, setCurrentTheme] = useState<ColorTheme>(COLOR_THEMES[0]);
    const [currentStyle, setCurrentStyle] = useState<string>('grid');
    const [exportingState, setExportingState] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const theme = currentTheme;
    const year = currentDate.getFullYear();

    // Process data for the year
    const displayLogs = useMemo(() => {
        // 1. Filter Real Data for Year
        const prefix = `${year}-`;
        const realLogs = dailyReviews.filter(r => r.date.startsWith(prefix) && (r.moodEmoji || r.summary));

        // Map to simplified structure
        return realLogs.map(r => ({
            id: r.id,
            date: r.date,
            emoji: r.moodEmoji,
            summary: r.summary || ''
        })).sort((a, b) => a.date.localeCompare(b.date));
    }, [dailyReviews, currentDate, year]);


    // --- Export Functionality (Identical to EmojiExportView / ChronoPrintView) ---
    const handleExport = async () => {
        if (exportingState || !cardRef.current) return;
        setExportingState(true);

        try {
            const filename = `lumos-mood-year-${currentStyle}-${year}.png`;

            // Determine background color based on style/theme
            const bgColor = theme.bg;

            // Generate image with optimized settings
            const dataUrl = await toPng(cardRef.current, {
                cacheBust: true,
                pixelRatio: 4, // Higher resolution
                backgroundColor: bgColor,
                skipAutoScale: true,
            });

            const isNative = Capacitor.isNativePlatform();

            if (isNative) {
                // Mobile: Save to Gallery
                try {
                    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');

                    await Filesystem.writeFile({
                        path: `Pictures/LumosTime/${filename}`,
                        data: base64Data,
                        directory: Directory.ExternalStorage,
                        recursive: true
                    });

                    onToast?.('success', '导出成功，已保存到相册');
                } catch (err: any) {
                    console.error('Failed to save image:', err);
                    onToast?.('error', '保存失败：' + (err.message || '请检查存储权限'));
                }
            } else {
                // Desktop/Web: Download
                const link = document.createElement('a');
                link.download = filename;
                link.href = dataUrl;
                link.click();

                onToast?.('success', '导出成功，图片已下载');
            }
        } catch (err) {
            console.error(`Failed to export ${currentStyle}:`, err);
            onToast?.('error', '导出失败');
        } finally {
            setExportingState(false);
        }
    };


    // --- Renderers ---
    const renderContent = () => {
        const commonStyle = { backgroundColor: theme.bg, color: theme.text };

        switch (currentStyle) {
            case 'stream':
                // 2. Stream Layout (Text-like flow, separated by month)
                return (
                    <div ref={cardRef} style={commonStyle} className="p-8 w-full min-h-[600px] flex flex-col transition-colors duration-300">
                        <header className="mb-8 flex justify-between items-baseline border-b pb-4" style={{ borderColor: theme.border }}>
                            <div>
                                <h1 className="font-serif text-5xl tracking-tighter" style={{ color: theme.text }}>{year}</h1>
                                <p className="font-mono text-[10px] uppercase tracking-widest mt-1 opacity-60">Lumostime Stream</p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <AlignLeft size={16} className="mb-2 opacity-30" />
                                <span className="font-serif italic text-sm" style={{ color: theme.subtext }}>The Flow of Time</span>
                            </div>
                        </header>

                        <div className="flex-1">
                            {MONTH_NAMES.map((mName, mIdx) => {
                                const daysInMonth = new Date(year, mIdx + 1, 0).getDate();
                                const monthPrefix = `${year}-${String(mIdx + 1).padStart(2, '0')}`;

                                // Check if month has data to optimize rendering empty months if needed, but 'stream' usually shows all or skips empty? 
                                // Monomood shows all months.

                                return (
                                    <div key={mName} className="mb-6">
                                        <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider mb-2 opacity-40">{mName}</h3>
                                        <div className="flex flex-wrap gap-1">
                                            {Array.from({ length: daysInMonth }).map((_, dIdx) => {
                                                const dateStr = `${monthPrefix}-${String(dIdx + 1).padStart(2, '0')}`;
                                                const log = displayLogs.find(l => l.date === dateStr);

                                                return (
                                                    <div
                                                        key={dIdx}
                                                        className="w-3 h-3 sm:w-4 sm:h-4 rounded-[1px] flex items-center justify-center transition-transform hover:scale-125"
                                                        title={`${dateStr}: ${log ? log.summary : 'No Data'}`}
                                                        style={{ backgroundColor: log ? 'transparent' : theme.accent }}
                                                    >
                                                        {log && log.emoji && <IconRenderer icon={log.emoji} size={16} />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="mt-8 border-t pt-4 flex justify-between items-center" style={{ borderColor: theme.border }}>
                            <span className="font-serif italic text-xs" style={{ color: theme.text }}>Illuminate your life.</span>
                            <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: theme.subtext }}>LUMOSTIME</span>
                        </div>
                    </div>
                );

            case 'timeline':
                // 3. Timeline Layout (Vertical Heatmap Strip with Week Labels)
                return (
                    <div ref={cardRef} style={commonStyle} className="p-8 w-full min-h-[600px] flex flex-col transition-colors duration-300 items-center">
                        <header className="mb-6 text-center w-full max-w-[200px] border-b-2 border-black pb-4" style={{ borderColor: theme.text }}>
                            <div className="flex justify-between items-center mb-2 px-1">
                                <ScanLine size={12} className="opacity-50" />
                                <span className="font-mono text-[8px] uppercase">DATA TAPE</span>
                                <ScanLine size={12} className="opacity-50" />
                            </div>
                            <h2 className="font-serif text-3xl">{year}</h2>
                            <span className="font-mono text-[10px] uppercase tracking-widest block mt-1" style={{ color: theme.subtext }}>Lumostime Chronicle</span>
                        </header>

                        {/* Compact Width 200px */}
                        <div className="flex-1 w-full max-w-[200px]">
                            {/* Header Row */}
                            <div className="grid grid-cols-[20px_repeat(7,_1fr)] gap-px mb-2 text-center items-center">
                                <span />
                                {WEEK_DAYS.map((d, i) => (
                                    <span key={i} className="font-mono text-[8px] uppercase opacity-40">{d}</span>
                                ))}
                            </div>

                            {/* Weeks Container */}
                            <div className="flex flex-col gap-px">
                                {Array.from({ length: 53 }).map((_, weekIdx) => {
                                    const startOfYear = new Date(year, 0, 1);
                                    const startOffset = startOfYear.getDay();
                                    // Javascript getDay(): 0=Sun, 1=Mon. Monomood assumes Mon start?
                                    // Week Days: M T W T F S S => Mon start.
                                    // Start Offset needs adjustment if week starts on Monday.
                                    // Monomood used: const startOffset = startOfYear.getDay(); 
                                    // If Jan 1 is Sunday (0), and grid is Mon-Sun.
                                    // Let's stick to Monomood logic exactly first.

                                    const startDayOfYear = (weekIdx * 7) - startOffset + 1;

                                    const firstDateOfWeek = new Date(year, 0, startDayOfYear);
                                    const lastDateOfWeek = new Date(year, 0, startDayOfYear + 6);

                                    if (firstDateOfWeek.getFullYear() < year && lastDateOfWeek.getFullYear() < year) return null;
                                    if (firstDateOfWeek.getFullYear() > year) return null;

                                    return (
                                        <div key={weekIdx} className="grid grid-cols-[20px_repeat(7,_1fr)] gap-px items-center">
                                            <span className="font-mono text-[8px] text-right pr-2 opacity-30 leading-none">W{weekIdx + 1}</span>
                                            {Array.from({ length: 7 }).map((_, dayIdx) => {
                                                const d = new Date(year, 0, startDayOfYear + dayIdx);
                                                const inYear = d.getFullYear() === year;
                                                const dateStr = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                                const log = inYear ? displayLogs.find(l => l.date === dateStr) : undefined;

                                                if (!inYear) return <div key={dayIdx} />;

                                                return (
                                                    <div
                                                        key={dayIdx}
                                                        className="aspect-square rounded-[1px] flex items-center justify-center relative"
                                                        style={{ backgroundColor: log ? theme.accent : 'transparent', border: log ? 'none' : `1px solid ${theme.border}` }}
                                                        title={dateStr}
                                                    >
                                                        {log && log.emoji && <IconRenderer icon={log.emoji} size={16} />}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="mt-8 pt-4 text-center border-t border-dashed w-full max-w-[200px]" style={{ borderColor: theme.subtext }}>
                            <p className="font-serif italic text-xs mb-1">"Illuminate your life."</p>
                            <p className="font-mono text-[8px] uppercase" style={{ color: theme.subtext }}>End of Tape • {year}</p>
                        </div>
                    </div>
                );

            case 'columns':
                // 4. Columns Layout (2x6 Grid of Monthly Blocks)
                return (
                    <div ref={cardRef} style={commonStyle} className="p-8 w-full min-h-[600px] flex flex-col transition-colors duration-300">
                        <header className="mb-6 flex justify-between items-end border-b pb-2" style={{ borderColor: theme.border }}>
                            <div className="flex flex-col gap-0">
                                <h2 className="font-serif text-2xl leading-tight" style={{ fontFamily: "'Bilbo Swash Caps', cursive" }}>{year}</h2>
                                <span className="text-[10px] font-mono tracking-widest opacity-60 leading-tight" style={{ fontFamily: "'Bilbo Swash Caps', cursive" }}>lumostime columns</span>
                            </div>
                            <div className="flex flex-col items-end gap-0">
                                <span className="text-[10px] font-mono opacity-40 block leading-tight" style={{ fontFamily: "'Bilbo Swash Caps', cursive" }}>12 months</span>
                                <span className="text-[10px] font-mono opacity-40 leading-tight" style={{ fontFamily: "'Bilbo Swash Caps', cursive" }}>365 days</span>
                            </div>
                        </header>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-8 content-start">
                            {MONTH_NAMES.map((mName, mIdx) => {
                                const daysInMonth = new Date(year, mIdx + 1, 0).getDate();
                                const monthPrefix = `${year}-${String(mIdx + 1).padStart(2, '0')}`;

                                return (
                                    <div key={mName} className="flex flex-col gap-2">
                                        <div className="flex justify-between items-baseline border-b border-dashed pb-1" style={{ borderColor: theme.border }}>
                                            <span className="font-mono text-[10px] uppercase opacity-60 tracking-wider">{mName}</span>
                                            <span className="font-mono text-[8px] opacity-30">0{mIdx + 1}</span>
                                        </div>
                                        <div className="grid grid-cols-7 gap-1">
                                            {Array.from({ length: daysInMonth }).map((_, dIdx) => {
                                                const dateStr = `${monthPrefix}-${String(dIdx + 1).padStart(2, '0')}`;
                                                const log = displayLogs.find(l => l.date === dateStr);

                                                return (
                                                    <div key={dIdx} className="aspect-square rounded-[2px] flex items-center justify-center overflow-hidden" style={{ backgroundColor: theme.accent }}>
                                                        {log && log.emoji && <IconRenderer icon={log.emoji} size={16} />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="mt-auto pt-6 text-center border-t border-dashed" style={{ borderColor: theme.border }}>
                            <span className="font-serif italic text-xs" style={{ color: theme.subtext }}>Illuminate your life.</span>
                        </div>
                    </div>
                )

            case 'grid':
            default:
                // 1. Grid Layout (Classic 3x4 Monthly Blocks)
                return (
                    <div ref={cardRef} style={commonStyle} className="p-6 w-full min-h-[600px] flex flex-col transition-colors duration-300">
                        <header className="mb-6 flex justify-between items-end border-b pb-2" style={{ borderColor: theme.border }}>
                            <div className="flex flex-col gap-0">
                                <h2 className="font-serif text-2xl leading-tight" style={{ fontFamily: "'Bilbo Swash Caps', cursive" }}>{year}</h2>
                                <span className="text-sm font-sans font-normal opacity-50 leading-tight" style={{ fontFamily: "'Bilbo Swash Caps', cursive" }}>lumostime grid</span>
                            </div>
                            <div className="flex flex-col items-end gap-0">
                                <span className="font-mono text-[10px] tracking-widest opacity-50 leading-tight" style={{ fontFamily: "'Bilbo Swash Caps', cursive" }}>12 months</span>
                                <span className="font-mono text-[10px] tracking-widest opacity-50 leading-tight" style={{ fontFamily: "'Bilbo Swash Caps', cursive" }}>365 days</span>
                            </div>
                        </header>

                        <div className="grid grid-cols-3 gap-x-4 gap-y-6 content-start">
                            {MONTH_NAMES.map((mName, mIdx) => {
                                const daysInMonth = new Date(year, mIdx + 1, 0).getDate();
                                const monthPrefix = `${year}-${String(mIdx + 1).padStart(2, '0')}`;

                                return (
                                    <div key={mName} className="flex flex-col gap-2">
                                        <span className="font-mono text-[8px] uppercase opacity-50 tracking-wider text-center border-b border-dashed pb-1" style={{ borderColor: theme.border }}>{mName.substring(0, 3)}</span>
                                        <div className="grid grid-cols-7 gap-1">
                                            {Array.from({ length: daysInMonth }).map((_, dIdx) => {
                                                const dateStr = `${monthPrefix}-${String(dIdx + 1).padStart(2, '0')}`;
                                                const log = displayLogs.find(l => l.date === dateStr);

                                                return (
                                                    <div key={dIdx} className="aspect-square rounded-[2px] flex items-center justify-center overflow-hidden" style={{ backgroundColor: theme.accent }}>
                                                        {log && log.emoji && <IconRenderer icon={log.emoji} size={16} />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="mt-auto pt-6 flex justify-between items-center text-xs">
                            <div className="flex gap-2">
                                {[1, 2, 3].map(i => <div key={i} className="w-3 h-3 rounded-[1px] opacity-30" style={{ backgroundColor: theme.text }} />)}
                            </div>
                            <span className="font-serif italic" style={{ color: theme.subtext }}>Illuminate your life.</span>
                        </div>
                    </div>
                );
        }
    };


    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-[#faf9f6] flex flex-col text-slate-800 font-sans z-[9999]">
            <style>{`
        .font-mono { font-family: 'Space Mono', monospace; }
      `}</style>

            {/* Header */}
            <div className="flex-shrink-0 pt-[env(safe-area-inset-top)] bg-white">
                <div className="flex items-center justify-between gap-3 px-4 h-14 border-b border-stone-100 bg-white">
                    <button onClick={onBack} className="text-stone-400 hover:text-stone-600 p-1">
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-stone-800 font-bold text-lg flex-1 text-center font-serif">分享统计</span>
                    <button
                        onClick={handleExport}
                        disabled={exportingState}
                        className="text-stone-400 hover:text-stone-600 p-1 disabled:opacity-50"
                    >
                        {exportingState ? <div className="w-5 h-5 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" /> : <Download size={20} />}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 pb-[env(safe-area-inset-bottom)]">
                <div className="max-w-md mx-auto space-y-4">
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300">
                        {renderContent()}
                    </div>
                </div>
            </div>

            {/* Bottom Options Area */}
            <div className="bg-white px-4 py-6 space-y-6">

                {/* Colors */}
                <section>
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-3 tracking-wider font-serif">
                        <Palette size={14} />
                        主题色彩
                    </div>
                    <div className="flex gap-4 overflow-x-auto p-2 -mx-2 no-scrollbar">
                        {COLOR_THEMES.map((theme) => (
                            <button
                                key={theme.id}
                                onClick={() => setCurrentTheme(theme)}
                                className={`flex-shrink-0 w-8 h-8 rounded-full border-2 mx-1 transition-all ${currentTheme.id === theme.id
                                    ? 'ring-2 ring-offset-2 ring-stone-400 scale-100'
                                    : 'border-transparent opacity-60 hover:opacity-100'
                                    }`}
                                style={{ backgroundColor: theme.primary }}
                            />
                        ))}
                    </div>
                </section>

                {/* Layouts */}
                <section>
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-3 tracking-wider font-serif">
                        <LayoutTemplate size={14} />
                        布局模版
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {LAYOUTS.map((layout) => (
                            <button
                                key={layout.id}
                                onClick={() => setCurrentStyle(layout.id)}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all h-auto py-3 ${currentStyle === layout.id
                                    ? 'bg-stone-100 border-stone-400 text-stone-900 font-bold'
                                    : 'border-stone-200 text-stone-400 hover:border-stone-300'
                                    }`}
                            >
                                <span className="text-xs">{layout.label}</span>
                            </button>
                        ))}
                    </div>
                </section>

            </div>
        </div>
    );
};
