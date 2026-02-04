/**
 * @file NavigationDecorationDebugger.tsx
 * @description 导航栏装饰调试工具
 * 使用方法：在控制台输入 window.enableNavDecoDebug() 开启调试
 */

import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';

interface NavigationDecorationDebuggerProps {
    currentOffset: string;
    onOffsetChange: (offset: string) => void;
}

export const NavigationDecorationDebugger: React.FC<NavigationDecorationDebuggerProps> = ({
    currentOffset,
    onOffsetChange
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [offsetValue, setOffsetValue] = useState(0);

    useEffect(() => {
        // 解析当前offset值
        if (currentOffset === 'bottom') {
            setOffsetValue(0);
        } else if (currentOffset === 'top') {
            setOffsetValue(100);
        } else if (currentOffset === 'center') {
            setOffsetValue(50);
        } else {
            // 解析像素值，如 "-15px"
            const match = currentOffset.match(/^(-?\d+)px$/);
            if (match) {
                setOffsetValue(parseInt(match[1]));
            }
        }

        // 注册全局调试函数
        (window as any).enableNavDecoDebug = () => {
            setIsVisible(true);
            console.log('导航栏装饰调试已开启');
        };

        (window as any).disableNavDecoDebug = () => {
            setIsVisible(false);
            console.log('导航栏装饰调试已关闭');
        };

        return () => {
            delete (window as any).enableNavDecoDebug;
            delete (window as any).disableNavDecoDebug;
        };
    }, [currentOffset]);

    const handleAdjust = (delta: number) => {
        const newValue = offsetValue + delta;
        setOffsetValue(newValue);
        
        // 转换为offset字符串
        let newOffset: string;
        if (newValue === 0) {
            newOffset = 'bottom';
        } else {
            newOffset = `${newValue}px`;
        }
        
        onOffsetChange(newOffset);
    };

    const handleClose = () => {
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-24 right-4 z-50 bg-white rounded-xl shadow-2xl border-2 border-stone-300 p-4 w-64">
            {/* 标题栏 */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-stone-800">装饰位置调试</h3>
                <button
                    onClick={handleClose}
                    className="text-stone-400 hover:text-stone-600 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            {/* 当前位置显示 */}
            <div className="bg-stone-50 rounded-lg p-3 mb-4">
                <div className="text-xs text-stone-500 mb-1">当前偏移值</div>
                <div className="text-2xl font-mono font-bold text-stone-800">
                    {offsetValue}px
                </div>
                <div className="text-xs text-stone-400 mt-1">
                    {offsetValue === 0 ? '(bottom)' : offsetValue > 0 ? '(向下)' : '(向上)'}
                </div>
            </div>

            {/* 调整按钮 */}
            <div className="space-y-2">
                <button
                    onClick={() => handleAdjust(-1)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2 transition-colors"
                >
                    <ChevronUp size={16} />
                    <span className="text-sm font-medium">向上移动 1px</span>
                </button>
                
                <button
                    onClick={() => handleAdjust(-5)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-400 hover:bg-blue-500 text-white rounded-lg py-2 transition-colors"
                >
                    <ChevronUp size={16} />
                    <span className="text-sm font-medium">向上移动 5px</span>
                </button>

                <button
                    onClick={() => handleAdjust(5)}
                    className="w-full flex items-center justify-center gap-2 bg-orange-400 hover:bg-orange-500 text-white rounded-lg py-2 transition-colors"
                >
                    <ChevronDown size={16} />
                    <span className="text-sm font-medium">向下移动 5px</span>
                </button>

                <button
                    onClick={() => handleAdjust(1)}
                    className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2 transition-colors"
                >
                    <ChevronDown size={16} />
                    <span className="text-sm font-medium">向下移动 1px</span>
                </button>
            </div>

            {/* 快捷设置 */}
            <div className="mt-4 pt-4 border-t border-stone-200">
                <div className="text-xs text-stone-500 mb-2">快捷设置</div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setOffsetValue(0);
                            onOffsetChange('bottom');
                        }}
                        className="flex-1 text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 rounded py-1.5 transition-colors"
                    >
                        底部
                    </button>
                    <button
                        onClick={() => {
                            setOffsetValue(50);
                            onOffsetChange('center');
                        }}
                        className="flex-1 text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 rounded py-1.5 transition-colors"
                    >
                        居中
                    </button>
                </div>
            </div>

            {/* 使用提示 */}
            <div className="mt-4 text-xs text-stone-400 bg-amber-50 rounded-lg p-2">
                💡 调整完成后，记录当前偏移值并告知开发者
            </div>
        </div>
    );
};
