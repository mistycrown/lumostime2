/**
 * @file dateUtils.ts
 * @input Date objects
 * @output Formatted date strings
 * @pos Utility (Date Formatting)
 * @description 日期格式化工具函数 - 提供统一的日期格式化方法
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

/**
 * 将 Date 对象转换为本地 YYYY-MM-DD 格式字符串
 * @param date - Date 对象
 * @returns YYYY-MM-DD 格式的日期字符串
 * 
 * @example
 * getLocalDateStr(new Date('2024-01-15')) // '2024-01-15'
 */
export const getLocalDateStr = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * 将 Date 对象转换为本地 HH:mm 格式字符串
 * @param date - Date 对象
 * @returns HH:mm 格式的时间字符串
 * 
 * @example
 * getLocalTimeStr(new Date('2024-01-15 14:30')) // '14:30'
 */
export const getLocalTimeStr = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

/**
 * 将 Date 对象转换为本地 YYYY-MM-DD HH:mm 格式字符串
 * @param date - Date 对象
 * @returns YYYY-MM-DD HH:mm 格式的日期时间字符串
 * 
 * @example
 * getLocalDateTimeStr(new Date('2024-01-15 14:30')) // '2024-01-15 14:30'
 */
export const getLocalDateTimeStr = (date: Date): string => {
    return `${getLocalDateStr(date)} ${getLocalTimeStr(date)}`;
};

/**
 * 格式化相对时间（如"刚刚"、"5分钟前"等）
 * @param date - Date 对象或时间戳
 * @returns 相对时间字符串
 * 
 * @example
 * formatRelativeTime(new Date(Date.now() - 60000)) // '1分钟前'
 */
export const formatRelativeTime = (date: Date | number): string => {
    const now = Date.now();
    const timestamp = date instanceof Date ? date.getTime() : date;
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    // 超过7天显示具体日期
    return getLocalDateStr(new Date(timestamp));
};
