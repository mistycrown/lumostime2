import React, { useState, useMemo } from 'react';
import { ChevronLeft, PlusCircle, Edit2, Trash2, X } from 'lucide-react';
import { ToastType } from '../../components/Toast';
import { Filter, Log, Category, Scope, TodoItem, TodoCategory } from '../../types';
import { FilterDetailView } from '../FilterDetailView';
import { ConfirmModal } from '../../components/ConfirmModal';
import { getFilterStats } from '../../utils/filterUtils';

interface FiltersSettingsViewProps {
    onBack: () => void;
    onToast: (type: ToastType, message: string) => void;
    filters: Filter[];
    onUpdateFilters: (filters: Filter[]) => void;
    logs: Log[];
    categories: Category[];
    scopes: Scope[];
    todos: TodoItem[];
    todoCategories: TodoCategory[];
    onEditLog?: (log: Log) => void;
}

export const FiltersSettingsView: React.FC<FiltersSettingsViewProps> = ({
    onBack,
    onToast,
    filters = [],
    onUpdateFilters,
    logs = [],
    categories = [],
    scopes = [],
    todos = [],
    todoCategories = [],
    onEditLog
}) => {
    const [selectedFilter, setSelectedFilter] = useState<Filter | null>(null);
    const [showAddFilterModal, setShowAddFilterModal] = useState(false);
    const [editingFilter, setEditingFilter] = useState<Filter | null>(null);
    const [filterName, setFilterName] = useState('');
    const [filterExpression, setFilterExpression] = useState('');
    const [deletingFilterId, setDeletingFilterId] = useState<string | null>(null);

    const handleAddFilter = () => {
        setEditingFilter(null);
        setFilterName('');
        setFilterExpression('');
        setShowAddFilterModal(true);
    };

    const handleEditFilter = (filter: Filter) => {
        setEditingFilter(filter);
        setFilterName(filter.name);
        setFilterExpression(filter.filterExpression);
        setShowAddFilterModal(true);
    };

    const handleDeleteFilter = (id: string) => {
        setDeletingFilterId(id);
    };

    const confirmDeleteFilter = () => {
        if (!deletingFilterId) return;
        const newFilters = filters.filter(f => f.id !== deletingFilterId);
        onUpdateFilters(newFilters);
        setDeletingFilterId(null);
        onToast('success', '筛选器已删除');
    };

    const handleSaveFilter = () => {
        if (!filterName.trim() || !filterExpression.trim()) {
            onToast('error', '请填写筛选器名称和表达式');
            return;
        }

        const newFilter: Filter = {
            id: editingFilter ? editingFilter.id : Date.now().toString(),
            name: filterName.trim(),
            filterExpression: filterExpression.trim(),
            createdAt: editingFilter ? editingFilter.createdAt : Date.now()
        };

        let newFilters = [...filters];
        if (editingFilter) {
            newFilters = newFilters.map(f => f.id === editingFilter.id ? newFilter : f);
        } else {
            newFilters.push(newFilter);
        }

        onUpdateFilters(newFilters);
        setShowAddFilterModal(false);
        onToast('success', editingFilter ? '筛选器已更新' : '筛选器已创建');
    };

    // 如果选中了筛选器,显示详情页
    if (selectedFilter) {
        return (
            <FilterDetailView
                filter={selectedFilter}
                logs={logs}
                categories={categories}
                scopes={scopes}
                todos={todos}
                todoCategories={todoCategories}
                onClose={() => setSelectedFilter(null)}
                onEditLog={onEditLog}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0">
                <button
                    onClick={onBack}
                    className="text-stone-400 hover:text-stone-600 p-1"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">自定义筛选器</span>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto pb-40">
                <div className="flex justify-end mb-2">
                    <button
                        onClick={handleAddFilter}
                        className="flex items-center gap-1 px-3 py-1.5 bg-stone-800 text-white text-xs font-bold rounded-lg hover:bg-stone-700 active:scale-95 transition-all"
                    >
                        <PlusCircle size={14} />
                        <span>新建</span>
                    </button>
                </div>

                {filters.length === 0 ? (
                    <div className="p-12 text-center text-stone-400 bg-white rounded-2xl shadow-sm">
                        <span className="text-4xl block mb-3 opacity-30 text-stone-800">※</span>
                        <p className="text-sm">还没有自定义筛选器</p>
                        <p className="text-xs mt-1">点击右上角"新建"创建第一个筛选器</p>
                    </div>
                ) : (
                    <div>
                        {filters.map((filter) => {
                            // 计算筛选统计
                            const stats = getFilterStats(
                                logs,
                                filter,
                                {
                                    categories: categories,
                                    scopes,
                                    todos,
                                    todoCategories
                                }
                            );

                            const hours = Math.floor(stats.totalDuration / 3600);
                            const minutes = Math.floor((stats.totalDuration % 3600) / 60);
                            const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                            return (
                                <div
                                    key={filter.id}
                                    className="bg-white rounded-2xl p-4 shadow-sm mb-3 hover:bg-stone-50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedFilter(filter)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-stone-800 font-bold text-base flex-shrink-0">※</span>
                                                <h4 className="font-bold text-stone-800 text-sm">{filter.name}</h4>
                                            </div>
                                            <p className="text-xs text-stone-500 font-mono break-all mb-2">
                                                {filter.filterExpression}
                                            </p>
                                            <div className="flex items-center gap-3 text-[10px] text-stone-400">
                                                <span>{stats.count} 条记录</span>
                                                <span>•</span>
                                                <span>{timeStr}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditFilter(filter);
                                                }}
                                                className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteFilter(filter.id);
                                                }}
                                                className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 新建/编辑筛选器 Modal */}
            {showAddFilterModal && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-stone-100">
                            <h3 className="font-bold text-lg text-stone-800">
                                {editingFilter ? '编辑筛选器' : '新建筛选器'}
                            </h3>
                            <button onClick={() => setShowAddFilterModal(false)} className="p-1 text-stone-400 hover:text-stone-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-stone-600 mb-1.5">筛选器名称</label>
                                <input
                                    type="text"
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400"
                                    placeholder="例如:瑜伽训练"
                                    value={filterName}
                                    onChange={e => setFilterName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-stone-600 mb-1.5">筛选表达式</label>
                                <input
                                    type="text"
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 font-mono outline-none focus:border-stone-400"
                                    placeholder="例如:瑜伽 OR 跑步 #运动 %健康 ^🌸"
                                    value={filterExpression}
                                    onChange={e => setFilterExpression(e.target.value)}
                                />
                                <p className="text-[10px] text-stone-400 mt-1.5">
                                    # 标签, % 领域, @ 代办, ^ Reaction, 无符号=备注, OR 表示"或"
                                </p>
                            </div>
                        </div>

                        <div className="p-4 border-t border-stone-100 flex justify-end gap-3">
                            <button
                                onClick={() => setShowAddFilterModal(false)}
                                className="px-4 py-2 text-sm font-bold text-stone-500 hover:bg-stone-100 rounded-xl transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSaveFilter}
                                className="px-6 py-2 text-sm font-bold text-white bg-stone-800 hover:bg-stone-700 rounded-xl shadow-md transition-colors"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 删除确认 Modal */}
            <ConfirmModal
                isOpen={!!deletingFilterId}
                onClose={() => setDeletingFilterId(null)}
                onConfirm={confirmDeleteFilter}
                title="删除筛选器"
                description="确定要删除这个筛选器吗?此操作无法撤销。"
                confirmText="删除"
                cancelText="取消"
                type="danger"
            />
        </div>
    );
};
