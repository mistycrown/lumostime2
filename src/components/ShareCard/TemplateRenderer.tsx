import React from 'react';
import { ShareCardContent, ShareTheme } from './types';
import { Hash, Calendar, Quote, Feather } from 'lucide-react';

interface TemplateRendererProps {
  content: ShareCardContent;
  theme: ShareTheme;
  templateId: string;
}

// Improved TagPill component to prevent layout shifts during export
const TagPill: React.FC<{ text: string; icon: React.ReactNode; color: string; bg?: string; borderColor?: string }> = ({ text, icon, color, bg, borderColor }) => (
  <div 
    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-solid"
    style={{ 
      borderColor: borderColor || color, 
      color: color,
      backgroundColor: bg || 'transparent',
      // Explicit line-height is crucial for html-to-image vertical alignment
      lineHeight: 1 
    }}
  >
    {/* Icon wrapper ensures SVGs don't collapse or shift */}
    <div className="flex items-center justify-center shrink-0 w-3 h-3">
        {icon}
    </div>
    {/* Text with leading-none to match the container center */}
    <span className="text-[10px] uppercase tracking-wider font-medium leading-none pt-[1px] whitespace-nowrap">
        {text}
    </span>
  </div>
);

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({ content, theme, templateId }) => {
  const primaryStyle = { color: theme.primaryColor };
  const borderStyle = { borderColor: theme.primaryColor };
  const bgStyle = { backgroundColor: theme.primaryColor };

  const hasImages = content.images.length > 0;

  // Helper to render images based on count (Default Grid Logic)
  const renderImagesDefault = (className: string) => {
    if (!hasImages) return null;

    const imageCount = content.images.length;

    // 1 张图
    if (imageCount === 1) {
      return (
        <div className={`w-full h-full overflow-hidden ${className}`}>
          <img src={content.images[0]} alt="Main" className="w-full h-full object-cover" />
        </div>
      );
    }

    // 2 张图
    if (imageCount === 2) {
      return (
        <div className={`grid grid-cols-2 gap-2 w-full h-full ${className}`}>
          {content.images.slice(0, 2).map((img, i) => (
            <div key={i} className="aspect-[3/4] overflow-hidden relative">
               <img src={img} alt={`Img ${i}`} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          ))}
        </div>
      );
    }

    // 3 张图
    if (imageCount === 3) {
      return (
        <div className={`grid grid-cols-2 gap-2 w-full h-full ${className}`}>
          <div className="col-span-2 aspect-video overflow-hidden relative">
            <img src={content.images[0]} alt="Main" className="absolute inset-0 w-full h-full object-cover" />
          </div>
          {content.images.slice(1, 3).map((img, i) => (
            <div key={i} className="aspect-square overflow-hidden relative">
              <img src={img} alt={`Img ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          ))}
        </div>
      );
    }

    // 4 张图
    if (imageCount === 4) {
      return (
        <div className={`grid grid-cols-2 gap-2 w-full h-full ${className}`}>
          {content.images.slice(0, 4).map((img, i) => (
            <div key={i} className="aspect-square overflow-hidden relative">
              <img src={img} alt={`Img ${i}`} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          ))}
        </div>
      );
    }

    // 5 张图：上2下3
    if (imageCount === 5) {
      return (
        <div className={`grid gap-2 w-full h-full ${className}`}>
          <div className="grid grid-cols-2 gap-2">
            {content.images.slice(0, 2).map((img, i) => (
              <div key={i} className="aspect-square overflow-hidden relative">
                <img src={img} alt={`Img ${i}`} className="absolute inset-0 w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {content.images.slice(2, 5).map((img, i) => (
              <div key={i} className="aspect-square overflow-hidden relative">
                <img src={img} alt={`Img ${i + 2}`} className="absolute inset-0 w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 6 张图：3x2 网格
    if (imageCount === 6) {
      return (
        <div className={`grid grid-cols-3 gap-2 w-full h-full ${className}`}>
          {content.images.slice(0, 6).map((img, i) => (
            <div key={i} className="aspect-square overflow-hidden relative">
              <img src={img} alt={`Img ${i}`} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          ))}
        </div>
      );
    }

    // 7 张图：上1大图，下6小图
    if (imageCount === 7) {
      return (
        <div className={`grid gap-2 w-full h-full ${className}`}>
          <div className="aspect-video overflow-hidden relative">
            <img src={content.images[0]} alt="Main" className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {content.images.slice(1, 7).map((img, i) => (
              <div key={i} className="aspect-square overflow-hidden relative">
                <img src={img} alt={`Img ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 8 张图：4x2 网格
    if (imageCount === 8) {
      return (
        <div className={`grid grid-cols-4 gap-2 w-full h-full ${className}`}>
          {content.images.slice(0, 8).map((img, i) => (
            <div key={i} className="aspect-square overflow-hidden relative">
              <img src={img} alt={`Img ${i}`} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          ))}
        </div>
      );
    }

    // 9 张图：3x3 网格
    if (imageCount === 9) {
      return (
        <div className={`grid grid-cols-3 gap-2 w-full h-full ${className}`}>
          {content.images.slice(0, 9).map((img, i) => (
            <div key={i} className="aspect-square overflow-hidden relative">
              <img src={img} alt={`Img ${i}`} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          ))}
        </div>
      );
    }

    // 超过9张图：显示前9张，3x3 网格
    return (
      <div className={`grid grid-cols-3 gap-2 w-full h-full ${className}`}>
        {content.images.slice(0, 9).map((img, i) => (
          <div key={i} className="aspect-square overflow-hidden relative">
            <img src={img} alt={`Img ${i}`} className="absolute inset-0 w-full h-full object-cover" />
          </div>
        ))}
      </div>
    );
  };

  // --- Template: Vertical Poetry (New Chinese Style) - Pure Text ---
  if (templateId === 'vertical-poetry') {
    // 按段落分割文本（保留换行符）
    const paragraphs = content.body.split('\n').filter(p => p.trim().length > 0);
    const totalChars = content.body.replace(/\n/g, '').length; // 不计算换行符
    const maxColumns = 8; // 最多8列
    
    // 根据字数决定列数
    let numColumns: number;
    if (totalChars <= 30) {
      numColumns = 1;
    } else if (totalChars <= 60) {
      numColumns = 2;
    } else if (totalChars <= 100) {
      numColumns = 3;
    } else if (totalChars <= 150) {
      numColumns = 4;
    } else if (totalChars <= 200) {
      numColumns = 5;
    } else if (totalChars <= 250) {
      numColumns = 6;
    } else if (totalChars <= 300) {
      numColumns = 7;
    } else {
      numColumns = maxColumns;
    }
    
    // 计算每列的理想字数
    const charsPerColumn = Math.ceil(totalChars / numColumns);
    
    // 智能分配段落到列（尽量保持段落完整）
    const columns: string[] = [];
    let currentColumn = '';
    let currentColumnLength = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      const paraLength = para.length;
      
      // 如果当前列为空，直接添加段落
      if (currentColumnLength === 0) {
        currentColumn = para;
        currentColumnLength = paraLength;
      }
      // 如果添加这个段落不会超过太多，就添加到当前列
      else if (currentColumnLength + paraLength <= charsPerColumn * 1.3) {
        currentColumn += '\n' + para;
        currentColumnLength += paraLength;
      }
      // 否则，开始新列
      else {
        columns.push(currentColumn);
        currentColumn = para;
        currentColumnLength = paraLength;
      }
      
      // 最后一个段落
      if (i === paragraphs.length - 1) {
        columns.push(currentColumn);
      }
    }
    
    // 反转数组，实现从右往左排列
    columns.reverse();
    
    return (
      <div className="w-full p-6 md:p-8 relative min-h-[500px]">
        {/* Background Element */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5 rounded-bl-full pointer-events-none" style={bgStyle}></div>

        {/* Date - Absolute positioned at top right */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-10">
          <div className="text-xs tracking-widest opacity-60 font-serif" style={{...primaryStyle, writingMode: 'vertical-rl', textOrientation: 'mixed'}}>
            {content.date}
          </div>
        </div>

        {/* Vertical Body Text - multiple columns, right to left */}
        <div className="flex justify-center items-start py-8 pr-16 gap-3">
          {columns.map((columnText, index) => (
            <div 
              key={index}
              className="text-base md:text-lg font-serif leading-loose" 
              style={{
                ...primaryStyle, 
                writingMode: 'vertical-rl', 
                textOrientation: 'mixed',
                whiteSpace: 'pre-wrap'
              }}
            >
              {columnText}
            </div>
          ))}
        </div>
        
        {/* LumosTime Watermark */}
        <div className="absolute bottom-3 right-3 text-[9px] font-sans tracking-wider opacity-30" style={primaryStyle}>
          LumosTime
        </div>
      </div>
    );
  }

  // --- Template: Minimal Note ---
  if (templateId === 'minimal-note') {
    return (
      <div className="w-full p-6 flex flex-col relative">
        <div className="flex justify-between items-start flex-shrink-0 mb-6">
           <Quote size={20} className="opacity-30" style={primaryStyle} />
           <div className="flex flex-col items-end">
                <div className="text-xs font-mono opacity-50" style={primaryStyle}>{content.date}</div>
           </div>
        </div>

        <div className="flex flex-col items-center py-4">
           {hasImages && (
               <div className="mb-6 w-full max-w-md shadow-lg flex-shrink-0">
                   {renderImagesDefault('bg-gray-100')}
               </div>
           )}
           
           <p className="text-base leading-relaxed text-center font-serif opacity-90 px-2" style={{
             ...primaryStyle,
             whiteSpace: 'pre-wrap'
           }}>
               {content.body}
           </p>
        </div>

        <div className="flex justify-between items-end border-t pt-4 mt-6 flex-shrink-0" style={{ borderColor: theme.primaryColor + '20' }}>
             <div className="flex gap-2">
                {content.activity && <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest" style={primaryStyle}>#{content.activity}</span>}
             </div>
             {/* LumosTime Watermark - moved to bottom right, same line as activity tag */}
             <div className="text-[9px] font-sans tracking-wider opacity-30" style={primaryStyle}>
               LumosTime
             </div>
        </div>
      </div>
    );
  }

    // --- Template: Film Story ---
    if (templateId === 'film-story') {
      return (
        <div className="w-full p-8 md:p-10 flex flex-col relative">
          {/* Top Bar with Activity Tag */}
          <div className="flex justify-between items-start mb-6 flex-shrink-0">
            <div className="text-xs opacity-50 font-mono tracking-wider" style={primaryStyle}>
              {content.date}
            </div>
            {content.activity && (
              <div className="text-xs opacity-60 font-medium" style={primaryStyle}>
                #{content.activity}
              </div>
            )}
          </div>

          {/* Image Area - only show if images exist */}
          {hasImages && (
            <div className="mb-6 rounded-lg overflow-hidden shadow-lg flex-shrink-0 max-h-[400px]">
              {renderImagesDefault('h-full w-full object-cover')}
            </div>
          )}

          {/* Body Text */}
          <div className="mb-6">
            <p className="text-base leading-relaxed font-serif text-justify" style={{
              ...primaryStyle,
              whiteSpace: 'pre-wrap'
            }}>
              {content.body}
            </p>
          </div>

          {/* Bottom decoration */}
          <div className="flex items-center justify-center gap-3 opacity-60 flex-shrink-0 mt-4">
            <div className="h-px flex-1" style={bgStyle}></div>
            <div className="text-[9px] font-sans tracking-wider" style={primaryStyle}>
              LumosTime
            </div>
            <div className="h-px flex-1" style={bgStyle}></div>
          </div>
        </div>
      );
    }

  // --- Template: Magazine Classic ---
  if (templateId === 'magazine-classic') {
    return (
      <div className="w-full flex flex-col p-8 md:p-10 relative">
        {/* Top Meta Bar */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-opacity-20 flex-shrink-0" style={{ borderColor: theme.primaryColor }}>
          <div className="flex gap-2">
             {content.activity && <TagPill text={content.activity} icon={<Hash size={10}/>} color={theme.primaryColor} borderColor={theme.primaryColor+'60'} />}
          </div>
          <div className="text-xs font-serif opacity-60" style={primaryStyle}>{content.date}</div>
        </div>

        {hasImages && (
          <div className="mb-6 rounded-sm overflow-hidden flex-shrink-0 max-h-[400px]">
             {renderImagesDefault('rounded-sm')}
          </div>
        )}

        <div className="font-serif max-w-none text-justify leading-loose opacity-90" style={{ color: theme.primaryColor }}>
          {/* Drop cap for the first letter - reduced size to fit exactly 2 lines */}
          <span className="float-left text-[2.8em] leading-[0.85] pr-2 pt-1 font-serif font-bold opacity-100" style={primaryStyle}>
            {content.body.charAt(0)}
          </span>
          <div className="text-sm md:text-base" style={{ 
            whiteSpace: 'pre-wrap'
          }}>
            {content.body.slice(1)}
          </div>
        </div>
        
        <div className="mt-8 pt-6 flex flex-col items-center justify-center gap-3 opacity-80 flex-shrink-0">
            <div className="flex items-center gap-2 text-xs font-sans tracking-widest uppercase" style={primaryStyle}>
                <Feather size={12} />
            </div>
            <div className="w-8 h-0.5" style={bgStyle}></div>
            {/* LumosTime Watermark */}
            <div className="text-[9px] font-sans tracking-wider opacity-30 mt-1" style={primaryStyle}>
              LumosTime
            </div>
        </div>
      </div>
    );
  }

  // --- Template: Modern Split (Updated with Vertical Stacking for Images) ---
  if (templateId === 'modern-split') {
    return (
      <div className="w-full flex flex-col p-6 md:p-8 relative">
        <div className="flex flex-col gap-4">
            {/* Header Area */}
            <div className="flex-shrink-0 flex items-center justify-between border-b pb-4 mb-2" style={{ borderColor: theme.primaryColor + '20'}}>
                {/* Three dots: two filled, one hollow */}
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={bgStyle}></div>
                  <div className="w-2 h-2 rounded-full" style={bgStyle}></div>
                  <div className="w-2 h-2 rounded-full border-2" style={{ borderColor: theme.primaryColor }}></div>
                </div>
                <div className="flex items-center gap-4 text-xs opacity-60" style={primaryStyle}>
                    <span className="flex items-center gap-1"><Calendar size={12}/> {content.date}</span>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {hasImages && (
                    <div className="w-full md:w-1/2 flex-shrink-0 max-h-[500px]">
                        {/* Custom Vertical Stack Rendering for Modern Split */}
                        {content.images.length === 1 ? (
                          <div className="h-full relative rounded-lg overflow-hidden shadow-sm min-h-[300px]">
                            <img src={content.images[0]} alt="Main" className="absolute inset-0 w-full h-full object-cover" />
                          </div>
                        ) : content.images.length === 2 ? (
                          <div className="flex flex-col gap-2 h-full">
                            {content.images.slice(0, 2).map((img, i) => (
                              <div key={i} className="flex-1 relative rounded-lg overflow-hidden shadow-sm min-h-[150px]">
                                <img src={img} alt={`Split ${i}`} className="absolute inset-0 w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        ) : content.images.length === 3 ? (
                          <div className="flex flex-col gap-2 h-full">
                            {content.images.slice(0, 3).map((img, i) => (
                              <div key={i} className="flex-1 relative rounded-lg overflow-hidden shadow-sm min-h-[100px]">
                                <img src={img} alt={`Split ${i}`} className="absolute inset-0 w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        ) : content.images.length === 4 ? (
                          <div className="grid grid-cols-2 gap-2 h-full">
                            {content.images.slice(0, 4).map((img, i) => (
                              <div key={i} className="aspect-square relative rounded-lg overflow-hidden shadow-sm">
                                <img src={img} alt={`Split ${i}`} className="absolute inset-0 w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        ) : content.images.length === 5 ? (
                          <div className="grid gap-2 h-full">
                            <div className="grid grid-cols-2 gap-2">
                              {content.images.slice(0, 2).map((img, i) => (
                                <div key={i} className="aspect-square relative rounded-lg overflow-hidden shadow-sm">
                                  <img src={img} alt={`Split ${i}`} className="absolute inset-0 w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {content.images.slice(2, 5).map((img, i) => (
                                <div key={i} className="aspect-square relative rounded-lg overflow-hidden shadow-sm">
                                  <img src={img} alt={`Split ${i + 2}`} className="absolute inset-0 w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : content.images.length === 6 ? (
                          <div className="grid grid-cols-3 gap-2 h-full">
                            {content.images.slice(0, 6).map((img, i) => (
                              <div key={i} className="aspect-square relative rounded-lg overflow-hidden shadow-sm">
                                <img src={img} alt={`Split ${i}`} className="absolute inset-0 w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        ) : content.images.length === 7 ? (
                          <div className="grid gap-2 h-full">
                            <div className="aspect-video relative rounded-lg overflow-hidden shadow-sm">
                              <img src={content.images[0]} alt="Main" className="absolute inset-0 w-full h-full object-cover" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {content.images.slice(1, 7).map((img, i) => (
                                <div key={i} className="aspect-square relative rounded-lg overflow-hidden shadow-sm">
                                  <img src={img} alt={`Split ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : content.images.length === 8 ? (
                          <div className="grid grid-cols-4 gap-2 h-full">
                            {content.images.slice(0, 8).map((img, i) => (
                              <div key={i} className="aspect-square relative rounded-lg overflow-hidden shadow-sm">
                                <img src={img} alt={`Split ${i}`} className="absolute inset-0 w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 h-full">
                            {content.images.slice(0, 9).map((img, i) => (
                              <div key={i} className="aspect-square relative rounded-lg overflow-hidden shadow-sm">
                                <img src={img} alt={`Split ${i}`} className="absolute inset-0 w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                )}
                <div className="flex-1 flex flex-col">
                    <p className="text-base font-serif leading-loose text-justify mb-4" style={{
                      ...primaryStyle,
                      whiteSpace: 'pre-wrap'
                    }}>
                        {content.body}
                    </p>
                    {content.activity && (
                      <div className="flex justify-between items-center pt-4 border-t border-dashed flex-shrink-0" style={{ borderColor: theme.primaryColor + '20' }}>
                          <TagPill text={content.activity} icon={<Hash size={10}/>} color={theme.primaryColor} />
                          {/* LumosTime Watermark - moved to same line as tag */}
                          <div className="text-[9px] font-sans tracking-wider opacity-30" style={primaryStyle}>
                            LumosTime
                          </div>
                      </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    );
  }

  // --- Template: Glass Morphism (Frosted Glass Effect) ---
  if (templateId === 'glass-morphism') {
    // 使用固定的互补色对，确保视觉对比明显
    const getComplementaryColor = (hexColor: string) => {
      // 预定义的互补色对（蓝色系 → 粉色/橙色系）
      const colorPairs: { [key: string]: string } = {
        // 深色系
        '#2C2C2C': '#E8B4B8', // 水墨黑 → 粉色
        '#8E2800': '#00A8A8', // 朱砂红 → 青色
        '#385E3C': '#E8A0BF', // 竹青 → 粉紫
        '#2B4C7E': '#FFB6C1', // 靛蓝 → 粉色
        '#6B6B6B': '#FFD4A3', // 极简白 → 橙色
        '#9D2933': '#33C3C3', // 胭脂粉 → 青绿
        '#8B5A00': '#A855F7', // 琥珀黄 → 紫色
        '#5D3A7A': '#FFB347', // 紫藤 → 橙色
        '#4A5568': '#FFB6D9', // 青灰 → 粉色
      };
      
      // 如果有预定义的配对，使用它
      if (colorPairs[hexColor]) {
        return colorPairs[hexColor];
      }
      
      // 否则生成一个明显不同的颜色
      const hex = hexColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      // 简单反转并调整，确保明显不同
      const r2 = 255 - r + 100;
      const g2 = 255 - g + 50;
      const b2 = 255 - b + 80;
      
      return `rgb(${Math.min(255, r2)}, ${Math.min(255, g2)}, ${Math.min(255, b2)})`;
    };
    
    const secondaryColor = getComplementaryColor(theme.primaryColor);
    
    return (
      <div 
        className="w-full relative overflow-hidden"
        style={{ 
          background: '#FAFAFA',
        }}
      >
        {/* Background decorative blurred circles - 两个弥散光晕，中间留白 */}
        {/* 主色光晕 - 左上角 */}
        <div 
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ 
            background: `radial-gradient(circle, ${theme.primaryColor}45 0%, ${theme.primaryColor}30 25%, ${theme.primaryColor}15 45%, transparent 70%)`,
            filter: 'blur(60px)'
          }}
        ></div>
        
        {/* 互补色光晕 - 右下角 */}
        <div 
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ 
            background: `radial-gradient(circle, ${secondaryColor}45 0%, ${secondaryColor}30 25%, ${secondaryColor}15 45%, transparent 70%)`,
            filter: 'blur(60px)'
          }}
        ></div>

        {/* Main content - single glass card with reduced padding */}
        <div className="relative z-10 p-4 md:p-6">
          <div 
            className="rounded-3xl p-5 md:p-6"
            style={{
              background: `linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.35) 100%)`,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
              {content.activity && (
                <div 
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primaryColor}35 0%, ${secondaryColor}25 100%)`,
                    color: theme.primaryColor,
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                  }}
                >
                  #{content.activity}
                </div>
              )}
              <div 
                className="text-xs font-mono font-medium ml-auto"
                style={{ 
                  color: theme.primaryColor,
                  opacity: 0.7
                }}
              >
                {content.date}
              </div>
            </div>

            {/* Images */}
            {hasImages && (
              <div className="rounded-2xl overflow-hidden mb-5">
                {renderImagesDefault('')}
              </div>
            )}

            {/* Body text */}
            <p 
              className="text-base leading-relaxed font-serif mb-5"
              style={{
                color: theme.primaryColor,
                whiteSpace: 'pre-wrap'
              }}
            >
              {content.body}
            </p>

            {/* Footer */}
            <div className="flex justify-center items-center gap-4 pt-4 border-t border-white/25">
              <div 
                className="h-px flex-1"
                style={{ 
                  background: `linear-gradient(90deg, transparent 0%, ${theme.primaryColor}40 50%, transparent 100%)`
                }}
              ></div>
              <div 
                className="text-[9px] font-sans tracking-wider font-medium"
                style={{ 
                  color: theme.primaryColor,
                  opacity: 0.5
                }}
              >
                LumosTime
              </div>
              <div 
                className="h-px flex-1"
                style={{ 
                  background: `linear-gradient(90deg, transparent 0%, ${theme.primaryColor}40 50%, transparent 100%)`
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div>Template not found</div>;
};
