/**
 * @file CustomSelect.tsx
 * @input value, options, onChange
 * @output Dropdown Select UI
 * @pos Component (Input)
 * @description A styled dropdown component supporting icons and custom labels, replacing native select elements.
 * Supports keyboard navigation (Arrow keys, Enter, Space, Escape, first letter search).
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface Option {
    value: string;
    label: string;
    icon?: React.ReactNode;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    disabled?: boolean;
    label?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    disabled = false,
    label
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const optionsRef = useRef<(HTMLButtonElement | null)[]>([]);

    // Close on click outside - optimized with useCallback
    const handleClickOutside = useCallback((event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen, handleClickOutside]);

    const selectedOption = options.find(o => o.value === value);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setHighlightedIndex(prev => {
                        const next = prev < options.length - 1 ? prev + 1 : 0;
                        optionsRef.current[next]?.scrollIntoView({ block: 'nearest' });
                        return next;
                    });
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setHighlightedIndex(prev => {
                        const next = prev > 0 ? prev - 1 : options.length - 1;
                        optionsRef.current[next]?.scrollIntoView({ block: 'nearest' });
                        return next;
                    });
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (highlightedIndex >= 0 && highlightedIndex < options.length) {
                        onChange(options[highlightedIndex].value);
                        setIsOpen(false);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    setIsOpen(false);
                    break;
                default:
                    // First letter navigation
                    if (e.key.length === 1) {
                        const letter = e.key.toLowerCase();
                        const startIndex = highlightedIndex + 1;
                        const foundIndex = options.findIndex((opt, idx) => 
                            idx >= startIndex && opt.label.toLowerCase().startsWith(letter)
                        );
                        if (foundIndex !== -1) {
                            setHighlightedIndex(foundIndex);
                            optionsRef.current[foundIndex]?.scrollIntoView({ block: 'nearest' });
                        } else {
                            // Wrap around search
                            const wrapIndex = options.findIndex(opt => 
                                opt.label.toLowerCase().startsWith(letter)
                            );
                            if (wrapIndex !== -1) {
                                setHighlightedIndex(wrapIndex);
                                optionsRef.current[wrapIndex]?.scrollIntoView({ block: 'nearest' });
                            }
                        }
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, highlightedIndex, options, onChange]);

    // Reset highlighted index when opening
    useEffect(() => {
        if (isOpen) {
            const currentIndex = options.findIndex(o => o.value === value);
            setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
        }
    }, [isOpen, value, options]);

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="text-xs font-bold text-stone-400 uppercase ml-1 mb-1 block">{label}</label>}

            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
                    w-full p-3 flex items-center justify-between
                    bg-stone-50 rounded-xl border transition-all
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:bg-stone-100 cursor-pointer'}
                    ${isOpen ? 'border-blue-500 ring-2 ring-blue-100 bg-white' : 'border-transparent hover:border-stone-200'}
                `}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedOption?.icon && <span className="text-stone-500">{selectedOption.icon}</span>}
                    <span className={`text-sm ${selectedOption ? 'text-stone-700 font-medium' : 'text-stone-400'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown
                    size={16}
                    className={`text-stone-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
                    <div className="max-h-60 overflow-y-auto py-1">
                        {options.map((option, index) => (
                            <button
                                key={option.value}
                                ref={el => optionsRef.current[index] = el}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                className={`
                                    w-full px-4 py-3 flex items-center justify-between text-left transition-colors
                                    ${option.value === value ? 'bg-blue-50 text-blue-700' : 
                                      index === highlightedIndex ? 'bg-stone-100 text-stone-800' : 
                                      'text-stone-700 hover:bg-stone-50'}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    {option.icon && <span className={option.value === value ? 'text-blue-500' : 'text-stone-400'}>{option.icon}</span>}
                                    <span className={`text-sm ${option.value === value ? 'font-bold' : 'font-medium'}`}>
                                        {option.label}
                                    </span>
                                </div>
                                {option.value === value && <Check size={16} className="text-blue-600" />}
                            </button>
                        ))}
                        {options.length === 0 && (
                            <div className="px-4 py-3 text-sm text-stone-400 text-center">
                                No options available
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Backdrop for mobile feel (optional, but helps focus) */}
            {isOpen && (
                <div className="fixed inset-0 z-40 bg-black/5 md:hidden" onClick={() => setIsOpen(false)} />
            )}
        </div>
    );
};
