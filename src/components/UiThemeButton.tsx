/**
 * @file UiThemeButton.tsx
 * @description UI 主题选择按钮组件
 * @input theme: 主题名称, currentTheme: 当前主题, onThemeChange: 主题切换回调
 * @output 主题选择按钮
 * @pos Component
 */
import React from 'react';
import { Check } from 'lucide-react';

interface UiThemeButtonProps {
    theme: string;
    currentTheme: string;
    onThemeChange: (theme: string) => void;
}

export const UiThemeButton: React.FC<UiThemeButtonProps> = ({
    theme,
    currentTheme,
    onThemeChange
}) => {
    const isSelected = currentTheme === theme;
    
    return (
        <button
            onClick={() => onThemeChange(theme)}
            className={`relative rounded-lg border-2 transition-all overflow-hidden ${
                isSelected
                    ? 'border-stone-400 ring-2 ring-stone-200'
                    : 'border-stone-200 hover:border-stone-300'
            }`}
            style={{ aspectRatio: '4/5' }}
        >
            <div className="w-full h-full grid grid-cols-2 gap-0.5 p-1 bg-white">
                {[1, 2, 3, 4].map((num) => (
                    <div key={num} className="bg-stone-50 rounded flex items-center justify-center">
                        <img
                            src={`/uiicon/${theme}/${String(num).padStart(2, '0')}.webp`}
                            alt={`icon-${num}`}
                            className="w-full h-full object-contain p-0.5"
                            onError={(e) => {
                                e.currentTarget.src = `/uiicon/${theme}/${String(num).padStart(2, '0')}.png`;
                            }}
                        />
                    </div>
                ))}
            </div>
            {isSelected && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg">
                    <Check size={12} className="text-white" />
                </div>
            )}
        </button>
    );
};
