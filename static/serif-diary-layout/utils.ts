import { DiaryEntry } from './types';
import { eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// Helper to generate a fast, static placeholder image
const getRandomImage = (width: number, height: number, id: number) => 
  `https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=800&auto=format&fit=crop`;

// Mock text content
const mockTexts = [
  "今天阳光很好，在公园里散步，看到了一只橘色的猫。",
  "读了一本关于老建筑的书，仿佛穿越回了那个年代。",
  "咖啡馆的角落，写下这周的计划。窗外的雨声很治愈。",
  "尝试了新的食谱，味道意外地不错。生活需要一点小惊喜。",
  "忙碌的一天，但看到晚霞的时候，觉得一切都值得。",
  "整理旧照片，回忆涌上心头。时间过得真快。",
  "去海边吹风，心情变得很平静。"
];

// Generate mock diary entries for a specific range
export const generateMockEntries = (startDate: Date, endDate: Date): DiaryEntry[] => {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  return days.map((day, index): DiaryEntry | null => {
    // 80% chance to have an entry, 60% chance to have an image
    const hasEntry = Math.random() > 0.2;
    const hasImage = Math.random() > 0.3;
    
    if (!hasEntry) return null;

    return {
      id: `entry-${index}`,
      date: day,
      content: mockTexts[Math.floor(Math.random() * mockTexts.length)],
      imageUrl: hasImage ? getRandomImage(800, 600, index) : undefined,
      location: Math.random() > 0.5 ? "Shanghai, China" : undefined,
      mood: "Calm"
    };
  }).filter((entry): entry is DiaryEntry => entry !== null);
};

export const getWeekRange = (date: Date) => {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }), // Monday start
    end: endOfWeek(date, { weekStartsOn: 1 })
  };
};

export const getMonthRange = (date: Date) => {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date)
  };
};