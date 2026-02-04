/**
 * @file BottomNavigation.tsx
 * @description 底部导航栏组件
 */
import React from 'react';
import { AppView } from '../types';

interface BottomNavigationProps {
    currentView: AppView;
    onViewChange: (view: AppView) => void;
    isVisible: boolean;
}

const NAV_ITEMS = [
    { view: AppView.RECORD, label: '记录' },
    { view: AppView.TODO, label: '待办' },
    { view: AppView.TIMELINE, label: '脉络' },
    { view: AppView.REVIEW, label: '档案' },
    { view: AppView.TAGS, label: '索引' },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
    currentView,
    onViewChange,
    isVisible
}) => {
    if (!isVisible) return null;

    const bgColor = (currentView === AppView.TIMELINE || currentView === AppView.TAGS)
        ? 'bg-[#faf9f6]/80 backdrop-blur-md'
        : 'bg-white/80 backdrop-blur-md';

    return (
        <nav className={`fixed bottom-0 left-0 w-full h-12 md:h-16 box-content border-t border-stone-100 flex justify-around items-center z-30 pb-[env(safe-area-inset-bottom)] ${bgColor}`}>
            {NAV_ITEMS.map((item) => {
                const isActive = currentView === item.view;
                return (
                    <div
                        key={item.view}
                        onClick={() => onViewChange(item.view)}
                        className={`flex-1 h-full flex items-center justify-center cursor-pointer relative transition-all duration-200 ${isActive ? 'text-stone-900' : 'text-stone-400'}`}
                    >
                        <span className={`font-serif text-[13px] tracking-[1px] transition-all duration-200 ${isActive ? 'font-black' : 'font-medium'}`}>
                            {item.label}
                        </span>
                    </div>
                );
            })}
        </nav>
    );
};
