/**
 * @file excelExportService.ts
 * @input Log数据, Category数据, TodoItem数据, Scope数据
 * @output Excel文件
 * @pos Service (Excel导出)
 * @description 提供Excel导出功能,将时间记录导出为xlsx格式
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import * as XLSX from 'xlsx';
import { Log, Category, TodoItem, Scope, TodoCategory } from '../types';

/**
 * 导出时间记录为Excel文件
 * @param logs 要导出的时间记录数组
 * @param categories 分类数据
 * @param todos 待办事项数据
 * @param todoCategories 待办分类数据
 * @param scopes 领域数据
 * @param startDate 起始日期
 * @param endDate 结束日期
 */
export const exportLogsToExcel = (
    logs: Log[],
    categories: Category[],
    todos: TodoItem[],
    todoCategories: TodoCategory[],
    scopes: Scope[],
    startDate: Date,
    endDate: Date
): void => {
    // 过滤在日期范围内的logs
    const startTime = new Date(startDate);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(endDate);
    endTime.setHours(23, 59, 59, 999);

    const filteredLogs = logs.filter(log =>
        log.startTime >= startTime.getTime() && log.startTime <= endTime.getTime()
    );

    // 准备导出数据
    const data = filteredLogs.map(log => {
        // 通过activityId查找Activity和Category
        let categoryName = '';
        let activityName = '';

        for (const category of categories) {
            const activity = category.activities.find(act => act.id === log.activityId);
            if (activity) {
                categoryName = category.name;
                activityName = activity.name;
                break;
            }
        }

        // 查找关联待办
        const todo = log.linkedTodoId ? todos.find(t => t.id === log.linkedTodoId) : undefined;

        // 查找关联待办分类
        const todoCategoryName = todo ? todoCategories.find(tc => tc.id === todo.categoryId)?.name || '' : '';

        // 查找关联领域(可能有多个)
        const scopeNames = log.scopeIds
            ? log.scopeIds.map(sid => scopes.find(s => s.id === sid)?.name).filter(Boolean).join(', ')
            : '';

        // 计算持续时长(分钟)
        const duration = Math.round((log.endTime - log.startTime) / 1000 / 60);

        // 格式化日期 YYYY-MM-DD
        const formatDate = (timestamp: number) => {
            const date = new Date(timestamp);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // 格式化时间 HH:mm:ss
        const formatTime = (timestamp: number) => {
            const date = new Date(timestamp);
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
        };

        return {
            'id': log.id,
            '日期': formatDate(log.startTime),
            '开始时间': formatTime(log.startTime),
            '结束时间': formatTime(log.endTime),
            '持续时长': duration,
            '一级分类': categoryName,
            '二级标签': activityName,
            '关联待办分类': todoCategoryName,
            '关联待办': todo?.title || '',
            '关联领域': scopeNames,
            '备注': log.note || '',
            '专注得分': log.focusScore || ''
        };
    });

    // 创建工作簿
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '时间记录');

    // 生成文件名: lumostime时间记录_起始日期_结束日期.xlsx
    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    const fileName = `lumostime时间记录_${formatDate(startDate)}_${formatDate(endDate)}.xlsx`;

    // 下载文件
    XLSX.writeFile(workbook, fileName);
};

const excelExportService = {
    exportLogsToExcel
};

export default excelExportService;
