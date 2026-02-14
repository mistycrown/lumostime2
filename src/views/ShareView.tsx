/**
 * @file ShareView.tsx
 * @description Share card generation view for exporting time records as beautiful images
 */
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Download, Palette, Layout } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Log, ToastType } from '../types';
import { SHARE_THEMES, SHARE_TEMPLATES } from '../components/ShareCard/constants';
import { ShareCardContent } from '../components/ShareCard/types';
import { TemplateRenderer } from '../components/ShareCard/TemplateRenderer';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { imageService } from '../services/imageService';

interface ShareViewProps {
  log: Log;
  onBack: () => void;
  onToast?: (type: ToastType, message: string) => void;
}

export const ShareView: React.FC<ShareViewProps> = ({ log, onBack, onToast }) => {
  const { categories } = useCategoryScope();
  const [activeThemeId, setActiveThemeId] = useState<string>(SHARE_THEMES[0].id);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(SHARE_TEMPLATES[0].id);
  const [isExporting, setIsExporting] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  
  const previewRef = useRef<HTMLDivElement>(null);
  const activeTheme = SHARE_THEMES.find(t => t.id === activeThemeId) || SHARE_THEMES[0];

  // Load image URLs
  useEffect(() => {
    const loadImages = async () => {
      if (!log.images || log.images.length === 0) {
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
      
      setImageUrls(urls);
      setIsLoadingImages(false);
    };

    loadImages();
  }, [log.images]);

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
    if (!bodyText) {
      bodyText = '这是一段美好的时光记录。';
    }
    
    return {
      body: bodyText,
      images: imageUrls, // Use loaded image URLs instead of filenames
      date: dateStr,
      activity: activityText,
      domain: '' // Remove domain to keep UI clean
    };
  };

  const content = getShareContent();

  const downloadImage = async () => {
    if (previewRef.current === null || isExporting) return;
    
    setIsExporting(true);
    try {
      // 减少延迟时间，加快生成速度
      await new Promise(r => setTimeout(r, 100));

      const options = { 
        cacheBust: true, 
        pixelRatio: 2, // 降低到 2 以提升速度，质量仍然很好
        useCORS: true,
        backgroundColor: activeTheme.backgroundColor
      };

      let dataUrl: string;
      try {
        dataUrl = await toPng(previewRef.current, options);
      } catch (firstErr) {
        console.warn("First export attempt failed, retrying with skipFonts...", firstErr);
        dataUrl = await toPng(previewRef.current, { ...options, skipFonts: true });
      }
      
      const isNative = Capacitor.isNativePlatform();
      
      if (isNative) {
        // 移动端：保存到 Pictures 目录
        try {
          const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
          const filename = `LumosTime_${Date.now()}.png`;
          
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
        link.download = `lumostime-share-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        
        if (onToast) {
          onToast('success', '图片已下载');
        }
      }
      
    } catch (err) {
      console.error("Could not download image", err);
      if (onToast) {
        onToast('error', '保存图片失败');
      } else {
        alert("保存图片失败。请稍后重试。");
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
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
          disabled={isExporting || isLoadingImages}
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

      {/* Preview Area - 预览区域（可滚动） */}
      <div className="flex-1 overflow-y-auto bg-stone-100 py-8 px-4">
        <div className="w-full max-w-[400px] mx-auto">
          {isLoadingImages ? (
            <div className="text-stone-400 text-sm text-center">加载图片中...</div>
          ) : (
            <div className="w-full shadow-2xl">
              <div 
                ref={previewRef}
                className="w-full"
                style={{ 
                  backgroundColor: activeTheme.backgroundColor,
                  fontFamily: activeTheme.fontFamily === 'font-serif' ? '"Noto Serif SC", "Playfair Display", serif' : '"Inter", "Noto Sans SC", sans-serif'
                }}
              >
                <TemplateRenderer 
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
      <div className="flex-shrink-0 bg-white px-4 py-6 space-y-6 border-t border-stone-100">
          {/* Theme Selector */}
          <section>
            <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-3 uppercase tracking-wider">
              <Palette size={14} /> 主题色彩
            </div>
            <div className="flex justify-between gap-2">
              {SHARE_THEMES.map(theme => (
                <button
                  key={theme.id}
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
            <div className="flex justify-between gap-2">
              {[
                { id: 'magazine-classic', label: '经典' },
                { id: 'vertical-poetry', label: '古韵' },
                { id: 'minimal-note', label: '现代' },
                { id: 'modern-split', label: '分割' },
                { id: 'film-story', label: '变迁' }
              ].map(template => (
                <button
                  key={template.id}
                  onClick={() => setActiveTemplateId(template.id)}
                  className={`flex-1 px-2 py-1.5 rounded-full text-[10px] font-medium border transition-all ${
                    activeTemplateId === template.id 
                      ? 'bg-stone-100 border-stone-400 text-stone-900' 
                      : 'border-stone-300 text-stone-600 hover:border-stone-400'
                  }`}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </section>
        </div>
    </div>
  );
};
