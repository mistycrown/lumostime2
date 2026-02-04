/**
 * @file IconPreview.tsx
 * @description 简化的图标预览组件
 */

import React from 'react';
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
    const sizeClasses = {
        small: 'w-8 h-8',
        medium: 'w-12 h-12',
        large: 'w-16 h-16'
    };

    // 更强的圆角效果
    const roundedClass = `rounded-[22%]`;

    // 从iconService获取正确的图标路径
    const iconOption = ICON_OPTIONS.find(option => option.id === iconId);
    const iconPath = iconOption?.desktopIcon || '/icon.ico';

    if (iconId === 'default') {
        return (
            <div className={`${sizeClasses[size]} ${roundedClass} overflow-hidden ${className}`}>
                <img 
                    src="/icon.ico"
                    alt="默认图标"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        // 如果默认图标加载失败，显示emoji备用
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                            parent.className = `${sizeClasses[size]} ${roundedClass} bg-stone-100 flex items-center justify-center ${className}`;
                            const textSize = size === 'small' ? 'text-lg' : size === 'medium' ? 'text-2xl' : 'text-3xl';
                            parent.innerHTML = `<div class="${textSize}">⏰</div>`;
                        }
                    }}
                />
            </div>
        );
    }

    return (
        <div className={`${sizeClasses[size]} ${roundedClass} overflow-hidden ${className}`}>
            <img 
                src={iconPath}
                alt={iconName}
                className="w-full h-full object-cover"
                onError={(e) => {
                    // 如果图片加载失败，显示emoji备用
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                        parent.className = `${sizeClasses[size]} ${roundedClass} bg-stone-100 flex items-center justify-center ${className}`;
                        const emoji = iconOption?.preview || '📱';
                        const textSize = size === 'small' ? 'text-lg' : size === 'medium' ? 'text-2xl' : 'text-3xl';
                        parent.innerHTML = `<div class="${textSize}">${emoji}</div>`;
                    }
                }}
            />
        </div>
    );
};