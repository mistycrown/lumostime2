/**
 * @file BottomNavigation.tsx
 * @description 底部导航栏组件
 */
import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { navigationDecorationService, getNavigationDecorationFallbackUrl } from '../services/navigationDecorationService';
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
    const { defaultIndexView } = useSettings();
    const [currentDecoration, setCurrentDecoration] = useState<string>('default');
    const [decorationUrl, setDecorationUrl] = useState<string>('');
    const [imageError, setImageError] = useState<boolean>(false);
    const [settings, setSettings] = useState({
        offsetY: 'bottom',
        offsetX: '0px',
        scale: 1,
        opacity: 0.6
    });
    const [showDebugger, setShowDebugger] = useState(false);

    useEffect(() => {
        const updateState = (decorationId: string, overrideSettings?: any) => {
            setCurrentDecoration(decorationId);
            const decoration = navigationDecorationService.getDecorationById(decorationId);
            setDecorationUrl(decoration?.url || '');
            setImageError(false); // 重置错误状态

            const baseSettings = {
                offsetY: decoration?.offsetY || 'bottom',
                offsetX: decoration?.offsetX || '0px',
                scale: decoration?.scale || 1,
                opacity: decoration?.opacity ?? 0.6
            };

            setSettings({ ...baseSettings, ...overrideSettings });
        };

        // Initialize
        updateState(navigationDecorationService.getCurrentDecoration());

        // Listen for changes
        const handleDecorationChange = (event: CustomEvent) => {
            updateState(event.detail.decorationId);
        };

        // Listen for live preview
        const handlePreview = (event: CustomEvent) => {
            const { id, settings: previewSettings } = event.detail;
            if (id) {
                // If ID matches, simply override settings.
                // If ID changed (prev/next in debugger), we need to update URL too.
                const decoration = navigationDecorationService.getDecorationById(id);
                setDecorationUrl(decoration?.url || '');
                setCurrentDecoration(id);
                setSettings(previewSettings);
            }
        };

        window.addEventListener('navigationDecorationChange', handleDecorationChange as EventListener);
        window.addEventListener('navigationDecorationPreview', handlePreview as EventListener);

        (window as any).enableNavDecoDebug = () => setShowDebugger(true);
        (window as any).disableNavDecoDebug = () => setShowDebugger(false);

        return () => {
            window.removeEventListener('navigationDecorationChange', handleDecorationChange as EventListener);
            window.removeEventListener('navigationDecorationPreview', handlePreview as EventListener);
            delete (window as any).enableNavDecoDebug;
            delete (window as any).disableNavDecoDebug;
        };
    }, []);

    const handleCloseDebugger = () => {
        setShowDebugger(false);
    };

    if (!isVisible) return null;

    const bgColor = (currentView === AppView.TIMELINE || currentView === AppView.TAGS)
        ? 'bg-[#faf9f6]/80 backdrop-blur-md'
        : 'bg-white/80 backdrop-blur-md';

    // Calculate dynamic styles
    const navStyle: React.CSSProperties = {};
    if (currentDecoration !== 'default' && decorationUrl) {
        navStyle.backgroundImage = `url(${decorationUrl})`;
        navStyle.backgroundRepeat = 'repeat-x';
        navStyle.backgroundPosition = `${settings.offsetX} ${settings.offsetY}`;
        navStyle.backgroundSize = `auto ${settings.scale * 80}px`; // Base height 80px * scale
        navStyle.opacity = settings.opacity;
    }

    return (
        <>
            <div className="fixed bottom-0 left-0 w-full z-30">
                {/* 装饰层 - 仅在非默认时显示 */}
                {currentDecoration !== 'default' && decorationUrl && !imageError && (
                    <div
                        className="absolute bottom-0 left-0 w-full h-40 md:h-48 pointer-events-none z-10"
                        style={navStyle}
                    >
                        {/* 隐藏的 img 标签用于检测图片加载错误 */}
                        <img
                            src={decorationUrl}
                            alt=""
                            style={{ display: 'none' }}
                            onError={() => {
                                // 如果 PNG 加载失败，尝试 webp 格式
                                if (decorationUrl.endsWith('.png')) {
                                    setDecorationUrl(getNavigationDecorationFallbackUrl(decorationUrl));
                                } else {
                                    // webp 也失败了，隐藏装饰
                                    setImageError(true);
                                }
                            }}
                        />
                    </div>
                )}

                {/* 导航栏 */}
                <nav className={`relative h-12 md:h-16 box-content border-t border-stone-100 flex justify-around items-center pb-[env(safe-area-inset-bottom)] ${bgColor}`}>
                    {NAV_ITEMS.map((item) => {
                        const isActive = currentView === item.view;
                        return (
                            <div
                                key={item.view}
                                onClick={() => {
                                    if (item.view === AppView.TAGS && defaultIndexView === 'SCOPE') {
                                        onViewChange(AppView.SCOPE);
                                    } else {
                                        onViewChange(item.view);
                                    }
                                }}
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
            {showDebugger && (
                <NavigationDecorationDebugger
                    currentDecorationId={currentDecoration}
                    onClose={handleCloseDebugger}
                />
            )}
        </>
    );
};
