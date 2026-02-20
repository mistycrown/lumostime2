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
    theme?: any;
}

export const ImmersiveSelectorModal: React.FC<ImmersiveSelectorModalProps> = ({
    isOpen,
    onClose,
    title,
    options,
    selectedId,
    onSelect,
    theme
}) => {
    if (!isOpen) return null;

    const handleSelect = (id: string) => {
        onSelect(id);
        onClose();
    };

    // Default theme colors if not provided
    const modalBg = theme?.modalBg || 'rgba(30,41,59,0.95)';
    const modalBorder = theme?.modalBorder || 'rgba(255,255,255,0.1)';
    const textColor = theme?.buttonText || '#ffffff';
    const isDark = theme?.isDark !== false;

    return (
        <div 
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="backdrop-blur-xl rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
                style={{
                    width: '90vw',
                    maxWidth: '1000px',
                    height: 'auto',
                    maxHeight: '75vh',
                    minHeight: '200px',
                    backgroundColor: modalBg,
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: modalBorder
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div 
                    className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0"
                    style={{
                        borderColor: modalBorder,
                        backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)'
                    }}
                >
                    <h3 className="text-xl font-semibold" style={{ color: textColor }}>{title}</h3>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                        style={{
                            backgroundColor: theme?.buttonBg || 'rgba(255,255,255,0.1)',
                            color: textColor
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme?.buttonHoverBg || 'rgba(255,255,255,0.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme?.buttonBg || 'rgba(255,255,255,0.1)'}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Options Grid - Horizontal layout */}
                <div className="px-6 py-6 overflow-y-auto flex-1" style={{ maxHeight: 'calc(75vh - 60px)' }}>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {options.map((option) => {
                            const isSelected = selectedId === option.id;
                            // Use theme colors for selection, fallback to blue for non-themed items
                            const selectedBg = theme?.buttonText 
                                ? `${theme.buttonText}15` // 15 is hex for ~8% opacity
                                : 'rgba(59,130,246,0.2)';
                            const selectedBorder = theme?.buttonText || 'rgba(96,165,250,0.5)';
                            const selectedGlow = theme?.buttonText 
                                ? `0 0 20px ${theme.buttonText}33` // 33 is hex for ~20% opacity
                                : '0 0 20px rgba(59,130,246,0.2)';
                            
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleSelect(option.id)}
                                    className="relative px-5 py-2 rounded-lg border-2 transition-all"
                                    style={{
                                        backgroundColor: isSelected 
                                            ? selectedBg
                                            : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                        borderColor: isSelected 
                                            ? selectedBorder
                                            : modalBorder,
                                        color: textColor,
                                        boxShadow: isSelected ? selectedGlow : 'none'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
                                            e.currentTarget.style.borderColor = theme?.buttonBorder || 'rgba(255,255,255,0.2)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
                                            e.currentTarget.style.borderColor = modalBorder;
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-medium text-sm whitespace-nowrap">{option.name}</span>
                                        {isSelected && (
                                            <Check size={14} style={{ color: selectedBorder }} />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
