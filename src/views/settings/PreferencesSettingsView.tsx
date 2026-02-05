/**
 * @file PreferencesSettingsView.tsx
 * @description 偏好设置页面
 */
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { ToastType } from '../../components/Toast';
import { DefaultArchiveView, DefaultIndexView } from '../../contexts/SettingsContext';

interface PreferencesSettingsViewProps {
    onBack: () => void;
    onToast: (type: ToastType, message: string) => void;
    startWeekOnSunday?: boolean;
    onToggleStartWeekOnSunday?: () => void;
    dailyReviewTime?: string;
    onSetDailyReviewTime?: (time: string) => void;
    weeklyReviewTime?: string;
    onSetWeeklyReviewTime?: (time: string) => void;
    monthlyReviewTime?: string;
    onSetMonthlyReviewTime?: (time: string) => void;
    autoFocusNote?: boolean;
    onToggleAutoFocusNote?: () => void;
    minIdleTimeThreshold?: number;
    onSetMinIdleTimeThreshold?: (val: number) => void;
    defaultView?: string;
    onSetDefaultView?: (view: any) => void;
    defaultArchiveView?: DefaultArchiveView;
    onSetDefaultArchiveView?: (view: DefaultArchiveView) => void;
    defaultIndexView?: DefaultIndexView;
    onSetDefaultIndexView?: (view: DefaultIndexView) => void;
}

export const PreferencesSettingsView: React.FC<PreferencesSettingsViewProps> = ({
    onBack,
    onToast,
    startWeekOnSunday,
    onToggleStartWeekOnSunday,
    dailyReviewTime,
    onSetDailyReviewTime,
    weeklyReviewTime,
    onSetWeeklyReviewTime,
    monthlyReviewTime,
    onSetMonthlyReviewTime,
    autoFocusNote,
    onToggleAutoFocusNote,
    minIdleTimeThreshold = 1,
    onSetMinIdleTimeThreshold,
    defaultView = 'RECORD',
    onSetDefaultView,
    defaultArchiveView = 'CHRONICLE',
    onSetDefaultArchiveView,
    defaultIndexView = 'TAGS',
    onSetDefaultIndexView
}) => {
    const [isDefaultViewDropdownOpen, setIsDefaultViewDropdownOpen] = useState(false);

    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0">
                <button onClick={onBack} className="text-stone-400 hover:text-stone-600 p-1">
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">偏好设置</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-40">
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* Start Week Toggle */}
                    <div className="flex items-center justify-between p-4 border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                        <div>
                            <h4 className="font-bold text-stone-700">从周日开始</h4>
                            <p className="text-xs text-stone-400 mt-1">日历视图每周第一天将设为周日</p>
                        </div>
                        <button
                            onClick={onToggleStartWeekOnSunday}
                            className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${
                                startWeekOnSunday ? 'bg-stone-800' : 'bg-stone-200'
                            }`}
                        >
                            <div
                                className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                                    startWeekOnSunday ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>

                    {/* Daily Review Time */}
                    <div className="flex items-center justify-between p-4 border-b border-stone-100 hover:bg-stone-50 transition-colors">
                        <div>
                            <h4 className="font-bold text-stone-700">每日回顾时间</h4>
                            <p className="text-xs text-stone-400 mt-1">到达该时间后，时间轴将显示今日回顾节点</p>
                        </div>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            value={(dailyReviewTime || '22:00').replace(':', '')}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                onSetDailyReviewTime?.(val);
                            }}
                            onFocus={(e) => e.target.select()}
                            className="bg-stone-100 border-none rounded-lg px-3 py-1.5 text-sm font-bold text-stone-700 focus:outline-none focus:ring-0 focus:bg-stone-200 transition-colors w-20 text-center tracking-widest font-mono"
                        />
                    </div>

                    {/* Weekly Review Time */}
                    <div className="flex items-center justify-between p-4 border-b border-stone-100 hover:bg-stone-50 transition-colors">
                        <div>
                            <h4 className="font-bold text-stone-700">每周回顾时间</h4>
                            <p className="text-xs text-stone-400 mt-1">到达该时间后，时间轴将在每周最后一天显示本周回顾节点</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="2200"
                                value={(weeklyReviewTime || '0-2200').split('-')[1] || '2200'}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    onSetWeeklyReviewTime?.(`0-${val}`);
                                }}
                                onFocus={(e) => e.target.select()}
                                className="bg-stone-100 border-none rounded-lg px-3 py-1.5 text-sm font-bold text-stone-700 focus:outline-none focus:ring-0 focus:bg-stone-200 transition-colors w-20 text-center tracking-widest font-mono"
                            />
                        </div>
                    </div>

                    {/* Monthly Review Time */}
                    <div className="flex items-center justify-between p-4 border-b border-stone-100 hover:bg-stone-50 transition-colors">
                        <div>
                            <h4 className="font-bold text-stone-700">每月回顾时间</h4>
                            <p className="text-xs text-stone-400 mt-1">到达该时间后，时间轴将在每月最后一天显示本月回顾节点</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="2200"
                                value={(monthlyReviewTime || '0-2200').split('-')[1] || '2200'}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    onSetMonthlyReviewTime?.(`0-${val}`);
                                }}
                                onFocus={(e) => e.target.select()}
                                className="bg-stone-100 border-none rounded-lg px-3 py-1.5 text-sm font-bold text-stone-700 focus:outline-none focus:ring-0 focus:bg-stone-200 transition-colors w-20 text-center tracking-widest font-mono"
                            />
                        </div>
                    </div>

                    {/* Auto-focus Note Toggle */}
                    <div className="flex items-center justify-between p-4 border-b border-stone-100 hover:bg-stone-50 transition-colors">
                        <div>
                            <h4 className="font-bold text-stone-700">自动聚焦备注</h4>
                            <p className="text-xs text-stone-400 mt-1">新建记录或专注时自动弹出键盘</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoFocusNote}
                                onChange={onToggleAutoFocusNote}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-800"></div>
                        </label>
                    </div>

                    {/* Min Idle Time Config */}
                    <div className="flex items-center justify-between p-4 border-b border-stone-100 hover:bg-stone-50 transition-colors">
                        <div>
                            <h4 className="font-bold text-stone-700">最小空闲时间隐藏阈值</h4>
                            <p className="text-xs text-stone-400 mt-1">小于此分钟数的空闲时间将不显示（分钟）</p>
                        </div>
                        <div className="flex items-center bg-stone-100 rounded-lg overflow-hidden">
                            <button
                                className="p-2 hover:bg-stone-200 transition-colors"
                                onClick={() => onSetMinIdleTimeThreshold?.(Math.max(0, minIdleTimeThreshold - 1))}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="w-8 text-center text-sm font-bold font-mono">{minIdleTimeThreshold}</span>
                            <button
                                className="p-2 hover:bg-stone-200 transition-colors"
                                onClick={() => onSetMinIdleTimeThreshold?.(minIdleTimeThreshold + 1)}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Default View Config */}
                    <div className="flex items-center justify-between p-4 border-t border-stone-100 relative z-10 hover:bg-stone-50 transition-colors">
                        <div>
                            <h4 className="font-bold text-stone-700">启动默认页</h4>
                            <p className="text-xs text-stone-400 mt-1">应用启动时默认显示的页面</p>
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setIsDefaultViewDropdownOpen(!isDefaultViewDropdownOpen)}
                                className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                            >
                                <span>
                                    {defaultView === 'RECORD' && '记录'}
                                    {defaultView === 'TODO' && '待办'}
                                    {defaultView === 'TIMELINE' && '脉络'}
                                    {defaultView === 'REVIEW' && '档案'}
                                    {defaultView === 'TAGS' && '索引'}
                                    {defaultView === 'STATS' && '统计页'}
                                    {defaultView === 'SCOPE' && '领域'}
                                </span>
                                <ChevronDown
                                    size={14}
                                    className={`transition-transform ${isDefaultViewDropdownOpen ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {isDefaultViewDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsDefaultViewDropdownOpen(false)} />
                                    <div className="absolute right-0 bottom-full mb-2 w-32 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden z-20 flex flex-col py-1 animate-in fade-in zoom-in-95 duration-200 origin-bottom-right">
                                        {[
                                            { label: '记录', value: 'RECORD' },
                                            { label: '待办', value: 'TODO' },
                                            { label: '脉络', value: 'TIMELINE' },
                                            { label: '档案', value: 'REVIEW' },
                                            { label: '索引', value: 'TAGS' },
                                            { label: '统计页', value: 'STATS' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => {
                                                    onSetDefaultView?.(opt.value);
                                                    setIsDefaultViewDropdownOpen(false);
                                                }}
                                                className={`px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-stone-50 flex items-center justify-between ${
                                                    defaultView === opt.value ? 'text-stone-900 bg-stone-50' : 'text-stone-500'
                                                }`}
                                            >
                                                {opt.label}
                                                {defaultView === opt.value && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-stone-800" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Default Archive Page Config */}
                    <div className="flex items-center justify-between p-4 border-t border-stone-100 relative z-10 hover:bg-stone-50 transition-colors">
                        <div>
                            <h4 className="font-bold text-stone-700">档案页默认页面</h4>
                            <p className="text-xs text-stone-400 mt-1">进入档案页时默认显示的视图</p>
                        </div>
                        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
                            <button
                                onClick={() => onSetDefaultArchiveView?.('CHRONICLE')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                    defaultArchiveView === 'CHRONICLE'
                                        ? 'bg-white text-stone-800 shadow-sm'
                                        : 'text-stone-400 hover:text-stone-600'
                                }`}
                            >
                                Chronicle
                            </button>
                            <button
                                onClick={() => onSetDefaultArchiveView?.('MEMOIR')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                    defaultArchiveView === 'MEMOIR'
                                        ? 'bg-white text-stone-800 shadow-sm'
                                        : 'text-stone-400 hover:text-stone-600'
                                }`}
                            >
                                Memoir
                            </button>
                        </div>
                    </div>

                    {/* Default Index Page Config */}
                    <div className="flex items-center justify-between p-4 border-t border-stone-100 relative z-10 hover:bg-stone-50 transition-colors">
                        <div>
                            <h4 className="font-bold text-stone-700">索引页默认页面</h4>
                            <p className="text-xs text-stone-400 mt-1">进入索引页时默认显示的视图</p>
                        </div>
                        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
                            <button
                                onClick={() => onSetDefaultIndexView?.('TAGS')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                    defaultIndexView === 'TAGS'
                                        ? 'bg-white text-stone-800 shadow-sm'
                                        : 'text-stone-400 hover:text-stone-600'
                                }`}
                            >
                                Tags
                            </button>
                            <button
                                onClick={() => onSetDefaultIndexView?.('SCOPE')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                    defaultIndexView === 'SCOPE'
                                        ? 'bg-white text-stone-800 shadow-sm'
                                        : 'text-stone-400 hover:text-stone-600'
                                }`}
                            >
                                Scopes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
