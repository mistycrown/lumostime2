import React from 'react';
import { X } from 'lucide-react';
import { NarrativeTemplate } from '../types';
import { NARRATIVE_TEMPLATES } from '../constants';

interface NarrativeStyleSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (template: NarrativeTemplate) => void;
    customTemplates?: NarrativeTemplate[];
}

export const NarrativeStyleSelectionModal: React.FC<NarrativeStyleSelectionModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    customTemplates = []
}) => {
    if (!isOpen) return null;

    // Merge system and custom templates
    const allTemplates = [...NARRATIVE_TEMPLATES, ...customTemplates];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#fcfaf7] rounded-3xl w-full max-w-sm shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 overflow-hidden font-serif border-y-4 border-stone-900">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between shrink-0 border-b border-stone-200">
                    <h2 className="text-lg font-bold tracking-tight text-stone-900">选择叙事风格</h2>
                    <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-900 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Compact Newspaper List Style */}
                <div className="overflow-y-auto px-6 py-2">
                    <div className="flex flex-col">
                        {allTemplates.map((template, index) => (
                            <button
                                key={template.id}
                                onClick={() => onSelect(template)}
                                className={`
                                    text-center py-4 w-full group transition-colors hover:bg-white/50
                                    ${index !== allTemplates.length - 1 ? 'border-b border-stone-200' : ''}
                                `}
                            >
                                <div className="flex items-center justify-center w-full">
                                    <span className="text-base font-bold text-stone-800 group-hover:text-stone-600 transition-colors">
                                        {/* Inline Rendering: Icon + Title */}
                                        {template.icon && <span className="mr-2">{template.icon}</span>}
                                        {template.title}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer Spacer */}
                <div className="h-4 shrink-0"></div>
            </div>
        </div>
    );
};
