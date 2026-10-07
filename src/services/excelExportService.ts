/**
 * @file excelExportService.ts
 * @input Log, category, todo, scope, node, collection, and review data.
 * @output XLSX workbook containing time records and related datasets.
 * @pos Service (Excel导出)
 * @description Exports the current data model without dropping custom attributes or newer log metadata.
 * @updated 2026-10-07: Added complete log metadata, dynamic attribute columns, and related dataset sheets.
 */

import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import type {
    Category,
    DailyReview,
    DataCollection,
    DataCollectionEntry,
    Log,
    MonthlyReview,
    NodeCategory,
    NoteNode,
    Scope,
    TodoCategory,
    TodoItem,
    WeeklyReview
} from '../types';
import { getAttributeDefinitionKey, serializeAttributeValues, serializeJsonCell } from '../utils/exportSerialization';

export interface ExcelExportRelatedData {
    nodes?: NoteNode[];
    nodeCategories?: NodeCategory[];
    collections?: DataCollection[];
    collectionEntries?: DataCollectionEntry[];
    dailyReviews?: DailyReview[];
    weeklyReviews?: WeeklyReview[];
    monthlyReviews?: MonthlyReview[];
}

interface AttributeColumn {
    key: string;
    label: string;
}

const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
};

const formatFileDate = (date: Date): string => (
    `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
);

const getActivityContext = (log: Log, categories: Category[]) => {
    const category = categories.find((item) => item.id === log.categoryId);
    const activity = category?.activities.find((item) => item.id === log.activityId)
        || categories.flatMap((item) => item.activities).find((item) => item.id === log.activityId);
    return { category, activity };
};

const appendSheet = (workbook: XLSX.WorkBook, name: string, rows: Record<string, unknown>[], headers: string[]): void => {
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
};

const getAttributeColumns = (categories: Category[], logs: Log[]): AttributeColumn[] => {
    const columns = new Map<string, AttributeColumn>();
    categories.forEach((category) => category.activities.forEach((activity) => {
        (activity.attributes || []).forEach((attribute) => {
            const key = getAttributeDefinitionKey(activity.id, attribute.id);
            columns.set(key, { key, label: `属性:${activity.name}/${attribute.name} [${attribute.id}]` });
        });
    }));
    logs.forEach((log) => {
        const { activity } = getActivityContext(log, categories);
        (log.attributeValues || []).forEach((value) => {
            const key = getAttributeDefinitionKey(activity?.id || log.activityId, value.attributeId);
            if (!columns.has(key)) {
                columns.set(key, { key, label: `属性:${activity?.name || log.activityId}/${value.attributeId} [${value.attributeId}]` });
            }
        });
    });
    return Array.from(columns.values()).sort((left, right) => left.label.localeCompare(right.label));
};

const buildLogRows = (
    logs: Log[],
    categories: Category[],
    todos: TodoItem[],
    todoCategories: TodoCategory[],
    scopes: Scope[],
    attributeColumns: AttributeColumn[]
): Record<string, unknown>[] => logs.map((log) => {
    const { category, activity } = getActivityContext(log, categories);
    const todo = log.linkedTodoId ? todos.find((item) => item.id === log.linkedTodoId) : undefined;
    const attributeValues = serializeAttributeValues(log.attributeValues, activity);
    const attributeByKey = new Map(attributeValues.map((value) => [
        getAttributeDefinitionKey(activity?.id || log.activityId, value.attributeId),
        value.value
    ]));
    const row: Record<string, unknown> = {
        id: log.id,
        日期: formatDate(log.startTime),
        开始时间: formatTime(log.startTime),
        结束时间: formatTime(log.endTime),
        持续时长: Math.round((log.endTime - log.startTime) / 1000 / 60),
        原始时长秒数: log.duration,
        一级分类: category?.name || '',
        一级分类ID: log.categoryId,
        二级标签: activity?.name || '',
        二级标签ID: log.activityId,
        标题: log.title || '',
        关联待办分类: todo ? todoCategories.find((item) => item.id === todo.categoryId)?.name || '' : '',
        关联待办分类ID: todo?.categoryId || '',
        关联待办: todo?.title || '',
        关联待办ID: todo?.id || '',
        关联领域: (log.scopeIds || []).map((id) => scopes.find((scope) => scope.id === id)?.name || id).join(', '),
        关联领域ID: (log.scopeIds || []).join(', '),
        备注: log.note || '',
        专注得分: log.focusScore ?? '',
        心情得分: log.moodScore ?? '',
        进度增量: log.progressIncrement ?? '',
        计划记录: log.isPlanned ? '是' : '否',
        计划来源: log.planSource || '',
        计划发生日期: log.plannedOccurrenceDate || '',
        图片: (log.images || []).join(', '),
        评论: serializeJsonCell(log.comments),
        反应: (log.reactions || []).join(', '),
        AppAwareness: serializeJsonCell(log.appAwarenessMeta),
        属性JSON: serializeJsonCell(log.attributeValues)
    };
    attributeColumns.forEach((column) => { row[column.label] = attributeByKey.get(column.key) || ''; });
    return row;
});

export const buildExcelWorkbook = (
    logs: Log[],
    categories: Category[],
    todos: TodoItem[],
    todoCategories: TodoCategory[],
    scopes: Scope[],
    startDate: Date,
    endDate: Date,
    relatedData: ExcelExportRelatedData = {}
): XLSX.WorkBook => {
    const startTime = new Date(startDate);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(endDate);
    endTime.setHours(23, 59, 59, 999);
    const filteredLogs = logs.filter((log) => log.startTime >= startTime.getTime() && log.startTime <= endTime.getTime());
    const attributeColumns = getAttributeColumns(categories, filteredLogs);
    const workbook = XLSX.utils.book_new();
    const logRows = buildLogRows(filteredLogs, categories, todos, todoCategories, scopes, attributeColumns);
    const logHeaders = [
        'id', '日期', '开始时间', '结束时间', '持续时长', '原始时长秒数', '一级分类', '一级分类ID', '二级标签', '二级标签ID',
        '标题', '关联待办分类', '关联待办分类ID', '关联待办', '关联待办ID', '关联领域', '关联领域ID', '备注', '专注得分',
        '心情得分', '进度增量', '计划记录', '计划来源', '计划发生日期', '图片', '评论', '反应', 'AppAwareness', '属性JSON',
        ...attributeColumns.map((column) => column.label)
    ];
    appendSheet(workbook, '时间记录', logRows, logHeaders);

    const attributeRows = categories.flatMap((category) => category.activities.flatMap((activity) => (activity.attributes || []).map((attribute) => ({
        活动ID: activity.id,
        活动: activity.name,
        分类ID: category.id,
        分类: category.name,
        属性ID: attribute.id,
        属性名: attribute.name,
        类型: attribute.type,
        单位: attribute.unit || '',
        选项JSON: serializeJsonCell(attribute.options),
        显示条件JSON: serializeJsonCell(attribute.displayCondition),
        关键字来源: attribute.isKeywordSource ? '是' : '否',
        已归档: attribute.isArchived ? '是' : '否'
    }))));
    appendSheet(workbook, '属性定义', attributeRows, ['活动ID', '活动', '分类ID', '分类', '属性ID', '属性名', '类型', '单位', '选项JSON', '显示条件JSON', '关键字来源', '已归档']);

    appendSheet(workbook, '待办', todos.map((todo) => ({
        id: todo.id,
        分类ID: todo.categoryId,
        分类: todoCategories.find((category) => category.id === todo.categoryId)?.name || '',
        类型: todo.kind || 'project',
        父待办ID: todo.parentTodoId || '',
        标题: todo.title,
        已完成: todo.isCompleted ? '是' : '否',
        完成时间: todo.completedAt || '',
        关联活动ID: todo.linkedActivityId || '',
        关联分类ID: todo.linkedCategoryId || '',
        默认领域ID: (todo.defaultScopeIds || []).join(', '),
        创建时间: todo.createdAt ? new Date(todo.createdAt).toISOString() : '',
        备注: todo.note || '',
        封面图: todo.coverImage || '',
        进度模式: todo.progressTrackingMode || '',
        总量: todo.totalAmount ?? '',
        单位量: todo.unitAmount ?? '',
        已完成单位: todo.completedUnits ?? '',
        置顶: todo.pin ? '是' : '否',
        计划日期: todo.scheduledDate || '',
        截止日期: todo.deadlineDate || '',
        重复规则JSON: serializeJsonCell(todo.recurrenceRule),
        重复计划JSON: serializeJsonCell(todo.recurringPlan),
        可能日期JSON: serializeJsonCell(todo.maybeDates)
    })), ['id', '分类ID', '分类', '类型', '父待办ID', '标题', '已完成', '完成时间', '关联活动ID', '关联分类ID', '默认领域ID', '创建时间', '备注', '封面图', '进度模式', '总量', '单位量', '已完成单位', '置顶', '计划日期', '截止日期', '重复规则JSON', '重复计划JSON', '可能日期JSON']);

    appendSheet(workbook, '节点', (relatedData.nodes || []).map((node) => ({
        id: node.id,
        名称: node.name,
        别名JSON: serializeJsonCell(node.aliases),
        描述: node.description,
        分类ID: node.categoryId || '',
        创建时间: new Date(node.createdAt).toISOString(),
        更新时间: new Date(node.updatedAt).toISOString()
    })), ['id', '名称', '别名JSON', '描述', '分类ID', '创建时间', '更新时间']);
    appendSheet(workbook, '节点分类', (relatedData.nodeCategories || []).map((category) => ({
        id: category.id,
        名称: category.name,
        创建时间: new Date(category.createdAt).toISOString(),
        更新时间: new Date(category.updatedAt).toISOString()
    })), ['id', '名称', '创建时间', '更新时间']);
    appendSheet(workbook, '集合', (relatedData.collections || []).map((collection) => ({
        id: collection.id,
        名称: collection.name,
        描述: collection.description || '',
        创建时间: new Date(collection.createdAt).toISOString(),
        更新时间: new Date(collection.updatedAt).toISOString()
    })), ['id', '名称', '描述', '创建时间', '更新时间']);
    appendSheet(workbook, '集合条目', (relatedData.collectionEntries || []).map((entry) => ({
        id: entry.id,
        集合ID: entry.collectionId,
        项目类型: entry.itemType,
        项目ID: entry.itemId,
        加入时间: new Date(entry.addedAt).toISOString()
    })), ['id', '集合ID', '项目类型', '项目ID', '加入时间']);

    appendSheet(workbook, '日报', (relatedData.dailyReviews || []).map((review) => ({
        id: review.id,
        日期: review.date,
        摘要: review.summary || '',
        心情: review.moodEmoji || '',
        问答JSON: serializeJsonCell(review.answers),
        检查项JSON: serializeJsonCell(review.checkItems),
        叙事: review.narrative || '',
        AI报纸JSON: serializeJsonCell(review.aiNewspaper),
        模板快照JSON: serializeJsonCell(review.templateSnapshot),
        更新时间: new Date(review.updatedAt).toISOString()
    })), ['id', '日期', '摘要', '心情', '问答JSON', '检查项JSON', '叙事', 'AI报纸JSON', '模板快照JSON', '更新时间']);
    appendSheet(workbook, '周报', (relatedData.weeklyReviews || []).map((review) => ({
        id: review.id,
        开始日期: review.weekStartDate,
        结束日期: review.weekEndDate,
        摘要: review.summary || '',
        问答JSON: serializeJsonCell(review.answers),
        叙事: review.narrative || '',
        AI报纸JSON: serializeJsonCell(review.aiNewspaper),
        模板快照JSON: serializeJsonCell(review.templateSnapshot),
        更新时间: new Date(review.updatedAt).toISOString()
    })), ['id', '开始日期', '结束日期', '摘要', '问答JSON', '叙事', 'AI报纸JSON', '模板快照JSON', '更新时间']);
    appendSheet(workbook, '月报', (relatedData.monthlyReviews || []).map((review) => ({
        id: review.id,
        开始日期: review.monthStartDate,
        结束日期: review.monthEndDate,
        摘要: review.summary || '',
        问答JSON: serializeJsonCell(review.answers),
        叙事: review.narrative || '',
        AI报纸JSON: serializeJsonCell(review.aiNewspaper),
        模板快照JSON: serializeJsonCell(review.templateSnapshot),
        更新时间: new Date(review.updatedAt).toISOString()
    })), ['id', '开始日期', '结束日期', '摘要', '问答JSON', '叙事', 'AI报纸JSON', '模板快照JSON', '更新时间']);

    return workbook;
};

export const exportLogsToExcel = (
    logs: Log[],
    categories: Category[],
    todos: TodoItem[],
    todoCategories: TodoCategory[],
    scopes: Scope[],
    startDate: Date,
    endDate: Date,
    relatedData: ExcelExportRelatedData = {}
): Promise<{ filename: string; mode: 'native' | 'web'; savedPath?: string }> => {
    const workbook = buildExcelWorkbook(logs, categories, todos, todoCategories, scopes, startDate, endDate, relatedData);
    const fileName = `lumostime时间记录_${formatFileDate(startDate)}_${formatFileDate(endDate)}.xlsx`;

    if (Capacitor.isNativePlatform()) {
        const platform = Capacitor.getPlatform();
        const isAndroid = platform === 'android';
        const relativePath = isAndroid ? `Download/LumosTime/${fileName}` : `LumosTime/${fileName}`;
        const base64Data = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
        return Filesystem.writeFile({
            path: relativePath,
            data: base64Data,
            directory: isAndroid ? Directory.ExternalStorage : Directory.Documents,
            recursive: true
        }).then(() => ({ filename: fileName, mode: 'native' as const, savedPath: relativePath }));
    }

    XLSX.writeFile(workbook, fileName);
    return Promise.resolve({ filename: fileName, mode: 'web' as const });
};

const excelExportService = { exportLogsToExcel, buildExcelWorkbook };

export default excelExportService;
