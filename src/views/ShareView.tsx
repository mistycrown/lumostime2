/**
 * @file ShareView.tsx
 * @description Share card generation view for exporting time records as beautiful images
 */
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Download, Palette, Layout } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Log } from '../types';
import { SHARE_THEMES, SHARE_TEMPLATES } from '../components/ShareCard/constants';
import { ShareCardContent } from '../components/ShareCard/types';
import { TemplateRenderer } from '../components/ShareCard/TemplateRenderer';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { imageService } from '../services/imageService';

interface ShareViewProps {
  log: Log;
  onBack: () => void;
}

export const ShareView: React.FC<ShareViewProps> = ({ log, onBack }) => {
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
      // Wait for images to be fully rendered
      await new Promise(r => setTimeout(r, 500));

      // Use html2canvas which handles Base64 images better
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: activeTheme.backgroundColor,
        scale: 2, // High quality
        useCORS: false, // Don't use CORS for Base64 images
        allowTaint: true, // Allow tainted canvas (needed for Base64)
        logging: false,
        imageTimeout: 0,
        removeContainer: true
      });

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `lumostime-share-${Date.now()}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png', 1.0);
      
    } catch (err) {
      console.error("Could not download image", err);
      alert("保存图片失败。请稍后重试。");
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
        <button
          onClick={onBack}
          className="text-stone-400 hover:text-stone-600 p-1"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-stone-800 font-bold text-lg flex-1 text-center">分享卡片</span>
        <button
          onClick={downloadImage}
          disabled={isExporting}
          className="text-stone-400 hover:text-stone-600 p-1 disabled:opacity-50"
          title={isExporting ? '处理中...' : '保存'}
        >
          <Download size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Preview Area */}
        <div className="bg-stone-100 py-8 px-4 flex items-center justify-center min-h-[50vh]">
          {isLoadingImages ? (
            <div className="text-stone-400 text-sm">加载图片中...</div>
          ) : (
            <div className="aspect-[3/4] w-full max-w-[400px] shadow-2xl">
              <div 
                ref={previewRef}
                className="w-full h-full overflow-hidden"
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

        {/* Controls Area */}
        <div className="bg-white px-4 py-6 space-y-6">
          {/* Theme Selector */}
          <section>
            <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-3 uppercase tracking-wider">
              <Palette size={14} /> 主题色彩
            </div>
            <div className="flex justify-between items-start px-2">
              {SHARE_THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setActiveThemeId(theme.id)}
                  className={`flex flex-col items-center gap-2 transition-all ${
                    activeThemeId === theme.id ? 'scale-110' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      activeThemeId === theme.id ? 'ring-2 ring-offset-2 ring-stone-400' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: theme.primaryColor }}
                  />
                  <span className="text-[10px] text-stone-600 text-center leading-tight">{theme.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Template Selector */}
          <section>
            <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-3 uppercase tracking-wider">
              <Layout size={14} /> 布局模版
            </div>
            <div className="grid grid-cols-1 gap-2">
              {SHARE_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => setActiveTemplateId(template.id)}
                  className={`px-4 py-3 rounded-xl text-left text-sm border transition-all ${
                    activeTemplateId === template.id 
                      ? 'bg-stone-50 border-stone-400 font-medium' 
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <span className="block text-stone-800">{template.name}</span>
                  <span className="text-xs text-stone-400 font-light">{template.description}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
