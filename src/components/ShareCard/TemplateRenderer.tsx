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
          <img src={content.images[0]} alt="Main" className="w-full h-full object-cover" crossOrigin="anonymous" />
        </div>
      );
    }

    if (content.images.length === 2) {
      return (
        <div className={`grid grid-cols-2 gap-2 w-full h-full ${className}`}>
          {content.images.slice(0, 2).map((img, i) => (
            <div key={i} className="aspect-[3/4] overflow-hidden relative">
               <img src={img} alt={`Img ${i}`} className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className={`grid grid-cols-2 gap-2 w-full h-full ${className}`}>
        <div className="col-span-2 aspect-video overflow-hidden relative">
          <img src={content.images[0]} alt="Main" className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" />
        </div>
        {content.images.slice(1).map((img, i) => (
          <div key={i} className="aspect-square overflow-hidden relative">
            <img src={img} alt={`Img ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" />
          </div>
        ))}
      </div>
    );
  };

  // --- Template: Vertical Poetry (New Chinese Style) ---
  if (templateId === 'vertical-poetry') {
    return (
      <div className="h-full w-full flex flex-col p-6 md:p-8 relative overflow-hidden">
        {/* Background Element */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5 rounded-bl-full pointer-events-none" style={bgStyle}></div>

        <div className="flex-1 flex flex-row-reverse items-start gap-6 md:gap-8 h-full">
           {/* Meta Column (Replaces Title) */}
           <div className="flex flex-col items-center h-full py-2">
              <div className="text-xs tracking-widest opacity-60 font-serif flex items-center gap-3" style={{...primaryStyle, writingMode: 'vertical-rl', textOrientation: 'mixed'}}>
                  <span>{content.date}</span>
              </div>
              
              <div className="mt-auto flex items-center gap-2 opacity-80" style={{...primaryStyle, writingMode: 'vertical-rl'}}>
                 {content.domain && <span className="text-[10px] border py-1 px-0.5" style={borderStyle}>{content.domain}</span>}
              </div>
           </div>

           {/* Vertical Body Text */}
           <div className="flex-1 h-full py-2 overflow-hidden relative">
              <div className="text-base md:text-lg font-serif leading-loose text-justify h-full max-h-full whitespace-pre-wrap" style={{...primaryStyle, writingMode: 'vertical-rl', textOrientation: 'mixed'}}>
                  {content.body}
              </div>
           </div>
        </div>

        {/* Images at bottom */}
        {hasImages && (
           <div className="mt-4 w-full max-w-[60%] self-start relative">
               <div className="rounded-sm overflow-hidden border p-1" style={{ borderColor: theme.primaryColor + '40' }}>
                   {renderImagesDefault('rounded-sm aspect-square object-cover')}
               </div>
           </div>
        )}
        
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
      <div className="h-full w-full p-8 flex flex-col justify-between">
        <div className="flex justify-between items-start">
           <Quote size={24} className="opacity-30" style={primaryStyle} />
           <div className="flex flex-col items-end">
                <div className="text-xs font-mono opacity-50" style={primaryStyle}>{content.date}</div>
           </div>
        </div>

        <div className="flex-1 flex flex-col justify-center py-6">
           {hasImages && (
               <div className="mb-6 self-center w-3/4 shadow-lg rotate-1 transition-transform hover:rotate-0 duration-500">
                   <div className="aspect-square bg-gray-100">
                        {renderImagesDefault('')}
                   </div>
               </div>
           )}
           
           <p className="text-lg leading-loose text-center font-serif whitespace-pre-wrap opacity-90 px-4" style={primaryStyle}>
               {content.body}
           </p>
        </div>

        <div className="flex justify-between items-end border-t pt-4" style={{ borderColor: theme.primaryColor + '20' }}>
             <div className="flex gap-2">
                {content.activity && <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest" style={primaryStyle}>#{content.activity}</span>}
             </div>
        </div>
        
        {/* LumosTime Watermark */}
        <div className="absolute bottom-3 right-3 text-[9px] font-sans tracking-wider opacity-30" style={primaryStyle}>
          LumosTime
        </div>
      </div>
    );
  }

    // --- Template: Film Story ---
    if (templateId === 'film-story') {
      return (
        <div className="h-full w-full p-8 md:p-10 flex flex-col relative">
          {/* Top Bar with Activity Tag */}
          <div className="flex justify-between items-start mb-6">
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
            <div className="mb-6 rounded-lg overflow-hidden shadow-lg flex-none max-h-[35%]">
              {renderImagesDefault('h-full w-full object-cover')}
            </div>
          )}

          {/* Body Text */}
          <div className="flex-1 overflow-hidden">
            <p className="text-base leading-relaxed font-serif text-justify whitespace-pre-wrap" style={primaryStyle}>
              {content.body}
            </p>
          </div>

          {/* Bottom decoration */}
          <div className="mt-6 flex items-center justify-center gap-3 opacity-60">
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
      <div className="h-full flex flex-col p-8 md:p-10 relative">
        {/* Top Meta Bar */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-opacity-20" style={{ borderColor: theme.primaryColor }}>
          <div className="flex gap-2">
             {content.activity && <TagPill text={content.activity} icon={<Hash size={10}/>} color={theme.primaryColor} borderColor={theme.primaryColor+'60'} />}
          </div>
          <div className="text-xs font-serif opacity-60" style={primaryStyle}>{content.date}</div>
        </div>

        {hasImages ? (
          <div className="mb-6 rounded-sm overflow-hidden flex-none">
             {renderImagesDefault('rounded-sm')}
          </div>
        ) : (
            // Spacer if no images to push text down slightly for balance
            <div className="mb-8"></div>
        )}

        <div className="prose prose-sm md:prose-base font-serif max-w-none text-justify leading-loose opacity-90 flex-1 overflow-hidden" style={{ color: theme.primaryColor }}>
          {/* Drop cap for the first letter since there is no title */}
          <span className="float-left text-5xl leading-[0.8] pr-2 font-serif font-bold opacity-100" style={primaryStyle}>
            {content.body.charAt(0)}
          </span>
          <span className="whitespace-pre-wrap">{content.body.slice(1)}</span>
        </div>
        
        <div className="mt-auto pt-6 flex flex-col items-center justify-center gap-3 opacity-80">
            <div className="flex items-center gap-2 text-xs font-sans tracking-widest uppercase" style={primaryStyle}>
                <Feather size={12} />
            </div>
            <div className="w-8 h-0.5" style={bgStyle}></div>
            {/* LumosTime Watermark - moved here below the feather icon */}
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
      <div className="h-full flex flex-col p-6 md:p-8 relative">
        <div className="flex flex-col h-full gap-4">
            {/* Header Area */}
            <div className="flex-none flex items-center justify-between border-b pb-4 mb-2" style={{ borderColor: theme.primaryColor + '20'}}>
                <div className="w-12 h-1.5" style={bgStyle}></div>
                <div className="flex items-center gap-4 text-xs opacity-60" style={primaryStyle}>
                    <span className="flex items-center gap-1"><Calendar size={12}/> {content.date}</span>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-6">
                {hasImages && (
                    <div className="w-full md:w-1/2 flex-none h-64 md:h-auto flex flex-col gap-2">
                        {/* Custom Vertical Stack Rendering for Modern Split */}
                        {content.images.slice(0, 3).map((img, i) => (
                          <div key={i} className="flex-1 relative rounded-lg overflow-hidden shadow-sm">
                              <img src={img} alt={`Split ${i}`} className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" />
                          </div>
                        ))}
                    </div>
                )}
                <div className="flex-1 overflow-y-auto pr-2 flex flex-col">
                    <p className="text-base font-serif leading-loose whitespace-pre-wrap text-justify flex-1" style={primaryStyle}>
                        {content.body}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-dashed" style={{ borderColor: theme.primaryColor + '20' }}>
                        {content.activity && <TagPill text={content.activity} icon={<Hash size={10}/>} color={theme.primaryColor} />}
                    </div>
                </div>
            </div>
        </div>
        
        {/* LumosTime Watermark */}
        <div className="absolute bottom-3 right-3 text-[9px] font-sans tracking-wider opacity-30" style={primaryStyle}>
          LumosTime
        </div>
      </div>
    );
  }

  return <div>Template not found</div>;
};
