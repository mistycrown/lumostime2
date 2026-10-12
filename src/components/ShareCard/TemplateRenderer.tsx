/**
 * @file TemplateRenderer.tsx
 * @input Share content, theme, layout mode and template
 * @output Independent text or photo card renderer
 * @pos Component (ShareCard)
 * @updated 2026-10-12: Splits typography from photography layouts and isolates text-mode content.
 */
import React from 'react';
import { ShareLayoutMode, ShareTemplateRendererProps } from './types';
import { TextTemplateRenderer } from './TextTemplateRenderer';
import { PhotoTemplateRenderer } from './PhotoTemplateRenderer';

export const TemplateRenderer: React.FC<ShareTemplateRendererProps & { mode: ShareLayoutMode }> = ({ mode, ...props }) => (
  mode === 'photo'
    ? <PhotoTemplateRenderer {...props} />
    : <TextTemplateRenderer {...props} content={{ ...props.content, images: [] }} />
);
