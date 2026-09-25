/**
 * @file BottomNavigation.tsx
 * @input currentView, isVisible
 * @output Navigation View Changes, Decoration Display
 * @pos Component (Navigation)
 * @description 底部导航栏组件 - 提供主要视图切换和装饰图片显示
 * 
 * 核心功能：
 * - 4个主要视图切换（Timeline, Tags, Todo, Scope）
 * - 导航栏装饰图片显示
 * - 装饰调试器（开发用）
 * - 新版导航背景模式：将图片作为导航栏背景渲染
 * 
 * Debug 命令：
 * - window.LumosTime.debug.enableNavDeco() - 启用调试器
 * - window.LumosTime.debug.disableNavDeco() - 禁用调试器
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 * @updated 2026-09-25: Added opt-in navigation-background rendering while preserving legacy foreground decorations.
 */
import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { navigationDecorationService, getNavigationDecorationFallbackUrl } from '../services/navigationDecorationService';
import { NavigationDecorationDebugger } from './NavigationDecorationDebugger';
import {
    navigationBackgroundService,
    NAVIGATION_BACKGROUND_CHANGE_EVENT,
    NAVIGATION_BACKGROUND_MODE_CHANGE_EVENT,
    NAVIGATION_BACKGROUND_PREVIEW_EVENT
} from '../services/navigationBackgroundService';

interface BottomNavigationProps {
    currentView: AppView;
    onViewChange: (view: AppView) => void;
    isVisible: boolean;
}

const isIndexView = (view: AppView): boolean => (
    view === AppView.TAGS || view === AppView.SCOPE
);

const NAV_ITEMS = [
    { view: AppView.RECORD, label: '记录' },
    { view: AppView.TODO, label: '待办' },
    { view: AppView.TIMELINE, label: '脉络' },
    { view: AppView.REVIEW, label: '档案' },
    { view: AppView.TAGS, label: '索引' },
];

const NAV_ITEM_KEYS = ['record', 'todo', 'timeline', 'review', 'index'] as const;

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
    currentView,
    onViewChange,
    isVisible
}) => {
    const { defaultIndexView, navigationModuleVisibility } = useSettings();
    const visibleNavItems = NAV_ITEMS.filter((_, index) => navigationModuleVisibility[NAV_ITEM_KEYS[index]]);
    const [currentDecoration, setCurrentDecoration] = useState<string>('default');
    const [decorationUrl, setDecorationUrl] = useState<string>('');
    const [settings, setSettings] = useState({
        offsetY: 'bottom',
        offsetX: '0px',
        scale: 1,
        opacity: 0.6
    });
    const [showDebugger, setShowDebugger] = useState(false);
    const [isNewNavigation, setIsNewNavigation] = useState(() => navigationBackgroundService.isEnabled());
    const [currentBackground, setCurrentBackground] = useState(() => navigationBackgroundService.getCurrentBackground());
    const [backgroundUrl, setBackgroundUrl] = useState('');
    const [backgroundSettings, setBackgroundSettings] = useState({
        offsetY: '0px',
        offsetX: '0px',
        scale: 1,
        opacity: 1
    });

    useEffect(() => {
        const updateState = (decorationId: string, overrideSettings?: any) => {
            setCurrentDecoration(decorationId);
            const decoration = navigationDecorationService.getDecorationById(decorationId);
            setDecorationUrl(decoration?.url || '');

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

        const updateBackgroundState = (backgroundId: string, overrideSettings?: typeof backgroundSettings) => {
            setCurrentBackground(backgroundId);
            const background = navigationBackgroundService.getBackgroundById(backgroundId);
            setBackgroundUrl(background?.url || '');
            setBackgroundSettings({
                offsetY: background?.offsetY || '0px',
                offsetX: background?.offsetX || '0px',
                scale: background?.scale || 1,
                opacity: background?.opacity ?? 1,
                ...overrideSettings
            });
        };
        updateBackgroundState(navigationBackgroundService.getCurrentBackground());

        const handleBackgroundChange = (event: CustomEvent<{ backgroundId: string }>) => {
            updateBackgroundState(event.detail.backgroundId);
        };
        const handleBackgroundPreview = (event: CustomEvent<{ id: string; settings: typeof backgroundSettings }>) => {
            const background = navigationBackgroundService.getBackgroundById(event.detail.id);
            setCurrentBackground(event.detail.id);
            setBackgroundUrl(background?.url || '');
            setBackgroundSettings(event.detail.settings);
        };
        const handleModeChange = (event: CustomEvent<{ enabled: boolean }>) => {
            setIsNewNavigation(event.detail.enabled);
            if (event.detail.enabled) setShowDebugger(false);
        };

        window.addEventListener(NAVIGATION_BACKGROUND_CHANGE_EVENT, handleBackgroundChange as EventListener);
        window.addEventListener(NAVIGATION_BACKGROUND_PREVIEW_EVENT, handleBackgroundPreview as EventListener);
        window.addEventListener(NAVIGATION_BACKGROUND_MODE_CHANGE_EVENT, handleModeChange as EventListener);

        // Debug functions with namespace to avoid global pollution
        if (!(window as any).LumosTime) {
            (window as any).LumosTime = {};
        }
        if (!(window as any).LumosTime.debug) {
            (window as any).LumosTime.debug = {};
        }
        (window as any).LumosTime.debug.enableNavDeco = () => setShowDebugger(true);
        (window as any).LumosTime.debug.disableNavDeco = () => setShowDebugger(false);

        return () => {
            window.removeEventListener('navigationDecorationChange', handleDecorationChange as EventListener);
            window.removeEventListener('navigationDecorationPreview', handlePreview as EventListener);
            window.removeEventListener(NAVIGATION_BACKGROUND_CHANGE_EVENT, handleBackgroundChange as EventListener);
            window.removeEventListener(NAVIGATION_BACKGROUND_PREVIEW_EVENT, handleBackgroundPreview as EventListener);
            window.removeEventListener(NAVIGATION_BACKGROUND_MODE_CHANGE_EVENT, handleModeChange as EventListener);
            if ((window as any).LumosTime?.debug) {
                delete (window as any).LumosTime.debug.enableNavDeco;
                delete (window as any).LumosTime.debug.disableNavDeco;
            }
        };
    }, []);

    const handleCloseDebugger = () => {
        setShowDebugger(false);
    };

    if (!isVisible) return null;

    const bgColor = (currentView === AppView.TIMELINE || isIndexView(currentView))
        ? 'bg-[#faf9f6]/80 backdrop-blur-md'
        : 'bg-white/80 backdrop-blur-md';

    // Calculate dynamic styles
    const navStyle: React.CSSProperties = {};
    if (!isNewNavigation && currentDecoration !== 'default' && decorationUrl) {
        // 使用双引号包裹 url 防止 data: URL 包含导致 CSS 解析失败的特殊字符
        navStyle.backgroundImage = `url("${decorationUrl}")`;
        navStyle.backgroundRepeat = 'repeat-x';
        navStyle.backgroundPosition = `${settings.offsetX} ${settings.offsetY}`;
        navStyle.backgroundSize = `auto ${settings.scale * 80}px`; // Base height 80px * scale
        navStyle.opacity = settings.opacity;
    }

    return (
        <>
            <div className="fixed bottom-0 left-0 w-full z-30">
                {/* 装饰层 - 仅在非默认时显示 */}
                {!isNewNavigation && currentDecoration !== 'default' && decorationUrl && (
                    <div
                        className="absolute bottom-0 left-0 w-full h-40 md:h-48 pointer-events-none z-10"
                        style={navStyle}
                    >
                        {/* 对于系统内置预设图片，如果在极端情况下加载失败，我们尝试把它降级到 webp，但不隐藏 DIV */}
                        {decorationUrl.includes('/dchh/') && (
                            <img
                                src={decorationUrl}
                                alt=""
                                style={{ display: 'none' }}
                                onError={() => {
                                    if (decorationUrl.endsWith('.png')) {
                                        setDecorationUrl(getNavigationDecorationFallbackUrl(decorationUrl));
                                    }
                                }}
                            />
                        )}
                    </div>
                )}

                {/* 导航栏 */}
                <nav className={`relative h-12 md:h-16 box-content border-t border-stone-100 flex justify-around items-center pb-[env(safe-area-inset-bottom)] ${bgColor}`}>
                    {isNewNavigation && backgroundUrl && (
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 overflow-hidden"
                            style={{
                                backgroundImage: `url("${backgroundUrl}")`,
                                backgroundRepeat: 'repeat-x',
                                backgroundPosition: `${backgroundSettings.offsetX} ${backgroundSettings.offsetY}`,
                                backgroundSize: `auto ${backgroundSettings.scale * 100}%`,
                                opacity: backgroundSettings.opacity
                            }}
                        />
                    )}
                    {visibleNavItems.map((item) => {
                        const isActive = item.view === AppView.TAGS
                            ? isIndexView(currentView)
                            : currentView === item.view;
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
                                className={`relative z-10 flex-1 h-full flex items-center justify-center cursor-pointer transition-all duration-200 ${isActive ? 'text-stone-900' : 'text-stone-400'}`}
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
