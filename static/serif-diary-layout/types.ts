export interface DiaryEntry {
  id: string;
  date: Date;
  content: string;
  imageUrl?: string;
  mood?: string;
  location?: string;
}

export type ViewMode = 'week' | 'month' | 'year';
export type Orientation = 'landscape' | 'portrait';

export type LayoutStyle = 'magazine' | 'minimal' | 'newspaper' | 'film';

export interface ColorTheme {
  id: string;
  name: string;
  colors: {
    paper: string;
    ink: string;
    inkLight: string;
    accent: string;
    border: string;
    highlight: string;
  }
}

export interface CalendarState {
  currentDate: Date;
  viewMode: ViewMode;
}