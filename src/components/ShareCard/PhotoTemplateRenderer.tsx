/**
 * @file PhotoTemplateRenderer.tsx
 * @input Ordered photos, node-aware notes and selected theme/photo layout
 * @output Photography diary, blurred card, seamless story, paper frames or film strip
 * @pos Component (ShareCard)
 * @updated 2026-10-12: Uses only an overscanned blurred photo behind film-story, without tint overlays or card shadows.
 * @updated 2026-10-12: Adds photo-first editorial layouts with original ratios and no image-count limit.
 */
import React from 'react';
import { ShareCardContent, ShareTemplateRendererProps } from './types';
import { ShareCardText } from './ShareCardText';
import { deepenThemeColor } from './shareCardTheme';

const PhotoMetadata: React.FC<{ content: ShareCardContent }> = ({ content }) => (
  <div className="flex flex-col items-end gap-2 text-[10px] opacity-50">
    <span className="font-mono tracking-widest">{content.date}</span>
    {content.activity && <span className="break-words text-right">#{content.activity}</span>}
    <span className="mt-2 text-[8px] tracking-widest">LumosTime</span>
  </div>
);

const PhotoNote: React.FC<{ body: string }> = ({ body }) => body ? (
  <p className="font-serif text-sm leading-loose whitespace-pre-wrap break-words opacity-80">
    <ShareCardText text={body} />
  </p>
) : null;

export const PhotoTemplateRenderer: React.FC<ShareTemplateRendererProps> = ({ content, theme, templateId }) => {
  const cardColor = deepenThemeColor(theme.primaryColor);
  const photos = content.images.map((image, index) => (
    <img key={index} src={image} alt={`照片 ${index + 1}`} className="block w-full h-auto" />
  ));

  if (templateId === 'photo-diary') {
    return (
      <div className="w-full p-4" style={{ backgroundColor: theme.backgroundColor, color: theme.primaryColor }}>
        <div className="space-y-3">{photos}</div>
        <div className="pt-5 pb-2">
          <PhotoNote body={content.body} />
          <div className="mt-8"><PhotoMetadata content={content} /></div>
        </div>
      </div>
    );
  }

  if (templateId === 'film-story') {
    return (
      <div className="w-full relative overflow-hidden px-6 py-10" style={{ backgroundColor: cardColor }}>
        {content.images[0] && (
          <img src={content.images[0]} alt="" aria-hidden="true" className="absolute object-cover pointer-events-none"
            style={{ top: -54, left: -54, width: 'calc(100% + 108px)', maxWidth: 'none', height: 'calc(100% + 108px)', filter: 'blur(18px)' }} />
        )}
        <div className="relative flex flex-col p-4 rounded-sm min-h-[480px]"
          style={{ backgroundColor: cardColor, color: '#F5F5F0' }}>
          <div className="space-y-3 mb-4">{photos}</div>
          <PhotoNote body={content.body} />
          <div className="mt-auto pt-12"><PhotoMetadata content={content} /></div>
        </div>
      </div>
    );
  }

  if (templateId === 'long-image') {
    return (
      <div className="w-full" style={{ backgroundColor: theme.backgroundColor, color: theme.primaryColor }}>
        <div>{photos}</div>
        <div className="px-6 pt-6 pb-5">
          <PhotoNote body={content.body} />
          <div className="mt-8"><PhotoMetadata content={content} /></div>
        </div>
      </div>
    );
  }

  if (templateId === 'framed-long-image') {
    return (
      <div className="w-full p-3" style={{ backgroundColor: cardColor, color: '#F5F5F0' }}>
        <div className="space-y-3">
          {content.images.map((image, index) => (
            <figure key={index} className="p-3" style={{ backgroundColor: theme.backgroundColor, color: theme.primaryColor }}>
              <img src={image} alt={`照片 ${index + 1}`} className="block w-full h-auto" />
              <figcaption className="flex items-baseline justify-between gap-3 pt-4 pb-1 text-[8px] font-mono tracking-wider opacity-60">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <span>{content.date}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="px-3 pt-6 pb-3">
          <PhotoNote body={content.body} />
          <div className="mt-8"><PhotoMetadata content={content} /></div>
        </div>
      </div>
    );
  }

  if (templateId === 'film-strip') {
    return (
      <div className="w-full px-4 pt-1 pb-6" style={{ backgroundColor: cardColor, color: '#F5F5F0' }}>
        {content.images.map((image, index) => (
          <figure key={index}>
            <div className="flex items-center justify-between gap-3 py-3 text-[7px] font-mono tracking-widest" style={{ color: '#C9AD76' }}>
              <span className="whitespace-nowrap">LUMOS · 400</span>
              <span className="flex items-center gap-3 shrink-0">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <span className="inline-block w-0 h-0 border-y-[3px] border-y-transparent border-l-[5px] border-l-current" />
              </span>
            </div>
            <img src={image} alt={`照片 ${index + 1}`} className="block w-full h-auto" />
            <figcaption className="py-2 text-right text-[8px] font-mono tracking-wider opacity-40">{content.date}</figcaption>
          </figure>
        ))}
        <div className="px-2 pt-5">
          <PhotoNote body={content.body} />
          <div className="mt-8"><PhotoMetadata content={content} /></div>
        </div>
      </div>
    );
  }

  return null;
};
