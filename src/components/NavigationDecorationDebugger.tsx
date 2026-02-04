/**
 * @file NavigationDecorationDebugger.tsx
 * @description 导航栏装饰调试工具
 */

import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, X, Save } from 'lucide-react';
import { navigationDecorationService } from '../services/navigationDecorationService';

interface NavigationDecorationDebuggerProps {
    currentDecorationId: string;
    currentOffset: string;
    onOffsetChange: (offset: string) => void;
    onClose: () => void;
}

export const NavigationDecorationDebugger: React.FC<NavigationDecorationDebuggerProps> = ({
    currentDecorationId,
    currentOffset,
    onOffsetChange,
    onClose
}) => {
    const [offsetValue, setOffsetValue] = useState(0);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        // 解析当前offset值
        if (currentOffset === 'bottom') {
            setOffsetValue(0);
        } else if (currentOffset === 'top') {
            setOffsetValue(100);
        } else if (currentOffset === 'center') {
            setOffsetValue(50);
        } else {
            // 解析像素值，如 "97px"
            const match = currentOffset.match(/^(-?\d+)px$/);
            if (match) {
                setOffsetValue(parseInt(match[1]));
            }
        }
    }, [currentOffset]);

    const handleAdjust = (delta: number) => {
        const newValue = offsetValue + delta;
        setOffsetValue(newValue);
        
        // 转换为offset字符串
        const newOffset = newValue === 0 ? 'bottom' : `${newValue}px`;
        onOffsetChange(newOffset);
    };

    const handleSave = () => {
        const offsetToSave = offsetValue === 0 ? 'bottom' : `${offsetValue}px`;
        navigationDecorationService.saveCustomOffset(currentDecorationId, offsetToSave);
        
        // 显示"已保存"状态
        setIsSaved(true);
        
        // 1秒后恢复
        setTimeout(() => {
            setIsSaved(false);
        }, 1000);
    };

    return (
        <div className="fixed bottom-24 right-4 z-50 bg-white rounded-xl shadow-2xl border-2 border-stone-300 p-3 w-40">
            {/* 标题栏 */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-stone-800">位置调试</h3>
                <button
                    onClick={onClose}
                    className="text-stone-400 hover:text-stone-600 transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            {/* 当前位置显示 */}
            <div className="bg-stone-50 rounded-lg p-2 mb-3">
                <div className="text-xs text-stone-500 mb-0.5">当前偏移</div>
                <div className="text-xl font-mono font-bold text-stone-800">
                    {offsetValue}px
                </div>
            </div>

            {/* 调整按钮 */}
            <div className="space-y-1.5">
                <button
                    onClick={() => handleAdjust(-1)}
                    className="w-full flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-1.5 transition-colors text-xs"
                >
                    <ChevronUp size={14} />
                    <span>向上 1px</span>
                </button>
                
                <button
                    onClick={() => handleAdjust(-5)}
                    className="w-full flex items-center justify-center gap-1.5 bg-blue-400 hover:bg-blue-500 text-white rounded-lg py-1.5 transition-colors text-xs"
                >
                    <ChevronUp size={14} />
                    <span>向上 5px</span>
                </button>

                <button
                    onClick={() => handleAdjust(5)}
                    className="w-full flex items-center justify-center gap-1.5 bg-orange-400 hover:bg-orange-500 text-white rounded-lg py-1.5 transition-colors text-xs"
                >
                    <ChevronDown size={14} />
                    <span>向下 5px</span>
                </button>

                <button
                    onClick={() => handleAdjust(1)}
                    className="w-full flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-1.5 transition-colors text-xs"
                >
                    <ChevronDown size={14} />
                    <span>向下 1px</span>
                </button>
            </div>

            {/* 保存按钮 */}
            <button
                onClick={handleSave}
                disabled={isSaved}
                className={`w-full mt-3 flex items-center justify-center gap-1.5 rounded-lg py-2 transition-colors text-xs font-medium ${
                    isSaved 
                        ? 'bg-green-600 text-white cursor-default' 
                        : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
            >
                <Save size={14} />
                <span>{isSaved ? '已保存' : '保存偏移值'}</span>
            </button>
        </div>
    );
};
