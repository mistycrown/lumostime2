/**
 * @file SponsorshipView.tsx
 * @description 投喂功能页面 - 包含兑换码验证、专属徽章、应用图标、背景图片、导航栏样式等功能
 */
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Fish, Check, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { ToastType } from '../components/Toast';
import { RedemptionService } from '../services/redemptionService';
import { IconPreview } from '../components/IconPreview';
import { BackgroundSelector } from '../components/BackgroundSelector';
import { NavigationDecorationSelector } from '../components/NavigationDecorationSelector';
import { ICON_OPTIONS } from '../services/iconService';
import { Category } from '../types';
import { TIMEPAL_OPTIONS, TimePalType, getTimePalEmoji } from '../constants/timePalConfig';

interface SponsorshipViewProps {
    onBack: () => void;
    onToast: (type: ToastType, message: string) => void;
    categories: Category[];
}

// 时光小友设置卡片组件
const TimePalSettingsCard: React.FC<{ categories: Category[] }> = ({ categories }) => {
    // 当前选择的小动物类型
    const [selectedType, setSelectedType] = useState<TimePalType>(() => {
        const saved = localStorage.getItem('lumostime_timepal_type');
        return (saved as TimePalType) || 'cat';
    });

    // 是否启用标签筛选
    const [isFilterEnabled, setIsFilterEnabled] = useState<boolean>(() => {
        const saved = localStorage.getItem('lumostime_timepal_filter_enabled');
        return saved === 'true';
    });

    // 选中的标签 ID 列表
    const [filterActivityIds, setFilterActivityIds] = useState<string[]>(() => {
        const saved = localStorage.getItem('lumostime_timepal_filter_activities');
        return saved ? JSON.parse(saved) : [];
    });

    // 当前选择的分类 ID（用于展开活动列表）
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

    // 自定义名言功能
    const [customQuotesEnabled, setCustomQuotesEnabled] = useState<boolean>(() => {
        const saved = localStorage.getItem('lumostime_timepal_custom_quotes_enabled');
        return saved === 'true';
    });

    const [customQuotes, setCustomQuotes] = useState<string>(() => {
        const saved = localStorage.getItem('lumostime_timepal_custom_quotes');
        if (saved) {
            try {
                const quotes = JSON.parse(saved) as string[];
                return quotes.join('\n');
            } catch (e) {
                return '';
            }
        }
        return '';
    });

    // 保存小动物类型
    const handleSelectType = (type: TimePalType) => {
        setSelectedType(type);
        localStorage.setItem('lumostime_timepal_type', type);
        window.dispatchEvent(new Event('timepal-type-changed'));
    };

    // 保存筛选设置
    useEffect(() => {
        localStorage.setItem('lumostime_timepal_filter_enabled', isFilterEnabled.toString());
    }, [isFilterEnabled]);

    useEffect(() => {
        localStorage.setItem('lumostime_timepal_filter_activities', JSON.stringify(filterActivityIds));
    }, [filterActivityIds]);

    // 保存自定义名言设置
    useEffect(() => {
        localStorage.setItem('lumostime_timepal_custom_quotes_enabled', customQuotesEnabled.toString());
    }, [customQuotesEnabled]);

    const handleCustomQuotesChange = (value: string) => {
        setCustomQuotes(value);
        // 将文本按行分割，过滤空行
        const quotesArray = value.split('\n').map(q => q.trim()).filter(q => q.length > 0);
        localStorage.setItem('lumostime_timepal_custom_quotes', JSON.stringify(quotesArray));
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
            {/* 标题 */}
            <div className="flex items-center gap-3 text-stone-600">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 text-lg">🐾</span>
                </div>
                <h3 className="text-lg font-bold text-stone-800">时光小友</h3>
            </div>

            {/* 选择小动物 - 自适应网格布局 */}
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))' }}>
                {TIMEPAL_OPTIONS.map(option => {
                    const isSelected = selectedType === option.type;
                    return (
                        <button
                            key={option.type}
                            onClick={() => handleSelectType(option.type)}
                            className={`relative rounded-lg border-2 transition-all overflow-hidden ${
                                isSelected
                                    ? 'border-stone-400 ring-2 ring-stone-200'
                                    : 'border-stone-200 hover:border-stone-300'
                            }`}
                            style={{ aspectRatio: '4/5' }}
                        >
                            {/* 预览图 */}
                            <div className="w-full h-full flex items-center justify-center p-1">
                                <img
                                    src={option.preview}
                                    alt={option.name}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const parent = e.currentTarget.parentElement;
                                        if (parent) {
                                            parent.innerHTML = `<span class="text-3xl">${getTimePalEmoji(option.type)}</span>`;
                                        }
                                    }}
                                />
                            </div>

                            {/* 选中标记 - 黑色对勾 */}
                            {isSelected && (
                                <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg">
                                    <Check size={12} className="text-white" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 统计时长设置 */}
            <div className="pt-4 border-t border-stone-100">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                        限定标签（Activity）
                        <span className="text-stone-300 ml-1">（可选）</span>
                    </label>
                    {/* Toggle 开关 */}
                    <button
                        type="button"
                        onClick={() => {
                            setIsFilterEnabled(!isFilterEnabled);
                            if (isFilterEnabled) {
                                // 关闭时清空选择
                                setFilterActivityIds([]);
                                setSelectedCategoryId('');
                            }
                        }}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${isFilterEnabled
                            ? 'bg-stone-900 text-white'
                            : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                            }`}
                    >
                        {isFilterEnabled ? '已开启' : '关闭'}
                    </button>
                </div>
                <p className="text-xs text-stone-500 mb-3">
                    仅统计选中标签的时间记录
                </p>

                {isFilterEnabled && (
                    <>
                        {/* Category Grid */}
                        <div className="grid grid-cols-4 gap-2 mb-3">
                            {categories.map(cat => {
                                const isSelected = selectedCategoryId === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setSelectedCategoryId(isSelected ? '' : cat.id)}
                                        className={`
                                            px-2 py-2 rounded-lg text-[10px] font-medium text-center border transition-colors flex items-center justify-center gap-1.5 truncate
                                            ${isSelected
                                                ? 'bg-stone-900 text-white border-stone-900'
                                                : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'}
                                        `}
                                    >
                                        <span>{cat.icon}</span>
                                        <span className="truncate">{cat.name}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Activity Grid */}
                        {selectedCategoryId && (
                            <div className="grid grid-cols-4 gap-3 pt-2 animate-in slide-in-from-top-2">
                                {categories
                                    .find(c => c.id === selectedCategoryId)
                                    ?.activities.map(act => {
                                        const isActive = filterActivityIds.includes(act.id);
                                        return (
                                            <button
                                                key={act.id}
                                                type="button"
                                                onClick={() => {
                                                    if (isActive) {
                                                        setFilterActivityIds(filterActivityIds.filter(id => id !== act.id));
                                                    } else {
                                                        setFilterActivityIds([...filterActivityIds, act.id]);
                                                    }
                                                }}
                                                className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 active:scale-95 hover:bg-stone-50"
                                            >
                                                <div className={`
                                                    w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all
                                                    ${isActive ? 'ring-1 ring-stone-300 ring-offset-1 scale-110' : ''}
                                                    ${act.color}
                                                `}>
                                                    {act.icon}
                                                </div>
                                                <span className={`text-xs text-center font-medium leading-tight ${isActive ? 'text-stone-900 font-bold' : 'text-stone-400'}`}>
                                                    {act.name}
                                                </span>
                                            </button>
                                        );
                                    })}
                            </div>
                        )}

                        {/* Clear 按钮 */}
                        {filterActivityIds.length > 0 && (
                            <div className="flex justify-end mt-2">
                                <button
                                    type="button"
                                    onClick={() => setFilterActivityIds([])}
                                    className="text-xs font-medium text-stone-400 hover:text-red-400 transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        )}

                        {/* 已选择标签提示 */}
                        {filterActivityIds.length > 0 && (
                            <div className="mt-3 text-xs text-stone-500 animate-in fade-in">
                                <span className="font-medium">已选择：</span>
                                {filterActivityIds.map((actId, index) => {
                                    const activity = categories
                                        .flatMap(c => c.activities)
                                        .find(a => a.id === actId);
                                    return activity ? (
                                        <span key={actId}>
                                            {activity.icon} {activity.name}{index < filterActivityIds.length - 1 ? '、' : ''}
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* 自定义名言设置 */}
            <div className="pt-4 border-t border-stone-100">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                        自定义名言
                        <span className="text-stone-300 ml-1">（可选）</span>
                    </label>
                    {/* Toggle 开关 */}
                    <button
                        type="button"
                        onClick={() => {
                            setCustomQuotesEnabled(!customQuotesEnabled);
                            if (customQuotesEnabled) {
                                // 关闭时清空自定义名言
                                setCustomQuotes('');
                                localStorage.removeItem('lumostime_timepal_custom_quotes');
                            }
                        }}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${customQuotesEnabled
                            ? 'bg-stone-900 text-white'
                            : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                            }`}
                    >
                        {customQuotesEnabled ? '已开启' : '关闭'}
                    </button>
                </div>
                <p className="text-xs text-stone-500 mb-3">
                    开启后使用自定义名言，每行一句
                </p>

                {customQuotesEnabled && (
                    <div className="animate-in slide-in-from-top-2">
                        <textarea
                            value={customQuotes}
                            onChange={(e) => handleCustomQuotesChange(e.target.value)}
                            placeholder="输入你的名言，每行一句&#10;例如：&#10;种一棵树最好的时间是十年前，其次是现在&#10;万物皆有裂痕，那是光照进来的地方"
                            className="w-full h-32 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all resize-none"
                        />
                        <div className="mt-2 text-xs text-stone-400">
                            已输入 {customQuotes.split('\n').filter(q => q.trim().length > 0).length} 条名言
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const SponsorshipView: React.FC<SponsorshipViewProps> = ({ onBack, onToast, categories }) => {
    const [redemptionCode, setRedemptionCode] = useState('');
    const [isRedeemed, setIsRedeemed] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [supporterId, setSupporterId] = useState<number | undefined>(undefined);
    const [selectedIcon, setSelectedIcon] = useState('default');
    const [isChangingIcon, setIsChangingIcon] = useState(false);
    const redemptionService = new RedemptionService();
    const [showDonationModal, setShowDonationModal] = useState(false);

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
                                            <p className="text-xs text-stone-500">应用内的功能已经非常全面，甚至超过了市面上 99% 的同类软件。我花了很多心思打磨功能，希望它能真正帮到你。</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <span className="text-base flex-shrink-0">🔓</span>
                                        <div>
                                            <p className="font-medium text-stone-700 mb-1">你的数据永远属于你</p>
                                            <p className="text-xs text-stone-500">数据本地优先，随时可以导出。我采用数据本地优先的原则，绝不会为了留住用户而限制数据导出，更不会以此要挟你充值会员。</p>
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

                        {/* 兑换码输入 */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                            <div className="text-center space-y-2">
                                <h3 className="font-bold text-base text-stone-800">请输入兑换码（正在开发，尚未开放）</h3>
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
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* 1. 专属徽章卡片 */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-50 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300" />

                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                    #{supporterId || '001'}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-stone-800 mb-1">专属投喂徽章</h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                                        <span className="text-xs text-amber-600 font-medium">感谢您的支持</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. 应用图标切换卡片 */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                        <span className="text-blue-600 text-lg">📱</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-stone-800">应用图标</h3>
                                    </div>
                                </div>

                                {/* 手动刷新按钮 - 仅Android显示 */}
                                {isRedeemed && Capacitor.isNativePlatform() && (
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
                                        className={`relative aspect-square rounded-xl transition-all hover:bg-stone-50 ${!isRedeemed ? 'opacity-50 cursor-not-allowed' : ''
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

                            {!isRedeemed && (
                                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                    <p className="text-xs text-amber-700 text-center">
                                        🔒 请先验证投喂码以解锁图标切换功能
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 3. 背景图片切换卡片 */}
                        <BackgroundSelector onToast={onToast} />

                        {/* 4. 导航栏样式卡片 */}
                        <NavigationDecorationSelector onToast={onToast} />

                        {/* 5. 时光小友设置卡片 */}
                        <TimePalSettingsCard categories={categories} />

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
                                        <h3 className="font-bold text-stone-800">投喂我</h3>
                                        <p className="text-xs text-stone-500">您的支持是我最大的动力</p>
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
        </div>
    );
};
