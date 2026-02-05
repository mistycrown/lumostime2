/**
 * @file SponsorshipView.tsx
 * @description 赞赏功能页面 - 包含兑换码验证、专属徽章、应用图标、背景图片、导航栏样式等功能
 */
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Coffee, Check } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { ToastType } from '../components/Toast';
import { RedemptionService } from '../services/redemptionService';
import { IconPreview } from '../components/IconPreview';
import { BackgroundSelector } from '../components/BackgroundSelector';
import { NavigationDecorationSelector } from '../components/NavigationDecorationSelector';
import { ICON_OPTIONS } from '../services/iconService';

interface SponsorshipViewProps {
    onBack: () => void;
    onToast: (type: ToastType, message: string) => void;
}

export const SponsorshipView: React.FC<SponsorshipViewProps> = ({ onBack, onToast }) => {
    const [redemptionCode, setRedemptionCode] = useState('');
    const [isRedeemed, setIsRedeemed] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [supporterId, setSupporterId] = useState<number | undefined>(undefined);
    const [selectedIcon, setSelectedIcon] = useState('default');
    const [isChangingIcon, setIsChangingIcon] = useState(false);
    const redemptionService = new RedemptionService();

    useEffect(() => {
        const checkVerification = async () => {
            const result = await redemptionService.isVerified();
            if (result.isVerified && result.userId) {
                setIsRedeemed(true);
                setSupporterId(result.userId);
            }
        };
        checkVerification();

        // 加载当前图标设置
        const loadCurrentIcon = async () => {
            try {
                const { iconService } = await import('../services/iconService');
                const currentIcon = iconService.getCurrentIcon();
                setSelectedIcon(currentIcon);
            } catch (error) {
                console.error('加载当前图标失败:', error);
            }
        };
        loadCurrentIcon();
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
        if (!isRedeemed) {
            onToast('error', '请先验证赞赏码');
            return;
        }

        setIsChangingIcon(true);
        try {
            const { iconService } = await import('../services/iconService');
            const result = await iconService.setIcon(iconId);
            
            if (result.success) {
                setSelectedIcon(iconId);
                onToast('success', result.message);
            } else {
                onToast('error', result.message);
            }
        } catch (error: any) {
            console.error('切换图标失败:', error);
            onToast('error', error.message || '切换图标失败');
        } finally {
            setIsChangingIcon(false);
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
                <span className="text-stone-800 font-bold text-lg">赞赏功能</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-6 pb-40">
                {!isRedeemed ? (
                    /* 兑换码输入界面 */
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6 max-w-sm mx-auto mt-10">
                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
                                <Coffee size={24} />
                            </div>
                            <h3 className="font-bold text-lg text-stone-800">请输入兑换码</h3>
                            <p className="text-sm text-stone-500">解锁专属赞赏功能</p>
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
                                className={`w-full font-bold py-3 rounded-xl transition-all shadow-lg shadow-stone-200 ${
                                    isVerifying
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
                                    <h3 className="text-lg font-bold text-stone-800 mb-1">专属赞助徽章</h3>
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
                                        onClick={() => handleIconChange(option.id)}
                                        disabled={isChangingIcon || !isRedeemed}
                                        className={`relative w-12 h-12 rounded-xl transition-all hover:bg-stone-50 ${
                                            !isRedeemed ? 'opacity-50 cursor-not-allowed' : ''
                                        } ${
                                            isChangingIcon ? 'opacity-70' : ''
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
                                        🔒 请先验证赞赏码以解锁图标切换功能
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 3. 背景图片切换卡片 */}
                        <BackgroundSelector onToast={onToast} />

                        {/* 4. 导航栏样式卡片 */}
                        <NavigationDecorationSelector onToast={onToast} />

                        {/* 测试用重置按钮 */}
                        <div className="flex justify-center pt-4">
                            <button
                                onClick={handleClearCode}
                                className="text-xs text-stone-300 hover:text-stone-500 px-4 py-2"
                            >
                                清除兑换码状态
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
