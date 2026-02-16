/**
 * @file EmojiExportView.tsx
 * @description Emoji 统计导出视图 - 用于导出情绪统计图片 (支持四种月度样式)
 */
import React, { useState, useMemo, useRef } from 'react';
import { DailyReview } from '../../types';
import { Palette, LayoutTemplate, Download, ChevronLeft, Sparkles, Hash, ScanLine, Fingerprint, Check } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ToastType } from '../../components/Toast';
import { IconRenderer } from '../IconRenderer';

interface EmojiExportViewProps {
  dailyReviews: DailyReview[];
  currentDate: Date;
  emojiRange: 'month' | 'year';
  onBack: () => void;
  onToast?: (type: ToastType, message: string) => void;
}

// 主题色彩定义 (从 monomood 迁移)
interface ColorTheme {
  id: string;
  label: string;
  bg: string;
  text: string;
  subtext: string;
  border: string;
  accent: string;
  isDark: boolean;
  primary: string; // for UI selector
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

type LayoutStyle = 'classic' | 'poster' | 'gallery' | 'receipt' | 'journal' | 'minimal' | 'vintage' | 'modern';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const EmojiExportView: React.FC<EmojiExportViewProps> = ({
  dailyReviews,
  currentDate,
  emojiRange,
  onBack,
  onToast
}) => {
  const [currentThemeId, setCurrentThemeId] = useState<string>('mono');
  const [currentStyle, setCurrentStyle] = useState<LayoutStyle>('poster');
  const [exportingState, setExportingState] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const theme = COLOR_THEMES.find(c => c.id === currentThemeId) || COLOR_THEMES[0];
  const year = currentDate.getFullYear();
  const monthName = MONTH_NAMES[currentDate.getMonth()];

  // Data Processing
  const displayLogs = useMemo(() => {
    // 1. Filter Real Data for Month
    const prefix = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const realLogs = dailyReviews.filter(r => r.date.startsWith(prefix) && (r.moodEmoji || r.summary));

    // Map to simplified structure
    return realLogs.map(r => ({
      id: r.id,
      date: r.date,
      emoji: r.moodEmoji,
      summary: r.summary || ''
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyReviews, currentDate, year]);


  // --- Export Functionality ---
  const handleExport = async () => {
    if (exportingState || !cardRef.current) return;
    setExportingState(true);

    try {
      const filename = `lumos-mood-${currentStyle}-${year}-${currentDate.getMonth() + 1}.png`;

      // Determine background color based on style/theme
      const bgColor = theme.bg;

      // Generate image with optimized settings
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: bgColor,
        skipAutoScale: true,
        width: currentStyle === 'minimal' ? 800 : undefined,
        height: currentStyle === 'minimal' ? 1000 : undefined,
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
      case 'poster':
        // Modern List / Poster View - Enhanced Typography
        return (
          <div ref={cardRef} style={commonStyle} className="p-10 w-full min-h-[600px] flex flex-col font-sans transition-colors duration-300">
            <div className="flex justify-between items-end mb-10 border-b-2 pb-6" style={{ borderColor: theme.border }}>
              <div>
                <h2 className="text-5xl font-bold tracking-tight leading-none mb-2" style={{ color: theme.text, fontFamily: 'Georgia, serif', letterSpacing: '-0.02em' }}>{monthName}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="font-mono tracking-mega text-[9px] uppercase font-bold px-2.5 py-1" style={{ backgroundColor: theme.text, color: theme.bg }}>LUMOSTIME</span>
                  <span className="font-serif italic text-xs" style={{ color: theme.subtext, opacity: 0.7 }}>Vol. {currentDate.getMonth() + 1}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-mono uppercase tracking-ultra mb-1.5 font-semibold" style={{ color: theme.subtext, opacity: 0.6 }}>ENTRIES</div>
                <div className="flex items-center justify-end gap-1.5">
                  <Sparkles size={16} style={{ color: theme.subtext, opacity: 0.5 }} />
                  <span className="font-serif text-2xl font-light" style={{ color: theme.text }}>{displayLogs.length}</span>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              {displayLogs.map(log => (
                <div key={log.id} className="flex items-center gap-5 group">
                  <span className="font-serif text-lg w-7 text-right shrink-0 font-light" style={{ color: theme.subtext, opacity: 0.5 }}>{parseInt(log.date.split('-')[2])}</span>
                  <div className="relative z-10 w-7 h-7 flex items-center justify-center">
                    {log.emoji && <IconRenderer icon={log.emoji} size={28} />}
                  </div>
                  <div className="h-[1.5px] flex-1 transition-colors" style={{ backgroundColor: theme.border, opacity: 0.4 }} />
                  <span className="font-sans text-sm truncate max-w-[140px] sm:max-w-[220px] font-light" style={{ color: theme.text, opacity: 0.75 }}>{log.summary}</span>
                </div>
              ))}
              {displayLogs.length === 0 && <p className="text-center py-12 italic font-serif text-base" style={{ color: theme.subtext, opacity: 0.5 }}>"The page is yet to be written."</p>}
            </div>
            <div className="mt-10 pt-6 border-t flex flex-col gap-5" style={{ borderColor: theme.border }}>
              <div className="flex justify-between items-center">
                <span className="font-serif italic text-sm font-light" style={{ color: theme.text, opacity: 0.7 }}>Illuminate your life.</span>
                <span className="font-mono text-[8px] tracking-mega uppercase font-semibold" style={{ color: theme.subtext, opacity: 0.4 }}>LUMOSTIME.APP</span>
              </div>
              {/* Enhanced Barcode */}
              <div className="h-8 flex items-end justify-center gap-[1.5px]" style={{ opacity: 0.2 }}>
                {Array.from({ length: 50 }).map((_, i) => (
                  <div key={i} className="bg-current w-[1.5px]" style={{ height: `${30 + Math.random() * 70}%` }} />
                ))}
              </div>
            </div>
          </div>
        );
      case 'gallery':
        // Gallery View - Enhanced Typography
        return (
          <div ref={cardRef} style={commonStyle} className="p-10 w-full min-h-[600px] flex flex-col transition-colors duration-300">
            <header className="mb-10 border-b-[3px] pb-6 flex justify-between items-end" style={{ borderColor: theme.text }}>
              <div>
                <h1 className="font-serif text-4xl leading-none mb-2 font-bold tracking-tight" style={{ letterSpacing: '-0.01em' }}>LUMOSTIME</h1>
                <p className="font-mono text-[9px] uppercase tracking-mega font-semibold" style={{ color: theme.subtext, opacity: 0.6 }}>COLLECTION {year}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-mono text-sm font-bold uppercase tracking-wide" style={{ color: theme.text }}>{monthName}</span>
                <span className="text-[9px] italic font-serif" style={{ color: theme.subtext, opacity: 0.6 }}>{displayLogs.length} items</span>
              </div>
            </header>
            <div className="flex-1 content-start grid grid-cols-3 gap-5">
              {displayLogs.map((log, index) => (
                <div key={log.id} className="aspect-[4/5] border-2 p-4 flex flex-col items-center justify-between relative transition-all hover:shadow-lg" style={{ borderColor: theme.border, backgroundColor: theme.accent }}>
                  <div className="w-full flex justify-between items-start">
                    <span className="text-[8px] font-mono font-semibold tracking-wider" style={{ color: theme.subtext, opacity: 0.5 }}>NO.{String(index + 1).padStart(2, '0')}</span>
                    <span className="text-[11px] font-mono font-bold" style={{ color: theme.subtext }}>{log.date.split('-')[2]}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center transform hover:scale-110 transition-transform">
                    {log.emoji && <IconRenderer icon={log.emoji} size={40} />}
                  </div>
                  <div className="w-full border-t-2 pt-2.5 mt-2" style={{ borderColor: theme.border }}>
                    <p className="font-serif text-[9px] text-center truncate px-1 font-light leading-tight" style={{ color: theme.text, opacity: 0.7 }}>{log.summary || 'Mood'}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center border-t-2 pt-6" style={{ borderColor: theme.border }}>
              <p className="font-serif italic text-base mb-2 font-light" style={{ color: theme.text, opacity: 0.7 }}>"Illuminate your life."</p>
              <p className="font-mono text-[8px] uppercase tracking-mega font-semibold" style={{ color: theme.subtext, opacity: 0.4 }}>RECORDED WITH LUMOSTIME</p>
            </div>
          </div>
        );
      case 'receipt':
        // Receipt View - Enhanced Typography
        return (
          <div ref={cardRef} style={{ backgroundColor: theme.bg, color: theme.text }} className="p-10 w-full min-h-[600px] font-mono relative overflow-hidden flex flex-col transition-colors duration-300">
            {/* Receipt Holes */}
            <div className="absolute top-0 left-0 w-full h-4" style={{ maskImage: `url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPScyMCcgaGVpZ2h0PScyMCcgdmlld0JveD0nMCAwIDIwIDIwJyBmaWxsPSdub25lJz48Y2lyY2xlIGN4PScxMCcgY3k9Jy01JyByPSc4JyBmaWxsPSdibGFjayIvPjwvc3ZnPg==')`, WebkitMaskImage: `url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPScyMCcgaGVpZ2h0PScyMCcgdmlld0JveD0nMCAwIDIwIDIwJyBmaWxsPSdub25lJz48Y2lyY2xlIGN4PScxMCcgY3k9Jy01JyByPSc4JyBmaWxsPSdibGFjayIvPjwvc3ZnPg==')`, backgroundColor: 'rgba(0,0,0,0.1)' }}></div>
            <div className="absolute bottom-0 left-0 w-full h-4" style={{ maskImage: `url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPScyMCcgaGVpZ2h0PScyMCcgdmlld0JveD0nMCAwIDIwIDIwJyBmaWxsPSdub25lJz48Y2lyY2xlIGN4PScxMCcgY3k9JzI1JyByPSc4JyBmaWxsPSdibGFjayIvPjwvc3ZnPg==')`, WebkitMaskImage: `url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPScyMCcgaGVpZ2h0PScyMCcgdmlld0JveD0nMCAwIDIwIDIwJyBmaWxsPSdub25lJz48Y2lyY2xlIGN4PScxMCcgY3k9JzI1JyByPSc4JyBmaWxsPSdibGFjayIvPjwvc3ZnPg==')`, backgroundColor: 'rgba(0,0,0,0.1)' }}></div>

            <div className="text-center border-b-2 border-dashed pb-6 mb-8 mt-4" style={{ borderColor: theme.subtext }}>
              <div className="flex justify-center mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-serif text-xl font-bold" style={{ backgroundColor: theme.text, color: theme.bg }}>L</div>
              </div>
              <h1 className="text-2xl font-bold uppercase tracking-mega mb-2">LUMOSTIME</h1>
              <p className="text-[9px] uppercase tracking-ultra font-semibold" style={{ color: theme.subtext, opacity: 0.7 }}>Illuminate your life</p>

              <div className="mt-5 flex flex-col gap-1.5 text-[9px] uppercase text-left pl-3 font-semibold" style={{ color: theme.subtext, opacity: 0.8 }}>
                <div className="flex justify-between"><span>DATE: {monthName.substring(0, 3).toUpperCase()} {year}</span><span>TIME: ANYTIME</span></div>
                <div className="flex justify-between"><span>CASHIER: SELF</span><span>TERM: 001</span></div>
              </div>
            </div>
            <div className="flex-1 space-y-5">
              <div className="flex justify-between text-[10px] border-b pb-2 mb-3 font-bold tracking-wide" style={{ borderColor: theme.border, color: theme.subtext, opacity: 0.7 }}>
                <span>QTY ITEM</span>
                <span>PRICE</span>
              </div>
              {displayLogs.map(log => (
                <div key={log.id} className="flex justify-between items-baseline text-sm">
                  <div className="flex gap-4 flex-1 min-w-0">
                    <span style={{ color: theme.subtext, fontFamily: 'Georgia, serif', opacity: 0.6 }} className="w-7 text-center text-[13px] italic shrink-0 font-light">{parseInt(log.date.split('-')[2])}</span>
                    <span className="uppercase font-sans font-light break-words pr-2 tracking-wide" style={{ fontSize: '11px' }}>{log.summary || 'Mood Log'}</span>
                  </div>
                  <div className="flex gap-2 items-center shrink-0">
                    <span style={{ color: theme.subtext, opacity: 0.3 }} className="text-[10px]">................</span>
                    <div className="w-5 h-5 flex items-center justify-center">
                      {log.emoji && <IconRenderer icon={log.emoji} size={18} />}
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-baseline text-sm font-bold" style={{ opacity: 0.5 }}>
                <div className="flex gap-4">
                  <span style={{ color: theme.subtext, fontFamily: 'Georgia, serif' }} className="text-[13px] italic w-7 text-center font-light">∞</span>
                  <span className="uppercase font-sans tracking-wide" style={{ fontSize: '11px' }}>MEMORY</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span style={{ color: theme.subtext, opacity: 0.3 }} className="text-[10px]">................</span>
                  <span className="text-xs">PRICELESS</span>
                </div>
              </div>

              <div className="pt-5 flex justify-between text-xs font-bold border-t border-dashed mt-10 tracking-wide" style={{ borderColor: theme.subtext }}>
                <span>TOTAL ITEMS</span>
                <span>{displayLogs.length}</span>
              </div>
            </div>
            <div className="border-t-2 border-dashed pt-6 mt-8 text-center" style={{ borderColor: theme.subtext }}>
              <p className="text-[10px] uppercase tracking-wide">***********************************</p>
              <p className="text-sm font-bold uppercase tracking-wide my-2">Illuminate your life</p>
              <p className="text-[9px] uppercase tracking-wide font-light" style={{ color: theme.subtext, opacity: 0.6 }}>Thank you for being you</p>
              <p className="text-[10px] uppercase mt-2 tracking-wide">***********************************</p>
            </div>
          </div>
        );
      case 'classic':
      default:
        // Classic Timeline View - Enhanced Typography
        return (
          <div ref={cardRef} style={commonStyle} className="p-10 w-full min-h-[600px] flex flex-col relative transition-colors duration-300">
            <div className="absolute top-6 right-6 w-24 h-24 rounded-full -z-0" style={{ backgroundColor: theme.accent, opacity: 0.4 }} />
            <header className="mb-10 z-10 flex justify-between items-start">
              <div>
                <span className="block font-mono text-[9px] uppercase tracking-mega mb-3 font-semibold" style={{ color: theme.subtext, opacity: 0.6 }}>LUMOSTIME LOG</span>
                <h2 className="font-serif text-6xl font-light tracking-tight" style={{ letterSpacing: '-0.02em' }}>{monthName}</h2>
              </div>
              <span className="font-serif text-3xl font-light" style={{ color: theme.text, opacity: 0.15 }}>{year}</span>
            </header>
            <div className="flex-1 pl-6 border-l-2 space-y-7" style={{ borderColor: theme.border }}>
              {displayLogs.map(log => (
                <div key={log.id} className="relative">
                  <div className="absolute -left-[25px] top-1.5 w-3 h-3 border-[3px] rounded-full" style={{ backgroundColor: theme.bg, borderColor: theme.border }}></div>
                  <div className="flex items-start gap-5">
                    <div className="w-7 pt-0.5 text-base shrink-0 text-center italic font-light" style={{ color: theme.subtext, fontFamily: 'Georgia, serif', opacity: 0.5 }}>{parseInt(log.date.split('-')[2])}</div>
                    <div className="rounded-xl p-3 pr-5 flex items-start gap-4 shadow-sm border-2 transition-all hover:shadow-md" style={{ backgroundColor: theme.accent, borderColor: theme.border }}>
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        {log.emoji && <IconRenderer icon={log.emoji} size={24} />}
                      </div>
                      <span className="font-sans text-sm font-light leading-relaxed" style={{ color: theme.text, opacity: 0.85 }}>{log.summary || 'Mood Log'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-14">
              <div className="border-t-2 pt-6 flex justify-between items-end" style={{ borderColor: theme.border }}>
                <div className="flex flex-col gap-5">
                  <div className="w-36 border-b-2 border-dashed" style={{ borderColor: theme.subtext, opacity: 0.3 }} />
                  <span className="font-mono text-[8px] uppercase tracking-ultra font-semibold" style={{ color: theme.subtext, opacity: 0.5 }}>SIGNED</span>
                </div>
                <div className="text-right">
                  <p className="font-serif italic text-base mb-2 font-light" style={{ color: theme.text, opacity: 0.7 }}>"Illuminate your life."</p>
                  <span className="font-mono text-[9px] tracking-wide font-semibold" style={{ color: theme.subtext, opacity: 0.4 }}>Generated by Lumostime</span>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };


  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-[#faf9f6] flex flex-col text-slate-800 font-sans z-[9999]">
      <style>{`
        .font-mono { font-family: 'Courier New', 'Courier', monospace; }
        .font-serif { font-family: 'Georgia', 'Times New Roman', serif; }
        .font-sans { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; }
        .font-handwriting { font-family: 'Brush Script MT', 'Lucida Handwriting', cursive; }
        .tracking-ultra { letter-spacing: 0.15em; }
        .tracking-mega { letter-spacing: 0.25em; }
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
          <div className="flex justify-between gap-2">
            {COLOR_THEMES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCurrentThemeId(c.id)}
                className={`flex-1 flex items-center justify-center transition-all ${currentThemeId === c.id
                  ? 'scale-110'
                  : 'opacity-60 hover:opacity-100'
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-full border-2 transition-all ${currentThemeId === c.id
                    ? 'ring-2 ring-offset-2 ring-stone-400'
                    : 'border-transparent'
                    }`}
                  style={{ backgroundColor: c.primary }}
                />
              </button>
            ))}
          </div>
        </section>

        {/* Layouts */}
        <section>
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-3 tracking-wider font-serif">
            <LayoutTemplate size={14} />
            布局
          </div>
          <div className="flex justify-between gap-2">
            {[
              { key: 'poster', label: '现代' },
              { key: 'classic', label: '经典' },
              { key: 'gallery', label: '画廊' },
              { key: 'receipt', label: '票据' }
            ].map((style) => (
              <button
                key={style.key}
                onClick={() => setCurrentStyle(style.key as LayoutStyle)}
                className={`flex-1 px-2 py-1.5 rounded-full text-[10px] font-medium border transition-all font-serif ${currentStyle === style.key
                  ? 'bg-stone-100 border-stone-400 text-stone-900'
                  : 'border-stone-300 text-stone-600 hover:border-stone-400'
                  }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </section>



      </div>
    </div>
  );
};
