/**
 * @file ImmersiveTimer.tsx
 * @input elapsed time, onExit callback, onSubmit callback
 * @output Immersive fullscreen timer display and session submit trigger
 * @pos Component (View)
 * @description A fixed black-and-white immersive timer with large numeric digits, static masked art visuals, session-only orientation toggles, display-source and display-format toggles, white-noise controls, and Android immersive fullscreen handling that temporarily removes WebView insets.
 * @updated 2026-05-05: Restored Android immersive system bars before unmounting the fullscreen timer so exiting immersive mode no longer leaves the app header shifted downward.
 * @updated 2026-05-04: Realigned the immersive top control bar so both portrait and landscape modes avoid inheriting the managed status-bar fallback and drifting downward.
 * @updated 2026-05-03: Switched Android EdgeToEdge access to the plugin's ESM entry so Capacitor WebView builds no longer execute browser-undefined `require()` calls.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Check, Image as ImageIcon, MonitorSmartphone, Volume2, VolumeX, X } from 'lucide-react';
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { OrientationType, ScreenOrientation } from '@capawesome/capacitor-screen-orientation';
import { ImmersiveMaskedDigits } from './ImmersiveMaskedDigits';
import { ImmersiveSelectorModal } from './ImmersiveSelectorModal';
import { ImmersiveVisualSelectorModal } from './ImmersiveVisualSelectorModal';
import {
  IMMERSIVE_TIMER_COLORS,
  IMMERSIVE_TIMER_CONTROL_SURFACE,
  IMMERSIVE_TIMER_HORIZONTAL_PADDING,
  IMMERSIVE_TIMER_LANDSCAPE_SIZE,
  IMMERSIVE_TIMER_LANDSCAPE_VIEWPORT,
  IMMERSIVE_TIMER_LETTER_SPACING,
  IMMERSIVE_TIMER_MODAL_THEME,
  IMMERSIVE_TIMER_PORTRAIT_DIGIT_SIZE,
  IMMERSIVE_TIMER_PORTRAIT_TWO_SEGMENT_DIGIT_SIZE,
} from './immersiveTimerConfig';
import { useSettings } from '../contexts/SettingsContext';
import ImmersiveMode from '../plugins/ImmersiveModePlugin';
import { backgroundService } from '../services/backgroundService';
import { statusBarService } from '../services/statusBarService';
import {
  applyAndroidEdgeToEdgeBackgroundColor,
  getImmersiveStatusBarTransition,
  } from '../utils/statusBarTransitions';
import {
  getScreenOrientationLockValue,
  resolveImmersiveTimerOrientation,
  shouldManageImmersiveOrientationLock,
  shouldSilenceImmersiveOrientationError,
  toggleImmersiveTimerOrientation,
  type ImmersiveTimerOrientation,
} from '../utils/immersiveOrientation';
import {
  buildImmersiveDisplayParts,
  DEFAULT_IMMERSIVE_DISPLAY_FORMAT,
  DEFAULT_IMMERSIVE_DISPLAY_SOURCE,
  getDefaultImmersiveDisplayFormatForSource,
  getImmersiveDigitSlotWidth,
  IMMERSIVE_DISPLAY_STORAGE_KEYS,
  ImmersiveDisplayFormat,
  ImmersiveDisplaySource,
  readStoredImmersiveDisplayFormat,
  readStoredImmersiveDisplaySource,
} from '../utils/immersiveTimeDisplay';
import {
  DEFAULT_IMMERSIVE_ART_ID,
  DEFAULT_IMMERSIVE_MOTION_STYLE,
  getImmersiveArtOptionById,
  IMMERSIVE_ART_OPTIONS,
  IMMERSIVE_MOTION_OPTIONS,
  IMMERSIVE_VISUAL_STORAGE_KEYS,
  ImmersiveArtId,
  ImmersiveMotionStyle,
  readStoredImmersiveArtId,
  readStoredImmersiveMotionStyle,
} from '../utils/immersiveVisuals';
import {
  DEFAULT_IMMERSIVE_TIMER_FONT_ID,
  getImmersiveTimerFontOptionById,
  IMMERSIVE_TIMER_FONT_OPTIONS,
  IMMERSIVE_TIMER_FONT_STORAGE_KEY,
  ImmersiveTimerFontId,
  readStoredImmersiveTimerFontId,
} from '../utils/immersiveFonts';

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
  const [showVisualModal, setShowVisualModal] = useState(false);
  const [isRestoringShell, setIsRestoringShell] = useState(false);
  const [sessionOrientationOverride, setSessionOrientationOverride] = useState<ImmersiveTimerOrientation | null>(null);
  const [displaySource, setDisplaySource] = useState<ImmersiveDisplaySource>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_IMMERSIVE_DISPLAY_SOURCE;
    }

    return readStoredImmersiveDisplaySource(window.localStorage);
  });
  const [displayFormat, setDisplayFormat] = useState<ImmersiveDisplayFormat>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_IMMERSIVE_DISPLAY_FORMAT;
    }

    const storedSource = readStoredImmersiveDisplaySource(window.localStorage);
    return readStoredImmersiveDisplayFormat(window.localStorage, storedSource);
  });
  const [isWhiteNoiseOn, setIsWhiteNoiseOn] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [whiteNoiseNode, setWhiteNoiseNode] = useState<AudioBufferSourceNode | null>(null);
  const [landscapeFontSize, setLandscapeFontSize] = useState('min(28vw, 42vh)');
  const [selectedNoise, setSelectedNoise] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('immersiveTimerNoise') || 'none';
    }
    return 'none';
  });
  const [selectedArtId, setSelectedArtId] = useState<ImmersiveArtId>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_IMMERSIVE_ART_ID;
    }

    return readStoredImmersiveArtId(window.localStorage);
  });
  const [selectedMotionStyle, setSelectedMotionStyle] = useState<ImmersiveMotionStyle>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_IMMERSIVE_MOTION_STYLE;
    }

    return readStoredImmersiveMotionStyle(window.localStorage);
  });
  const [selectedFontId, setSelectedFontId] = useState<ImmersiveTimerFontId>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_IMMERSIVE_TIMER_FONT_ID;
    }

    return readStoredImmersiveTimerFontId(window.localStorage);
  });
  const [isLandscape, setIsLandscape] = useState(
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : true
  );
  const timerRef = useRef<HTMLDivElement>(null);
  const exitTransitionPromiseRef = useRef<Promise<void> | null>(null);
  const hasRestoredShellRef = useRef(false);
  const effectiveOrientation = resolveImmersiveTimerOrientation(
    immersiveTimerDefaultOrientation,
    sessionOrientationOverride
  );
  const displayParts = buildImmersiveDisplayParts({
    source: displaySource,
    format: displayFormat,
    elapsedSeconds: elapsed,
    now: new Date(),
  });
  const valueParts = displayParts.filter((part) => part.kind === 'value');
  const portraitDigitSize = valueParts.length <= 2
    ? IMMERSIVE_TIMER_PORTRAIT_TWO_SEGMENT_DIGIT_SIZE
    : IMMERSIVE_TIMER_PORTRAIT_DIGIT_SIZE;
  const digitSlotWidth = getImmersiveDigitSlotWidth(valueParts.map((part) => part.value));
  const displaySignature = `${displaySource}-${displayFormat}-${selectedFontId}-${displayParts.map((part) => part.value).join('')}`;
  const selectedArt = getImmersiveArtOptionById(selectedArtId);
  const selectedFont = getImmersiveTimerFontOptionById(selectedFontId);
  const topControlsInset = 'calc(0.75rem + env(safe-area-inset-top, 0px))';
  const leftControlsInset = 'calc(1rem + env(safe-area-inset-left, 0px))';
  const rightControlsInset = 'calc(1rem + env(safe-area-inset-right, 0px))';

  const waitForAnimationFrames = async (count: number = 1) => {
    for (let index = 0; index < count; index += 1) {
      await new Promise<void>((resolve) => {
        if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
          window.setTimeout(resolve, 16);
          return;
        }

        window.requestAnimationFrame(() => resolve());
      });
    }
  };

  const syncAndroidInsetCssVariables = async () => {
    if (Capacitor.getPlatform() !== 'android' || !EdgeToEdge?.getInsets || typeof document === 'undefined') {
      return;
    }

    const insets = await EdgeToEdge.getInsets().catch(() => null);
    if (!insets) {
      return;
    }

    document.documentElement.style.setProperty('--status-bar-height', `${Math.max(0, insets.top)}px`);
    document.documentElement.style.setProperty('--navigation-bar-height', `${Math.max(0, insets.bottom)}px`);
  };

  const restorePlatformShell = async () => {
    if (exitTransitionPromiseRef.current) {
      await exitTransitionPromiseRef.current;
      return;
    }

    if (hasRestoredShellRef.current) {
      return;
    }

    hasRestoredShellRef.current = true;
    const platform = Capacitor.getPlatform();
    const exitTransition = getImmersiveStatusBarTransition(platform, 'exit');

    exitTransitionPromiseRef.current = (async () => {
      if (platform === 'android' && exitTransition.restoreSystemBars) {
        await ImmersiveMode.exit().catch(() => {});
      }

      if (exitTransition.show) {
        await StatusBar.show().catch(() => {});
      }

      if (platform === 'android' && exitTransition.enableEdgeToEdgeInsets && EdgeToEdge?.enable) {
        // Wait until Android reports the restored system-bar state before reapplying WebView margins.
        await waitForAnimationFrames(2);
        await EdgeToEdge.enable().catch(() => {});
        await waitForAnimationFrames(1);
        await syncAndroidInsetCssVariables().catch(() => {});
      }

      if (exitTransition.restoreManagedStatusBar) {
        const background = backgroundService.getCurrentBackgroundOption();
        const backgroundUrl = background && background.id !== 'default' ? background.url : null;
        await statusBarService.updateForBackground(backgroundUrl).catch(() => {});
      }
    })();

    try {
      await exitTransitionPromiseRef.current;
    } finally {
      exitTransitionPromiseRef.current = null;
    }
  };

  useEffect(() => {
    const platform = Capacitor.getPlatform();

    if (!shouldManageImmersiveOrientationLock(platform)) {
      return;
    }

    let isCancelled = false;

    const applyEffectiveOrientation = async () => {
      try {
        const preferredLock = getScreenOrientationLockValue(effectiveOrientation);
        const type = preferredLock === 'portrait-primary'
          ? OrientationType.PORTRAIT_PRIMARY
          : OrientationType.LANDSCAPE_PRIMARY;

        await ScreenOrientation.lock({ type });
      } catch (error) {
        if (!isCancelled && !shouldSilenceImmersiveOrientationError(error)) {
          console.error('Failed to lock immersive timer orientation:', error);
        }
      }
    };

    void applyEffectiveOrientation();

    return () => {
      isCancelled = true;
      ScreenOrientation.unlock().catch((error) => {
        if (!shouldSilenceImmersiveOrientationError(error)) {
          console.error('Failed to unlock immersive timer orientation:', error);
        }
      });
    };
  }, [effectiveOrientation]);

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
      void restorePlatformShell();
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('immersiveTimerNoise', selectedNoise);
    }
  }, [selectedNoise]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(IMMERSIVE_DISPLAY_STORAGE_KEYS.source, displaySource);
    }
  }, [displaySource]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(IMMERSIVE_DISPLAY_STORAGE_KEYS.format, displayFormat);
    }
  }, [displayFormat]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(IMMERSIVE_VISUAL_STORAGE_KEYS.art, selectedArtId);
    }
  }, [selectedArtId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(IMMERSIVE_VISUAL_STORAGE_KEYS.motionStyle, selectedMotionStyle);
    }
  }, [selectedMotionStyle]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(IMMERSIVE_TIMER_FONT_STORAGE_KEY, selectedFontId);
    }
  }, [selectedFontId]);

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
    if (effectiveOrientation !== 'landscape' || !timerRef.current) {
      return;
    }

    const adjustFontSize = () => {
      const container = timerRef.current;
      if (!container) {
        return;
      }

      const containerWidth = window.innerWidth * IMMERSIVE_TIMER_LANDSCAPE_VIEWPORT.width;
      const containerHeight = window.innerHeight * IMMERSIVE_TIMER_LANDSCAPE_VIEWPORT.height;
      let fontSize = Math.min(
        containerWidth * IMMERSIVE_TIMER_LANDSCAPE_SIZE.widthRatio,
        containerHeight * IMMERSIVE_TIMER_LANDSCAPE_SIZE.heightRatio
      );

      container.style.fontSize = `${fontSize}px`;

      let iterations = 0;
      while ((container.scrollWidth > containerWidth || container.scrollHeight > containerHeight) && iterations < 24) {
        fontSize *= 0.95;
        container.style.fontSize = `${fontSize}px`;
        iterations += 1;
      }

      setLandscapeFontSize(`${fontSize * IMMERSIVE_TIMER_LANDSCAPE_SIZE.finalScale}px`);
    };

    adjustFontSize();
    window.addEventListener('resize', adjustFontSize);

    return () => {
      window.removeEventListener('resize', adjustFontSize);
    };
  }, [displaySignature, effectiveOrientation, isLandscape]);

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

  const handleExit = async () => {
    if (isRestoringShell) {
      return;
    }

    setIsRestoringShell(true);
    stopWhiteNoise();
    await restorePlatformShell();
    onExit();
  };

  const handleSubmit = async () => {
    if (isRestoringShell) {
      return;
    }

    setIsRestoringShell(true);
    stopWhiteNoise();
    await restorePlatformShell();
    onSubmit();
  };

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
      {effectiveOrientation === 'landscape' ? (
        <div
          ref={timerRef}
          className="relative z-10 inline-flex select-none items-center justify-center whitespace-nowrap"
          style={{
            fontSize: landscapeFontSize,
            fontFamily: selectedFont.fontFamily,
            fontWeight: selectedFont.fontWeight,
            letterSpacing: IMMERSIVE_TIMER_LETTER_SPACING,
            color: IMMERSIVE_TIMER_COLORS.foreground,
            fontVariantNumeric: 'lining-nums tabular-nums',
            fontFeatureSettings: '"tnum" 1',
            paddingInline: IMMERSIVE_TIMER_HORIZONTAL_PADDING,
            maxWidth: IMMERSIVE_TIMER_LANDSCAPE_VIEWPORT.maxWidth,
            overflow: 'hidden',
          }}
        >
          <ImmersiveMaskedDigits
            orientation="landscape"
            displayParts={displayParts}
            digitSlotWidth={digitSlotWidth}
            separatorSlotWidth={selectedFont.separatorSlotWidth}
            fontFamily={selectedFont.fontFamily}
            fontWeight={selectedFont.fontWeight}
            artSrc={selectedArt.src}
            motionStyle={selectedMotionStyle}
          />
        </div>
      ) : (
        <div
          className="relative z-10 select-none"
          style={{
            fontSize: portraitDigitSize,
            fontFamily: selectedFont.fontFamily,
            fontWeight: selectedFont.fontWeight,
            letterSpacing: IMMERSIVE_TIMER_LETTER_SPACING,
            color: IMMERSIVE_TIMER_COLORS.foreground,
            fontVariantNumeric: 'lining-nums tabular-nums',
            fontFeatureSettings: '"tnum" 1',
            textAlign: 'center',
          }}
        >
          <ImmersiveMaskedDigits
            orientation="portrait"
            displayParts={displayParts}
            digitSlotWidth={digitSlotWidth}
            separatorSlotWidth={selectedFont.separatorSlotWidth}
            fontFamily={selectedFont.fontFamily}
            fontWeight={selectedFont.fontWeight}
            artSrc={selectedArt.src}
            motionStyle={selectedMotionStyle}
          />
        </div>
      )}

      {showControls && (
        <div className="absolute inset-0 pointer-events-none animate-in fade-in duration-300 z-[300]">
          <div
            className="pointer-events-none absolute inset-x-0 flex items-start justify-between"
            style={{
              top: topControlsInset,
              paddingLeft: leftControlsInset,
              paddingRight: rightControlsInset,
            }}
          >
            <div className="pointer-events-none flex items-center gap-2">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  void handleExit();
                }}
                title="返回"
                className="pointer-events-auto h-12 w-12 rounded-full backdrop-blur-md flex items-center justify-center active:scale-95 transition-all shadow-lg"
                style={{
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
                  void handleSubmit();
                }}
                title="提交并保存"
                className="pointer-events-auto h-12 w-12 rounded-full backdrop-blur-md flex items-center justify-center active:scale-95 transition-all shadow-lg"
                style={{
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
            </div>

            <div className="pointer-events-none flex items-center gap-2">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setSessionOrientationOverride((current) => toggleImmersiveTimerOrientation(
                    resolveImmersiveTimerOrientation(immersiveTimerDefaultOrientation, current)
                  ));
                }}
                title="切换横竖屏样式"
                className="pointer-events-auto w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center active:scale-95 transition-all shadow-lg"
                style={{
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
                <MonitorSmartphone
                  size={18}
                  strokeWidth={2}
                  style={{ transform: effectiveOrientation === 'landscape' ? 'rotate(90deg)' : 'none' }}
                />
              </button>

              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setShowNoiseModal(true);
                }}
                title="选择白噪音"
                className="pointer-events-auto w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center active:scale-95 transition-all shadow-lg"
                style={{
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

              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setShowVisualModal(true);
                }}
                title="时钟样式"
                className="pointer-events-auto w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center active:scale-95 transition-all shadow-lg"
                style={{
                  backgroundColor: showVisualModal
                    ? IMMERSIVE_TIMER_COLORS.activeButtonBackground
                    : IMMERSIVE_TIMER_CONTROL_SURFACE.backgroundColor,
                  borderWidth: '1.5px',
                  borderStyle: 'solid',
                  borderColor: showVisualModal
                    ? IMMERSIVE_TIMER_COLORS.activeButtonBorder
                    : IMMERSIVE_TIMER_CONTROL_SURFACE.borderColor,
                  color: IMMERSIVE_TIMER_CONTROL_SURFACE.color,
                }}
                onMouseEnter={(event) => {
                  if (!showVisualModal) {
                    event.currentTarget.style.backgroundColor = IMMERSIVE_TIMER_COLORS.buttonHover;
                  }
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = showVisualModal
                    ? IMMERSIVE_TIMER_COLORS.activeButtonBackground
                    : IMMERSIVE_TIMER_CONTROL_SURFACE.backgroundColor;
                }}
              >
                <ImageIcon size={20} strokeWidth={2} />
              </button>
            </div>
          </div>
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
      <ImmersiveVisualSelectorModal
        isOpen={showVisualModal}
        onClose={() => setShowVisualModal(false)}
        selectedDisplaySource={displaySource}
        selectedDisplayFormat={displayFormat}
        selectedArtId={selectedArtId}
        selectedMotionStyle={selectedMotionStyle}
        selectedFontId={selectedFontId}
        onSelectDisplaySource={(nextSource) => {
          setDisplaySource(nextSource);
          setDisplayFormat((currentFormat) => getDefaultImmersiveDisplayFormatForSource(nextSource, currentFormat));
        }}
        onSelectDisplayFormat={setDisplayFormat}
        onSelectArt={setSelectedArtId}
        onSelectMotionStyle={setSelectedMotionStyle}
        onSelectFont={setSelectedFontId}
        artOptions={IMMERSIVE_ART_OPTIONS}
        motionOptions={IMMERSIVE_MOTION_OPTIONS}
        fontOptions={IMMERSIVE_TIMER_FONT_OPTIONS}
        theme={IMMERSIVE_TIMER_MODAL_THEME}
      />
    </div>
  );
};
