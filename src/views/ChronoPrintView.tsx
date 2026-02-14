import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Palette, LayoutTemplate, Download } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { parseInputText, extractDateFromTitle, THEMES, ColorTheme } from '../components/ChronoPrint/utils';
import { ParsedData } from '../components/ChronoPrint/types';
import { PrintCard, PrintBarChart, PrintDonutChart, PrintStyle } from '../components/ChronoPrint/PrintComponents';
import { toPng } from 'html-to-image';
import { ToastType } from '../types';

const FONT_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;800;900&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=DM+Serif+Display:ital@0;1&display=swap";

interface ChronoPrintViewProps {
  inputText: string;
  onBack: () => void;
  onToast?: (type: ToastType, message: string) => void;
}

export const ChronoPrintView: React.FC<ChronoPrintViewProps> = ({ inputText, onBack, onToast }) => {
  const [data, setData] = useState<ParsedData | null>(null);
  const [globalDateLabel, setGlobalDateLabel] = useState<string>("");
  const [mainTitle, setMainTitle] = useState<string>("");
  const [exportingState, setExportingState] = useState<string | null>(null);
  const [currentStyle, setCurrentStyle] = useState<PrintStyle>('classic');
  const [currentTheme, setCurrentTheme] = useState<ColorTheme>(THEMES.ink);

  // Refs for specific cards to capture
  const monthRef = useRef<HTMLDivElement>(null);
  const todoRef = useRef<HTMLDivElement>(null);
  const domainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Manually load fonts to avoid CORS issues with html-to-image reading stylesheets
    const loadFonts = async () => {
      if (document.getElementById('dynamic-fonts')) return;
      
      try {
        const response = await fetch(FONT_URL);
        const css = await response.text();
        const style = document.createElement('style');
        style.id = 'dynamic-fonts';
        style.textContent = css;
        document.head.appendChild(style);
      } catch (e) {
        console.error("Failed to load fonts:", e);
      }
    };
    loadFonts();
  }, []);

  useEffect(() => {
    const parsed = parseInputText(inputText);
    setData(parsed);
    
    // Extract date and main title from the first section (Month Stats) to use globally
    if (parsed.monthStats) {
      setGlobalDateLabel(extractDateFromTitle(parsed.monthStats.title));
      setMainTitle(parsed.monthStats.title);
    }
  }, [inputText]);

  const handleExportSingle = async (ref: React.RefObject<HTMLDivElement>, filename: string, key: string) => {
    if (exportingState || !ref.current) return;
    setExportingState(key);

    try {
      // Determine background color based on style
      const bgColor = currentStyle === 'ticket' ? undefined : (currentStyle === 'retro' ? currentTheme.bg : '#ffffff');

      // Generate image with optimized settings
      const dataUrl = await toPng(ref.current, { 
        cacheBust: true, 
        pixelRatio: 2, // Optimized for speed and quality
        backgroundColor: bgColor,
        skipAutoScale: true,
      });
      
      const isNative = Capacitor.isNativePlatform();
      
      if (isNative) {
        // 移动端：保存到相册
        try {
          const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
          
          await Filesystem.writeFile({
            path: `Pictures/LumosTime/${filename}`,
            data: base64Data,
            directory: Directory.ExternalStorage,
            recursive: true
          });
          
          if (onToast) {
            onToast('success', '图片已保存到相册');
          }
        } catch (err: any) {
          console.error('Failed to save image:', err);
          if (onToast) {
            onToast('error', '保存失败：' + (err.message || '请检查存储权限'));
          }
        }
      } else {
        // 桌面端/Web端：直接下载
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
        
        if (onToast) {
          onToast('success', '图片已下载');
        }
      }
    } catch (err) {
      console.error(`Failed to export ${filename}:`, err);
      if (onToast) {
        onToast('error', '导出失败');
      }
    } finally {
      setExportingState(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#faf9f6] flex flex-col text-slate-800 font-sans z-50">
      <style>{`
        .font-mono { font-family: 'Space Mono', monospace; }
      `}</style>
      
      {/* Header - 独立的标题栏 */}
      <div className="flex-shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
          <button
            onClick={onBack}
            className="text-stone-400 hover:text-stone-600 p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left" aria-hidden="true">
              <path d="m15 18-6-6 6-6"></path>
            </svg>
          </button>
          <span className="text-stone-800 font-bold text-lg flex-1 text-center font-serif">分享卡片</span>
          <div className="w-10"></div> {/* 占位，保持标题居中 */}
        </div>
      </div>

      {/* Main Content Area - 预览区域 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto space-y-4">
          {data && (
            <>
              {/* Month Stats Card */}
              {data.monthStats && (
                <div className={currentStyle === 'ticket' ? '' : 'bg-white rounded-2xl shadow-sm overflow-hidden'}>
                  <PrintCard 
                    ref={monthRef}
                    title={mainTitle || data.monthStats.title} 
                    total={data.monthStats.totalDuration}
                    categoryLabel="TAGS"
                    subtitle={currentStyle === 'modern' || currentStyle === 'ticket' ? 'Tags' : 'Tag Statistics'}
                    isMobile={true}
                    variantStyle={currentStyle}
                    theme={currentTheme}
                  >
                    <div className="mt-6">
                      <PrintBarChart 
                        items={data.monthStats.items} 
                        variantStyle={currentStyle} 
                        theme={currentTheme}
                      />
                    </div>
                  </PrintCard>
                </div>
              )}

              {/* Todo Stats Card */}
              {data.todoStats && (
                <div className={currentStyle === 'ticket' ? '' : 'bg-white rounded-2xl shadow-sm overflow-hidden'}>
                  <PrintCard 
                    ref={todoRef}
                    title={mainTitle}
                    total={data.todoStats.totalDuration}
                    categoryLabel="TODOS"
                    subtitle={currentStyle === 'modern' || currentStyle === 'ticket' ? 'ToDo' : 'To Do Statistics'}
                    isMobile={true}
                    variantStyle={currentStyle}
                    theme={currentTheme}
                  >
                    <div className="mt-4">
                      <PrintDonutChart 
                        data={data.todoStats} 
                        isMobile={true} 
                        showDetails={true}
                        variant="simple"
                        variantStyle={currentStyle}
                        theme={currentTheme}
                      />
                    </div>
                  </PrintCard>
                </div>
              )}

              {/* Domain Stats Card */}
              {data.domainStats && (
                <div className={currentStyle === 'ticket' ? '' : 'bg-white rounded-2xl shadow-sm overflow-hidden'}>
                  <PrintCard 
                    ref={domainRef}
                    title={mainTitle}
                    total={data.domainStats.totalDuration}
                    categoryLabel="SCOPES"
                    subtitle={currentStyle === 'modern' || currentStyle === 'ticket' ? 'Scopes' : 'Scopes Statistics'}
                    isMobile={true}
                    variantStyle={currentStyle}
                    theme={currentTheme}
                  >
                    <div className="mt-4">
                      <PrintDonutChart 
                        data={data.domainStats} 
                        isMobile={true} 
                        showDetails={false} 
                        variant="progress"
                        variantStyle={currentStyle}
                        theme={currentTheme}
                      />
                    </div>
                  </PrintCard>
                </div>
              )}
            </>
          )}

          {!data && (
            <div className="flex flex-col items-center justify-center h-96 text-stone-400">
              <p className="text-sm">解析数据失败</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Options Area - 完全按照示例代码 */}
      <div className="bg-white px-4 py-6 space-y-6">
        
        {/* 主题色彩选择 */}
        <section>
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-3 tracking-wider font-serif">
            <Palette size={14} />
            主题色彩
          </div>
          <div className="flex justify-between gap-2">
            {Object.values(THEMES).map((theme) => (
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
                  style={{ backgroundColor: theme.primary }}
                />
              </button>
            ))}
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
              { key: 'classic' as PrintStyle, label: '经典' },
              { key: 'modern' as PrintStyle, label: '现代' },
              { key: 'retro' as PrintStyle, label: '复古' },
              { key: 'ticket' as PrintStyle, label: '票据' }
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

        {/* 导出选项 */}
        <section>
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-3 tracking-wider font-serif">
            <Download size={14} />
            导出选项
          </div>
          <div className="flex justify-between gap-2">
            <button 
              onClick={() => handleExportSingle(monthRef, `chrono-tags-${globalDateLabel}.png`, 'tags')}
              disabled={!!exportingState || !data?.monthStats}
              className={`flex-1 px-2 py-1.5 rounded-full text-[10px] font-medium border transition-all font-serif ${
                exportingState === 'tags'
                  ? 'bg-stone-100 border-stone-400 text-stone-900'
                  : 'border-stone-300 text-stone-600 hover:border-stone-400 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              {exportingState === 'tags' ? '导出中...' : '标签'}
            </button>

            <button 
              onClick={() => handleExportSingle(todoRef, `chrono-todos-${globalDateLabel}.png`, 'todos')}
              disabled={!!exportingState || !data?.todoStats}
              className={`flex-1 px-2 py-1.5 rounded-full text-[10px] font-medium border transition-all font-serif ${
                exportingState === 'todos'
                  ? 'bg-stone-100 border-stone-400 text-stone-900'
                  : 'border-stone-300 text-stone-600 hover:border-stone-400 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              {exportingState === 'todos' ? '导出中...' : '待办'}
            </button>

            <button 
              onClick={() => handleExportSingle(domainRef, `chrono-scopes-${globalDateLabel}.png`, 'scopes')}
              disabled={!!exportingState || !data?.domainStats}
              className={`flex-1 px-2 py-1.5 rounded-full text-[10px] font-medium border transition-all font-serif ${
                exportingState === 'scopes'
                  ? 'bg-stone-100 border-stone-400 text-stone-900'
                  : 'border-stone-300 text-stone-600 hover:border-stone-400 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              {exportingState === 'scopes' ? '导出中...' : '领域'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
