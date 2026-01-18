import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, RotateCcw, Trash2, ImageOff } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ConfirmModal } from './ConfirmModal';

interface ImagePreviewModalProps {
    imageUrl: string | null | undefined;
    onClose: () => void;
    onDelete?: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ imageUrl, onClose, onDelete }) => {
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    
    // Treat null/undefined as "Closed"
    if (imageUrl === null || imageUrl === undefined) return null;

    const handleDeleteClick = () => {
        setIsDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        setIsDeleteConfirmOpen(false);
        onDelete?.();
    };

    const content = (
        <div
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center animate-fadeIn"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }}
        >
            <div
                className="relative w-full h-full flex items-center justify-center p-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Controls */}
                <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 z-50 flex items-center gap-2">
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick();
                            }}
                            className="p-2 bg-white/10 hover:bg-red-500/80 text-white rounded-full backdrop-blur-sm transition-colors mr-2"
                            title="Delete"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                    {imageUrl && (
                        <>
                            <button onClick={(e) => e.stopPropagation()} className="zoom-in-btn p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors">
                                <ZoomIn size={20} />
                            </button>
                            <button onClick={(e) => e.stopPropagation()} className="zoom-out-btn p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors">
                                <ZoomOut size={20} />
                            </button>
                            <button onClick={(e) => e.stopPropagation()} className="reset-btn p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors">
                                <RotateCcw size={20} />
                            </button>
                        </>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 bg-white/10 hover:bg-white/20 text-white hover:text-red-400 rounded-full backdrop-blur-sm transition-colors ml-2">
                        <X size={20} />
                    </button>
                </div>

                {imageUrl ? (
                    <TransformWrapper
                        initialScale={1}
                        minScale={0.2}
                        maxScale={5}
                        centerOnInit={true}
                        limitToBounds={false}
                    >
                        {({ zoomIn, zoomOut, resetTransform }) => (
                            <>
                                {/* Connect external buttons to TransformWrapper controls via Ref or Context is hard without ref. 
                                    Actually react-zoom-pan-pinch children render function provides these. 
                                    I need to move controls INSIDE this block. 
                                    My previous implementation was WRONG because controls were outside TransformWrapper?
                                    Wait, in Step 497 controls WERE inside.
                                    Here I moved them outside to handle "No Image" case.
                                    If No Image, I don't need Zoom controls.
                                    If Image, I need them.
                                    So I should structure it:
                                    If Image -> TransformWrapper -> Controls (inside) + Image
                                    If No Image -> Controls (Delete/Close) + Error Message
                                */}
                                <div className="absolute inset-0 pointer-events-none z-[60]">
                                    <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 z-50 flex items-center gap-2 pointer-events-auto">
                                        {onDelete && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteClick();
                                                }}
                                                className="p-2 bg-white/10 hover:bg-red-500/80 text-white rounded-full backdrop-blur-sm transition-colors mr-2"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                        <button onClick={() => zoomIn()} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors">
                                            <ZoomIn size={20} />
                                        </button>
                                        <button onClick={() => zoomOut()} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors">
                                            <ZoomOut size={20} />
                                        </button>
                                        <button onClick={() => resetTransform()} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors">
                                            <RotateCcw size={20} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 bg-white/10 hover:bg-white/20 text-white hover:text-red-400 rounded-full backdrop-blur-sm transition-colors ml-2">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full flex items-center justify-center">
                                    <img
                                        src={imageUrl}
                                        alt="Preview"
                                        className="max-w-none w-auto h-auto max-h-[90vh] object-contain shadow-2xl"
                                    />
                                </TransformComponent>
                            </>
                        )}
                    </TransformWrapper>
                ) : (
                    <div className="flex flex-col items-center justify-center text-white/50 animate-fadeIn">
                        <ImageOff size={48} className="mb-4" />
                        <p className="text-lg font-medium">Image not found</p>
                        <p className="text-sm mt-2 opacity-70">The file may have been deleted or not synced.</p>
                        <div className="mt-8 flex gap-4">
                            {onDelete && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick();
                                    }}
                                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/30 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Trash2 size={16} />
                                    <span>Delete Reference</span>
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.15s ease-out;
                }
            `}</style>
            
            {/* 删除确认模态框 */}
            <ConfirmModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="确认删除图片"
                description={imageUrl ? "确定要删除这张图片吗？此操作无法撤销！" : "确定要删除这个图片引用吗？"}
                confirmText="删除"
                cancelText="取消"
                type="danger"
            />
        </div>
    );

    return createPortal(content, document.body);
};
