import React from 'react';
import { CardContent, Theme } from '../types';
import { Hash, BookOpen, User, Calendar, Quote, Feather } from 'lucide-react';

interface TemplateRendererProps {
  content: CardContent;
  theme: Theme;
  templateId: string;
}

const TagPill: React.FC<{ text: string; icon: React.ReactNode; color: string; bg?: string; borderColor?: string }> = ({ text, icon, color, bg, borderColor }) => (
  <span 
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium border"
    style={{ 
      borderColor: borderColor || color, 
      color: color,
      backgroundColor: bg || 'transparent'
    }}
  >
    {icon}
    {text}
  </span>
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
              <div className="writing-vertical-rl text-orientation-mixed text-xs tracking-widest opacity-60 font-serif flex items-center gap-3" style={primaryStyle}>
                  <span>{content.date}</span>
                  <span className="w-px h-8 bg-current opacity-50"></span>
                  <span className="font-bold">{content.author}</span>
              </div>
              
              <div className="mt-auto writing-vertical-rl flex items-center gap-2 opacity-80" style={primaryStyle}>
                 {content.domain && <span className="text-[10px] border py-1 px-0.5" style={borderStyle}>{content.domain}</span>}
              </div>
           </div>

           {/* Vertical Body Text */}
           <div className="flex-1 h-full py-2 overflow-hidden relative">
              <div className="writing-vertical-rl text-orientation-mixed text-base md:text-lg font-serif leading-loose text-justify h-full max-h-full whitespace-pre-wrap" style={{...primaryStyle, columnFill: 'auto'}}>
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
             <div className="text-right">
                 <div className="text-sm font-bold flex items-center gap-1" style={primaryStyle}>
                    <span className="w-4 h-[1px]" style={bgStyle}></span> {content.author}
                 </div>
             </div>
        </div>
      </div>
    );
  }

    // --- Template: Film Story ---
    if (templateId === 'film-story') {
      return (
        <div className="h-full w-full p-4 md:p-6 flex flex-col items-center justify-center bg-zinc-100" style={{ backgroundColor: '#f0f0f0' }}>
           <div className="bg-white shadow-xl p-4 md:p-6 pb-10 w-full max-w-md transform rotate-0 md:-rotate-1 transition-transform hover:rotate-0 duration-500 flex flex-col">
              {/* Image Area */}
              <div className="aspect-square w-full bg-gray-100 mb-6 overflow-hidden grayscale-[10%] hover:grayscale-0 transition-all">
                  {hasImages ? renderImagesDefault('h-full w-full object-cover') : (
                    <div className="h-full w-full flex items-center justify-center bg-neutral-100 text-neutral-300 tracking-widest text-xs">NO IMAGE</div>
                  )}
              </div>
  
              {/* Text Area */}
              <div className="px-2">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                       <div className="flex items-center gap-2">
                            {content.domain && <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 text-[9px] uppercase tracking-wider rounded-sm">{content.domain}</span>}
                       </div>
                      <span className="text-[10px] text-gray-400 font-mono tracking-widest">{content.date}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed font-serif text-justify whitespace-pre-wrap mb-4">
                      {content.body}
                  </p>
                  
                  <div className="flex justify-end mt-4">
                       <span className="text-[10px] text-gray-400 italic">— {content.author}</span>
                  </div>
              </div>
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
             {content.domain && <TagPill text={content.domain} icon={<BookOpen size={10}/>} color={theme.primaryColor} borderColor={theme.primaryColor+'60'} />}
          </div>
          <div className="text-xs font-serif italic opacity-60" style={primaryStyle}>{content.date}</div>
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
                <span>{content.author}</span>
            </div>
            <div className="w-8 h-0.5" style={bgStyle}></div>
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
                    <span className="flex items-center gap-1 font-bold"><User size={12}/> {content.author}</span>
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
                        {content.domain && <TagPill text={content.domain} icon={<BookOpen size={10}/>} color={theme.primaryColor} />}
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return <div>Template not found</div>;
};
