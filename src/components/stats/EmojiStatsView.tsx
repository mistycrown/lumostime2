/**
 * @file EmojiStatsView.tsx
 * @input dailyReviews, currentDate, emojiRange
 * @output UI (Emoji Statistics)
 * @pos Component (Statistics - Emoji)
 * @description Emoji 统计视图 - 显示不同时间段的情绪 emoji/sticker 统计
 */
import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { DailyReview } from '../../types';
import { IconRenderer } from '../IconRenderer';
import { Image } from 'lucide-react';
import { EmojiExportView } from './EmojiExportView';

interface EmojiStatsViewProps {
  dailyReviews: DailyReview[];
  currentDate: Date;
  emojiRange: 'month' | 'year';
}

export const EmojiStatsView: React.FC<EmojiStatsViewProps> = ({
  dailyReviews,
  currentDate,
  emojiRange
}) => {
  const [showExportView, setShowExportView] = useState(false);

  return (
    <>
      <div className="space-y-6">
        {emojiRange === 'month' && (
          <MonthEmojiView dailyReviews={dailyReviews} currentDate={currentDate} />
        )}
        {emojiRange === 'year' && (
          <YearEmojiView dailyReviews={dailyReviews} currentDate={currentDate} />
        )}

        {/* Export Buttons */}
        <div className="flex flex-col items-center gap-3 pt-8 mt-4 mb-4">
          <button
            onClick={() => setShowExportView(true)}
            className="flex items-center gap-1 text-stone-400 hover:text-stone-600 transition-colors text-xs font-medium"
          >
            <Image size={12} />
            <span>导出统计图片</span>
          </button>
        </div>
      </div>

      {/* Use Portal to render EmojiExportView at body level */}
      {showExportView && ReactDOM.createPortal(
        <EmojiExportView
          dailyReviews={dailyReviews}
          currentDate={currentDate}
          emojiRange={emojiRange}
          onBack={() => setShowExportView(false)}
        />,
        document.body
      )}
    </>
  );
};

// 月视图组件
const MonthEmojiView: React.FC<{ dailyReviews: DailyReview[]; currentDate: Date }> = ({
  dailyReviews,
  currentDate
}) => {
  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const data: Array<{
      date: string;
      day: number;
      emoji?: string;
      summary?: string;
    }> = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const review = dailyReviews.find(r => r.date === dateStr);
      
      if (review && (review.moodEmoji || review.summary)) {
        data.push({
          date: dateStr,
          day,
          emoji: review.moodEmoji,
          summary: review.summary
        });
      }
    }

    return data;
  }, [dailyReviews, currentDate]);

  if (monthData.length === 0) {
    return (
      <div className="text-center py-12 text-stone-400">
        <p>本月暂无情绪记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {monthData.map((item, index) => (
        <div key={item.date}>
          {/* 分割线 */}
          {index > 0 && <div className="border-t border-stone-200" />}
          
          {/* 内容行 */}
          <div className="flex items-center gap-3 py-3 hover:bg-stone-50/30 transition-colors">
            {/* 日期数字 */}
            <div className="flex-shrink-0 text-stone-900 text-base w-8 text-right font-handwriting">
              {item.day}
            </div>

            {/* Emoji */}
            {item.emoji && (
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                <IconRenderer 
                  icon={item.emoji} 
                  className="w-full h-full"
                  size="100%"
                />
              </div>
            )}

            {/* 一句话总结 */}
            {item.summary && (
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-700">
                  {item.summary}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// 年视图组件
const YearEmojiView: React.FC<{ dailyReviews: DailyReview[]; currentDate: Date }> = ({
  dailyReviews,
  currentDate
}) => {
  const yearData = useMemo(() => {
    const year = currentDate.getFullYear();
    const monthsData: Array<{
      month: number;
      monthName: string;
      calendar: Array<{
        day: number | null;
        emoji?: string;
      }>;
    }> = [];

    for (let month = 0; month < 12; month++) {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startDayOfWeek = firstDay.getDay();
      
      // 调整为周一开始
      const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
      
      const calendar: Array<{ day: number | null; emoji?: string }> = [];
      
      // 填充空白
      for (let i = 0; i < adjustedStartDay; i++) {
        calendar.push({ day: null });
      }
      
      // 填充日期
      let hasData = false;
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const review = dailyReviews.find(r => r.date === dateStr);
        const emoji = review?.moodEmoji;
        
        if (emoji) {
          hasData = true;
        }
        
        calendar.push({ day, emoji });
      }
      
      // 只添加有数据的月份
      if (hasData) {
        monthsData.push({
          month: month + 1,
          monthName: `${year}.${month + 1}`,
          calendar
        });
      }
    }

    return monthsData;
  }, [dailyReviews, currentDate]);

  if (yearData.length === 0) {
    return (
      <div className="text-center py-12 text-stone-400">
        <p>本年暂无情绪记录</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {yearData.map(monthData => (
        <MonthCard key={monthData.month} {...monthData} />
      ))}
    </div>
  );
};

// 月份卡片组件
const MonthCard: React.FC<{
  month: number;
  monthName: string;
  calendar: Array<{ day: number | null; emoji?: string }>;
}> = ({ monthName, calendar }) => {
  const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="bg-stone-50 shadow-sm p-6 rounded-2xl">
      {/* 月份标题 */}
      <div className="text-center mb-4">
        <h3 className="text-lg text-stone-900 font-handwriting">{monthName}</h3>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 mb-4">
        {WEEK_DAYS.map((day, i) => (
          <div key={i} className="text-center text-sm text-stone-400 font-light">
            {day}
          </div>
        ))}
      </div>

      {/* 日历格子 */}
      <div className="grid grid-cols-7 gap-2">
        {calendar.map((item, index) => {
          if (item.day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          return (
            <div
              key={item.day}
              className="aspect-square relative flex items-center justify-center border-0 rounded-full"
            >
              {item.emoji ? (
                <div className="w-full h-full flex items-center justify-center">
                  <IconRenderer 
                    icon={item.emoji} 
                    className="w-full h-full"
                    size="100%"
                  />
                </div>
              ) : (
                <span className="text-sm font-handwriting text-stone-400">
                  {item.day}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
