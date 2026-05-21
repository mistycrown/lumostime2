/**
 * @file ImagePreviewControls.tsx
 * @input onZoomIn, onZoomOut, onReset, onRotate, onDownload, onDelete, onClose
 * @output Image Preview Control Buttons
 * @pos Component (UI Controls)
 * @description Full-screen image preview toolbar shared by ImagePreviewModal.
 * @updated 2026-05-21: Added a shared download action and loading state so preview toolbars can save the current image without duplicating button logic.
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Trash2, Download, LoaderCircle } from 'lucide-react';

interface ImagePreviewControlsProps {
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
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 bg-black/40 hover:bg-red-500/80 text-white rounded-full transition-all mr-2 [&>svg]:stroke-[2]"
          style={buttonStyle}
          title="Delete"
        >
          <Trash2 size={20} style={iconStyle} />
        </button>
      )}

      {onDownload && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isDownloading) {
              onDownload();
            }
          }}
          disabled={isDownloading}
          className={`${buttonBaseClass} ${isDownloading ? 'opacity-60 cursor-wait' : ''}`}
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
              onClick={(e) => {
                e.stopPropagation();
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
              onClick={(e) => {
                e.stopPropagation();
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
              onClick={(e) => {
                e.stopPropagation();
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
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className={`${buttonBaseClass} hover:text-red-400 ml-2`}
        style={buttonStyle}
        title="Close"
      >
        <X size={20} style={iconStyle} />
      </button>
    </div>
  );
};
