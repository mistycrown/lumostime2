/**
 * @file ChronoPrintView.tsx
 * @description Statistics share preview view used to export chart cards as images.
 *
 * 修改历史:
 * - 2026-03-11: 修复统计分享页解析失败空白的问题，并清理历史乱码文案。
 */
import React, { useState, useEffect, useRef } from 'react';
import { Palette, LayoutTemplate, Download } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { parseInputText, extractDateFromTitle, THEMES, ColorTheme } from '../components/ChronoPrint/utils';
import { ParsedData } from '../components/ChronoPrint/types';
import { PrintCard, PrintBarChart, PrintDonutChart, PrintStyle } from '../components/ChronoPrint/PrintComponents';
import { getFontEmbedCSS, toPng } from 'html-to-image';
import { fontService } from '../services/fontService';
import type { ToastType } from '../components/Toast';

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;800;900&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=DM+Serif+Display:ital@0;1&display=swap';
const FONT_READY_TIMEOUT = 3000;
const IMAGE_READY_TIMEOUT = 3000;
const EXPORT_RENDER_DELAY = 200;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const waitForFonts = async () => {
  if (!document.fonts?.ready) {
    return;
  }

  await Promise.race([
    document.fonts.ready,
    wait(FONT_READY_TIMEOUT)
  ]);
};

const waitForImages = async (container: HTMLElement) => {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(images.map((img) => {
    if (img.complete) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      window.setTimeout(resolve, IMAGE_READY_TIMEOUT);
    });
  }));
};

interface ChronoPrintViewProps {
  inputText: string;
  onBack: () => void;
  onToast?: (type: ToastType, message: string) => void;
}

export const ChronoPrintView: React.FC<ChronoPrintViewProps> = ({ inputText, onBack, onToast }) => {
  const [data, setData] = useState<ParsedData | null>(null);
  const [globalDateLabel, setGlobalDateLabel] = useState<string>('');
  const [mainTitle, setMainTitle] = useState<string>('');
  const [exportingState, setExportingState] = useState<string | null>(null);
  const [currentStyle, setCurrentStyle] = useState<PrintStyle>('classic');
  const [currentTheme, setCurrentTheme] = useState<ColorTheme>(THEMES.ink);

  const monthRef = useRef<HTMLDivElement>(null);
  const todoRef = useRef<HTMLDivElement>(null);
  const domainRef = useRef<HTMLDivElement>(null);
  const exportSerifFontFamily = typeof window === 'undefined'
    ? `'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'STSong', 'SimSun', serif`
    : (
      getComputedStyle(document.documentElement).getPropertyValue('--font-family').trim()
      || getComputedStyle(document.body).fontFamily.trim()
      || `'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'STSong', 'SimSun', serif`
    );

  useEffect(() => {
    const loadFonts = async () => {
      if (document.getElementById('dynamic-fonts')) return;

      try {
        const response = await fetch(FONT_URL);
        const css = await response.text();
        const style = document.createElement('style');
        style.id = 'dynamic-fonts';
        style.textContent = css;
        document.head.appendChild(style);
      } catch (error) {
        console.error('Failed to load fonts:', error);
      }
    };

    loadFonts();
  }, []);

  useEffect(() => {
    const parsed = parseInputText(inputText);
    setData(parsed);

    if (parsed.monthStats) {
      setGlobalDateLabel(extractDateFromTitle(parsed.monthStats.title));
      setMainTitle(parsed.monthStats.title);
    } else {
      setGlobalDateLabel('');
      setMainTitle('');
    }
  }, [inputText]);

  const handleExportSingle = async (ref: React.RefObject<HTMLDivElement>, filename: string, key: string) => {
    if (exportingState || !ref.current) return;
    setExportingState(key);
    const exportNode = ref.current;

    try {
      const bgColor = currentStyle === 'ticket'
        ? undefined
        : currentStyle === 'retro'
          ? currentTheme.bg
          : '#ffffff';

      exportNode.dataset.exporting = 'true';
      await waitForFonts();
      await waitForImages(exportNode);
      await wait(EXPORT_RENDER_DELAY);

      const [embeddedFontCSS, customFontCSS] = await Promise.all([
        getFontEmbedCSS(exportNode).catch((error) => {
          console.warn('ChronoPrint failed to collect embedded font CSS.', error);
          return '';
        }),
        fontService.getCurrentFontEmbedCSS().catch((error) => {
          console.warn('ChronoPrint failed to collect custom font CSS.', error);
          return '';
        })
      ]);
      const fontEmbedCSS = [embeddedFontCSS, customFontCSS].filter(Boolean).join('\n');

      const options = {
        cacheBust: true,
        pixelRatio: 2,
        useCORS: true,
        backgroundColor: bgColor,
        skipAutoScale: true,
        fontEmbedCSS: fontEmbedCSS || undefined
      };

      let dataUrl: string;
      try {
        dataUrl = await toPng(exportNode, options);
      } catch (firstError) {
        console.warn('ChronoPrint export failed on first attempt, retrying with skipFonts.', firstError);
        const fallbackOptions = fontEmbedCSS
          ? options
          : { ...options, skipFonts: true };
        dataUrl = await toPng(exportNode, fallbackOptions);
      }

      if (Capacitor.isNativePlatform()) {
        try {
          const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
          await Filesystem.writeFile({
            path: `Pictures/LumosTime/${filename}`,
            data: base64Data,
            directory: Directory.ExternalStorage,
            recursive: true
          });
          onToast?.('success', '图片已保存到相册');
        } catch (error: any) {
          console.error('Failed to save image:', error);
          onToast?.('error', '保存失败：' + (error.message || '请检查存储权限'));
        }
      } else {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
        onToast?.('success', '图片已下载');
      }
    } catch (error) {
      console.error(`Failed to export ${filename}:`, error);
      onToast?.('error', '导出失败');
    } finally {
      delete exportNode.dataset.exporting;
      setExportingState(null);
    }
  };

  const hasRenderableCards = Boolean(data?.monthStats || data?.todoStats || data?.domainStats);

  return (
    <div className="chrono-print-view fixed inset-0 bg-[#faf9f6] flex flex-col text-slate-800 font-sans z-50">
      <style>{`
        .chrono-print-view .font-display,
        .chrono-print-view .font-serif {
          font-family: ${exportSerifFontFamily} !important;
        }

        .chrono-print-view .font-sans {
          font-family: 'Inter', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', sans-serif !important;
        }

        .chrono-print-view .font-mono {
          font-family: 'Space Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace !important;
        }

        .chrono-print-view [data-exporting='true'] .chrono-print-item-name,
        .chrono-print-view [data-exporting='true'] .chrono-print-subitem-name {
          display: block;
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: clip !important;
          word-break: break-word;
        }
      `}</style>

      <div className="flex-shrink-0 pt-[var(--app-safe-area-top)]">
        <div className="flex items-center justify-between gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
          <button
            onClick={onBack}
            className="text-stone-400 hover:text-stone-600 p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <span className="text-stone-800 font-bold text-lg flex-1 text-center font-serif">分享统计</span>
          <div className="w-10" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto space-y-4">
          {hasRenderableCards && (
            <>
              {data?.monthStats && (
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

              {data?.todoStats && (
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

              {data?.domainStats && (
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

          {!hasRenderableCards && (
            <div className="flex flex-col items-center justify-center h-96 text-stone-400">
              <p className="text-sm">统计数据解析失败</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white px-4 py-6 space-y-6">
        <section>
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-3 tracking-wider font-serif">
            <Palette size={14} />
            主题色彩
          </div>
          <div className="flex justify-between gap-2">
            {Object.values(THEMES).map(theme => (
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
            ].map(style => (
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

        <section>
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-3 tracking-wider font-serif">
            <Download size={14} />
            导出选项
          </div>
          <div className="flex justify-between gap-2">
            <button
              onClick={() => {
                const randomStr = Math.random().toString(36).substring(2, 8);
                handleExportSingle(monthRef, `chrono-tags-${globalDateLabel}-${randomStr}.png`, 'tags');
              }}
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
              onClick={() => {
                const randomStr = Math.random().toString(36).substring(2, 8);
                handleExportSingle(todoRef, `chrono-todos-${globalDateLabel}-${randomStr}.png`, 'todos');
              }}
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
              onClick={() => {
                const randomStr = Math.random().toString(36).substring(2, 8);
                handleExportSingle(domainRef, `chrono-scopes-${globalDateLabel}-${randomStr}.png`, 'scopes');
              }}
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
