/**
 * @file ObsidianExportView.tsx
 * @input Obsidian配置, 日志数据
 * @output 导出操作, 配置更新
 * @pos View (Obsidian导出设置)
 * @description Obsidian 导出配置界面,允许用户设置笔记库路径和格式,并执行导出操作
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import React, { useState, useEffect } from 'react';
import { ChevronLeft, FolderOpen, FileText, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import obsidianExportService, { ObsidianExportConfig, ObsidianExportOptions } from '../services/obsidianExportService';
import { Log, Category, TodoItem, Scope, DailyReview, WeeklyReview, MonthlyReview } from '../types';
import { ToastType } from '../components/Toast';

interface ObsidianExportViewProps {
    onBack: () => void;
    logs: Log[];
    categories: Category[];
    todos: TodoItem[];
    scopes: Scope[];
    currentDate: Date;
    onToast: (type: ToastType, message: string) => void;
    dailyReview?: DailyReview;
    dailyReviews?: DailyReview[];
    weeklyReviews?: WeeklyReview[];
    monthlyReviews?: MonthlyReview[];
    todoCategories?: any[]; // TodoCategory[]
}

export const ObsidianExportView: React.FC<ObsidianExportViewProps> = ({
    onBack,
    logs,
    categories,
    todos,
    scopes,
    currentDate,
    onToast,
    dailyReview,
    dailyReviews,
    weeklyReviews = [],
    monthlyReviews = [],
    todoCategories
}) => {
    // 配置状态
    const [rootPath, setRootPath] = useState('');
    const [pathTemplate, setPathTemplate] = useState('{YYYY}/{MM}/{YYYY}-{MM}-{DD}.md');
    const [weeklyPathTemplate, setWeeklyPathTemplate] = useState('{YYYY}/{YYYY}-W{WW}.md');
    const [monthlyPathTemplate, setMonthlyPathTemplate] = useState('{YYYY}/{YYYY}-{MM}.md');

    // 导出选项
    const [exportOptions, setExportOptions] = useState<ObsidianExportOptions>({
        includeTimeline: true,
        includeStats: true,
        includeQuestions: true,
        includeNarrative: true,
        exportWeeklyReviews: false,
        exportMonthlyReviews: false
    });

    // 辅助函数: 格式化日期为 YYYY-MM-DD (本地时间)
    const formatDateKey = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const [isExporting, setIsExporting] = useState(false);

    // 时间范围选择
    const [dateRangeMode, setDateRangeMode] = useState<'single' | 'range'>('single');
    const [startDate, setStartDate] = useState(currentDate);
    const [endDate, setEndDate] = useState(currentDate);

    // 日期输入框(8位格式)
    const [startDateInput, setStartDateInput] = useState('');
    const [endDateInput, setEndDateInput] = useState('');

    // 格式化日期为8位字符串 YYYYMMDD
    const formatDateTo8Digits = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    // 解析8位字符串为日期
    const parse8DigitsToDate = (str: string): Date | null => {
        if (str.length !== 8) return null;
        const year = parseInt(str.substring(0, 4));
        const month = parseInt(str.substring(4, 6)) - 1;
        const day = parseInt(str.substring(6, 8));
        const date = new Date(year, month, day);
        if (isNaN(date.getTime())) return null;
        return date;
    };

    // 加载保存的配置
    useEffect(() => {
        const config = obsidianExportService.getConfig();
        if (config) {
            setRootPath(config.rootPath);
            setPathTemplate(config.pathTemplate);
            if (config.weeklyPathTemplate) {
                setWeeklyPathTemplate(config.weeklyPathTemplate);
            }
            if (config.monthlyPathTemplate) {
                setMonthlyPathTemplate(config.monthlyPathTemplate);
            }
        }
        // 初始化日期输入框
        setStartDateInput(formatDateTo8Digits(currentDate));
        setEndDateInput(formatDateTo8Digits(currentDate));
    }, []);

    // 生成预览路径
    const previewPath = () => {
        if (!rootPath || !pathTemplate) return '';
        try {
            const config: ObsidianExportConfig = { rootPath, pathTemplate };
            return obsidianExportService.generateFilePath(config, currentDate);
        } catch (error) {
            return '路径格式错误';
        }
    };

    // 保存配置
    const handleSave = () => {
        if (!rootPath || !pathTemplate) {
            onToast('error', '请填写根目录路径和路径模板');
            return;
        }

        const config: ObsidianExportConfig = {
            rootPath,
            pathTemplate,
            weeklyPathTemplate: weeklyPathTemplate || undefined,
            monthlyPathTemplate: monthlyPathTemplate || undefined
        };

        obsidianExportService.saveConfig(config);
        onToast('success', '配置已保存');
    };

    // 快捷日期范围选择
    const setQuickRange = (type: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'lastSevenDays' | 'thisMonth' | 'lastMonth') => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let newStartDate: Date;
        let newEndDate: Date;

        switch (type) {
            case 'today':
                setDateRangeMode('single');
                newStartDate = today;
                newEndDate = today;
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                setDateRangeMode('single');
                newStartDate = yesterday;
                newEndDate = yesterday;
                break;
            case 'thisWeek':
                const thisWeekStart = new Date(today);
                const dayOfWeek = today.getDay();
                const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                thisWeekStart.setDate(today.getDate() - daysFromMonday);
                setDateRangeMode('range');
                newStartDate = thisWeekStart;
                newEndDate = today;
                break;
            case 'lastWeek':
                const lastWeekEnd = new Date(today);
                const currentDayOfWeek = today.getDay();
                const daysToLastSunday = currentDayOfWeek === 0 ? 0 : currentDayOfWeek;
                lastWeekEnd.setDate(today.getDate() - daysToLastSunday - 1);
                const lastWeekStart = new Date(lastWeekEnd);
                lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
                setDateRangeMode('range');
                newStartDate = lastWeekStart;
                newEndDate = lastWeekEnd;
                break;
            case 'lastSevenDays':
                const lastWeekEnd2 = new Date(today);
                lastWeekEnd2.setDate(lastWeekEnd2.getDate() - 1);
                const lastWeekStart2 = new Date(lastWeekEnd2);
                lastWeekStart2.setDate(lastWeekStart2.getDate() - 6);
                setDateRangeMode('range');
                newStartDate = lastWeekStart2;
                newEndDate = lastWeekEnd2;
                break;
            case 'thisMonth':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                setDateRangeMode('range');
                newStartDate = monthStart;
                newEndDate = monthEnd;
                break;
            case 'lastMonth':
                const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                setDateRangeMode('range');
                newStartDate = lastMonthStart;
                newEndDate = lastMonthEnd;
                break;
            default:
                return;
        }

        setStartDate(newStartDate);
        setEndDate(newEndDate);
        setStartDateInput(formatDateTo8Digits(newStartDate));
        setEndDateInput(formatDateTo8Digits(newEndDate));
    };

    // 执行导出
    const handleExport = async () => {
        if (!rootPath.trim()) {
            onToast('error', '请先配置根目录路径');
            return;
        }
        if (!pathTemplate.trim()) {
            onToast('error', '请先配置路径格式模板');
            return;
        }

        setIsExporting(true);

        try {
            const config: ObsidianExportConfig = {
                rootPath: rootPath.trim(),
                pathTemplate: pathTemplate.trim(),
                weeklyPathTemplate: weeklyPathTemplate || undefined,
                monthlyPathTemplate: monthlyPathTemplate || undefined
            };

            if (dateRangeMode === 'single') {
                // 单日导出
                const filePath = obsidianExportService.generateFilePath(config, startDate);

                // 获取当天的 dailyReview
                const dateStr = formatDateKey(startDate);
                const review = logs.length > 0 ? dailyReview : undefined; // 只有当天才传dailyReview

                const content = obsidianExportService.generateFullMarkdown(
                    logs,
                    categories,
                    todos,
                    scopes,
                    startDate,
                    startDate.toDateString() === currentDate.toDateString() ? dailyReview : undefined,
                    exportOptions,
                    todoCategories
                );

                await obsidianExportService.exportToFile(filePath, content);
                onToast('success', `导出成功: ${filePath}`);
            } else {
                // 范围导出 - 每天生成一个文件
                let exportedCount = 0;
                const current = new Date(startDate);

                while (current <= endDate) {
                    const filePath = obsidianExportService.generateFilePath(config, current);

                    // 筛选当天的logs (这里简化处理，实际应该从props获取所有日期的数据)
                    const dayStart = new Date(current);
                    dayStart.setHours(0, 0, 0, 0);
                    const dayEnd = new Date(current);
                    dayEnd.setHours(23, 59, 59, 999);

                    const dayLogs = logs.filter(log =>
                        log.startTime >= dayStart.getTime() && log.endTime <= dayEnd.getTime()
                    );

                    if (dayLogs.length > 0) {
                        // 查找当天的dailyReview
                        const dateStr = formatDateKey(current);
                        const dayReview = dailyReviews?.find(r => r.date === dateStr);

                        // 只导出有记录的日期
                        const content = obsidianExportService.generateFullMarkdown(
                            dayLogs,
                            categories,
                            todos,
                            scopes,
                            current,
                            dayReview,  // 传递当天的review
                            exportOptions,
                            todoCategories
                        );

                        await obsidianExportService.exportToFile(filePath, content);
                        exportedCount++;
                    }

                    // 移动到下一天
                    current.setDate(current.getDate() + 1);
                }

                // 周报导出
                if (exportOptions.exportWeeklyReviews && weeklyPathTemplate) {
                    const weekEnds = obsidianExportService.getWeekEndsInRange(startDate, endDate);
                    for (const weekEnd of weekEnds) {
                        // 计算周的开始日期 (周日回推6天)
                        const weekStart = new Date(weekEnd);
                        weekStart.setDate(weekEnd.getDate() - 6);
                        weekStart.setHours(0, 0, 0, 0);

                        const weekEndTime = new Date(weekEnd);
                        weekEndTime.setHours(23, 59, 59, 999);

                        // 检查该周是否有logs (只检查开始时间)
                        const weekLogs = logs.filter(log =>
                            log.startTime >= weekStart.getTime() && log.startTime <= weekEndTime.getTime()
                        );

                        // 只导出有数据的周报
                        if (weekLogs.length > 0) {
                            const filePath = obsidianExportService.generateWeeklyFilePath(config, weekEnd);
                            // 查找对应的 WeeklyReview
                            const dateStr = formatDateKey(weekEnd);
                            const weeklyReview = weeklyReviews?.find(r => r.weekEndDate === dateStr);

                            const content = obsidianExportService.generateWeeklyMarkdown(
                                logs,
                                categories,
                                todos,
                                scopes,
                                weekEnd,
                                exportOptions,
                                weeklyReview,
                                todoCategories
                            );
                            await obsidianExportService.exportToFile(filePath, content);
                            exportedCount++;
                        }
                    }
                }

                // 月报导出
                if (exportOptions.exportMonthlyReviews && monthlyPathTemplate) {
                    const monthEnds = obsidianExportService.getMonthEndsInRange(startDate, endDate);
                    for (const monthEnd of monthEnds) {
                        // 计算月的开始日期
                        const monthStart = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), 1);
                        monthStart.setHours(0, 0, 0, 0);

                        const monthEndTime = new Date(monthEnd);
                        monthEndTime.setHours(23, 59, 59, 999);

                        // 检查该月是否有logs (只检查开始时间)
                        const monthLogs = logs.filter(log =>
                            log.startTime >= monthStart.getTime() && log.startTime <= monthEndTime.getTime()
                        );

                        // 只导出有数据的月报
                        if (monthLogs.length > 0) {
                            const filePath = obsidianExportService.generateMonthlyFilePath(config, monthEnd);
                            // 查找对应的 MonthlyReview
                            const dateStr = formatDateKey(monthEnd);
                            // MonthlyReview 的 monthEndDate 也是 YYYY-MM-DD
                            const monthlyReview = monthlyReviews?.find(r => r.monthEndDate === dateStr);

                            const content = obsidianExportService.generateMonthlyMarkdown(
                                logs,
                                categories,
                                todos,
                                scopes,
                                monthEnd,
                                exportOptions,
                                monthlyReview,
                                todoCategories
                            );
                            await obsidianExportService.exportToFile(filePath, content);
                            exportedCount++;
                        }
                    }
                }

                onToast('success', `批量导出成功: ${exportedCount}个文件`);
            }
        } catch (error: any) {
            console.error('导出失败:', error);
            onToast('error', `导出失败: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div
                className="flex items-center px-4 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md shrink-0 z-10 gap-3 sticky top-0 box-border"
                style={{
                    height: 'calc(3.5rem + env(safe-area-inset-top))',
                    paddingTop: 'env(safe-area-inset-top)'
                }}
            >
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 rounded-full hover:bg-stone-100 active:scale-95 transition-transform"
                >
                    <ChevronLeft size={20} className="text-stone-500" />
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold text-stone-800">导出到 Obsidian</h1>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 overflow-y-auto pb-40">
                {/* 配置卡片 */}
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-stone-600 mb-2">
                        <FolderOpen size={24} />
                        <h3 className="font-bold text-lg">路径配置</h3>
                    </div>
                    <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                        配置 Obsidian 笔记库的路径和日记文件格式
                    </p>

                    {/* 根目录路径 */}
                    <div>
                        <label className="text-xs font-bold text-stone-400 uppercase ml-1">
                            根目录路径 (Root Path)
                        </label>
                        <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl mt-1 focus-within:ring-2 focus-within:ring-stone-200 transition-all">
                            <FolderOpen size={18} className="text-stone-400" />
                            <input
                                type="text"
                                placeholder="F:\Obsidian Vault\01 diary"
                                className="flex-1 bg-transparent border-none outline-none text-stone-700 placeholder:text-stone-300 text-sm"
                                value={rootPath}
                                onChange={e => setRootPath(e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-stone-400 mt-1 ml-1">
                            例如: F:\Obsidian Vault\01 diary
                        </p>
                    </div>

                    {/* 路径格式模板 */}
                    <div>
                        <label className="text-xs font-bold text-stone-400 uppercase ml-1">
                            日报路径模板 (PATH TEMPLATE)
                        </label>
                        <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl mt-1 focus-within:ring-2 focus-within:ring-stone-200 transition-all">
                            <FileText size={18} className="text-stone-400" />
                            <input
                                type="text"
                                placeholder="{YYYY}/{MM}/{YYYY}-{MM}-{DD}.md"
                                className="flex-1 bg-transparent border-none outline-none text-stone-700 placeholder:text-stone-300 text-sm"
                                value={pathTemplate}
                                onChange={e => setPathTemplate(e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-stone-400 mt-1 ml-1">
                            支持占位符: {'{YYYY}'} (年), {'{MM}'} (月), {'{DD}'} (日)
                        </p>
                    </div>

                    {/* 周报路径模板 */}
                    <div>
                        <label className="text-xs font-bold text-stone-400 uppercase ml-1">
                            周报路径模板
                        </label>
                        <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl mt-1 focus-within:ring-2 focus-within:ring-stone-200 transition-all">
                            <FileText size={18} className="text-stone-400" />
                            <input
                                type="text"
                                placeholder="{YYYY}/{YYYY}-W{WW}.md"
                                className="flex-1 bg-transparent border-none outline-none text-stone-700 placeholder:text-stone-300 text-sm"
                                value={weeklyPathTemplate}
                                onChange={e => setWeeklyPathTemplate(e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-stone-400 mt-1 ml-1">
                            支持占位符: {'{YYYY}'} (年), {'{MM}'} (月), {'{WW}'} (周数)
                        </p>
                    </div>

                    {/* 月报路径模板 */}
                    <div>
                        <label className="text-xs font-bold text-stone-400 uppercase ml-1">
                            月报路径模板
                        </label>
                        <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl mt-1 focus-within:ring-2 focus-within:ring-stone-200 transition-all">
                            <FileText size={18} className="text-stone-400" />
                            <input
                                type="text"
                                placeholder="{YYYY}/{YYYY}-{MM}.md"
                                className="flex-1 bg-transparent border-none outline-none text-stone-700 placeholder:text-stone-300 text-sm"
                                value={monthlyPathTemplate}
                                onChange={e => setMonthlyPathTemplate(e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-stone-400 mt-1 ml-1">
                            支持占位符: {'{YYYY}'} (年), {'{MM}'} (月)
                        </p>
                    </div>

                    {/* 路径预览 */}
                    {rootPath && pathTemplate && (
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                            <p className="text-xs font-bold text-stone-400 mb-1">路径预览</p>
                            <p className="text-sm text-stone-700 font-mono break-all">
                                {previewPath()}
                            </p>
                        </div>
                    )}

                    {/* 保存配置按钮 */}
                    <button
                        onClick={handleSave}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-stone-800 text-white rounded-xl font-medium active:scale-[0.98] transition-transform shadow-lg shadow-stone-200"
                    >
                        <CheckCircle2 size={18} />
                        保存配置
                    </button>
                </div>

                {/* 导出卡片 */}
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-stone-600 mb-2">
                        <Download size={24} />
                        <h3 className="font-bold text-lg">导出数据</h3>
                    </div>
                    <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                        选择日期范围并导出数据到 Obsidian
                    </p>

                    {/* 日期输入框 */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest px-1">时间范围</p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="text-xs text-stone-400 mb-1 block px-1">起始日期</label>
                                <input
                                    type="text"
                                    placeholder="20251229"
                                    maxLength={8}
                                    value={startDateInput}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setStartDateInput(value);
                                        if (value.length === 8) {
                                            const date = parse8DigitsToDate(value);
                                            if (date) {
                                                setStartDate(date);
                                                setDateRangeMode(date.toDateString() === endDate.toDateString() ? 'single' : 'range');
                                            }
                                        } else {
                                            setDateRangeMode('range'); // 如果输入不完整，暂时视为范围模式
                                        }
                                    }}
                                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-300"
                                />
                            </div>
                            <span className="text-stone-300 mt-5">-</span>
                            <div className="flex-1">
                                <label className="text-xs text-stone-400 mb-1 block px-1">结束日期</label>
                                <input
                                    type="text"
                                    placeholder="20251229"
                                    maxLength={8}
                                    value={endDateInput}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setEndDateInput(value);
                                        if (value.length === 8) {
                                            const date = parse8DigitsToDate(value);
                                            if (date) {
                                                setEndDate(date);
                                                setDateRangeMode(startDate.toDateString() === date.toDateString() ? 'single' : 'range');
                                            }
                                        } else {
                                            setDateRangeMode('range'); // 如果输入不完整，暂时视为范围模式
                                        }
                                    }}
                                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-300"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 时间范围输入和快捷选择 */}
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-stone-400 uppercase">快捷选择</p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setQuickRange('today')}
                                className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                            >
                                今天
                            </button>
                            <button
                                onClick={() => setQuickRange('yesterday')}
                                className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                            >
                                昨天
                            </button>
                            <button
                                onClick={() => setQuickRange('lastSevenDays')}
                                className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                            >
                                最近7天
                            </button>
                            <button
                                onClick={() => setQuickRange('thisWeek')}
                                className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                            >
                                本周
                            </button>
                            <button
                                onClick={() => setQuickRange('lastWeek')}
                                className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                            >
                                上周
                            </button>
                            <button
                                onClick={() => setQuickRange('thisMonth')}
                                className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                            >
                                本月
                            </button>
                            <button
                                onClick={() => setQuickRange('lastMonth')}
                                className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                            >
                                上月
                            </button>
                        </div>
                    </div>


                    {/* 导出选项胶囊按钮 */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest px-1">选择导出内容</p>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setExportOptions({ ...exportOptions, includeTimeline: !exportOptions.includeTimeline })}
                                className={`
                                    px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                                    ${exportOptions.includeTimeline
                                        ? 'bg-stone-100 text-stone-700 border border-stone-400 hover:bg-stone-200'
                                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}
                                `}
                            >
                                <span>记录</span>
                            </button>

                            <button
                                onClick={() => setExportOptions({ ...exportOptions, includeStats: !exportOptions.includeStats })}
                                className={`
                                    px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                                    ${exportOptions.includeStats
                                        ? 'bg-stone-100 text-stone-700 border border-stone-400 hover:bg-stone-200'
                                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}
                                `}
                            >
                                <span>数据</span>
                            </button>

                            <button
                                onClick={() => setExportOptions({ ...exportOptions, includeQuestions: !exportOptions.includeQuestions })}
                                className={`
                                    px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                                    ${exportOptions.includeQuestions
                                        ? 'bg-stone-100 text-stone-700 border border-stone-400 hover:bg-stone-200'
                                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}
                                `}
                            >
                                <span>引导</span>
                            </button>

                            <button
                                onClick={() => setExportOptions({ ...exportOptions, includeNarrative: !exportOptions.includeNarrative })}
                                className={`
                                    px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                                    ${exportOptions.includeNarrative
                                        ? 'bg-stone-100 text-stone-700 border border-stone-400 hover:bg-stone-200'
                                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}
                                `}
                            >
                                <span>叙事</span>
                            </button>

                            <button
                                onClick={() => setExportOptions({ ...exportOptions, exportWeeklyReviews: !exportOptions.exportWeeklyReviews })}
                                className={`
                                    px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                                    ${exportOptions.exportWeeklyReviews
                                        ? 'bg-stone-100 text-stone-700 border border-stone-400 hover:bg-stone-200'
                                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}
                                `}
                            >
                                周报
                            </button>

                            <button
                                onClick={() => setExportOptions({ ...exportOptions, exportMonthlyReviews: !exportOptions.exportMonthlyReviews })}
                                className={`
                                    px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                                    ${exportOptions.exportMonthlyReviews
                                        ? 'bg-stone-100 text-stone-700 border border-stone-400 hover:bg-stone-200'
                                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}
                                `}
                            >
                                月报
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium active:scale-[0.98] transition-all shadow-lg ${isExporting
                            ? 'bg-stone-400 text-white cursor-not-allowed'
                            : 'bg-stone-800 text-white shadow-stone-300 hover:bg-stone-900'
                            }`}
                    >
                        {isExporting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                导出中...
                            </>
                        ) : (
                            <>
                                <Download size={18} />
                                导出数据
                            </>
                        )}
                    </button>
                </div>

                {/* 说明卡片 */}
                <div className="flex gap-3 p-4 bg-blue-50 rounded-xl text-blue-700 text-sm">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold mb-1">使用说明</p>
                        <ul className="space-y-1 text-xs">
                            <li>• 此功能仅在 Electron (PC端) 环境下可用</li>
                            <li>• 导出会自动创建不存在的目录</li>
                            <li>• 如果文件已存在，将在末尾追加新内容</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
