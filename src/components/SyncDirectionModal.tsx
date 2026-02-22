/**
 * @file SyncDirectionModal.tsx
 * @description 同步方向选择模态框 - 用于手动同步模式
 */
import React from 'react';
import { Upload, Download, X } from 'lucide-react';

interface SyncDirectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: () => void;
    onDownload: () => void;
}

export const SyncDirectionModal: React.FC<SyncDirectionModalProps> = ({
    isOpen,
    onClose,
    onUpload,
    onDownload
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-100">
                    <h3 className="text-lg font-bold text-stone-800">选择同步方向</h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                    <p className="text-sm text-stone-500 mb-4">
                        请选择要执行的同步操作：
                    </p>

                    {/* Upload Button */}
                    <button
                        onClick={() => {
                            onUpload();
                            onClose();
                        }}
                        className="w-full flex items-center gap-3 p-4 bg-stone-50 hover:bg-stone-100 rounded-xl transition-colors group"
                    >
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <Upload size={20} className="text-blue-600" />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-bold text-stone-800">上传到云端</div>
                            <div className="text-xs text-stone-500 mt-0.5">将本地数据上传至云端</div>
                        </div>
                    </button>

                    {/* Download Button */}
                    <button
                        onClick={() => {
                            onDownload();
                            onClose();
                        }}
                        className="w-full flex items-center gap-3 p-4 bg-stone-50 hover:bg-stone-100 rounded-xl transition-colors group"
                    >
                        <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                            <Download size={20} className="text-green-600" />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-bold text-stone-800">从云端下载</div>
                            <div className="text-xs text-stone-500 mt-0.5">从云端下载数据到本地</div>
                        </div>
                    </button>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-stone-100">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 text-sm font-medium text-stone-600 hover:text-stone-800 transition-colors"
                    >
                        取消
                    </button>
                </div>
            </div>
        </div>
    );
};
