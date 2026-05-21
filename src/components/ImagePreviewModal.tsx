/**
 * @file ImagePreviewModal.tsx
 * @input imageUrl, onClose, onDelete, optional download filename hint
 * @output Full-screen image preview modal with zoom, rotate, delete, and download actions
 * @pos Component (Modal)
 * @description Shared full-screen image preview used across logs, timeline, gallery, and collection surfaces.
 * @updated 2026-05-21: Added a shared download/save action with toast feedback so every preview modal can save the current image to the device gallery or browser downloads.
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ImageOff } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { App } from '@capacitor/app';
import { ConfirmModal } from './ConfirmModal';
import { ImagePreviewControls } from './ImagePreviewControls';
import { useToast } from '../contexts/ToastContext';
import { saveImageFromUrl } from '../services/imageDownloadService';

interface ImagePreviewModalProps {
  imageUrl: string | null | undefined;
  onClose: () => void;
  onDelete?: () => void;
  downloadFilename?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  imageUrl,
  onClose,
  onDelete,
  downloadFilename
}) => {
  const { addToast } = useToast();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      return;
    }

    let backButtonListener: { remove: () => void } | undefined;

    const setupBackButton = async () => {
      try {
        backButtonListener = await App.addListener('backButton', () => {
          if (isDeleteConfirmOpen) {
            setIsDeleteConfirmOpen(false);
            return;
          }

          setRotation(0);
          onClose();
        });
      } catch (error) {
        console.log('[ImagePreviewModal] Not in Capacitor environment');
      }
    };

    setupBackButton();

    return () => {
      backButtonListener?.remove();
    };
  }, [imageUrl, onClose, isDeleteConfirmOpen]);

  if (imageUrl === null || imageUrl === undefined) {
    return null;
  }

  const handleDeleteClick = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    setIsDeleteConfirmOpen(false);
    onDelete?.();
  };

  const handleDownload = async () => {
    if (!imageUrl || isDownloading) {
      return;
    }

    setIsDownloading(true);
    try {
      const result = await saveImageFromUrl(imageUrl, downloadFilename);
      addToast(result.mode === 'native' ? 'success' : 'success', result.mode === 'native' ? '图片已保存到相册' : '图片已下载');
    } catch (error: any) {
      console.error('[ImagePreviewModal] Failed to save preview image', error);
      addToast('error', `保存失败：${error?.message || '请重试'}`);
    } finally {
      setIsDownloading(false);
    }
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
        {imageUrl ? (
          <TransformWrapper
            initialScale={1}
            minScale={0.2}
            maxScale={5}
            centerOnInit={true}
            limitToBounds={false}
          >
            {({ zoomIn, zoomOut }) => (
              <>
                <div className="absolute inset-0 pointer-events-none z-[60]">
                  <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 z-50 pointer-events-auto">
                    <ImagePreviewControls
                      onZoomIn={zoomIn}
                      onZoomOut={zoomOut}
                      onRotate={() => setRotation((current) => current - 90)}
                      onDownload={handleDownload}
                      onDelete={onDelete ? handleDeleteClick : undefined}
                      onClose={() => {
                        setRotation(0);
                        onClose();
                      }}
                      showImageControls={true}
                      isDownloading={isDownloading}
                    />
                  </div>
                </div>

                <TransformComponent
                  wrapperClass="w-full h-full !overflow-visible"
                  contentClass="w-full h-full flex items-center justify-center"
                >
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="max-w-none w-auto h-auto object-contain shadow-2xl transition-transform duration-200"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      maxHeight: Math.abs(rotation % 180) === 90 ? '90vw' : '90vh',
                      maxWidth: Math.abs(rotation % 180) === 90 ? '90vh' : '90vw'
                    }}
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
                  <span>Delete Reference</span>
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
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

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="确认删除图片"
        description={imageUrl ? '确定要删除这张图片吗？此操作无法撤销。' : '确定要删除这个图片引用吗？'}
        confirmText="删除"
        cancelText="取消"
        type="danger"
      />
    </div>
  );

  return createPortal(content, document.body);
};
