/**
 * @file IconRenderer.tsx
 * @description 通用图标渲染组件 - 支持双图标系统（emoji + uiIcon）
 * 
 * 新的双图标系统：
 * - icon: 始终保存 emoji（用于默认主题）
 * - uiIcon: 保存 UI 图标 ID（用于自定义主题）
 * - 根据当前主题自动选择渲染哪个图标
 */

import React, { useState } from 'react';
import { uiIconService, UIIconType } from '../services/uiIconService';
import { getDisplayIcon } from '../utils/iconUtils';

interface IconRendererProps {
    icon: string;                    // Emoji 图标（用于默认主题）
    uiIcon?: string;                 // UI 图标 ID（用于自定义主题，格式：ui:iconType）
    className?: string;              // 额外的 CSS 类名
    size?: number | string;          // 图标大小（像素或 CSS 值）
    alt?: string;                    // 图片的 alt 文本
    fallbackEmoji?: string;          // 如果图片加载失败，使用的降级 Emoji
}

/**
 * 图标渲染组件
 * 
 * 使用示例：
 * ```tsx
 * // 旧数据（只有 icon）
 * <IconRenderer icon="📚" />
 * <IconRenderer icon="ui:book" />
 * 
 * // 新数据（同时有 icon 和 uiIcon）
 * <IconRenderer icon="📚" uiIcon="ui:book" />
 * 
 * // 从对象中传递
 * <IconRenderer icon={category.icon} uiIcon={category.uiIcon} />
 * ```
 */
export const IconRenderer: React.FC<IconRendererProps> = ({
    icon,
    uiIcon,
    className = '',
    size,
    alt,
    fallbackEmoji
}) => {
    const [imageError, setImageError] = useState(false);
    const [hasFallbackAttempted, setHasFallbackAttempted] = useState(false);
    
    const currentTheme = uiIconService.getCurrentTheme();
    
    // 使用工具函数获取应该显示的图标
    const displayIcon = getDisplayIcon(icon, uiIcon, currentTheme);
    
    // 当图标变化时，重置错误状态
    React.useEffect(() => {
        setImageError(false);
        setHasFallbackAttempted(false);
    }, [displayIcon]);
    
    // 解析显示的图标字符串
    const { isUIIcon, value } = uiIconService.parseIconString(displayIcon);
    
    // 如果不是 UI 图标格式，或者当前主题是 default，直接渲染 Emoji
    if (!isUIIcon || currentTheme === 'default') {
        return (
            <span className={className} style={size ? { fontSize: size } : undefined}>
                {value}
            </span>
        );
    }

    // 如果图片加载失败，显示降级 Emoji
    if (imageError) {
        const displayEmoji = fallbackEmoji || icon || value.charAt(0);
        return (
            <span className={className} style={size ? { fontSize: size } : undefined}>
                {displayEmoji}
            </span>
        );
    }

    // 渲染 UI 图标图片
    const iconType = value as UIIconType;
    const { primary, fallback } = uiIconService.getIconPathWithFallback(iconType);
    
    // 根据 className 中的 text-* 类自动计算尺寸
    const getImageSize = (): string => {
        if (size) {
            return typeof size === 'number' ? `${size}px` : size;
        }
        
        // 从 className 中提取 text-* 尺寸类
        const textSizeMatch = className.match(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)/);
        if (textSizeMatch) {
            const sizeMap: Record<string, string> = {
                'xs': '0.75rem',    // 12px (更小，适合小标签)
                'sm': '1.125rem',   // 18px (原 14px * 1.29)
                'base': '1.25rem',  // 20px (原 16px * 1.25)
                'lg': '1.5rem',     // 24px (原 18px * 1.33)
                'xl': '1.625rem',   // 26px (原 20px * 1.3)
                '2xl': '2rem',      // 32px (原 24px * 1.33)
                '3xl': '2.5rem',    // 40px (原 30px * 1.33)
                '4xl': '3rem',      // 48px (原 36px * 1.33)
                '5xl': '4rem',      // 64px (原 48px * 1.33)
                '6xl': '5rem',      // 80px (原 60px * 1.33)
                '7xl': '6rem',      // 96px (原 72px * 1.33)
                '8xl': '8rem',      // 128px (原 96px * 1.33)
                '9xl': '10rem'      // 160px (原 128px * 1.25)
            };
            return sizeMap[textSizeMatch[1]] || '1.25rem';
        }
        
        // 默认尺寸（稍大于 text-base）
        return '1.25rem';
    };
    
    const imageSize = getImageSize();
    const sizeStyle = { width: imageSize, height: imageSize };

    return (
        <img
            src={primary}
            alt={alt || uiIconService.getIconLabel(iconType)}
            className={`inline-block ${className}`}
            style={sizeStyle}
            onError={(e) => {
                // 第一次失败：尝试降级到 fallback 格式
                if (!hasFallbackAttempted) {
                    console.log(`[IconRenderer] Primary failed: ${primary}, trying fallback: ${fallback}`);
                    setHasFallbackAttempted(true);
                    e.currentTarget.src = fallback;
                } else {
                    // 第二次也失败了：显示 Emoji
                    console.log(`[IconRenderer] Fallback also failed: ${fallback}, showing emoji`);
                    setImageError(true);
                }
            }}
        />
    );
};

/**
 * React Hook - 获取图标渲染信息
 * 
 * 使用示例：
 * ```tsx
 * const { isImage, src, emoji } = useIconRenderer(category.icon, category.uiIcon);
 * 
 * if (isImage) {
 *   return <img src={src} alt="icon" />;
 * } else {
 *   return <span>{emoji}</span>;
 * }
 * ```
 */
export const useIconRenderer = (icon: string, uiIcon?: string) => {
    const currentTheme = uiIconService.getCurrentTheme();
    
    // 使用工具函数获取应该显示的图标
    const displayIcon = getDisplayIcon(icon, uiIcon, currentTheme);
    
    const { isUIIcon, value } = uiIconService.parseIconString(displayIcon);
    
    // 判断是否应该渲染为图片
    const shouldRenderAsImage = isUIIcon && currentTheme !== 'default';
    
    if (shouldRenderAsImage) {
        const iconType = value as UIIconType;
        const { primary, fallback } = uiIconService.getIconPathWithFallback(iconType);
        
        return {
            isImage: true,
            src: primary,
            fallbackSrc: fallback,
            emoji: null,
            iconType,
            label: uiIconService.getIconLabel(iconType)
        };
    }
    
    return {
        isImage: false,
        src: null,
        fallbackSrc: null,
        emoji: value,
        iconType: null,
        label: value
    };
};
