/**
 * @file types.ts
 * @description Type definitions for ShareCard component
 * @updated 2026-10-12: Defines separate text/photo layout modes and shared renderer props.
 */

export interface ShareCardContent {
  body: string;
  images: string[];
  date: string;
  activity: string;
  domain: string;
}

export interface ShareTheme {
  id: string;
  name: string;
  primaryColor: string;
  backgroundColor: string;
  fontFamily: string;
}

export interface ShareTemplate {
  id: string;
  name: string;
  description: string;
  minImages?: number;
}

export type ShareLayoutMode = 'text' | 'photo';

export interface ShareTemplateRendererProps {
  content: ShareCardContent;
  theme: ShareTheme;
  templateId: string;
}
