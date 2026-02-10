/**
 * @file ImagePreviewControls.tsx
 * @input onZoomIn, onZoomOut, onReset, onRotate, onDelete, onClose
 * @output Image Preview Control Buttons
 * @pos Component (UI Controls)
 * @description 图片预览控制按钮组 - 用于 ImagePreviewModal
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Trash2 } from 'lucide-react';

interface ImagePreviewControlsProps {
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onReset?: () => void;
    onRotate?: () => void;
    onDelete?: () => void;
    onClose: () => void;
    showImageControls?: boolean;
}

const buttonBaseClass = "p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors [&>svg]:stroke-[2.5]";
const buttonStyle = { WebkitTextStroke: '0.5px black', paintOrder: 'stroke fill' as const };
const iconStyle = { filter: 'drop-shadow(0 0 0.5px black)' };

export const ImagePreviewControls: React.FC<ImagePreviewControlsProps> = ({
    onZoomIn,
    onZoomOut,
    onReset,
    onRotate,
    onDelete,
    onClose,
    showImageControls = true
}) => {
    return (
        <div className="flex items-center gap-2">
            {onDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="p-2 bg-white/10 hover:bg-red-500/80 text-white rounded-full backdrop-blur-sm transition-colors mr-2 [&>svg]:stroke-[2.5]"
                    style={buttonStyle}
                    title="Delete"
                >
                    <Trash2 size={20} style={iconStyle} />
                </button>
            )}
            
            {showImageControls && (
                <>
                    {onZoomIn && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onZoomIn(); }}
                            className={buttonBaseClass}
                            style={buttonStyle}
                            title="Zoom In"
                        >
                            <ZoomIn size={20} style={iconStyle} />
                        </button>
                    )}
                    
                    {onZoomOut && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onZoomOut(); }}
                            className={buttonBaseClass}
                            style={buttonStyle}
                            title="Zoom Out"
                        >
                            <ZoomOut size={20} style={iconStyle} />
                        </button>
                    )}
                    
                    {onRotate && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRotate(); }}
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
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className={`${buttonBaseClass} hover:text-red-400 ml-2`}
                style={buttonStyle}
                title="Close"
            >
                <X size={20} style={iconStyle} />
            </button>
        </div>
    );
};
