/**
 * @file IconRenderer.tsx
 * @description 通用图标渲染组件 - 支持双图标系统（emoji + uiIcon）
 * 
 * 新的双图标系统：
 * - icon: 始终保存 emoji（用于默认主题）
 * - uiIcon: 保存 UI 图标 ID（用于自定义主题）
 * - 根据当前主题自动选择渲染哪个图标
 */

import React, { useState, useEffect, useRef } from 'react';
import twemoji from 'twemoji';
import { uiIconService, UIIconType } from '../services/uiIconService';
import { getDisplayIcon } from '../utils/iconUtils';
import { useSettings } from '../contexts/SettingsContext';

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
    const emojiRef = useRef<HTMLSpanElement>(null);
    const { useTwemoji } = useSettings();
    
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
    
    // 1. 判断是否使用自定义主题的 UI Icon
    const shouldUseUIIcon = isUIIcon && currentTheme !== 'default' && !imageError;
    
    // 2. 如果使用 UI Icon，渲染图片
    if (shouldUseUIIcon) {
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
                    'xs': '0.75rem',
                    'sm': '1.125rem',
                    'base': '1.25rem',
                    'lg': '1.5rem',
                    'xl': '1.625rem',
                    '2xl': '2rem',
                    '3xl': '2.5rem',
                    '4xl': '3rem',
                    '5xl': '4rem',
                    '6xl': '5rem',
                    '7xl': '6rem',
                    '8xl': '8rem',
                    '9xl': '10rem'
                };
                return sizeMap[textSizeMatch[1]] || '1.25rem';
            }
            
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
                    if (!hasFallbackAttempted) {
                        setHasFallbackAttempted(true);
                        e.currentTarget.src = fallback;
                    } else {
                        setImageError(true);
                    }
                }}
            />
        );
    }
    
    // 3. 渲染 Emoji（原生或 Twemoji）
    // 显示 Emoji（如果开启 Twemoji，useEffect 会自动转换）
    const displayEmoji = imageError ? (fallbackEmoji || icon || value) : value;
    
    // Twemoji 处理
    useEffect(() => {
        if (useTwemoji && emojiRef.current) {
            // 清空之前的内容，重新设置 emoji
            emojiRef.current.innerHTML = displayEmoji;
            
            // 使用 Twemoji 解析
            twemoji.parse(emojiRef.current, {
                folder: 'svg',
                ext: '.svg',
                base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
            });

            // 调整图片大小
            const imgs = emojiRef.current.querySelectorAll('img');
            imgs.forEach(img => {
                if (size) {
                    const sizeValue = typeof size === 'number' ? `${size}px` : size;
                    img.style.width = sizeValue;
                    img.style.height = sizeValue;
                } else {
                    // 默认使用 1em，这样会跟随字体大小
                    img.style.width = '1em';
                    img.style.height = '1em';
                }
                img.style.verticalAlign = 'middle';
            });
        }
    }, [displayEmoji, useTwemoji, size]);
    
    return (
        <span 
            ref={emojiRef}
            className={`inline-flex items-center justify-center ${className}`} 
            style={!useTwemoji && size ? { fontSize: size } : undefined}
        >
            {!useTwemoji && displayEmoji}
        </span>
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
