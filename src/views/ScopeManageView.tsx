/**
 * @file ScopeManageView.tsx
 * @input Scope List
 * @output Created/Updated/Archived Scopes
 * @pos View (Settings Sub-page)
 * @description A management interface for Scopes. Allows creating new scopes, renaming, changing icons, reordering, and archiving/restoring scopes.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState } from 'react';
import { Scope } from '../types';
import { ChevronLeft, Plus, Trash2, Archive, ArchiveRestore, GripVertical, ArrowUp, ArrowDown, X, Check } from 'lucide-react';
import { IconRenderer } from '../components/IconRenderer';

interface ScopeManageViewProps {
    scopes: Scope[];
    onUpdate: (scopes: Scope[]) => void;
    onBack: () => void;
}

export const ScopeManageView: React.FC<ScopeManageViewProps> = ({
    scopes,
    onUpdate,
    onBack
}) => {
    const [editingScopes, setEditingScopes] = useState<Scope[]>(JSON.parse(JSON.stringify(scopes)));
    const [showArchived, setShowArchived] = useState(false);

    const activeScopes = editingScopes.filter(s => !s.isArchived).sort((a, b) => a.order - b.order);
    const archivedScopes = editingScopes.filter(s => s.isArchived).sort((a, b) => a.order - b.order);

    const handleAddScope = () => {
        const newScope: Scope = {
            id: `scope_${Date.now()}`,
            name: '新领域',
            icon: '📁',
            description: '',
            isArchived: false,
            order: Math.max(...editingScopes.map(s => s.order), 0) + 1,
            enableFocusScore: false,
            themeColor: 'text-stone-600'
        };
        setEditingScopes([...editingScopes, newScope]);
    };

    const handleUpdateScope = (id: string, updates: Partial<Scope>) => {
        setEditingScopes(prev =>
            prev.map(s => s.id === id ? { ...s, ...updates } : s)
        );
    };

    const handleNameChange = (id: string, val: string) => {
        const firstChar = Array.from(val)[0] || '';
        const icon = firstChar;
        const name = val.slice(firstChar.length).trim();
        handleUpdateScope(id, { icon, name });
    };

    const handleDeleteScope = (id: string) => {
        setEditingScopes(prev => prev.filter(s => s.id !== id));
    };

    const handleArchiveScope = (id: string) => {
        handleUpdateScope(id, { isArchived: true });
    };

    const handleRestoreScope = (id: string) => {
        handleUpdateScope(id, { isArchived: false });
    };

    const handleSave = () => {
        onUpdate(editingScopes);
        onBack();
    };

    const moveScope = (index: number, direction: 'up' | 'down') => {
        const newScopes = [...activeScopes];
        if (direction === 'up' && index > 0) {
            [newScopes[index].order, newScopes[index - 1].order] = [newScopes[index - 1].order, newScopes[index].order];
        } else if (direction === 'down' && index < newScopes.length - 1) {
            [newScopes[index].order, newScopes[index + 1].order] = [newScopes[index + 1].order, newScopes[index].order];
        } else {
            return;
        }
        // Reconstruct full list preserving archived ones
        const activeIds = new Set(newScopes.map(s => s.id));
        const finalScopes = [
            ...newScopes,
            ...editingScopes.filter(s => !activeIds.has(s.id))
        ];
        setEditingScopes(finalScopes);
    };

    return (
        <div className="h-full bg-[#faf9f6] flex flex-col">
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-5 bg-[#fdfbf7] border-b border-stone-100 sticky top-0 z-20">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-stone-400 hover:text-stone-600 transition-colors"
                >
                    <X size={24} />
                </button>
                <h1 className="font-serif font-bold text-lg text-stone-800">Scope Management</h1>
                <button
                    onClick={handleSave}
                    className="p-2 -mr-2 text-stone-400 hover:text-stone-600 transition-colors"
                >
                    <Check size={24} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">

                {/* Add Button (Top) */}


                {/* Active Scopes */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider px-2">
                        活跃领域 ({activeScopes.length})
                    </h3>
                    {activeScopes.map((scope, index) => (
                        <div
                            key={scope.id}
                            className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
                        >
                            {/* Header Row */}
                            <div className="flex items-center gap-2 p-3 border-b border-stone-50 bg-stone-50/50">
                                <GripVertical size={18} className="text-stone-300 shrink-0" />

                                {/* Combined Input */}
                                <input
                                    type="text"
                                    value={`${scope.icon || ''}${scope.name}`}
                                    onChange={(e) => handleNameChange(scope.id, e.target.value)}
                                    className="bg-transparent font-bold text-stone-800 flex-1 outline-none placeholder:text-stone-300 min-w-0"
                                    placeholder="图标+名称"
                                />

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => moveScope(index, 'up')} disabled={index === 0} className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30">
                                        <ArrowUp size={16} />
                                    </button>
                                    <button onClick={() => moveScope(index, 'down')} disabled={index === activeScopes.length - 1} className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30">
                                        <ArrowDown size={16} />
                                    </button>
                                    <button onClick={() => handleArchiveScope(scope.id)} className="p-1 text-stone-300 hover:text-amber-500" title="归档">
                                        <Archive size={16} />
                                    </button>
                                    <button onClick={() => handleDeleteScope(scope.id)} className="p-1 text-stone-300 hover:text-red-500" title="删除">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-4 space-y-4">
                                {/* Description */}
                                <textarea
                                    value={scope.description || ''}
                                    onChange={(e) => handleUpdateScope(scope.id, { description: e.target.value })}
                                    className="w-full text-sm text-stone-600 bg-stone-50/50 rounded-lg px-3 py-2 outline-none focus:bg-stone-50 transition-colors resize-none border border-transparent focus:border-stone-200"
                                    placeholder="描述（可选）"
                                    rows={2}
                                />

                                {/* Focus Score Toggle */}
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-sm font-medium text-stone-600">启用专注度评分</label>
                                    <button
                                        onClick={() => handleUpdateScope(scope.id, { enableFocusScore: !scope.enableFocusScore })}
                                        className={`w-12 h-6 rounded-full p-1 transition-colors shrink-0 ${scope.enableFocusScore ? 'bg-stone-900' : 'bg-stone-200'
                                            }`}
                                    >
                                        <div
                                            className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${scope.enableFocusScore ? 'translate-x-6' : ''
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Archived Scopes */}
                {archivedScopes.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-stone-200">
                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className="text-sm font-bold text-stone-400 uppercase tracking-wider px-2 hover:text-stone-600 transition-colors flex items-center gap-2"
                        >
                            <span>{showArchived ? '▼' : '▶'}</span>
                            已归档 ({archivedScopes.length})
                        </button>
                        {showArchived && archivedScopes.map(scope => (
                            <div
                                key={scope.id}
                                className="bg-stone-50 rounded-2xl p-4 border border-stone-200 opacity-60"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <IconRenderer icon={scope.icon} className="text-xl" />
                                        <span className="font-bold text-stone-600">{scope.name}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleRestoreScope(scope.id)}
                                            className="p-2 text-stone-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                            title="恢复"
                                        >
                                            <ArchiveRestore size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteScope(scope.id)}
                                            className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="删除"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {/* Add Button (Bottom) */}
                <button
                    onClick={handleAddScope}
                    className="w-full py-2.5 border-2 border-dashed border-stone-200 rounded-2xl text-stone-400 text-sm font-bold hover:border-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus size={20} />
                    <span>添加新领域</span>
                </button>
            </div>
        </div>
    );
};
