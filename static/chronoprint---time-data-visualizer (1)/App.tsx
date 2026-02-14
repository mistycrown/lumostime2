import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Download, Image as ImageIcon, Layers, CheckSquare, Tag, LayoutTemplate, Palette } from 'lucide-react';
import { parseInputText, extractDateFromTitle, THEMES, ColorTheme } from './utils';
import { ParsedData } from './types';
import { PrintCard, PrintBarChart, PrintDonutChart, PrintStyle } from './components/PrintComponents';
import { toPng } from 'html-to-image';

const DEFAULT_INPUT = `## 📊 2026/2/1 - Month 统计
**总时长**: 131小时 32分钟

- **[学习]** 34小时 23分钟 (26.1%)
    * 上课开会: 13小时 8分钟
    * 网课自学: 10小时 57分钟
    * 书籍文献: 7小时 13分钟
    * 代码编程: 3小时 4分钟

- **[睡眠]** 31小时 26分钟 (23.9%)
    * 睡觉: 29小时 26分钟
    * 小憩: 2小时 0分钟

- **[生活]** 24小时 36分钟 (18.7%)
    * 通勤: 10小时 25分钟
    * 饮食: 9小时 48分钟
    * 洗护: 3小时 35分钟
    * 家务: 26分钟

- **[爱欲再生产]** 17小时 35分钟 (13.4%)
    * 网上冲浪: 9小时 3分钟
    * 玩玩游戏: 4小时 3分钟
    * 不可名状: 2小时 29分钟
    * 看文看剧: 2小时 0分钟

- **[与自己]** 15小时 28分钟 (11.8%)
    * 整理收集: 5小时 31分钟
    * 工具开发: 3小时 36分钟
    * 运动健身: 3小时 19分钟
    * 日记复盘: 3小时 1分钟

- **[探索世界]** 6小时 0分钟 (4.6%)
    * 设计: 1小时 0分钟

- **[与他人]** 2小时 0分钟 (1.5%)
    * 兼职工作: 1小时 0分钟
    * 社会织网: 1小时 0分钟

## 📋 待办专注分布
**待办总时长**: 9小时 12分钟

- **[生活杂务]** 2小时 59分钟 (32.6%)
    * Can Unconfident LLM Annotations Be Used for Confident Conclusions?: 2小时 59分钟

- **[学习计划]** 2小时 14分钟 (24.3%)
    * 巧做洋八股: 2小时 14分钟

- **[毕业论文]** 17分钟 (3.2%)
    * 文化几何学 写作: 17分钟

## 🎯 领域专注分布
**领域总时长**: 37小时 49分钟

- **[博士课题]** 10小时 18分钟 (27.3%)
- **[AI玩具]** 8小时 6分钟 (21.4%)
- **[专业输入]** 6小时 6分钟 (16.1%)
- **[博雅通识]** 5小时 19分钟 (14.1%)`;

// Removed 'Special Elite' and 'Courier Prime' as requested for a cleaner Serif style
const FONT_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;800;900&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=DM+Serif+Display:ital@0;1&display=swap";

const App: React.FC = () => {
  const [inputText, setInputText] = useState(DEFAULT_INPUT);
  const [data, setData] = useState<ParsedData | null>(null);
  const [globalDateLabel, setGlobalDateLabel] = useState<string>("2026-2");
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
      // Ticket style needs transparent background for the serrated edge transparency to work
      const bgColor = currentStyle === 'ticket' ? undefined : (currentStyle === 'retro' ? currentTheme.bg : '#ffffff');

      // Use pixelRatio for better quality
      const dataUrl = await toPng(ref.current, { 
        cacheBust: true, 
        pixelRatio: 2.5, // Higher quality
        backgroundColor: bgColor,
        skipAutoScale: true,
      });
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(`Failed to export ${filename}:`, err);
    } finally {
      setExportingState(null);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col lg:flex-row text-slate-800 font-sans">
      <style>{`
        .font-mono { font-family: 'Space Mono', monospace; }
      `}</style>
      
      {/* Sidebar / Input Area */}
      <div className="w-full lg:w-1/3 bg-white border-r border-neutral-200 flex flex-col h-screen sticky top-0 print:hidden z-10">
        <div className="p-6 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded-sm font-serif font-bold text-xl">
              C
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">ChronoPrint</h1>
          </div>
          <p className="text-sm text-neutral-500">
            Paste your structured time-tracking text below.
          </p>
        </div>
        
        <div className="flex-1 p-0 relative">
          <textarea
            className="w-full h-full resize-none p-6 text-sm font-mono leading-relaxed focus:outline-none bg-white text-neutral-700"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            spellCheck={false}
          />
        </div>

        <div className="p-6 border-t border-neutral-200 bg-neutral-50 flex gap-4">
           <button 
             onClick={() => setInputText(DEFAULT_INPUT)}
             className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-colors"
           >
             <RefreshCw size={14} /> Reset Data
           </button>
           <div className="flex-1"></div>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 bg-neutral-200 p-4 md:p-8 overflow-y-auto print:p-0 print:bg-white print:overflow-visible">
        <div className="max-w-6xl mx-auto print:max-w-none flex flex-col items-center">
          
          {/* Toolbar */}
          <div className="w-full max-w-[420px] flex flex-col gap-3 mb-6 print:hidden sticky top-0 z-20">
            
            {/* Top Row: Style & Export */}
            <div className="flex justify-between items-center bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-2 border border-neutral-200/60">
               {/* Style Switcher */}
               <div className="flex bg-neutral-100 rounded-lg p-1 overflow-x-auto">
                  {(['classic', 'modern', 'retro', 'ticket'] as PrintStyle[]).map((style) => (
                    <button
                      key={style}
                      onClick={() => setCurrentStyle(style)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all whitespace-nowrap ${
                        currentStyle === style 
                          ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-black/5' 
                          : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
               </div>

               {/* Export Buttons */}
               <div className="flex gap-2 pl-4 border-l border-neutral-200 flex-shrink-0">
                <button 
                    onClick={() => handleExportSingle(monthRef, `chrono-tags-${globalDateLabel}.png`, 'tags')}
                    disabled={!!exportingState || !data?.monthStats}
                    className="text-neutral-600 w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-100 transition-all disabled:opacity-50"
                    title="Export Tags"
                >
                    {exportingState === 'tags' ? <RefreshCw size={16} className="animate-spin" /> : <Tag size={16} />}
                </button>

                <button 
                    onClick={() => handleExportSingle(todoRef, `chrono-todos-${globalDateLabel}.png`, 'todos')}
                    disabled={!!exportingState || !data?.todoStats}
                    className="text-neutral-600 w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-100 transition-all disabled:opacity-50"
                    title="Export Todos"
                >
                    {exportingState === 'todos' ? <RefreshCw size={16} className="animate-spin" /> : <CheckSquare size={16} />}
                </button>

                <button 
                    onClick={() => handleExportSingle(domainRef, `chrono-scopes-${globalDateLabel}.png`, 'scopes')}
                    disabled={!!exportingState || !data?.domainStats}
                    className="text-neutral-600 w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-100 transition-all disabled:opacity-50"
                    title="Export Scopes"
                >
                    {exportingState === 'scopes' ? <RefreshCw size={16} className="animate-spin" /> : <Layers size={16} />}
                </button>
               </div>
            </div>

            {/* Bottom Row: Theme Colors */}
            <div className="flex justify-center items-center bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-2 border border-neutral-200/60">
              <div className="flex items-center gap-3">
                <Palette size={14} className="text-neutral-400" />
                <div className="flex gap-2 flex-wrap justify-center">
                  {Object.values(THEMES).map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() => setCurrentTheme(theme)}
                      title={theme.label}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                        currentTheme.name === theme.name ? 'border-neutral-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: theme.primary }}
                    />
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Visualization Canvas - Always Mobile/Narrow View for Vertical Export */}
          {data && (
            <div className="w-full max-w-[420px] transition-all duration-300 ease-in-out">
              <div className="grid gap-6 print:gap-8 grid-cols-1">
                
                {/* Month Stats */}
                {data.monthStats && (
                  <div className="col-span-1">
                    <PrintCard 
                      ref={monthRef}
                      title={mainTitle || data.monthStats.title} 
                      total={data.monthStats.totalDuration}
                      categoryLabel="TAGS"
                      subtitle="Tag Statistics"
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

                {/* Todo Stats */}
                {data.todoStats && (
                  <div className="print:break-inside-avoid">
                    <PrintCard 
                      ref={todoRef}
                      title={mainTitle} // Force consistent title
                      total={data.todoStats.totalDuration}
                      categoryLabel="TODOS"
                      subtitle="To Do Statistics"
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

                {/* Domain Stats */}
                {data.domainStats && (
                  <div className="print:break-inside-avoid">
                    <PrintCard 
                      ref={domainRef}
                      title={mainTitle} // Force consistent title
                      total={data.domainStats.totalDuration}
                      categoryLabel="SCOPES"
                      subtitle="Scopes Statistics"
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
              </div>
            </div>
          )}

          {!data && (
            <div className="flex flex-col items-center justify-center h-96 text-neutral-400">
              <p>Parsing error or empty data.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default App;