/**
 * @file journalTitles.ts
 * @input Semantic journal page titles
 * @output Concise English display titles without decorative eyebrows
 * @pos Utility (Journal typography)
 * @updated 2026-10-23: Keeps field labels and authored content Chinese while translating major headings.
 */
const headings: Record<string, string> = {
  '目录': 'Contents', '年度回顾': 'Year in Review', '目标与子目标': 'Goals',
  '心情贴纸概览': 'Mood Overview', '每日一句话与贴纸': 'One Line a Day',
  '月计划': 'Monthly Planner', '日程明细': 'Agenda', '月复盘': 'Monthly Review',
  '月打卡': 'Habit Tracker', '时间分布': 'Time Distribution', '统计明细': 'Statistics',
  '时间轴 周概览': 'Weekly Timeline', '周计划': 'Weekly Planner', '周复盘': 'Weekly Review',
  '月度回顾 续': 'Monthly Review', '每周回顾 续': 'Weekly Review', '手账': 'Journal'
};
export const journalPageTitle = (title: string): string => {
  const day = title.match(/^(\d{4}-\d{2}-\d{2})\s+周([日一二三四五六])$/);
  if (day) return `${day[1]} ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']['日一二三四五六'.indexOf(day[2])]}`;
  const prefix = title.match(/^(\d{4}(?:-\d{2})?) (.+)$/);
  const label = prefix ? prefix[2] : title;
  const normalized = label.replace(' 跨月续', '');
  return (prefix ? prefix[1] + ' ' : '') + (headings[normalized] || label);
};
