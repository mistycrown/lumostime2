/**
 * @file useTimePalImage.ts
 * @description 时光小友图片加载 Hook - 处理 PNG/WebP 降级和 Emoji 占位符
 * 
 * 功能：
 * 1. 预设时光小友：优先加载 PNG，失败降级到 WebP
 * 2. 自定义时光小友：从本地图片存储读取
 * 3. 图片失败时显示 Emoji 占位符
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
    getTimePalImagePath,
    getTimePalImagePathFallback,
    getTimePalEmoji,
    isPresetTimePalType
} from '../constants/timePalConfig';
import { imageService } from '../services/imageService';
import { timePalCustomService } from '../services/timePalCustomService';

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
 * @param type 小动物类型（预设 type 或 custom:<id>）
 * @param level 形态等级 (1-5)
 * @returns 图片加载状态和控制方法
 */
export const useTimePalImage = (type: string, level: number): UseTimePalImageResult => {
    const [imageUrl, setImageUrl] = useState('');
    const [hasError, setHasError] = useState(false);
    const [emoji, setEmoji] = useState('🐾');
    const customBlobUrlRef = useRef<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadImage = async () => {
            setHasError(false);

            if (isPresetTimePalType(type)) {
                if (customBlobUrlRef.current) {
                    URL.revokeObjectURL(customBlobUrlRef.current);
                    customBlobUrlRef.current = null;
                }
                if (!cancelled) {
                    setEmoji(getTimePalEmoji(type));
                    setImageUrl(getTimePalImagePath(type, level));
                }
                return;
            }

            if (!cancelled) {
                setEmoji('🐾');
            }

            const filename = timePalCustomService.getStageFilename(type, level);
            if (!filename) {
                if (!cancelled) {
                    setHasError(true);
                    setImageUrl('');
                }
                return;
            }

            try {
                const url = await imageService.getImageUrl(filename, 'original');
                if (cancelled) {
                    if (url && url.startsWith('blob:')) {
                        URL.revokeObjectURL(url);
                    }
                    return;
                }
                if (!url) {
                    setHasError(true);
                    setImageUrl('');
                    return;
                }
                if (url.startsWith('blob:')) {
                    if (customBlobUrlRef.current && customBlobUrlRef.current !== url) {
                        URL.revokeObjectURL(customBlobUrlRef.current);
                    }
                    customBlobUrlRef.current = url;
                }
                setImageUrl(url);
            } catch (error) {
                console.error('[useTimePalImage] 加载自定义时光小友图片失败:', error);
                if (!cancelled) {
                    setHasError(true);
                    setImageUrl('');
                }
            }
        };

        loadImage();

        return () => {
            cancelled = true;
            if (customBlobUrlRef.current) {
                URL.revokeObjectURL(customBlobUrlRef.current);
                customBlobUrlRef.current = null;
            }
        };
    }, [type, level]);

    // 处理图片加载错误
    const handleImageError = useCallback(() => {
        if (isPresetTimePalType(type)) {
            // 如果当前是 PNG，尝试 WebP
            if (imageUrl.endsWith('.png')) {
                setImageUrl(getTimePalImagePathFallback(type, level));
                return;
            }
        }
        setHasError(true);
    }, [imageUrl, type, level]);

    return {
        imageUrl,
        hasError,
        emoji,
        handleImageError
    };
};
