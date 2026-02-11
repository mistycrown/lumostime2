/**
 * @file SponsorshipView.tsx
 * @input onBack (callback), onToast (callback), categories (Category[])
 * @output Navigation (onBack), Toast Messages (onToast), Theme Changes (localStorage, service calls)
 * @pos View
 * @description 投喂功能页面 - 包含兑换码验证、专属徽章、应用图标、背景图片、导航栏样式等功能
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Fish, Check, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { ToastType } from '../components/Toast';
import { RedemptionService } from '../services/redemptionService';
import { IconPreview } from '../components/IconPreview';
import { BackgroundSelector } from '../components/BackgroundSelector';
import { NavigationDecorationSelector } from '../components/NavigationDecorationSelector';
import { ColorSchemeSelector } from '../components/ColorSchemeSelector';
import { ICON_OPTIONS } from '../services/iconService';
import { Category } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { InputModal } from '../components/InputModal';
import { PresetEditModal } from '../components/PresetEditModal';
import { useCustomPresets, ThemePreset, getValidationErrorMessage } from '../hooks/useCustomPresets';
import { TimePalSettings } from '../components/TimePalSettings';
import { ThemePresetService } from '../services/themePresetService';
import { UiThemeButton } from '../components/UiThemeButton';

interface SponsorshipViewProps {
    onBack: () => void;
    onToast: (type: ToastType, message: string) => void;
    categories: Category[];
}

// 主题方案数据
const THEME_PRESETS: ThemePreset[] = [
    {
        id: 'default',
        name: '默认',
        description: '系统默认配置',
        icon: '⚙️',
        appIcon: 'icon_simple',
        uiTheme: 'default',
        colorScheme: 'default',
        background: 'default',
        navigation: 'default',
        timePal: 'none'
    },
    {
        id: 'purple',
        name: 'Purple',
        description: '优雅的紫色主题',
        icon: '💜',
        appIcon: 'icon_uvcd',
        uiTheme: 'purple',
        colorScheme: 'morandi-purple',
        background: 'purple',
        navigation: 'purple',
        timePal: 'girl3'
    },
    {
        id: 'catty',
        name: 'Catty',
        description: '可爱的粉色主题',
        icon: '🐱',
        appIcon: 'icon_cat',
        uiTheme: 'cat',
        colorScheme: 'morandi-pink',
        background: 'pinkblue',
        navigation: 'cat2',
        timePal: 'cat'
    },
    {
        id: 'little-prince',
        name: 'Little Prince',
        description: '梦幻的小王子主题',
        icon: '🤴',
        appIcon: 'icon_bijiaso',
        uiTheme: 'prince',
        colorScheme: 'dunhuang-feitian',
        background: 'little_prince',
        navigation: 'little_prince',
        timePal: 'prince'
    },
    {
        id: 'forest',
        name: 'Forest',
        description: '清新自然的绿色主题',
        icon: '🌿',
        appIcon: 'icon_plant',
        uiTheme: 'forest',
        colorScheme: 'bamboo-green',
        background: 'forest',
        navigation: 'plant',
        timePal: 'rabbit'
    },
    {
        id: 'water-color',
        name: 'Water Color',
        description: '宁静的青色主题',
        icon: '🌊',
        appIcon: 'icon_sea',
        uiTheme: 'water',
        colorScheme: 'morandi-cyan',
        background: 'grenn3',
        navigation: 'distant_mountain',
        timePal: 'girl'
    },
    {
        id: 'good-night',
        name: 'Good Night',
        description: '温暖的夜晚主题',
        icon: '🌙',
        appIcon: 'icon_moon',
        uiTheme: 'color',
        colorScheme: 'klein-blue',
        background: 'night',
        navigation: 'night',
        timePal: 'pigen'
    },
    {
        id: 'flower',
        name: 'Flower',
        description: '清新的莫兰迪绿',
        icon: '🌸',
        appIcon: 'icon_plant',
        uiTheme: 'plant',
        colorScheme: 'morandi-green',
        background: 'plant',
        navigation: 'kamon',
        timePal: 'flower'
    },
    {
        id: 'knit',
        name: 'Knit',
        description: '温暖的编织主题',
        icon: '🧶',
        appIcon: 'icon_knot',
        uiTheme: 'knit',
        colorScheme: 'latte-caramel',
        background: 'knit',
        navigation: 'knit',
        timePal: 'knit'
    },
    {
        id: 'paper',
        name: 'Paper',
        description: '清新的纸艺主题',
        icon: '📄',
        appIcon: 'icon_paper',
        uiTheme: 'paper',
        colorScheme: 'morandi-yellow',
        background: 'abstract',
        navigation: 'paper',
        timePal: 'butterfly'
    },
    {
        id: 'ancient',
        name: 'Ancient',
        description: '古典雅致主题',
        icon: '🏛️',
        appIcon: 'icon_Ukiyo-e',
        uiTheme: 'old',
        colorScheme: 'sky-blue',
        background: 'ancient',
        navigation: 'book',
        timePal: 'boy2'
    },
    {
        id: 'pencil',
        name: 'Pencil',
        description: '日系胶片主题',
        icon: '✏️',
        appIcon: 'icon_sketch',
        uiTheme: 'pencil',
        colorScheme: 'film-japanese',
        background: 'pencil',
        navigation: 'pencil',
        timePal: 'dog2'
    }
];

// UI 主题列表
const UI_THEMES = ['purple', 'color', 'prince', 'cat', 'forest', 'plant', 'water', 'knit', 'paper', 'pencil', 'old'];

export const SponsorshipView: React.FC<SponsorshipViewProps> = ({ onBack, onToast, categories }) => {
    const [redemptionCode, setRedemptionCode] = useState('');
    const [isRedeemed, setIsRedeemed] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [supporterId, setSupporterId] = useState<number | undefined>(undefined);
    const [selectedIcon, setSelectedIcon] = useState('default');
    const [isChangingIcon, setIsChangingIcon] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null); // 图片预览状态
    const redemptionService = new RedemptionService();
    const [showDonationModal, setShowDonationModal] = useState(false);
    const { uiIconTheme, setUiIconTheme, colorScheme, setColorScheme } = useSettings();
    
    // 根据时间段随机选择背景图片
    const [bannerImage] = useState(() => {
        const hour = new Date().getHours();
        let timeOfDay: 'morning' | 'noon' | 'evening';
        
        if (hour >= 6 && hour < 12) {
            timeOfDay = 'morning';
        } else if (hour >= 12 && hour < 18) {
            timeOfDay = 'noon';
        } else {
            timeOfDay = 'evening';
        }
        
        // 随机选择 1-3 中的一个数字
        const randomNum = Math.floor(Math.random() * 3) + 1;
        
        // 特殊处理：morning3 文件名前面有空格
        if (timeOfDay === 'morning' && randomNum === 3) {
            return `/banner/ morning3.webp`;
        }
        
        return `/banner/${timeOfDay}${randomNum}.webp`;
    });
    
    // 根据时间段生成问候语
    const [greeting] = useState(() => {
        const hour = new Date().getHours();
        
        if (hour >= 6 && hour < 12) {
            const morningGreetings = [
                { prefix: '早安，第', suffix: '位晨光伙伴' },
                { prefix: '晨光正好，第', suffix: '位早起者' },
                { prefix: '新的一天，第', suffix: '位追光人' }
            ];
            return morningGreetings[Math.floor(Math.random() * morningGreetings.length)];
        } else if (hour >= 12 && hour < 18) {
            const noonGreetings = [
                { prefix: '午安，第', suffix: '位阳光伙伴' },
                { prefix: '午后时光，第', suffix: '位同行者' },
                { prefix: '下午好，第', suffix: '位温暖支持者' }
            ];
            return noonGreetings[Math.floor(Math.random() * noonGreetings.length)];
        } else {
            const eveningGreetings = [
                { prefix: '晚安，第', suffix: '位星光伙伴' },
                { prefix: '夜幕降临，第', suffix: '位守夜人' },
                { prefix: '晚上好，第', suffix: '位温柔支持者' }
            ];
            return eveningGreetings[Math.floor(Math.random() * eveningGreetings.length)];
        }
    });
    
    // Custom presets hook
    const { 
        customPresets, 
        addCustomPreset, 
        updateCustomPreset,
        deleteCustomPreset,
        validatePresetName 
    } = useCustomPresets();
    
    // Custom preset modals state
    const [isNameModalOpen, setIsNameModalOpen] = useState(false);
    const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
    
    // Tab 页状态
    type TabType = 'preset' | 'icon' | 'colorScheme' | 'background' | 'navigation' | 'timepal';
    const [activeTab, setActiveTab] = useState<TabType>('preset');

    // 当前应用的主题方案
    const [currentPresetId, setCurrentPresetId] = useState<string>(() => {
        return localStorage.getItem('lumostime_current_preset') || 'default';
    });
    
    // Merge preset and custom presets
    const allPresets = React.useMemo(() => {
        return [...THEME_PRESETS, ...customPresets];
    }, [customPresets]);
    
    // Get editing preset
    const editingPreset = React.useMemo(() => {
        if (!editingPresetId) return null;
        return customPresets.find(p => p.id === editingPresetId) || null;
    }, [editingPresetId, customPresets]);

    // Handle save current settings as preset
    const handleSaveCurrentSettings = (name: string) => {
        const result = addCustomPreset(name);
        
        if (result.success) {
            onToast('success', `方案"${name}"已保存`);
            setIsNameModalOpen(false);
        } else {
            const errorMsg = getValidationErrorMessage(result.error || null);
            onToast('error', errorMsg || '保存失败，请重试');
        }
    };
    
    // Validation function for InputModal
    const validatePresetNameForModal = (name: string): string | null => {
        const error = validatePresetName(name);
        return error ? getValidationErrorMessage(error) : null;
    };
    
    // Handle edit preset save
    const handleEditPresetSave = (updatedPreset: ThemePreset) => {
        const result = updateCustomPreset(updatedPreset);
        
        if (result.success) {
            onToast('success', '方案已更新');
            setEditingPresetId(null);
            
            // If editing the current preset, apply the changes
            if (currentPresetId === updatedPreset.id) {
                applyThemePreset(updatedPreset);
            }
        } else {
            const errorMsg = getValidationErrorMessage(result.error || null);
            onToast('error', errorMsg || '更新失败，请重试');
        }
    };
    
    // Handle delete preset
    const handleDeletePreset = () => {
        if (!editingPresetId) return;
        
        const success = deleteCustomPreset(editingPresetId);
        
        if (success) {
            onToast('success', '方案已删除');
            setEditingPresetId(null);
            
            // If deleted preset was current, switch to default
            if (currentPresetId === editingPresetId) {
                const defaultPreset = THEME_PRESETS.find(p => p.id === 'default');
                if (defaultPreset) {
                    applyThemePreset(defaultPreset);
                }
            }
        } else {
            onToast('error', '删除失败，请重试');
        }
    };

    // 应用主题方案
    const applyThemePreset = async (preset: ThemePreset) => {
        try {
            const oldTheme = uiIconTheme;
            
            // 直接执行主题切换，不再显示确认对话框
            await executeThemePresetChange(preset, oldTheme);
            
        } catch (error) {
            console.error('[SponsorshipView] 应用主题方案失败:', error);
            onToast('error', '应用主题方案失败，请重试');
        }
    };

    // 执行主题方案切换的实际逻辑
    const executeThemePresetChange = async (preset: ThemePreset, oldTheme: string) => {
        const result = await ThemePresetService.applyThemePreset(
            preset,
            oldTheme,
            setUiIconTheme,
            setColorScheme,
            setCurrentPresetId
        );
        
        if (!result.success) {
            onToast('error', result.message);
            return;
        }
        
        if (result.needsReload) {
            onToast('success', result.message);
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            return;
        }
        
        // 根据消息类型显示不同的 toast
        const toastType = result.message.includes('Icon') ? 'info' : 'success';
        onToast(toastType, result.message);
    };

    // 处理 UI 图标主题切换，并触发图标迁移
    const handleUiIconThemeChange = async (newTheme: string) => {
        const oldTheme = uiIconTheme;
        console.log('[SponsorshipView] UI主题切换:', { from: oldTheme, to: newTheme });
        
        setUiIconTheme(newTheme);
        
        // 只在首次从 default 切换到自定义主题时生成 uiIcon
        if (oldTheme === 'default' && newTheme !== 'default') {
            try {
                const { iconMigrationService } = await import('../services/iconMigrationService');
                
                // 检查是否已经生成过 uiIcon
                if (!iconMigrationService.isUiIconGenerated()) {
                    console.log('[SponsorshipView] 首次切换到自定义主题，生成 uiIcon...');
                    
                    // 执行一次性生成
                    const result = await iconMigrationService.generateAllUiIcons();
                    
                    if (result.success) {
                        console.log('[SponsorshipView] uiIcon 生成成功:', result);
                        onToast('success', `${result.message}，正在刷新...`);
                        
                        // 刷新页面以应用新数据
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    } else {
                        console.error('[SponsorshipView] uiIcon 生成失败:', result);
                        onToast('error', result.message);
                    }
                } else {
                    console.log('[SponsorshipView] uiIcon 已存在，直接切换主题');
                    onToast('success', 'UI 主题已切换');
                }
            } catch (error) {
                console.error('[SponsorshipView] 图标迁移失败:', error);
                onToast('error', '图标迁移失败，请重试');
            }
        } else if (oldTheme !== 'default' && newTheme === 'default') {
            // 从自定义主题切换回 default，不做数据迁移
            console.log('[SponsorshipView] 从自定义主题切换回默认主题，不做数据迁移');
            onToast('success', 'UI 主题已切换');
        } else {
            // 在自定义主题之间切换，不做数据迁移
            console.log('[SponsorshipView] 在主题之间切换，不做数据迁移');
            onToast('success', 'UI 主题已切换');
        }
    };

    useEffect(() => {
        const checkVerification = async () => {
            const result = await redemptionService.isVerified();
            console.log('[SponsorshipView] 验证状态检查:', result);
            if (result.isVerified && result.userId) {
                setIsRedeemed(true);
                setSupporterId(result.userId);
                console.log('[SponsorshipView] ✓ 用户已验证，ID:', result.userId);
            } else {
                console.log('[SponsorshipView] ❌ 用户未验证');
            }
        };
        checkVerification();

        // 加载当前图标设置
        const loadCurrentIcon = async () => {
            try {
                const { iconService } = await import('../services/iconService');
                const currentIcon = iconService.getCurrentIcon();
                setSelectedIcon(currentIcon);
                console.log('[SponsorshipView] 当前图标:', currentIcon);
            } catch (error) {
                console.error('加载当前图标失败:', error);
            }
        };
        loadCurrentIcon();

        // 添加全局调试函数
        (window as any).debugIconSwitch = () => {
            console.log('========== 图标切换调试信息 ==========');
            console.log('isRedeemed:', isRedeemed);
            console.log('isChangingIcon:', isChangingIcon);
            console.log('selectedIcon:', selectedIcon);
            console.log('supporterId:', supporterId);
            console.log('redemptionCode:', redemptionCode);
            console.log('=====================================');
        };
        console.log('[SponsorshipView] 调试命令已注册: window.debugIconSwitch()');
    }, []);

    const handleRedeem = async () => {
        if (!redemptionCode.trim()) {
            onToast('error', '请输入兑换码');
            return;
        }

        setIsVerifying(true);
        try {
            const result = await redemptionService.verifyCode(redemptionCode);
            if (result.success) {
                redemptionService.saveCode(redemptionCode, result.supporterId);
                setIsRedeemed(true);
                setSupporterId(result.supporterId);
                onToast('success', '验证成功！');
            } else {
                onToast('error', result.error || '兑换码无效');
            }
        } catch (error) {
            onToast('error', '验证失败，请重试');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleClearCode = () => {
        redemptionService.clearSavedCode();
        setIsRedeemed(false);
        setRedemptionCode('');
        setSupporterId(undefined);
        onToast('success', '已重置');
    };

    const handleIconChange = async (iconId: string) => {
        console.log('[SponsorshipView] ========== 图标切换开始 ==========');
        console.log('[SponsorshipView] 点击的图标ID:', iconId);
        console.log('[SponsorshipView] isRedeemed状态:', isRedeemed);
        console.log('[SponsorshipView] isChangingIcon状态:', isChangingIcon);
        console.log('[SponsorshipView] 当前选中图标:', selectedIcon);
        
        if (!isRedeemed) {
            console.log('[SponsorshipView] ❌ 未验证投喂码，操作被阻止');
            onToast('error', '请先验证投喂码');
            return;
        }

        setIsChangingIcon(true);
        try {
            const { iconService } = await import('../services/iconService');
            console.log('[SponsorshipView] ✓ iconService已加载');
            console.log('[SponsorshipView] 开始调用setIcon:', iconId);
            
            const result = await iconService.setIcon(iconId);
            console.log('[SponsorshipView] setIcon返回结果:', result);

            if (result.success) {
                console.log('[SponsorshipView] ✓ 图标切换成功');
                setSelectedIcon(iconId);
                onToast('success', result.message);
            } else {
                console.log('[SponsorshipView] ❌ 图标切换失败:', result.message);
                onToast('error', result.message);
            }
        } catch (error: any) {
            console.error('[SponsorshipView] ❌ 切换图标异常:', error);
            onToast('error', error.message || '切换图标失败');
        } finally {
            setIsChangingIcon(false);
            console.log('[SponsorshipView] ========== 图标切换结束 ==========');
        }
    };

    const iconOptions = ICON_OPTIONS;

    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
                <button
                    onClick={onBack}
                    className="text-stone-400 hover:text-stone-600 p-1"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">投喂功能</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-6 pb-40">
                {!isRedeemed ? (
                    /* 兑换码输入界面 */
                    <div className="space-y-6 max-w-lg mx-auto mt-6">
                        {/* 说明文案 */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                            <div className="text-center space-y-2 mb-4">
                                <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
                                    <Fish size={24} />
                                </div>
                                <h3 className="font-bold text-lg text-stone-800">🎁 关于投喂解锁</h3>
                            </div>

                            <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
                                <p className="text-stone-500 text-xs">Hi，感谢你使用 Lumostime。</p>
                                <p className="text-stone-500 text-xs">想和你分享几个坚持：</p>

                                <div className="space-y-3">
                                    <div className="flex gap-3">
                                        <span className="text-base flex-shrink-0">🌟</span>
                                        <div>
                                            <p className="font-medium text-stone-700 mb-1">所有记录功能完全免费</p>
                                            <p className="text-xs text-stone-500">应用内的免费功能非常全面，基本超过了市面上 90% 的同类软件。我花了很多心思打磨功能，希望它能真正帮到你。</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <span className="text-base flex-shrink-0">🔓</span>
                                        <div>
                                            <p className="font-medium text-stone-700 mb-1">你的数据永远属于你</p>
                                            <p className="text-xs text-stone-500">数据本地优先，随时可以导出。采用数据本地优先的原则，绝不会为了留住用户而限制数据导出，更不会以此要挟你充值会员。</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <span className="text-base flex-shrink-0">✨</span>
                                        <div>
                                            <p className="font-medium text-stone-700 mb-1">没有开屏广告</p>
                                            <p className="text-xs text-stone-500">应用不会添加任何开屏广告，确保你的使用体验始终保持流畅。</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <span className="text-base flex-shrink-0">🎯</span>
                                        <div>
                                            <p className="font-medium text-stone-700 mb-1">注重每个细节</p>
                                            <p className="text-xs text-stone-500">我希望记录这件事能变得轻松一点，再轻松一点，让你更容易坚持下去。</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-stone-100 space-y-2">
                                    <p className="text-xs text-stone-500">我是一名个人开发者，从设计到开发，从测试到维护，从美工到宣发，所有的工作都由我一个人独立完成。全都是为爱发电！</p>
                                    <p className="text-xs text-stone-500">如果在使用过程中遇到任何问题，还请多多反馈、多多包涵。</p>
                                    <p className="text-xs text-stone-500">请放心使用，第一我不会跑路，第二就算我跑路了也不会影响你使用任何功能。</p>
                                </div>

                                <div className="pt-3 border-t border-stone-100 space-y-2">
                                    <p className="text-xs text-stone-600 font-medium">如果你喜欢这个应用，欢迎投喂本mo一个小鱼干 🐟</p>
                                    <p className="text-xs text-stone-500">投喂后，你将收到来自本mo的小礼物 🎁</p>
                                    <p className="text-xs text-stone-500">可以用它解锁<span className="font-medium text-stone-700">自定义主题设置</span>，包括：</p>
                                    <ul className="text-xs text-stone-500 space-y-1 pl-4">
                                        <li>• 更换背景图片</li>
                                        <li>• 更换导航栏样式</li>
                                        <li>• 更换时间小友</li>
                                        <li>• 更换应用图标</li>
                                        <li>• 后续更多持续更新的美化功能</li>
                                    </ul>
                                    <p className="text-xs text-stone-500 pt-2">让你的 Lumostime 变得独一无二 🌈</p>
                                </div>
                            </div>
                        </div>

                        {/* 投喂方式说明 */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                            <div className="text-center mb-4">
                                <h3 className="font-bold text-base text-stone-800">💝 投喂方式</h3>
                            </div>

                            <div className="space-y-4">
                                {/* 两个通道并排显示 */}
                                <div className="grid grid-cols-2 gap-3">
                                    {/* 社恐通道 */}
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-lg">🤫</span>
                                            <h4 className="font-bold text-stone-800 text-sm">社恐通道</h4>
                                        </div>
                                        <ol className="text-xs text-stone-600 space-y-1.5 pl-4 list-decimal">
                                            <li>通过付款码支付 9.9 元</li>
                                            <li>备注个人邮箱</li>
                                            <li>我人工核实后会发送兑换码</li>
                                            <li>一般每天查看，如果两个工作日没有回复，请通过微信联系我</li>
                                        </ol>
                                        <div className="mt-3 flex justify-center">
                                            <img
                                                src="https://lumostime-1315858561.cos.ap-chongqing.myqcloud.com/%E4%BB%98%E6%AC%BE%E7%A0%81.jpg"
                                                alt="付款码"
                                                className="w-32 h-32 object-contain rounded-lg border border-blue-200 cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => setPreviewImage("https://lumostime-1315858561.cos.ap-chongqing.myqcloud.com/%E4%BB%98%E6%AC%BE%E7%A0%81.jpg")}
                                            />
                                        </div>
                                    </div>

                                    {/* 社牛通道 */}
                                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-lg">🎉</span>
                                            <h4 className="font-bold text-stone-800 text-sm">社牛通道</h4>
                                        </div>
                                        <ol className="text-xs text-stone-600 space-y-1.5 pl-4 list-decimal">
                                            <li>直接加我微信</li>
                                            <li>备注「lumostime」</li>
                                            <li>转账 9.9 元后我会发送兑换码</li>
                                            <li>也欢迎反馈bug，许愿新功能，没事唠嗑也可以</li>
                                        </ol>
                                        <div className="mt-3 flex justify-center">
                                            <img
                                                src="https://lumostime-1315858561.cos.ap-chongqing.myqcloud.com/%E5%BE%AE%E4%BF%A1%E7%A0%81.jpg"
                                                alt="微信码"
                                                className="w-32 h-32 object-contain rounded-lg border border-orange-200 cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => setPreviewImage("https://lumostime-1315858561.cos.ap-chongqing.myqcloud.com/%E5%BE%AE%E4%BF%A1%E7%A0%81.jpg")}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 温馨提示 */}
                                <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                                    <p className="text-xs text-stone-600 leading-relaxed space-y-2">
                                        <span className="block">我希望更多人使用Lumostime，远远大于我想利用软件赚钱的想法，如果喜欢，请推荐给身边的人~</span>
                                        <span className="block">9.9 元不仅是解锁几套精心设计的主题，更是对一位独立开发者最大的鼓励。</span>
                                        <span className="block font-medium text-stone-700">因为是人工操作，所以可能会有延迟，请大家耐心等待~</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 兑换码输入 */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                            <div className="text-center space-y-2">
                                <h3 className="font-bold text-base text-stone-800">请输入兑换码</h3>
                                <p className="text-xs text-stone-500">解锁专属投喂功能</p>
                            </div>

                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={redemptionCode}
                                    onChange={(e) => setRedemptionCode(e.target.value)}
                                    placeholder="输入兑换码..."
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all text-center tracking-widest font-mono"
                                    disabled={isVerifying}
                                />
                                <button
                                    onClick={handleRedeem}
                                    disabled={isVerifying}
                                    className={`w-full font-bold py-3 rounded-xl transition-all shadow-lg shadow-stone-200 ${isVerifying
                                        ? 'bg-stone-400 text-white cursor-not-allowed'
                                        : 'bg-stone-800 text-white hover:bg-stone-900 active:scale-[0.98]'
                                        }`}
                                >
                                    {isVerifying ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            验证中...
                                        </span>
                                    ) : (
                                        '解锁功能'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* 已解锁功能界面 */
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* 专属徽章 + Tab 导航 - 统一背景 */}
                        <div className="relative rounded-2xl overflow-hidden mb-6">
                            {/* 背景图片 - 覆盖整个区域 */}
                            <div 
                                className="absolute inset-0 bg-cover bg-center opacity-20"
                                style={{ backgroundImage: `url(${bannerImage})` }}
                            />
                            
                            {/* 内容层 */}
                            <div className="relative z-10">
                                {/* 专属徽章 */}
                                <div className="text-center py-5">
                                    {/* 柔和的渐变光晕背景 - 无明显边缘 */}
                                    <div className="inline-block relative">
                                        {/* 多层弥散光晕 - 创造自然过渡 */}
                                        <div className="absolute inset-0 bg-gradient-radial from-white/70 via-white/40 to-transparent blur-3xl scale-150" />
                                        <div className="absolute inset-0 bg-gradient-radial from-white/50 via-white/20 to-transparent blur-2xl scale-125" />
                                        
                                        {/* 文字内容 - 居中对齐 */}
                                        <div className="relative flex flex-col items-center gap-2 py-3 px-8">
                                            <span className="text-sm text-stone-800 font-serif font-medium drop-shadow-md">{greeting.prefix}</span>
                                            <span className="text-5xl font-bold font-serif drop-shadow-lg leading-none" style={{ color: 'var(--text-deep)' }}>#{supporterId || '001'}</span>
                                            <span className="text-sm text-stone-800 font-serif font-medium drop-shadow-md">{greeting.suffix}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tab 导航 - 简洁风格 */}
                                <div className="flex gap-6 border-b border-stone-200 overflow-x-auto scrollbar-hide px-5">
                            {(['preset', 'icon', 'colorScheme', 'background', 'navigation', 'timepal'] as TabType[]).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`pb-3 text-sm font-serif tracking-wide whitespace-nowrap transition-colors ${
                                        activeTab === tab
                                            ? 'text-stone-900 border-b-2 border-stone-900 font-bold'
                                            : 'text-stone-400 hover:text-stone-600'
                                    }`}
                                >
                                    {{ 
                                        'preset': '方案',
                                        'icon': 'Icon', 
                                        'colorScheme': '配色',
                                        'background': '背景', 
                                        'navigation': '导航', 
                                        'timepal': '小友' 
                                    }[tab]}
                                </button>
                            ))}
                        </div>
                            </div>
                        </div>

                        {/* Tab 内容 - 直接渲染在背景上 */}
                        <div className="animate-in fade-in duration-300 pb-20">
                            {activeTab === 'preset' && (
                                /* 方案预设 */
                                <div className="space-y-3">
                                    {allPresets.map((preset) => {
                                        const isSelected = currentPresetId === preset.id;
                                        const isCustom = preset.isCustom === true;
                                        
                                        return (
                                            <div key={preset.id} className="relative">
                                                <button
                                                    onClick={() => applyThemePreset(preset)}
                                                    className={`w-full rounded-2xl transition-all overflow-hidden text-left ${
                                                        isSelected
                                                            ? 'border-2 border-stone-300 ring-1 ring-stone-200 bg-white shadow-sm'
                                                            : 'border border-stone-100 hover:border-stone-200 bg-white hover:bg-stone-50'
                                                    }`}
                                                >
                                                    <div className="p-3 flex items-center gap-3">
                                                        {/* 左侧：方案名称（缩窄宽度，自动换行） */}
                                                        <div className="w-16 shrink-0 flex items-center justify-center">
                                                            <h5 className="text-sm font-bold text-stone-800 text-center leading-tight break-words">
                                                                {preset.name}
                                                            </h5>
                                                        </div>
                                                        
                                                        {/* 右侧：配置预览框 - 一行显示所有预览 */}
                                                        <div className="flex-1 bg-stone-50 rounded-lg p-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                                                            {/* UI主题图标预览 - 只显示一个图标 */}
                                                            {preset.uiTheme === 'default' ? (
                                                                /* 默认主题显示 emoji */
                                                                <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-white border border-stone-200 flex items-center justify-center">
                                                                    <span className="text-lg">➕</span>
                                                                </div>
                                                            ) : (
                                                                /* 自定义主题显示图片 - 使用 01.webp */
                                                                <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-white border border-stone-200 flex items-center justify-center">
                                                                    <img 
                                                                        src={`/uiicon/${preset.uiTheme}/01.webp`}
                                                                        alt="UI"
                                                                        className="w-6 h-6 object-contain"
                                                                        onError={(e) => {
                                                                            e.currentTarget.style.display = 'none';
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                            
                                                            {/* 背景预览 */}
                                                            {preset.background === 'default' ? (
                                                                <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200 border border-stone-200 flex items-center justify-center">
                                                                    <span className="text-[8px] text-stone-400">默认</span>
                                                                </div>
                                                            ) : (
                                                                <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-white border border-stone-200">
                                                                    <img 
                                                                        src={`/background/${preset.background}.webp`}
                                                                        alt="背景"
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => {
                                                                            e.currentTarget.style.display = 'none';
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                            
                                                            {/* 导航装饰预览 */}
                                                            {preset.navigation === 'default' ? (
                                                                <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200 border border-stone-200 flex items-center justify-center">
                                                                    <span className="text-[8px] text-stone-400">默认</span>
                                                                </div>
                                                            ) : (
                                                                <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-white border border-stone-200">
                                                                    <img 
                                                                        src={`/dchh/${preset.navigation}.webp`}
                                                                        alt="导航"
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => {
                                                                            e.currentTarget.style.display = 'none';
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                            
                                                            {/* 时间小友预览 */}
                                                            {preset.timePal === 'none' || preset.timePal === 'default' ? (
                                                                <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200 border border-stone-200 flex items-center justify-center">
                                                                    <span className="text-[8px] text-stone-400">关闭</span>
                                                                </div>
                                                            ) : (
                                                                <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-white border border-stone-200">
                                                                    <img 
                                                                        src={`/time_pal_origin/${preset.timePal}/1.webp`}
                                                                        alt="时间小友"
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => {
                                                                            // 尝试 PNG 格式
                                                                            const pngSrc = `/time_pal_origin/${preset.timePal}/1.png`;
                                                                            if (e.currentTarget.src.indexOf('.png') === -1) {
                                                                                e.currentTarget.src = pngSrc;
                                                                            } else {
                                                                                e.currentTarget.style.display = 'none';
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                            
                                                            {/* 配色方案色块 */}
                                                            <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden border border-stone-200" 
                                                                 style={{
                                                                     background: preset.colorScheme === 'default' ? '#f5f5f4' :
                                                                                preset.colorScheme === 'morandi-purple' ? 'linear-gradient(135deg, #b8a5c8 0%, #9b8aad 100%)' :
                                                                                preset.colorScheme === 'morandi-pink' ? 'linear-gradient(135deg, #e8b4b8 0%, #d4a5a5 100%)' :
                                                                                preset.colorScheme === 'dunhuang-feitian' ? 'linear-gradient(135deg, #f4d5a6 0%, #e8c4a0 100%)' :
                                                                                preset.colorScheme === 'bamboo-green' ? 'linear-gradient(135deg, #a8c5a8 0%, #8fb58f 100%)' :
                                                                                preset.colorScheme === 'morandi-cyan' ? 'linear-gradient(135deg, #a8c8d8 0%, #8fb5c5 100%)' :
                                                                                preset.colorScheme === 'latte-caramel' ? 'linear-gradient(135deg, #d4b5a0 0%, #c4a590 100%)' :
                                                                                preset.colorScheme === 'morandi-green' ? 'linear-gradient(135deg, #b5c8b5 0%, #a0b5a0 100%)' :
                                                                                preset.colorScheme === 'klein-blue' ? 'linear-gradient(135deg, #5a8fc8 0%, #4a7fb8 100%)' :
                                                                                preset.colorScheme === 'morandi-yellow' ? 'linear-gradient(135deg, #e8d4a8 0%, #d8c498 100%)' :
                                                                                preset.colorScheme === 'sky-blue' ? 'linear-gradient(135deg, #7ab8d8 0%, #6aa8c8 100%)' :
                                                                                preset.colorScheme === 'film-japanese' ? 'linear-gradient(135deg, #8fbec8 0%, #7faeb8 100%)' :
                                                                                '#f5f5f4'
                                                                 }}
                                                            />
                                                        </div>
                                                        
                                                        {/* 选中标记 */}
                                                        {isSelected && (
                                                            <div className="shrink-0 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center">
                                                                <Check size={12} className="text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                                
                                                {/* 编辑按钮 - 仅自定义方案显示 */}
                                                {isCustom && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingPresetId(preset.id);
                                                        }}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-sm"
                                                        aria-label={`编辑 ${preset.name}`}
                                                    >
                                                        编辑
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* 保存当前设置按钮 */}
                                    <button
                                        onClick={() => setIsNameModalOpen(true)}
                                        className="w-full rounded-2xl border border-dashed border-stone-200 bg-white hover:bg-stone-50 hover:border-stone-300 transition-all p-4 flex items-center justify-center gap-2 text-stone-600 font-medium"
                                    >
                                        <span className="text-lg">+</span>
                                        <span>保存当前设置为方案</span>
                                    </button>

                                    {/* 提示信息 */}
                                    <div className="mt-4 p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                                        <p className="text-xs text-blue-800 text-center">
                                            💡 首次应用需要打开导航栏调试，调整导航栏的位置
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'icon' && (
                                /* Icon - 包含应用图标和UI主题 */
                                <div className="space-y-8">
                                    {/* 应用图标部分 */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-stone-600">应用图标</h4>
                                            {/* 手动刷新按钮 - 仅Android显示 */}
                                            {Capacitor.isNativePlatform() && (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const { iconService } = await import('../services/iconService');
                                                            const result = await iconService.refreshLauncher();
                                                            onToast(result.success ? 'success' : 'info', result.message);
                                                        } catch (error: any) {
                                                            onToast('error', '刷新失败: ' + error.message);
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                >
                                                    刷新启动器
                                                </button>
                                            )}
                                        </div>

                                        {/* 图标网格 */}
                                        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(48px, 1fr))' }}>
                                            {iconOptions.map((option) => (
                                                <button
                                                    key={option.id}
                                                    onClick={(e) => {
                                                        console.log('[Button] 按钮被点击:', option.id);
                                                        console.log('[Button] 事件对象:', e);
                                                        console.log('[Button] disabled状态:', isChangingIcon || !isRedeemed);
                                                        handleIconChange(option.id);
                                                    }}
                                                    disabled={isChangingIcon || !isRedeemed}
                                                    className={`relative aspect-square rounded-xl transition-all hover:bg-white/50 ${!isRedeemed ? 'opacity-50 cursor-not-allowed' : ''
                                                        } ${isChangingIcon ? 'opacity-70' : ''
                                                        }`}
                                                >
                                                    {isChangingIcon && selectedIcon === option.id && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                                                            <div className="w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                                                        </div>
                                                    )}

                                                    <IconPreview
                                                        iconId={option.id}
                                                        iconName={option.name}
                                                        size="medium"
                                                    />

                                                    {selectedIcon === option.id && (
                                                        <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg">
                                                            <Check size={12} className="text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* UI主题部分 */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-medium text-stone-600">UI 主题</h4>
                                        
                                        {/* 主题预览网格 */}
                                        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))' }}>
                                            {/* 默认选项 */}
                                            <button
                                                onClick={() => handleUiIconThemeChange('default')}
                                                className={`relative rounded-lg border-2 transition-all overflow-hidden ${
                                                    uiIconTheme === 'default'
                                                        ? 'border-stone-400 ring-2 ring-stone-200'
                                                        : 'border-stone-200 hover:border-stone-300'
                                                }`}
                                                style={{ aspectRatio: '4/5' }}
                                            >
                                                <div className="w-full h-full flex items-center justify-center bg-white">
                                                    <span className="text-xs text-stone-400">默认</span>
                                                </div>
                                                {uiIconTheme === 'default' && (
                                                    <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg">
                                                        <Check size={12} className="text-white" />
                                                    </div>
                                                )}
                                            </button>

                                            {/* 自定义主题 - 使用 UiThemeButton 组件 */}
                                            {UI_THEMES.map(theme => (
                                                <UiThemeButton
                                                    key={theme}
                                                    theme={theme}
                                                    currentTheme={uiIconTheme}
                                                    onThemeChange={handleUiIconThemeChange}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'colorScheme' && (
                                /* 配色方案 */
                                <ColorSchemeSelector 
                                    currentScheme={colorScheme as any}
                                    onSchemeChange={(scheme) => setColorScheme(scheme)}
                                />
                            )}

                            {activeTab === 'background' && (
                                /* 背景图片切换 */
                                <BackgroundSelector onToast={onToast} />
                            )}

                            {activeTab === 'navigation' && (
                                /* 导航栏样式 */
                                <NavigationDecorationSelector onToast={onToast} />
                            )}

                            {activeTab === 'timepal' && (
                                /* 时光小友设置 */
                                <TimePalSettings categories={categories} />
                            )}
                        </div>

                        {/* 测试用重置按钮 */}
                        <div className="flex justify-center pt-4">
                            <button
                                onClick={handleClearCode}
                                className="text-xs text-stone-300 hover:text-stone-500 px-4 py-2"
                            >
                                清除兑换码状态
                            </button>
                        </div>

                        {/* Feed Me Card - Only for verified users */}
                        <div className="pt-4 pb-4 space-y-4">
                            <div
                                className="bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                                onClick={() => setShowDonationModal(true)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                                        <Fish size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-stone-800">继续投喂我</h3>
                                        <p className="text-xs text-stone-500">支持本mo继续开发更多功能~</p>
                                    </div>
                                    <div className="bg-amber-100 px-3 py-1 rounded-full text-[10px] font-bold text-amber-600">
                                        如果是真爱
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Donation Modal */}
            {showDonationModal && (
                <div
                    className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
                    onClick={() => setShowDonationModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                                        <Fish size={24} className="text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-stone-800">感谢支持</h3>
                                        <p className="text-sm text-stone-500">您的支持是我最大的动力</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDonationModal(false)}
                                    className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* QR Code Image */}
                            <div className="flex justify-center">
                                <div className="bg-stone-50 p-4 rounded-2xl">
                                    <img
                                        src="/sponsorship_qr.jpg"
                                        alt="投喂码"
                                        className="w-64 h-64 object-contain rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Footer Message */}
                            <div className="text-center space-y-2">
                                <p className="text-sm text-stone-600">扫码支持开发者</p>
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={() => setShowDonationModal(false)}
                                className="w-full py-3 px-4 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* 输入方案名称模态框 */}
            <InputModal
                isOpen={isNameModalOpen}
                onClose={() => setIsNameModalOpen(false)}
                onConfirm={handleSaveCurrentSettings}
                title="保存为自定义方案"
                placeholder="输入方案名称..."
                maxLength={50}
                validateFn={validatePresetNameForModal}
            />
            
            {/* 编辑方案模态框 */}
            <PresetEditModal
                isOpen={!!editingPresetId}
                preset={editingPreset}
                onClose={() => setEditingPresetId(null)}
                onSave={handleEditPresetSave}
                onDelete={handleDeletePreset}
                onToast={onToast}
            />

            {/* 图片预览模态框 */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setPreviewImage(null)}
                >
                    <img
                        src={previewImage}
                        alt="预览"
                        className="max-w-2xl w-full h-auto rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};
