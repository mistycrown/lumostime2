import React, { useState } from 'react';
import { ChevronLeft, Nfc, Crosshair, Tag, Search, Trash2 } from 'lucide-react';
import { ToastType } from '../../components/Toast';
import { Category } from '../../types';
import { NfcService } from '../../services/NfcService';
import { CustomSelect } from '../../components/CustomSelect';

interface NFCSettingsViewProps {
    onBack: () => void;
    onToast: (type: ToastType, message: string) => void;
    categories: Category[];
}

export const NFCSettingsView: React.FC<NFCSettingsViewProps> = ({
    onBack,
    onToast,
    categories
}) => {
    const [isWritingNfc, setIsWritingNfc] = useState(false);
    const [nfcSelectedCatId, setNfcSelectedCatId] = useState<string>('');
    const [nfcSelectedActId, setNfcSelectedActId] = useState<string>('');

    const handleWriteNfc = async (uri: string) => {
        setIsWritingNfc(true);
        try {
            const success = await NfcService.writeTag(uri);
            if (success) {
                onToast('success', 'NFC Tag Written Successfully!');
            }
        } catch (e: any) {
            console.error(e);
            if (e.message && e.message.includes('Session stopped')) {
                // Cancelled
            } else {
                onToast('error', 'Write Failed: ' + (e.message || 'Unknown'));
            }
        } finally {
            setIsWritingNfc(false);
        }
    };

    const handleCancelNfc = async () => {
        await NfcService.cancelWrite();
        setIsWritingNfc(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
                <button
                    onClick={onBack}
                    className="text-stone-400 hover:text-stone-600 p-1"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">NFC Tags</span>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6 pb-40 space-y-6">
                {isWritingNfc ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-lg border border-stone-100 animate-in fade-in zoom-in">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <Nfc size={40} className="text-blue-500" />
                        </div>
                        <h3 className="text-xl font-bold text-stone-800 mb-2">Ready to Scan</h3>
                        <p className="text-stone-500 text-center mb-8">
                            Hold your phone near an NFC tag to write.
                        </p>
                        <button
                            onClick={handleCancelNfc}
                            className="px-8 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold active:scale-95 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Quick Actions */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                    <Crosshair size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-stone-800">快速打卡 (Quick Punch)</h3>
                                    <p className="text-xs text-stone-400">Write a tag to instantly record a "Quick Punch".</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleWriteNfc("lumostime://record?action=quick_punch")}
                                className="w-full py-3 bg-stone-800 text-white rounded-xl font-bold shadow-lg shadow-stone-200 active:scale-[0.98] transition-all"
                            >
                                Write Quick Punch Tag
                            </button>
                        </div>

                        {/* Specific Activity */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <Tag size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-stone-800">指定活动 (Start Activity)</h3>
                                    <p className="text-xs text-stone-400">Write a tag to start a specific activity.</p>
                                </div>
                            </div>

                            {/* Category Select */}
                            <CustomSelect
                                label="Category (活动分类)"
                                placeholder="Select Category..."
                                value={nfcSelectedCatId}
                                onChange={(val) => {
                                    setNfcSelectedCatId(val);
                                    setNfcSelectedActId('');
                                }}
                                options={categories?.map((cat: any) => ({
                                    value: cat.id,
                                    label: cat.name,
                                    icon: <span className="text-lg">{cat.icon}</span>
                                })) || []}
                            />

                            {/* Activity Select */}
                            <CustomSelect
                                label="Activity (具体活动)"
                                placeholder="Select Activity..."
                                value={nfcSelectedActId}
                                onChange={(val) => setNfcSelectedActId(val)}
                                disabled={!nfcSelectedCatId}
                                options={
                                    categories
                                        ?.find((c: any) => c.id === nfcSelectedCatId)
                                        ?.activities.map((act: any) => ({
                                            value: act.id,
                                            label: act.name,
                                            icon: <span className="text-lg">{act.icon}</span>
                                        })) || []
                                }
                            />

                            <button
                                disabled={!nfcSelectedCatId || !nfcSelectedActId}
                                onClick={() => handleWriteNfc(`lumostime://record?action=start&cat_id=${nfcSelectedCatId}&act_id=${nfcSelectedActId}`)}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                Write Activity Tag
                            </button>
                        </div>

                        {/* Read/Test Tag */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 border border-stone-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                                    <Search size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-stone-800">读取测试 (Read / Test)</h3>
                                    <p className="text-xs text-stone-400">Scan a tag to see its content.</p>
                                </div>
                            </div>
                            <div className="p-4 bg-stone-50 rounded-xl text-xs text-stone-500 text-center border border-dashed border-stone-200">
                                Hold phone near ANY tag to read it. <br />
                                (Check Toast message for result)
                            </div>
                        </div>

                        {/* Clear Tag */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 border border-red-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                                    <Trash2 size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-stone-800">Clear Tag (Format)</h3>
                                    <p className="text-xs text-stone-400">Remove all data from a tag.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleWriteNfc("lumostime://clear")}
                                className="w-full py-3 bg-red-50 text-red-500 border border-red-100 rounded-xl font-bold active:scale-[0.98] transition-all"
                            >
                                Erase Tag Content
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

