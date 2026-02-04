/**
 * @file NavigationDecorationSelector.tsx
 * @description 导航栏装饰选择组件
 */

import React, { useState, useEffect } from 'react';
import { Check, Settings } from 'lucide-react';
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

    const handleOpenDebugger = () => {
        if (currentDecoration === 'default') {
            onToast('info', '请先选择一个装饰样式');
            return;
        }
        (window as any).enableNavDecoDebug?.();
        onToast('success', '调试工具已开启');
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
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                        <span className="text-green-600 text-lg">🎋</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-stone-800">导航栏样式</h3>
                    </div>
                </div>
                
                {/* 调试按钮 */}
                <button
                    onClick={handleOpenDebugger}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                >
                    <Settings size={14} />
                    <span>调试</span>
                </button>
            </div>

            {/* 装饰选项网格 */}
            <div className="flex flex-wrap gap-2">
                {decorations.map((decoration) => (
                    <button
                        key={decoration.id}
                        onClick={() => handleDecorationSelect(decoration.id)}
                        className={`relative w-16 h-16 rounded-lg border-2 transition-all overflow-hidden ${
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
                ))}
            </div>
        </div>
    );
};
