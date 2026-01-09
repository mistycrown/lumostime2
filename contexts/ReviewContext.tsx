/**
 * @file ReviewContext.tsx
 * @description 管理 Review 系统的所有状态和数据（每日回顾、每周回顾、每月回顾）
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DailyReview, WeeklyReview, MonthlyReview, ReviewTemplate, CheckTemplate } from '../types';
import { DEFAULT_REVIEW_TEMPLATES, INITIAL_DAILY_REVIEWS, DEFAULT_CHECK_TEMPLATES } from '../constants';

interface ReviewContextType {
    // Review 模板
    reviewTemplates: ReviewTemplate[];
    setReviewTemplates: React.Dispatch<React.SetStateAction<ReviewTemplate[]>>;

    // Check 模板
    checkTemplates: CheckTemplate[];
    setCheckTemplates: React.Dispatch<React.SetStateAction<CheckTemplate[]>>;

    // Review 时间设置
    dailyReviewTime: string;
    setDailyReviewTime: React.Dispatch<React.SetStateAction<string>>;

    weeklyReviewTime: string;
    setWeeklyReviewTime: React.Dispatch<React.SetStateAction<string>>;

    monthlyReviewTime: string;
    setMonthlyReviewTime: React.Dispatch<React.SetStateAction<string>>;

    // Daily Review 数据
    dailyReviews: DailyReview[];
    setDailyReviews: React.Dispatch<React.SetStateAction<DailyReview[]>>;

    // Weekly Review 数据
    weeklyReviews: WeeklyReview[];
    setWeeklyReviews: React.Dispatch<React.SetStateAction<WeeklyReview[]>>;

    // Monthly Review 数据
    monthlyReviews: MonthlyReview[];
    setMonthlyReviews: React.Dispatch<React.SetStateAction<MonthlyReview[]>>;
}

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export const useReview = () => {
    const context = useContext(ReviewContext);
    if (!context) {
        throw new Error('useReview must be used within a ReviewProvider');
    }
    return context;
};

export const ReviewProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Review 模板
    const [reviewTemplates, setReviewTemplates] = useState<ReviewTemplate[]>(() => {
        const stored = localStorage.getItem('lumostime_reviewTemplates');
        return stored ? JSON.parse(stored) : DEFAULT_REVIEW_TEMPLATES;
    });

    // Check 模板
    const [checkTemplates, setCheckTemplates] = useState<CheckTemplate[]>(() => {
        const stored = localStorage.getItem('lumostime_checkTemplates');
        return stored ? JSON.parse(stored) : DEFAULT_CHECK_TEMPLATES;
    });

    // Review 时间设置
    const [dailyReviewTime, setDailyReviewTime] = useState<string>(() => {
        return localStorage.getItem('lumostime_review_time') || '22:00';
    });

    const [weeklyReviewTime, setWeeklyReviewTime] = useState<string>(() => {
        return localStorage.getItem('lumostime_weekly_review_time') || '0-2200';
    });

    const [monthlyReviewTime, setMonthlyReviewTime] = useState<string>(() => {
        return localStorage.getItem('lumostime_monthly_review_time') || '0-2200';
    });

    // Review 数据
    const [dailyReviews, setDailyReviews] = useState<DailyReview[]>(() => {
        const stored = localStorage.getItem('lumostime_dailyReviews');
        return stored ? JSON.parse(stored) : INITIAL_DAILY_REVIEWS;
    });

    const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>(() => {
        const stored = localStorage.getItem('lumostime_weeklyReviews');
        return stored ? JSON.parse(stored) : [];
    });

    const [monthlyReviews, setMonthlyReviews] = useState<MonthlyReview[]>(() => {
        const stored = localStorage.getItem('lumostime_monthlyReviews');
        return stored ? JSON.parse(stored) : [];
    });

    // 持久化到 localStorage
    useEffect(() => {
        localStorage.setItem('lumostime_reviewTemplates', JSON.stringify(reviewTemplates));
    }, [reviewTemplates]);

    useEffect(() => {
        localStorage.setItem('lumostime_checkTemplates', JSON.stringify(checkTemplates));
    }, [checkTemplates]);

    useEffect(() => {
        localStorage.setItem('lumostime_review_time', dailyReviewTime);
    }, [dailyReviewTime]);

    useEffect(() => {
        localStorage.setItem('lumostime_weekly_review_time', weeklyReviewTime);
    }, [weeklyReviewTime]);

    useEffect(() => {
        localStorage.setItem('lumostime_monthly_review_time', monthlyReviewTime);
    }, [monthlyReviewTime]);

    useEffect(() => {
        localStorage.setItem('lumostime_dailyReviews', JSON.stringify(dailyReviews));
    }, [dailyReviews]);

    useEffect(() => {
        localStorage.setItem('lumostime_weeklyReviews', JSON.stringify(weeklyReviews));
    }, [weeklyReviews]);

    useEffect(() => {
        localStorage.setItem('lumostime_monthlyReviews', JSON.stringify(monthlyReviews));
    }, [monthlyReviews]);

    return (
        <ReviewContext.Provider value={{
            reviewTemplates,
            setReviewTemplates,
            dailyReviewTime,
            setDailyReviewTime,
            weeklyReviewTime,
            setWeeklyReviewTime,
            monthlyReviewTime,
            setMonthlyReviewTime,
            dailyReviews,
            setDailyReviews,
            weeklyReviews,
            setWeeklyReviews,
            monthlyReviews,
            setMonthlyReviews,
            checkTemplates,
            setCheckTemplates
        }}>
            {children}
        </ReviewContext.Provider>
    );
};
