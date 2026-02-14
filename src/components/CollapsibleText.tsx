/**
 * @file CollapsibleText.tsx
 * @description 可折叠文本组件，当文本超过指定字数时显示折叠按钮
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleTextProps {
    text: string;
    threshold: number; // 折叠阈值（字数）
    className?: string;
}

export const CollapsibleText: React.FC<CollapsibleTextProps> = ({ 
    text, 
    threshold, 
    className = '' 
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // 如果文本长度小于等于阈值，直接显示全部内容
    if (text.length <= threshold) {
        return (
            <div className={className}>
                <div className="whitespace-pre-wrap" style={{ fontFamily: '"Noto Serif SC", serif' }}>
                    {text}
                </div>
            </div>
        );
    }

    // 需要折叠的情况
    const displayText = isExpanded ? text : text.slice(0, threshold);

    return (
        <div className={className}>
            <div className="whitespace-pre-wrap" style={{ fontFamily: '"Noto Serif SC", serif' }}>
                {displayText}
                {!isExpanded && '...'}
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation(); // 阻止事件冒泡
                    setIsExpanded(!isExpanded);
                }}
                className="mt-2 flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 transition-colors"
                style={{ fontFamily: '"Noto Serif SC", serif' }}
            >
                {isExpanded ? (
                    <>
                        <ChevronUp size={14} />
                        <span>收起</span>
                    </>
                ) : (
                    <>
                        <ChevronDown size={14} />
                        <span>展开全部</span>
                    </>
                )}
            </button>
        </div>
    );
};
