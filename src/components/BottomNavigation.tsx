/**
 * @file BottomNavigation.tsx
 * @description 底部导航栏组件
 */
import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import { navigationDecorationService } from '../services/navigationDecorationService';
import { NavigationDecorationDebugger } from './NavigationDecorationDebugger';

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
    const [currentDecoration, setCurrentDecoration] = useState<string>('default');
    const [decorationUrl, setDecorationUrl] = useState<string>('');
    const [decorationOffsetY, setDecorationOffsetY] = useState<string>('bottom');
    const [debugOffsetY, setDebugOffsetY] = useState<string>('bottom');
    const [showDebugger, setShowDebugger] = useState(false);

    useEffect(() => {
        // 初始化装饰
        const decorationId = navigationDecorationService.getCurrentDecoration();
        setCurrentDecoration(decorationId);
        const decoration = navigationDecorationService.getDecorationById(decorationId);
        setDecorationUrl(decoration?.url || '');
        setDecorationOffsetY(decoration?.offsetY || 'bottom');
        setDebugOffsetY(decoration?.offsetY || 'bottom');

        // 监听装饰变化
        const handleDecorationChange = (event: CustomEvent) => {
            const { decorationId } = event.detail;
            setCurrentDecoration(decorationId);
            const decoration = navigationDecorationService.getDecorationById(decorationId);
            setDecorationUrl(decoration?.url || '');
            setDecorationOffsetY(decoration?.offsetY || 'bottom');
            setDebugOffsetY(decoration?.offsetY || 'bottom');
        };

        window.addEventListener('navigationDecorationChange', handleDecorationChange as EventListener);
        
        // 注册全局调试函数
        (window as any).enableNavDecoDebug = () => {
            setShowDebugger(true);
        };

        (window as any).disableNavDecoDebug = () => {
            setShowDebugger(false);
        };

        return () => {
            window.removeEventListener('navigationDecorationChange', handleDecorationChange as EventListener);
            delete (window as any).enableNavDecoDebug;
            delete (window as any).disableNavDecoDebug;
        };
    }, []);

    const handleDebugOffsetChange = (newOffset: string) => {
        setDebugOffsetY(newOffset);
    };

    const handleCloseDebugger = () => {
        setShowDebugger(false);
    };

    if (!isVisible) return null;

    const bgColor = (currentView === AppView.TIMELINE || currentView === AppView.TAGS)
        ? 'bg-[#faf9f6]/80 backdrop-blur-md'
        : 'bg-white/80 backdrop-blur-md';

    // 使用调试偏移值（如果正在调试）或默认偏移值
    const activeOffsetY = debugOffsetY;

    return (
        <>
            <div className="fixed bottom-0 left-0 w-full z-30">
                {/* 装饰层 - 仅在非默认时显示 */}
                {currentDecoration !== 'default' && decorationUrl && (
                    <div 
                        className="absolute bottom-0 left-0 w-full h-40 md:h-48 pointer-events-none z-10"
                        style={{
                            backgroundImage: `url(${decorationUrl})`,
                            backgroundRepeat: 'repeat-x',
                            backgroundPosition: `center ${activeOffsetY}`,
                            backgroundSize: 'auto 80px',
                            opacity: 0.6
                        }}
                    />
                )}
                
                {/* 导航栏 */}
                <nav className={`relative h-12 md:h-16 box-content border-t border-stone-100 flex justify-around items-center pb-[env(safe-area-inset-bottom)] ${bgColor}`}>
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
        </div>

        {/* 调试工具 */}
        {showDebugger && currentDecoration !== 'default' && decorationUrl && (
            <NavigationDecorationDebugger
                currentDecorationId={currentDecoration}
                currentOffset={decorationOffsetY}
                onOffsetChange={handleDebugOffsetChange}
                onClose={handleCloseDebugger}
            />
        )}
        </>
    );
};
