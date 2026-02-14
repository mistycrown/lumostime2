/**
 * @file FontSelector.tsx
 * @description 字体选择器组件 - 用于切换应用字体
 */

import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { fontService, FontOption } from '../services/fontService';
import { ToastType } from './Toast';

interface FontSelectorProps {
    onToast: (type: ToastType, message: string) => void;
    currentFont?: string;
    onFontChange?: (fontId: string) => void;
}

export const FontSelector: React.FC<FontSelectorProps> = ({
    onToast,
    currentFont: controlledFont,
    onFontChange
}) => {
    const [fonts, setFonts] = useState<FontOption[]>([]);
    const [internalFont, setInternalFont] = useState<string>('default');
    
    // Use controlled or internal state
    const currentFont = controlledFont !== undefined ? controlledFont : internalFont;
    const isControlled = controlledFont !== undefined;

    useEffect(() => {
        loadFonts();
        if (!isControlled) {
            setInternalFont(fontService.getCurrentFont());
        }
    }, [isControlled]);

    const loadFonts = () => {
        const allFonts = fontService.getAllFonts();
        setFonts(allFonts);
    };

    const handleFontSelect = (fontId: string) => {
        if (isControlled && onFontChange) {
            // Controlled mode - just notify parent
            onFontChange(fontId);
        } else {
            // Uncontrolled mode - update service and internal state
            const result = fontService.setFont(fontId);
            if (result.success) {
                setInternalFont(fontId);
                onToast('success', result.message);
            } else {
                onToast('error', result.message);
            }
        }
    };

    return (
        <div className="space-y-3">
            {fonts.map((font) => {
                const isSelected = currentFont === font.id;
                
                return (
                    <button
                        key={font.id}
                        onClick={() => handleFontSelect(font.id)}
                        className={`w-full rounded-2xl transition-all overflow-hidden text-left ${
                            isSelected
                                ? 'border-2 border-stone-300 ring-1 ring-stone-200 bg-white shadow-sm'
                                : 'border border-stone-100 hover:border-stone-200 bg-white hover:bg-stone-50'
                        }`}
                    >
                        <div className="p-4 flex items-center justify-between">
                            {/* 左侧：字体信息 */}
                            <div className="flex-1">
                                <h5 
                                    className="text-base font-bold text-stone-800 mb-2"
                                    style={{ fontFamily: font.fontFamily }}
                                >
                                    {font.displayName}
                                </h5>
                                
                                {/* 字体预览文本 - 只显示两行 */}
                                <p 
                                    className="text-sm text-stone-600 leading-relaxed"
                                    style={{ fontFamily: font.fontFamily }}
                                >
                                    时光荏苒，岁月如梭
                                </p>
                            </div>
                            
                            {/* 右侧：选中标记 */}
                            {isSelected && (
                                <div className="shrink-0 ml-3 w-6 h-6 bg-stone-800 rounded-full flex items-center justify-center">
                                    <Check size={14} className="text-white" />
                                </div>
                            )}
                        </div>
                    </button>
                );
            })}
        </div>
    );
};
