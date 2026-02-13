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

    if (content.images.length === 1) {
      return (
        <div className={`w-full h-full overflow-hidden ${className}`}>
          <img src={content.images[0]} alt="Main" className="w-full h-full object-cover" />
        </div>
      );
    }

    if (content.images.length === 2) {
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

    if (content.images.length === 3) {
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

    // 4 or more images
    return (
      <div className={`grid grid-cols-2 gap-2 w-full h-full ${className}`}>
        {content.images.slice(0, 4).map((img, i) => (
          <div key={i} className="aspect-square overflow-hidden relative">
            <img src={img} alt={`Img ${i}`} className="absolute inset-0 w-full h-full object-cover" />
          </div>
        ))}
      </div>
    );
  };

  // --- Template: Vertical Poetry (New Chinese Style) - Pure Text ---
  if (templateId === 'vertical-poetry') {
    // For vertical text, we need to calculate approximate height based on content length
    // Each vertical column can fit roughly 30-35 characters depending on font size
    const charsPerColumn = 32;
    const columnWidth = 40; // approximate width per column in pixels
    const estimatedColumns = Math.ceil(content.body.length / charsPerColumn);
    const minHeight = 600; // minimum height for aesthetic
    const calculatedHeight = Math.max(minHeight, estimatedColumns * columnWidth * 0.8);
    
    return (
      <div className="w-full p-6 md:p-8 relative" style={{ minHeight: `${calculatedHeight}px` }}>
        {/* Background Element */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5 rounded-bl-full pointer-events-none" style={bgStyle}></div>

        {/* Date - Absolute positioned at top right */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-10">
          <div className="text-xs tracking-widest opacity-60 font-serif" style={{...primaryStyle, writingMode: 'vertical-rl', textOrientation: 'mixed'}}>
            {content.date}
          </div>
        </div>

        {/* Vertical Body Text - centered, pure text layout */}
        <div className="flex justify-center items-start py-2 pr-16">
          <div className="text-base md:text-lg font-serif leading-loose text-justify" style={{
            ...primaryStyle, 
            writingMode: 'vertical-rl', 
            textOrientation: 'mixed',
            whiteSpace: 'pre-wrap'
          }}>
            {content.body}
          </div>
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
                   {content.images.length === 1 ? (
                     <div className="aspect-square bg-gray-100 rotate-1 transition-transform hover:rotate-0 duration-500">
                       <img src={content.images[0]} alt="Main" className="w-full h-full object-cover" />
                     </div>
                   ) : (
                     <div className="grid grid-cols-2 gap-3">
                       {content.images.slice(0, 2).map((img, i) => (
                         <div key={i} className="aspect-square bg-gray-100 overflow-hidden">
                           <img src={img} alt={`Img ${i}`} className="w-full h-full object-cover" />
                         </div>
                       ))}
                     </div>
                   )}
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
                    <div className="w-full md:w-1/2 flex-shrink-0 flex flex-col gap-2 max-h-[500px]">
                        {/* Custom Vertical Stack Rendering for Modern Split */}
                        {content.images.slice(0, 3).map((img, i) => (
                          <div key={i} className="flex-1 relative rounded-lg overflow-hidden shadow-sm min-h-[150px]">
                              <img src={img} alt={`Split ${i}`} className="absolute inset-0 w-full h-full object-cover" />
                          </div>
                        ))}
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

  return <div>Template not found</div>;
};
