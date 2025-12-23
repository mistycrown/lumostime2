/**
 * @file NarrativeStyleSelectionModal.tsx
 * @input onSelect callback
 * @output Narrative Style Grid
 * @pos Component (Modal)
 * @description Modal for selecting a narrative style template for AI summary generation.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Sparkles } from 'lucide-react';
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
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

    // Merge system and custom templates
    const allTemplates = [...NARRATIVE_TEMPLATES, ...customTemplates];

    // Initialize selection if needed
    useEffect(() => {
        if (isOpen && !selectedTemplateId && allTemplates.length > 0) {
            // Default to first template or keep it empty? 
            // Better to let user choose, or maybe default to 'default' (Therapy)
        }
    }, [isOpen]);

    const handleConfirm = () => {
        if (selectedTemplateId) {
            const template = allTemplates.find(t => t.id === selectedTemplateId);
            if (template) {
                onSelect(template);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#fdfbf7] w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-white/80 backdrop-blur sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                            <Sparkles size={16} />
                        </div>
                        <h2 className="font-bold text-stone-800 text-lg">选择叙事风格</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full text-stone-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content - 2 Column Grid Style */}
                <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar bg-[#faf9f6]">
                    <div className="grid grid-cols-2 gap-3">
                        {allTemplates.map((template) => {
                            const isSelected = selectedTemplateId === template.id;
                            return (
                                <button
                                    key={template.id}
                                    onClick={() => setSelectedTemplateId(template.id)}
                                    className={`
                                        text-center py-4 px-3 w-full group transition-all rounded-xl
                                        flex flex-row items-center justify-center gap-2
                                        ${isSelected
                                            ? 'bg-stone-100 text-stone-900 ring-1 ring-stone-400 scale-[1.02] z-10'
                                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-800'
                                        }
                                    `}
                                >
                                    {template.icon && <span className="text-lg">{template.icon}</span>}
                                    <span className={`text-sm font-bold truncate ${isSelected ? 'text-stone-900' : ''}`}>
                                        {template.title}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-stone-100 shrink-0 flex justify-end">
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedTemplateId}
                        className="px-6 py-2.5 bg-stone-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 shadow-lg shadow-stone-200"
                    >
                        <Sparkles size={14} className="text-purple-300" />
                        <span>开始生成</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
