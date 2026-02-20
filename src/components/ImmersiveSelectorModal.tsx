/**
 * @file ImmersiveSelectorModal.tsx
 * @input options, selected value, onSelect callback
 * @output Landscape-oriented selection modal
 * @pos Component (Modal)
 * @description A landscape modal for selecting themes or sounds in immersive mode
 */
import React from 'react';
import { X, Check } from 'lucide-react';

interface SelectorOption {
    id: string;
    name: string;
    icon?: string;
    description?: string;
}

interface ImmersiveSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    options: SelectorOption[];
    selectedId: string;
    onSelect: (id: string) => void;
}

export const ImmersiveSelectorModal: React.FC<ImmersiveSelectorModalProps> = ({
    isOpen,
    onClose,
    title,
    options,
    selectedId,
    onSelect
}) => {
    if (!isOpen) return null;

    const handleSelect = (id: string) => {
        onSelect(id);
        onClose();
    };

    return (
        <div 
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
                style={{
                    width: '90vw',
                    maxWidth: '1000px',
                    height: 'auto',
                    maxHeight: '40vh'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-slate-900/50 flex-shrink-0">
                    <h3 className="text-xl font-semibold text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Options Grid - Horizontal layout */}
                <div className="px-6 py-4 overflow-y-auto flex-1" style={{ maxHeight: 'calc(40vh - 60px)' }}>
                    <div className="grid grid-cols-6 gap-3">
                        {options.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => handleSelect(option.id)}
                                className={`relative px-4 py-3 rounded-xl border-2 transition-all ${
                                    selectedId === option.id
                                        ? 'bg-blue-500/20 border-blue-400/50 shadow-lg shadow-blue-500/20'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                }`}
                            >
                                <div className="flex flex-col items-center justify-center gap-1 text-center">
                                    <div className="font-medium text-white text-base whitespace-nowrap">{option.name}</div>
                                    {selectedId === option.id && (
                                        <div className="absolute top-2 right-2">
                                            <Check size={16} className="text-blue-400" />
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
