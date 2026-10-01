/**
 * @file ImagePreviewModal.tsx
 * @input Legacy image URL, optional grouped image sources, current index, and preview actions
 * @output Full-screen image preview modal with grouped navigation, long-image reading, zoom, rotate, delete, and download actions
 * @pos Component (Modal)
 * @description Shared full-screen image preview used across logs, timeline, gallery, and collection surfaces.
 * @updated 2026-10-01: Added attachment-scoped swipe navigation, active-image actions, and width-fit vertical reading for long images.
 * @updated 2026-05-21: Added a shared download/save action with toast feedback so every preview modal can save the current image without duplicating button logic.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImageOff } from 'lucide-react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { App } from '@capacitor/app';
import { ConfirmModal } from './ConfirmModal';
import { ImagePreviewControls } from './ImagePreviewControls';
import {
  getInitialPreviewIndex,
  ImagePreviewInput,
  ImagePreviewItem,
  isLongPreviewImage,
  normalizeImagePreviewItems
} from './imagePreviewUtils';
import { useToast } from '../contexts/ToastContext';
import { saveImageFromUrl } from '../services/imageDownloadService';
import { imageService } from '../services/imageService';

interface ImagePreviewModalProps {
  imageUrl: string | null | undefined;
  images?: ImagePreviewInput[];
  initialIndex?: number;
  onClose: () => void;
  onDelete?: (item: ImagePreviewItem) => void;
  downloadFilename?: string;
}

interface ImageDimensions {
  width: number;
  height: number;
}

const isDirectImageUrl = (source: string): boolean => /^(blob:|data:|https?:)/i.test(source);

const getViewportSize = () => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }

  return {
    width: Math.max(0, window.innerWidth - 32),
    height: Math.max(0, window.innerHeight - 32)
  };
};

const ImageUnavailable: React.FC = () => (
  <div className="flex h-full w-full flex-col items-center justify-center px-8 text-center text-white/50 animate-fadeIn">
    <ImageOff size={48} className="mb-4" />
    <p className="text-lg font-medium">Image not found</p>
    <p className="mt-2 text-sm opacity-70">The file may have been deleted or not synced.</p>
  </div>
);

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  imageUrl,
  images,
  initialIndex,
  onClose,
  onDelete,
  downloadFilename
}) => {
  const { addToast } = useToast();
  const carouselRef = useRef<HTMLDivElement>(null);
  const zoomHandlersRef = useRef<{ zoomIn: () => void; zoomOut: () => void } | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [failedSources, setFailedSources] = useState<Set<string>>(() => new Set());
  const [imageDimensions, setImageDimensions] = useState<Record<string, ImageDimensions>>({});
  const [viewportSize, setViewportSize] = useState(getViewportSize);

  const previewItems = useMemo(
    () => normalizeImagePreviewItems(imageUrl, images, downloadFilename),
    [downloadFilename, imageUrl, images]
  );
  const isOpen = imageUrl !== null && imageUrl !== undefined;
  const previewItemsKey = previewItems
    .map((item) => `${item.source}\u0000${item.downloadFilename || ''}`)
    .join('\u0001');
  const sessionKey = `${imageUrl || ''}\u0002${initialIndex ?? 0}\u0002${previewItemsKey}`;
  const activeItem = previewItems[activeIndex];
  const activeImageUrl = activeItem ? resolvedUrls[activeItem.source] : undefined;
  const activeDimensions = activeItem ? imageDimensions[activeItem.source] : undefined;
  const isActiveLongImage = Boolean(
    activeDimensions && isLongPreviewImage(
      activeDimensions.width,
      activeDimensions.height,
      viewportSize.width,
      viewportSize.height
    )
  );
  const hasMultipleImages = previewItems.length > 1;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveIndex(getInitialPreviewIndex(initialIndex, previewItems.length));
    setRotation(0);
    zoomHandlersRef.current = null;
  }, [initialIndex, isOpen, previewItems.length, sessionKey]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleResize = () => setViewportSize(getViewportSize());
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !activeItem || resolvedUrls[activeItem.source] || failedSources.has(activeItem.source)) {
      return;
    }

    let isCurrent = true;
    const source = activeItem.source;

    const resolveImageUrl = async () => {
      try {
        const url = isDirectImageUrl(source) ? source : await imageService.getImageUrl(source, 'original');
        if (!isCurrent) {
          return;
        }

        if (url) {
          setResolvedUrls((current) => ({ ...current, [source]: url }));
        } else {
          setFailedSources((current) => new Set(current).add(source));
        }
      } catch (error) {
        if (isCurrent) {
          console.error('[ImagePreviewModal] Failed to resolve preview image', error);
          setFailedSources((current) => new Set(current).add(source));
        }
      }
    };

    void resolveImageUrl();
    return () => {
      isCurrent = false;
    };
  }, [activeItem, failedSources, isOpen, resolvedUrls]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setRotation(0);
    zoomHandlersRef.current = null;
  }, [activeIndex, isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !carouselRef.current) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const carousel = carouselRef.current;
      if (carousel) {
        carousel.scrollLeft = carousel.clientWidth * activeIndex;
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeIndex, isOpen, sessionKey]);

  useEffect(() => {
    if (!isOpen || !hasMultipleImages) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && activeIndex > 0) {
        event.preventDefault();
        setActiveIndex((current) => current - 1);
      }

      if (event.key === 'ArrowRight' && activeIndex < previewItems.length - 1) {
        event.preventDefault();
        setActiveIndex((current) => current + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, hasMultipleImages, isOpen, previewItems.length]);

  useEffect(() => {
    if (!isOpen) {
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

    void setupBackButton();

    return () => {
      backButtonListener?.remove();
    };
  }, [isDeleteConfirmOpen, isOpen, onClose]);

  const changeActiveIndex = useCallback((nextIndex: number) => {
    setActiveIndex(getInitialPreviewIndex(nextIndex, previewItems.length));
  }, [previewItems.length]);

  const handleCarouselScroll = () => {
    const carousel = carouselRef.current;
    if (!carousel || carousel.clientWidth === 0) {
      return;
    }

    const nextIndex = getInitialPreviewIndex(Math.round(carousel.scrollLeft / carousel.clientWidth), previewItems.length);
    setActiveIndex((current) => current === nextIndex ? current : nextIndex);
  };

  const handleImageLoad = (source: string, event: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalHeight, naturalWidth } = event.currentTarget;
    if (naturalWidth <= 0 || naturalHeight <= 0) {
      return;
    }

    setImageDimensions((current) => (
      current[source]?.width === naturalWidth && current[source]?.height === naturalHeight
        ? current
        : { ...current, [source]: { width: naturalWidth, height: naturalHeight } }
    ));
  };

  const handleDeleteClick = () => {
    if (activeItem) {
      setIsDeleteConfirmOpen(true);
    }
  };

  const handleConfirmDelete = () => {
    if (!activeItem) {
      return;
    }

    setIsDeleteConfirmOpen(false);
    onDelete?.(activeItem);
  };

  const handleDownload = async () => {
    if (!activeImageUrl || isDownloading) {
      return;
    }

    setIsDownloading(true);
    try {
      const preferredFilename = activeItem?.downloadFilename
        || (activeItem && !isDirectImageUrl(activeItem.source) ? activeItem.source : undefined)
        || downloadFilename;
      const result = await saveImageFromUrl(activeImageUrl, preferredFilename);
      addToast('success', result.mode === 'native' ? '图片已保存到相册' : '图片已下载');
    } catch (error: any) {
      console.error('[ImagePreviewModal] Failed to save preview image', error);
      addToast('error', `保存失败：${error?.message || '请重试'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 animate-fadeIn"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        className="relative h-full w-full overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          ref={carouselRef}
          className={`flex h-full w-full overflow-x-auto overflow-y-hidden scrollbar-hide ${hasMultipleImages ? 'snap-x snap-mandatory' : ''}`}
          onScroll={handleCarouselScroll}
        >
          {previewItems.length > 0 ? previewItems.map((item, index) => {
            const resolvedUrl = resolvedUrls[item.source];
            const dimensions = imageDimensions[item.source];
            const isLongImage = Boolean(
              dimensions && isLongPreviewImage(
                dimensions.width,
                dimensions.height,
                viewportSize.width,
                viewportSize.height
              )
            );
            const isUnavailable = failedSources.has(item.source);

            return (
              <div
                key={`${item.source}-${index}`}
                className={`h-full w-full shrink-0 ${hasMultipleImages ? 'snap-center snap-always' : ''}`}
                aria-hidden={index !== activeIndex}
              >
                {isUnavailable ? (
                  <ImageUnavailable />
                ) : !resolvedUrl ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
                  </div>
                ) : isLongImage ? (
                  <div
                    className="h-full w-full overflow-y-auto overscroll-contain px-4 pb-4 pt-[calc(4.5rem+var(--app-safe-area-top))]"
                    style={{ touchAction: 'pan-x pan-y' }}
                  >
                    <img
                      src={resolvedUrl}
                      alt={`Preview ${index + 1}`}
                      className="mx-auto block h-auto w-full max-w-full shadow-2xl"
                      onLoad={(event) => handleImageLoad(item.source, event)}
                    />
                  </div>
                ) : (
                  <TransformWrapper
                    key={`${item.source}-${activeIndex}`}
                    initialScale={1}
                    minScale={0.2}
                    maxScale={5}
                    centerOnInit={true}
                    limitToBounds={false}
                    panning={{ disabled: hasMultipleImages }}
                  >
                    {({ zoomIn, zoomOut }) => {
                      if (index === activeIndex) {
                        zoomHandlersRef.current = { zoomIn, zoomOut };
                      }

                      return (
                        <TransformComponent
                          wrapperClass="w-full h-full !overflow-visible"
                          contentClass="w-full h-full flex items-center justify-center p-4"
                        >
                          <img
                            src={resolvedUrl}
                            alt={`Preview ${index + 1}`}
                            className="max-w-none h-auto w-auto object-contain shadow-2xl transition-transform duration-200"
                            style={{
                              transform: `rotate(${rotation}deg)`,
                              maxHeight: Math.abs(rotation % 180) === 90 ? '90vw' : '90vh',
                              maxWidth: Math.abs(rotation % 180) === 90 ? '90vh' : '90vw'
                            }}
                            onLoad={(event) => handleImageLoad(item.source, event)}
                          />
                        </TransformComponent>
                      );
                    }}
                  </TransformWrapper>
                )}
              </div>
            );
          }) : (
            <ImageUnavailable />
          )}
        </div>

        <div className="pointer-events-none absolute inset-0 z-[60]">
          <div className="pointer-events-auto absolute right-4 top-[calc(1rem+var(--app-safe-area-top))] z-50">
            <ImagePreviewControls
              onPrevious={hasMultipleImages && activeIndex > 0 ? () => changeActiveIndex(activeIndex - 1) : undefined}
              onNext={hasMultipleImages && activeIndex < previewItems.length - 1 ? () => changeActiveIndex(activeIndex + 1) : undefined}
              onZoomIn={!isActiveLongImage && activeImageUrl ? () => zoomHandlersRef.current?.zoomIn() : undefined}
              onZoomOut={!isActiveLongImage && activeImageUrl ? () => zoomHandlersRef.current?.zoomOut() : undefined}
              onRotate={!isActiveLongImage && activeImageUrl ? () => setRotation((current) => current - 90) : undefined}
              onDownload={activeImageUrl ? handleDownload : undefined}
              onDelete={onDelete ? handleDeleteClick : undefined}
              onClose={() => {
                setRotation(0);
                onClose();
              }}
              showImageControls={!isActiveLongImage && Boolean(activeImageUrl)}
              isDownloading={isDownloading}
            />
          </div>

          {hasMultipleImages && (
            <div className="pointer-events-auto absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs tabular-nums text-white/85">
              {activeIndex + 1} / {previewItems.length}
            </div>
          )}
        </div>
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
        description={activeItem ? '确定要删除这张图片吗？此操作无法撤销。' : '确定要删除这个图片引用吗？'}
        confirmText="删除"
        cancelText="取消"
        type="danger"
      />
    </div>
  );

  return createPortal(content, document.body);
};
