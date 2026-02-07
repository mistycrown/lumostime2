/**
 * @file FloatingButton.tsx
 * @description 悬浮按钮组件 - 支持配色方案自动应用（通过 CSS 变量）
 */

import React from 'react';

interface FloatingButtonProps {
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
    ariaLabel?: string;
    title?: string;
    position?: 'bottom-right' | 'bottom-left' | 'custom';
    size?: 'sm' | 'md' | 'lg';
    variant?: 'primary' | 'secondary' | 'white';
    style?: React.CSSProperties;
    disableThemeStyle?: boolean; // 禁用主题样式，使用默认样式
}

/**
 * 悬浮按钮组件
 * - 自动应用配色方案（通过 CSS 变量）
 * - 支持多种尺寸和位置
 */
export const FloatingButton: React.FC<FloatingButtonProps> = ({
    onClick,
    children,
    className = '',
    ariaLabel,
    title,
    position = 'bottom-right',
    size = 'lg',
    variant = 'primary',
    style = {},
    disableThemeStyle = false
}) => {
    // 尺寸映射
    const sizeClasses = {
        sm: 'w-12 h-12',
        md: 'w-14 h-14',
        lg: 'w-14 h-14'
    };

    // 位置映射
    const positionClasses = {
        'bottom-right': 'bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-6',
        'bottom-left': 'bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-6',
        'custom': ''
    };

    // 变体样式（当禁用主题样式时使用）
    const variantClasses = {
        primary: 'bg-stone-900 text-white border-stone-800',
        secondary: 'bg-white text-stone-600 border-stone-200',
        white: 'bg-white text-stone-600 border-stone-200'
    };

    // 确保 fixed 定位始终存在（除非是 custom 位置）
    const positionClass = position === 'custom' ? '' : 'fixed';

    // 如果禁用主题样式，使用传统的 Tailwind 类
    const styleClasses = disableThemeStyle 
        ? `${variantClasses[variant]} border shadow-2xl`
        : 'floating-button'; // 使用 CSS 变量类

    return (
        <button
            onClick={onClick}
            className={`
                ${positionClass}
                ${positionClasses[position]}
                ${sizeClasses[size]}
                ${styleClasses}
                rounded-full
                flex items-center justify-center
                active:scale-90
                transition-transform
                z-40
                ${className}
            `.trim().replace(/\s+/g, ' ')}
            style={style}
            aria-label={ariaLabel}
            title={title}
        >
            {children}
        </button>
    );
};
