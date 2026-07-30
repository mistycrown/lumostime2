/**
 * @file useReviewManager.ts
 * @input DataContext (dailyReviews, weeklyReviews, monthlyReviews, reviewTemplates, checkTemplates), ReviewContext (review data setters), NavigationContext (review modal states, currentDate), CategoryScopeContext (scopes), SettingsContext (userPersonalInfo), ToastContext (addToast)
 * @output Review CRUD Operations (handleOpenDailyReview, handleUpdateReview, handleDeleteReview, handleOpenWeeklyReview, handleUpdateWeeklyReview, handleDeleteWeeklyReview, handleOpenMonthlyReview, handleUpdateMonthlyReview, handleDeleteMonthlyReview), Narrative Generation (handleGenerateNarrative, handleGenerateWeeklyNarrative, handleGenerateMonthlyNarrative), Modal Control (handleCloseWeeklyReview, handleCloseMonthlyReview)
 * @pos Hook (Data Manager)
 * @description Review data manager hook. Handles create/update/delete flows for daily, weekly, and monthly reviews, plus AI narrative generation.
 * @updated 2026-07-30: Made Daily Review updates insert missing reviews so first sidebar check-ins persist their generated review.
 */
import { DailyReview, WeeklyReview, MonthlyReview } from '../types';
import { useReview } from '../contexts/ReviewContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { narrativeService } from '../services/narrativeService';
import { NARRATIVE_TEMPLATES } from '../constants';
import { getLocalDateStr } from '../utils/dateUtils';
import { createDailyReviewFromTemplates } from '../utils/dailyCheckUtils';

export const useReviewManager = () => {
    const {
        dailyReviews,
        setDailyReviews,
        weeklyReviews,
        setWeeklyReviews,
        monthlyReviews,
        setMonthlyReviews,
        reviewTemplates,
        checkTemplates
    } = useReview();
    const {
        currentReviewDate,
        setCurrentReviewDate,
        setIsDailyReviewOpen,
        currentWeeklyReviewStart,
        setCurrentWeeklyReviewStart,
        currentWeeklyReviewEnd,
        setCurrentWeeklyReviewEnd,
        setCurrentWeeklyReviewInitialTab,
        setIsWeeklyReviewOpen,
        currentMonthlyReviewStart,
        setCurrentMonthlyReviewStart,
        currentMonthlyReviewEnd,
        setCurrentMonthlyReviewEnd,
        setIsMonthlyReviewOpen,
        currentDate
    } = useNavigation();
    const { scopes } = useCategoryScope();
    const { userPersonalInfo } = useSettings();
    const { addToast } = useToast();

    const handleOpenDailyReview = (targetDate?: Date) => {
        const dateToUse = (targetDate instanceof Date && !isNaN(targetDate.getTime())) ? targetDate : currentDate;
        const dateStr = getLocalDateStr(dateToUse);
        let review = dailyReviews.find(r => r.date === dateStr);

        if (!review) {
            review = createDailyReviewFromTemplates(dateStr, checkTemplates, reviewTemplates);
            setDailyReviews(prev => [...prev, review!]);
        }

        setCurrentReviewDate(dateToUse);
        setIsDailyReviewOpen(true);
    };

    const handleCreateDailyReviewSilently = (targetDate?: Date): Promise<DailyReview> => {
        return new Promise((resolve) => {
            const dateToUse = (targetDate instanceof Date && !isNaN(targetDate.getTime())) ? targetDate : currentDate;
            const dateStr = getLocalDateStr(dateToUse);
            let review = dailyReviews.find(r => r.date === dateStr);

            if (review) {
                resolve(review);
                return;
            }

            review = createDailyReviewFromTemplates(dateStr, checkTemplates, reviewTemplates);
            setDailyReviews(prev => [...prev, review!]);
            console.log('[AutoGenerate] Created daily review silently');
            resolve(review);
        });
    };

    const handleUpdateReview = (updatedReview: DailyReview) => {
        setDailyReviews(prev => {
            const exists = prev.some(review => review.id === updatedReview.id);
            return exists
                ? prev.map(review => review.id === updatedReview.id ? updatedReview : review)
                : [...prev, updatedReview];
        });
    };

    const handleDeleteReview = () => {
        if (!currentReviewDate) return;
        const dateStr = getLocalDateStr(currentReviewDate);
        setDailyReviews(prev => prev.filter(r => r.date !== dateStr));
        setIsDailyReviewOpen(false);
        setCurrentReviewDate(null);
    };

    const handleGenerateNarrative = async (
        review: DailyReview,
        statsText: string,
        timelineText: string,
        promptTemplate?: string
    ): Promise<string> => {
        const finalPrompt = promptTemplate || (NARRATIVE_TEMPLATES.find(t => t.id === 'default')?.prompt || '');
        return narrativeService.generateDailyNarrative(review, statsText, timelineText, finalPrompt, scopes, userPersonalInfo, 'daily');
    };

    const handleOpenWeeklyReview = (weekStart: Date, weekEnd: Date) => {
        const weekStartStr = getLocalDateStr(weekStart);
        const weekEndStr = getLocalDateStr(weekEnd);
        let review = weeklyReviews.find(r => r.weekStartDate === weekStartStr && r.weekEndDate === weekEndStr);

        if (!review) {
            const templateSnapshot = reviewTemplates
                .filter(t => t.isWeeklyTemplate)
                .sort((a, b) => a.order - b.order)
                .map(t => ({
                    id: t.id,
                    title: t.title,
                    questions: t.questions,
                    order: t.order,
                    syncToTimeline: t.syncToTimeline
                }));

            review = {
                id: crypto.randomUUID(),
                weekStartDate: weekStartStr,
                weekEndDate: weekEndStr,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                answers: [],
                templateSnapshot
            };
            setWeeklyReviews(prev => [...prev, review!]);
        }

        setCurrentWeeklyReviewStart(weekStart);
        setCurrentWeeklyReviewEnd(weekEnd);
        setCurrentWeeklyReviewInitialTab(null);
        setIsWeeklyReviewOpen(true);
    };

    const handleCloseWeeklyReview = () => {
        setIsWeeklyReviewOpen(false);
        setCurrentWeeklyReviewStart(null);
        setCurrentWeeklyReviewEnd(null);
        setCurrentWeeklyReviewInitialTab(null);
    };

    const handleUpdateWeeklyReview = (updatedReview: WeeklyReview) => {
        setWeeklyReviews(prev => prev.map(r => r.id === updatedReview.id ? updatedReview : r));
    };

    const handleDeleteWeeklyReview = () => {
        if (!currentWeeklyReviewStart || !currentWeeklyReviewEnd) return;
        const weekStartStr = getLocalDateStr(currentWeeklyReviewStart);
        const weekEndStr = getLocalDateStr(currentWeeklyReviewEnd);
        setWeeklyReviews(prev => prev.filter(r => !(r.weekStartDate === weekStartStr && r.weekEndDate === weekEndStr)));
        handleCloseWeeklyReview();
        addToast('success', '周报已删除');
    };

    const handleGenerateWeeklyNarrative = async (review: WeeklyReview, statsText: string, promptTemplate?: string): Promise<string> => {
        const finalPrompt = promptTemplate || (NARRATIVE_TEMPLATES.find(t => t.id === 'default')?.prompt || '');
        return narrativeService.generateDailyNarrative(review as any, statsText, '', finalPrompt, scopes, userPersonalInfo, 'weekly');
    };

    const handleOpenMonthlyReview = (monthStart: Date, monthEnd: Date) => {
        const monthStartStr = getLocalDateStr(monthStart);
        const monthEndStr = getLocalDateStr(monthEnd);
        let review = monthlyReviews.find(r => r.monthStartDate === monthStartStr && r.monthEndDate === monthEndStr);

        if (!review) {
            const templateSnapshot = reviewTemplates
                .filter(t => t.isMonthlyTemplate)
                .sort((a, b) => a.order - b.order)
                .map(t => ({
                    id: t.id,
                    title: t.title,
                    questions: t.questions,
                    order: t.order,
                    syncToTimeline: t.syncToTimeline
                }));

            review = {
                id: crypto.randomUUID(),
                monthStartDate: monthStartStr,
                monthEndDate: monthEndStr,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                answers: [],
                templateSnapshot
            };
            setMonthlyReviews(prev => [...prev, review!]);
        }

        setCurrentMonthlyReviewStart(monthStart);
        setCurrentMonthlyReviewEnd(monthEnd);
        setIsMonthlyReviewOpen(true);
    };

    const handleCloseMonthlyReview = () => {
        setIsMonthlyReviewOpen(false);
        setCurrentMonthlyReviewStart(null);
        setCurrentMonthlyReviewEnd(null);
    };

    const handleUpdateMonthlyReview = (updatedReview: MonthlyReview) => {
        setMonthlyReviews(prev => prev.map(r => r.id === updatedReview.id ? updatedReview : r));
    };

    const handleDeleteMonthlyReview = () => {
        if (!currentMonthlyReviewStart || !currentMonthlyReviewEnd) return;
        const monthStartStr = getLocalDateStr(currentMonthlyReviewStart);
        const monthEndStr = getLocalDateStr(currentMonthlyReviewEnd);
        setMonthlyReviews(prev => prev.filter(r => !(r.monthStartDate === monthStartStr && r.monthEndDate === monthEndStr)));
        handleCloseMonthlyReview();
        addToast('success', '月报已删除');
    };

    const handleGenerateMonthlyNarrative = async (review: MonthlyReview, statsText: string, promptTemplate?: string): Promise<string> => {
        const finalPrompt = promptTemplate || (NARRATIVE_TEMPLATES.find(t => t.id === 'default')?.prompt || '');
        return narrativeService.generateDailyNarrative(review as any, statsText, '', finalPrompt, scopes, userPersonalInfo, 'monthly');
    };

    return {
        handleOpenDailyReview,
        handleCreateDailyReviewSilently,
        handleUpdateReview,
        handleDeleteReview,
        handleGenerateNarrative,
        handleOpenWeeklyReview,
        handleCloseWeeklyReview,
        handleUpdateWeeklyReview,
        handleDeleteWeeklyReview,
        handleGenerateWeeklyNarrative,
        handleOpenMonthlyReview,
        handleCloseMonthlyReview,
        handleUpdateMonthlyReview,
        handleDeleteMonthlyReview,
        handleGenerateMonthlyNarrative
    };
};
