/**
 * @file CustomSelect.tsx
 * @input value, options, onChange
 * @output Dropdown Select UI
 * @pos Component (Input)
 * @description A styled dropdown component supporting icons and custom labels, replacing native select elements.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useRef, useEffect } from 'react';
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
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value);

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
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`
                                    w-full px-4 py-3 flex items-center justify-between text-left transition-colors
                                    ${option.value === value ? 'bg-blue-50 text-blue-700' : 'text-stone-700 hover:bg-stone-50'}
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
