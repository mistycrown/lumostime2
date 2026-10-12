/**
 * @file ShareView.tsx
 * @description Share card generation view for exporting time records as beautiful images
 * @updated 2026-10-12: Adds unlocked share-only builtin/uploaded font capsules and embeds selected fonts in exports.
 * @updated 2026-10-12: Offers the circular book-page template only for one usable photo and passes through record titles.
 * @updated 2026-10-12: Adds independent text/photo entrances, template selections and photo-first defaults.
 * @updated 2026-10-12: Labels seamless photo stacking as 无缝长图.
 * @updated 2026-10-12: Offers both seamless and framed long-image layouts in the second selector row.
 * @updated 2026-10-12: Exports a disposable snapshot with embedded preview pixels and rejects unloaded images explicitly.
 * @updated 2026-10-12: Arranges layout buttons in four columns with the long-image option on the second row.
 * @updated 2026-10-12: Preserves local Blob image URLs during export instead of appending invalid cache-busting queries.
 * @updated 2026-10-12: Offers a full-width long-image layout when multiple photos are available.
 * @updated 2026-07-21: Raised the share overlay above record-detail modals so it remains the topmost visible view.
 */
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Download, Palette, Layout, Type } from 'lucide-react';
import { getFontEmbedCSS, toPng } from 'html-to-image';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Log, Scope } from '../types';
import type { ToastType } from '../components/Toast';
import { SHARE_THEMES, TEXT_SHARE_TEMPLATES, PHOTO_SHARE_TEMPLATES } from '../components/ShareCard/constants';
import { ShareCardContent, ShareLayoutMode } from '../components/ShareCard/types';
import { TemplateRenderer } from '../components/ShareCard/TemplateRenderer';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { imageService } from '../services/imageService';
import { createShareCardExportSnapshot } from '../utils/shareCardExport';
import { useSponsorshipUnlocked } from '../hooks/useSponsorshipUnlocked';
import { fontService, type FontOption } from '../services/fontService';
import '../components/ShareCard/shareCard.css';

interface ShareViewProps {
  log: Log;
  scopes?: Scope[];
  onBack: () => void;
  onToast?: (type: ToastType, message: string) => void;
}

export const ShareView: React.FC<ShareViewProps> = ({ log, onBack, onToast }) => {
  const { categories } = useCategoryScope();
  const [activeThemeId, setActiveThemeId] = useState<string>(SHARE_THEMES[0].id);
  const [layoutMode, setLayoutMode] = useState<ShareLayoutMode>(log.images?.length ? 'photo' : 'text');
  const [textTemplateId, setTextTemplateId] = useState(TEXT_SHARE_TEMPLATES[0].id);
  const [photoTemplateId, setPhotoTemplateId] = useState(PHOTO_SHARE_TEMPLATES[0].id);
  const [isExporting, setIsExporting] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const sponsorshipUnlocked = useSponsorshipUnlocked();
  const [fonts, setFonts] = useState<FontOption[]>([]);
  const [activeFontId, setActiveFontId] = useState('default');
  const [isLoadingFont, setIsLoadingFont] = useState(false);
  
  const previewRef = useRef<HTMLDivElement>(null);
  const activeTheme = SHARE_THEMES.find(t => t.id === activeThemeId) || SHARE_THEMES[0];
  const templates = layoutMode === 'text' ? TEXT_SHARE_TEMPLATES : PHOTO_SHARE_TEMPLATES;
  const activeTemplateId = layoutMode === 'text' ? textTemplateId : photoTemplateId;
  const availableTemplates = templates.filter(template => imageUrls.length >= (template.minImages || 0)
    && imageUrls.length <= (template.maxImages ?? Infinity));
  const activeFont = sponsorshipUnlocked && activeFontId !== 'default'
    ? fonts.find(font => font.id === activeFontId) : undefined;

  useEffect(() => {
    let cancelled = false;
    if (!sponsorshipUnlocked) {
      setFonts([]);
      setActiveFontId('default');
      return;
    }
    fontService.refreshCustomFonts().then(options => {
      if (!cancelled) setFonts(options);
    });
    return () => { cancelled = true; };
  }, [sponsorshipUnlocked]);

  useEffect(() => {
    let cancelled = false;
    if (!activeFont) {
      setIsLoadingFont(false);
      return;
    }
    setIsLoadingFont(true);
    Promise.all([400, 700].map(weight => document.fonts.load(`${weight} 16px ${activeFont.fontFamily}`)))
      .catch(error => {
        if (!cancelled) {
          console.warn('Share font failed to load:', error);
          setActiveFontId('default');
          onToast?.('error', '字体加载失败，请重新选择');
        }
      })
      .finally(() => { if (!cancelled) setIsLoadingFont(false); });
    return () => { cancelled = true; };
  }, [activeFont]);

  // Load image URLs
  useEffect(() => {
    let cancelled = false;
    const loadImages = async () => {
      if (!log.images || log.images.length === 0) {
        setImageUrls([]);
        setIsLoadingImages(false);
        return;
      }

      setIsLoadingImages(true);
      const urls: string[] = [];
      
      for (const img of log.images) {
        const url = await imageService.getImageUrl(img);
        if (url) {
          urls.push(url);
        }
      }
      
      if (!cancelled) {
        setImageUrls(urls);
        setIsLoadingImages(false);
      }
    };

    loadImages();
    return () => { cancelled = true; };
  }, [log.images]);

  useEffect(() => {
    if (isLoadingImages) return;
    if (imageUrls.length === 0) setLayoutMode('text');
    const selected = PHOTO_SHARE_TEMPLATES.find(template => template.id === photoTemplateId);
    if (imageUrls.length < (selected?.minImages || 0) || imageUrls.length > (selected?.maxImages ?? Infinity)) {
      setPhotoTemplateId(PHOTO_SHARE_TEMPLATES[0].id);
    }
  }, [imageUrls.length, isLoadingImages, photoTemplateId]);

  // Convert Log to ShareCardContent
  const getShareContent = (): ShareCardContent => {
    const cat = categories.find(c => c.id === log.categoryId);
    const act = cat?.activities.find(a => a.id === log.activityId);
    
    // Get activity name (without icon to keep it clean)
    const activityText = act ? act.name : '';
    
    // Format date
    const startDate = new Date(log.startTime);
    const dateStr = startDate.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Get body text from note
    let bodyText = log.note || '';
    
    // Remove #Title# pattern if exists
    bodyText = bodyText.replace(/#[^#]+#/, '').trim();
    
    // If no body text, use a default message
    if (!bodyText && layoutMode === 'text') {
      bodyText = '这是一段美好的时光记录。';
    }
    
    return {
      title: log.title?.trim() || log.note?.match(/#([^#]+)#/)?.[1].trim() || '',
      body: bodyText,
      images: layoutMode === 'photo' ? imageUrls : [],
      date: dateStr,
      activity: activityText,
      domain: '' // Remove domain to keep UI clean
    };
  };

  const content = getShareContent();

  const downloadImage = async () => {
    if (previewRef.current === null || isExporting || isLoadingFont) return;
    
    setIsExporting(true);
    try {
      const options = { 
        // Stored photos already have unique Blob URLs; appending a query makes them unreadable.
        cacheBust: false,
        pixelRatio: 2,
        useCORS: true,
        backgroundColor: activeTemplateId === 'glass-morphism' ? 'transparent' : activeTheme.backgroundColor
      };

      const snapshot = await createShareCardExportSnapshot(previewRef.current, options.pixelRatio);
      let dataUrl: string;
      try {
        const exportFont = activeFont || fontService.getCurrentFontOption();
        const customFontCSS = await fontService.getFontEmbedCSS(exportFont.id);
        if (exportFont.source === 'uploaded' && !customFontCSS) {
          throw new Error('无法读取导入字体，请重新选择字体');
        }
        const embeddedFontCSS = await getFontEmbedCSS(snapshot.node).catch(error => {
          console.warn('Share font CSS could not be collected:', error);
          return '';
        });
        const fontEmbedCSS = [embeddedFontCSS, customFontCSS].filter(Boolean).join('\n');
        const exportOptions = { ...options, fontEmbedCSS: fontEmbedCSS || undefined };
        try {
          dataUrl = await toPng(snapshot.node, exportOptions);
        } catch (firstErr) {
          console.warn('First export attempt failed, retrying with skipFonts...', firstErr);
          try {
            dataUrl = await toPng(snapshot.node, { ...exportOptions, skipFonts: true });
          } catch (secondErr) {
            console.error('Second export attempt also failed:', secondErr);
            throw new Error('图片导出失败，请重试');
          }
        }
      } finally {
        snapshot.dispose();
      }
      
      const isNative = Capacitor.isNativePlatform();
      
      if (isNative) {
        // 移动端：保存到 Pictures 目录
        try {
          const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
          const randomStr = Math.random().toString(36).substring(2, 8);
          const filename = `LumosTime_${randomStr}.png`;
          
          await Filesystem.writeFile({
            path: `Pictures/LumosTime/${filename}`,
            data: base64Data,
            directory: Directory.ExternalStorage,
            recursive: true
          });
          
          // 使用自定义 Toast
          if (onToast) {
            onToast('success', '图片已保存到相册');
          } else {
            alert('图片已保存到相册');
          }
          
        } catch (err: any) {
          console.error('Failed to save image:', err);
          if (onToast) {
            onToast('error', '保存失败：' + (err.message || '请检查存储权限'));
          } else {
            alert('保存图片失败：' + (err.message || '请检查存储权限'));
          }
        }
      } else {
        // 桌面端/Web端：直接下载
        const link = document.createElement('a');
        const randomStr = Math.random().toString(36).substring(2, 8);
        link.download = `lumostime-share-${randomStr}.png`;
        link.href = dataUrl;
        link.click();
        
        if (onToast) {
          onToast('success', '图片已下载');
        }
      }
      
    } catch (err) {
      console.error("Could not download image", err);
      const message = err instanceof Error ? err.message : '保存图片失败';
      if (onToast) {
        onToast('error', message);
      } else {
        alert(message);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[230] bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[var(--app-safe-area-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md z-10">
        <button
          onClick={onBack}
          className="text-stone-400 hover:text-stone-600 p-1"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-stone-800 font-bold text-lg flex-1 text-center">分享卡片</span>
        <button
          onClick={downloadImage}
          disabled={isExporting || isLoadingImages || isLoadingFont}
          className="text-stone-400 hover:text-stone-600 p-1 disabled:opacity-50 relative"
          title={isExporting ? '生成中...' : '保存'}
        >
          {isExporting ? (
            <div className="w-5 h-5 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
          ) : (
            <Download size={20} />
          )}
        </button>
      </div>

      <div role="tablist" aria-label="分享排版" className="flex-shrink-0 flex justify-center gap-10 px-4 bg-[#fdfbf7] border-b border-stone-100">
        {([{ id: 'text', label: '纯文字' }, { id: 'photo', label: '图文' }] as const).map(mode => (
          <button key={mode.id} role="tab" aria-selected={layoutMode === mode.id}
            disabled={isExporting || isLoadingImages || (mode.id === 'photo' && imageUrls.length === 0)}
            onClick={() => setLayoutMode(mode.id)}
            className={`px-5 py-3 text-sm border-b-2 transition-colors disabled:opacity-30 ${layoutMode === mode.id
              ? 'border-stone-700 text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-700'}`}>
            {mode.label}
          </button>
        ))}
      </div>

      {/* Preview Area - 预览区域（可滚动） */}
      <div 
        className="flex-1 overflow-y-auto py-8 px-4"
        style={{
          backgroundColor: activeTemplateId === 'glass-morphism' ? 'transparent' : '#f5f5f4'
        }}
      >
        <div className="w-full max-w-[400px] mx-auto">
          {isLoadingImages ? (
            <div className="text-stone-400 text-sm text-center">加载图片中...</div>
          ) : (
            <div className="w-full shadow-2xl">
              <div 
                ref={previewRef}
                className={`w-full${activeFont ? ' share-card-selected-font' : ''}`}
                style={{ 
                  backgroundColor: activeTemplateId === 'glass-morphism' ? 'transparent' : activeTheme.backgroundColor,
                  fontFamily: activeTheme.fontFamily === 'font-serif' ? '"Noto Serif SC", "Playfair Display", serif' : '"Inter", "Noto Sans SC", sans-serif',
                  '--share-card-font-family': activeFont?.fontFamily
                } as React.CSSProperties}
              >
                <TemplateRenderer 
                  mode={layoutMode}
                  content={content} 
                  theme={activeTheme} 
                  templateId={activeTemplateId} 
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls Area - 底部选项区（固定） */}
      <div className="flex-shrink-0 bg-white px-4 py-4 space-y-4 border-t border-stone-100">
          {/* Theme Selector */}
          <section>
            <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-3 uppercase tracking-wider">
              <Palette size={14} /> 主题色彩
            </div>
            <div className="flex justify-between gap-2">
              {SHARE_THEMES.map(theme => (
                <button
                  key={theme.id}
                  title={theme.name}
                  aria-label={theme.name}
                  disabled={isExporting}
                  onClick={() => setActiveThemeId(theme.id)}
                  className={`flex-1 flex items-center justify-center transition-all ${
                    activeThemeId === theme.id ? 'scale-110' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      activeThemeId === theme.id ? 'ring-2 ring-offset-2 ring-stone-400' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: theme.primaryColor }}
                  />
                </button>
              ))}
            </div>
          </section>

          {/* Template Selector */}
          <section>
            <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-3 uppercase tracking-wider">
              <Layout size={14} /> 布局模版
            </div>
            <div className="grid grid-cols-4 gap-2">
              {availableTemplates.map(template => (
                <button
                  key={template.id}
                  disabled={isExporting}
                  aria-pressed={activeTemplateId === template.id}
                  onClick={() => layoutMode === 'text' ? setTextTemplateId(template.id) : setPhotoTemplateId(template.id)}
                  className={`px-2 py-1.5 rounded-full text-[10px] font-medium border transition-all ${
                    activeTemplateId === template.id 
                      ? 'bg-stone-100 border-stone-400 text-stone-900' 
                      : 'border-stone-300 text-stone-600 hover:border-stone-400'
                  }`}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </section>
          {sponsorshipUnlocked && (
            <section aria-label="分享字体">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-3 uppercase tracking-wider">
                <Type size={14} /> 字体
              </div>
              <div className="share-card-font-options flex gap-2 overflow-x-auto pb-1 touch-pan-x">
                {fonts.map(font => {
                  const characters = Array.from(font.displayName);
                  const label = characters.length > 4 ? `${characters.slice(0, 4).join('')}…` : font.displayName;
                  return (
                    <button key={font.id} title={font.displayName} aria-label={font.displayName}
                      aria-pressed={activeFontId === font.id} disabled={isExporting}
                      onClick={() => setActiveFontId(font.id)}
                      style={{ fontFamily: font.fontFamily }}
                      className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-xs border transition-colors ${activeFontId === font.id
                        ? 'bg-stone-100 border-stone-400 text-stone-900' : 'border-stone-300 text-stone-600 hover:border-stone-400'}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
    </div>
  );
};
