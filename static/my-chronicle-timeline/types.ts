export interface Comment {
  id: string;
  text: string;
  createdAt: string; // ISO date string
  author: string;
}

export interface Media {
  type: 'image' | 'video';
  url: string;
  caption?: string;
  aspectRatio?: string; // e.g., "16/9", "1/1", "3/4"
}

export type EntryType = 'normal' | 'daily_summary' | 'weekly_summary' | 'monthly_summary';

export interface DiaryEntry {
  id: string;
  type?: EntryType; // Defaults to 'normal' if undefined
  date: string; // ISO date string for sorting
  title?: string;
  content: string;
  location?: string;
  media?: Media[];
  comments?: Comment[];
  mood?: string;
  
  // Metadata fields
  tags?: string[];          // # Tags
  domains?: string[];       // % Domains/Areas
  relatedTodos?: string[];  // @ Todos/Contexts
}