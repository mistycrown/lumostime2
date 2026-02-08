import { DailyReview, WeeklyReview, MonthlyReview } from '../types';
import { useData } from '../contexts/DataContext';
import { useReview } from '../contexts/ReviewContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { narrativeService } from '../services/narrativeService';
import { NARRATIVE_TEMPLATES } from '../constants';

// Helper to get local YYYY-MM-DD string
const getLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const useReviewManager = () => {
    const { dailyReviews, setDailyReviews, weeklyReviews, setWeeklyReviews, monthlyReviews, setMonthlyReviews, reviewTemplates, checkTemplates } = useReview();
    const {
        currentReviewDate, setCurrentReviewDate, setIsDailyReviewOpen,
        currentWeeklyReviewStart, setCurrentWeeklyReviewStart,
        currentWeeklyReviewEnd, setCurrentWeeklyReviewEnd, setIsWeeklyReviewOpen,
        currentMonthlyReviewStart, setCurrentMonthlyReviewStart,
        currentMonthlyReviewEnd, setCurrentMonthlyReviewEnd, setIsMonthlyReviewOpen,
        currentDate
    } = useNavigation();
    const { scopes } = useCategoryScope();
    const { userPersonalInfo, updateDataLastModified } = useSettings();
    const { addToast } = useToast();

    // --- Daily Review Handlers ---
    const handleOpenDailyReview = (targetDate?: Date) => {
        const dateToUse = (targetDate instanceof Date && !isNaN(targetDate.getTime())) ? targetDate : currentDate;
        const dateStr = getLocalDateStr(dateToUse);
        let review = dailyReviews.find(r => r.date === dateStr);

        if (!review) {
            const templateSnapshot = reviewTemplates
                .filter(t => t.isDailyTemplate)
                .sort((a, b) => a.order - b.order)
                .map(t => ({
                    id: t.id,
                    title: t.title,
                    questions: t.questions,
                    order: t.order,
                    syncToTimeline: t.syncToTimeline
                }));

            const initialCheckItems: any[] = [];
            const dailyCheckTemplates = checkTemplates.filter(t => t.enabled && t.isDaily);
            if (dailyCheckTemplates.length > 0) {
                dailyCheckTemplates.sort((a, b) => a.order - b.order).forEach(t => {
                    t.items.forEach((item: any) => {
                        const content = typeof item === 'string' ? item : item.content;
                        const icon = typeof item === 'string' ? undefined : item.icon;
                        const uiIcon = typeof item === 'string' ? undefined : item.uiIcon;
                        initialCheckItems.push({
                            id: crypto.randomUUID(),
                            category: t.title,
                            content: content,
                            icon: icon,
                            uiIcon: uiIcon,
                            isCompleted: false
                        });
                    });
                });
            }

            review = {
                id: crypto.randomUUID(),
                date: dateStr,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                answers: [],
                checkItems: initialCheckItems,
                templateSnapshot
            };
            setDailyReviews(prev => [...prev, review!]);
        }

        setCurrentReviewDate(dateToUse);
        setIsDailyReviewOpen(true);
        updateDataLastModified();
    };

    const handleUpdateReview = (updatedReview: DailyReview) => {
        setDailyReviews(prev => prev.map(r => r.id === updatedReview.id ? updatedReview : r));
        updateDataLastModified();
    };

    const handleDeleteReview = () => {
        if (!currentReviewDate) return;
        const dateStr = getLocalDateStr(currentReviewDate);
        setDailyReviews(prev => prev.filter(r => r.date !== dateStr));
        setIsDailyReviewOpen(false);
        setCurrentReviewDate(null);
        updateDataLastModified();
    };

    const handleGenerateNarrative = async (review: DailyReview, statsText: string, timelineText: string, promptTemplate?: string): Promise<string> => {
        const finalPrompt = promptTemplate || (NARRATIVE_TEMPLATES.find(t => t.id === 'default')?.prompt || '');
        return narrativeService.generateDailyNarrative(review, statsText, timelineText, finalPrompt, scopes, userPersonalInfo, 'daily');
    };

    // --- Weekly Review Handlers ---
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
        setIsWeeklyReviewOpen(true);
        updateDataLastModified();
    };

    const handleCloseWeeklyReview = () => {
        setIsWeeklyReviewOpen(false);
        setCurrentWeeklyReviewStart(null);
        setCurrentWeeklyReviewEnd(null);
    };

    const handleUpdateWeeklyReview = (updatedReview: WeeklyReview) => {
        setWeeklyReviews(prev => prev.map(r => r.id === updatedReview.id ? updatedReview : r));
        updateDataLastModified();
    };

    const handleDeleteWeeklyReview = () => {
        if (!currentWeeklyReviewStart || !currentWeeklyReviewEnd) return;
        const weekStartStr = getLocalDateStr(currentWeeklyReviewStart);
        const weekEndStr = getLocalDateStr(currentWeeklyReviewEnd);
        setWeeklyReviews(prev => prev.filter(r => !(r.weekStartDate === weekStartStr && r.weekEndDate === weekEndStr)));
        handleCloseWeeklyReview();
        updateDataLastModified();
        addToast('success', '周报已删除');
    };

    const handleGenerateWeeklyNarrative = async (review: WeeklyReview, statsText: string, promptTemplate?: string): Promise<string> => {
        const finalPrompt = promptTemplate || (NARRATIVE_TEMPLATES.find(t => t.id === 'default')?.prompt || '');
        return narrativeService.generateDailyNarrative(review as any, statsText, '', finalPrompt, scopes, userPersonalInfo, 'weekly');
    };

    // --- Monthly Review Handlers ---
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
        updateDataLastModified();
    };

    const handleCloseMonthlyReview = () => {
        setIsMonthlyReviewOpen(false);
        setCurrentMonthlyReviewStart(null);
        setCurrentMonthlyReviewEnd(null);
    };

    const handleUpdateMonthlyReview = (updatedReview: MonthlyReview) => {
        setMonthlyReviews(prev => prev.map(r => r.id === updatedReview.id ? updatedReview : r));
        updateDataLastModified();
    };

    const handleDeleteMonthlyReview = () => {
        if (!currentMonthlyReviewStart || !currentMonthlyReviewEnd) return;
        const monthStartStr = getLocalDateStr(currentMonthlyReviewStart);
        const monthEndStr = getLocalDateStr(currentMonthlyReviewEnd);
        setMonthlyReviews(prev => prev.filter(r => !(r.monthStartDate === monthStartStr && r.monthEndDate === monthEndStr)));
        handleCloseMonthlyReview();
        updateDataLastModified();
        addToast('success', '月报已删除');
    };

    const handleGenerateMonthlyNarrative = async (review: MonthlyReview, statsText: string, promptTemplate?: string): Promise<string> => {
        const finalPrompt = promptTemplate || (NARRATIVE_TEMPLATES.find(t => t.id === 'default')?.prompt || '');
        return narrativeService.generateDailyNarrative(review as any, statsText, '', finalPrompt, scopes, userPersonalInfo, 'monthly');
    };

    return {
        handleOpenDailyReview,
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
