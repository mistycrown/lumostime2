/**
 * @file ImmersiveTimer.tsx
 * @input elapsed time, onExit callback
 * @output Immersive fullscreen timer display
 * @pos Component (View)
 * @description A landscape-oriented immersive timer view with minimal UI. Shows large timer digits, with controls appearing on tap.
 */
import React, { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, Palette } from 'lucide-react';
import { ImmersiveSelectorModal } from './ImmersiveSelectorModal';

// Theme configurations
const THEMES = [
    { id: 'midnight', name: '午夜蓝', gradient: 'from-slate-900 via-slate-800 to-slate-900', glow1: 'bg-blue-500/20', glow2: 'bg-purple-500/20' },
    { id: 'sunset', name: '日落橙', gradient: 'from-orange-900 via-red-900 to-pink-900', glow1: 'bg-orange-500/20', glow2: 'bg-pink-500/20' },
    { id: 'forest', name: '森林绿', gradient: 'from-emerald-900 via-green-900 to-teal-900', glow1: 'bg-emerald-500/20', glow2: 'bg-teal-500/20' },
    { id: 'ocean', name: '深海蓝', gradient: 'from-blue-900 via-cyan-900 to-indigo-900', glow1: 'bg-cyan-500/20', glow2: 'bg-blue-500/20' },
    { id: 'lavender', name: '薰衣草', gradient: 'from-purple-900 via-violet-900 to-fuchsia-900', glow1: 'bg-purple-500/20', glow2: 'bg-fuchsia-500/20' },
    { id: 'minimal', name: '极简黑', gradient: 'from-black via-gray-900 to-black', glow1: 'bg-gray-500/10', glow2: 'bg-gray-600/10' },
];

// White noise configurations - using online audio sources
const WHITE_NOISES = [
    { id: 'none', name: '无' },
    { id: 'white', name: '白噪音' },
    { id: 'pink', name: '粉噪音' },
    { id: 'brown', name: '褐噪音' },
];

interface ImmersiveTimerProps {
    elapsed: number;
    onExit: () => void;
}

export const ImmersiveTimer: React.FC<ImmersiveTimerProps> = ({ elapsed, onExit }) => {
    const [showControls, setShowControls] = useState(false);
    const [isWhiteNoiseOn, setIsWhiteNoiseOn] = useState(false);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [whiteNoiseNode, setWhiteNoiseNode] = useState<AudioBufferSourceNode | null>(null);
    const [gainNode, setGainNode] = useState<GainNode | null>(null);
    const [selectedTheme, setSelectedTheme] = useState('midnight');
    const [selectedNoise, setSelectedNoise] = useState('none');
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [showNoiseModal, setShowNoiseModal] = useState(false);

    const currentTheme = THEMES.find(t => t.id === selectedTheme) || THEMES[0];

    // Format time as HH:MM:SS
    const formatTime = (seconds: number): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Keep screen awake using WakeLock API
    useEffect(() => {
        let wakeLock: any = null;

        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await (navigator as any).wakeLock.request('screen');
                    console.log('Screen wake lock activated');
                }
            } catch (err) {
                console.error('Failed to activate wake lock:', err);
            }
        };

        requestWakeLock();

        return () => {
            if (wakeLock) {
                wakeLock.release().then(() => {
                    console.log('Screen wake lock released');
                });
            }
        };
    }, []);

    // Auto-hide controls after 3 seconds
    useEffect(() => {
        if (showControls) {
            const timer = setTimeout(() => setShowControls(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showControls]);

    // White noise generation with different types - improved algorithms
    const startWhiteNoise = (type: string = selectedNoise) => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const bufferSize = 4 * ctx.sampleRate; // Longer buffer for smoother sound
            const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate); // Stereo
            const outputL = noiseBuffer.getChannelData(0);
            const outputR = noiseBuffer.getChannelData(1);
            
            // Generate different noise types with improved algorithms
            switch (type) {
                case 'white':
                    // White noise - equal energy across all frequencies
                    for (let i = 0; i < bufferSize; i++) {
                        outputL[i] = Math.random() * 2 - 1;
                        outputR[i] = Math.random() * 2 - 1;
                    }
                    break;
                    
                case 'pink':
                    // Pink noise - 1/f noise (more natural, warmer)
                    let b0L = 0, b1L = 0, b2L = 0, b3L = 0, b4L = 0, b5L = 0, b6L = 0;
                    let b0R = 0, b1R = 0, b2R = 0, b3R = 0, b4R = 0, b5R = 0, b6R = 0;
                    for (let i = 0; i < bufferSize; i++) {
                        const whiteL = Math.random() * 2 - 1;
                        const whiteR = Math.random() * 2 - 1;
                        
                        b0L = 0.99886 * b0L + whiteL * 0.0555179;
                        b1L = 0.99332 * b1L + whiteL * 0.0750759;
                        b2L = 0.96900 * b2L + whiteL * 0.1538520;
                        b3L = 0.86650 * b3L + whiteL * 0.3104856;
                        b4L = 0.55000 * b4L + whiteL * 0.5329522;
                        b5L = -0.7616 * b5L - whiteL * 0.0168980;
                        outputL[i] = (b0L + b1L + b2L + b3L + b4L + b5L + b6L + whiteL * 0.5362) * 0.11;
                        b6L = whiteL * 0.115926;
                        
                        b0R = 0.99886 * b0R + whiteR * 0.0555179;
                        b1R = 0.99332 * b1R + whiteR * 0.0750759;
                        b2R = 0.96900 * b2R + whiteR * 0.1538520;
                        b3R = 0.86650 * b3R + whiteR * 0.3104856;
                        b4R = 0.55000 * b4R + whiteR * 0.5329522;
                        b5R = -0.7616 * b5R - whiteR * 0.0168980;
                        outputR[i] = (b0R + b1R + b2R + b3R + b4R + b5R + b6R + whiteR * 0.5362) * 0.11;
                        b6R = whiteR * 0.115926;
                    }
                    break;
                    
                case 'brown':
                    // Brown noise - even more bass, very deep and rumbling
                    let lastOutL = 0;
                    let lastOutR = 0;
                    for (let i = 0; i < bufferSize; i++) {
                        const whiteL = Math.random() * 2 - 1;
                        const whiteR = Math.random() * 2 - 1;
                        outputL[i] = (lastOutL + (0.02 * whiteL)) / 1.02;
                        outputR[i] = (lastOutR + (0.02 * whiteR)) / 1.02;
                        lastOutL = outputL[i];
                        lastOutR = outputR[i];
                        outputL[i] *= 3.5;
                        outputR[i] *= 3.5;
                    }
                    break;
                    
                default:
                    return;
            }

            const source = ctx.createBufferSource();
            source.buffer = noiseBuffer;
            source.loop = true;

            const gain = ctx.createGain();
            gain.gain.value = 0.2; // Lower volume for comfort

            // Add a subtle low-pass filter for all types to reduce harshness
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = type === 'brown' ? 800 : type === 'pink' ? 1200 : 2000;
            filter.Q.value = 0.5;

            source.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            source.start(0);

            setAudioContext(ctx);
            setWhiteNoiseNode(source);
            setGainNode(gain);
            setIsWhiteNoiseOn(true);
        } catch (error) {
            console.error('Failed to start white noise:', error);
        }
    };

    const stopWhiteNoise = () => {
        if (whiteNoiseNode) {
            whiteNoiseNode.stop();
            setWhiteNoiseNode(null);
        }
        if (audioContext) {
            audioContext.close();
            setAudioContext(null);
        }
        setIsWhiteNoiseOn(false);
    };

    const toggleWhiteNoise = () => {
        if (isWhiteNoiseOn) {
            stopWhiteNoise();
        } else {
            if (selectedNoise === 'none') {
                setShowNoiseModal(true);
            } else {
                startWhiteNoise(selectedNoise);
            }
        }
    };

    const handleNoiseSelect = (noiseId: string) => {
        setSelectedNoise(noiseId);
        if (noiseId === 'none') {
            stopWhiteNoise();
        } else {
            if (isWhiteNoiseOn) {
                stopWhiteNoise();
            }
            startWhiteNoise(noiseId);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (whiteNoiseNode) {
                try {
                    whiteNoiseNode.stop();
                } catch (e) {
                    // Already stopped
                }
            }
            if (audioContext) {
                audioContext.close().catch(() => {});
            }
        };
    }, [whiteNoiseNode, audioContext]);

    const handleExit = () => {
        stopWhiteNoise();
        onExit();
    };

    return (
        <div 
            className={`fixed inset-0 z-[200] bg-gradient-to-br ${currentTheme.gradient} flex items-center justify-center overflow-hidden`}
            onClick={() => setShowControls(!showControls)}
            style={{
                touchAction: 'manipulation',
                transform: 'rotate(90deg)',
                transformOrigin: 'center center',
                width: '100vh',
                height: '100vw',
                position: 'fixed',
                top: '50%',
                left: '50%',
                marginLeft: '-50vh',
                marginTop: '-50vw'
            }}
        >
            {/* Ambient background effects */}
            <div className="absolute inset-0 opacity-30">
                <div className={`absolute top-1/4 left-1/4 w-96 h-96 ${currentTheme.glow1} rounded-full blur-3xl animate-pulse`} style={{ animationDuration: '4s' }}></div>
                <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 ${currentTheme.glow2} rounded-full blur-3xl animate-pulse`} style={{ animationDuration: '6s', animationDelay: '1s' }}></div>
            </div>

            {/* Timer Display - Landscape oriented */}
            <div 
                className="relative z-10 text-white select-none"
                style={{ 
                    fontSize: 'min(18vw, 22vh)',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontWeight: '300',
                    letterSpacing: '0.08em',
                    fontVariantNumeric: 'lining-nums tabular-nums',
                    fontFeatureSettings: '"tnum" 1',
                    textShadow: '0 0 60px rgba(255,255,255,0.4), 0 0 120px rgba(147,197,253,0.3)'
                }}
            >
                {formatTime(elapsed)}
            </div>

            {/* Controls Overlay */}
            {showControls && (
                <div className="absolute inset-0 pointer-events-none animate-in fade-in duration-300">
                    {/* Back Button - Top Left */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleExit();
                        }}
                        className="pointer-events-auto absolute top-6 left-6 w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all border border-white/20 shadow-lg"
                    >
                        <X size={32} strokeWidth={2} />
                    </button>

                    {/* Theme Button - Top Right (left of noise button) */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowThemeModal(true);
                        }}
                        className="pointer-events-auto absolute top-6 right-24 w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all border border-white/20 shadow-lg"
                    >
                        <Palette size={32} strokeWidth={2} />
                    </button>

                    {/* White Noise Button - Top Right */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowNoiseModal(true);
                        }}
                        className={`pointer-events-auto absolute top-6 right-6 w-16 h-16 rounded-full backdrop-blur-md flex items-center justify-center active:scale-95 transition-all border shadow-lg ${
                            isWhiteNoiseOn 
                                ? 'bg-blue-500/30 text-white border-blue-400/40 hover:bg-blue-500/40' 
                                : 'bg-white/10 text-white/60 border-white/20 hover:bg-white/20 hover:text-white'
                        }`}
                    >
                        {isWhiteNoiseOn ? <Volume2 size={32} strokeWidth={2} /> : <VolumeX size={32} strokeWidth={2} />}
                    </button>
                </div>
            )}

            {/* Theme Selection Modal */}
            <ImmersiveSelectorModal
                isOpen={showThemeModal}
                onClose={() => setShowThemeModal(false)}
                title="选择主题"
                options={THEMES.map(t => ({ id: t.id, name: t.name }))}
                selectedId={selectedTheme}
                onSelect={setSelectedTheme}
            />

            {/* Noise Selection Modal */}
            <ImmersiveSelectorModal
                isOpen={showNoiseModal}
                onClose={() => setShowNoiseModal(false)}
                title="选择白噪音"
                options={WHITE_NOISES}
                selectedId={selectedNoise}
                onSelect={handleNoiseSelect}
            />
        </div>
    );
};
