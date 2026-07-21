/**
 * @file CustomSelect.tsx
 * @updated 2026-07-21: Added semantic hooks for high-contrast dark-mode select states.
 * @description 自定义下拉选择组件 - 与应用主题风格一致
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  label?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  dropdownPosition?: 'auto' | 'top' | 'bottom'; // 新增：下拉框位置
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder = '请选择',
  className = '',
  disabled = false,
  dropdownPosition = 'auto'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldOpenUpward, setShouldOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // 检测下拉框应该向上还是向下展开
  useEffect(() => {
    if (isOpen && dropdownPosition === 'auto' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = Math.min(options.length * 40 + 16, 240); // 估算下拉框高度
      
      // 如果下方空间不足且上方空间更大，则向上展开
      setShouldOpenUpward(spaceBelow < dropdownHeight && spaceAbove > spaceBelow);
    } else if (dropdownPosition === 'top') {
      setShouldOpenUpward(true);
    } else if (dropdownPosition === 'bottom') {
      setShouldOpenUpward(false);
    }
  }, [isOpen, options.length, dropdownPosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && <label className="mb-2 block text-sm font-medium text-stone-700">{label}</label>}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          setIsOpen(!isOpen);
        }}
        disabled={disabled}
        className={`theme-select-trigger w-full rounded-xl border px-4 py-2 text-sm outline-none transition-all flex items-center justify-between text-left ${
          disabled
            ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
            : 'bg-stone-50 border-stone-200 hover:border-stone-300'
        }`}
      >
        <span className={`flex min-w-0 items-center gap-2 ${selectedOption && !disabled ? 'text-stone-900' : 'text-stone-400'}`}>
          {selectedOption?.icon && (
            <span className="shrink-0 flex items-center justify-center">
              {selectedOption.icon}
            </span>
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown 
          size={16} 
          className={`text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && !disabled && (
        <div 
          className={`absolute z-50 w-full bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in duration-200 ${
            shouldOpenUpward 
              ? 'bottom-full mb-1 slide-in-from-bottom-2' 
              : 'top-full mt-1 slide-in-from-top-2'
          }`}
        >
          <div className="max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(option.value);
                }}
                className={`w-full px-4 py-2.5 text-sm text-left hover:bg-stone-50 transition-colors flex items-center justify-between ${
                  option.value === value ? 'theme-select-option-selected font-bold' : 'text-stone-700'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {option.icon && (
                    <span className="shrink-0 flex items-center justify-center">
                      {option.icon}
                    </span>
                  )}
                  <span className="truncate">{option.label}</span>
                </span>
                {option.value === value && (
                  <Check size={16} className="theme-select-option-check" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
