export interface SubItem {
  name: string;
  durationStr: string;
  minutes: number;
}

export interface CategoryItem {
  name: string;
  durationStr: string;
  percentageStr: string;
  percentage: number;
  minutes: number;
  subItems: SubItem[];
  color?: string;
}

export interface SectionData {
  title: string;
  totalDuration: string;
  totalMinutes: number;
  items: CategoryItem[];
}

export interface ParsedData {
  monthStats: SectionData | null;
  todoStats: SectionData | null;
  domainStats: SectionData | null;
}