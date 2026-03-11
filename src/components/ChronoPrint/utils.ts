import { ParsedData, SectionData, CategoryItem } from './types';

// Helper to convert "XX小时 XX分钟" or "XX分钟" to total minutes
const parseDurationToMinutes = (str: string): number => {
  let minutes = 0;
  const hourMatch = str.match(/(\d+)\s*小时/);
  const minMatch = str.match(/(\d+)\s*分钟/);

  if (hourMatch) minutes += parseInt(hourMatch[1], 10) * 60;
  if (minMatch) minutes += parseInt(minMatch[1], 10);

  return minutes;
};

// Helper to extract a short date (YYYY-M) from a title string
export const extractDateFromTitle = (title: string): string => {
  const dateMatch = title.match(/(\d{4})[\/\-](\d{1,2})/);
  if (dateMatch) {
    return `${dateMatch[1]}-${dateMatch[2]}`;
  }

  return `${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
};

const parseSection = (text: string, titleKeywords: string[]): SectionData | null => {
  const lines = text.split('\n');
  const sectionHeaderIndex = lines.findIndex(line => titleKeywords.some(keyword => line.includes(keyword)));

  if (sectionHeaderIndex === -1) return null;

  let nextSectionIndex = lines.findIndex((line, index) => index > sectionHeaderIndex && line.startsWith('##'));
  if (nextSectionIndex === -1) nextSectionIndex = lines.length;

  const sectionLines = lines.slice(sectionHeaderIndex, nextSectionIndex);

  const titleLine = sectionLines[0]
    .replace(/^##\s*/, '')
    .replace(/[📊📋🎯]/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/\s*统计$/, '')
    .trim();

  let totalDuration = '';
  let totalMinutes = 0;
  const durationLine = sectionLines.find(line => line.includes('总时长'));
  if (durationLine) {
    const match = durationLine.match(/:\s*(.*)/);
    if (match) {
      totalDuration = match[1].trim();
      totalMinutes = parseDurationToMinutes(totalDuration);
    }
  }

  const items: CategoryItem[] = [];
  let currentItem: CategoryItem | null = null;

  for (const rawLine of sectionLines) {
    const line = rawLine.trim();
    const categoryMatch = line.match(/^-\s*\*\*\[(.*?)\]\*\*\s*(.*?)\s*\((.*?)%\)/);

    if (categoryMatch) {
      if (currentItem) {
        items.push(currentItem);
      }

      const percentVal = parseFloat(categoryMatch[3]);
      currentItem = {
        name: categoryMatch[1],
        durationStr: categoryMatch[2],
        percentageStr: `${categoryMatch[3]}%`,
        percentage: Number.isNaN(percentVal) ? 0 : percentVal,
        minutes: parseDurationToMinutes(categoryMatch[2]),
        subItems: []
      };
      continue;
    }

    if (line.startsWith('*') && currentItem) {
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

  if (currentItem) {
    items.push(currentItem);
  }

  return {
    title: titleLine,
    totalDuration,
    totalMinutes,
    items
  };
};

export const parseInputText = (text: string): ParsedData => {
  return {
    monthStats: parseSection(text, [
      '日统计',
      '周统计',
      '月统计',
      '年统计',
      '日程统计',
      '周日程统计',
      '月日程统计',
      '周矩阵统计',
      '周趋势统计',
      '月趋势统计',
      '周打卡统计',
      '月打卡统计',
      '年打卡统计',
      'Day Statistics',
      'Week Statistics',
      'Month Statistics',
      'Year Statistics'
    ]),
    todoStats: parseSection(text, ['待办专注', 'Todo Focus']),
    domainStats: parseSection(text, ['领域专注', 'Domain Focus'])
  };
};

export interface ColorTheme {
  name: string;
  label: string;
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  palette: string[];
}

export const THEMES: Record<string, ColorTheme> = {
  ink: {
    name: 'ink',
    label: '水墨 (Ink)',
    primary: '#1a1a1a',
    secondary: '#525252',
    accent: '#dc2626',
    bg: '#ffffff',
    palette: ['#1a1a1a', '#404040', '#737373', '#a3a3a3', '#d4d4d4', '#e5e5e5']
  },
  rouge: {
    name: 'rouge',
    label: '胭脂 (Rouge)',
    primary: '#9f1239',
    secondary: '#be123c',
    accent: '#fb7185',
    bg: '#fff1f2',
    palette: ['#881337', '#9f1239', '#be123c', '#e11d48', '#f43f5e', '#fb7185']
  },
  bamboo: {
    name: 'bamboo',
    label: '竹青 (Bamboo)',
    primary: '#14532d',
    secondary: '#166534',
    accent: '#bef264',
    bg: '#f0fdf4',
    palette: ['#14532d', '#166534', '#15803d', '#16a34a', '#22c55e', '#4ade80']
  },
  porcelain: {
    name: 'porcelain',
    label: '青花 (Porcelain)',
    primary: '#172554',
    secondary: '#1e40af',
    accent: '#60a5fa',
    bg: '#eff6ff',
    palette: ['#172554', '#1e3a8a', '#1e40af', '#2563eb', '#3b82f6', '#60a5fa']
  },
  ginkgo: {
    name: 'ginkgo',
    label: '银杏 (Ginkgo)',
    primary: '#78350f',
    secondary: '#b45309',
    accent: '#f59e0b',
    bg: '#fffbeb',
    palette: ['#78350f', '#92400e', '#b45309', '#d97706', '#f59e0b', '#fbbf24']
  },
  tea: {
    name: 'tea',
    label: '岩茶 (Oolong)',
    primary: '#4a3b32',
    secondary: '#8d7b68',
    accent: '#c0a080',
    bg: '#faf7f2',
    palette: ['#4a3b32', '#5e4b3e', '#786250', '#8d7b68', '#a4907c', '#c0a080']
  },
  haze: {
    name: 'haze',
    label: '雾霭 (Haze)',
    primary: '#475569',
    secondary: '#64748b',
    accent: '#94a3b8',
    bg: '#f8fafc',
    palette: ['#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0']
  },
  wisteria: {
    name: 'wisteria',
    label: '紫藤 (Wisteria)',
    primary: '#581c87',
    secondary: '#7e22ce',
    accent: '#c084fc',
    bg: '#faf5ff',
    palette: ['#581c87', '#6b21a8', '#7e22ce', '#9333ea', '#a855f7', '#c084fc']
  },
  ticket: {
    name: 'ticket',
    label: '票据 (Stub)',
    primary: '#263238',
    secondary: '#546e7a',
    accent: '#d84315',
    bg: '#FFF8E1',
    palette: ['#263238', '#37474F', '#455A64', '#546E7A', '#78909C', '#90A4AE']
  }
};

export const getThemePaletteColor = (theme: ColorTheme, index: number) => {
  return theme.palette[index % theme.palette.length];
};
