import React, { useState, useRef, useEffect } from 'react';
import { Layout, Palette, Type, Image as ImageIcon, Download, X, Plus, Smartphone, Monitor, Square, Ratio, Crop, Share } from 'lucide-react';
import { INITIAL_CONTENT, THEMES, TEMPLATES } from './constants';
import { CardContent, Theme, Template, AspectRatio } from './types';
import { TemplateRenderer } from './components/TemplateRenderer';
import { GeminiWriter } from './components/GeminiWriter';
import { toPng } from 'html-to-image';

const App: React.FC = () => {
  const [content, setContent] = useState<CardContent>(INITIAL_CONTENT);
  const [activeThemeId, setActiveThemeId] = useState<string>(THEMES[0].id);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(TEMPLATES[0].id);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3/4');
  const [isExporting, setIsExporting] = useState(false);
  
  const previewRef = useRef<HTMLDivElement>(null);
  const activeTheme = THEMES.find(t => t.id === activeThemeId) || THEMES[0];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setContent(prev => ({
        ...prev,
        images: [...prev.images, imageUrl]
      }));
    }
  };

  const removeImage = (index: number) => {
    setContent(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const downloadImage = async () => {
    if (previewRef.current === null || isExporting) return;
    
    setIsExporting(true);
    try {
      // Increased delay to 300ms to allow fonts and layout to settle completely before capture
      await new Promise(r => setTimeout(r, 300));

      const options = { 
        cacheBust: true, 
        pixelRatio: 3, // Higher quality for mobile
        useCORS: true, // Crucial for external images
        backgroundColor: activeTheme.backgroundColor // Prevent transparent backgrounds
      };

      try {
        const dataUrl = await toPng(previewRef.current, options);
        triggerDownload(dataUrl);
      } catch (firstErr) {
        console.warn("First export attempt failed, retrying with skipFonts...", firstErr);
        // Fallback: Skip fonts if CORS/CSS rules access fails
        const dataUrl = await toPng(previewRef.current, { ...options, skipFonts: true });
        triggerDownload(dataUrl);
      }
      
    } catch (err) {
      console.error("Could not download image", err);
      alert("保存图片失败，请尝试上传本地图片代替网络图片。");
    } finally {
        setIsExporting(false);
    }
  };

  const triggerDownload = (dataUrl: string) => {
    const link = document.createElement('a');
    link.download = `serif-card-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Calculate dimensions based on aspect ratio
  // Base height is usually limited by viewport, width adjusts.
  const getAspectRatioClasses = () => {
    switch(aspectRatio) {
      case '9/16': return "aspect-[9/16] max-w-[400px]"; // Mobile Story
      case '3/4': return "aspect-[3/4] max-w-[500px]";   // Instagram Portrait
      case '1/1': return "aspect-square max-w-[500px]";  // Square
      case '16/9': return "aspect-[16/9] max-w-[700px]"; // Landscape
      default: return "aspect-[3/4] max-w-[500px]";
    }
  };

  return (
    <div className="h-screen bg-neutral-100 text-neutral-800 font-sans flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar Controls - Scrollable on mobile/desktop */}
      <aside className="w-full md:w-[400px] bg-white border-r border-neutral-200 flex flex-col h-[45vh] md:h-screen shadow-lg z-20 md:order-1 order-2">
        <div className="p-4 border-b border-neutral-100 bg-white sticky top-0 z-10 flex justify-between items-center">
            <div>
                <h1 className="text-xl font-serif font-bold text-neutral-900 flex items-center gap-2">
                <span className="w-6 h-6 bg-neutral-900 text-white flex items-center justify-center rounded-sm font-serif italic text-sm">S</span>
                Serif & Co.
                </h1>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">排版工具</p>
            </div>
            {/* Mobile Download Button inside sidebar header for easy access */}
            <button 
                onClick={downloadImage}
                disabled={isExporting}
                className="md:hidden flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded text-xs font-medium disabled:opacity-50"
            >
                <Download size={14} /> {isExporting ? '...' : '保存'}
            </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto flex-1">
             {/* Export Section (New) */}
             <section>
                 <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 mb-3 uppercase tracking-wider">
                    <Share size={14} /> 导出与保存
                </div>
                <button
                    onClick={downloadImage}
                    disabled={isExporting}
                    className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isExporting ? (
                         <>
                            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                            <span>处理中...</span>
                         </>
                    ) : (
                        <>
                            <Download size={18} />
                            <span className="font-medium">保存高清图片</span>
                        </>
                    )}
                </button>
                <p className="text-[10px] text-neutral-400 mt-2 text-center">
                    支持高清 PNG 格式导出，适合社交媒体分享。
                </p>
            </section>

            {/* Aspect Ratio Selector */}
            <section>
                 <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 mb-3 uppercase tracking-wider">
                    <Crop size={14} /> 画幅比例
                </div>
                <div className="flex bg-neutral-100 p-1 rounded-md">
                    {[
                        { id: '9/16', icon: <Smartphone size={14} />, label: '手机' },
                        { id: '3/4', icon: <Ratio size={14} />, label: '卡片' },
                        { id: '1/1', icon: <Square size={14} />, label: '方图' },
                        { id: '16/9', icon: <Monitor size={14} />, label: '宽屏' },
                    ].map((ratio) => (
                        <button
                            key={ratio.id}
                            onClick={() => setAspectRatio(ratio.id as AspectRatio)}
                            className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-sm text-[10px] transition-all ${aspectRatio === ratio.id ? 'bg-white shadow-sm text-neutral-900 font-bold' : 'text-neutral-500 hover:text-neutral-700'}`}
                        >
                            {ratio.icon}
                            {ratio.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* Theme Selector */}
            <section>
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 mb-3 uppercase tracking-wider">
                    <Palette size={14} /> 主题色彩
                </div>
                <div className="grid grid-cols-5 gap-2">
                    {THEMES.map(theme => (
                        <button
                            key={theme.id}
                            onClick={() => setActiveThemeId(theme.id)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${activeThemeId === theme.id ? 'ring-2 ring-offset-2 ring-neutral-400 scale-110' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: theme.primaryColor }}
                            title={theme.name}
                        />
                    ))}
                </div>
                <p className="text-xs text-neutral-400 mt-2">当前: <span style={{ color: activeTheme.primaryColor }}>{activeTheme.name}</span></p>
            </section>

             {/* Template Selector */}
             <section>
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 mb-3 uppercase tracking-wider">
                    <Layout size={14} /> 布局模版
                </div>
                <div className="grid grid-cols-1 gap-2">
                    {TEMPLATES.map(template => (
                        <button
                            key={template.id}
                            onClick={() => setActiveTemplateId(template.id)}
                            className={`px-3 py-2 rounded-md text-left text-sm border transition-all ${activeTemplateId === template.id ? 'bg-neutral-50 border-neutral-400 font-medium' : 'border-neutral-200 hover:border-neutral-300'}`}
                        >
                            <span className="block text-neutral-800">{template.name}</span>
                            <span className="text-[10px] text-neutral-400 font-light">{template.description}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Content Editor */}
            <section className="space-y-4">
                 <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 mb-1 uppercase tracking-wider">
                    <Type size={14} /> 内容编辑
                </div>
                
                <GeminiWriter content={content} onUpdate={(newContent) => setContent(prev => ({...prev, ...newContent}))} />

                <div className="space-y-3">
                    <label className="block">
                        <span className="text-[10px] font-medium text-neutral-500 uppercase">正文</span>
                        <textarea 
                            rows={6}
                            value={content.body}
                            onChange={(e) => setContent({...content, body: e.target.value})}
                            className="mt-1 block w-full rounded-md border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-neutral-500 focus:ring-0 transition-colors border resize-none"
                        />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="text-[10px] font-medium text-neutral-500 uppercase">活动标签</span>
                            <input 
                                type="text" 
                                value={content.activity}
                                onChange={(e) => setContent({...content, activity: e.target.value})}
                                className="mt-1 block w-full rounded-md border-neutral-300 bg-neutral-50 px-3 py-2 text-sm border"
                            />
                        </label>
                         <label className="block">
                            <span className="text-[10px] font-medium text-neutral-500 uppercase">领域标签</span>
                            <input 
                                type="text" 
                                value={content.domain}
                                onChange={(e) => setContent({...content, domain: e.target.value})}
                                className="mt-1 block w-full rounded-md border-neutral-300 bg-neutral-50 px-3 py-2 text-sm border"
                            />
                        </label>
                    </div>

                    <div className="block">
                        <span className="text-[10px] font-medium text-neutral-500 block mb-2 uppercase">配图</span>
                        <div className="flex flex-wrap gap-2 mb-2">
                             {content.images.map((img, idx) => (
                                 <div key={idx} className="relative w-14 h-14 rounded overflow-hidden group border border-neutral-200">
                                     <img src={img} alt="" className="w-full h-full object-cover" />
                                     <button 
                                        onClick={() => removeImage(idx)}
                                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                     >
                                         <X size={12} />
                                     </button>
                                 </div>
                             ))}
                             <label className="w-14 h-14 flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 rounded cursor-pointer hover:border-neutral-400 hover:bg-neutral-50 transition-colors">
                                 <Plus size={16} className="text-neutral-400" />
                                 <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                             </label>
                        </div>
                    </div>
                </div>
            </section>
        </div>
      </aside>

      {/* Main Preview Area */}
      <main className="flex-1 bg-neutral-200/50 flex items-center justify-center relative overflow-hidden md:order-2 order-1 h-[55vh] md:h-screen">
         {/* Background pattern */}
         <div className="absolute inset-0 opacity-5 pointer-events-none" 
              style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
         </div>

         {/* Container for centering and scroll on mobile if needed */}
         <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8">
             
             {/* Toolbar - Desktop Only (Mobile has it in sidebar header) */}
            <div className="hidden md:flex bg-white px-4 py-2 rounded-full shadow-sm items-center gap-4 text-xs font-medium text-neutral-600 mb-4 z-10">
                <span>预览模式</span>
                <div className="h-4 w-px bg-neutral-200"></div>
                <button 
                    onClick={downloadImage}
                    className="flex items-center gap-1.5 hover:text-neutral-900 transition-colors"
                >
                    <Download size={14} /> 保存图片
                </button>
            </div>

            {/* The Paper/Card */}
            <div className={`relative shadow-2xl transition-all duration-500 ease-in-out ${getAspectRatioClasses()}`}>
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
         </div>
      </main>
    </div>
  );
};

export default App;
