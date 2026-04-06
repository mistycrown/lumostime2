/**
 * @file ImmersiveVisualSelectorModal.tsx
 * @input Immersive art options, motion style options, selected ids, and callbacks
 * @output Dark immersive modal with painting selection and motion-style selection sections
 * @pos Component
 * @description Presents immersive timer visual customization in a single modal so users can choose the artwork and animation preset without mixing those controls into white-noise selection.
 */

import React from 'react';
import { Check, Image as ImageIcon, Sparkles, X } from 'lucide-react';
import {
  ImmersiveArtId,
  ImmersiveArtOption,
  ImmersiveMotionOption,
  ImmersiveMotionStyle,
} from '../utils/immersiveVisuals';

interface ImmersiveVisualSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedArtId: ImmersiveArtId;
  selectedMotionStyle: ImmersiveMotionStyle;
  onSelectArt: (id: ImmersiveArtId) => void;
  onSelectMotionStyle: (id: ImmersiveMotionStyle) => void;
  artOptions: ImmersiveArtOption[];
  motionOptions: ImmersiveMotionOption[];
  theme: {
    modalBg: string;
    modalBorder: string;
    buttonBg: string;
    buttonHoverBg: string;
    buttonText: string;
  };
}

export const ImmersiveVisualSelectorModal: React.FC<ImmersiveVisualSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedArtId,
  selectedMotionStyle,
  onSelectArt,
  onSelectMotionStyle,
  artOptions,
  motionOptions,
  theme,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 z-[350] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="flex w-[92vw] max-w-[980px] max-h-[82vh] flex-col overflow-hidden rounded-[28px] border shadow-2xl"
        style={{
          backgroundColor: theme.modalBg,
          borderColor: theme.modalBorder,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-4 sm:px-6"
          style={{ borderColor: theme.modalBorder }}
        >
          <div>
            <h3 className="text-xl font-semibold tracking-[0.04em]" style={{ color: theme.buttonText }}>
              画面样式
            </h3>
            <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              上面选画作，下面选运动样式
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
            style={{
              backgroundColor: theme.buttonBg,
              color: theme.buttonText,
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = theme.buttonHoverBg;
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = theme.buttonBg;
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <ImageIcon size={16} style={{ color: theme.buttonText }} />
              <h4 className="text-sm font-semibold tracking-[0.16em]" style={{ color: theme.buttonText }}>
                选择画作
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {artOptions.map((option) => {
                const isSelected = option.id === selectedArtId;

                return (
                  <button
                    key={option.id}
                    onClick={() => onSelectArt(option.id)}
                    className="overflow-hidden rounded-[22px] border p-2 text-left transition-all"
                    style={{
                      borderColor: isSelected ? theme.buttonText : theme.modalBorder,
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div
                      className="mb-2 aspect-[4/3] rounded-[16px] bg-cover bg-center"
                      style={{ backgroundImage: `url(${option.thumbnailSrc || option.src})` }}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium" style={{ color: theme.buttonText }}>
                        {option.name}
                      </span>
                      {isSelected ? <Check size={16} style={{ color: theme.buttonText }} /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-6 border-t pt-6" style={{ borderColor: theme.modalBorder }}>
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={16} style={{ color: theme.buttonText }} />
              <h4 className="text-sm font-semibold tracking-[0.16em]" style={{ color: theme.buttonText }}>
                选择运动样式
              </h4>
            </div>
            <div className="space-y-3">
              {motionOptions.map((option) => {
                const isSelected = option.id === selectedMotionStyle;

                return (
                  <button
                    key={option.id}
                    onClick={() => onSelectMotionStyle(option.id)}
                    className="w-full rounded-[22px] border px-4 py-4 text-left transition-all"
                    style={{
                      borderColor: isSelected ? theme.buttonText : theme.modalBorder,
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-semibold" style={{ color: theme.buttonText }}>
                        {option.name}
                      </span>
                      {isSelected ? <Check size={16} style={{ color: theme.buttonText }} /> : null}
                    </div>
                    <p className="mt-1 text-sm leading-6" style={{ color: 'rgba(255,255,255,0.68)' }}>
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
