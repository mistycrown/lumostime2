import React from 'react';
import { X, Sparkles, User, FileText } from 'lucide-react';
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
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-stone-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 text-stone-700">
                        <Sparkles className="text-purple-500" size={20} />
                        <h2 className="text-lg font-bold">选择叙事风格</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-50 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {allTemplates.map(template => (
                            <button
                                key={template.id}
                                onClick={() => onSelect(template)}
                                className="flex flex-col items-start text-left p-4 rounded-xl border border-stone-200 hover:border-purple-300 hover:bg-purple-50/30 hover:shadow-sm transition-all group"
                            >
                                <div className="flex items-center justify-between w-full mb-2">
                                    <div className="flex items-center gap-2">
                                        {template.isCustom ? (
                                            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                                                <User size={16} />
                                            </div>
                                        ) : (
                                            <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                                                <Sparkles size={16} />
                                            </div>
                                        )}
                                        <h3 className="font-bold text-stone-700 group-hover:text-purple-700 transition-colors">
                                            {template.title}
                                        </h3>
                                    </div>
                                    {template.isCustom && (
                                        <span className="text-[10px] uppercase font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                                            Custom
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed">
                                    {template.description}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
