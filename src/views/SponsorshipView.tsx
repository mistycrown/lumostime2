/**
 * @file SponsorshipView.tsx
 * @input onBack (callback), onToast (callback), categories (Category[])
 * @output Navigation (onBack), Toast Messages (onToast), Theme Changes (localStorage, service calls)
 * @pos View
 * @description 投喂功能页面 - 包含兑换码验证、专属徽章、应用图标、背景图片、导航栏样式等功能
 * @updated 2026-04-19: Switched custom sticker set management to a centered modal editor with fixed 16-slot uploads, small-square tiles, and direct delete confirmations.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 * @updated 2026-07-21: Added the synchronized month-calendar number style selector to the style tab.
 * @updated 2026-08-15: Added confirmation before clearing the saved redemption-code state.
 * @updated 2026-09-25: Added the opt-in merged-group sticker selector settings and management UI.
 * @updated 2026-09-25: Registers custom sticker uploads in the theme image manifest group.
 * @updated 2026-09-25: Added direct ZIP import for folder-based custom sticker groups.
 * @updated 2026-09-26: Added Memoir mood-calendar background management to personalization.
 * @updated 2026-09-26: Added theme-package import choices for apply-only or import-only and direct same-ID replacement.
 * @updated 2026-09-26: Unifies theme cards and deletion, saves complete immutable snapshots, and removes preset editing.
 * @updated 2026-09-26: Added synchronized card-background group settings to the style tab.
 * @updated 2026-09-27: Uses each theme's first UIIcon image as its scheme-card preview.
 * @updated 2026-09-27: Resolves imported UIIcon previews from archived assets and built-in theme IDs.
 * @updated 2026-09-27: Moved Memoir mood-calendar background settings from navigation to the style tab.
 * @updated 2026-09-27: Wrapped Memoir mood-calendar background settings in the shared style-card treatment.
 * @updated 2026-09-27: Adds the timeline header sticker debugger entry to the style tab.
 * @updated 2026-09-28: Added strict 96-image UIIcon ZIP import with duplicate-name resolution.
 * @updated 2026-09-28: Gives legacy built-in presets explicit defaults for modern navigation and Memoir calendar styling.
 * @updated 2026-09-28: Lets package-theme deletion retain user-selectable resources and resolves retained-resource reimports.
 */
import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, Fish, Check, X, Plus, Upload, Trash2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { ToastType } from '../components/Toast';
import { RedemptionService } from '../services/redemptionService';
import { IconPreview } from '../components/IconPreview';
import { BackgroundSelector } from '../components/BackgroundSelector';
import { NavigationBackgroundSelector } from '../components/NavigationBackgroundSelector';
import { MoodCalendarBackgroundSelector } from '../components/MoodCalendarBackgroundSelector';
import { TimelineStyleSelector } from '../components/TimelineStyleSelector';
import { ScheduleStyleSelector } from '../components/ScheduleStyleSelector';
import { ColorSchemeSelector } from '../components/ColorSchemeSelector';
import { CustomColorGroupManager } from '../components/CustomColorGroupManager';
import { ChartPaletteSequenceManager } from '../components/ChartPaletteSequenceManager';
import { AchievementBottleIconPackSelector } from '../components/achievement/AchievementBottleIconPackSelector';
import { AchievementBottleStyleSelector } from '../components/achievement/AchievementBottleStyleSelector';
import { CalendarNumberStyleSelector } from '../components/CalendarNumberStyleSelector';
import { CardBackgroundSelector } from '../components/CardBackgroundSelector';
import { iconService, ICON_OPTIONS } from '../services/iconService';
import { AppView, Category, CustomStickerRecord, CustomStickerSetRecord } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useReview } from '../contexts/ReviewContext';
import { useNavigation } from '../contexts/NavigationContext';
import { InputModal } from '../components/InputModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { useCustomPresets, ThemePreset, getValidationErrorMessage } from '../hooks/useCustomPresets';
import { TimePalSettings } from '../components/TimePalSettings';
import { ThemePresetService } from '../services/themePresetService';
import { UiThemeButton } from '../components/UiThemeButton';
import { FontSelector } from '../components/FontSelector';
import { userStatsService, UserStats } from '../services/userStatsService';
import { stickerService } from '../services/stickerService';
import { IconRenderer } from '../components/IconRenderer';
import { StickerSetEditModal } from '../components/StickerSetEditModal';
import { imageService } from '../services/imageService';
import { buildCustomStickerViewSets } from '../services/customStickerAssetService';
import { parseCustomStickerZip } from '../services/customStickerZipService';
import { parseUIIconZip, type ParsedUIIconZip } from '../services/uiIconZipService';
import {
    getUIIconTypeByNumber,
    uiIconService,
    UI_ICON_CUSTOM_THEMES_CHANGED_EVENT,
    type CustomUIIconThemeEntry
} from '../services/uiIconService';
import {
    themePackageImportService,
    ThemePackageImportError,
    getThemePackageUiIconPreviewFallbackFilename
} from '../services/themePackageImportService';
import { applyImportedThemePackage } from '../services/themePackageApplicationService';
import { THEME_PACKAGE_CHANGE_EVENT } from '../services/themePackageImportService';
import {
    applyDefaultThemeSupplement,
    applyThemeSettingsSnapshot
} from '../services/themeSnapshotService';
import { resolveAssetPath } from '../utils/assetPath';
import { getTimePalPreviewPath } from '../constants/timePalConfig';
import {
    buildDefaultStickerSelectorGroups,
    type StickerSelectorGroup
} from '../services/stickerSelectorLayoutService';

interface SponsorshipViewProps {
    onBack: () => void;
    onToast: (type: ToastType, message: string) => void;
    categories: Category[];
}

type StickerDeleteTarget =
    | {
        kind: 'sticker';
        stickerId: string;
        stickerName: string;
        referenceCount: number;
    }
    | {
        kind: 'set';
        setId: string;
        setName: string;
        stickerCount: number;
        referenceCount: number;
    }
    | null;

interface PendingUIIconZipImport {
    name: string;
    parsed: ParsedUIIconZip;
    existingTheme: CustomUIIconThemeEntry;
}

interface ThemeCardEntry {
    id: string;
    name: string;
    description: string;
    source: 'builtin' | 'saved' | 'package';
    version?: string;
    colorScheme: string;
    uiTheme: string;
    uiIconPreviewImageFilename?: string;
    uiIconPreviewImageUrl?: string;
    deletable: boolean;
    selected: boolean;
    onApply: () => void;
    onDelete?: () => void;
}

const PACKAGE_THEME_ID_PREFIX = 'package:';

const THEME_SWATCH_COLORS: Record<string, string> = {
    default: '#e7e5e4',
    'morandi-purple': '#b8a5c8',
    'morandi-pink': '#e8b4b8',
    'dunhuang-feitian': '#e8c4a0',
    'bamboo-green': '#a8c5a8',
    'morandi-cyan': '#a8c8d8',
    'latte-caramel': '#d4b5a0',
    'morandi-green': '#b5c8b5',
    'klein-blue': '#5a8fc8',
    'morandi-yellow': '#e8d4a8',
    'sky-blue': '#7ab8d8',
    'film-japanese': '#8fbec8'
};

const ThemeSchemePreview: React.FC<{
    name: string;
    uiTheme: string;
    colorScheme: string;
    uiIconPreviewImageFilename?: string;
    uiIconPreviewImageUrl?: string;
}> = ({ name, uiTheme, colorScheme, uiIconPreviewImageFilename, uiIconPreviewImageUrl }) => {
    const [imageUrl, setImageUrl] = useState('');
    const [imageLoadFailed, setImageLoadFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setImageLoadFailed(false);
        setImageUrl(uiIconPreviewImageUrl || '');

        if (!uiIconPreviewImageFilename || uiIconPreviewImageUrl) {
            return () => {
                cancelled = true;
            };
        }

        void imageService.getImageUrl(uiIconPreviewImageFilename)
            .then((nextImageUrl) => {
                if (!cancelled) setImageUrl(nextImageUrl);
            })
            .catch(() => {
                if (!cancelled) setImageUrl('');
            });

        return () => {
            cancelled = true;
        };
    }, [uiIconPreviewImageFilename, uiIconPreviewImageUrl]);

    if (imageUrl && !imageLoadFailed) {
        return (
            <img
                src={imageUrl}
                alt={`${name}主题预览`}
                className="h-full w-full rounded-[inherit] object-cover"
                onError={() => setImageLoadFailed(true)}
            />
        );
    }

    return (
        <span
            className="grid h-full w-full place-items-center rounded-[inherit] text-xs font-semibold text-stone-600"
            style={{ backgroundColor: THEME_SWATCH_COLORS[colorScheme] || '#e7e5e4' }}
        >
            {uiTheme === 'default' ? 'Aa' : uiTheme.slice(0, 2)}
        </span>
    );
};

const ThemeSchemeCard: React.FC<ThemeCardEntry> = ({
    name,
    colorScheme,
    uiTheme,
    uiIconPreviewImageFilename,
    uiIconPreviewImageUrl,
    description,
    source,
    version,
    deletable,
    selected,
    onApply,
    onDelete
}) => (
    <div className={`flex items-center rounded-lg border transition-colors ${selected ? 'border-stone-400 bg-white' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
        <button type="button" onClick={onApply} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left">
            <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-stone-200">
                <ThemeSchemePreview
                    name={name}
                    uiTheme={uiTheme}
                    colorScheme={colorScheme}
                    uiIconPreviewImageFilename={uiIconPreviewImageFilename}
                    uiIconPreviewImageUrl={uiIconPreviewImageUrl}
                />
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold text-stone-800">{name}</span>
                    <span className="shrink-0 text-[10px] text-stone-400">{source === 'builtin' ? '内置' : source === 'package' ? '导入' : '已保存'}</span>
                </span>
                <span className="block truncate text-xs text-stone-500">{description || '主题外观方案'}{version ? ` · v${version}` : ''}</span>
            </span>
            {selected && <Check size={16} className="shrink-0 text-stone-700" />}
        </button>
        {deletable && onDelete && (
            <button type="button" onClick={onDelete} title={`删除${name}`} aria-label={`删除${name}`} className="mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-md text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600">
                <Trash2 size={16} />
            </button>
        )}
    </div>
);

// 主题方案数据
const THEME_PRESETS: ThemePreset[] = ([
    {
        id: 'default',
        name: '默认',
        description: '系统默认配置',
        icon: '⚙️',
        appIcon: 'icon_simple',
        uiTheme: 'default',
        colorScheme: 'default',
        background: 'default',
        navigation: 'default',
        timePal: 'none'
    },
    {
        id: 'purple',
        name: 'Purple',
        description: '优雅的紫色主题',
        icon: '💜',
        appIcon: 'icon_uvcd',
        uiTheme: 'purple',
        colorScheme: 'morandi-purple',
        background: 'purple',
        navigation: 'purple',
        timePal: 'girl3'
    },
    {
        id: 'catty',
        name: 'Catty',
        description: '可爱的粉色主题',
        icon: '🐱',
        appIcon: 'icon_cat',
        uiTheme: 'cat',
        colorScheme: 'morandi-pink',
        background: 'pinkblue',
        navigation: 'cat2',
        timePal: 'cat'
    },
    {
        id: 'little-prince',
        name: 'Little Prince',
        description: '梦幻的小王子主题',
        icon: '🤴',
        appIcon: 'icon_bijiaso',
        uiTheme: 'prince',
        colorScheme: 'dunhuang-feitian',
        background: 'little_prince',
        navigation: 'little_prince',
        timePal: 'prince'
    },
    {
        id: 'forest',
        name: 'Forest',
        description: '清新自然的绿色主题',
        icon: '🌿',
        appIcon: 'icon_plant',
        uiTheme: 'forest',
        colorScheme: 'bamboo-green',
        background: 'forest',
        navigation: 'plant',
        timePal: 'rabbit'
    },
    {
        id: 'water-color',
        name: 'Water Color',
        description: '宁静的青色主题',
        icon: '🌊',
        appIcon: 'icon_sea',
        uiTheme: 'water',
        colorScheme: 'morandi-cyan',
        background: 'grenn3',
        navigation: 'distant_mountain',
        timePal: 'girl'
    },
    {
        id: 'good-night',
        name: 'Good Night',
        description: '温暖的夜晚主题',
        icon: '🌙',
        appIcon: 'icon_moon',
        uiTheme: 'color',
        colorScheme: 'klein-blue',
        background: 'night',
        navigation: 'night',
        timePal: 'pigen'
    },
    {
        id: 'flower',
        name: 'Flower',
        description: '清新的莫兰迪绿',
        icon: '🌸',
        appIcon: 'icon_plant',
        uiTheme: 'plant',
        colorScheme: 'morandi-green',
        background: 'plant',
        navigation: 'kamon',
        timePal: 'flower'
    },
    {
        id: 'knit',
        name: 'Knit',
        description: '温暖的编织主题',
        icon: '🧶',
        appIcon: 'icon_knot',
        uiTheme: 'knit',
        colorScheme: 'latte-caramel',
        background: 'knit',
        navigation: 'knit',
        timePal: 'knit'
    },
    {
        id: 'paper',
        name: 'Paper',
        description: '清新的纸艺主题',
        icon: '📄',
        appIcon: 'icon_paper',
        uiTheme: 'paper',
        colorScheme: 'morandi-yellow',
        background: 'abstract',
        navigation: 'paper',
        timePal: 'butterfly'
    },
    {
        id: 'ancient',
        name: 'Ancient',
        description: '古典雅致主题',
        icon: '🏛️',
        appIcon: 'icon_Ukiyo-e',
        uiTheme: 'old',
        colorScheme: 'sky-blue',
        background: 'ancient',
        navigation: 'book',
        timePal: 'boy2'
    },
    {
        id: 'pencil',
        name: 'Pencil',
        description: '日系胶片主题',
        icon: '✏️',
        appIcon: 'icon_sketch',
        uiTheme: 'pencil',
        colorScheme: 'film-japanese',
        background: 'pencil',
        navigation: 'pencil',
        timePal: 'dog2'
    }
] as ThemePreset[]).map((preset) => ({
    ...preset,
    navigationMode: 'legacy',
    modernNavigation: {
        enabled: false,
        background: 'new-none',
        transparent: false,
        iconMode: 'text',
        showLabelWithIcon: false
    },
    memoirCalendarBackground: 'none',
    cardBackgroundGroupId: null,
    fontId: 'default'
}));

// UI 主题列表
const UI_THEMES = ['purple', 'color', 'prince', 'cat', 'forest', 'plant', 'water', 'knit', 'paper', 'pencil', 'old'];
const MAX_CUSTOM_STICKERS_PER_SET = 16;

export const SponsorshipView: React.FC<SponsorshipViewProps> = ({ onBack, onToast, categories }) => {
    const [redemptionCode, setRedemptionCode] = useState('');
    const [isRedeemed, setIsRedeemed] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [supporterId, setSupporterId] = useState<number | undefined>(undefined);
    const [selectedIcon, setSelectedIcon] = useState('default');
    const [isChangingIcon, setIsChangingIcon] = useState(false);
    // 使用 useMemo 避免重复实例化
    const redemptionService = React.useMemo(() => new RedemptionService(), []);
    const [showDonationModal, setShowDonationModal] = useState(false);
    const {
        defaultSelectorPage,
        setDefaultSelectorPage,
        uiIconTheme,
        setUiIconTheme,
        colorScheme,
        setColorScheme,
        setAchievementBottleStyle,
        setAchievementBottleIconPack,
        customStickerSets,
        setCustomStickerSets,
        customStickers,
        setCustomStickers,
        stickerSelectorConfig,
        setStickerSelectorConfig
    } = useSettings();
    const { dailyReviews } = useReview();
    const { setIsSettingsOpen, setCurrentView, setIsJournalMode } = useNavigation();
    
    // 根据时间段随机选择背景图片
    const [bannerImage] = useState(() => {
        const hour = new Date().getHours();
        let timeOfDay: 'morning' | 'noon' | 'evening';
        
        if (hour >= 6 && hour < 12) {
            timeOfDay = 'morning';
        } else if (hour >= 12 && hour < 18) {
            timeOfDay = 'noon';
        } else {
            timeOfDay = 'evening';
        }
        
        // 随机选择 1-3 中的一个数字
        const randomNum = Math.floor(Math.random() * 3) + 1;
        
        // 特殊处理：morning3 文件名前面有空格
        if (timeOfDay === 'morning' && randomNum === 3) {
            return resolveAssetPath('/banner/ morning3.webp');
        }
        
        return resolveAssetPath(`/banner/${timeOfDay}${randomNum}.webp`);
    });
    
    // 根据时间段生成问候语
    const [greeting] = useState(() => {
        const hour = new Date().getHours();
        
        if (hour >= 6 && hour < 12) {
            const morningGreetings = [
                { prefix: '早安，第', suffix: '位晨光伙伴' },
                { prefix: '晨光正好，第', suffix: '位早起者' },
                { prefix: '新的一天，第', suffix: '位追光人' }
            ];
            return morningGreetings[Math.floor(Math.random() * morningGreetings.length)];
        } else if (hour >= 12 && hour < 18) {
            const noonGreetings = [
                { prefix: '午安，第', suffix: '位阳光伙伴' },
                { prefix: '午后时光，第', suffix: '位同行者' },
                { prefix: '下午好，第', suffix: '位温暖支持者' }
            ];
            return noonGreetings[Math.floor(Math.random() * noonGreetings.length)];
        } else {
            const eveningGreetings = [
                { prefix: '晚安，第', suffix: '位星光伙伴' },
                { prefix: '夜幕降临，第', suffix: '位守夜人' },
                { prefix: '晚上好，第', suffix: '位温柔支持者' }
            ];
            return eveningGreetings[Math.floor(Math.random() * eveningGreetings.length)];
        }
    });
    
    // Custom presets hook
    const { 
        customPresets, 
        addCustomPreset, 
        deleteCustomPreset,
        validatePresetName 
    } = useCustomPresets();
    
    // Custom preset modals state
    const [isNameModalOpen, setIsNameModalOpen] = useState(false);
    const [pendingThemeDelete, setPendingThemeDelete] = useState<{ id: string; name: string; source: 'saved' | 'package' } | null>(null);
    const [pendingPackageResourceDelete, setPendingPackageResourceDelete] = useState<{ id: string; name: string } | null>(null);
    const [isDeletingTheme, setIsDeletingTheme] = useState(false);
    
    // Tab 页状态
    type TabType = 'preset' | 'icon' | 'colorScheme' | 'background' | 'navigation' | 'timepal' | 'font' | 'style';
    const [activeTab, setActiveTab] = useState<TabType>('preset');
    const [isEditingStickerSet, setIsEditingStickerSet] = useState(false);
    const [editingStickerSetId, setEditingStickerSetId] = useState<string | null>(null);
    const [stickerSetName, setStickerSetName] = useState('');
    const [editingSelectorGroupId, setEditingSelectorGroupId] = useState<string | null>(null);
    const [isSelectorGroupEditorOpen, setIsSelectorGroupEditorOpen] = useState(false);
    const [selectorGroupName, setSelectorGroupName] = useState('');
    const [selectorGroupSourceSetIds, setSelectorGroupSourceSetIds] = useState<string[]>([]);
    const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<StickerDeleteTarget>(null);
    const [isClearCodeConfirmOpen, setIsClearCodeConfirmOpen] = useState(false);
    const [isImportingStickerZip, setIsImportingStickerZip] = useState(false);
    const [isImportingUIIconZip, setIsImportingUIIconZip] = useState(false);
    const [isImportingThemePackage, setIsImportingThemePackage] = useState(false);
    const [pendingThemePackage, setPendingThemePackage] = useState<File | null>(null);
    const [pendingRetainedThemePackage, setPendingRetainedThemePackage] = useState<{
        file: File;
        applyAfterImport: boolean;
        packageName: string;
    } | null>(null);
    const [importedThemePackages, setImportedThemePackages] = useState(() => themePackageImportService.getImportedPackages());
    const [customUIIconThemes, setCustomUIIconThemes] = useState(() => uiIconService.getCustomThemeEntries());
    const [pendingUIIconZipImport, setPendingUIIconZipImport] = useState<PendingUIIconZipImport | null>(null);
    const stickerZipInputRef = useRef<HTMLInputElement>(null);
    const uiIconZipInputRef = useRef<HTMLInputElement>(null);
    const themePackageInputRef = useRef<HTMLInputElement>(null);

    // 用户统计数据
    const [userStats, setUserStats] = useState<UserStats | null>(null);

    // 当前应用的主题方案
    const [currentPresetId, setCurrentPresetId] = useState<string>(() => {
        return localStorage.getItem('lumostime_current_preset') || 'default';
    });
    const allPresets = React.useMemo(() => [...THEME_PRESETS, ...customPresets], [customPresets]);
    
    const customStickerViewSets = buildCustomStickerViewSets(customStickerSets, customStickers, { includeEmptySets: true });
    const editingStickerSet = React.useMemo(() => {
        if (!editingStickerSetId) {
            return null;
        }

        return customStickerViewSets.find((set) => set.id === editingStickerSetId) || null;
    }, [customStickerViewSets, editingStickerSetId]);
    const presetStickerSets = React.useMemo(
        () => stickerService.getAllStickerSets().filter((set) => !set.isCustom),
        [customStickerSets, customStickers]
    );
    const stickerReferenceCounts = React.useMemo(() => {
        const counts = new Map<string, number>();

        dailyReviews.forEach((review) => {
            const moodValue = typeof review?.moodEmoji === 'string' ? review.moodEmoji : '';
            if (!moodValue.startsWith('image:')) {
                return;
            }

            const filename = moodValue.slice(6);
            counts.set(filename, (counts.get(filename) || 0) + 1);
        });

        return counts;
    }, [dailyReviews]);

    // Handle save current settings as preset
    const handleSaveCurrentSettings = (name: string) => {
        const result = addCustomPreset(name);
        
        if (result.success) {
            onToast('success', `方案"${name}"已保存`);
            setIsNameModalOpen(false);
        } else {
            const errorMsg = getValidationErrorMessage(result.error || null);
            onToast('error', errorMsg || '保存失败，请重试');
        }
    };
    
    // Validation function for InputModal
    const validatePresetNameForModal = (name: string): string | null => {
        const error = validatePresetName(name);
        return error ? getValidationErrorMessage(error) : null;
    };
    
    // 应用主题方案
    const applyThemePreset = async (preset: ThemePreset) => {
        try {
            if (preset.snapshot) {
                const warnings = await applyThemeSettingsSnapshot(preset.snapshot);
                localStorage.setItem('lumostime_current_preset', preset.id);
                setCurrentPresetId(preset.id);
                onToast(
                    warnings.length > 0 ? 'info' : 'success',
                    warnings.length > 0 ? `方案「${preset.name}」已应用（${warnings.join('；')}）` : `方案「${preset.name}」已应用`
                );
                return;
            }
            const oldTheme = uiIconTheme;
            
            // 直接执行主题切换，不再显示确认对话框
            await executeThemePresetChange(preset, oldTheme);
            
        } catch (error) {
            console.error('[SponsorshipView] 应用主题方案失败:', error);
            onToast('error', '应用主题方案失败，请重试');
        }
    };

    // 执行主题方案切换的实际逻辑
    const executeThemePresetChange = async (preset: ThemePreset, oldTheme: string) => {
        const result = await ThemePresetService.applyThemePreset(
            preset,
            oldTheme,
            setUiIconTheme,
            setColorScheme,
            setAchievementBottleStyle,
            setAchievementBottleIconPack,
            setCurrentPresetId
        );
        
        if (!result.success) {
            onToast('error', result.message);
            return;
        }
        
        if (result.needsReload) {
            onToast('success', result.message);
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            return;
        }
        
        // 根据消息类型显示不同的 toast
        const toastType = result.message.includes('Icon') ? 'info' : 'success';
        onToast(toastType, result.message);
    };

    // 处理 UI 图标主题切换，并触发图标迁移
    const handleUiIconThemeChange = async (newTheme: string) => {
        const oldTheme = uiIconTheme;
        
        setUiIconTheme(newTheme);
        
        // 只在首次从 default 切换到自定义主题时生成 uiIcon
        if (oldTheme === 'default' && newTheme !== 'default') {
            try {
                const { iconMigrationService } = await import('../services/iconMigrationService');
                
                // 检查是否已经生成过 uiIcon
                if (!iconMigrationService.isUiIconGenerated()) {
                    // 执行一次性生成
                    const result = await iconMigrationService.generateAllUiIcons();
                    
                    if (result.success) {
                        onToast('success', `${result.message}，正在刷新...`);
                        
                        // 刷新页面以应用新数据
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    } else {
                        console.error('[SponsorshipView] uiIcon 生成失败:', result);
                        onToast('error', result.message);
                    }
                } else {
                    onToast('success', 'UI 主题已切换');
                }
            } catch (error) {
                console.error('[SponsorshipView] 图标迁移失败:', error);
                onToast('error', '图标迁移失败，请重试');
            }
        } else if (oldTheme !== 'default' && newTheme === 'default') {
            // 从自定义主题切换回 default，不做数据迁移
            onToast('success', 'UI 主题已切换');
        } else {
            // 在自定义主题之间切换，不做数据迁移
            onToast('success', 'UI 主题已切换');
        }
    };

    const getUIIconZipThemeName = (filename: string): string => (
        filename.replace(/\.zip$/i, '').trim() || '自定义 UI 图标'
    );

    const getUniqueUIIconThemeName = (baseName: string): string => {
        const usedNames = new Set(customUIIconThemes.map((theme) => theme.name));
        if (!usedNames.has(baseName)) return baseName;

        let suffix = 2;
        let candidate = `${baseName} (${suffix})`;
        while (usedNames.has(candidate)) {
            suffix += 1;
            candidate = `${baseName} (${suffix})`;
        }
        return candidate;
    };

    const importUIIconZip = async (
        name: string,
        parsed: ParsedUIIconZip,
        existingTheme?: CustomUIIconThemeEntry
    ): Promise<void> => {
        setIsImportingUIIconZip(true);
        const savedFilenames: string[] = [];
        try {
            const themeName = existingTheme ? name : getUniqueUIIconThemeName(name);
            const themeId = existingTheme?.id || `custom-uiicon:${themeName}`;
            const previousFilenames = existingTheme
                ? uiIconService.getStoredCustomThemeAssetFilenames(themeId)
                : [];
            const mapping: Record<string, string> = {};

            for (const image of parsed.images) {
                const iconType = getUIIconTypeByNumber(image.number);
                if (!iconType) throw new Error(`无法识别图标编号：${image.number}`);
                const filename = await imageService.saveImage(image.blob, 'theme');
                savedFilenames.push(filename);
                mapping[iconType] = filename;
            }

            await uiIconService.registerCustomThemeAssets(themeId, mapping, themeName);
            await Promise.allSettled(previousFilenames.map((filename) => imageService.deleteImage(filename)));
            setUiIconTheme(themeId);
            uiIconService.setTheme(themeId);
            onToast('success', `UI 图标主题「${themeName}」已导入`);
        } catch (error) {
            await Promise.allSettled(savedFilenames.map((filename) => imageService.deleteImage(filename)));
            console.error('[SponsorshipView] 导入 UI 图标压缩包失败:', error);
            onToast('error', error instanceof Error ? error.message : 'UI 图标压缩包导入失败');
        } finally {
            setIsImportingUIIconZip(false);
        }
    };

    const handleUIIconZipChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const zipFile = event.target.files?.[0];
        event.target.value = '';
        if (!zipFile) return;

        setIsImportingUIIconZip(true);
        try {
            const parsed = await parseUIIconZip(zipFile);
            const name = getUIIconZipThemeName(zipFile.name);
            const existingTheme = customUIIconThemes.find((theme) => theme.name === name);
            if (existingTheme) {
                setPendingUIIconZipImport({ name, parsed, existingTheme });
                return;
            }
            await importUIIconZip(name, parsed);
        } catch (error) {
            console.error('[SponsorshipView] 读取 UI 图标压缩包失败:', error);
            onToast('error', error instanceof Error ? error.message : 'UI 图标压缩包读取失败');
        } finally {
            setIsImportingUIIconZip(false);
        }
    };

    useEffect(() => {
        const checkVerification = async () => {
            const result = await redemptionService.isVerified();
            if (result.isVerified && result.userId) {
                setIsRedeemed(true);
                setSupporterId(result.userId);
                
                // 加载用户统计数据
                loadUserStats();
            }
        };
        checkVerification();

        // 加载当前图标设置
        const loadCurrentIcon = async () => {
            try {
                const currentIcon = iconService.getCurrentIcon();
                setSelectedIcon(currentIcon);
            } catch (error) {
                console.error('[SponsorshipView] 加载当前图标失败:', error);
            }
        };
        loadCurrentIcon();
    }, []);

    useEffect(() => {
        const refreshImportedThemePackages = () => {
            setImportedThemePackages(themePackageImportService.getImportedPackages());
        };

        window.addEventListener(THEME_PACKAGE_CHANGE_EVENT, refreshImportedThemePackages);
        return () => window.removeEventListener(THEME_PACKAGE_CHANGE_EVENT, refreshImportedThemePackages);
    }, []);

    useEffect(() => {
        const refreshCustomUIIconThemes = () => setCustomUIIconThemes(uiIconService.getCustomThemeEntries());
        window.addEventListener(UI_ICON_CUSTOM_THEMES_CHANGED_EVENT, refreshCustomUIIconThemes);
        return () => window.removeEventListener(UI_ICON_CUSTOM_THEMES_CHANGED_EVENT, refreshCustomUIIconThemes);
    }, []);

    // 加载用户统计数据
    const loadUserStats = async () => {
        try {
            const stats = await userStatsService.getUserStats();
            setUserStats(stats);
        } catch (error) {
            console.error('[SponsorshipView] 加载统计数据失败:', error);
        }
    };

    const handleRedeem = async () => {
        if (!redemptionCode.trim()) {
            onToast('error', '请输入兑换码');
            return;
        }

        setIsVerifying(true);
        try {
            const result = await redemptionService.verifyCode(redemptionCode);
            if (result.success) {
                redemptionService.saveCode(redemptionCode, result.supporterId);
                setIsRedeemed(true);
                setSupporterId(result.supporterId);
                onToast('success', '验证成功！');
            } else {
                onToast('error', result.error || '兑换码无效');
            }
        } catch (error) {
            onToast('error', '验证失败，请重试');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleClearCode = () => {
        redemptionService.clearSavedCode();
        setIsRedeemed(false);
        setRedemptionCode('');
        setSupporterId(undefined);
        setIsClearCodeConfirmOpen(false);
        onToast('success', '已重置');
    };

    const resetStickerSetForm = () => {
        setIsEditingStickerSet(false);
        setEditingStickerSetId(null);
        setStickerSetName('');
    };

    const selectorSourceSets = React.useMemo(
        () => stickerService.getAllStickerSets(),
        [customStickerSets, customStickers]
    );

    const getSelectorSourceSetOwner = (setId: string) => stickerSelectorConfig.groups.find((group) => (
        group.id !== editingSelectorGroupId && group.sourceSetIds.includes(setId)
    ));

    const handleNewStickerSelectorToggle = (enabled: boolean) => {
        setStickerSelectorConfig((previous) => ({
            enabled,
            groups: enabled && previous.groups.length === 0
                ? buildDefaultStickerSelectorGroups()
                : previous.groups
        }));
    };

    const openSelectorGroupEditor = (group?: StickerSelectorGroup) => {
        setIsSelectorGroupEditorOpen(true);
        setEditingSelectorGroupId(group?.id || null);
        setSelectorGroupName(group?.name || '');
        setSelectorGroupSourceSetIds(group?.sourceSetIds || []);
    };

    const closeSelectorGroupEditor = () => {
        setIsSelectorGroupEditorOpen(false);
        setEditingSelectorGroupId(null);
        setSelectorGroupName('');
        setSelectorGroupSourceSetIds([]);
    };

    const handleSaveSelectorGroup = () => {
        const trimmedName = selectorGroupName.trim();
        const claimedByOtherGroup = new Set(
            stickerSelectorConfig.groups
                .filter((group) => group.id !== editingSelectorGroupId)
                .flatMap((group) => group.sourceSetIds)
        );
        const validSourceSetIds = selectorGroupSourceSetIds.filter((setId) => (
            selectorSourceSets.some((set) => set.id === setId) && !claimedByOtherGroup.has(setId)
        ));

        if (!trimmedName || validSourceSetIds.length === 0) {
            onToast('error', '请输入名称并至少选择一个贴纸小组');
            return;
        }

        const groupId = editingSelectorGroupId || `sticker-group-${crypto.randomUUID()}`;
        const nextGroup: StickerSelectorGroup = {
            id: groupId,
            name: trimmedName,
            sourceSetIds: validSourceSetIds
        };

        setStickerSelectorConfig((previous) => {
            const groupsWithoutEdited = previous.groups
                .filter((group) => group.id !== editingSelectorGroupId)
                .map((group) => ({ ...group }));
            const editedIndex = previous.groups.findIndex((group) => group.id === editingSelectorGroupId);

            if (editedIndex < 0) {
                return { ...previous, groups: [...groupsWithoutEdited, nextGroup] };
            }

            groupsWithoutEdited.splice(Math.min(editedIndex, groupsWithoutEdited.length), 0, nextGroup);
            return { ...previous, groups: groupsWithoutEdited };
        });
        closeSelectorGroupEditor();
        onToast('success', editingSelectorGroupId ? '大分组已更新' : '大分组已创建');
    };

    const handleDeleteSelectorGroup = (groupId: string) => {
        setStickerSelectorConfig((previous) => ({
            ...previous,
            groups: previous.groups.filter((group) => group.id !== groupId)
        }));
        if (editingSelectorGroupId === groupId) {
            closeSelectorGroupEditor();
        }
    };

    const handleThemePackageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const packageFile = event.target.files?.[0];
        event.target.value = '';

        if (!packageFile) {
            return;
        }

        setPendingThemePackage(packageFile);
    };

    const importThemePackage = async (
        packageFile: File,
        applyAfterImport: boolean,
        retainedResourceResolution?: 'overwrite' | 'keep'
    ) => {
        setPendingThemePackage(null);
        setIsImportingThemePackage(true);
        try {
            const result = await themePackageImportService.importPackage(packageFile, { retainedResourceResolution });
            const replacedActiveTheme = currentPresetId === `${PACKAGE_THEME_ID_PREFIX}${result.record.id}`;
            setImportedThemePackages(themePackageImportService.getImportedPackages());
            if (applyAfterImport) {
                const application = await applyImportedThemePackage(result.record);
                setCurrentPresetId(`${PACKAGE_THEME_ID_PREFIX}${result.record.id}`);
                localStorage.setItem('lumostime_current_preset', `${PACKAGE_THEME_ID_PREFIX}${result.record.id}`);
                const warningText = application.warnings.length > 0
                    ? `（${application.warnings.join('；')}）`
                    : '';
                onToast(
                    application.warnings.length > 0 ? 'info' : 'success',
                    `主题「${result.record.name}」已导入并应用${warningText}`
                );
            } else {
                if (replacedActiveTheme) await applyDefaultTheme();
                onToast('success', `主题「${result.record.name}」已导入`);
            }
        } catch (error) {
            if (error instanceof ThemePackageImportError) {
                if (error.code === 'RETAINED_RESOURCES_CONFLICT') {
                    setPendingRetainedThemePackage({
                        file: packageFile,
                        applyAfterImport,
                        packageName: error.packageName || packageFile.name
                    });
                } else {
                    onToast('error', error.message);
                }
            } else {
                console.error('[SponsorshipView] 导入主题包失败:', error);
                onToast('error', error instanceof Error ? error.message : '主题包导入失败，请检查压缩包格式');
            }
        } finally {
            setIsImportingThemePackage(false);
        }
    };

    const applyImportedTheme = async (packageId: string) => {
        const record = importedThemePackages.find((item) => item.id === packageId);
        if (!record) return;

        try {
            const application = await applyImportedThemePackage(record);
            setCurrentPresetId(`${PACKAGE_THEME_ID_PREFIX}${record.id}`);
            localStorage.setItem('lumostime_current_preset', `${PACKAGE_THEME_ID_PREFIX}${record.id}`);
            onToast(
                application.warnings.length > 0 ? 'info' : 'success',
                application.warnings.length > 0
                    ? `主题「${record.name}」已应用（${application.warnings.join('；')}）`
                    : `主题「${record.name}」已应用`
            );
        } catch (error) {
            console.error('[SponsorshipView] 应用已导入主题失败:', error);
            onToast('error', '应用主题失败，请重试');
        }
    };

    const applyDefaultTheme = async (): Promise<void> => {
        const preset = THEME_PRESETS[0];
        const result = await ThemePresetService.applyThemePreset(
            preset,
            uiIconTheme,
            setUiIconTheme,
            setColorScheme,
            setAchievementBottleStyle,
            setAchievementBottleIconPack,
            setCurrentPresetId
        );
        if (!result.success) throw new Error(result.message);
        await applyDefaultThemeSupplement();
        localStorage.setItem('lumostime_current_preset', 'default');
        setCurrentPresetId('default');
    };

    const deleteTheme = async (
        target: { id: string; name: string; source: 'saved' | 'package' },
        deletePackageResources = true
    ) => {
        if (isDeletingTheme) return;
        setIsDeletingTheme(true);
        try {
            const isActive = currentPresetId === target.id
                || (target.source === 'package' && currentPresetId === `${PACKAGE_THEME_ID_PREFIX}${target.id}`);
            if (isActive) await applyDefaultTheme();

            if (target.source === 'package') {
                await themePackageImportService.deletePackage(target.id, { deleteResources: deletePackageResources });
                setImportedThemePackages(themePackageImportService.getImportedPackages());
            } else if (!deleteCustomPreset(target.id)) {
                throw new Error('方案删除失败，请重试');
            }
            setPendingThemeDelete(null);
            setPendingPackageResourceDelete(null);
            onToast('success', `方案「${target.name}」已删除`);
        } catch (error) {
            console.error('[SponsorshipView] 删除主题方案失败:', error);
            onToast('error', error instanceof Error ? error.message : '方案删除失败，请重试');
        } finally {
            setIsDeletingTheme(false);
        }
    };

    const confirmDeleteTheme = async () => {
        if (!pendingThemeDelete || isDeletingTheme) return;
        const target = pendingThemeDelete;
        if (target.source === 'package') {
            setPendingThemeDelete(null);
            setPendingPackageResourceDelete({ id: target.id, name: target.name });
            return;
        }
        await deleteTheme(target);
    };

    const countStickerReferences = (imageFilename: string) => stickerReferenceCounts.get(imageFilename) || 0;

    const handleSaveStickerSet = (nextName: string) => {
        const trimmedName = nextName.trim();

        if (!trimmedName) {
            return;
        }

        const now = Date.now();
        if (editingStickerSetId) {
            setCustomStickerSets((prev) => prev.map((set) => (
                set.id === editingStickerSetId
                    ? {
                        ...set,
                        name: trimmedName,
                        description: undefined,
                        updatedAt: now
                    }
                    : set
            )));
            setStickerSetName(trimmedName);
            onToast('success', '贴纸组已更新');
        } else {
            const newSetId = crypto.randomUUID();
            setCustomStickerSets((prev) => [
                ...prev,
                {
                    id: newSetId,
                    name: trimmedName,
                    description: undefined,
                    stickerIds: [],
                    status: 'active',
                    createdAt: now,
                    updatedAt: now
                }
            ]);
            setEditingStickerSetId(newSetId);
            setStickerSetName(trimmedName);
            onToast('success', '贴纸组已创建');
        }
    };

    const handleEditStickerSet = (setId: string) => {
        const currentSet = customStickerSets.find((item) => item.id === setId);
        if (!currentSet) {
            return;
        }

        setIsEditingStickerSet(true);
        setEditingStickerSetId(setId);
        setStickerSetName(currentSet.name);
    };

    const getUniqueStickerSetName = (baseName: string, usedNames: Set<string>): string => {
        const normalizedBaseName = baseName.trim() || '未命名贴纸组';
        let candidate = normalizedBaseName;
        let suffix = 2;

        while (usedNames.has(candidate)) {
            candidate = `${normalizedBaseName} (${suffix})`;
            suffix += 1;
        }

        usedNames.add(candidate);
        return candidate;
    };

    const handleStickerZipChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const zipFile = event.target.files?.[0];
        event.target.value = '';

        if (!zipFile) {
            return;
        }

        setIsImportingStickerZip(true);
        try {
            const groups = await parseCustomStickerZip(zipFile);
            if (groups.length === 0) {
                onToast('error', '压缩包中没有可导入的贴纸图片');
                return;
            }

            const usedNames = new Set(customStickerSets.map((set) => set.name));
            const importedSets: CustomStickerSetRecord[] = [];
            const importedStickers: CustomStickerRecord[] = [];
            const failedGroupNames: string[] = [];
            let truncatedCount = 0;

            for (const group of groups) {
                const setId = crypto.randomUUID();
                const setName = getUniqueStickerSetName(group.name, usedNames);
                const savedFilenames: string[] = [];
                const now = Date.now();

                try {
                    const stickerRecords: CustomStickerRecord[] = [];
                    for (const [slotIndex, image] of group.images.entries()) {
                        const filename = await imageService.saveImage(image.blob, 'theme');
                        savedFilenames.push(filename);
                        stickerRecords.push({
                            id: crypto.randomUUID(),
                            setId,
                            imageFilename: filename,
                            thumbnailFilename: `thumb_${filename}`,
                            label: image.label,
                            sortOrder: slotIndex,
                            status: 'active',
                            createdAt: now,
                            updatedAt: now
                        });
                    }

                    importedStickers.push(...stickerRecords);
                    importedSets.push({
                        id: setId,
                        name: setName,
                        description: undefined,
                        stickerIds: stickerRecords.map((sticker) => sticker.id),
                        status: 'active',
                        createdAt: now,
                        updatedAt: now
                    });
                    truncatedCount += group.truncatedCount;
                } catch (error) {
                    console.error(`[SponsorshipView] 导入贴纸组失败: ${group.name}`, error);
                    failedGroupNames.push(group.name);
                    await Promise.allSettled(savedFilenames.map((filename) => imageService.deleteImage(filename)));
                }
            }

            if (importedSets.length > 0) {
                setCustomStickers((previous) => [...previous, ...importedStickers]);
                setCustomStickerSets((previous) => [...previous, ...importedSets]);
            }

            if (importedSets.length === 0) {
                onToast('error', failedGroupNames.length > 0 ? '贴纸组导入失败，请重试' : '没有成功导入贴纸组');
                return;
            }

            const totalStickerCount = importedStickers.length;
            const details = [
                failedGroupNames.length > 0 ? `失败 ${failedGroupNames.length} 组` : '',
                truncatedCount > 0 ? `截取 ${truncatedCount} 张` : ''
            ].filter(Boolean);
            onToast(
                failedGroupNames.length > 0 ? 'error' : 'success',
                `已导入 ${importedSets.length} 个贴纸组、${totalStickerCount} 张贴纸${details.length > 0 ? `（${details.join('，')}）` : ''}`
            );
        } catch (error) {
            console.error('[SponsorshipView] 读取贴纸压缩包失败:', error);
            onToast('error', '压缩包读取失败，请确认文件格式正确');
        } finally {
            setIsImportingStickerZip(false);
        }
    };

    const handleUploadStickerToSlot = async (targetSetId: string, slotIndex: number, file: File) => {
        if (!targetSetId || !file) {
            return;
        }

        const targetSet = customStickerSets.find((set) => set.id === targetSetId);
        if (!targetSet || targetSet.status !== 'active') {
            return;
        }

        const activeStickers = customStickers.filter((sticker) => (
            sticker.setId === targetSetId && sticker.status === 'active'
        ));
        const occupiedSlots = new Set(activeStickers.map((sticker) => sticker.sortOrder));
        if (
            slotIndex < 0 ||
            slotIndex >= MAX_CUSTOM_STICKERS_PER_SET ||
            occupiedSlots.has(slotIndex)
        ) {
            onToast('error', '这个槽位暂时不可用，请换一个空槽位');
            return;
        }

        try {
            const filename = await imageService.saveImage(file, 'theme');
            const now = Date.now();
            const stickerId = crypto.randomUUID();
            const createdStickerRecord = {
                id: stickerId,
                setId: targetSetId,
                imageFilename: filename,
                thumbnailFilename: `thumb_${filename}`,
                label: file.name.replace(/\.[^.]+$/, ''),
                sortOrder: slotIndex,
                status: 'active' as const,
                createdAt: now,
                updatedAt: now
            };

            setCustomStickers((prev) => [...prev, createdStickerRecord]);
            setCustomStickerSets((prev) => prev.map((set) => (
                set.id === targetSetId
                    ? {
                        ...set,
                        stickerIds: [...set.stickerIds, stickerId],
                        updatedAt: now
                    }
                    : set
            )));
            onToast('success', '已上传 1 张贴纸');
        } catch (error) {
            console.error('[SponsorshipView] 上传自定义贴纸失败:', error);
            onToast('error', '贴纸上传失败，请重试');
        }
    };

    const deleteStickerNow = async (stickerId: string) => {
        const targetSticker = customStickers.find((item) => item.id === stickerId);
        if (!targetSticker) {
            return;
        }

        try {
            await imageService.deleteImage(targetSticker.imageFilename);
            const now = Date.now();

            setCustomStickers((prev) => prev.filter((sticker) => sticker.id !== stickerId));
            setCustomStickerSets((prev) => prev.map((set) => (
                set.id === targetSticker.setId
                    ? {
                        ...set,
                        stickerIds: set.stickerIds.filter((id) => id !== stickerId),
                        updatedAt: now
                    }
                    : set
            )));
            onToast('success', '贴纸已删除');
        } catch (error) {
            console.error('[SponsorshipView] 删除贴纸失败:', error);
            onToast('error', '删除贴纸失败，请重试');
        }
    };

    const deleteStickerSetNow = async (setId: string) => {
        const stickersInSet = customStickers.filter((sticker) => sticker.setId === setId);
        if (stickersInSet.length === 0) {
            setCustomStickerSets((prev) => prev.filter((set) => set.id !== setId));

            if (defaultSelectorPage === setId) {
                setDefaultSelectorPage('emoji');
            }

            if (editingStickerSetId === setId) {
                resetStickerSetForm();
            }

            onToast('success', '贴纸组已删除');
            return;
        }

        try {
            const deleteResults = await Promise.allSettled(
                stickersInSet.map(async (sticker) => {
                    await imageService.deleteImage(sticker.imageFilename);
                    return sticker.id;
                })
            );
            const deletedStickerIds = deleteResults
                .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
                .map((result) => result.value);
            const failedCount = deleteResults.length - deletedStickerIds.length;

            if (deletedStickerIds.length > 0) {
                const now = Date.now();
                setCustomStickers((prev) => prev.filter((sticker) => !deletedStickerIds.includes(sticker.id)));
                setCustomStickerSets((prev) => (
                    failedCount === 0
                        ? prev.filter((set) => set.id !== setId)
                        : prev.map((set) => (
                            set.id === setId
                                ? {
                                    ...set,
                                    stickerIds: set.stickerIds.filter((id) => !deletedStickerIds.includes(id)),
                                    updatedAt: now
                                }
                                : set
                        ))
                ));
            }

            if (failedCount === 0) {
                if (defaultSelectorPage === setId) {
                    setDefaultSelectorPage('emoji');
                }

                if (editingStickerSetId === setId) {
                    resetStickerSetForm();
                }

                onToast('success', `贴纸组已删除，已移除 ${stickersInSet.length} 张贴纸`);
                return;
            }

            if (deletedStickerIds.length > 0) {
                onToast('error', `已删除 ${deletedStickerIds.length} 张贴纸，另有 ${failedCount} 张删除失败，请重试`);
                return;
            }

            onToast('error', '删除贴纸组失败，请重试');
        } catch (error) {
            console.error('[SponsorshipView] 删除贴纸组失败:', error);
            onToast('error', '删除贴纸组失败，请重试');
        }
    };

    const handleRequestDeleteSticker = (stickerId: string) => {
        const targetSticker = customStickers.find((item) => item.id === stickerId);
        if (!targetSticker) {
            return;
        }

        setDeleteConfirmTarget({
            kind: 'sticker',
            stickerId,
            stickerName: targetSticker.label || '这张贴纸',
            referenceCount: countStickerReferences(targetSticker.imageFilename)
        });
    };

    const handleRequestDeleteStickerSet = (setId: string) => {
        const targetSet = customStickerSets.find((set) => set.id === setId);
        if (!targetSet) {
            return;
        }

        const stickersInSet = customStickers.filter((sticker) => sticker.setId === setId);
        const referenceCount = stickersInSet.reduce((total, sticker) => (
            total + countStickerReferences(sticker.imageFilename)
        ), 0);

        setDeleteConfirmTarget({
            kind: 'set',
            setId,
            setName: targetSet.name,
            stickerCount: stickersInSet.length,
            referenceCount
        });
    };

    const handleConfirmDelete = async () => {
        const target = deleteConfirmTarget;
        setDeleteConfirmTarget(null);

        if (!target) {
            return;
        }

        if (target.kind === 'sticker') {
            await deleteStickerNow(target.stickerId);
            return;
        }

        await deleteStickerSetNow(target.setId);
    };

    const handleIconChange = async (iconId: string) => {
        if (!isRedeemed) {
            onToast('error', '请先验证投喂码');
            return;
        }

        setIsChangingIcon(true);
        try {
            const result = await iconService.setIcon(iconId);

            if (result.success) {
                setSelectedIcon(iconId);
                onToast('success', result.message);
            } else {
                onToast('error', result.message);
            }
        } catch (error: any) {
            console.error('[SponsorshipView] 切换图标异常:', error);
            onToast('error', error.message || '切换图标失败');
        } finally {
            setIsChangingIcon(false);
        }
    };

    const deleteConfirmTitle = deleteConfirmTarget?.kind === 'set' ? '删除贴纸组' : '删除贴纸';
    const deleteConfirmDescription = React.useMemo(() => {
        if (!deleteConfirmTarget) {
            return '';
        }

        if (deleteConfirmTarget.kind === 'set') {
            const referenceNotice = deleteConfirmTarget.referenceCount > 0
                ? `\n\n检测到 ${deleteConfirmTarget.referenceCount} 个历史引用。确定后仍会直接删除。`
                : '';
            return `确定要删除贴纸组“${deleteConfirmTarget.setName}”吗？这会直接删除组内 ${deleteConfirmTarget.stickerCount} 张贴纸。${referenceNotice}`;
        }

        if (deleteConfirmTarget.referenceCount > 0) {
            return `确定要删除“${deleteConfirmTarget.stickerName}”吗？\n\n检测到 ${deleteConfirmTarget.referenceCount} 个历史引用。确定后仍会直接删除。`;
        }

        return `确定要删除“${deleteConfirmTarget.stickerName}”吗？\n\n此操作无法撤销。`;
    }, [deleteConfirmTarget]);

    const iconOptions = ICON_OPTIONS;

    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[var(--app-safe-area-top)] pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
                <button
                    onClick={onBack}
                    className="text-stone-400 hover:text-stone-600 p-1"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">投喂功能</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-6 pb-40">
                {!isRedeemed ? (
                    /* 兑换码输入界面 */
                    <div className="space-y-6 max-w-lg mx-auto mt-6">
                        {/* 兑换码输入 */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                            <div className="text-center space-y-2">
                                <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
                                    <Fish size={24} />
                                </div>
                                <h3 className="font-bold text-lg text-stone-800">请输入兑换码</h3>
                            </div>

                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={redemptionCode}
                                    onChange={(e) => setRedemptionCode(e.target.value)}
                                    placeholder="输入兑换码..."
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all text-center tracking-widest font-mono"
                                    disabled={isVerifying}
                                />
                                <button
                                    onClick={handleRedeem}
                                    disabled={isVerifying}
                                    className={`w-full font-bold py-3 rounded-xl transition-all shadow-lg shadow-stone-200 ${isVerifying
                                        ? 'bg-stone-400 text-white cursor-not-allowed'
                                        : 'bg-stone-800 text-white hover:bg-stone-900 active:scale-[0.98]'
                                        }`}
                                >
                                    {isVerifying ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            验证中...
                                        </span>
                                    ) : (
                                        '确定'
                                    )}
                                </button>
                            </div>

                            {/* 获取兑换码说明 */}
                            <div className="pt-4 border-t border-stone-100 space-y-2">
                                <p className="text-xs text-stone-600 text-center">
                                    如何获取兑换码？
                                    <a 
                                        href="https://my.feishu.cn/wiki/QdlZw1vVai8DJakKvOzclKQ0nPk" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700 underline ml-1"
                                    >
                                        请见链接
                                    </a>
                                </p>
                                <p className="text-xs text-stone-600 text-center">
                                    想看看主题效果？
                                    <a 
                                        href="https://my.feishu.cn/wiki/NlLSwoz7cidKm4kPqeqcjsQHnKe" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700 underline ml-1"
                                    >
                                        主题预览
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* 已解锁功能界面 */
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* 专属徽章 + Tab 导航 - 统一背景 */}
                        <div className="relative rounded-2xl overflow-hidden mb-6">
                            {/* 背景图片 - 覆盖整个区域 */}
                            <div 
                                className="absolute inset-0 bg-cover bg-center opacity-20"
                                style={{ backgroundImage: `url(${bannerImage})` }}
                            />
                            
                            {/* 内容层 */}
                            <div className="relative z-10">
                                {/* 数据统计展示 */}
                                <div className="text-center py-5 pb-3">
                                    {/* 问候语和编号 - 一行显示 */}
                                    <div className="flex items-center justify-center gap-2 mb-4">
                                        <span className="text-sm text-stone-800 font-serif font-medium drop-shadow-md">{greeting.prefix}</span>
                                        <span className="text-3xl font-bold font-serif drop-shadow-lg leading-none" style={{ color: 'var(--text-deep)' }}>#{supporterId || '001'}</span>
                                        <span className="text-sm text-stone-800 font-serif font-medium drop-shadow-md">{greeting.suffix}</span>
                                    </div>

                                    {/* 数据统计卡片 */}
                                    {userStats && (
                                        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto px-4">
                                            {/* 记录时长 */}
                                            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                                                <div className="text-xs text-stone-500 mb-1">记录时长</div>
                                                <div className="text-lg font-bold text-stone-800">{userStats.totalTimeFormatted}</div>
                                            </div>

                                            {/* 写的文字 */}
                                            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                                                <div className="text-xs text-stone-500 mb-1">写的文字</div>
                                                <div className="text-lg font-bold text-stone-800">{userStats.totalWords.toLocaleString()} 字</div>
                                            </div>

                                            {/* 记录瞬间 */}
                                            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                                                <div className="text-xs text-stone-500 mb-1">记录瞬间</div>
                                                <div className="text-lg font-bold text-stone-800">{userStats.totalImages} 张</div>
                                            </div>

                                            {/* 一起走过 */}
                                            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                                                <div className="text-xs text-stone-500 mb-1">一起走过</div>
                                                <div className="text-lg font-bold text-stone-800">{userStats.daysUsed} 天</div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Tab 导航 - 简洁风格 */}
                                <div className="flex gap-4 border-b border-stone-200 overflow-x-auto scrollbar-hide px-5">
                            {(['preset', 'icon', 'colorScheme', 'background', 'navigation', 'timepal', 'font', 'style'] as TabType[]).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`pb-3 text-sm font-serif tracking-wide whitespace-nowrap transition-colors ${
                                        activeTab === tab
                                            ? 'text-stone-900 border-b-2 border-stone-900 font-bold'
                                            : 'text-stone-400 hover:text-stone-600'
                                    }`}
                                >
                                    {{ 
                                        'preset': '方案',
                                        'icon': 'Icon', 
                                        'colorScheme': '配色',
                                        'background': '背景', 
                                        'navigation': '导航', 
                                        'timepal': '小友',
                                        'font': '字体',
                                        'style': '样式'
                                    }[tab]}
                                </button>
                            ))}
                        </div>
                            </div>
                        </div>

                        {/* Tab 内容 - 直接渲染在背景上 */}
                        <div className="animate-in fade-in duration-300 pb-20">
                            {activeTab === 'preset' && (
                                /* 方案预设 */
                                <div className="space-y-3">
                                    <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-4">
                                        <input
                                            ref={themePackageInputRef}
                                            type="file"
                                            accept=".zip,application/zip,application/x-zip-compressed"
                                            className="hidden"
                                            onChange={handleThemePackageChange}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => themePackageInputRef.current?.click()}
                                            disabled={isImportingThemePackage}
                                            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-wait disabled:opacity-60"
                                        >
                                            <span className="inline-flex items-center gap-2">
                                                <Upload size={16} />
                                                {isImportingThemePackage ? '主题包导入中…' : '导入主题压缩包'}
                                            </span>
                                        </button>
                                    </div>

                                    {allPresets.map((preset) => (
                                        <ThemeSchemeCard
                                            key={preset.id}
                                            id={preset.id}
                                            name={preset.name}
                                            description={preset.description}
                                            source={preset.isCustom ? 'saved' : 'builtin'}
                                            colorScheme={preset.colorScheme}
                                            uiTheme={preset.uiTheme}
                                            uiIconPreviewImageUrl={!preset.isCustom && preset.uiTheme !== 'default'
                                                ? resolveAssetPath(`/uiicon/${preset.uiTheme}/01.webp`)
                                                : undefined}
                                            deletable={preset.isCustom === true}
                                            selected={currentPresetId === preset.id}
                                            onApply={() => void applyThemePreset(preset)}
                                            onDelete={preset.isCustom ? () => setPendingThemeDelete({ id: preset.id, name: preset.name, source: 'saved' }) : undefined}
                                        />
                                    ))}
                                    {importedThemePackages.map((record) => {
                                        const color = record.manifest.config.color;
                                        const uiIcon = record.manifest.config.uiIcon;
                                        const colorScheme = color && typeof color === 'object' && !Array.isArray(color)
                                            && typeof (color as Record<string, unknown>).schemeId === 'string'
                                            ? String((color as Record<string, unknown>).schemeId)
                                            : 'default';
                                        const uiTheme = uiIcon && typeof uiIcon === 'object' && !Array.isArray(uiIcon)
                                            && typeof (uiIcon as Record<string, unknown>).themeId === 'string'
                                            ? String((uiIcon as Record<string, unknown>).themeId)
                                            : 'default';
                                        const uiIconPreviewImageFilename = getThemePackageUiIconPreviewFallbackFilename(record);
                                        return (
                                            <ThemeSchemeCard
                                                key={`package:${record.id}`}
                                                id={`${PACKAGE_THEME_ID_PREFIX}${record.id}`}
                                                name={record.name}
                                                description={record.description || '导入的主题压缩包'}
                                                source="package"
                                                version={record.version}
                                                colorScheme={colorScheme}
                                                uiTheme={uiTheme}
                                                uiIconPreviewImageFilename={uiIconPreviewImageFilename}
                                                uiIconPreviewImageUrl={!uiIconPreviewImageFilename && uiTheme !== 'default'
                                                    ? resolveAssetPath(`/uiicon/${uiTheme}/01.webp`)
                                                    : undefined}
                                                deletable
                                                selected={currentPresetId === record.id || currentPresetId === `${PACKAGE_THEME_ID_PREFIX}${record.id}`}
                                                onApply={() => void applyImportedTheme(record.id)}
                                                onDelete={() => setPendingThemeDelete({ id: record.id, name: record.name, source: 'package' })}
                                            />
                                        );
                                    })}

                                    {/* 保存当前设置按钮 */}
                                    <button
                                        onClick={() => setIsNameModalOpen(true)}
                                        className="w-full rounded-2xl border border-dashed border-stone-200 bg-white hover:bg-stone-50 hover:border-stone-300 transition-all p-4 flex items-center justify-center gap-2 text-stone-600 font-medium"
                                    >
                                        <span className="text-lg">+</span>
                                        <span>保存当前设置为方案</span>
                                    </button>

                                    {/* 提示信息 */}
                                    <div className="sponsorship-info-note mt-4 p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                                        <p className="text-xs text-blue-800 text-center">
                                            💡 首次应用需要打开导航栏调试，调整导航栏的位置
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'icon' && (
                                /* Icon - 包含应用图标和UI主题 */
                                <div className="space-y-8">
                                    {/* 应用图标部分 */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-stone-600">应用图标</h4>
                                            {/* 手动刷新按钮 - 仅Android显示 */}
                                            {Capacitor.isNativePlatform() && (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const result = await iconService.refreshLauncher();
                                                            onToast(result.success ? 'success' : 'info', result.message);
                                                        } catch (error: any) {
                                                            onToast('error', '刷新失败: ' + error.message);
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                >
                                                    刷新启动器
                                                </button>
                                            )}
                                        </div>

                                        {/* 图标网格 */}
                                        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(48px, 1fr))' }}>
                                            {iconOptions.map((option) => (
                                                <button
                                                    key={option.id}
                                                    onClick={() => handleIconChange(option.id)}
                                                    disabled={isChangingIcon || !isRedeemed}
                                                    className={`relative aspect-square rounded-xl transition-all hover:bg-white/50 ${!isRedeemed ? 'opacity-50 cursor-not-allowed' : ''
                                                        } ${isChangingIcon ? 'opacity-70' : ''
                                                        }`}
                                                >
                                                    {isChangingIcon && selectedIcon === option.id && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                                                            <div className="w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                                                        </div>
                                                    )}

                                                    <IconPreview
                                                        iconId={option.id}
                                                        iconName={option.name}
                                                        size="medium"
                                                    />

                                                    {selectedIcon === option.id && (
                                                        <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg">
                                                            <Check size={12} className="text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 重装提醒 */}
                                    <div className="sponsorship-warning-note p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                                        <p className="text-sm text-amber-800">
                                            重装应用前需切回默认图标，部分机型暂不可用。
                                        </p>
                                    </div>

                                    {/* UI主题部分 */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-medium text-stone-600">UI 主题</h4>
                                        
                                        {/* 主题预览网格 */}
                                        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))' }}>
                                            {/* 默认选项 */}
                                            <button
                                                onClick={() => handleUiIconThemeChange('default')}
                                                className={`relative rounded-lg border-2 transition-all overflow-hidden ${
                                                    uiIconTheme === 'default'
                                                        ? 'border-stone-400 ring-2 ring-stone-200'
                                                        : 'border-stone-200 hover:border-stone-300'
                                                }`}
                                                style={{ aspectRatio: '4/5' }}
                                            >
                                                <div className="w-full h-full flex items-center justify-center bg-white">
                                                    <span className="text-xs text-stone-400">默认</span>
                                                </div>
                                                {uiIconTheme === 'default' && (
                                                    <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg">
                                                        <Check size={12} className="text-white" />
                                                    </div>
                                                )}
                                            </button>

                                            {/* 自定义主题 - 使用 UiThemeButton 组件 */}
                                            {UI_THEMES.map(theme => (
                                                <UiThemeButton
                                                    key={theme}
                                                    theme={theme}
                                                    currentTheme={uiIconTheme}
                                                    onThemeChange={handleUiIconThemeChange}
                                                />
                                            ))}
                                            {customUIIconThemes.map((theme) => (
                                                <UiThemeButton
                                                    key={theme.id}
                                                    theme={theme.id}
                                                    label={theme.name}
                                                    currentTheme={uiIconTheme}
                                                    onThemeChange={handleUiIconThemeChange}
                                                />
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => uiIconZipInputRef.current?.click()}
                                                disabled={isImportingUIIconZip}
                                                className="relative rounded-lg border-2 border-dashed border-stone-200 overflow-hidden bg-white transition-all hover:border-stone-300 disabled:cursor-wait disabled:opacity-60"
                                                style={{ aspectRatio: '4/5' }}
                                                aria-label="从压缩包导入 UI 图标主题"
                                            >
                                                <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-stone-400">
                                                    <Upload size={20} />
                                                    <span className="text-[10px] font-medium text-stone-500">{isImportingUIIconZip ? '导入中' : '压缩包'}</span>
                                                </div>
                                            </button>
                                            <input
                                                ref={uiIconZipInputRef}
                                                type="file"
                                                accept=".zip,application/zip,application/x-zip-compressed"
                                                className="hidden"
                                                onChange={(event) => void handleUIIconZipChange(event)}
                                            />
                                        </div>
                                    </div>

                                    {/* Sticker 集部分 */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-medium text-stone-600">Sticker 集</h4>
                                        <p className="text-xs text-stone-500 mb-3">在已开启 Emoji 和 Sticker 的选择器中查看。点击带加号的小方块新建，点击自定义贴纸组可编辑。</p>
                                        
                                        {/* Sticker 集预览网格 */}
                                        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))', maxWidth: '600px' }}>
                                            <button
                                                onClick={() => {
                                                    setIsEditingStickerSet(true);
                                                    setEditingStickerSetId(null);
                                                    setStickerSetName('');
                                                }}
                                                className="relative rounded-lg border-2 border-dashed border-stone-200 overflow-hidden bg-white transition-all hover:border-stone-300"
                                                style={{ aspectRatio: '1/1' }}
                                                aria-label="新建贴纸组"
                                            >
                                                <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-stone-400">
                                                    <Plus size={22} />
                                                    <span className="text-[10px] font-medium text-stone-500">新建</span>
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => stickerZipInputRef.current?.click()}
                                                disabled={isImportingStickerZip}
                                                className="relative rounded-lg border-2 border-dashed border-stone-200 overflow-hidden bg-white transition-all hover:border-stone-300 disabled:cursor-wait disabled:opacity-60"
                                                style={{ aspectRatio: '1/1' }}
                                                aria-label="从压缩包上传贴纸"
                                            >
                                                <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-stone-400">
                                                    <Upload size={20} />
                                                    <span className="text-[10px] font-medium text-stone-500">
                                                        {isImportingStickerZip ? '导入中' : '压缩包'}
                                                    </span>
                                                </div>
                                            </button>

                                            <input
                                                ref={stickerZipInputRef}
                                                type="file"
                                                accept=".zip,application/zip,application/x-zip-compressed"
                                                className="hidden"
                                                onChange={handleStickerZipChange}
                                            />

                                            {customStickerViewSets.map((setView) => (
                                                <button
                                                    key={setView.id}
                                                    onClick={() => handleEditStickerSet(setView.id)}
                                                    className="relative rounded-lg border-2 border-stone-200 overflow-hidden bg-white transition-all hover:border-stone-300"
                                                    style={{ aspectRatio: '1/1' }}
                                                    aria-label={`编辑贴纸组 ${setView.name}`}
                                                >
                                                    <div className="w-full h-full bg-white p-1.5">
                                                        <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full">
                                                            {Array.from({ length: 4 }, (_, index) => {
                                                                const sticker = setView.stickers[index];

                                                                if (!sticker) {
                                                                    return (
                                                                        <div
                                                                            key={`empty-preview-${setView.id}-${index}`}
                                                                            className="h-full w-full rounded-md border border-dashed border-stone-200 bg-stone-50/70"
                                                                        />
                                                                    );
                                                                }

                                                                return (
                                                                    <div
                                                                        key={`${setView.id}-${sticker.id}-${index}`}
                                                                        className="h-full w-full rounded-md bg-stone-50 overflow-hidden"
                                                                    >
                                                                        <div className="w-full h-full p-1 flex items-center justify-center">
                                                                            <IconRenderer
                                                                                icon={`image:${sticker.path}`}
                                                                                size="100%"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}

                                            {presetStickerSets.map((stickerSet) => (
                                                <div
                                                    key={stickerSet.id}
                                                    className="relative rounded-lg border-2 border-stone-200 overflow-hidden"
                                                    style={{ aspectRatio: '1/1' }}
                                                >
                                                    <div className="w-full h-full bg-white p-1.5">
                                                        {/* 2x2 网格显示前 4 个 sticker */}
                                                        <div className="grid grid-cols-2 gap-1 h-full">
                                                            {stickerSet.stickers.slice(0, 4).map((sticker, index) => (
                                                                <div 
                                                                    key={index}
                                                                    className="flex items-center justify-center"
                                                                >
                                                                    <IconRenderer 
                                                                        icon={`image:${sticker.path}`} 
                                                                        size="100%"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-4 border-t border-stone-200 pt-5">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <h5 className="text-sm font-medium text-stone-700">新版 sticker 选择器</h5>
                                                    <p className="mt-1 text-xs text-stone-500">将多个贴纸小组合并后，以瀑布流连续浏览。</p>
                                                </div>
                                                <label className="relative inline-flex cursor-pointer items-center">
                                                    <input
                                                        type="checkbox"
                                                        className="peer sr-only"
                                                        checked={stickerSelectorConfig.enabled}
                                                        onChange={(event) => handleNewStickerSelectorToggle(event.target.checked)}
                                                    />
                                                    <span className="h-6 w-11 rounded-full bg-stone-200 transition peer-checked:bg-stone-800 peer-focus-visible:ring-2 peer-focus-visible:ring-stone-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-5" />
                                                </label>
                                            </div>

                                            {stickerSelectorConfig.enabled && (
                                                <>
                                                    <div className="divide-y divide-stone-200 border-y border-stone-200">
                                                        {stickerSelectorConfig.groups.map((group) => (
                                                            <div key={group.id} className="flex items-center justify-between py-3">
                                                                <div className="min-w-0">
                                                                    <div className="truncate text-sm font-medium text-stone-700">{group.name}</div>
                                                                    <div className="text-xs text-stone-400">{group.sourceSetIds.length} 个小组</div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button type="button" onClick={() => openSelectorGroupEditor(group)} className="text-xs text-stone-500 hover:text-stone-800">编辑</button>
                                                                    <button type="button" onClick={() => handleDeleteSelectorGroup(group.id)} className="text-xs text-red-400 hover:text-red-600">删除</button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {isSelectorGroupEditorOpen ? (
                                                        <div className="space-y-3 border-b border-stone-200 pb-4">
                                                            <input
                                                                value={selectorGroupName}
                                                                onChange={(event) => setSelectorGroupName(event.target.value)}
                                                                placeholder="大分组名称"
                                                                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400"
                                                            />
                                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                                                                {selectorSourceSets.map((set) => {
                                                                    const checked = selectorGroupSourceSetIds.includes(set.id);
                                                                    const owner = getSelectorSourceSetOwner(set.id);
                                                                    const unavailable = Boolean(owner);
                                                                    return (
                                                                        <button
                                                                            key={set.id}
                                                                            type="button"
                                                                            disabled={unavailable}
                                                                            onClick={() => setSelectorGroupSourceSetIds((previous) => checked ? previous.filter((id) => id !== set.id) : [...previous, set.id])}
                                                                            className={`flex min-w-0 items-center gap-2 py-2 text-left text-xs transition-colors ${unavailable ? 'cursor-not-allowed text-stone-300' : 'text-stone-600 hover:text-stone-900'}`}
                                                                        >
                                                                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${checked ? 'border-stone-800 bg-stone-800 text-white' : 'border-stone-300 text-transparent'} ${unavailable ? 'border-stone-200 bg-stone-100' : ''}`}>
                                                                                {checked ? '✓' : ''}
                                                                            </span>
                                                                            <span className="truncate">{set.name}</span>
                                                                            {owner && <span className="ml-auto shrink-0 text-[10px] text-stone-300">已在{owner.name}</span>}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                            <div className="flex justify-end gap-2">
                                                                <button type="button" onClick={closeSelectorGroupEditor} className="rounded-lg px-3 py-1.5 text-xs text-stone-500 hover:bg-white">取消</button>
                                                                <button type="button" onClick={handleSaveSelectorGroup} className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-white hover:bg-stone-700">保存大分组</button>
                                                            </div>
                                                        </div>
                                                    ) : null}

                                                    <button type="button" onClick={() => openSelectorGroupEditor()} className="w-full rounded-xl border border-dashed border-stone-300 py-2 text-xs text-stone-600 hover:border-stone-500 hover:text-stone-800">
                                                        + 新建大分组
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        <StickerSetEditModal
                                            isOpen={isEditingStickerSet}
                                            setId={editingStickerSetId}
                                            initialName={stickerSetName}
                                            stickers={editingStickerSet?.stickers || []}
                                            onClose={resetStickerSetForm}
                                            onSaveName={handleSaveStickerSet}
                                            onUploadToSlot={handleUploadStickerToSlot}
                                            onRemoveSticker={handleRequestDeleteSticker}
                                            onDeleteSet={handleRequestDeleteStickerSet}
                                        />

                                        <ConfirmModal
                                            isOpen={deleteConfirmTarget !== null}
                                            onClose={() => setDeleteConfirmTarget(null)}
                                            onConfirm={handleConfirmDelete}
                                            title={deleteConfirmTitle}
                                            description={deleteConfirmDescription}
                                            confirmText="确定删除"
                                            cancelText="取消"
                                            type="danger"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'colorScheme' && (
                                /* 配色方案 */
                                <div className="space-y-6">
                                    {/* 主题色 */}
                                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                                        <ColorSchemeSelector
                                            currentScheme={colorScheme as any}
                                            onSchemeChange={(scheme) => setColorScheme(scheme)}
                                            title="主题色"
                                        />
                                    </div>

                                    {/* 自定义色组 */}
                                    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-medium text-stone-600">自定义色组</h3>
                                            <span className="text-xs text-stone-400">输入色值保存</span>
                                        </div>
                                        <CustomColorGroupManager onToast={onToast} />
                                    </div>
                                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                                        <ChartPaletteSequenceManager onToast={onToast} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'background' && (
                                /* 背景图片切换 */
                                <BackgroundSelector onToast={onToast} />
                            )}

                            {activeTab === 'navigation' && (
                                /* 导航栏样式 */
                                <NavigationBackgroundSelector
                                    onToast={onToast}
                                    onOpenDebugger={() => {
                                        onBack();
                                        setIsSettingsOpen(false);
                                        window.setTimeout(() => {
                                            (window as any).LumosTime?.debug?.enableNavBackground?.();
                                        }, 0);
                                    }}
                                />
                            )}

                            {activeTab === 'timepal' && (
                                /* 时光小友设置 */
                                <TimePalSettings categories={categories} onToast={onToast} />
                            )}

                            {activeTab === 'font' && (
                                /* 字体切换 */
                                <FontSelector onToast={onToast} />
                            )}

                            {activeTab === 'style' && (
                                <div className="space-y-5 pt-2">
                                    <AchievementBottleIconPackSelector />
                                    <AchievementBottleStyleSelector />
                                    <CalendarNumberStyleSelector />
                                    <div className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                                        <MoodCalendarBackgroundSelector onToast={onToast} />
                                    </div>
                                    <TimelineStyleSelector
                                        onToast={onToast}
                                        onOpenHeaderDebugger={() => {
                                            onBack();
                                            setCurrentView(AppView.TIMELINE);
                                            setIsSettingsOpen(false);
                                            let attempts = 0;
                                            const openDebugger = () => {
                                                const open = (window as any).enableTimelineHeaderThemeDebug;
                                                if (typeof open === 'function') {
                                                    open();
                                                    return;
                                                }
                                                attempts += 1;
                                                if (attempts < 90) window.requestAnimationFrame(openDebugger);
                                            };
                                            window.requestAnimationFrame(openDebugger);
                                        }}
                                    />
                                    <ScheduleStyleSelector />
                                    <CardBackgroundSelector onToast={onToast} />
                                </div>
                            )}
                        </div>

                        <ConfirmModal
                            isOpen={isClearCodeConfirmOpen}
                            onClose={() => setIsClearCodeConfirmOpen(false)}
                            onConfirm={handleClearCode}
                            title="清除兑换码状态？"
                            description="清除后，需要重新输入兑换码才能使用投喂功能。"
                            confirmText="确认清除"
                            cancelText="取消"
                            type="danger"
                        />

                        {/* 测试用重置按钮 */}
                        <div className="flex justify-center pt-4">
                            <button
                                onClick={() => setIsClearCodeConfirmOpen(true)}
                                className="text-xs text-stone-300 hover:text-stone-500 px-4 py-2"
                            >
                                清除兑换码状态
                            </button>
                        </div>

                        {/* Feed Me Card - Only for verified users */}
                        <div className="pt-4 pb-4 space-y-4">
                            <div
                                className="bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                                onClick={() => setShowDonationModal(true)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                                        <Fish size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-stone-800">继续投喂我</h3>
                                        <p className="text-xs text-stone-500">支持本mo继续开发更多功能~</p>
                                    </div>
                                    <div className="bg-amber-100 px-3 py-1 rounded-full text-[10px] font-bold text-amber-600">
                                        如果是真爱
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Donation Modal */}
            {showDonationModal && (
                <div
                    className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
                    onClick={() => setShowDonationModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                                        <Fish size={24} className="text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-stone-800">感谢支持</h3>
                                        <p className="text-sm text-stone-500">您的支持是我最大的动力</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDonationModal(false)}
                                    className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* QR Code Image */}
                            <div className="flex justify-center">
                                <div className="bg-stone-50 p-4 rounded-2xl">
                                    <img
                                        src={resolveAssetPath('/sponsorship_qr.jpg')}
                                        alt="投喂码"
                                        className="w-64 h-64 object-contain rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Footer Message */}
                            <div className="text-center space-y-2">
                                <p className="text-sm text-stone-600">扫码支持开发者</p>
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={() => setShowDonationModal(false)}
                                className="w-full py-3 px-4 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* 输入方案名称模态框 */}
            <InputModal
                isOpen={isNameModalOpen}
                onClose={() => setIsNameModalOpen(false)}
                onConfirm={handleSaveCurrentSettings}
                title="保存为自定义方案"
                placeholder="输入方案名称..."
                maxLength={50}
                validateFn={validatePresetNameForModal}
            />
            
            <ConfirmModal
                isOpen={!!pendingThemeDelete}
                onClose={() => !isDeletingTheme && setPendingThemeDelete(null)}
                onConfirm={() => void confirmDeleteTheme()}
                title="删除主题方案"
                description={pendingThemeDelete && (currentPresetId === pendingThemeDelete.id
                    || (pendingThemeDelete.source === 'package' && currentPresetId === `${PACKAGE_THEME_ID_PREFIX}${pendingThemeDelete.id}`))
                    ? pendingThemeDelete.source === 'package'
                        ? `确定删除「${pendingThemeDelete.name}」？当前正在使用此方案，删除前会切换到默认主题。下一步可选择是否同时删除主题资源。`
                        : `确定删除「${pendingThemeDelete.name}」？当前正在使用此方案，删除前会切换到默认主题。`
                    : pendingThemeDelete?.source === 'package'
                        ? `确定删除「${pendingThemeDelete.name}」？下一步可选择是否同时删除主题资源。`
                        : `确定删除「${pendingThemeDelete?.name || ''}」？`}
                confirmText={isDeletingTheme ? '删除中…' : '删除'}
                cancelText="取消"
                type="danger"
            />

            {pendingPackageResourceDelete && (
                <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/30 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
                        <h3 className="text-base font-semibold text-stone-800">是否删除对应资源？</h3>
                        <p className="mt-1 text-sm text-stone-500">保留后，图片、字体、贴纸等仍可在设置中继续使用；再次导入同一主题包时可选择覆盖或保留这些资源。</p>
                        <div className="mt-5 flex gap-2">
                            <button
                                type="button"
                                disabled={isDeletingTheme}
                                onClick={() => void deleteTheme({ ...pendingPackageResourceDelete, source: 'package' }, false)}
                                className="flex-1 rounded-md border border-stone-200 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                            >
                                保留资源
                            </button>
                            <button
                                type="button"
                                disabled={isDeletingTheme}
                                onClick={() => void deleteTheme({ ...pendingPackageResourceDelete, source: 'package' }, true)}
                                className="flex-1 rounded-md bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-600 disabled:opacity-50"
                            >
                                删除资源
                            </button>
                            <button
                                type="button"
                                disabled={isDeletingTheme}
                                onClick={() => setPendingPackageResourceDelete(null)}
                                className="flex-1 rounded-md border border-stone-200 px-3 py-2 text-sm text-stone-500 hover:bg-stone-50 disabled:opacity-50"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pendingUIIconZipImport && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
                        <h3 className="text-base font-semibold text-stone-800">UI 图标主题已存在</h3>
                        <p className="mt-1 text-sm text-stone-500">“{pendingUIIconZipImport.name}”已存在。请选择导入方式。</p>
                        <div className="mt-5 flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const pending = pendingUIIconZipImport;
                                    setPendingUIIconZipImport(null);
                                    void importUIIconZip(pending.name, pending.parsed, pending.existingTheme);
                                }}
                                className="flex-1 rounded-md bg-stone-800 px-3 py-2 text-sm text-white hover:bg-stone-700"
                            >
                                覆盖
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const pending = pendingUIIconZipImport;
                                    setPendingUIIconZipImport(null);
                                    void importUIIconZip(getUniqueUIIconThemeName(pending.name), pending.parsed);
                                }}
                                className="flex-1 rounded-md border border-stone-200 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                            >
                                追加
                            </button>
                            <button
                                type="button"
                                onClick={() => setPendingUIIconZipImport(null)}
                                className="flex-1 rounded-md border border-stone-200 px-3 py-2 text-sm text-stone-500 hover:bg-stone-50"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pendingThemePackage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
                        <div className="mb-4">
                            <h3 className="text-base font-semibold text-stone-800">导入主题</h3>
                            <p className="mt-1 break-all text-sm text-stone-500">{pendingThemePackage.name}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setPendingThemePackage(null)}
                                className="flex-1 rounded-md border border-stone-200 px-3 py-2 text-sm text-stone-600"
                            >
                                取消
                            </button>
                            <button
                                type="button"
                                onClick={() => void importThemePackage(pendingThemePackage, false)}
                                className="flex-1 rounded-md border border-stone-200 px-3 py-2 text-sm text-stone-700"
                            >
                                仅导入
                            </button>
                            <button
                                type="button"
                                onClick={() => void importThemePackage(pendingThemePackage, true)}
                                className="flex-1 rounded-md bg-stone-800 px-3 py-2 text-sm text-white"
                            >
                                导入并应用
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pendingRetainedThemePackage && (
                <div className="fixed inset-0 z-[102] flex items-center justify-center bg-black/30 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
                        <h3 className="text-base font-semibold text-stone-800">检测到保留的主题资源</h3>
                        <p className="mt-1 text-sm text-stone-500">“{pendingRetainedThemePackage.packageName}” 的旧资源仍在。覆盖会删除旧资源；保留旧资源会将本次导入作为独立副本。</p>
                        <div className="mt-5 flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const pending = pendingRetainedThemePackage;
                                    setPendingRetainedThemePackage(null);
                                    void importThemePackage(pending.file, pending.applyAfterImport, 'overwrite');
                                }}
                                className="flex-1 rounded-md bg-stone-800 px-3 py-2 text-sm text-white hover:bg-stone-700"
                            >
                                覆盖旧资源
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const pending = pendingRetainedThemePackage;
                                    setPendingRetainedThemePackage(null);
                                    void importThemePackage(pending.file, pending.applyAfterImport, 'keep');
                                }}
                                className="flex-1 rounded-md border border-stone-200 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                            >
                                保留旧资源
                            </button>
                            <button
                                type="button"
                                onClick={() => setPendingRetainedThemePackage(null)}
                                className="flex-1 rounded-md border border-stone-200 px-3 py-2 text-sm text-stone-500 hover:bg-stone-50"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
