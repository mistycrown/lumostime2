export type ThemeType = 'classic' | 'vine' | 'celestial' | 'track' | 'stitches' | 'paw' | 'music';

export interface TimelineItem {
  id: number;
  time: string;
  duration: string;
  title: string;
  tags: string[];
}

export interface ThemeConfig {
  name: string;
}
