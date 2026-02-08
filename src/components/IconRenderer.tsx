/**
 * @file IconRenderer.tsx
 * @description 通用图标渲染组件 - 根据图标字符串自动选择渲染 Emoji 或 UI 图标图片
 */

import React, { useState } from 'react';
import { uiIconService, UIIconType } from '../services/uiIconService';

interface IconRendererProps {
    icon: string;                    // 图标字符串，可能是 "ui:iconType" 或 Emoji
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
 * // 渲染 Emoji
 * <IconRenderer icon="📚" />
 * 
 * // 渲染 UI 图标
 * <IconRenderer icon="ui:book" size={24} />
 * 
 * // 自动判断
 * <IconRenderer icon={category.icon} className="text-2xl" />
 * ```
 */
export const IconRenderer: React.FC<IconRendererProps> = ({
    icon,
    className = '',
    size,
    alt,
    fallbackEmoji
}) => {
    const [imageError, setImageError] = useState(false);
    
    // 解析图标字符串
    const { isUIIcon, value } = uiIconService.parseIconString(icon);
    
    // 如果不是 UI 图标格式，或者当前主题是 default，直接渲染 Emoji
    if (!isUIIcon || uiIconService.getCurrentTheme() === 'default') {
        return (
            <span className={className} style={size ? { fontSize: size } : undefined}>
                {value}
            </span>
        );
    }

    // 如果图片加载失败，显示降级 Emoji
    if (imageError) {
        const displayEmoji = fallbackEmoji || value.charAt(0);
        return (
            <span className={className} style={size ? { fontSize: size } : undefined}>
                {displayEmoji}
            </span>
        );
    }

    // 渲染 UI 图标图片
    const iconType = value as UIIconType;
    const { primary, fallback } = uiIconService.getIconPathWithFallback(iconType);
    
    const sizeStyle = size ? (
        typeof size === 'number' ? { width: size, height: size } : { width: size, height: size }
    ) : undefined;

    return (
        <img
            src={primary}
            alt={alt || uiIconService.getIconLabel(iconType)}
            className={className}
            style={sizeStyle}
            onError={(e) => {
                // 尝试降级到 WebP
                if (e.currentTarget.src === primary) {
                    e.currentTarget.src = fallback;
                } else {
                    // WebP 也失败了，显示 Emoji
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
 * const { isImage, src, emoji } = useIconRenderer(category.icon);
 * 
 * if (isImage) {
 *   return <img src={src} alt="icon" />;
 * } else {
 *   return <span>{emoji}</span>;
 * }
 * ```
 */
export const useIconRenderer = (icon: string) => {
    const { isUIIcon, value } = uiIconService.parseIconString(icon);
    const currentTheme = uiIconService.getCurrentTheme();
    
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
