/**
 * @file EmojiSettingsView.tsx
 * @description Emoji 和 Sticker 设置页面 - 管理心情日历的 emoji 组、emoji 渲染风格和 Selector 默认页
 */
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { IconRenderer } from '../../components/IconRenderer';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useSettings } from '../../contexts/SettingsContext';
import type { EmojiStyle } from '../../contexts/SettingsContext';
import { stickerService } from '../../services/stickerService';
import { RedemptionService } from '../../services/redemptionService';

// Emoji 预览组件 - 用于显示不同风格的 emoji
const EmojiPreview: React.FC<{ emoji: string; style: EmojiStyle }> = ({ emoji, style }) => {
    const emojiRef = useRef<HTMLSpanElement>(null);
    
    // 获取 emoji 的 Unicode codepoint（用于 CDN URL）
    const getEmojiCodepoint = (emoji: string): string => {
        const codePoints = [];
        for (const char of emoji) {
            const code = char.codePointAt(0);
            if (code !== undefined) {
                // 跳过变体选择器 (U+FE0F) 和零宽连接符 (U+200D)
                if (code !== 0xFE0F && code !== 0x200D) {
                    codePoints.push(code.toString(16));
                }
            }
        }
        return codePoints.join('-');
    };
    
    useEffect(() => {
        if (style !== 'native' && emojiRef.current) {
            const codepoint = getEmojiCodepoint(emoji);
            
            let imgSrc = '';
            if (style === 'twemoji') {
                imgSrc = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoint}.svg`;
            } else if (style === 'openmoji') {
                // OpenMoji 使用大写的 codepoint
                imgSrc = `https://cdn.jsdelivr.net/npm/openmoji@15.0.0/color/svg/${codepoint.toUpperCase()}.svg`;
            }
            
            // 创建图片元素
            const img = document.createElement('img');
            img.src = imgSrc;
            img.alt = emoji;
            img.draggable = false;
            img.style.width = '2rem';
            img.style.height = '2rem';
            img.style.verticalAlign = 'middle';
            img.style.display = 'inline-block';
            
            // 错误处理：如果图片加载失败，显示原生 emoji
            img.onerror = () => {
                if (emojiRef.current) {
                    emojiRef.current.innerHTML = emoji;
                    emojiRef.current.style.fontSize = '2rem';
                }
            };
            
            // 清空并插入图片
            emojiRef.current.innerHTML = '';
            emojiRef.current.appendChild(img);
        } else if (style === 'native' && emojiRef.current) {
            // 原生 emoji
            emojiRef.current.innerHTML = emoji;
            emojiRef.current.style.fontSize = '2rem';
        }
    }, [emoji, style]);
    
    return (
        <span 
            ref={emojiRef}
            className="inline-flex items-center justify-center"
        >
            {style === 'native' && emoji}
        </span>
    );
};

interface EmojiGroup {
    id: string;
    name: string;
    emojis: string[];  // 只存储 emoji 字符串数组
    isCustom: boolean;
}

// 预设的 emoji 组（最多15个emoji）
const PRESET_EMOJI_GROUPS: EmojiGroup[] = [
    {
        id: 'default-moods',
        name: '心情表情',
        isCustom: false,
        emojis: [
            '🤩', '🥰', '😎', '😊', '😌', '😐',
            '😴', '😰', '☹️', '😠', '🤢', '😖',
            '🤗', '😇', '🥳'
        ]
    },
    {
        id: 'activities',
        name: '活动符号',
        isCustom: false,
        emojis: [
            '📚', '💼', '🎨', '🎵', '🏃', '🧘',
            '🍳', '🎮', '📺', '✈️', '🛌', '☕',
            '🍕', '🎉', '💪'
        ]
    }
];

const MAX_EMOJIS_PER_GROUP = 15;

interface EmojiSettingsViewProps {
    onBack: () => void;
}

export const EmojiSettingsView: React.FC<EmojiSettingsViewProps> = ({ onBack }) => {
    const { emojiStyle, setEmojiStyle, defaultSelectorPage, setDefaultSelectorPage } = useSettings();
    
    // 验证状态
    const [isRedeemed, setIsRedeemed] = useState(false);
    const redemptionService = new RedemptionService();
    
    // 从 localStorage 读取设置
    const [selectedGroupId, setSelectedGroupId] = useState<string>(() => {
        return localStorage.getItem('lumostime_mood_emoji_group') || 'default-moods';
    });

    const [customGroups, setCustomGroups] = useState<EmojiGroup[]>(() => {
        const stored = localStorage.getItem('lumostime_custom_emoji_groups');
        return stored ? JSON.parse(stored) : [];
    });

    const [isCreating, setIsCreating] = useState(false);
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [isEditingPreset, setIsEditingPreset] = useState(false); // 标记是否在编辑预设组
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupEmojis, setNewGroupEmojis] = useState<string[]>([]);  // 只存储 emoji 字符串
    const [editingEmoji, setEditingEmoji] = useState<string>('');  // 当前正在编辑的 emoji
    const [editingEmojiIndex, setEditingEmojiIndex] = useState<number | null>(null); // 正在编辑的 emoji 索引
    const [deleteConfirmGroupId, setDeleteConfirmGroupId] = useState<string | null>(null);

    const allGroups = [...PRESET_EMOJI_GROUPS, ...customGroups];

    // 检查验证状态
    useEffect(() => {
        const checkVerification = async () => {
            const result = await redemptionService.isVerified();
            setIsRedeemed(result.isVerified);
        };
        checkVerification();
    }, []);

    // 保存选择的组
    const handleSelectGroup = (groupId: string) => {
        setSelectedGroupId(groupId);
        localStorage.setItem('lumostime_mood_emoji_group', groupId);
        // 触发事件通知其他组件
        window.dispatchEvent(new CustomEvent('moodEmojiGroupChanged', { detail: { groupId } }));
    };

    // 保存自定义组
    const saveCustomGroups = (groups: EmojiGroup[]) => {
        setCustomGroups(groups);
        localStorage.setItem('lumostime_custom_emoji_groups', JSON.stringify(groups));
    };

    // 创建新组
    const handleCreateGroup = () => {
        if (!newGroupName.trim() || newGroupEmojis.length === 0) return;

        if (editingGroupId && !isEditingPreset) {
            // 编辑自定义组：更新现有组
            const updated = customGroups.map(g => 
                g.id === editingGroupId 
                    ? { ...g, name: newGroupName.trim(), emojis: newGroupEmojis }
                    : g
            );
            saveCustomGroups(updated);
        } else {
            // 创建新组（包括从预设组编辑而来的）
            const newGroup: EmojiGroup = {
                id: `custom-${Date.now()}`,
                name: newGroupName.trim(),
                emojis: newGroupEmojis,
                isCustom: true
            };
            saveCustomGroups([...customGroups, newGroup]);
        }

        setIsCreating(false);
        setEditingGroupId(null);
        setIsEditingPreset(false);
        setNewGroupName('');
        setNewGroupEmojis([]);
    };

    // 开始编辑组
    const handleEditGroup = (group: EmojiGroup) => {
        setEditingGroupId(group.id);
        setIsEditingPreset(!group.isCustom); // 标记是否是预设组
        setNewGroupName(group.name);
        setNewGroupEmojis([...group.emojis]);
        setIsCreating(true);
    };

    // 取消编辑/创建
    const handleCancel = () => {
        setIsCreating(false);
        setEditingGroupId(null);
        setIsEditingPreset(false);
        setNewGroupName('');
        setNewGroupEmojis([]);
        setEditingEmoji('');
        setEditingEmojiIndex(null);
    };

    // 删除自定义组
    const handleDeleteGroup = (groupId: string) => {
        setDeleteConfirmGroupId(groupId);
    };

    const confirmDeleteGroup = () => {
        if (!deleteConfirmGroupId) return;
        
        const updated = customGroups.filter(g => g.id !== deleteConfirmGroupId);
        saveCustomGroups(updated);
        
        // 如果删除的是当前选中的组，切换到默认组
        if (selectedGroupId === deleteConfirmGroupId) {
            handleSelectGroup('default-moods');
        }
        
        setDeleteConfirmGroupId(null);
    };

    // 添加或更新 emoji
    const handleAddOrUpdateEmoji = () => {
        if (!editingEmoji.trim()) return;
        
        if (editingEmojiIndex !== null) {
            // 更新模式
            const updated = [...newGroupEmojis];
            updated[editingEmojiIndex] = editingEmoji;
            setNewGroupEmojis(updated);
        } else {
            // 添加模式 - 检查数量限制
            if (newGroupEmojis.length >= MAX_EMOJIS_PER_GROUP) {
                return; // 已达到最大数量，不添加
            }
            setNewGroupEmojis([...newGroupEmojis, editingEmoji]);
        }
        
        setEditingEmoji('');
        setEditingEmojiIndex(null);
    };

    // 开始编辑某个 emoji
    const handleStartEditEmoji = (index: number) => {
        setEditingEmojiIndex(index);
        setEditingEmoji(newGroupEmojis[index]);
    };

    // 移除 emoji
    const handleRemoveEmoji = (index: number) => {
        setNewGroupEmojis(newGroupEmojis.filter((_, i) => i !== index));
        // 如果正在编辑这个 emoji，取消编辑状态
        if (editingEmojiIndex === index) {
            setEditingEmoji('');
            setEditingEmojiIndex(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-stone-50 flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-white/80 backdrop-blur-md sticky top-0">
                <button
                    onClick={onBack}
                    className="text-stone-400 hover:text-stone-600 p-1"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">Emoji 和 Sticker</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">{/* 添加 pb-40 以避免底部内容被遮挡 */}
                {/* Emoji 渲染风格 */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-stone-700 mb-3">Emoji 渲染风格</h3>
                    <p className="text-xs text-stone-500 mb-4">选择应用中 emoji 的显示风格</p>
                    
                    <div className="space-y-2">
                        {[
                            { value: 'native', label: '原生 Emoji', desc: '使用系统默认的 emoji 样式', preview: ['😊', '❤️', '🎉', '🔥'] },
                            { value: 'twemoji', label: 'Twitter Emoji', desc: 'Twitter 的开源 emoji 设计', preview: ['😊', '❤️', '🎉', '🔥'] },
                            { value: 'openmoji', label: 'OpenMoji', desc: '开源的彩色 emoji 设计', preview: ['😊', '❤️', '🎉', '🔥'] }
                        ].map(style => (
                            <button
                                key={style.value}
                                onClick={() => setEmojiStyle(style.value as any)}
                                className={`w-full text-left p-3 rounded-lg border transition-all ${
                                    emojiStyle === style.value
                                        ? 'border-stone-400 bg-stone-50'
                                        : 'border-stone-200 hover:border-stone-300'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-bold text-stone-800">{style.label}</span>
                                    {emojiStyle === style.value && (
                                        <Check size={16} className="text-green-600" />
                                    )}
                                </div>
                                <p className="text-xs text-stone-500 mb-2">{style.desc}</p>
                                <div className="flex gap-2">
                                    {style.preview.map((emoji, idx) => (
                                        <EmojiPreview key={idx} emoji={emoji} style={style.value as any} />
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Selector 默认页 - 仅在已验证时显示 */}
                {isRedeemed && (
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <h3 className="text-sm font-bold text-stone-700 mb-3">Selector 默认页</h3>
                        <p className="text-xs text-stone-500 mb-4">选择打开心情选择器时默认显示的页面</p>
                        
                        <div className="space-y-2">
                            {/* Emoji 页选项 */}
                            <button
                                onClick={() => setDefaultSelectorPage('emoji')}
                                className={`w-full text-left p-3 rounded-lg border transition-all ${
                                    defaultSelectorPage === 'emoji'
                                        ? 'border-stone-400 bg-stone-50'
                                        : 'border-stone-200 hover:border-stone-300'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-stone-800">Emoji 页</span>
                                    {defaultSelectorPage === 'emoji' && (
                                        <Check size={16} className="text-green-600" />
                                    )}
                                </div>
                            </button>

                            {/* Sticker 页选项 */}
                            {stickerService.getAllStickerSets().map((stickerSet) => (
                                <button
                                    key={stickerSet.id}
                                    onClick={() => setDefaultSelectorPage(stickerSet.id)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                                        defaultSelectorPage === stickerSet.id
                                            ? 'border-stone-400 bg-stone-50'
                                            : 'border-stone-200 hover:border-stone-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-stone-800">{stickerSet.name}</span>
                                        {defaultSelectorPage === stickerSet.id && (
                                            <Check size={16} className="text-green-600" />
                                        )}
                                    </div>
                                    {stickerSet.description && (
                                        <p className="text-xs text-stone-500 mt-1">{stickerSet.description}</p>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Selector 图标组 */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-stone-700 mb-3">Selector 图标组</h3>
                    <p className="text-xs text-stone-500 mb-4">选择在 Selector 中显示的 emoji 组</p>

                    {/* 预设组 */}
                    <div className="space-y-2 mb-4">
                        {allGroups.map(group => (
                            <div
                                key={group.id}
                                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                                    selectedGroupId === group.id
                                        ? 'border-stone-400 bg-stone-50'
                                        : 'border-stone-200 hover:border-stone-300'
                                }`}
                                onClick={() => handleSelectGroup(group.id)}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-stone-800">{group.name}</span>
                                        {group.isCustom && (
                                            <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded">自定义</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedGroupId === group.id && (
                                            <Check size={16} className="text-green-600" />
                                        )}
                                        {/* 所有组都可以编辑 */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditGroup(group);
                                            }}
                                            className="p-1 hover:bg-blue-50 rounded transition-colors"
                                            title="编辑"
                                        >
                                            <Edit2 size={14} className="text-blue-500" />
                                        </button>
                                        {/* 只有自定义组可以删除 */}
                                        {group.isCustom && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteGroup(group.id);
                                                }}
                                                className="p-1 hover:bg-red-50 rounded transition-colors"
                                                title="删除"
                                            >
                                                <Trash2 size={14} className="text-red-500" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {group.emojis.slice(0, 10).map((emoji, idx) => (
                                        <span key={idx} className="text-lg">
                                            <IconRenderer icon={emoji} />
                                        </span>
                                    ))}
                                    {group.emojis.length > 10 && (
                                        <span className="text-xs text-stone-400 self-center">+{group.emojis.length - 10}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 创建新组按钮 */}
                    {!isCreating && (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-full py-2 border-2 border-dashed border-stone-300 rounded-lg text-stone-500 hover:border-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={16} />
                            <span className="text-sm font-medium">创建自定义组</span>
                        </button>
                    )}

                    {/* 创建/编辑组表单 */}
                    {isCreating && (
                        <div className="border border-stone-300 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-bold text-stone-700">
                                    {editingGroupId && !isEditingPreset ? '编辑 Emoji 组' : '创建 Emoji 组'}
                                </h4>
                                {isEditingPreset && (
                                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                        编辑预设组将创建为新的自定义组
                                    </span>
                                )}
                            </div>
                            
                            <input
                                type="text"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                placeholder="组名称..."
                                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm outline-none focus:border-stone-400"
                            />

                            {/* Emoji 列表 */}
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {newGroupEmojis.map((emoji, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleStartEditEmoji(idx)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                                        editingEmojiIndex === idx 
                                            ? 'bg-stone-100 ring-1 ring-stone-300' 
                                            : 'bg-stone-50 hover:bg-stone-100'
                                    }`}
                                >
                                    <span className="text-base leading-none flex items-center"><IconRenderer icon={emoji} /></span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveEmoji(idx);
                                        }}
                                        className="ml-0.5 p-0.5 hover:bg-red-50 rounded transition-colors"
                                        title="删除"
                                    >
                                        <Trash2 size={11} className="text-red-500" />
                                    </button>
                                </div>
                                    ))}
                                </div>

                                {/* 添加/编辑 emoji */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-stone-500 font-medium">
                                            {editingEmojiIndex !== null ? '编辑 Emoji' : '添加新 Emoji'}
                                        </p>
                                        <p className="text-xs text-stone-400">
                                            {newGroupEmojis.length}/{MAX_EMOJIS_PER_GROUP}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 items-stretch">
                                        <input
                                            type="text"
                                            value={editingEmoji}
                                            onChange={(e) => setEditingEmoji(e.target.value)}
                                            placeholder="😊"
                                            maxLength={4}
                                            className="flex-1 h-9 px-3 border border-stone-200 rounded-lg text-base outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 text-center transition-all"
                                            disabled={editingEmojiIndex === null && newGroupEmojis.length >= MAX_EMOJIS_PER_GROUP}
                                        />
                                        <button
                                            onClick={handleAddOrUpdateEmoji}
                                            disabled={!editingEmoji.trim() || (editingEmojiIndex === null && newGroupEmojis.length >= MAX_EMOJIS_PER_GROUP)}
                                            className="w-9 h-9 flex items-center justify-center bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            title={editingEmojiIndex !== null ? '更新' : '添加'}
                                        >
                                            <Check size={16} />
                                        </button>
                                        {editingEmojiIndex !== null && (
                                            <button
                                                onClick={() => {
                                                    setEditingEmoji('');
                                                    setEditingEmojiIndex(null);
                                                }}
                                                className="w-9 h-9 flex items-center justify-center bg-stone-200 text-stone-600 rounded-lg hover:bg-stone-300 transition-colors"
                                                title="取消"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                    {editingEmojiIndex === null && newGroupEmojis.length >= MAX_EMOJIS_PER_GROUP && (
                                        <p className="text-xs text-amber-600">已达到最大数量限制（{MAX_EMOJIS_PER_GROUP}个）</p>
                                    )}
                                </div>
                            </div>

                            {/* 操作按钮 */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCancel}
                                    className="flex-1 py-2 border border-stone-300 rounded-lg text-sm text-stone-600 hover:bg-stone-50"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleCreateGroup}
                                    disabled={!newGroupName.trim() || newGroupEmojis.length === 0}
                                    className="flex-1 py-2 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {editingGroupId && !isEditingPreset ? '保存' : '创建'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteConfirmGroupId !== null}
                title="删除 Emoji 组"
                description="确定要删除这个 emoji 组吗？此操作不可撤销。"
                onConfirm={confirmDeleteGroup}
                onClose={() => setDeleteConfirmGroupId(null)}
                confirmText="删除"
                cancelText="取消"
                type="danger"
            />
        </div>
    );
};
