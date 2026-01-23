import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

interface AITodoInputModalProps {
    onClose: () => void;
    onGenerate: (text: string) => void;
    isLoading?: boolean;
}

export const AITodoInputModal: React.FC<AITodoInputModalProps> = ({ onClose, onGenerate, isLoading = false }) => {
    const [text, setText] = useState('');

    const handleGenerate = () => {
        if (text.trim()) {
            onGenerate(text);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-serif">
            <div
                className="bg-[#faf9f6] w-full max-w-sm rounded-[2rem] shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col"
                style={{ maxHeight: '90vh' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-white">
                    <div className="flex items-center gap-2 text-stone-800">
                        <Sparkles size={18} className="text-stone-800" />
                        <h2 className="text-lg font-bold">AI Integration</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-50 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col bg-[#faf9f6]">
                    <div className="bg-white rounded-2xl p-4 shadow-sm flex-1 min-h-[200px] border border-stone-100 focus-within:ring-2 focus-within:ring-stone-200 transition-all flex flex-col">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Describe your activity..."
                            className="flex-1 w-full resize-none border-none outline-none bg-transparent text-stone-700 placeholder:text-stone-300 text-base leading-relaxed font-serif"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-2 bg-[#faf9f6]">
                    <button
                        onClick={handleGenerate}
                        disabled={!text.trim() || isLoading}
                        className={`
                            w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all
                            ${!text.trim() || isLoading
                                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                : 'bg-stone-900 text-white hover:bg-black active:scale-[0.98] shadow-stone-200'}
                        `}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Analyzing...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} />
                                <span>Generate</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
