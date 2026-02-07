/**
 * @file GoalEditor.tsx
 * @input goal (optional), scopeId, categories, todoCategories
 * @output Goal Creation/Editing Form
 * @pos Component (Modal/Form)
 * @description A form modal for creating or editing goals, including title, metric type (duration, count, etc.), target values, and date ranges.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useEffect } from 'react';
import { Goal, Category, TodoCategory } from '../types';
import { X } from 'lucide-react';

interface GoalEditorProps {
    goal?: Goal;
    scopeId: string;
    categories: Category[];
    todoCategories: TodoCategory[];
    onSave: (goal: Goal) => void;
    onClose: () => void;
}

const metricOptions: { value: Goal['metric']; label: string; hint: string }[] = [
    { value: 'duration_raw', label: '投入时长', hint: '累计投入时间（小时）' },
    { value: 'task_count', label: '完成任务', hint: '完成待办数量（个）' },
    { value: 'duration_weighted', label: '有效时长', hint: '加权有效时长（小时）' },
    { value: 'frequency_days', label: '活跃天数', hint: '有活动的天数（天）' },
    { value: 'duration_limit', label: '时长上限', hint: '不超过时长（小时）' }
];

export const GoalEditor: React.FC<GoalEditorProps> = ({ goal, scopeId, categories, todoCategories, onSave, onClose }) => {
    const [title, setTitle] = useState(goal?.title || '');
    const [metric, setMetric] = useState<Goal['metric']>(goal?.metric || 'duration_raw');

    // 初始化targetValue：如果是时长类型且是编辑模式，需要保持原始秒值
    const [targetValue, setTargetValue] = useState(() => {
        if (!goal) return 0;
        return goal.targetValue;
    });

    // 使用8位数字格式：YYYYMMDD
    const [startDateStr, setStartDateStr] = useState(() => {
        if (goal?.startDate) {
            return goal.startDate.replace(/-/g, '');
        }
        const now = new Date();
        return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    });

    const [endDateStr, setEndDateStr] = useState(() => {
        if (goal?.endDate) {
            return goal.endDate.replace(/-/g, '');
        }
        return '';
    });

    const [motivation, setMotivation] = useState(goal?.motivation || '');

    // 🔍 筛选器状态 (Filter States)
    const [filterTodoCategories, setFilterTodoCategories] = useState<string[]>(goal?.filterTodoCategories || []);
    const [filterActivityIds, setFilterActivityIds] = useState<string[]>(goal?.filterActivityIds || []);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(''); // 用于二级选择
    const [isFilterEnabled, setIsFilterEnabled] = useState<boolean>(
        (goal?.filterTodoCategories && goal.filterTodoCategories.length > 0) ||
        (goal?.filterActivityIds && goal.filterActivityIds.length > 0) ||
        false
    );
    const [isTodoFilterEnabled, setIsTodoFilterEnabled] = useState<boolean>(
        (goal?.filterTodoCategories && goal.filterTodoCategories.length > 0) || false
    );

    const handleSave = () => {
        if (!title.trim() || !startDateStr || !endDateStr || targetValue <= 0) {
            alert('请填写完整信息');
            return;
        }

        // 验证日期格式
        if (startDateStr.length !== 8 || endDateStr.length !== 8) {
            alert('请输入8位日期格式（YYYYMMDD）');
            return;
        }

        // 转换为YYYY-MM-DD格式
        const startDate = `${startDateStr.slice(0, 4)}-${startDateStr.slice(4, 6)}-${startDateStr.slice(6, 8)}`;
        const endDate = `${endDateStr.slice(0, 4)}-${endDateStr.slice(4, 6)}-${endDateStr.slice(6, 8)}`;

        const newGoal: Goal = {
            id: goal?.id || crypto.randomUUID(),
            title: title.trim(),
            scopeId: scopeId,
            metric,
            targetValue: targetValue, // 直接使用秒值
            startDate,
            endDate,
            status: goal?.status || 'active',
            motivation: motivation.trim() || undefined,
            // 筛选器字段
            filterTodoCategories: metric === 'task_count' && filterTodoCategories.length > 0 ? filterTodoCategories : undefined,
            filterActivityIds: metric !== 'task_count' && filterActivityIds.length > 0 ? filterActivityIds : undefined,
        };

        onSave(newGoal);
    };

    // 根据metric类型显示目标值（转换为小时）
    const getDisplayValue = () => {
        if (metric === 'duration_raw' || metric === 'duration_weighted' || metric === 'duration_limit') {
            return Math.round(targetValue / 3600) || 0;
        }
        return targetValue || 0;
    };

    // 处理用户输入（从小时转换为秒）
    const handleValueChange = (value: number) => {
        if (metric === 'duration_raw' || metric === 'duration_weighted' || metric === 'duration_limit') {
            setTargetValue(value * 3600);
        } else {
            setTargetValue(value);
        }
    };

    // 监听metric类型变化，智能调整targetValue
    useEffect(() => {
        if (!goal) return; // 新建模式不需要调整

        const isDurationMetric = metric === 'duration_raw' || metric === 'duration_weighted' || metric === 'duration_limit';
        const wasInitiallyDuration = goal.metric === 'duration_raw' || goal.metric === 'duration_weighted' || goal.metric === 'duration_limit';

        // 如果从时长类型切换到非时长类型，将秒转换为合理的数值
        if (wasInitiallyDuration && !isDurationMetric && targetValue > 1000) {
            // 假设原值是秒，转换为小时作为新的目标值
            setTargetValue(Math.round(targetValue / 3600));
        }
        // 如果从非时长类型切换到时长类型，将数值转换为秒
        else if (!wasInitiallyDuration && isDurationMetric && targetValue < 1000) {
            setTargetValue(targetValue * 3600);
        }
    }, [metric]);

    const selectedMetricInfo = metricOptions.find(m => m.value === metric);

    // 快捷时间范围设置
    const setQuickDateRange = (range: 'month' | 'quarter' | 'year') => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        let start = '';
        let end = '';

        if (range === 'month') {
            // 本月
            start = `${year}${String(month).padStart(2, '0')}01`;
            const lastDay = new Date(year, month, 0).getDate();
            end = `${year}${String(month).padStart(2, '0')}${lastDay}`;
        } else if (range === 'quarter') {
            // 本季度
            const quarter = Math.floor((month - 1) / 3);
            const startMonth = quarter * 3 + 1;
            const endMonth = startMonth + 2;
            start = `${year}${String(startMonth).padStart(2, '0')}01`;
            const lastDay = new Date(year, endMonth, 0).getDate();
            end = `${year}${String(endMonth).padStart(2, '0')}${lastDay}`;
        } else if (range === 'year') {
            // 本年
            start = `${year}0101`;
            end = `${year}1231`;
        }

        setStartDateStr(start);
        setEndDateStr(end);
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-t-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-slideUp"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-stone-100 px-6 py-4">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest">
                            {goal ? '编辑目标' : '新建目标'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-stone-100 rounded-full transition-colors"
                        >
                            <X size={20} className="text-stone-400" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="p-6 space-y-5">
                    {/* 目标标题 */}
                    <div>
                        <label className="block text-xs font-medium text-stone-400 mb-2 uppercase tracking-wider">
                            目标标题
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="例如：Q1 广韵文献攻坚"
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 font-medium outline-none focus:border-stone-400 transition-colors"
                        />
                    </div>

                    {/* 目标类型 - 胶囊选择 */}
                    <div>
                        <label className="block text-xs font-medium text-stone-400 mb-2 uppercase tracking-wider">
                            目标类型
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {metricOptions.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setMetric(option.value)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${metric === option.value
                                        ? 'text-white'
                                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                        }`}
                                    style={metric === option.value ? { backgroundColor: 'var(--accent-color)' } : {}}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        {selectedMetricInfo && (
                            <p className="mt-2 text-xs text-stone-500">{selectedMetricInfo.hint}</p>
                        )}
                    </div>

                    {/* 目标阈值 */}
                    <div>
                        <label className="block text-xs font-medium text-stone-400 mb-2 uppercase tracking-wider">
                            目标阈值
                        </label>
                        <input
                            type="number"
                            value={getDisplayValue()}
                            onChange={(e) => handleValueChange(Number(e.target.value) || 0)}
                            min="1"
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 font-medium outline-none focus:border-stone-400 transition-colors text-center text-lg font-mono"
                        />
                    </div>

                    {/* 起止日期 - 数字输入 */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider">
                                时间范围
                            </label>
                            {/* 快捷按钮 */}
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setQuickDateRange('month')}
                                    className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-[10px] font-medium rounded transition-colors"
                                >
                                    本月
                                </button>
                                <button
                                    onClick={() => setQuickDateRange('quarter')}
                                    className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-[10px] font-medium rounded transition-colors"
                                >
                                    本季度
                                </button>
                                <button
                                    onClick={() => setQuickDateRange('year')}
                                    className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-[10px] font-medium rounded transition-colors"
                                >
                                    本年
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] text-stone-400 mb-1.5">开始日期</label>
                                <input
                                    type="text"
                                    value={startDateStr}
                                    onChange={(e) => setStartDateStr(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                    placeholder="20250101"
                                    maxLength={8}
                                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 font-mono font-medium outline-none focus:border-stone-400 transition-colors text-center"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-stone-400 mb-1.5">结束日期</label>
                                <input
                                    type="text"
                                    value={endDateStr}
                                    onChange={(e) => setEndDateStr(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                    placeholder="20251231"
                                    maxLength={8}
                                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 font-mono font-medium outline-none focus:border-stone-400 transition-colors text-center"
                                />
                            </div>
                        </div>
                        <p className="mt-1.5 text-xs text-stone-400">格式：YYYYMMDD（例如：20250101）</p>
                    </div>

                    {/* 🔍 高级筛选器 (Advanced Filters) */}
                    {metric === 'task_count' ? (
                        /* 待办模式筛选 */
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                                    限定待办清单
                                    <span className="text-stone-300 ml-1">（可选）</span>
                                </label>
                                {/* Toggle 开关 */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsTodoFilterEnabled(!isTodoFilterEnabled);
                                        if (isTodoFilterEnabled) {
                                            // 关闭时清空选择
                                            setFilterTodoCategories([]);
                                        }
                                    }}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${isTodoFilterEnabled
                                        ? 'text-white'
                                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                                        }`}
                                    style={isTodoFilterEnabled ? { backgroundColor: 'var(--accent-color)' } : {}}
                                >
                                    {isTodoFilterEnabled ? '已开启' : '关闭'}
                                </button>
                            </div>
                            <p className="text-xs text-stone-500 mb-3">
                                仅统计选中清单中的待办任务
                            </p>

                            {isTodoFilterEnabled && (
                                <>
                                    <div className="grid grid-cols-4 gap-2">
                                        {todoCategories.map(cat => {
                                            const isSelected = filterTodoCategories.includes(cat.id);
                                            return (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setFilterTodoCategories(filterTodoCategories.filter(id => id !== cat.id));
                                                        } else {
                                                            setFilterTodoCategories([...filterTodoCategories, cat.id]);
                                                        }
                                                    }}
                                                    className={`
                                                px-2 py-2 rounded-lg text-[10px] font-medium text-center border transition-colors flex items-center justify-center gap-1.5 truncate
                                                ${isSelected
                                                            ? 'bg-stone-50 text-stone-500'
                                                            : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'}
                                            `}
                                                    style={isSelected ? { borderColor: 'var(--accent-color)' } : {}}
                                                >
                                                    <span>{cat.icon}</span>
                                                    <span className="truncate">{cat.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Clear 按钮 */}
                                    {filterTodoCategories.length > 0 && (
                                        <div className="flex justify-end mt-2">
                                            <button
                                                type="button"
                                                onClick={() => setFilterTodoCategories([])}
                                                className="text-xs font-medium text-stone-400 hover:text-red-400 transition-colors"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    )}

                                    {/* 已选择清单提示 */}
                                    {filterTodoCategories.length > 0 && (
                                        <div className="mt-3 text-xs text-stone-500 animate-in fade-in">
                                            <span className="font-medium">已选择：</span>
                                            {filterTodoCategories.map((catId, index) => {
                                                const category = todoCategories.find(c => c.id === catId);
                                                return category ? (
                                                    <span key={catId}>
                                                        {category.icon} {category.name}{index < filterTodoCategories.length - 1 ? '、' : ''}
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        /* 记录模式筛选 */
                        <div className="space-y-4">
                            <div>
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
                                            ? 'text-white'
                                            : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                                            }`}
                                        style={isFilterEnabled ? { backgroundColor: 'var(--accent-color)' } : {}}
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
                                                                ? 'bg-stone-50 text-stone-500'
                                                                : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'}
                                                        `}
                                                        style={isSelected ? { borderColor: 'var(--accent-color)' } : {}}
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
                                                                <div 
                                                                    className={`
                                                            w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all
                                                            ${act.color}
                                                        `}
                                                                    style={isActive ? { 
                                                                        boxShadow: `0 0 0 1px var(--accent-color), 0 0 0 3px white, 0 0 0 4px var(--accent-color)`,
                                                                        transform: 'scale(1.1)'
                                                                    } : {}}
                                                                >
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
                        </div>
                    )}

                    {/* 激励/备注 */}
                    <div>
                        <label className="block text-xs font-medium text-stone-400 mb-2 uppercase tracking-wider">
                            激励/备注
                            <span className="text-stone-300 ml-1">（可选）</span>
                        </label>
                        <textarea
                            value={motivation}
                            onChange={(e) => setMotivation(e.target.value)}
                            placeholder="例如：完成奖励自己一套新香具"
                            rows={2}
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 outline-none focus:border-stone-400 transition-colors resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-stone-100 p-6">
                    <button
                        onClick={handleSave}
                        className="w-full px-6 py-4 text-white rounded-2xl font-bold text-lg transition-colors shadow-lg"
                        style={{ backgroundColor: 'var(--accent-color)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-color)'}
                    >
                        {goal ? '更新目标' : '创建目标'}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
                .animate-slideUp {
                    animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
                }
            `}</style>
        </div >
    );
};
