/**
 * @file ImmersiveVisualSelectorModal.tsx
 * @input Immersive display source, format, art options, motion style options, selected ids, and callbacks
 * @output Dark immersive modal with source, format, painting, and motion-style selection sections
 * @pos Component
 * @description Presents immersive timer clock styling in a single modal so users can adjust display source, display format, artwork, and animation preset from one entry point.
 */

import React from 'react';
import { Check, Clock3, Image as ImageIcon, Sparkles, TimerReset, X } from 'lucide-react';
import {
  getImmersiveDisplayFormatSegmentCount,
  ImmersiveDisplayFormat,
  ImmersiveDisplaySource,
} from '../utils/immersiveTimeDisplay';
import {
  ImmersiveArtId,
  ImmersiveArtOption,
  ImmersiveMotionOption,
  ImmersiveMotionStyle,
} from '../utils/immersiveVisuals';

interface ImmersiveVisualSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDisplaySource: ImmersiveDisplaySource;
  selectedDisplayFormat: ImmersiveDisplayFormat;
  selectedArtId: ImmersiveArtId;
  selectedMotionStyle: ImmersiveMotionStyle;
  onSelectDisplaySource: (source: ImmersiveDisplaySource) => void;
  onSelectDisplayFormat: (format: ImmersiveDisplayFormat) => void;
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

const DISPLAY_SOURCE_OPTIONS: Array<{
  id: ImmersiveDisplaySource;
  name: string;
  Icon: typeof TimerReset;
}> = [
  { id: 'elapsed', name: '计时', Icon: TimerReset },
  { id: 'current', name: '时钟', Icon: Clock3 },
];

const DISPLAY_FORMAT_OPTIONS: Array<{
  id: ImmersiveDisplayFormat;
  name: string;
}> = [
  { id: 'hoursMinutes', name: '时分' },
  { id: 'minutesSeconds', name: '分秒' },
  { id: 'hoursMinutesSeconds', name: '时分秒' },
];

const DisplayFormatIcon: React.FC<{ format: ImmersiveDisplayFormat }> = ({ format }) => {
  const segmentCount = getImmersiveDisplayFormatSegmentCount(format);
  const totalWidth = segmentCount === 3 ? 22 : 16;
  const barXs = segmentCount === 3 ? [1, 9, 17] : [1, 9];
  const separatorXs = segmentCount === 3 ? [7, 15] : [7];

  return (
    <svg
      width="22"
      height="22"
      viewBox={`0 0 ${totalWidth} 22`}
      fill="none"
      aria-hidden="true"
    >
      {barXs.map((x) => (
        <rect
          key={`bar-${x}`}
          x={x}
          y="4"
          width="4"
          height="14"
          rx="2"
          fill="currentColor"
          opacity="0.92"
        />
      ))}
      {separatorXs.map((x) => (
        <circle
          key={`separator-${x}`}
          cx={x}
          cy="11"
          r="1"
          fill="currentColor"
          opacity="0.68"
        />
      ))}
    </svg>
  );
};

interface ChoiceCardProps {
  isSelected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  theme: ImmersiveVisualSelectorModalProps['theme'];
}

const ChoiceCard: React.FC<ChoiceCardProps> = ({ isSelected, onClick, children, theme }) => (
  <button
    onClick={onClick}
    className="w-full rounded-[22px] border px-4 py-4 text-left transition-all"
    style={{
      borderColor: isSelected ? theme.buttonText : theme.modalBorder,
      backgroundColor: isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
    }}
  >
    <div className="flex items-center justify-between gap-3">
      {children}
      {isSelected ? <Check size={16} style={{ color: theme.buttonText }} /> : null}
    </div>
  </button>
);

export const ImmersiveVisualSelectorModal: React.FC<ImmersiveVisualSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedDisplaySource,
  selectedDisplayFormat,
  selectedArtId,
  selectedMotionStyle,
  onSelectDisplaySource,
  onSelectDisplayFormat,
  onSelectArt,
  onSelectMotionStyle,
  artOptions,
  motionOptions,
  theme,
}) => {
  if (!isOpen) {
    return null;
  }

  const visibleFormatOptions = DISPLAY_FORMAT_OPTIONS.filter((option) =>
    selectedDisplaySource === 'current' ? option.id !== 'minutesSeconds' : true
  );

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
          <h3 className="text-xl font-semibold tracking-[0.04em]" style={{ color: theme.buttonText }}>
            时钟样式
          </h3>
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
              <Clock3 size={16} style={{ color: theme.buttonText }} />
              <h4 className="text-sm font-semibold tracking-[0.16em]" style={{ color: theme.buttonText }}>
                选择显示来源
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {DISPLAY_SOURCE_OPTIONS.map((option) => {
                const isSelected = option.id === selectedDisplaySource;

                return (
                  <ChoiceCard
                    key={option.id}
                    isSelected={isSelected}
                    onClick={() => onSelectDisplaySource(option.id)}
                    theme={theme}
                  >
                    <div className="flex items-center gap-3">
                      <option.Icon size={18} style={{ color: theme.buttonText }} />
                      <span className="text-base font-semibold" style={{ color: theme.buttonText }}>
                        {option.name}
                      </span>
                    </div>
                  </ChoiceCard>
                );
              })}
            </div>
          </section>

          <section className="mt-6 border-t pt-6" style={{ borderColor: theme.modalBorder }}>
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={16} style={{ color: theme.buttonText }} />
              <h4 className="text-sm font-semibold tracking-[0.16em]" style={{ color: theme.buttonText }}>
                选择显示格式
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {visibleFormatOptions.map((option) => {
                const isSelected = option.id === selectedDisplayFormat;

                return (
                  <ChoiceCard
                    key={option.id}
                    isSelected={isSelected}
                    onClick={() => onSelectDisplayFormat(option.id)}
                    theme={theme}
                  >
                    <div className="flex items-center gap-3">
                      <DisplayFormatIcon format={option.id} />
                      <span className="text-base font-semibold" style={{ color: theme.buttonText }}>
                        {option.name}
                      </span>
                    </div>
                  </ChoiceCard>
                );
              })}
            </div>
          </section>

          <section className="mt-6 border-t pt-6" style={{ borderColor: theme.modalBorder }}>
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
                    aria-label="选择画作"
                    className="group relative overflow-hidden rounded-[22px] border p-2 transition-all"
                    style={{
                      borderColor: isSelected ? theme.buttonText : theme.modalBorder,
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                      boxShadow: isSelected ? '0 0 0 1px rgba(255,255,255,0.16)' : 'none',
                    }}
                  >
                    <div
                      className="aspect-[4/3] rounded-[16px] bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]"
                      style={{ backgroundImage: `url(${option.thumbnailSrc || option.src})` }}
                    />
                    <div className="pointer-events-none absolute inset-x-2 top-2 flex justify-end">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full border backdrop-blur-md transition-all"
                        style={{
                          borderColor: isSelected ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.18)',
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.28)',
                          color: theme.buttonText,
                          opacity: isSelected ? 1 : 0,
                        }}
                      >
                        <Check size={15} />
                      </div>
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
                  <ChoiceCard
                    key={option.id}
                    isSelected={isSelected}
                    onClick={() => onSelectMotionStyle(option.id)}
                    theme={theme}
                  >
                    <span
                      className="text-lg font-semibold tracking-[0.08em]"
                      style={{ color: theme.buttonText }}
                    >
                      {option.name}
                    </span>
                  </ChoiceCard>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
