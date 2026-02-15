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
    // ===== 所有 Hooks 必须在最前面，不能在条件语句中 =====
    const [imageError, setImageError] = useState(false);
    const [hasFallbackAttempted, setHasFallbackAttempted] = useState(false);
    const emojiRef = useRef<HTMLSpanElement>(null);
    const { emojiStyle } = useSettings();
    
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
    
    // 检查是否是自定义图片（格式：image:/path/to/image.png）
    const isCustomImage = displayIcon.startsWith('image:');
    const customImagePath = isCustomImage ? displayIcon.substring(6) : null; // 移除 "image:" 前缀
    
    // 4. 渲染 Emoji（原生、Twemoji 或 OpenMoji）
    // 显示 Emoji（如果开启 Twemoji 或 OpenMoji，useEffect 会自动转换）
    const displayEmoji = imageError ? (fallbackEmoji || icon || value) : value;
    
    // 获取 emoji 的 Unicode codepoint（用于 CDN URL）
    const getEmojiCodepoint = (emoji: string): string => {
        const codePoints = [];
        for (const char of emoji) {
            const code = char.codePointAt(0);
            if (code !== undefined) {
                // 跳过变体选择器 (U+FE0F) 和零宽连接符 (U+200D)
                if (code !== 0xFE0F && code !== 0x200D) {
                    codePoints.push(code.toString(16));
                }
            }
        }
        return codePoints.join('-');
    };
    
    // Twemoji 或 OpenMoji 处理
    useEffect(() => {
        if (emojiStyle !== 'native' && emojiRef.current && !isCustomImage && !isUIIcon) {
            const codepoint = getEmojiCodepoint(displayEmoji);
            
            let imgSrc = '';
            if (emojiStyle === 'twemoji') {
                imgSrc = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoint}.svg`;
            } else if (emojiStyle === 'openmoji') {
                // OpenMoji 使用大写的 codepoint
                imgSrc = `https://cdn.jsdelivr.net/npm/openmoji@15.0.0/color/svg/${codepoint.toUpperCase()}.svg`;
            }
            
            // 创建图片元素
            const img = document.createElement('img');
            img.src = imgSrc;
            img.alt = displayEmoji;
            img.draggable = false;
            
            // 不同 emoji 风格的缩放系数
            // - OpenMoji: 1.3 (放大 30%)
            // - Twemoji: 0.85 (缩小到 85%)
            // - Native: 不在这里处理（在渲染时单独处理）
            const scaleFactor = emojiStyle === 'openmoji' ? 1.3 : 0.85;
            
            // 设置图片大小
            if (size) {
                const sizeValue = typeof size === 'number' ? `${size}px` : size;
                // 如果是数字，直接应用缩放
                if (typeof size === 'number') {
                    const scaledSize = `${size * scaleFactor}px`;
                    img.style.width = scaledSize;
                    img.style.height = scaledSize;
                } else {
                    // 如果是 CSS 值（如 100%, 2rem 等）
                    img.style.width = sizeValue;
                    img.style.height = sizeValue;
                    // 对于 OpenMoji，使用 transform scale 来放大
                    if (scaleFactor !== 1) {
                        img.style.transform = `scale(${scaleFactor})`;
                    }
                }
            } else {
                // 默认使用 1em，这样会跟随字体大小
                if (scaleFactor !== 1) {
                    img.style.width = `${scaleFactor}em`;
                    img.style.height = `${scaleFactor}em`;
                } else {
                    img.style.width = '1em';
                    img.style.height = '1em';
                }
            }
            img.style.verticalAlign = 'middle';
            img.style.display = 'inline-block';
            img.style.objectFit = 'contain'; // 确保图片按比例缩放
            
            // 错误处理：如果图片加载失败，显示原生 emoji
            img.onerror = () => {
                if (emojiRef.current) {
                    emojiRef.current.innerHTML = displayEmoji;
                }
            };
            
            // 清空并插入图片
            emojiRef.current.innerHTML = '';
            emojiRef.current.appendChild(img);
        } else if (emojiStyle === 'native' && emojiRef.current && !isCustomImage && !isUIIcon) {
            // 原生 emoji - 放大到 1.2 倍
            emojiRef.current.innerHTML = displayEmoji;
            emojiRef.current.style.fontSize = '1.2em';
        }
    }, [displayEmoji, emojiStyle, size, isCustomImage, isUIIcon]);
    
    // ===== 所有 Hooks 调用完毕，现在可以做条件渲染 =====
    
    // 辅助函数：计算图片尺寸
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
    
    // 1. 判断是否使用自定义图片
    if (isCustomImage && customImagePath && !imageError) {
        const imageSize = getImageSize();
        const sizeStyle = { 
            width: imageSize, 
            height: imageSize,
            objectFit: 'contain' as const  // 保持宽高比
        };

        return (
            <img
                src={customImagePath}
                alt={alt || 'Custom icon'}
                className={`inline-block ${className}`}
                style={sizeStyle}
                onError={(e) => {
                    if (!hasFallbackAttempted && fallbackEmoji) {
                        setHasFallbackAttempted(true);
                        setImageError(true);
                    } else {
                        setImageError(true);
                    }
                }}
            />
        );
    }
    
    // 2. 判断是否使用自定义主题的 UI Icon
    const shouldUseUIIcon = isUIIcon && currentTheme !== 'default' && !imageError;
    
    // 3. 如果使用 UI Icon，渲染图片
    if (shouldUseUIIcon) {
        const iconType = value as UIIconType;
        const { primary, fallback } = uiIconService.getIconPathWithFallback(iconType);
        
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
    
    // 4. 渲染 Emoji（原生、Twemoji 或 OpenMoji）
    // 原生 emoji 放大 1.2 倍
    const nativeEmojiScale = emojiStyle === 'native' ? 1.2 : 1;
    
    return (
        <span 
            ref={emojiRef}
            className={`inline-flex items-center justify-center ${className}`} 
            style={
                emojiStyle === 'native' && size 
                    ? typeof size === 'number' 
                        ? { fontSize: `${size * nativeEmojiScale}px` }
                        : { fontSize: size, width: size, height: size, transform: `scale(${nativeEmojiScale})` }
                    : emojiStyle === 'native'
                    ? { fontSize: '1.2em' }
                    : undefined
            }
        >
            {emojiStyle === 'native' && displayEmoji}
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
