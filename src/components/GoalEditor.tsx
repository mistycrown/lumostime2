/**
 * @file GoalEditor.tsx
 * @input goal (optional), scopeId, categories, todoCategories, mode, majorGoal, majorGoals
 * @output Goal/MajorGoal Creation/Editing Form
 * @pos Component (Modal/Form)
 * @description A reusable form modal for creating or editing goals and major goals. Supports three modes:
 *   - independent: Create/edit standalone goals (can optionally link to a major goal)
 *   - phase: Create/edit phase goals within a major goal (inherits metric and filters)
 *   - majorGoal: Create/edit major goals (no target value, time range auto-calculated)
 * @updated 2026-06-16: Added a current-week quick date range shortcut that fills the goal date window from Monday through Sunday.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useEffect } from 'react';
import { Goal, Category, TodoCategory, MajorGoal } from '../types';
import { X, Check } from 'lucide-react';
import { TagMultipleAssociation } from './TagMultipleAssociation';

interface GoalEditorProps {
    goal?: Goal;
    scopeId: string;
    categories: Category[];
    todoCategories: TodoCategory[];
    onSave: (goal: Goal) => void;
    onClose: () => void;
    
    // 新增：支持三种模式
    mode?: 'independent' | 'phase' | 'majorGoal';
    majorGoal?: MajorGoal;  // MajorGoal 类型（phase 模式必需，或 majorGoal 模式编辑时使用）
    majorGoals?: MajorGoal[];  // 可选的目标系列列表（independent 模式）
    onSaveMajorGoal?: (majorGoal: MajorGoal) => void;  // 保存目标系列的回调
    onDelete?: (goalId: string) => void;  // 删除目标的回调
}

const metricOptions: { value: Goal['metric']; label: string; hint: string }[] = [
    { value: 'duration_raw', label: '投入时长', hint: '累计投入时间（小时）' },
    { value: 'task_count', label: '完成任务', hint: '完成待办数量（个）' },
    { value: 'duration_weighted', label: '有效时长', hint: '专注度加权有效时长（小时）' },
    { value: 'frequency_days', label: '活跃天数', hint: '有活动的天数（天）' },
    { value: 'duration_limit', label: '时长上限', hint: '不超过时长（小时）' },
    { value: 'record_count', label: '记录条数', hint: '限定标签中的记录有多少条' }
];

export const GoalEditor: React.FC<GoalEditorProps> = ({ 
    goal, 
    scopeId, 
    categories, 
    todoCategories, 
    onSave, 
    onClose,
    mode = 'independent',
    majorGoal,
    majorGoals,
    onSaveMajorGoal,
    onDelete
}) => {
    const [title, setTitle] = useState(
        mode === 'majorGoal' && majorGoal ? majorGoal.title : (goal?.title || '')
    );
    const [metric, setMetric] = useState<Goal['metric']>(
        majorGoal ? majorGoal.metric : (goal?.metric || 'duration_raw')
    );
    
    // 新增：所属目标系列选择
    const [selectedMajorGoalId, setSelectedMajorGoalId] = useState<string | undefined>(
        majorGoal ? majorGoal.id : goal?.majorGoalId
    );
    
    // 新增：目标系列描述（仅 majorGoal 模式）
    const [description, setDescription] = useState(
        mode === 'majorGoal' && majorGoal ? (majorGoal.description || '') : ''
    );

    // 初始化targetValue：如果是时长类型且是编辑模式，需要保持原始秒值
    const [targetValue, setTargetValue] = useState(() => {
        // majorGoal 模式：使用 majorGoal 的目标值
        if (mode === 'majorGoal' && majorGoal) {
            return majorGoal.targetValue;
        }
        // goal 模式：使用 goal 的目标值
        if (!goal) return 0;
        return goal.targetValue;
    });

    // 使用8位数字格式：YYYYMMDD
    const [startDateStr, setStartDateStr] = useState(() => {
        // majorGoal 模式：优先使用 majorGoal 的日期
        if (mode === 'majorGoal' && majorGoal?.startDate) {
            return majorGoal.startDate.replace(/-/g, '');
        }
        // goal 模式：使用 goal 的日期
        if (goal?.startDate) {
            return goal.startDate.replace(/-/g, '');
        }
        // 默认：当前日期
        const now = new Date();
        return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    });

    const [endDateStr, setEndDateStr] = useState(() => {
        // majorGoal 模式：优先使用 majorGoal 的日期
        if (mode === 'majorGoal' && majorGoal?.endDate) {
            return majorGoal.endDate.replace(/-/g, '');
        }
        // goal 模式：使用 goal 的日期
        if (goal?.endDate) {
            return goal.endDate.replace(/-/g, '');
        }
        // 默认：空字符串
        return '';
    });

    const [motivation, setMotivation] = useState(
        mode === 'majorGoal' && majorGoal ? (majorGoal.motivation || '') : (goal?.motivation || '')
    );

    // 🔍 筛选器状态 (Filter States)
    const [filterTodoCategories, setFilterTodoCategories] = useState<string[]>(
        majorGoal ? (majorGoal.filterTodoCategories || []) : (goal?.filterTodoCategories || [])
    );
    const [filterActivityIds, setFilterActivityIds] = useState<string[]>(
        majorGoal ? (majorGoal.filterActivityIds || []) : (goal?.filterActivityIds || [])
    );
    const [isTodoFilterEnabled, setIsTodoFilterEnabled] = useState<boolean>(
        (goal?.filterTodoCategories && goal.filterTodoCategories.length > 0) || 
        (majorGoal?.filterTodoCategories && majorGoal.filterTodoCategories.length > 0) ||
        false
    );

    const findActivityById = (activityId: string) => {
        for (const category of categories) {
            const activity = category.activities?.find(a => a.id === activityId);
            if (activity) return activity;
        }
        return undefined;
    };

    useEffect(() => {
        if (mode === 'majorGoal') return;
        if (!selectedMajorGoalId) return;

        const inheritedMajorGoal = majorGoal || majorGoals?.find(mg => mg.id === selectedMajorGoalId);
        if (!inheritedMajorGoal) return;

        setMetric(inheritedMajorGoal.metric);
        setFilterActivityIds(inheritedMajorGoal.filterActivityIds || []);
        setFilterTodoCategories(inheritedMajorGoal.filterTodoCategories || []);

        if (inheritedMajorGoal.metric === 'task_count') {
            setIsTodoFilterEnabled((inheritedMajorGoal.filterTodoCategories || []).length > 0);
        }
    }, [majorGoal, majorGoals, mode, selectedMajorGoalId]);
    
    // 判断字段是否应该禁用
    const isFieldDisabled = (fieldName: string): boolean => {
        // 目标系列本身不走继承逻辑，允许编辑
        if (mode === 'majorGoal') return false;

        // 阶段目标模式或选择了目标系列：禁用继承字段
        if ((mode === 'phase' || (mode === 'independent' && selectedMajorGoalId)) && ['metric', 'filterActivityIds', 'filterTodoCategories'].includes(fieldName)) {
            return true;
        }
        
        return false;
    };

    const handleSave = () => {
        if (!title.trim()) {
            alert('请填写标题');
            return;
        }

        // 目标系列模式：创建 MajorGoal
        if (mode === 'majorGoal') {
            if (!onSaveMajorGoal) {
                alert('缺少保存目标系列的回调函数');
                return;
            }

            // 验证日期格式
            if (!startDateStr || !endDateStr) {
                alert('请填写开始时间和结束时间');
                return;
            }

            if (startDateStr.length !== 8 || endDateStr.length !== 8) {
                alert('请输入8位日期格式（YYYYMMDD）');
                return;
            }

            if (targetValue <= 0) {
                alert('请填写目标值');
                return;
            }

            // 转换为YYYY-MM-DD格式
            const startDate = `${startDateStr.slice(0, 4)}-${startDateStr.slice(4, 6)}-${startDateStr.slice(6, 8)}`;
            const endDate = `${endDateStr.slice(0, 4)}-${endDateStr.slice(4, 6)}-${endDateStr.slice(6, 8)}`;

            const newMajorGoal: MajorGoal = {
                id: majorGoal?.id || crypto.randomUUID(),
                title: title.trim(),
                scopeId: scopeId,
                metric,
                targetValue,
                startDate,
                endDate,
                description: description.trim() || undefined,
                motivation: motivation.trim() || undefined,
                filterActivityIds: metric !== 'task_count' && filterActivityIds.length > 0 ? filterActivityIds : undefined,
                filterTodoCategories: metric === 'task_count' && filterTodoCategories.length > 0 ? filterTodoCategories : undefined,
                status: majorGoal?.status || 'active',
                createdAt: majorGoal?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                order: majorGoal?.order,
            };

            onSaveMajorGoal(newMajorGoal);
            return;
        }

        // 独立目标和阶段目标模式：创建 Goal
        if (!startDateStr || !endDateStr || targetValue <= 0) {
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
            targetValue: targetValue,
            startDate,
            endDate,
            status: goal?.status || 'active',
            motivation: motivation.trim() || undefined,
            // 筛选器字段
            filterTodoCategories: metric === 'task_count' && filterTodoCategories.length > 0 ? filterTodoCategories : undefined,
            filterActivityIds: metric !== 'task_count' && filterActivityIds.length > 0 ? filterActivityIds : undefined,
            // 目标系列关联
            majorGoalId: selectedMajorGoalId,
            order: goal?.order,
        };

        onSave(newGoal);
    };

    const handleDelete = () => {
        if (!goal || !onDelete) return;
        
        const confirmMessage = mode === 'phase' 
            ? '确定要删除这个阶段目标吗？' 
            : '确定要删除这个目标吗？';
        
        if (confirm(confirmMessage)) {
            onDelete(goal.id);
            onClose();
        }
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
    const setQuickDateRange = (range: 'week' | 'month' | 'quarter' | 'year') => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        let start = '';
        let end = '';

        if (range === 'week') {
            const currentDay = now.getDay();
            const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() + mondayOffset);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            start = `${weekStart.getFullYear()}${String(weekStart.getMonth() + 1).padStart(2, '0')}${String(weekStart.getDate()).padStart(2, '0')}`;
            end = `${weekEnd.getFullYear()}${String(weekEnd.getMonth() + 1).padStart(2, '0')}${String(weekEnd.getDate()).padStart(2, '0')}`;
        } else if (range === 'month') {
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
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-stone-900/40 backdrop-blur-sm animate-fadeIn pb-[env(safe-area-inset-bottom)]"
            onClick={onClose}
        >
            {/* Modal Content - Bottom Sheet on Mobile, Center on Desktop */}
            <div
                className="w-full h-[85vh] md:h-auto md:max-h-[85vh] md:max-w-2xl bg-[#faf9f6] rounded-t-[2rem] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative animate-slideUp"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-white/50">
                    <button onClick={onClose} className="p-2 -ml-2 hover:bg-stone-100 rounded-full text-stone-500 transition-colors">
                        <X size={24} />
                    </button>
                    <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest">
                        {mode === 'majorGoal' ? '编辑目标系列' : (goal ? '编辑目标' : '新建目标')}
                    </h2>
                    <div className="w-10 flex justify-end">
                        <button
                            onClick={handleSave}
                            className="p-2 -mr-2 rounded-full transition-colors"
                            style={{ color: 'var(--accent-color)' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            <Check size={20} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 no-scrollbar pb-60">
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

                    {/* 所属目标系列信息（仅阶段目标模式） */}
                    {mode === 'phase' && majorGoal && (
                        <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                                    所属目标系列
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-stone-900">
                                    {majorGoal.title}
                                </span>
                                <span className="px-2 py-0.5 bg-stone-200 text-stone-600 text-[10px] font-bold rounded">
                                    {metricOptions.find(m => m.value === majorGoal.metric)?.label}
                                </span>
                            </div>
                            <p className="mt-2 text-xs text-stone-500">
                                💡 目标类型和筛选条件继承自目标系列，不可修改
                            </p>
                        </div>
                    )}

                    {/* 所属目标系列选择器（仅独立目标模式） */}
                    {mode === 'independent' && majorGoals && majorGoals.length > 0 && (
                        <div>
                            <label className="block text-xs font-medium text-stone-400 mb-2 uppercase tracking-wider">
                                所属目标系列
                                <span className="text-stone-300 ml-1">（可选）</span>
                            </label>
                            
                            <div className="space-y-2">
                                {/* 无（独立目标）选项 */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedMajorGoalId(undefined);
                                    }}
                                    className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                                        !selectedMajorGoalId
                                            ? 'text-white border-2'
                                            : 'bg-stone-50 text-stone-600 border-2 border-stone-200 hover:border-stone-300'
                                    }`}
                                    style={!selectedMajorGoalId ? {
                                        backgroundColor: 'var(--accent-color)',
                                        borderColor: 'var(--accent-color)'
                                    } : undefined}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">无（独立目标）</span>
                                        {!selectedMajorGoalId && (
                                            <Check size={16} strokeWidth={2.5} />
                                        )}
                                    </div>
                                </button>

                                {/* 目标系列选项列表 */}
                                {majorGoals
                                    .filter((mg: any) => mg.scopeId === scopeId && mg.status !== 'archived')
                                    .map((mg: any) => {
                                        const isSelected = selectedMajorGoalId === mg.id;
                                        const metricLabel = metricOptions.find(m => m.value === mg.metric)?.label;
                                        
                                        return (
                                            <button
                                                key={mg.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedMajorGoalId(mg.id);
                                                    setMetric(mg.metric);
                                                    setFilterActivityIds(mg.filterActivityIds || []);
                                                    setFilterTodoCategories(mg.filterTodoCategories || []);
                                                }}
                                                className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                                                    isSelected
                                                        ? 'text-white border-2'
                                                        : 'bg-stone-50 text-stone-600 border-2 border-stone-200 hover:border-stone-300'
                                                }`}
                                                style={isSelected ? {
                                                    backgroundColor: 'var(--accent-color)',
                                                    borderColor: 'var(--accent-color)'
                                                } : undefined}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium truncate">
                                                                {mg.title}
                                                            </span>
                                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded flex-shrink-0 ${
                                                                isSelected
                                                                    ? 'bg-white/20 text-white'
                                                                    : 'bg-stone-200 text-stone-600'
                                                            }`}>
                                                                {metricLabel}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <Check size={16} strokeWidth={2.5} className="flex-shrink-0 ml-2" />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                            </div>
                            
                            {selectedMajorGoalId && (
                                <p className="mt-2 text-xs text-stone-500">
                                    💡 目标类型和筛选条件将继承自目标系列
                                </p>
                            )}
                        </div>
                    )}

                    {/* 目标系列描述（仅目标系列模式） */}
                    {mode === 'majorGoal' && (
                        <div>
                            <label className="block text-xs font-medium text-stone-400 mb-2 uppercase tracking-wider">
                                系列描述
                                <span className="text-stone-300 ml-1">（可选）</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="详细描述这个目标系列的内容和期望..."
                                rows={3}
                                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 outline-none focus:border-stone-400 transition-colors resize-none"
                            />
                        </div>
                    )}

                    {/* 目标类型 - 胶囊选择 */}
                    <div>
                        <label className="block text-xs font-medium text-stone-400 mb-2 uppercase tracking-wider">
                            目标类型
                            {isFieldDisabled('metric') && (
                                <span className="text-stone-300 ml-1">（继承自目标系列）</span>
                            )}
                        </label>
                        
                        {isFieldDisabled('metric') ? (
                            // 只读显示
                            <div className="px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg">
                                <span className="text-sm font-bold text-stone-600">
                                    {metricOptions.find(m => m.value === metric)?.label}
                                </span>
                            </div>
                        ) : (
                            // 可编辑
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
                        )}
                        {selectedMetricInfo && (
                            <p className="mt-2 text-xs text-stone-500">{selectedMetricInfo.hint}</p>
                        )}
                    </div>

                    {/* 目标阈值 */}
                    <div>
                        <label className="block text-xs font-medium text-stone-400 mb-2 uppercase tracking-wider">
                            {mode === 'majorGoal' ? '目标值' : '目标阈值'}
                        </label>
                        <input
                            type="number"
                            value={getDisplayValue()}
                            onChange={(e) => handleValueChange(Number(e.target.value) || 0)}
                            min="1"
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 font-medium outline-none focus:border-stone-400 transition-colors text-center text-lg font-mono"
                        />
                        {mode === 'majorGoal' && (
                            <p className="mt-2 text-xs text-stone-500">
                                💡 当前值将通过所有阶段目标的进度累加计算
                            </p>
                        )}
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
                                    onClick={() => setQuickDateRange('week')}
                                    className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-[10px] font-medium rounded transition-colors"
                                >
                                    本周
                                </button>
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
                                    {isFieldDisabled('filterTodoCategories') && (
                                        <span className="text-stone-300 ml-1">（继承自目标系列）</span>
                                    )}
                                </label>
                                {/* Toggle 开关 */}
                                {!isFieldDisabled('filterTodoCategories') && (
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
                                )}
                            </div>
                            
                            {isFieldDisabled('filterTodoCategories') ? (
                                // 只读显示
                                <div className="px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg">
                                    {filterTodoCategories.length > 0 ? (
                                        <div className="text-xs text-stone-600">
                                            {filterTodoCategories.map((catId, index) => {
                                                const category = todoCategories.find(c => c.id === catId);
                                                return category ? (
                                                    <span key={catId}>
                                                        {category.icon} {category.name}{index < filterTodoCategories.length - 1 ? '、' : ''}
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-stone-400">不限定</span>
                                    )}
                                </div>
                            ) : (
                                <>
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
                                                                px-2 py-2 rounded-lg text-[10px] font-medium text-center transition-colors flex items-center justify-center gap-1.5 truncate
                                                                ${isSelected
                                                                    ? 'btn-template-filled'
                                                                    : 'bg-stone-50 text-stone-500 border border-stone-100 hover:bg-stone-100'}
                                                            `}
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
                                </>
                            )}
                        </div>
                    ) : (
                        /* 记录模式筛选 - 使用 TagMultipleAssociation 组件 */
                        <div>
                            {isFieldDisabled('filterActivityIds') ? (
                                // 只读显示
                                <div>
                                    <label className="block text-xs font-medium text-stone-400 mb-2 uppercase tracking-wider">
                                        限定标签（Activity）
                                        <span className="text-stone-300 ml-1">（继承自目标系列）</span>
                                    </label>
                                    <div className="px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg">
                                        {filterActivityIds.length > 0 ? (
                                            <div className="text-xs text-stone-600">
                                                {filterActivityIds.map((actId, index) => {
                                                    const activity = findActivityById(actId);
                                                    return activity ? (
                                                        <span key={actId}>
                                                            {activity.icon} {activity.name}{index < filterActivityIds.length - 1 ? '、' : ''}
                                                        </span>
                                                    ) : (
                                                        <span key={actId}>
                                                            {actId}{index < filterActivityIds.length - 1 ? '、' : ''}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-stone-400">不限定</span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <TagMultipleAssociation
                                    categories={categories}
                                    selectedActivityIds={filterActivityIds}
                                    onChange={setFilterActivityIds}
                                    showToggle={true}
                                    toggleLabel="限定标签（Activity）"
                                    description="仅统计选中标签的时间记录"
                                />
                            )}
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
                            placeholder="例如：完成奖励自己……"
                            rows={2}
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 outline-none focus:border-stone-400 transition-colors resize-none"
                        />
                    </div>

                    {/* 删除目标按钮 - 仅编辑模式显示 */}
                    {goal && onDelete && mode !== 'majorGoal' && (
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="w-full py-2.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full font-medium text-sm transition-colors active:scale-95"
                            >
                                删除目标
                            </button>
                        </div>
                    )}
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
