/**
 * @file ImagePreviewControls.tsx
 * @input Preview navigation, image transform, save, delete, and close actions
 * @output Image Preview Control Buttons
 * @pos Component (UI Controls)
 * @description Full-screen image preview toolbar shared by ImagePreviewModal.
 * @updated 2026-10-01: Added optional previous/next controls for grouped attachment previews.
 * @updated 2026-05-21: Added a shared download action and loading state so preview toolbars can save the current image without duplicating button logic.
 */
import React from 'react';
import { ChevronLeft, ChevronRight, Download, LoaderCircle, RotateCcw, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImagePreviewControlsProps {
  onPrevious?: () => void;
  onNext?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onReset?: () => void;
  onRotate?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onClose: () => void;
  showImageControls?: boolean;
  isDownloading?: boolean;
}

const buttonBaseClass = 'p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all [&>svg]:stroke-[2]';
const buttonStyle = {};
const iconStyle = {};

export const ImagePreviewControls: React.FC<ImagePreviewControlsProps> = ({
  onPrevious,
  onNext,
  onZoomIn,
  onZoomOut,
  onReset,
  onRotate,
  onDownload,
  onDelete,
  onClose,
  showImageControls = true,
  isDownloading = false
}) => {
  return (
    <div className="flex items-center gap-2">
      {onPrevious && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onPrevious();
          }}
          className={buttonBaseClass}
          style={buttonStyle}
          title="Previous image"
          aria-label="Previous image"
        >
          <ChevronLeft size={20} style={iconStyle} />
        </button>
      )}

      {onNext && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onNext();
          }}
          className={buttonBaseClass}
          style={buttonStyle}
          title="Next image"
          aria-label="Next image"
        >
          <ChevronRight size={20} style={iconStyle} />
        </button>
      )}

      {onDelete && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="mr-2 p-2 bg-black/40 hover:bg-red-500/80 text-white rounded-full transition-all [&>svg]:stroke-[2]"
          style={buttonStyle}
          title="Delete"
        >
          <Trash2 size={20} style={iconStyle} />
        </button>
      )}

      {onDownload && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            if (!isDownloading) {
              onDownload();
            }
          }}
          disabled={isDownloading}
          className={`${buttonBaseClass} ${isDownloading ? 'cursor-wait opacity-60' : ''}`}
          style={buttonStyle}
          title={isDownloading ? 'Saving' : 'Download'}
        >
          {isDownloading ? (
            <LoaderCircle size={20} style={iconStyle} className="animate-spin" />
          ) : (
            <Download size={20} style={iconStyle} />
          )}
        </button>
      )}

      {showImageControls && (
        <>
          {onZoomIn && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onZoomIn();
              }}
              className={buttonBaseClass}
              style={buttonStyle}
              title="Zoom In"
            >
              <ZoomIn size={20} style={iconStyle} />
            </button>
          )}

          {onZoomOut && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onZoomOut();
              }}
              className={buttonBaseClass}
              style={buttonStyle}
              title="Zoom Out"
            >
              <ZoomOut size={20} style={iconStyle} />
            </button>
          )}

          {onRotate && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onRotate();
              }}
              className={buttonBaseClass}
              style={buttonStyle}
              title="Rotate"
            >
              <RotateCcw size={20} style={iconStyle} />
            </button>
          )}
        </>
      )}

      <button
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className={`${buttonBaseClass} ml-2 hover:text-red-400`}
        style={buttonStyle}
        title="Close"
      >
        <X size={20} style={iconStyle} />
      </button>
    </div>
  );
};
