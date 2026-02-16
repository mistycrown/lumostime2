/**
 * @file EmojiExportView.tsx
 * @description Emoji 统计导出视图 - 用于导出情绪统计图片
 */
import React, { useState } from 'react';
import { DailyReview } from '../../types';
import { Palette, LayoutTemplate } from 'lucide-react';

interface EmojiExportViewProps {
  dailyReviews: DailyReview[];
  currentDate: Date;
  emojiRange: 'month' | 'year';
  onBack: () => void;
}

// 主题色彩定义
const THEMES = {
  ink: { name: 'ink', primary: '#1e293b', bg: '#fdfbf7' },
  coral: { name: 'coral', primary: '#f87171', bg: '#fef2f2' },
  mint: { name: 'mint', primary: '#34d399', bg: '#f0fdf4' },
  sky: { name: 'sky', primary: '#60a5fa', bg: '#eff6ff' },
  amber: { name: 'amber', primary: '#fbbf24', bg: '#fffbeb' },
  slate: { name: 'slate', primary: '#64748b', bg: '#f8fafc' },
  indigo: { name: 'indigo', primary: '#818cf8', bg: '#eef2ff' },
  violet: { name: 'violet', primary: '#a78bfa', bg: '#f5f3ff' },
  teal: { name: 'teal', primary: '#2dd4bf', bg: '#f0fdfa' },
};

type ThemeKey = keyof typeof THEMES;
type LayoutStyle = 'classic' | 'modern' | 'retro' | 'ticket';

export const EmojiExportView: React.FC<EmojiExportViewProps> = ({
  dailyReviews,
  currentDate,
  emojiRange,
  onBack
}) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>('ink');
  const [currentStyle, setCurrentStyle] = useState<LayoutStyle>('classic');
  const [exportingState, setExportingState] = useState<string | null>(null);

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-[#faf9f6] flex flex-col text-slate-800 font-sans z-[9999]">
      <style>{`
        .font-mono { font-family: 'Space Mono', monospace; }
      `}</style>
      
      {/* Header - 独立的标题栏 */}
      <div className="flex-shrink-0 pt-[env(safe-area-inset-top)] bg-white">
        <div className="flex items-center justify-between gap-3 px-4 h-14 border-b border-stone-100 bg-white">
          <button
            onClick={onBack}
            className="text-stone-400 hover:text-stone-600 p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left" aria-hidden="true">
              <path d="m15 18-6-6 6-6"></path>
            </svg>
          </button>
          <span className="text-stone-800 font-bold text-lg flex-1 text-center font-serif">分享统计</span>
          <div className="w-10"></div> {/* 占位，保持标题居中 */}
        </div>
      </div>

      {/* Main Content Area - 预览区域 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto space-y-4">
          {/* 预览卡片 */}
          <div className={currentStyle === 'ticket' ? '' : 'bg-white rounded-2xl shadow-sm overflow-hidden'}>
            <div className="p-6">
              <div className="text-center text-stone-400 py-12">
                预览区
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Options Area */}
      <div className="bg-white px-4 py-6 space-y-6">
        
        {/* 主题色彩选择 */}
        <section>
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-3 tracking-wider font-serif">
            <Palette size={14} />
            主题色彩
          </div>
          <div className="flex justify-between gap-2">
            {(Object.keys(THEMES) as ThemeKey[]).map((themeKey) => {
              const theme = THEMES[themeKey];
              return (
                <button
                  key={theme.name}
                  onClick={() => setCurrentTheme(themeKey)}
                  className={`flex-1 flex items-center justify-center transition-all ${
                    currentTheme === themeKey 
                      ? 'scale-110' 
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <div 
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      currentTheme === themeKey
                        ? 'ring-2 ring-offset-2 ring-stone-400'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: theme.primary }}
                  />
                </button>
              );
            })}
          </div>
        </section>

        {/* 布局模板选择 */}
        <section>
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-3 tracking-wider font-serif">
            <LayoutTemplate size={14} />
            布局模版
          </div>
          <div className="flex justify-between gap-2">
            {[
              { key: 'classic' as LayoutStyle, label: '经典' },
              { key: 'modern' as LayoutStyle, label: '现代' },
              { key: 'retro' as LayoutStyle, label: '复古' },
              { key: 'ticket' as LayoutStyle, label: '票据' }
            ].map((style) => (
              <button
                key={style.key}
                onClick={() => setCurrentStyle(style.key)}
                className={`flex-1 px-2 py-1.5 rounded-full text-[10px] font-medium border transition-all font-serif ${
                  currentStyle === style.key
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
