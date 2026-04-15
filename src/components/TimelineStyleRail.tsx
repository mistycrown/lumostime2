/**
 * @file TimelineStyleRail.tsx
 * @input Timeline style theme, active config, and node index
 * @output Styled rail segment and node marker for timeline log items, with optional line truncation, anchor offset, centered forced dot nodes, and optional rail-width cap
 * @pos Component (Timeline)
 * @description 时间线样式轨道组件 - 复用参考项目的节点与连线逻辑，用于普通时间记录节点，并支持在最后一个节点处截断连线、整体锚点偏移以及强制圆点节点
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import React from 'react';
import { Leaf, MapPin, Moon, Music, Music2, Music3, Music4, PawPrint, Scissors, Star } from 'lucide-react';
import { TimelineStyleConfig, TimelineStyleTheme } from '../services/timelineStyleService';

interface TimelineStyleRailProps {
    theme: TimelineStyleTheme;
    config: TimelineStyleConfig;
    index: number;
    showLine?: boolean;
    showNode?: boolean;
    extendLinePastContainer?: boolean;
    anchorOffsetX?: number;
    forceDotNode?: boolean;
    nodeColorOverride?: string;
    maxTimelineWidth?: number;
}

export const TimelineStyleRail: React.FC<TimelineStyleRailProps> = ({
    theme,
    config,
    index,
    showLine = true,
    showNode = true,
    extendLinePastContainer = true,
    anchorOffsetX = 0,
    forceDotNode = false,
    nodeColorOverride,
    maxTimelineWidth
}) => {
    const isLegacyClassicTheme = (theme as string) === 'classic';

    const renderLine = () => {
        const { lineWidth, timelineWidth, lineColor, lineOpacity, railOffsetX } = config;
        const opacity = lineOpacity / 100;
        const encodedColor = encodeURIComponent(lineColor);
        const bottomOffset = extendLinePastContainer ? '-2.5rem' : '0';
        const sharedOffsetX = railOffsetX + anchorOffsetX;
        const resolvedTimelineWidth = Math.min(timelineWidth, maxTimelineWidth ?? timelineWidth);

        if (theme === 'default' || !showLine) {
            return null;
        }

        if (isLegacyClassicTheme) {
            return (
                <div
                    className="absolute top-3 bottom-[-2.5rem] left-0 -translate-x-1/2 transition-all duration-500"
                    style={{ width: `${lineWidth}px`, backgroundColor: lineColor, opacity, marginLeft: `${sharedOffsetX}px`, bottom: bottomOffset }}
                />
            );
        }

        if (theme === 'paw') {
            return (
                <div
                    className="absolute top-3 bottom-[-2.5rem] left-0 -translate-x-1/2 border-dotted transition-all duration-500"
                    style={{ 
                        borderLeftWidth: `${Math.max(lineWidth * 1.5, 2)}px`, 
                        borderColor: lineColor, 
                        opacity,
                        marginLeft: `${sharedOffsetX}px`,
                        bottom: bottomOffset
                    }}
                />
            );
        }

        const w = Math.max(resolvedTimelineWidth, 4);
        let h = w * 3;
        let path = '';

        const pad = lineWidth + w * 0.5;
        const svgW = w + pad * 2;
        const centerX = svgW / 2;
        const left = centerX - w / 2;
        const right = centerX + w / 2;

        if (theme === 'vine') {
            h = w * 3.5;
            path = `
                <path d='M${centerX},0 C${right},${h * 0.25} ${left},${h * 0.75} ${centerX},${h}' stroke='${encodedColor}' stroke-width='${lineWidth}' fill='none' />
                <circle cx='${right - w * 0.1}' cy='${h * 0.25}' r='${lineWidth * 1.2}' fill='${encodedColor}' opacity='0.7' />
                <circle cx='${left + w * 0.1}' cy='${h * 0.75}' r='${lineWidth * 0.8}' fill='${encodedColor}' opacity='0.9' />
            `;
        } else if (theme === 'celestial') {
            h = w * 4;
            path = `
                <line x1='${centerX}' y1='0' x2='${centerX}' y2='${h}' stroke='${encodedColor}' stroke-width='${lineWidth}' stroke-dasharray='${lineWidth * 2} ${lineWidth * 4}' opacity='0.5' />
                <path d='M${centerX},${h * 0.5 - lineWidth * 2} L${centerX + lineWidth * 1.5},${h * 0.5} L${centerX},${h * 0.5 + lineWidth * 2} L${centerX - lineWidth * 1.5},${h * 0.5} Z' fill='${encodedColor}' opacity='0.8' />
                <circle cx='${centerX}' cy='${h * 0.2}' r='${lineWidth * 0.8}' fill='${encodedColor}' opacity='0.6' />
            `;
        } else if (theme === 'track') {
            h = w * 2.5;
            const tieLeft = left - w * 0.5;
            const tieRight = right + w * 0.5;
            path = `
                <line x1='${left}' y1='0' x2='${left}' y2='${h}' stroke='${encodedColor}' stroke-width='${lineWidth}' />
                <line x1='${right}' y1='0' x2='${right}' y2='${h}' stroke='${encodedColor}' stroke-width='${lineWidth}' />
                <line x1='${tieLeft}' y1='${h * 0.5}' x2='${tieRight}' y2='${h * 0.5}' stroke='${encodedColor}' stroke-width='${lineWidth}' />
                <circle cx='${left}' cy='${h * 0.5}' r='${lineWidth * 0.8}' fill='${encodedColor}' />
                <circle cx='${right}' cy='${h * 0.5}' r='${lineWidth * 0.8}' fill='${encodedColor}' />
            `;
        } else if (theme === 'stitches') {
            h = w * 2.5;
            path = `
                <path d='M${left},${h * 0.3} L${right},${h * 0.7} M${right},${h * 0.3} L${left},${h * 0.7}' stroke='${encodedColor}' stroke-width='${lineWidth}' fill='none' stroke-linecap='round' />
                <circle cx='${left}' cy='${h * 0.3}' r='${lineWidth * 0.6}' fill='${encodedColor}' opacity='0.6' />
                <circle cx='${right}' cy='${h * 0.7}' r='${lineWidth * 0.6}' fill='${encodedColor}' opacity='0.6' />
                <circle cx='${right}' cy='${h * 0.3}' r='${lineWidth * 0.6}' fill='${encodedColor}' opacity='0.6' />
                <circle cx='${left}' cy='${h * 0.7}' r='${lineWidth * 0.6}' fill='${encodedColor}' opacity='0.6' />
            `;
        } else if (theme === 'music') {
            h = w * 2;
            path = `
                <line x1='${centerX - w}' y1='0' x2='${centerX - w}' y2='${h}' stroke='${encodedColor}' stroke-width='${lineWidth}' opacity='0.4' />
                <line x1='${centerX - w * 0.5}' y1='0' x2='${centerX - w * 0.5}' y2='${h}' stroke='${encodedColor}' stroke-width='${lineWidth}' opacity='0.4' />
                <line x1='${centerX}' y1='0' x2='${centerX}' y2='${h}' stroke='${encodedColor}' stroke-width='${lineWidth}' opacity='0.4' />
                <line x1='${centerX + w * 0.5}' y1='0' x2='${centerX + w * 0.5}' y2='${h}' stroke='${encodedColor}' stroke-width='${lineWidth}' opacity='0.4' />
                <line x1='${centerX + w}' y1='0' x2='${centerX + w}' y2='${h}' stroke='${encodedColor}' stroke-width='${lineWidth}' opacity='0.4' />
            `;
        }

        const svgString = `data:image/svg+xml,%3Csvg width='${svgW}' height='${h}' viewBox='0 0 ${svgW} ${h}' xmlns='http://www.w3.org/2000/svg'%3E${path.replace(/\s+/g, ' ')}%3C/svg%3E`;

        return (
            <div
                className="absolute top-3 bottom-[-2.5rem] left-0 -translate-x-1/2 transition-all duration-500"
                style={{
                    width: `${svgW}px`,
                    opacity,
                    backgroundImage: `url("${svgString.replace(/"/g, '\'')}")`,
                    backgroundRepeat: 'repeat-y',
                    backgroundPosition: 'center top',
                    marginLeft: `${sharedOffsetX}px`,
                    bottom: bottomOffset
                }}
            />
        );
    };

    const renderNode = () => {
        if (!showNode) {
            return null;
        }

        const { iconSize, iconAngle, offsetX, timeNodeOffsetY, uniformNodes, nodeColor } = config;
        const resolvedNodeColor = nodeColorOverride || nodeColor;
        const sharedOffsetX = offsetX + anchorOffsetX;

        if (forceDotNode) {
            return (
                <div
                    className="absolute top-1 left-0 -translate-x-1/2 z-20 flex items-center justify-center transition-all duration-500"
                    style={{ marginLeft: `${sharedOffsetX}px`, marginTop: `${timeNodeOffsetY}px` }}
                >
                    <div
                        className="w-2.5 h-2.5 rounded-full border-2 border-[#faf9f6] z-10"
                        style={{ backgroundColor: resolvedNodeColor }}
                    />
                </div>
            );
        }

        if (theme === 'default') {
            return (
                <div className="absolute -left-[11px] top-0 z-20 flex items-center justify-center" style={{ marginTop: `${timeNodeOffsetY}px` }}>
                    <div className="w-2.5 h-2.5 mt-1.5 ml-1.5 rounded-full bg-stone-900 border-2 border-[#faf9f6] z-10" />
                </div>
            );
        }

        if (isLegacyClassicTheme) {
            const dotSize = Math.max(6, iconSize - 6);

            return (
                <div
                    className="absolute top-2 left-0 -translate-x-1/2 z-10 rounded-full ring-4 transition-all duration-500"
                    style={{
                        width: dotSize,
                        height: dotSize,
                        marginLeft: `${sharedOffsetX}px`,
                        marginTop: `${timeNodeOffsetY}px`,
                        backgroundColor: resolvedNodeColor,
                        boxShadow: '0 0 0 4px #faf9f6',
                        color: resolvedNodeColor
                    }}
                />
            );
        }

        let Icon = Star;
        let currentAngle = iconAngle;

        if (theme === 'vine') {
            Icon = Leaf;
        } else if (theme === 'celestial') {
            Icon = uniformNodes ? Star : [Star, Moon][index % 2];
        } else if (theme === 'track') {
            Icon = MapPin;
        } else if (theme === 'stitches') {
            Icon = Scissors;
        } else if (theme === 'paw') {
            Icon = PawPrint;
            const pawAngles = [0, -96, -26, -110];
            currentAngle = uniformNodes ? iconAngle : pawAngles[index % pawAngles.length] + iconAngle;
        } else if (theme === 'music') {
            const musicIcons = [Music, Music2, Music3, Music4];
            const musicAngles = [-15, 10, -5, 15];
            Icon = uniformNodes ? Music : musicIcons[index % musicIcons.length];
            currentAngle = uniformNodes ? iconAngle : musicAngles[index % musicAngles.length] + iconAngle;
        }

        return (
            <div
                className="absolute top-1 left-0 -translate-x-1/2 z-10 transition-all duration-500 flex items-center justify-center"
                style={{
                    marginLeft: `${sharedOffsetX}px`,
                    marginTop: `${timeNodeOffsetY}px`,
                    color: resolvedNodeColor,
                    filter: 'drop-shadow(0 0 1px #faf9f6) drop-shadow(0 0 1px #faf9f6)'
                }}
            >
                <div style={{ transform: `rotate(${currentAngle}deg)`, display: 'flex', transition: 'transform 0.3s ease' }}>
                    <Icon size={iconSize} strokeWidth={2.5} />
                </div>
            </div>
        );
    };

    if (theme === 'default') {
        return <>{renderNode()}</>;
    }

    if (!showNode && !showLine) {
        return null;
    }

    if (!showLine) {
        return (
            <div className="absolute left-0 top-0 w-0 pointer-events-none overflow-visible">
                {renderNode()}
            </div>
        );
    }

    return (
        <div
            className="absolute left-0 top-0 w-0 pointer-events-none overflow-visible"
            style={{ bottom: extendLinePastContainer ? '-1.75rem' : '0' }}
        >
            {renderLine()}
            {renderNode()}
        </div>
    );
};
