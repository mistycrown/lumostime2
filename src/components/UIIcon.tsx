/**
 * @file UIIcon.tsx
 * @description 通用 UI 图标组件 - 支持主题切换和格式降级
 * @updated 2026-10-05: Retries icons after same-theme asset hydration and stops repeated fallback failures.
 */

import React, { useState, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';
import { UIIconType, useUIIcon } from '../services/uiIconService';

interface UIIconProps {
    /** 图标类型 */
    type: UIIconType;
    /** 降级使用的 Lucide 图标 */
    fallbackIcon: LucideIcon;
    /** 图标大小 */
    size?: number;
    /** 自定义类名 */
    className?: string;
    /** 自定义图标放大系数（默认 1.3 倍） */
    customIconScale?: number;
    /** 其他 props */
    [key: string]: any;
}

/**
 * UI 图标组件
 * - 当使用自定义主题时，显示主题图标
 * - 当使用默认主题时，显示 Lucide 图标
 * - 支持 WebP -> PNG 自动降级
 */
export const UIIcon: React.FC<UIIconProps> = ({
    type,
    fallbackIcon: FallbackIcon,
    size = 20,
    className = '',
    customIconScale = 1.3,
    ...props
}) => {
    const { theme: currentTheme, iconPath, fallbackPath } = useUIIcon(type);
    const [imageError, setImageError] = useState(false);
    const [imageSrc, setImageSrc] = useState('');

    // 更新图片源
    useEffect(() => {
        if (currentTheme === 'default') {
            setImageSrc('');
            return;
        }

        setImageSrc(iconPath);
        setImageError(false);
    }, [currentTheme, type, iconPath, fallbackPath]);

    // 处理图片加载错误（降级到 PNG）
    const handleImageError = () => {
        if (!imageError && imageSrc !== fallbackPath) {
            setImageSrc(fallbackPath);
        } else {
            setImageError(true);
        }
    };

    // 如果是默认主题或图片加载失败，使用 Lucide 图标
    if (currentTheme === 'default' || imageError || !imageSrc) {
        return <FallbackIcon size={size} className={className} {...props} />;
    }

    // 使用自定义主题图标（放大显示）
    const scaledSize = Math.round(size * customIconScale);
    return (
        <img
            src={imageSrc}
            alt=""
            width={scaledSize}
            height={scaledSize}
            className={className}
            onError={handleImageError}
            style={{ display: 'block' }}
            {...props}
        />
    );
};

/**
 * 使用示例：
 * 
 * import { UIIcon } from '@/components/UIIcon';
 * import { Settings } from 'lucide-react';
 * 
 * // 基础使用（自定义图标会自动放大 1.3 倍）
 * <UIIcon 
 *   type="settings" 
 *   fallbackIcon={Settings} 
 *   size={20} 
 *   className="text-stone-600"
 * />
 * 
 * // 自定义放大系数
 * <UIIcon 
 *   type="settings" 
 *   fallbackIcon={Settings} 
 *   size={20} 
 *   customIconScale={1.5}
 *   className="text-stone-600"
 * />
 */
