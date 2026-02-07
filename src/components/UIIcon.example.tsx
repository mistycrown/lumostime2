/**
 * @file UIIcon.example.tsx
 * @description UIIcon 组件使用示例
 * 
 * 这个文件展示了如何在各个页面中替换现有的 Lucide 图标
 */

import React from 'react';
import { UIIcon } from './UIIcon';
import {
    Settings,
    RefreshCw,
    Calendar,
    Plus,
    Timer,
    Sparkles,
    Tag,
    Target,
    BookOpen,
    Heart,
    BookMarked,
    Edit3,
    ArrowUp,
    ArrowDown,
    BarChart3
} from 'lucide-react';

/**
 * 示例 1: 记录页顶部按钮
 */
export const RecordViewExample = () => {
    return (
        <div className="flex items-center justify-between p-4">
            {/* 左侧同步按钮 */}
            <button className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                <UIIcon 
                    type="sync" 
                    fallbackIcon={RefreshCw} 
                    size={20} 
                    className="text-stone-600"
                />
            </button>

            <h1 className="text-lg font-bold">记录</h1>

            {/* 右侧设置按钮 */}
            <button className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                <UIIcon 
                    type="settings" 
                    fallbackIcon={Settings} 
                    size={20} 
                    className="text-stone-600"
                />
            </button>
        </div>
    );
};

/**
 * 示例 2: 脉络页顶部按钮
 */
export const TimelineViewExample = () => {
    return (
        <div className="flex items-center justify-between p-4">
            {/* 左侧同步按钮 */}
            <button className="p-2 hover:bg-stone-100 rounded-lg">
                <UIIcon 
                    type="sync" 
                    fallbackIcon={RefreshCw} 
                    size={20} 
                />
            </button>

            {/* 排序按钮 */}
            <div className="flex gap-2">
                <button className="p-2 hover:bg-stone-100 rounded-lg">
                    <UIIcon 
                        type="sort-asc" 
                        fallbackIcon={ArrowUp} 
                        size={18} 
                    />
                </button>
                <button className="p-2 hover:bg-stone-100 rounded-lg">
                    <UIIcon 
                        type="sort-desc" 
                        fallbackIcon={ArrowDown} 
                        size={18} 
                    />
                </button>
                <button className="p-2 hover:bg-stone-100 rounded-lg">
                    <UIIcon 
                        type="data-view" 
                        fallbackIcon={BarChart3} 
                        size={18} 
                    />
                </button>
            </div>

            {/* 右侧日历按钮 */}
            <button className="p-2 hover:bg-stone-100 rounded-lg">
                <UIIcon 
                    type="calendar" 
                    fallbackIcon={Calendar} 
                    size={20} 
                />
            </button>
        </div>
    );
};

/**
 * 示例 3: 悬浮按钮组
 */
export const FloatingButtonsExample = () => {
    return (
        <div className="fixed bottom-20 right-4 flex flex-col gap-3">
            {/* AI 补记 */}
            <button className="w-14 h-14 bg-purple-500 hover:bg-purple-600 rounded-full shadow-lg flex items-center justify-center">
                <UIIcon 
                    type="ai-assist" 
                    fallbackIcon={Sparkles} 
                    size={24} 
                    className="text-white"
                />
            </button>

            {/* 打点计时 */}
            <button className="w-14 h-14 bg-blue-500 hover:bg-blue-600 rounded-full shadow-lg flex items-center justify-center">
                <UIIcon 
                    type="timer" 
                    fallbackIcon={Timer} 
                    size={24} 
                    className="text-white"
                />
            </button>

            {/* 增加记录 */}
            <button className="w-14 h-14 bg-stone-800 hover:bg-stone-900 rounded-full shadow-lg flex items-center justify-center">
                <UIIcon 
                    type="add-record" 
                    fallbackIcon={Plus} 
                    size={24} 
                    className="text-white"
                />
            </button>
        </div>
    );
};

/**
 * 示例 4: 待办页
 */
export const TodoViewExample = () => {
    return (
        <div className="flex items-center justify-between p-4">
            <button className="p-2 hover:bg-stone-100 rounded-lg">
                <UIIcon 
                    type="sync" 
                    fallbackIcon={RefreshCw} 
                    size={20} 
                />
            </button>

            <h1 className="text-lg font-bold">待办</h1>

            <button className="p-2 hover:bg-stone-100 rounded-lg">
                <UIIcon 
                    type="manage" 
                    fallbackIcon={Settings} 
                    size={20} 
                />
            </button>
        </div>
    );
};

/**
 * 示例 5: 索引页切换按钮
 */
export const IndexViewExample = () => {
    return (
        <div className="fixed bottom-20 right-4 flex gap-3">
            {/* 切换到标签 */}
            <button className="w-12 h-12 bg-white shadow-lg rounded-full flex items-center justify-center">
                <UIIcon 
                    type="tags" 
                    fallbackIcon={Tag} 
                    size={20} 
                />
            </button>

            {/* 切换到领域 */}
            <button className="w-12 h-12 bg-white shadow-lg rounded-full flex items-center justify-center">
                <UIIcon 
                    type="scope" 
                    fallbackIcon={Target} 
                    size={20} 
                />
            </button>
        </div>
    );
};

/**
 * 示例 6: 档案页切换按钮
 */
export const ArchiveViewExample = () => {
    return (
        <div className="fixed bottom-20 right-4 flex gap-3">
            {/* 编年史 */}
            <button className="w-12 h-12 bg-white shadow-lg rounded-full flex items-center justify-center">
                <UIIcon 
                    type="chronicle" 
                    fallbackIcon={BookOpen} 
                    size={20} 
                />
            </button>

            {/* 回忆录 */}
            <button className="w-12 h-12 bg-white shadow-lg rounded-full flex items-center justify-center">
                <UIIcon 
                    type="memoir" 
                    fallbackIcon={Heart} 
                    size={20} 
                />
            </button>
        </div>
    );
};

/**
 * 示例 7: 日报/周报/月报详情页
 */
export const ReviewDetailExample = () => {
    const [isReading, setIsReading] = React.useState(false);

    return (
        <div className="fixed bottom-20 right-4">
            <button 
                onClick={() => setIsReading(!isReading)}
                className="w-12 h-12 bg-white shadow-lg rounded-full flex items-center justify-center"
            >
                <UIIcon 
                    type={isReading ? "editing" : "reading"} 
                    fallbackIcon={isReading ? Edit3 : BookMarked} 
                    size={20} 
                />
            </button>
        </div>
    );
};

/**
 * 完整的替换指南：
 * 
 * 1. 找到需要替换的图标位置
 * 2. 导入 UIIcon 组件和对应的 Lucide 图标
 * 3. 将原有的 <LucideIcon /> 替换为 <UIIcon type="..." fallbackIcon={LucideIcon} />
 * 4. 保持原有的 size 和 className 属性
 * 
 * 替换前：
 * <Settings size={20} className="text-stone-600" />
 * 
 * 替换后：
 * <UIIcon 
 *   type="settings" 
 *   fallbackIcon={Settings} 
 *   size={20} 
 *   className="text-stone-600"
 * />
 */
