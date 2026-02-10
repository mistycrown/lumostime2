/**
 * @file IconPreview.tsx
 * @input iconId, iconName, size
 * @output Icon Preview Image
 * @pos Component (Display)
 * @description 简化的图标预览组件 - 显示应用图标，支持降级到 emoji
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import React, { useState } from 'react';
import { ICON_OPTIONS } from '../services/iconService';

interface IconPreviewProps {
    iconId: string;
    iconName: string;
    size?: 'small' | 'medium' | 'large';
    className?: string;
}

export const IconPreview: React.FC<IconPreviewProps> = ({ 
    iconId, 
    iconName, 
    size = 'medium',
    className = ''
}) => {
    const [imageError, setImageError] = useState(false);

    const sizeClasses = {
        small: 'w-8 h-8',
        medium: 'w-12 h-12',
        large: 'w-16 h-16'
    };

    const textSizeClasses = {
        small: 'text-lg',
        medium: 'text-2xl',
        large: 'text-3xl'
    };

    // 更强的圆角效果
    const roundedClass = `rounded-[22%]`;

    // 从iconService获取正确的图标路径
    const iconOption = ICON_OPTIONS.find(option => option.id === iconId);
    const iconPath = iconOption?.desktopIcon || '/icon.ico';
    const fallbackEmoji = iconOption?.preview || '⏰';

    // 如果图片加载失败，显示 emoji
    if (imageError) {
        return (
            <div className={`${sizeClasses[size]} ${roundedClass} bg-stone-100 flex items-center justify-center ${className}`}>
                <div className={textSizeClasses[size]}>{fallbackEmoji}</div>
            </div>
        );
    }

    return (
        <div className={`${sizeClasses[size]} ${roundedClass} overflow-hidden ${className}`}>
            <img 
                src={iconPath}
                alt={iconName}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
            />
        </div>
    );
};