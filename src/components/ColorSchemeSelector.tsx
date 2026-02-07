/**
 * @file ColorSchemeSelector.tsx
 * @description 配色方案选择器组件
 */

import React from 'react';
import { Check } from 'lucide-react';

// 配色方案类型
export type ColorScheme = 'default' | 'morandi-purple' | 'morandi-blue' | 'morandi-green' | 'morandi-pink';

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

                {/* 莫兰迪紫配色 */}
                <button
                    onClick={() => onSchemeChange('morandi-purple')}
                    className={`relative rounded-lg transition-all overflow-hidden ${
                        currentScheme === 'morandi-purple'
                            ? 'ring-2 ring-[#9c88b1]'
                            : 'ring-1 ring-stone-200 hover:ring-[#e8e3ed]'
                    }`}
                    style={{ aspectRatio: '1' }}
                >
                    <div className="w-full h-full bg-gradient-to-br from-[#f7f5f9] to-[#f0ebf5] flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-white shadow-lg border border-[#e8e3ed] flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-[#9c88b1]"></div>
                        </div>
                    </div>

                    {/* 选中标记 */}
                    {currentScheme === 'morandi-purple' && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-[#9c88b1] rounded-full flex items-center justify-center shadow-lg">
                            <Check size={12} className="text-white" />
                        </div>
                    )}
                </button>

                {/* 莫兰迪蓝配色 */}
                <button
                    onClick={() => onSchemeChange('morandi-blue')}
                    className={`relative rounded-lg transition-all overflow-hidden ${
                        currentScheme === 'morandi-blue'
                            ? 'ring-2 ring-[#8ba6b8]'
                            : 'ring-1 ring-stone-200 hover:ring-[#e3e9ee]'
                    }`}
                    style={{ aspectRatio: '1' }}
                >
                    <div className="w-full h-full bg-gradient-to-br from-[#f5f7f9] to-[#ebf0f5] flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-white shadow-lg border border-[#e3e9ee] flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-[#8ba6b8]"></div>
                        </div>
                    </div>

                    {/* 选中标记 */}
                    {currentScheme === 'morandi-blue' && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-[#8ba6b8] rounded-full flex items-center justify-center shadow-lg">
                            <Check size={12} className="text-white" />
                        </div>
                    )}
                </button>

                {/* 莫兰迪绿配色 */}
                <button
                    onClick={() => onSchemeChange('morandi-green')}
                    className={`relative rounded-lg transition-all overflow-hidden ${
                        currentScheme === 'morandi-green'
                            ? 'ring-2 ring-[#95a591]'
                            : 'ring-1 ring-stone-200 hover:ring-[#e5ebe3]'
                    }`}
                    style={{ aspectRatio: '1' }}
                >
                    <div className="w-full h-full bg-gradient-to-br from-[#f6f8f5] to-[#edf2eb] flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-white shadow-lg border border-[#e5ebe3] flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-[#95a591]"></div>
                        </div>
                    </div>

                    {/* 选中标记 */}
                    {currentScheme === 'morandi-green' && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-[#95a591] rounded-full flex items-center justify-center shadow-lg">
                            <Check size={12} className="text-white" />
                        </div>
                    )}
                </button>

                {/* 莫兰迪粉配色 */}
                <button
                    onClick={() => onSchemeChange('morandi-pink')}
                    className={`relative rounded-lg transition-all overflow-hidden ${
                        currentScheme === 'morandi-pink'
                            ? 'ring-2 ring-[#c79faa]'
                            : 'ring-1 ring-stone-200 hover:ring-[#f0e8eb]'
                    }`}
                    style={{ aspectRatio: '1' }}
                >
                    <div className="w-full h-full bg-gradient-to-br from-[#faf7f8] to-[#f5eef1] flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-white shadow-lg border border-[#f0e8eb] flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-[#c79faa]"></div>
                        </div>
                    </div>

                    {/* 选中标记 */}
                    {currentScheme === 'morandi-pink' && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-[#c79faa] rounded-full flex items-center justify-center shadow-lg">
                            <Check size={12} className="text-white" />
                        </div>
                    )}
                </button>
            </div>
        </div>
    );
};
