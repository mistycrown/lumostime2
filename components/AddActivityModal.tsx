/**
 * @file AddActivityModal.tsx
 * @input categoryId
 * @output Activity Creation Form
 * @pos Component (Modal)
 * @description A modal form for creating a new activity within a specific category, including icon and color selection.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { CATEGORIES } from '../constants';
import { Activity } from '../types';

interface AddActivityModalProps {
    categoryId: string;
    onClose: () => void;
    onSave: (name: string, icon: string, color: string) => void;
}

const COLORS = [
    'bg-stone-100 text-stone-600',
    'bg-orange-100 text-orange-600',
    'bg-blue-100 text-blue-600',
    'bg-green-100 text-green-600',
    'bg-purple-100 text-purple-600',
    'bg-pink-100 text-pink-600',
    'bg-yellow-100 text-yellow-600',
    'bg-red-100 text-red-600',
];

const ICONS = ['⚡', '📚', '💪', '🧘', '🎨', '🎵', '🍳', '🧹', '💤', '💻', '🎮', '🎬', '🚗', '🛒', '💊', '🚿'];

export const AddActivityModal: React.FC<AddActivityModalProps> = ({ categoryId, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);

    const categoryName = CATEGORIES.find(c => c.id === categoryId)?.name || 'Category';

    const handleSave = () => {
        if (!name.trim()) return;
        onSave(name.trim(), selectedIcon, selectedColor);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#faf9f6] w-full md:w-[400px] md:rounded-3xl rounded-t-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-10 duration-300">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-white/50">
                    <button onClick={onClose} className="p-2 -ml-2 hover:bg-stone-100 rounded-full text-stone-500 transition-colors">
                        <X size={24} />
                    </button>
                    <span className="font-bold text-lg text-stone-800">New Activity</span>
                    <div className="w-10"></div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 no-scrollbar">

                    {/* Preview */}
                    <div className="flex flex-col items-center justify-center py-4">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-sm mb-3 transition-colors ${selectedColor}`}>
                            {selectedIcon}
                        </div>
                        <span className="text-sm font-medium text-stone-400">
                            Adding to <span className="text-stone-800 font-bold">{categoryName}</span>
                        </span>
                    </div>

                    {/* Name Input */}
                    <div>
                        <label className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 block">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Activity Name"
                            className="w-full bg-white border border-stone-200 rounded-xl p-4 text-stone-900 text-lg font-bold focus:outline-none focus:ring-1 focus:ring-stone-900 placeholder:text-stone-300 font-serif"
                            autoFocus
                        />
                    </div>

                    {/* Icon Selection */}
                    <div>
                        <label className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 block">Icon</label>
                        <div className="grid grid-cols-8 gap-2">
                            {ICONS.map(icon => (
                                <button
                                    key={icon}
                                    onClick={() => setSelectedIcon(icon)}
                                    className={`aspect-square rounded-lg flex items-center justify-center text-xl hover:bg-stone-100 transition-colors ${selectedIcon === icon ? 'bg-stone-200' : ''}`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Selection */}
                    <div>
                        <label className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 block">Color</label>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                            {COLORS.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setSelectedColor(color)}
                                    className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center transition-transform ${color} ${selectedColor === color ? 'ring-2 ring-stone-900 ring-offset-2' : ''}`}
                                >
                                    {selectedColor === color && <Check size={16} />}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 bg-white border-t border-stone-100">
                    <button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="w-full bg-stone-900 disabled:bg-stone-300 text-white py-4 rounded-xl font-bold text-lg shadow-xl active:scale-[0.99] transition-all hover:bg-black"
                    >
                        Create Activity
                    </button>
                </div>

            </div>
        </div>
    );
};
