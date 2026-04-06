/**
 * @file ImmersiveTimer.tsx
 * @input elapsed time, onExit callback, onSubmit callback
 * @output Immersive fullscreen timer display and session submit trigger
 * @pos Component (View)
 * @description A fixed black-and-white immersive timer with large sans-serif digits, white-noise controls, orientation locking, and Android immersive fullscreen handling that temporarily removes WebView insets.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Check, Volume2, VolumeX, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { OrientationType, ScreenOrientation } from '@capawesome/capacitor-screen-orientation';
import { ImmersiveSelectorModal } from './ImmersiveSelectorModal';
import {
  IMMERSIVE_TIMER_COLORS,
  IMMERSIVE_TIMER_CONTROL_SURFACE,
  IMMERSIVE_TIMER_FONT_FAMILY,
  IMMERSIVE_TIMER_MODAL_THEME,
} from './immersiveTimerConfig';
import { useSettings } from '../contexts/SettingsContext';
import ImmersiveMode from '../plugins/ImmersiveModePlugin';
import { backgroundService } from '../services/backgroundService';
import { statusBarService } from '../services/statusBarService';
import {
  applyAndroidEdgeToEdgeBackgroundColor,
  getImmersiveStatusBarTransition,
  } from '../utils/statusBarTransitions';
import { getScreenOrientationLockValue } from '../utils/immersiveOrientation';

let EdgeToEdge: {
  disable?: () => Promise<void>;
  enable?: () => Promise<void>;
  setBackgroundColor?: (options: { color: string }) => Promise<void>;
} | null = null;
if (Capacitor.getPlatform() === 'android') {
  try {
    EdgeToEdge = require('@capawesome/capacitor-android-edge-to-edge-support').EdgeToEdge;
  } catch (error) {
    console.warn('EdgeToEdge plugin not available for immersive timer:', error);
  }
}

const WHITE_NOISES = [
  { id: 'none', name: '无' },
  { id: 'white', name: '白噪音', type: 'generated' },
  { id: 'pink', name: '粉噪音', type: 'generated' },
  { id: 'brown', name: '棕噪音', type: 'generated' },
  { id: 'rain', name: '雨声', type: 'audio', file: '/music/dragon-studio-gentle-rain-07-437321.mp3' },
  { id: 'ocean', name: '海浪', type: 'audio', file: '/music/richardmultimedia-ocean-waves-250310.mp3' },
  { id: 'forest', name: '森林', type: 'audio', file: '/music/dany_photo-forestbirds-319791.mp3' },
  { id: 'fireplace', name: '壁炉', type: 'audio', file: '/music/freesound_community-lit-fireplace-6307.mp3' },
  { id: 'garden', name: '花园', type: 'audio', file: '/music/freesound_community-garden-58202.mp3' },
  { id: 'library', name: '图书馆', type: 'audio', file: '/music/820017__ultra-edward__library.mp3' },
] as const;

interface ImmersiveTimerProps {
  elapsed: number;
  onExit: () => void;
  onSubmit: () => void;
}

export const ImmersiveTimer: React.FC<ImmersiveTimerProps> = ({ elapsed, onExit, onSubmit }) => {
  const { immersiveTimerDefaultOrientation } = useSettings();
  const [showControls, setShowControls] = useState(false);
  const [showNoiseModal, setShowNoiseModal] = useState(false);
  const [isWhiteNoiseOn, setIsWhiteNoiseOn] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [whiteNoiseNode, setWhiteNoiseNode] = useState<AudioBufferSourceNode | null>(null);
  const [landscapeFontSize, setLandscapeFontSize] = useState('min(24vw, 34vh)');
  const [selectedNoise, setSelectedNoise] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('immersiveTimerNoise') || 'none';
    }
    return 'none';
  });
  const [isLandscape, setIsLandscape] = useState(
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : true
  );
  const timerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const applyPreferredOrientation = async () => {
      try {
        const preferredLock = getScreenOrientationLockValue(immersiveTimerDefaultOrientation);
        const type = preferredLock === 'portrait-primary'
          ? OrientationType.PORTRAIT_PRIMARY
          : OrientationType.LANDSCAPE_PRIMARY;

        await ScreenOrientation.lock({ type });
      } catch (error) {
        console.error('Failed to lock immersive timer orientation:', error);
      }
    };

    void applyPreferredOrientation();

    return () => {
      ScreenOrientation.unlock().catch((error) => {
        console.error('Failed to unlock immersive timer orientation:', error);
      });
    };
  }, [immersiveTimerDefaultOrientation]);

  useEffect(() => {
    const platform = Capacitor.getPlatform();

    const applyEnterTransition = async () => {
      const enterTransition = getImmersiveStatusBarTransition(platform, 'enter');

      if (platform === 'ios') {
        await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      }

      if (platform === 'android' && enterTransition.disableEdgeToEdgeInsets && EdgeToEdge?.disable) {
        await EdgeToEdge.disable().catch(() => {});
      }

      if (enterTransition.backgroundColor && platform === 'android') {
        await applyAndroidEdgeToEdgeBackgroundColor(EdgeToEdge, enterTransition.backgroundColor).catch(() => false);
      }

      if (enterTransition.show) {
        await StatusBar.show().catch(() => {});
      }

      if (enterTransition.hide) {
        await StatusBar.hide().catch(() => {});
      }

      await StatusBar.setStyle({ style: Style.Light }).catch(() => {});

      if (platform === 'android' && enterTransition.hideSystemBars) {
        await ImmersiveMode.enter().catch(() => {});
      }
    };

    void applyEnterTransition();

    return () => {
      const exitTransition = getImmersiveStatusBarTransition(platform, 'exit');

      if (platform === 'android' && exitTransition.restoreSystemBars) {
        ImmersiveMode.exit().catch(() => {});
      }

      if (platform === 'android' && exitTransition.enableEdgeToEdgeInsets && EdgeToEdge?.enable) {
        EdgeToEdge.enable().catch(() => {});
      }

      if (exitTransition.show) {
        StatusBar.show().catch(() => {});
      }

      if (exitTransition.restoreManagedStatusBar) {
        const background = backgroundService.getCurrentBackgroundOption();
        const backgroundUrl = background && background.id !== 'default' ? background.url : null;
        statusBarService.updateForBackground(backgroundUrl).catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('immersiveTimerNoise', selectedNoise);
    }
  }, [selectedNoise]);

  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isLandscape || !timerRef.current) {
      return;
    }

    const adjustFontSize = () => {
      const container = timerRef.current;
      if (!container) {
        return;
      }

      const containerWidth = window.innerWidth * 0.94;
      const containerHeight = window.innerHeight * 0.78;
      let fontSize = Math.min(containerWidth * 0.2, containerHeight * 0.42);

      container.style.fontSize = `${fontSize}px`;

      let iterations = 0;
      while ((container.scrollWidth > containerWidth || container.scrollHeight > containerHeight) && iterations < 24) {
        fontSize *= 0.95;
        container.style.fontSize = `${fontSize}px`;
        iterations += 1;
      }

      setLandscapeFontSize(`${fontSize * 0.98}px`);
    };

    adjustFontSize();
    window.addEventListener('resize', adjustFontSize);

    return () => {
      window.removeEventListener('resize', adjustFontSize);
    };
  }, [elapsed, isLandscape]);

  useEffect(() => {
    if (selectedNoise === 'none') {
      return;
    }

    const timer = setTimeout(() => {
      startWhiteNoise(selectedNoise);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (error) {
        console.error('Failed to activate wake lock:', error);
      }
    };

    void requestWakeLock();

    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (!showControls) {
      return;
    }

    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [showControls]);

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      if (whiteNoiseNode) {
        try {
          whiteNoiseNode.stop();
        } catch (error) {
          console.warn('White noise node already stopped:', error);
        }
      }
      if (audioContext) {
        audioContext.close().catch(() => {});
      }
    };
  }, [audioContext, audioElement, whiteNoiseNode]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeParts = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: secs.toString().padStart(2, '0'),
    };
  };

  const stopWhiteNoise = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setAudioElement(null);
    }

    if (whiteNoiseNode) {
      whiteNoiseNode.stop();
      setWhiteNoiseNode(null);
    }

    if (audioContext) {
      audioContext.close().catch(() => {});
      setAudioContext(null);
    }

    setIsWhiteNoiseOn(false);
  };

  const startWhiteNoise = (noiseId: string = selectedNoise) => {
    try {
      const noiseConfig = WHITE_NOISES.find((noise) => noise.id === noiseId);
      if (!noiseConfig || noiseConfig.id === 'none') {
        return;
      }

      if (noiseConfig.type === 'audio' && noiseConfig.file) {
        const audio = new Audio(noiseConfig.file);
        audio.loop = true;
        audio.volume = 0.3;

        audio.play().then(() => {
          setAudioElement(audio);
          setIsWhiteNoiseOn(true);
        }).catch((error) => {
          console.error('Failed to play audio white noise:', error);
        });
        return;
      }

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const bufferSize = 4 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      const outputL = noiseBuffer.getChannelData(0);
      const outputR = noiseBuffer.getChannelData(1);

      switch (noiseId) {
        case 'white':
          for (let i = 0; i < bufferSize; i += 1) {
            outputL[i] = Math.random() * 2 - 1;
            outputR[i] = Math.random() * 2 - 1;
          }
          break;
        case 'pink': {
          let b0L = 0;
          let b1L = 0;
          let b2L = 0;
          let b3L = 0;
          let b4L = 0;
          let b5L = 0;
          let b6L = 0;
          let b0R = 0;
          let b1R = 0;
          let b2R = 0;
          let b3R = 0;
          let b4R = 0;
          let b5R = 0;
          let b6R = 0;
          for (let i = 0; i < bufferSize; i += 1) {
            const whiteL = Math.random() * 2 - 1;
            const whiteR = Math.random() * 2 - 1;
            b0L = 0.99886 * b0L + whiteL * 0.0555179;
            b1L = 0.99332 * b1L + whiteL * 0.0750759;
            b2L = 0.969 * b2L + whiteL * 0.153852;
            b3L = 0.8665 * b3L + whiteL * 0.3104856;
            b4L = 0.55 * b4L + whiteL * 0.5329522;
            b5L = -0.7616 * b5L - whiteL * 0.016898;
            outputL[i] = (b0L + b1L + b2L + b3L + b4L + b5L + b6L + whiteL * 0.5362) * 0.11;
            b6L = whiteL * 0.115926;
            b0R = 0.99886 * b0R + whiteR * 0.0555179;
            b1R = 0.99332 * b1R + whiteR * 0.0750759;
            b2R = 0.969 * b2R + whiteR * 0.153852;
            b3R = 0.8665 * b3R + whiteR * 0.3104856;
            b4R = 0.55 * b4R + whiteR * 0.5329522;
            b5R = -0.7616 * b5R - whiteR * 0.016898;
            outputR[i] = (b0R + b1R + b2R + b3R + b4R + b5R + b6R + whiteR * 0.5362) * 0.11;
            b6R = whiteR * 0.115926;
          }
          break;
        }
        case 'brown': {
          let lastOutL = 0;
          let lastOutR = 0;
          for (let i = 0; i < bufferSize; i += 1) {
            const whiteL = Math.random() * 2 - 1;
            const whiteR = Math.random() * 2 - 1;
            outputL[i] = (lastOutL + 0.02 * whiteL) / 1.02;
            outputR[i] = (lastOutR + 0.02 * whiteR) / 1.02;
            lastOutL = outputL[i];
            lastOutR = outputR[i];
            outputL[i] *= 3.5;
            outputR[i] *= 3.5;
          }
          break;
        }
        default:
          break;
      }

      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const gain = ctx.createGain();
      gain.gain.value = noiseId === 'white' ? 0.02 : 0.08;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = noiseId === 'brown' ? 800 : noiseId === 'pink' ? 1200 : 2000;
      filter.Q.value = 0.5;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);

      setAudioContext(ctx);
      setWhiteNoiseNode(source);
      setIsWhiteNoiseOn(true);
    } catch (error) {
      console.error('Failed to start white noise:', error);
    }
  };

  const handleNoiseSelect = (noiseId: string) => {
    setSelectedNoise(noiseId);

    if (noiseId === 'none') {
      stopWhiteNoise();
      return;
    }

    if (isWhiteNoiseOn) {
      stopWhiteNoise();
    }
    startWhiteNoise(noiseId);
  };

  const handleExit = () => {
    stopWhiteNoise();
    onExit();
  };

  const time = formatTimeParts(elapsed);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      onClick={() => setShowControls((current) => !current)}
      style={{
        backgroundColor: IMMERSIVE_TIMER_COLORS.background,
        color: IMMERSIVE_TIMER_COLORS.foreground,
        touchAction: 'manipulation',
      }}
    >
      {isLandscape ? (
        <div
          ref={timerRef}
          className="relative z-10 select-none px-4 text-center whitespace-nowrap"
          style={{
            fontSize: landscapeFontSize,
            fontFamily: IMMERSIVE_TIMER_FONT_FAMILY,
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: IMMERSIVE_TIMER_COLORS.foreground,
            fontVariantNumeric: 'lining-nums tabular-nums',
            fontFeatureSettings: '"tnum" 1',
            maxWidth: '94vw',
            overflow: 'hidden',
          }}
        >
          {formatTime(elapsed)}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <div
              className="relative z-10 select-none"
              style={{
                fontSize: 'min(32vw, 20vh)',
                fontFamily: IMMERSIVE_TIMER_FONT_FAMILY,
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: IMMERSIVE_TIMER_COLORS.foreground,
                fontVariantNumeric: 'lining-nums tabular-nums',
                fontFeatureSettings: '"tnum" 1',
              }}
            >
              {time.hours}
            </div>
            <div className="text-xs font-medium tracking-[0.28em]" style={{ color: IMMERSIVE_TIMER_COLORS.secondaryText }}>
              小时
            </div>
          </div>

          <div className="w-12 h-px" style={{ backgroundColor: IMMERSIVE_TIMER_COLORS.divider }} />

          <div className="flex flex-col items-center gap-1">
            <div
              className="relative z-10 select-none"
              style={{
                fontSize: 'min(32vw, 20vh)',
                fontFamily: IMMERSIVE_TIMER_FONT_FAMILY,
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: IMMERSIVE_TIMER_COLORS.foreground,
                fontVariantNumeric: 'lining-nums tabular-nums',
                fontFeatureSettings: '"tnum" 1',
              }}
            >
              {time.minutes}
            </div>
            <div className="text-xs font-medium tracking-[0.28em]" style={{ color: IMMERSIVE_TIMER_COLORS.secondaryText }}>
              分钟
            </div>
          </div>

          <div className="w-12 h-px" style={{ backgroundColor: IMMERSIVE_TIMER_COLORS.divider }} />

          <div className="flex flex-col items-center gap-1">
            <div
              className="relative z-10 select-none"
              style={{
                fontSize: 'min(32vw, 20vh)',
                fontFamily: IMMERSIVE_TIMER_FONT_FAMILY,
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: IMMERSIVE_TIMER_COLORS.foreground,
                fontVariantNumeric: 'lining-nums tabular-nums',
                fontFeatureSettings: '"tnum" 1',
              }}
            >
              {time.seconds}
            </div>
            <div className="text-xs font-medium tracking-[0.28em]" style={{ color: IMMERSIVE_TIMER_COLORS.secondaryText }}>
              秒
            </div>
          </div>
        </div>
      )}

      {showControls && (
        <div className="absolute inset-0 pointer-events-none animate-in fade-in duration-300 z-[300]">
          <button
            onClick={(event) => {
              event.stopPropagation();
              handleExit();
            }}
            title="返回"
            className="pointer-events-auto absolute left-4 w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center active:scale-95 transition-all shadow-lg"
            style={{
              top: 'calc(0.5rem + env(safe-area-inset-top, 0px))',
              left: 'calc(1rem + env(safe-area-inset-left, 0px))',
              backgroundColor: IMMERSIVE_TIMER_CONTROL_SURFACE.backgroundColor,
              borderWidth: '1.5px',
              borderStyle: 'solid',
              borderColor: IMMERSIVE_TIMER_CONTROL_SURFACE.borderColor,
              color: IMMERSIVE_TIMER_CONTROL_SURFACE.color,
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = IMMERSIVE_TIMER_COLORS.buttonHover;
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = IMMERSIVE_TIMER_CONTROL_SURFACE.backgroundColor;
            }}
          >
            <X size={24} strokeWidth={2} />
          </button>

          <button
            onClick={(event) => {
              event.stopPropagation();
              onSubmit();
            }}
            title="提交并保存"
            className="pointer-events-auto absolute left-[72px] w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center active:scale-95 transition-all shadow-lg"
            style={{
              top: 'calc(0.5rem + env(safe-area-inset-top, 0px))',
              left: 'calc(4.5rem + env(safe-area-inset-left, 0px))',
              backgroundColor: IMMERSIVE_TIMER_CONTROL_SURFACE.backgroundColor,
              borderWidth: '1.5px',
              borderStyle: 'solid',
              borderColor: IMMERSIVE_TIMER_CONTROL_SURFACE.borderColor,
              color: IMMERSIVE_TIMER_CONTROL_SURFACE.color,
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = IMMERSIVE_TIMER_COLORS.buttonHover;
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = IMMERSIVE_TIMER_CONTROL_SURFACE.backgroundColor;
            }}
          >
            <Check size={24} strokeWidth={2.5} />
          </button>

          <button
            onClick={(event) => {
              event.stopPropagation();
              setShowNoiseModal(true);
            }}
            title="选择白噪音"
            className="pointer-events-auto absolute right-4 w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center active:scale-95 transition-all shadow-lg"
            style={{
              top: 'calc(0.5rem + env(safe-area-inset-top, 0px))',
              right: 'calc(1rem + env(safe-area-inset-right, 0px))',
              backgroundColor: isWhiteNoiseOn
                ? IMMERSIVE_TIMER_COLORS.activeButtonBackground
                : IMMERSIVE_TIMER_CONTROL_SURFACE.backgroundColor,
              borderWidth: '1.5px',
              borderStyle: 'solid',
              borderColor: isWhiteNoiseOn
                ? IMMERSIVE_TIMER_COLORS.activeButtonBorder
                : IMMERSIVE_TIMER_CONTROL_SURFACE.borderColor,
              color: IMMERSIVE_TIMER_CONTROL_SURFACE.color,
            }}
            onMouseEnter={(event) => {
              if (!isWhiteNoiseOn) {
                event.currentTarget.style.backgroundColor = IMMERSIVE_TIMER_COLORS.buttonHover;
              }
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = isWhiteNoiseOn
                ? IMMERSIVE_TIMER_COLORS.activeButtonBackground
                : IMMERSIVE_TIMER_CONTROL_SURFACE.backgroundColor;
            }}
          >
            {isWhiteNoiseOn ? <Volume2 size={24} strokeWidth={2} /> : <VolumeX size={24} strokeWidth={2} />}
          </button>
        </div>
      )}

      <ImmersiveSelectorModal
        isOpen={showNoiseModal}
        onClose={() => setShowNoiseModal(false)}
        title="选择白噪音"
        options={WHITE_NOISES as unknown as Array<{ id: string; name: string; icon?: string; description?: string }>}
        selectedId={selectedNoise}
        onSelect={handleNoiseSelect}
        theme={IMMERSIVE_TIMER_MODAL_THEME}
      />
    </div>
  );
};
