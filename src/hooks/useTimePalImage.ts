/**
 * @file useTimePalImage.ts
 * @description 时光小友图片加载 Hook - 处理 PNG/WebP 降级和 Emoji 占位符
 * 
 * 功能：
 * 1. 优先加载 PNG 格式图片
 * 2. PNG 失败时自动降级到 WebP
 * 3. WebP 也失败时显示 Emoji 占位符
 */
import { useState, useEffect, useCallback } from 'react';
import { TimePalType, getTimePalImagePath, getTimePalImagePathFallback, getTimePalEmoji } from '../constants/timePalConfig';

interface UseTimePalImageResult {
    /** 当前图片 URL */
    imageUrl: string;
    /** 是否加载失败（需要显示 emoji） */
    hasError: boolean;
    /** Emoji 占位符 */
    emoji: string;
    /** 图片错误处理器（用于 img 的 onError） */
    handleImageError: () => void;
}

/**
 * 时光小友图片加载 Hook
 * @param type 小动物类型
 * @param level 形态等级 (1-5)
 * @returns 图片加载状态和控制方法
 */
export const useTimePalImage = (type: TimePalType, level: number): UseTimePalImageResult => {
    const [imageUrl, setImageUrl] = useState(() => getTimePalImagePath(type, level));
    const [hasError, setHasError] = useState(false);
    const emoji = getTimePalEmoji(type);

    // 当类型或等级变化时，重置状态
    useEffect(() => {
        setImageUrl(getTimePalImagePath(type, level));
        setHasError(false);
    }, [type, level]);

    // 处理图片加载错误
    const handleImageError = useCallback(() => {
        // 如果当前是 PNG，尝试 WebP
        if (imageUrl.endsWith('.png')) {
            setImageUrl(getTimePalImagePathFallback(type, level));
        } else {
            // WebP 也失败了，显示 emoji
            setHasError(true);
        }
    }, [imageUrl, type, level]);

    return {
        imageUrl,
        hasError,
        emoji,
        handleImageError
    };
};
