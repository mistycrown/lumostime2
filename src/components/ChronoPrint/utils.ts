import { ParsedData, SectionData, CategoryItem, SubItem } from './types';

// Helper to convert "XX小时 XX分钟" or "XX分钟" to total minutes
const parseDurationToMinutes = (str: string): number => {
  let minutes = 0;
  const hourMatch = str.match(/(\d+)\s*小时/);
  const minMatch = str.match(/(\d+)\s*分钟/);

  if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
  if (minMatch) minutes += parseInt(minMatch[1]);
  
  return minutes;
};

// Helper to extract a short date (YYYY-M) from a title string
export const extractDateFromTitle = (title: string): string => {
  // Matches 202X/X/X or 202X-X-X
  const dateMatch = title.match(/(\d{4})[\/\-](\d{1,2})/);
  if (dateMatch) {
    return `${dateMatch[1]}-${dateMatch[2]}`;
  }
  return new Date().getFullYear() + "-" + (new Date().getMonth() + 1);
};

const parseSection = (text: string, titleKeywords: string[]): SectionData | null => {
  const lines = text.split('\n');
  const sectionHeaderIndex = lines.findIndex(line => titleKeywords.some(k => line.includes(k)));
  
  if (sectionHeaderIndex === -1) return null;

  // Find where the next section begins (lines starting with ##) to limit scope
  let nextSectionIndex = lines.findIndex((line, idx) => idx > sectionHeaderIndex && line.startsWith('##'));
  if (nextSectionIndex === -1) nextSectionIndex = lines.length;

  const sectionLines = lines.slice(sectionHeaderIndex, nextSectionIndex);
  
  // Extract Title and Total Duration
  // 1. Remove Markdown "## "
  // 2. Remove specific Emojis/Icons (📊, 📋, 🎯) and generic emoji ranges
  // 3. Remove "统计" suffix
  // 4. Trim whitespace
  let titleLine = sectionLines[0]
    .replace(/^##\s*/, '')
    .replace(/[📊📋🎯]/g, '') // Remove specific icons
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Generic emoji removal
    .replace(/\s*统计$/, '')
    .trim();
  
  // Look for total duration line usually right after title
  let totalDuration = "";
  let totalMinutes = 0;
  const durationLine = sectionLines.find(l => l.includes('总时长'));
  if (durationLine) {
    const match = durationLine.match(/:\s*(.*)/);
    if (match) {
      totalDuration = match[1].trim();
      totalMinutes = parseDurationToMinutes(totalDuration);
    }
  }

  const items: CategoryItem[] = [];
  let currentItem: CategoryItem | null = null;

  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i].trim();
    
    // Category Match: - **[CategoryName]** Duration (Percent%)
    const categoryMatch = line.match(/^-\s*\*\*\[(.*?)\]\*\*\s*(.*?)\s*\((.*?)%\)/);
    
    if (categoryMatch) {
      if (currentItem) {
        items.push(currentItem);
      }
      
      const percentVal = parseFloat(categoryMatch[3]);
      
      currentItem = {
        name: categoryMatch[1],
        durationStr: categoryMatch[2],
        percentageStr: categoryMatch[3] + '%',
        percentage: isNaN(percentVal) ? 0 : percentVal,
        minutes: parseDurationToMinutes(categoryMatch[2]),
        subItems: [],
        // Assign a grayscale shade based on index later
      };
    } else if (line.startsWith('*') && currentItem) {
      // Subitem Match: * Name: Duration
      const subItemMatch = line.match(/^\*\s*(.*?):\s*(.*)/);
      if (subItemMatch) {
        currentItem.subItems.push({
          name: subItemMatch[1],
          durationStr: subItemMatch[2],
          minutes: parseDurationToMinutes(subItemMatch[2])
        });
      }
    }
  }
  if (currentItem) items.push(currentItem);

  return {
    title: titleLine,
    totalDuration,
    totalMinutes,
    items
  };
};

export const parseInputText = (text: string): ParsedData => {
  return {
    // 匹配第一个包含 "统计" 的部分（Day/Week/Month/Year 统计）
    monthStats: parseSection(text, ['Day 统计', 'Week 统计', 'Month 统计', 'Year 统计', 'Day Statistics', 'Week Statistics', 'Month Statistics', 'Year Statistics']),
    todoStats: parseSection(text, ['待办专注', 'Todo Focus']),
    domainStats: parseSection(text, ['领域专注', 'Domain Focus'])
  };
};

// --- Color Themes (Chinese Traditional & Morandi) ---

export interface ColorTheme {
  name: string;
  label: string;
  primary: string;   // Main strong color (Text, Bars)
  secondary: string; // Lighter text
  accent: string;    // Highlight color (used in Modern pills, Retro highlights)
  bg: string;        // Background color (used in Retro cards)
  palette: string[]; // Chart colors
}

export const THEMES: Record<string, ColorTheme> = {
  ink: {
    name: 'ink',
    label: '水墨 (Ink)',
    primary: '#1a1a1a', 
    secondary: '#525252',
    accent: '#dc2626', // Seal Red
    bg: '#ffffff',
    palette: ['#1a1a1a', '#404040', '#737373', '#a3a3a3', '#d4d4d4', '#e5e5e5'],
  },
  rouge: {
    name: 'rouge',
    label: '胭脂 (Rouge)',
    primary: '#9f1239', // Rose 800
    secondary: '#be123c',
    accent: '#fb7185', 
    bg: '#fff1f2', // Very pale pink
    palette: ['#881337', '#9f1239', '#be123c', '#e11d48', '#f43f5e', '#fb7185'],
  },
  bamboo: {
    name: 'bamboo',
    label: '竹青 (Bamboo)',
    primary: '#14532d', // Green 900
    secondary: '#166534',
    accent: '#bef264', // Lime
    bg: '#f0fdf4', // Pale Green
    palette: ['#14532d', '#166534', '#15803d', '#16a34a', '#22c55e', '#4ade80'],
  },
  porcelain: {
    name: 'porcelain',
    label: '青花 (Porcelain)',
    primary: '#172554', // Blue 950
    secondary: '#1e40af',
    accent: '#60a5fa', 
    bg: '#eff6ff', // Pale Blue
    palette: ['#172554', '#1e3a8a', '#1e40af', '#2563eb', '#3b82f6', '#60a5fa'],
  },
  ginkgo: {
    name: 'ginkgo',
    label: '银杏 (Ginkgo)',
    primary: '#78350f', // Amber 900 (Brownish)
    secondary: '#b45309', // Amber 700
    accent: '#f59e0b', // Amber 500
    bg: '#fffbeb', // Warm Yellow White
    palette: ['#78350f', '#92400e', '#b45309', '#d97706', '#f59e0b', '#fbbf24'],
  },
  tea: {
    name: 'tea',
    label: '岩茶 (Oolong)',
    primary: '#4a3b32', // Warm Dark Brown
    secondary: '#8d7b68', // Latte
    accent: '#c0a080', // Tan
    bg: '#faf7f2', // Warm Paper
    palette: ['#4a3b32', '#5e4b3e', '#786250', '#8d7b68', '#a4907c', '#c0a080'],
  },
  haze: {
    name: 'haze',
    label: '雾霾 (Haze)',
    primary: '#475569', // Slate 600
    secondary: '#64748b',
    accent: '#94a3b8',
    bg: '#f8fafc', // Slate 50
    palette: ['#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'],
  },
  wisteria: {
    name: 'wisteria',
    label: '紫藤 (Wisteria)',
    primary: '#581c87', // Purple 900
    secondary: '#7e22ce',
    accent: '#c084fc',
    bg: '#faf5ff', // Purple 50
    palette: ['#581c87', '#6b21a8', '#7e22ce', '#9333ea', '#a855f7', '#c084fc'],
  },
  ticket: {
    name: 'ticket',
    label: '票据 (Stub)',
    primary: '#263238', // Blue Grey 900
    secondary: '#546e7a', // Blue Grey 600
    accent: '#d84315', // Burnt Orange (Stamp)
    bg: '#FFF8E1',     // Pale Yellow/Manila
    palette: ['#263238', '#37474F', '#455A64', '#546E7A', '#78909C', '#90A4AE'],
  }
};

export const getThemePaletteColor = (theme: ColorTheme, index: number) => {
  return theme.palette[index % theme.palette.length];
};
