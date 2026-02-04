/**
 * @file NavigationDecorationSelector.tsx
 * @description 导航栏装饰选择组件
 */

import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { navigationDecorationService, NavigationDecorationOption } from '../services/navigationDecorationService';
import { ToastType } from './Toast';

interface NavigationDecorationSelectorProps {
    onToast: (type: ToastType, message: string) => void;
}

export const NavigationDecorationSelector: React.FC<NavigationDecorationSelectorProps> = ({ onToast }) => {
    const [decorations, setDecorations] = useState<NavigationDecorationOption[]>([]);
    const [currentDecoration, setCurrentDecoration] = useState<string>('default');

    useEffect(() => {
        setDecorations(navigationDecorationService.getAllDecorations());
        setCurrentDecoration(navigationDecorationService.getCurrentDecoration());
    }, []);

    const handleDecorationSelect = (decorationId: string) => {
        navigationDecorationService.setCurrentDecoration(decorationId);
        setCurrentDecoration(decorationId);
        onToast('success', '标题栏样式已更换');
    };

    const renderDecorationPreview = (decoration: NavigationDecorationOption) => {
        if (decoration.id === 'default') {
            return (
                <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400 text-xs rounded-lg">
                    默认
                </div>
            );
        } else {
            return (
                <div className="w-full h-full relative overflow-hidden rounded-lg bg-stone-50">
                    {/* 预览容器 - 显示图片中间部分 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <img
                            src={decoration.thumbnail || decoration.url}
                            alt={decoration.name}
                            className="w-full h-auto"
                            style={{
                                objectFit: 'cover',
                                objectPosition: 'center',
                                minHeight: '100%'
                            }}
                        />
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 text-lg">🎋</span>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-stone-800">标题栏样式</h3>
                    <p className="text-xs text-stone-500 mt-0.5">为导航栏添加装饰效果</p>
                </div>
            </div>

            {/* 装饰选项网格 */}
            <div className="grid grid-cols-5 gap-3">
                {decorations.map((decoration) => (
                    <div
                        key={decoration.id}
                        className="relative"
                    >
                        <button
                            onClick={() => handleDecorationSelect(decoration.id)}
                            className={`w-full aspect-square rounded-lg border-2 transition-all overflow-hidden ${
                                currentDecoration === decoration.id
                                    ? 'border-stone-400 ring-2 ring-stone-200'
                                    : 'border-stone-200 hover:border-stone-300'
                            }`}
                        >
                            {renderDecorationPreview(decoration)}
                            
                            {/* 选中状态指示器 */}
                            {currentDecoration === decoration.id && (
                                <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg z-10">
                                    <Check size={12} className="text-white" />
                                </div>
                            )}
                        </button>
                        
                        {/* 装饰名称 */}
                        <p className="text-xs text-stone-500 text-center mt-1.5 truncate">
                            {decoration.name}
                        </p>
                    </div>
                ))}
            </div>

            {/* 提示信息 */}
            <div className="text-xs text-stone-500 bg-stone-50 rounded-lg p-3 mt-4">
                <p>• 装饰效果会显示在底部导航栏上方</p>
                <p>• 选择"默认"可关闭装饰效果</p>
            </div>
        </div>
    );
};
