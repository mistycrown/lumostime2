/**
 * @file ColorSchemeSelector.tsx
 * @description 配色方案选择器组件
 */

import React from 'react';
import { Check } from 'lucide-react';

// 配色方案类型
export type ColorScheme = 'default' | 'purple';

interface ColorSchemeSelectorProps {
    currentScheme: ColorScheme;
    onSchemeChange: (scheme: ColorScheme) => void;
}

/**
 * 配色方案选择器
 */
export const ColorSchemeSelector: React.FC<ColorSchemeSelectorProps> = ({
    currentScheme,
    onSchemeChange
}) => {
    return (
        <div className="space-y-4">
            {/* 配色方案网格 */}
            <div className="grid grid-cols-4 gap-3">
                {/* 默认配色 */}
                <button
                    onClick={() => onSchemeChange('default')}
                    className={`relative rounded-lg transition-all overflow-hidden ${
                        currentScheme === 'default'
                            ? 'ring-2 ring-stone-400'
                            : 'ring-1 ring-stone-200 hover:ring-stone-300'
                    }`}
                    style={{ aspectRatio: '1' }}
                >
                    <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-stone-900 shadow-lg"></div>
                    </div>

                    {/* 选中标记 */}
                    {currentScheme === 'default' && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg">
                            <Check size={12} className="text-white" />
                        </div>
                    )}
                </button>

                {/* 紫色配色 */}
                <button
                    onClick={() => onSchemeChange('purple')}
                    className={`relative rounded-lg transition-all overflow-hidden ${
                        currentScheme === 'purple'
                            ? 'ring-2 ring-purple-400'
                            : 'ring-1 ring-stone-200 hover:ring-purple-200'
                    }`}
                    style={{ aspectRatio: '1' }}
                >
                    <div className="w-full h-full bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-white shadow-lg border border-purple-200/30 flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                        </div>
                    </div>

                    {/* 选中标记 */}
                    {currentScheme === 'purple' && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                            <Check size={12} className="text-white" />
                        </div>
                    )}
                </button>
            </div>
        </div>
    );
};
