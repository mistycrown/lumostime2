/**
 * @file obsidianExportService.ts
 * @input Obsidian配置, 日志数据, 日期
 * @output Markdown文件路径和内容
 * @pos Service (导出服务)
 * @description 处理导出数据到 Obsidian 笔记的逻辑,包括路径生成、Markdown内容生成和文件写入
 * @updated 2026-04-09: PC ???????????????????????????????????????, ??????????????????????
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { Log, Category, TodoItem, Scope, DailyReview } from '../types';
import { imageService } from './imageService';

/**
 * 导出选项
 */
export interface ObsidianExportOptions {
    includeTimeline: boolean;     // 时间记录
    includeStats: boolean;        // 数据统计
    includeQuestions: boolean;    // 引导提问
    includeNarrative: boolean;    // AI 叙事
    exportWeeklyReviews?: boolean;  // 导出范围内周报
    exportMonthlyReviews?: boolean; // 导出范围内月报
}

/**
 * Obsidian 导出配置
 */
export interface ObsidianExportConfig {
    rootPath: string;        // 根目录,如: "F:\Obsidian Vault\01 diary"
    pathTemplate: string;    // 路径模板,如: "{YYYY}/{MM}/{YYYY}-{MM}-{DD}.md"
    weeklyPathTemplate?: string;  // 周报路径模板,如: "{YYYY}/{YYYY}-W{WW}.md"
    monthlyPathTemplate?: string; // 月报路径模板,如: "{YYYY}/{YYYY}-{MM}.md"
    imageFolderName: string; // Image output folder relative to root path
}

/**
 * LocalStorage 存储key
 */
const STORAGE_KEY = 'lumos_obsidian_export_config';

/**
 * Obsidian 导出服务
 */
class ObsidianExportService {
    /**
     * 生成文件路径
     */
    generateFilePath(config: ObsidianExportConfig, date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        let filePath = config.pathTemplate
            .replace(/{YYYY}/g, String(year))
            .replace(/{MM}/g, month)
            .replace(/{DD}/g, day);

        const fullPath = config.rootPath.replace(/\/$/, '') + '/' + filePath;
        return fullPath.replace(/\//g, '\\');
    }

    /**
     * 生成周报文件路径
     */
    generateWeeklyFilePath(config: ObsidianExportConfig, date: Date): string {
        if (!config.weeklyPathTemplate) {
            throw new Error('周报路径模板未配置');
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const weekNumber = this.getISOWeek(date);

        let filePath = config.weeklyPathTemplate
            .replace(/{YYYY}/g, String(year))
            .replace(/{MM}/g, month)
            .replace(/{WW}/g, String(weekNumber).padStart(2, '0'));

        const fullPath = config.rootPath.replace(/\/$/, '') + '/' + filePath;
        return fullPath.replace(/\//g, '\\');
    }

    /**
     * 生成月报文件路径
     */
    generateMonthlyFilePath(config: ObsidianExportConfig, date: Date): string {
        if (!config.monthlyPathTemplate) {
            throw new Error('月报路径模板未配置');
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');

        let filePath = config.monthlyPathTemplate
            .replace(/{YYYY}/g, String(year))
            .replace(/{MM}/g, month);

        const fullPath = config.rootPath.replace(/\/$/, '') + '/' + filePath;
        return fullPath.replace(/\//g, '\\');
    }


    /**
     * 生成数据统计内容
     */
    generateStatsMarkdown(
        logs: Log[],
        categories: Category[],
        todos: TodoItem[],
        scopes: Scope[],
        date: Date,
        todoCategories?: any[] // TodoCategory[]
    ): string {
        // 直接使用传入的logs,不再进行日期筛选
        // 因为调用者(日报/周报/月报生成函数)已经负责筛选了正确时间范围内的数据
        if (logs.length === 0) {
            return `## 📊 数据统计\n\n暂无数据\n`;
        }

        const totalDuration = logs.reduce((acc, l) => acc + l.duration, 0);
        const formatDuration = (seconds: number) => {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            return h > 0 ? `${h}h ${m}m` : `${m}m`;
        };

        let text = `## 📊 数据统计\n`;
        text += `**总时长**: ${formatDuration(totalDuration)}\n\n`;

        // 按一级分类和二级活动统计
        const categoryMap = new Map<string, {
            categoryId: string;
            categoryName: string;
            totalDuration: number;
            activities: Map<string, { activityName: string; duration: number }>;
        }>();

        logs.forEach(log => {
            const cat = categories.find(c => c.id === log.categoryId);
            const act = cat?.activities.find(a => a.id === log.activityId);
            if (cat && act) {
                let categoryData = categoryMap.get(cat.id);
                if (!categoryData) {
                    categoryData = {
                        categoryId: cat.id,
                        categoryName: cat.name,
                        totalDuration: 0,
                        activities: new Map()
                    };
                    categoryMap.set(cat.id, categoryData);
                }

                categoryData.totalDuration += log.duration;

                const activityData = categoryData.activities.get(act.id);
                if (activityData) {
                    activityData.duration += log.duration;
                } else {
                    categoryData.activities.set(act.id, {
                        activityName: act.name,
                        duration: log.duration
                    });
                }
            }
        });

        if (categoryMap.size > 0) {
            text += `### 分类统计\n\n`;

            // 按总时长排序分类
            const sortedCategories = Array.from(categoryMap.values())
                .sort((a, b) => b.totalDuration - a.totalDuration);

            sortedCategories.forEach(catData => {
                const percentage = ((catData.totalDuration / totalDuration) * 100).toFixed(1);
                text += `- **${catData.categoryName}**: ${formatDuration(catData.totalDuration)} (${percentage}%)\n`;

                // 二级活动列表
                const sortedActivities = Array.from(catData.activities.values())
                    .sort((a, b) => b.duration - a.duration);

                sortedActivities.forEach(actData => {
                    const actPercentage = ((actData.duration / totalDuration) * 100).toFixed(1);
                    text += `  - ${actData.activityName}: ${formatDuration(actData.duration)} (${actPercentage}%)\n`;
                });
            });
            text += '\n';
        }

        // 按待办分类和具体待办统计
        const todoMap = new Map<string, {
            categoryId: string;
            categoryName: string;
            totalDuration: number;
            todos: Map<string, { todoTitle: string; duration: number }>;
        }>();

        logs.forEach(log => {
            if (log.linkedTodoId) {
                const todo = todos.find(t => t.id === log.linkedTodoId);
                if (todo) {
                    let categoryData = todoMap.get(todo.categoryId);
                    if (!categoryData) {
                        const todoCat = todoCategories?.find(c => c.id === todo.categoryId);
                        categoryData = {
                            categoryId: todo.categoryId,
                            categoryName: todoCat?.name || '未分类',
                            totalDuration: 0,
                            todos: new Map()
                        };
                        todoMap.set(todo.categoryId, categoryData);
                    }

                    categoryData.totalDuration += log.duration;

                    const todoData = categoryData.todos.get(todo.id);
                    if (todoData) {
                        todoData.duration += log.duration;
                    } else {
                        categoryData.todos.set(todo.id, {
                            todoTitle: todo.title,
                            duration: log.duration
                        });
                    }
                }
            }
        });

        if (todoMap.size > 0) {
            text += `### 待办统计\n\n`;

            // 按总时长排序待办分类
            const sortedTodoCategories = Array.from(todoMap.values())
                .sort((a, b) => b.totalDuration - a.totalDuration);

            sortedTodoCategories.forEach(catData => {
                const percentage = ((catData.totalDuration / totalDuration) * 100).toFixed(1);
                text += `- **${catData.categoryName}**: ${formatDuration(catData.totalDuration)} (${percentage}%)\n`;

                // 具体待办列表
                const sortedTodos = Array.from(catData.todos.values())
                    .sort((a, b) => b.duration - a.duration);

                sortedTodos.forEach(todoData => {
                    const todoPercentage = ((todoData.duration / totalDuration) * 100).toFixed(1);
                    text += `  - ${todoData.todoTitle}: ${formatDuration(todoData.duration)} (${todoPercentage}%)\n`;
                });
            });
            text += '\n';
        }

        // 按领域统计
        const scopeStats = new Map<string, number>();
        logs.forEach(log => {
            if (log.scopeIds && log.scopeIds.length > 0) {
                log.scopeIds.forEach(scopeId => {
                    const scope = scopes.find(s => s.id === scopeId);
                    if (scope) {
                        const current = scopeStats.get(scope.name) || 0;
                        scopeStats.set(scope.name, current + log.duration);
                    }
                });
            }
        });

        if (scopeStats.size > 0) {
            text += `### 领域统计\n\n`;
            Array.from(scopeStats.entries())
                .sort((a, b) => b[1] - a[1])
                .forEach(([name, duration]) => {
                    const percentage = ((duration / totalDuration) * 100).toFixed(1);
                    text += `- **${name}**: ${formatDuration(duration)} (${percentage}%)\n`;
                });
        }

        return text;
    }

    /**
     * 鐢熸垚鍥剧墖瀵煎嚭鐨勪綅鎴?
     */
    generateImagesSection(imageFilenames: string[]): string {
        if (!imageFilenames || imageFilenames.length === 0) {
            return '';
        }

        let text = '## 🖼️ 图片\n\n';
        imageFilenames.forEach(filename => {
            text += `![[${filename}]]\n\n`;
        });

        return text.trimEnd();
    }

    /**
     * 鎷兼帴鏃ュ織涓寮曡鍚嶇殑鍥剧墖(淇濈暀棣栨鍑虹幇椤甸潰)
     */
    collectLogImages(logs: Log[]): string[] {
        const seen = new Set<string>();
        const ordered: string[] = [];

        logs.forEach(log => {
            if (Array.isArray(log.images)) {
                log.images.forEach(filename => {
                    if (filename && !seen.has(filename)) {
                        seen.add(filename);
                        ordered.push(filename);
                    }
                });
            }
        });

        return ordered;
    }

    /**
     * 生成引导提问内容
     */
    generateQuestionsMarkdown(dailyReview: DailyReview | undefined, date: Date): string {
        if (!dailyReview || !dailyReview.answers || dailyReview.answers.length === 0) {
            return `## 💭 引导提问\n\n暂无回顾记录\n`;
        }

        let text = `## 💭 引导提问\n\n`;
        dailyReview.answers.forEach(answer => {
            text += `**${answer.question}**\n\n${answer.answer}\n\n`;
        });

        return text;
    }

    /**
     * 生成 AI 叙事内容(使用引用块避免格式冲突)
     */
    generateNarrativeMarkdown(narrative?: string): string {
        if (!narrative) {
            return `## ✨ 叙事\n\n暂无叙事\n`;
        }

        let text = `## ✨ 叙事\n\n`;

        // 将叙事内容按行分割,每行添加引用符号
        const narrativeLines = narrative.split('\n');
        narrativeLines.forEach(line => {
            text += `> ${line}\n`;
        });
        text += '\n';

        return text;
    }

    /**
     * 生成时间记录 Markdown 内容
     * 复用 TimelineView.handleExport 的逻辑
     */
    generateTimelineMarkdown(
        logs: Log[],
        categories: Category[],
        todos: TodoItem[],
        scopes: Scope[],
        date: Date
    ): string {
        // 1. 筛选当天的日志
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const dayLogs = logs.filter(log => {
            return log.startTime >= startOfDay.getTime() && log.endTime <= endOfDay.getTime();
        }).sort((a, b) => a.startTime - b.startTime);

        if (dayLogs.length === 0) {
            return `## 📅 ${this.formatDate(date)} 时间记录\n\n暂无记录\n`;
        }

        // 2. 统计数据
        const totalDuration = dayLogs.reduce((acc, l) => acc + l.duration, 0);
        const totalH = Math.floor(totalDuration / 3600);
        const totalM = Math.floor((totalDuration % 3600) / 60);

        const focusLogs = dayLogs.filter(l => l.focusScore !== undefined);
        const avgFocus = focusLogs.length > 0
            ? (focusLogs.reduce((acc, l) => acc + (l.focusScore || 0), 0) / focusLogs.length).toFixed(1)
            : 'N/A';

        // 3. 生成标题
        const dateStr = this.formatDate(date);
        const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekStr = weekMap[date.getDay()];

        let text = `## 📅 ${dateStr} ${weekStr} 时间记录\n`;
        text += `**总记录时长**: ${totalH}h ${totalM}m | **平均专注度**: ${avgFocus}\n\n`;

        // 4. 生成每条记录
        dayLogs.forEach(log => {
            const start = new Date(log.startTime);
            const end = new Date(log.endTime);
            const sTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
            const eTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
            const mins = Math.round(log.duration / 60);

            const cat = categories.find(c => c.id === log.categoryId);
            const act = cat?.activities.find(a => a.id === log.activityId);
            const todo = todos.find(t => t.id === log.linkedTodoId);
            const scopesList = log.scopeIds?.map(id => scopes.find(s => s.id === id)).filter(Boolean) || [];

            const content = log.note ? ` ${log.note}` : '';
            text += `${sTime}-${eTime} (${mins}m) **[${cat?.name || '未知'}/${act?.name || '未知'}]**${content}`;

            if (log.focusScore && log.focusScore > 0) text += ` ⚡️${log.focusScore}`;
            if (log.moodScore && log.moodScore > 0) text += ` ❤️${log.moodScore}`;
            if (todo) text += ` @${todo.title}`;
            // 只有进度待办才显示进度增量和进度比例
            if (todo?.isProgress) {
                if (log.progressIncrement && log.progressIncrement > 0) text += ` +${log.progressIncrement}`;
                text += `（${(todo.completedUnits || 0)}/${todo.totalAmount}）`;
            }
            if (scopesList.length > 0) text += ` %${scopesList.map(s => s.name).join(', ')}`;
            text += '\n';
        });

        return text;
    }

    /**
     * 生成完整的 Markdown 内容(根据选项)
     */
    generateFullMarkdown(
        logs: Log[],
        categories: Category[],
        todos: TodoItem[],
        scopes: Scope[],
        date: Date,
        dailyReview?: DailyReview,
        options: ObsidianExportOptions = this.defaultOptions,
        todoCategories?: any[],
        imageFilenames?: string[]
    ): string {
        const sections: string[] = [];

        if (options.includeTimeline) {
            sections.push(this.generateTimelineMarkdown(logs, categories, todos, scopes, date));
        }

        if (options.includeStats) {
            sections.push(this.generateStatsMarkdown(logs, categories, todos, scopes, date, todoCategories));
        }

        if (options.includeQuestions) {
            sections.push(this.generateQuestionsMarkdown(dailyReview, date));
        }

        if (options.includeNarrative) {
            sections.push(this.generateNarrativeMarkdown(dailyReview?.narrative));
        }

        if (imageFilenames && imageFilenames.length > 0) {
            sections.push(this.generateImagesSection(imageFilenames));
        }

        return sections.join('\n\n');
    }

    /**
     * 生成周报 Markdown 内容(不含时间记录)
     */
    generateWeeklyMarkdown(
        logs: Log[],
        categories: Category[],
        todos: TodoItem[],
        scopes: Scope[],
        weekEndDate: Date,
        options: ObsidianExportOptions,
        weeklyReview?: any, // WeeklyReview 类型
        todoCategories?: any[]
    ): string {
        // 计算周的开始日期(周日往前推6天,形成完整的7天周)
        const weekStart = new Date(weekEndDate);
        weekStart.setDate(weekEndDate.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);

        // 筛选整周的logs
        const weekStartTime = weekStart.getTime();
        const weekEndTime = new Date(weekEndDate);
        weekEndTime.setHours(23, 59, 59, 999);

        const weekLogs = logs.filter(log => {
            return log.startTime >= weekStartTime && log.startTime <= weekEndTime.getTime();
        });

        const sections: string[] = [];
        const dateStr = this.formatDate(weekEndDate);
        const weekNumber = this.getISOWeek(weekEndDate);

        sections.push(`# ${weekEndDate.getFullYear()} 年第 ${weekNumber} 周周报\n`);
        sections.push(`**周期**: ${this.formatDate(weekStart)} - ${dateStr}\n`);

        if (options.includeStats && weekLogs.length > 0) {
            sections.push(this.generateStatsMarkdown(weekLogs, categories, todos, scopes, weekEndDate, todoCategories));
        }

        if (options.includeQuestions && weeklyReview) {
            sections.push(this.generateQuestionsMarkdown(weeklyReview, weekEndDate));
        }

        if (options.includeNarrative && weeklyReview) {
            sections.push(this.generateNarrativeMarkdown(weeklyReview?.narrative));
        }

        return sections.join('\n\n');
    }

    /**
     * 生成月报 Markdown 内容(不含时间记录)
     */
    generateMonthlyMarkdown(
        logs: Log[],
        categories: Category[],
        todos: TodoItem[],
        scopes: Scope[],
        monthEndDate: Date,
        options: ObsidianExportOptions,
        monthlyReview?: any, // MonthlyReview 类型
        todoCategories?: any[]
    ): string {
        // 计算月的开始日期
        const monthStart = new Date(monthEndDate.getFullYear(), monthEndDate.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);

        // 筛选整月的logs
        const monthStartTime = monthStart.getTime();
        const monthEndTime = new Date(monthEndDate);
        monthEndTime.setHours(23, 59, 59, 999);

        const monthLogs = logs.filter(log => {
            return log.startTime >= monthStartTime && log.startTime <= monthEndTime.getTime();
        });

        const sections: string[] = [];
        const year = monthEndDate.getFullYear();
        const month = monthEndDate.getMonth() + 1;

        sections.push(`# ${year} 年 ${month} 月月报\n`);
        sections.push(`**月份**: ${year}-${String(month).padStart(2, '0')}\n`);

        if (options.includeStats && monthLogs.length > 0) {
            sections.push(this.generateStatsMarkdown(monthLogs, categories, todos, scopes, monthEndDate, todoCategories));
        }

        if (options.includeQuestions && monthlyReview) {
            sections.push(this.generateQuestionsMarkdown(monthlyReview, monthEndDate));
        }

        if (options.includeNarrative && monthlyReview) {
            sections.push(this.generateNarrativeMarkdown(monthlyReview?.narrative));
        }

        return sections.join('\n\n');
    }

    /**
     * 获取日期范围内的周末(周日)
     */
    getWeekEndsInRange(startDate: Date, endDate: Date): Date[] {
        const weekEnds: Date[] = [];
        const current = new Date(startDate);
        current.setHours(0, 0, 0, 0);

        while (current <= endDate) {
            if (current.getDay() === 0) { // 周日
                weekEnds.push(new Date(current));
            }
            current.setDate(current.getDate() + 1);
        }

        return weekEnds;
    }

    /**
     * 获取日期范围内的月末
     */
    getMonthEndsInRange(startDate: Date, endDate: Date): Date[] {
        const monthEnds: Date[] = [];
        const current = new Date(startDate);
        current.setHours(0, 0, 0, 0);

        while (current <= endDate) {
            const nextDay = new Date(current);
            nextDay.setDate(nextDay.getDate() + 1);

            // 如果下一天是新月份的第一天,当前日期就是月末
            if (nextDay.getDate() === 1) {
                monthEnds.push(new Date(current));
            }

            current.setDate(current.getDate() + 1);
        }

        return monthEnds;
    }

    /**
     * 格式化日期为 YYYY-MM-DD
     */
    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * 获取 ISO 周数
     */
    private getISOWeek(date: Date): number {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        // Thursday in current week decides the year.
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        // January 4 is always in week 1.
        const week1 = new Date(d.getFullYear(), 0, 4);
        // Adjust to Thursday in week 1 and count number of weeks from date to week1.
        return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    }

    /**
     * PC 绔墽琛屼笂浼犲浘鐗囩殑IPC鎺ユ敹
     */
    async exportImagesToFolder(imageFilenames: string[], config: ObsidianExportConfig): Promise<void> {
        if (!imageFilenames || imageFilenames.length === 0) {
            return;
        }

        if (!this.isElectronEnvironment()) {
            console.warn('[ObsidianExportService] Image export is only supported in Electron.');
            return;
        }

        const folderName = this.sanitizeImageFolderName(config.imageFolderName);
        if (!folderName) {
            console.warn('[ObsidianExportService] Missing image folder configuration, skip image export.');
            return;
        }

        const uniqueNames = Array.from(new Set(imageFilenames));
        const filesPayload: { filename: string; base64Data: string }[] = [];

        for (const filename of uniqueNames) {
            try {
                const rawData = await imageService.readImage(filename);
                const base64Data = await this.ensureBase64Payload(rawData);
                if (base64Data) {
                    filesPayload.push({ filename, base64Data });
                } else {
                    console.warn(`[ObsidianExportService] Empty image payload, skip ${filename}`);
                }
            } catch (error) {
                console.error(`[ObsidianExportService] Failed to read image ${filename}`, error);
            }
        }

        if (filesPayload.length === 0) {
            return;
        }

        try {
            await (window as any).ipcRenderer.invoke('write-obsidian-images', {
                rootPath: config.rootPath,
                imageFolderName: folderName,
                files: filesPayload
            });
        } catch (error: any) {
            throw new Error(`鍥剧墖瀵煎嚭澶辫触: ${error.message}`);
        }
    }

    private sanitizeImageFolderName(folderName?: string): string | null {
        if (!folderName) {
            return null;
        }
        const normalized = folderName.trim().replace(/^[\\/]+|[\\/]+$/g, '').replace(/\\/g, '/');
        if (!normalized || normalized.includes('..')) {
            return null;
        }
        return normalized;
    }

    private async ensureBase64Payload(data: ArrayBuffer | string | Blob): Promise<string | null> {
        if (typeof data === 'string') {
            return this.stripDataUrlPrefix(data);
        }

        if (data instanceof Blob) {
            const buffer = await data.arrayBuffer();
            return this.arrayBufferToBase64(buffer);
        }

        if (data instanceof ArrayBuffer) {
            return this.arrayBufferToBase64(data);
        }

        return null;
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
            binary += String.fromCharCode(...chunk);
        }

        const btoaFn =
            typeof btoa === 'function'
                ? btoa
                : typeof globalThis !== 'undefined' && typeof (globalThis as any).btoa === 'function'
                    ? (globalThis as any).btoa
                    : null;

        if (btoaFn) {
            return btoaFn(binary);
        }

        if (typeof globalThis !== 'undefined' && (globalThis as any).Buffer) {
            return (globalThis as any).Buffer.from(buffer).toString('base64');
        }

        throw new Error('Base64 conversion is not supported in this environment');
    }

    private stripDataUrlPrefix(value: string): string {
        if (!value) {
            return '';
        }

        if (value.startsWith('data:')) {
            const commaIndex = value.indexOf(',');
            return commaIndex >= 0 ? value.substring(commaIndex + 1) : '';
        }

        return value;
    }

    /**
     * 导出到文件 (通过 Electron IPC)
     */
    async exportToFile(filePath: string, content: string): Promise<void> {
        if (!this.isElectronEnvironment()) {
            throw new Error('仅支持 PC 端(Electron)导出');
        }

        try {
            await (window as any).ipcRenderer.invoke('write-obsidian-file', { filePath, content });
        } catch (error: any) {
            throw new Error(`文件写入失败: ${error.message}`);
        }
    }

    /**
     * 检测是否在 Electron 环境
     */
    private isElectronEnvironment(): boolean {
        return typeof window !== 'undefined' && !!(window as any).ipcRenderer;
    }

    private defaultOptions: ObsidianExportOptions = {
        includeTimeline: true,
        includeStats: true,
        includeQuestions: true,
        includeNarrative: true,
        exportWeeklyReviews: false,
        exportMonthlyReviews: false
    };

    /**
     * 保存配置到 localStorage
     */
    saveConfig(config: ObsidianExportConfig): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }

    /**
     * 从 localStorage 读取配置
     */
    getConfig(): ObsidianExportConfig | null {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return null;
        }

        try {
            const parsed = JSON.parse(stored) as Partial<ObsidianExportConfig>;
            if (!parsed.imageFolderName) {
                parsed.imageFolderName = 'attachments';
            }
            return parsed as ObsidianExportConfig;
        } catch (error) {
            console.error('[ObsidianExportService] Failed to parse stored config', error);
            return null;
        }
    }
}

export default new ObsidianExportService();
