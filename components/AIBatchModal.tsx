import React, { useState, useEffect } from 'react';
import { Sparkles, X, AlertTriangle, Plus, Trash2, Wand2, CheckCircle2 } from 'lucide-react';
import { aiService, ParsedTimeEntry } from '../services/aiService';
import { Category } from '../types';

interface AIBatchModalProps {
    onClose: () => void;
    onSave: (entries: ParsedTimeEntry[]) => void;
    categories: Category[];
    targetDate?: Date;
}

type ParsedEntryWithId = ParsedTimeEntry & { _uiId: string };

// Helper to format Date to yyyyMMdd
const formatCompactDate = (iso: string) => {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
};

// Helper to format Time to HHmm
const formatCompactTime = (iso: string) => {
    const d = new Date(iso);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}${m}`;
};

interface ReviewCardProps {
    entry: ParsedEntryWithId;
    onUpdate: (field: keyof ParsedTimeEntry, value: any) => void;
    onDelete: () => void;
    categories: Category[];
}

const ReviewCard: React.FC<ReviewCardProps> = ({ entry, onUpdate, onDelete, categories }) => {
    const [dateStr, setDateStr] = useState(formatCompactDate(entry.startTime));
    const [startStr, setStartStr] = useState(formatCompactTime(entry.startTime));
    const [endStr, setEndStr] = useState(formatCompactTime(entry.endTime));

    // Internal state for category selection grid
    const [activeCatId, setActiveCatId] = useState(() => {
        const c = categories.find(c => c.name === entry.categoryName);
        return c ? c.id : categories[0]?.id;
    });

    // Sync input state if entry prop changes
    useEffect(() => {
        const c = categories.find(c => c.name === entry.categoryName);
        if (c) setActiveCatId(c.id);
    }, [entry.categoryName, categories]);

    const activeCategory = categories.find(c => c.id === activeCatId) || categories[0];

    const handleDateBlur = () => {
        if (dateStr.length === 8) {
            const y = parseInt(dateStr.slice(0, 4));
            const m = parseInt(dateStr.slice(4, 6)) - 1;
            const d = parseInt(dateStr.slice(6, 8));

            // Validate
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                const updateDate = (iso: string) => {
                    const date = new Date(iso);
                    date.setFullYear(y, m, d);
                    return date.toISOString();
                };
                onUpdate('startTime', updateDate(entry.startTime));
                onUpdate('endTime', updateDate(entry.endTime));
            }
        } else {
            // Reset if invalid
            setDateStr(formatCompactDate(entry.startTime));
        }
    };

    const handleTimeBlur = (field: 'startTime' | 'endTime', val: string) => {
        if (val.length === 4) {
            const h = parseInt(val.slice(0, 2));
            const m = parseInt(val.slice(2, 4));
            if (!isNaN(h) && !isNaN(m)) {
                const d = new Date(field === 'startTime' ? entry.startTime : entry.endTime);
                d.setHours(h, m);
                onUpdate(field, d.toISOString());
            }
        } else {
            // Reset
            if (field === 'startTime') setStartStr(formatCompactTime(entry.startTime));
            else setEndStr(formatCompactTime(entry.endTime));
        }
    };

    return (
        <div className="bg-white p-5 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-stone-100 relative group transition-all hover:shadow-lg hover:border-stone-200">


            <div className="space-y-6">
                {/* Date Input */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-stone-300 uppercase tracking-wider block">Date</label>
                        <button
                            onClick={onDelete}
                            className="text-stone-300 hover:text-red-500 p-1 -mr-1 rounded-full hover:bg-red-50 transition-colors"
                            title="Delete Entry"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                    <input
                        type="text"
                        maxLength={8}
                        value={dateStr}
                        onChange={(e) => setDateStr(e.target.value)}
                        onBlur={handleDateBlur}
                        className="w-full bg-stone-50 border-none rounded-lg px-3 py-2 text-sm font-bold text-stone-700 outline-none focus:ring-2 focus:ring-stone-200 transition-all font-mono"
                        placeholder="YYYYMMDD"
                    />
                </div>

                {/* Time Inputs */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-stone-300 uppercase tracking-wider mb-1 block">Start</label>
                        <input
                            type="text"
                            maxLength={4}
                            value={startStr}
                            onChange={(e) => setStartStr(e.target.value)}
                            onBlur={() => handleTimeBlur('startTime', startStr)}
                            className="w-full bg-stone-50 border-none rounded-lg px-3 py-2 text-sm font-bold text-stone-700 outline-none focus:ring-2 focus:ring-stone-200 transition-all font-mono"
                            placeholder="HHmm"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-stone-300 uppercase tracking-wider mb-1 block">End</label>
                        <input
                            type="text"
                            maxLength={4}
                            value={endStr}
                            onChange={(e) => setEndStr(e.target.value)}
                            onBlur={() => handleTimeBlur('endTime', endStr)}
                            className="w-full bg-stone-50 border-none rounded-lg px-3 py-2 text-sm font-bold text-stone-700 outline-none focus:ring-2 focus:ring-stone-200 transition-all font-mono"
                            placeholder="HHmm"
                        />
                    </div>
                </div>

                {/* Note */}
                <div>
                    <label className="text-[10px] font-bold text-stone-300 uppercase tracking-wider mb-1 block">Note</label>
                    <input
                        type="text"
                        value={entry.description}
                        onChange={(e) => onUpdate('description', e.target.value)}
                        className="w-full bg-transparent border-b border-stone-200 px-0 py-2 text-base font-medium text-stone-800 placeholder:text-stone-300 outline-none focus:border-stone-400 transition-all"
                        placeholder="Activity description..."
                    />
                </div>

                {/* Link Tag Section (Inline) */}
                <div className="pt-2">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 block">Associated Tag</span>
                    {/* Categories */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCatId(cat.id)}
                                className={`px-2 py-2 rounded-lg text-[10px] font-medium text-center border transition-colors truncate ${activeCatId === cat.id ? 'bg-stone-900 text-white border-stone-900' : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                    {/* Activities */}
                    <div className="grid grid-cols-4 gap-2">
                        {activeCategory?.activities.map(act => (
                            <button
                                key={act.id}
                                onClick={() => {
                                    onUpdate('categoryName', activeCategory.name);
                                    onUpdate('activityName', act.name);
                                }}
                                className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 active:scale-95 hover:bg-stone-50"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${entry.activityName === act.name ? 'ring-1 ring-stone-300 ring-offset-1 scale-110' : ''} ${act.color}`}>
                                    {act.icon}
                                </div>
                                <span className={`text-[10px] text-center font-medium leading-tight ${entry.activityName === act.name ? 'text-stone-900 font-bold' : 'text-stone-400'}`}>
                                    {act.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const AIBatchModal: React.FC<AIBatchModalProps> = ({ onClose, onSave, categories, targetDate }) => {
    const [step, setStep] = useState<'input' | 'review'>('input');
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [parsedEntries, setParsedEntries] = useState<ParsedEntryWithId[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleParse = async () => {
        if (!inputText.trim()) return;

        setIsLoading(true);
        setError(null);
        try {
            const baseDate = targetDate ? new Date(targetDate) : new Date();
            const entries = await aiService.parseNaturalLanguage(inputText, {
                now: baseDate.toString(),
                categories: categories
            });
            // Add UI IDs
            const entriesWithIds = entries.map(e => ({
                ...e,
                _uiId: crypto.randomUUID()
            }));
            setParsedEntries(entriesWithIds);
            setStep('review');
        } catch (e) {
            setError("Failed to generate schedule. Check API settings.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateEntry = (index: number, field: keyof ParsedTimeEntry, value: any) => {
        const newEntries = [...parsedEntries];
        newEntries[index] = { ...newEntries[index], [field]: value };
        setParsedEntries(newEntries);
    };

    const handleDeleteEntry = (index: number) => {
        setParsedEntries(parsedEntries.filter((_, i) => i !== index));
    };

    const handleAddEntry = () => {
        setParsedEntries([...parsedEntries, {
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(),
            description: 'New Activity',
            categoryName: categories[0]?.name || 'Uncategorized',
            activityName: '',
            _uiId: crypto.randomUUID()
        }]);
    };

    const handleConfirm = () => {
        // Strip UI IDs before saving
        const cleanEntries = parsedEntries.map(({ _uiId, ...rest }) => rest);
        onSave(cleanEntries);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#fdfbf7] w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-white/80 backdrop-blur sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                            <Sparkles size={16} />
                        </div>
                        <h2 className="font-bold text-stone-800 text-lg">AI Integration</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full text-stone-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#faf9f6]">
                    {step === 'input' ? (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
                                <textarea
                                    className="w-full min-h-[160px] text-base text-stone-700 placeholder:text-stone-300 outline-none resize-none font-medium leading-relaxed bg-transparent"
                                    placeholder="Describe your activity..."
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    autoFocus
                                />
                            </div>



                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-2">
                                    <AlertTriangle size={16} />
                                    {error}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 pb-20">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Review ({parsedEntries.length})</h3>
                                <button onClick={handleAddEntry} className="text-stone-600 text-xs font-bold flex items-center gap-1 hover:bg-stone-100 px-3 py-1.5 rounded-full transition-colors bg-white border border-stone-100">
                                    <Plus size={14} /> Add
                                </button>
                            </div>

                            <div className="space-y-4">
                                {parsedEntries.map((entry, idx) => (
                                    <ReviewCard
                                        key={entry._uiId}
                                        entry={entry}
                                        onUpdate={(field, val) => handleUpdateEntry(idx, field, val)}
                                        onDelete={() => handleDeleteEntry(idx)}
                                        categories={categories}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 bg-white border-t border-stone-100 shrink-0">
                    {step === 'input' ? (
                        <button
                            onClick={handleParse}
                            disabled={isLoading || !inputText.trim()}
                            className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-70 disabled:scale-100 shadow-xl shadow-stone-200"
                        >
                            {isLoading ? (
                                <>
                                    <Wand2 size={20} className="animate-spin" />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={20} className="text-purple-300" />
                                    <span>Generate</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('input')}
                                className="px-6 py-4 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold hover:bg-stone-50 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-1 py-4 bg-stone-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors shadow-xl shadow-stone-200"
                            >
                                <CheckCircle2 size={20} />
                                <span>Save All ({parsedEntries.length})</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
