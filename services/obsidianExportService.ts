/**
 * @file obsidianExportService.ts
 * @input Obsidian配置, 日志数据, 日期
 * @output Markdown文件路径和内容
 * @pos Service (导出服务)
 * @description 处理导出数据到 Obsidian 笔记的逻辑,包括路径生成、Markdown内容生成和文件写入
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { Log, Category, TodoItem, Scope, DailyReview } from '../types';

/**
 * 导出选项
 */
export interface ObsidianExportOptions {
    includeTimeline: boolean;     // 时间记录
    includeStats: boolean;        // 数据统计
    includeQuestions: boolean;    // 引导提问
    includeNarrative: boolean;    // AI 叙事
}

/**
 * Obsidian 导出配置
 */
export interface ObsidianExportConfig {
    rootPath: string;        // 根目录,如: "F:\Obsidian Vault\01 diary"
    pathTemplate: string;    // 路径模板,如: "{YYYY}/{MM}/{YYYY}-{MM}-{DD}.md"
}

/**
 * Obsidian 导出服务
 */
class ObsidianExportService {
    /**
     * 生成目标文件完整路径
     */
    generateFilePath(config: ObsidianExportConfig, date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const relativePath = config.pathTemplate
            .replace(/{YYYY}/g, String(year))
            .replace(/{MM}/g, month)
            .replace(/{DD}/g, day);

        // 使用路径分隔符拼接,Windows 下会自动使用反斜杠
        const fullPath = config.rootPath.replace(/\/$/, '') + '/' + relativePath;

        // 统一使用反斜杠(Windows)
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
        date: Date
    ): string {
        const dayLogs = logs.filter(log => {
            const logDate = new Date(log.startTime);
            return logDate.toDateString() === date.toDateString();
        });

        if (dayLogs.length === 0) {
            return `## 📊 数据统计\n\n暂无数据\n`;
        }

        const totalDuration = dayLogs.reduce((acc, l) => acc + l.duration, 0);
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

        dayLogs.forEach(log => {
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

        dayLogs.forEach(log => {
            if (log.linkedTodoId) {
                const todo = todos.find(t => t.id === log.linkedTodoId);
                if (todo) {
                    let categoryData = todoMap.get(todo.categoryId);
                    if (!categoryData) {
                        const todoCat = categories.find(c => c.id === todo.categoryId);
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
        dayLogs.forEach(log => {
            log.scopeIds?.forEach(scopeId => {
                const scope = scopes.find(s => s.id === scopeId);
                if (scope) {
                    const current = scopeStats.get(scope.name) || 0;
                    scopeStats.set(scope.name, current + log.duration);
                }
            });
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
    generateNarrativeMarkdown(dailyReview: DailyReview | undefined, date: Date): string {
        if (!dailyReview || !dailyReview.narrative) {
            return `## ✨ AI 叙事\n\n暂无 AI 生成的叙事\n`;
        }

        let text = `## ✨ AI 叙事\n\n`;

        // 将叙事内容按行分割,每行添加引用符号
        const narrativeLines = dailyReview.narrative.split('\n');
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
            text += `- ${sTime}-${eTime} (${mins}m) **[${cat?.name || '未知'}/${act?.name || '未知'}]**${content}`;

            if (log.focusScore && log.focusScore > 0) text += ` ⚡️${log.focusScore}`;
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
        options: ObsidianExportOptions,
        dailyReview?: DailyReview
    ): string {
        const sections: string[] = [];

        if (options.includeTimeline) {
            sections.push(this.generateTimelineMarkdown(logs, categories, todos, scopes, date));
        }

        if (options.includeStats) {
            sections.push(this.generateStatsMarkdown(logs, categories, todos, scopes, date));
        }

        if (options.includeQuestions) {
            sections.push(this.generateQuestionsMarkdown(dailyReview, date));
        }

        if (options.includeNarrative) {
            sections.push(this.generateNarrativeMarkdown(dailyReview, date));
        }

        return sections.join('\n\n');
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
     * 导出到文件 (Electron)
     * 通过 IPC 调用主进程的文件写入功能
     */
    async exportToFile(filePath: string, content: string): Promise<void> {
        if (typeof window === 'undefined' || !(window as any).ipcRenderer) {
            throw new Error('此功能仅在 Electron 环境下可用');
        }

        try {
            const result = await (window as any).ipcRenderer.invoke('write-obsidian-file', {
                filePath,
                content
            });

            if (!result.success) {
                throw new Error('文件写入失败');
            }
        } catch (error: any) {
            throw new Error(`文件写入失败: ${error.message}`);
        }
    }

    /**
     * 检测是否在 Electron 环境
     */
    isElectronEnvironment(): boolean {
        return typeof window !== 'undefined' && !!(window as any).ipcRenderer;
    }

    /**
     * 获取保存的配置
     */
    getConfig(): ObsidianExportConfig | null {
        try {
            const rootPath = localStorage.getItem('lumos_obsidian_root_path');
            const pathTemplate = localStorage.getItem('lumos_obsidian_path_template');

            if (!rootPath || !pathTemplate) {
                return null;
            }

            return { rootPath, pathTemplate };
        } catch (error) {
            return null;
        }
    }

    /**
     * 保存配置
     */
    saveConfig(config: ObsidianExportConfig): void {
        localStorage.setItem('lumos_obsidian_root_path', config.rootPath);
        localStorage.setItem('lumos_obsidian_path_template', config.pathTemplate);
    }
}

export const obsidianExportService = new ObsidianExportService();
