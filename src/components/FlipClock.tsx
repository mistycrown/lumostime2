/**
 * @file FlipClock.tsx
 * @input elapsed time in seconds
 * @output Flip-style clock display with animation
 * @pos Component (Display)
 * @description A retro flip clock animation for immersive timer using Framer Motion
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlipDigitProps {
    digit: string;
    theme: any;
}

const FlipDigit: React.FC<FlipDigitProps> = ({ digit, theme }) => {
    const [currentDigit, setCurrentDigit] = useState(digit);
    const [previousDigit, setPreviousDigit] = useState(digit);

    useEffect(() => {
        if (digit !== currentDigit) {
            setPreviousDigit(currentDigit);
            setCurrentDigit(digit);
        }
    }, [digit, currentDigit]);

    // Special color handling for flip clock
    // The card background should contrast with the page background
    // Light page backgrounds -> use theme color as card (usually dark) with light text
    // Dark page backgrounds -> use light cards with dark text
    let cardBg: string;
    let textColor: string;
    
    if (theme.id === 'forest') {
        // Forest: dark green background, so use light green cards with dark green text
        cardBg = '#d1fae5'; // light green card
        textColor = '#064e3b'; // dark green text
    } else if (theme.id === 'sunset') {
        // Sunset: dark red background, so use light pink cards with dark red text
        cardBg = '#ffe4e6'; // light pink card
        textColor = '#7f1d1d'; // dark red text
    } else if (theme.id === 'midnight') {
        // Midnight: dark blue background, so use light cards with dark text
        cardBg = '#e0e7ff'; // light indigo card
        textColor = '#1e293b'; // dark slate text
    } else {
        // For light themes (zen, retro), use theme color as card with white text
        const isLightTheme = theme.clockStyle.color === '#2d2d2d' || 
                             theme.clockStyle.color === '#44403c' ||
                             theme.clockStyle.color === '#d97706';
        
        if (isLightTheme) {
            // Light background themes: use theme color for card, white text
            cardBg = theme.clockStyle.color;
            textColor = '#ffffff';
        } else {
            // Fallback
            cardBg = '#ffffff';
            textColor = '#000000';
        }
    }

    // Optimized sizing for fullscreen without overflow
    const isLandscape = typeof window !== 'undefined' && window.innerWidth > window.innerHeight;
    // In landscape: limit by vh (height), in portrait: limit by vw (width)
    const digitSize = isLandscape ? 'min(18vh, 15vw)' : 'min(32vw, 26vh)';
    const cardWidth = isLandscape ? 'min(20vh, 17vw)' : 'min(36vw, 29vh)';
    const cardHeight = isLandscape ? 'min(30vh, 25vw)' : 'min(54vw, 44vh)';

    return (
        <div 
            className="relative"
            style={{
                width: cardWidth,
                height: cardHeight,
                perspective: '1000px'
            }}
        >
            {/* Background Card (Next Digit) */}
            <div 
                className="absolute inset-0 rounded overflow-hidden flex flex-col"
                style={{ backgroundColor: cardBg, color: textColor }}
            >
                <div className="h-1/2 w-full relative overflow-hidden border-b border-black/10">
                    <span 
                        className="absolute top-0 left-0 right-0 h-[200%] flex items-center justify-center leading-none"
                        style={{
                            fontSize: digitSize,
                            fontFamily: theme.clockStyle.fontFamily,
                            fontWeight: theme.clockStyle.fontWeight,
                            fontVariantNumeric: 'lining-nums tabular-nums'
                        }}
                    >
                        {currentDigit}
                    </span>
                </div>
                <div className="h-1/2 w-full relative overflow-hidden">
                    <span 
                        className="absolute bottom-0 left-0 right-0 h-[200%] flex items-center justify-center leading-none"
                        style={{
                            fontSize: digitSize,
                            fontFamily: theme.clockStyle.fontFamily,
                            fontWeight: theme.clockStyle.fontWeight,
                            fontVariantNumeric: 'lining-nums tabular-nums'
                        }}
                    >
                        {currentDigit}
                    </span>
                </div>
            </div>

            {/* Top Half Flip (Previous Digit) */}
            <AnimatePresence mode="popLayout">
                {previousDigit !== currentDigit && (
                    <motion.div
                        key={`top-${previousDigit}-${currentDigit}`}
                        initial={{ rotateX: 0 }}
                        animate={{ rotateX: -90 }}
                        transition={{ duration: 0.3, ease: "easeIn" }}
                        className="absolute top-0 left-0 right-0 h-1/2 rounded-t overflow-hidden z-20"
                        style={{
                            backgroundColor: cardBg,
                            color: textColor,
                            transformOrigin: 'bottom',
                            transformStyle: 'preserve-3d',
                            backfaceVisibility: 'hidden'
                        }}
                    >
                        <span 
                            className="absolute top-0 left-0 right-0 h-[200%] flex items-center justify-center leading-none"
                            style={{
                                fontSize: digitSize,
                                fontFamily: theme.clockStyle.fontFamily,
                                fontWeight: theme.clockStyle.fontWeight,
                                fontVariantNumeric: 'lining-nums tabular-nums'
                            }}
                        >
                            {previousDigit}
                        </span>
                        <div className="absolute inset-0 bg-black/10" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Half Flip (Current Digit) */}
            <AnimatePresence mode="popLayout">
                {previousDigit !== currentDigit && (
                    <motion.div
                        key={`bottom-${previousDigit}-${currentDigit}`}
                        initial={{ rotateX: 90 }}
                        animate={{ rotateX: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut", delay: 0.3 }}
                        className="absolute bottom-0 left-0 right-0 h-1/2 rounded-b overflow-hidden z-30"
                        style={{
                            backgroundColor: cardBg,
                            color: textColor,
                            transformOrigin: 'top',
                            transformStyle: 'preserve-3d',
                            backfaceVisibility: 'hidden'
                        }}
                    >
                        <span 
                            className="absolute bottom-0 left-0 right-0 h-[200%] flex items-center justify-center leading-none"
                            style={{
                                fontSize: digitSize,
                                fontFamily: theme.clockStyle.fontFamily,
                                fontWeight: theme.clockStyle.fontWeight,
                                fontVariantNumeric: 'lining-nums tabular-nums'
                            }}
                        >
                            {currentDigit}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Static Bottom (Previous Digit) - Visible until bottom flip covers it */}
            <div 
                className="absolute bottom-0 left-0 right-0 h-1/2 rounded-b overflow-hidden flex flex-col justify-end z-10"
                style={{ backgroundColor: cardBg, color: textColor }}
            >
                <span 
                    className="absolute bottom-0 left-0 right-0 h-[200%] flex items-center justify-center leading-none"
                    style={{
                        fontSize: digitSize,
                        fontFamily: theme.clockStyle.fontFamily,
                        fontWeight: theme.clockStyle.fontWeight,
                        fontVariantNumeric: 'lining-nums tabular-nums'
                    }}
                >
                    {previousDigit}
                </span>
            </div>

            {/* Split Line */}
            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-black/20 z-40 transform -translate-y-1/2" />
        </div>
    );
};

interface FlipClockProps {
    elapsed: number;
    theme: any;
}

export const FlipClock: React.FC<FlipClockProps> = ({ elapsed, theme }) => {
    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return {
            hours: h.toString().padStart(2, '0'),
            minutes: m.toString().padStart(2, '0'),
            seconds: s.toString().padStart(2, '0')
        };
    };

    const time = formatTime(elapsed);
    const hStr = time.hours;
    const mStr = time.minutes;
    const sStr = time.seconds;

    // Optimized colon sizing to match flip cards
    const isLandscape = typeof window !== 'undefined' && window.innerWidth > window.innerHeight;
    const colonSize = isLandscape ? 'min(15vh, 12vw)' : 'min(26vw, 21vh)';

    return (
        <div className="flex items-center gap-3 md:gap-4">
            <FlipDigit digit={hStr[0]} theme={theme} />
            <FlipDigit digit={hStr[1]} theme={theme} />
            
            <div 
                className="font-bold pb-4"
                style={{ 
                    color: theme.clockStyle.color,
                    fontFamily: theme.clockStyle.fontFamily,
                    fontSize: colonSize
                }}
            >
                :
            </div>
            
            <FlipDigit digit={mStr[0]} theme={theme} />
            <FlipDigit digit={mStr[1]} theme={theme} />
            
            <div 
                className="font-bold pb-4"
                style={{ 
                    color: theme.clockStyle.color,
                    fontFamily: theme.clockStyle.fontFamily,
                    fontSize: colonSize
                }}
            >
                :
            </div>
            
            <FlipDigit digit={sStr[0]} theme={theme} />
            <FlipDigit digit={sStr[1]} theme={theme} />
        </div>
    );
};
