/**
 * @file timelineStyleService.ts
 * @input Timeline style theme id and partial persisted config data
 * @output Timeline style defaults, option metadata, normalized config helpers
 * @pos Service (UI Customization)
 * @description 时间线样式服务 - 管理时间脉络普通节点的样式主题、默认参数和配置归一化
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

export const TIMELINE_STYLE_THEMES = [
    'default',
    'vine',
    'celestial',
    'track',
    'stitches',
    'paw',
    'music'
] as const;

export type TimelineStyleTheme = typeof TIMELINE_STYLE_THEMES[number];

export interface TimelineStyleConfig {
    iconSize: number;
    iconAngle: number;
    lineWidth: number;
    offsetX: number;
    timelineWidth: number;
    railOffsetX: number;
    timeNodeOffsetY: number;
    uniformNodes: boolean;
    nodeColor: string;
    lineColor: string;
    lineOpacity: number;
}

export type TimelineStyleConfigMap = Record<TimelineStyleTheme, TimelineStyleConfig>;

export interface TimelineStyleOption {
    value: TimelineStyleTheme;
    label: string;
}

export const DEFAULT_TIMELINE_STYLE_THEME: TimelineStyleTheme = 'default';
export const TIMELINE_STYLE_PRESET_VERSION = 2;

export const TIMELINE_STYLE_OPTIONS: TimelineStyleOption[] = [
    { value: 'default', label: '原版默认' },
    { value: 'vine', label: '自然藤蔓' },
    { value: 'celestial', label: '星月神话' },
    { value: 'track', label: '时光轨道' },
    { value: 'stitches', label: '手工缝线' },
    { value: 'paw', label: '猫爪印记' },
    { value: 'music', label: '岁月如歌' }
];

export const LEGACY_TIMELINE_STYLE_CONFIGS: TimelineStyleConfigMap = {
    default: { iconSize: 16, iconAngle: 0, lineWidth: 2, offsetX: 0, timelineWidth: 2, railOffsetX: 0, timeNodeOffsetY: 0, uniformNodes: false, nodeColor: '#374151', lineColor: '#d1d5db', lineOpacity: 60 },
    vine: { iconSize: 12, iconAngle: 94, lineWidth: 1, offsetX: 0, timelineWidth: 6, railOffsetX: 0, timeNodeOffsetY: 0, uniformNodes: false, nodeColor: '#374151', lineColor: '#d1d5db', lineOpacity: 60 },
    celestial: { iconSize: 12, iconAngle: 0, lineWidth: 2, offsetX: 0, timelineWidth: 2, railOffsetX: 0, timeNodeOffsetY: 0, uniformNodes: false, nodeColor: '#374151', lineColor: '#d1d5db', lineOpacity: 60 },
    track: { iconSize: 16, iconAngle: 0, lineWidth: 2, offsetX: 0, timelineWidth: 2, railOffsetX: 0, timeNodeOffsetY: 0, uniformNodes: false, nodeColor: '#374151', lineColor: '#d1d5db', lineOpacity: 60 },
    stitches: { iconSize: 16, iconAngle: 0, lineWidth: 2, offsetX: 0, timelineWidth: 1, railOffsetX: 0, timeNodeOffsetY: 0, uniformNodes: false, nodeColor: '#374151', lineColor: '#d1d5db', lineOpacity: 60 },
    paw: { iconSize: 12, iconAngle: 0, lineWidth: 2, offsetX: 0, timelineWidth: 2, railOffsetX: 0, timeNodeOffsetY: 0, uniformNodes: false, nodeColor: '#374151', lineColor: '#d1d5db', lineOpacity: 60 },
    music: { iconSize: 16, iconAngle: 0, lineWidth: 1, offsetX: 0, timelineWidth: 6, railOffsetX: 0, timeNodeOffsetY: 0, uniformNodes: false, nodeColor: '#374151', lineColor: '#d1d5db', lineOpacity: 60 }
};

export const DEFAULT_TIMELINE_STYLE_CONFIGS: TimelineStyleConfigMap = {
    default: { ...LEGACY_TIMELINE_STYLE_CONFIGS.default },
    vine: { iconSize: 12, iconAngle: 94, lineWidth: 1, offsetX: 0, timelineWidth: 6, railOffsetX: 0, timeNodeOffsetY: 0, uniformNodes: false, nodeColor: '#426666', lineColor: '#75878A', lineOpacity: 15 },
    celestial: { iconSize: 12, iconAngle: 0, lineWidth: 1.5, offsetX: 0, timelineWidth: 3, railOffsetX: 0, timeNodeOffsetY: 0, uniformNodes: false, nodeColor: '#5B647A', lineColor: '#AAB3C1', lineOpacity: 26 },
    track: { iconSize: 15, iconAngle: 0, lineWidth: 1.5, offsetX: 0, timelineWidth: 4, railOffsetX: 0, timeNodeOffsetY: 0, uniformNodes: false, nodeColor: '#6A6258', lineColor: '#B9B1A6', lineOpacity: 24 },
    stitches: { iconSize: 15, iconAngle: 0, lineWidth: 1.5, offsetX: 0, timelineWidth: 2, railOffsetX: 0, timeNodeOffsetY: 0, uniformNodes: false, nodeColor: '#7A6A66', lineColor: '#C7B8B1', lineOpacity: 22 },
    paw: { iconSize: 12, iconAngle: 0, lineWidth: 1.5, offsetX: 0, timelineWidth: 3, railOffsetX: 0, timeNodeOffsetY: 0, uniformNodes: false, nodeColor: '#6B615D', lineColor: '#C6BDB6', lineOpacity: 20 },
    music: { iconSize: 15, iconAngle: 0, lineWidth: 1, offsetX: 0, timelineWidth: 5, railOffsetX: 0, timeNodeOffsetY: 0, uniformNodes: false, nodeColor: '#596A74', lineColor: '#A7B8BF', lineOpacity: 18 }
};

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(max, Math.max(min, value));
};

const normalizeColor = (value: unknown, fallback: string): string => {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : fallback;
};

const normalizeConfig = (
    theme: TimelineStyleTheme,
    config: Partial<TimelineStyleConfig> | null | undefined
): TimelineStyleConfig => {
    const fallback = DEFAULT_TIMELINE_STYLE_CONFIGS[theme];

    return {
        iconSize: clamp(Number(config?.iconSize ?? fallback.iconSize), 4, 32),
        iconAngle: clamp(Number(config?.iconAngle ?? fallback.iconAngle), -180, 180),
        lineWidth: clamp(Number(config?.lineWidth ?? fallback.lineWidth), 1, 8),
        offsetX: clamp(Number(config?.offsetX ?? fallback.offsetX), -40, 40),
        timelineWidth: clamp(Number(config?.timelineWidth ?? fallback.timelineWidth), 0, 60),
        railOffsetX: clamp(Number(config?.railOffsetX ?? fallback.railOffsetX), -40, 40),
        timeNodeOffsetY: clamp(Number(config?.timeNodeOffsetY ?? fallback.timeNodeOffsetY), -20, 20),
        uniformNodes: typeof config?.uniformNodes === 'boolean' ? config.uniformNodes : fallback.uniformNodes,
        nodeColor: normalizeColor(config?.nodeColor, fallback.nodeColor),
        lineColor: normalizeColor(config?.lineColor, fallback.lineColor),
        lineOpacity: clamp(Number(config?.lineOpacity ?? fallback.lineOpacity), 0, 100)
    };
};

export const isTimelineStyleTheme = (value: unknown): value is TimelineStyleTheme => {
    return typeof value === 'string' && TIMELINE_STYLE_THEMES.includes(value as TimelineStyleTheme);
};

export const getTimelineStyleOptions = (): TimelineStyleOption[] => {
    return TIMELINE_STYLE_OPTIONS;
};

export const getTimelineStyleLabel = (theme: TimelineStyleTheme): string => {
    return TIMELINE_STYLE_OPTIONS.find((option) => option.value === theme)?.label || TIMELINE_STYLE_OPTIONS[0].label;
};

export const getDefaultTimelineStyleConfigs = (): TimelineStyleConfigMap => {
    return {
        default: { ...DEFAULT_TIMELINE_STYLE_CONFIGS.default },
        vine: { ...DEFAULT_TIMELINE_STYLE_CONFIGS.vine },
        celestial: { ...DEFAULT_TIMELINE_STYLE_CONFIGS.celestial },
        track: { ...DEFAULT_TIMELINE_STYLE_CONFIGS.track },
        stitches: { ...DEFAULT_TIMELINE_STYLE_CONFIGS.stitches },
        paw: { ...DEFAULT_TIMELINE_STYLE_CONFIGS.paw },
        music: { ...DEFAULT_TIMELINE_STYLE_CONFIGS.music }
    };
};

export const normalizeTimelineStyleConfigs = (input: unknown): TimelineStyleConfigMap => {
    const rawConfigs = (input && typeof input === 'object' ? input : {}) as Partial<Record<TimelineStyleTheme, Partial<TimelineStyleConfig>>>;
    const defaults = getDefaultTimelineStyleConfigs();

    return TIMELINE_STYLE_THEMES.reduce((acc, theme) => {
        acc[theme] = normalizeConfig(theme, rawConfigs[theme] ?? defaults[theme]);
        return acc;
    }, {} as TimelineStyleConfigMap);
};

export const areTimelineStyleConfigValuesEqual = (
    first: TimelineStyleConfig,
    second: TimelineStyleConfig
): boolean => {
    return (
        first.iconSize === second.iconSize &&
        first.iconAngle === second.iconAngle &&
        first.lineWidth === second.lineWidth &&
        first.offsetX === second.offsetX &&
        first.timelineWidth === second.timelineWidth &&
        first.railOffsetX === second.railOffsetX &&
        first.timeNodeOffsetY === second.timeNodeOffsetY &&
        first.uniformNodes === second.uniformNodes &&
        first.nodeColor.toLowerCase() === second.nodeColor.toLowerCase() &&
        first.lineColor.toLowerCase() === second.lineColor.toLowerCase() &&
        first.lineOpacity === second.lineOpacity
    );
};

export const areTimelineStyleConfigsEqual = (
    first: TimelineStyleConfigMap,
    second: TimelineStyleConfigMap
): boolean => {
    return TIMELINE_STYLE_THEMES.every((theme) => {
        return areTimelineStyleConfigValuesEqual(first[theme], second[theme]);
    });
};

export const getAdjacentTimelineStyleTheme = (
    currentTheme: TimelineStyleTheme,
    direction: 'prev' | 'next'
): TimelineStyleTheme => {
    const currentIndex = TIMELINE_STYLE_THEMES.indexOf(currentTheme);
    if (currentIndex === -1) return DEFAULT_TIMELINE_STYLE_THEME;

    if (direction === 'prev') {
        return TIMELINE_STYLE_THEMES[(currentIndex - 1 + TIMELINE_STYLE_THEMES.length) % TIMELINE_STYLE_THEMES.length];
    }

    return TIMELINE_STYLE_THEMES[(currentIndex + 1) % TIMELINE_STYLE_THEMES.length];
};
