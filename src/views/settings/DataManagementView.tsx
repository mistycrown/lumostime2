/**
 * @file DataManagementView.tsx
 * @description 数据管理页面 - 备份、导入、导出、清理等
 * @updated 2026-03-24: 图片备份支持自定义每包张数的分块导出，降低移动端导出时的内存压力。
 */
import React, { useState, useRef } from 'react';
import { ChevronLeft, Database, Download, Upload, Trash2, Cloud, FileSpreadsheet, ImageIcon, Search, RefreshCw, Package } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { ToastType } from '../../components/Toast';
import { Log, Category, DailyReview, TodoItem, TodoCategory, Scope } from '../../types';
import { getStoredCustomStickerState } from '../../services/customStickerAssetService';
import excelExportService from '../../services/excelExportService';
import { imageService } from '../../services/imageService';
import { imageCleanupService } from '../../services/imageCleanupService';
import { imageExportService, type ImageExportProgress } from '../../services/imageExportService';
import { ConfirmModal } from '../../components/ConfirmModal';

interface ImageExportSummary {
    totalImages: number;
    totalFiles: number;
}

interface DataManagementViewProps {
    onBack: () => void;
    onExport: () => void;
    onImport: (file: File) => void;
    onReset: () => void;
    onClearData: () => void;
    onToast: (type: ToastType, message: string) => void;
    logs: Log[];
    dailyReviews: DailyReview[];
    categories: Category[];
    todos: TodoItem[];
    todoCategories: TodoCategory[];
    scopes: Scope[];
    onCleanupCloudBackups: () => Promise<void>;
    onCheckCloudImageConsistency: () => Promise<string>;
    onCleanupCloudImages: () => Promise<{ message: string; report: string }>;
}

export const DataManagementView: React.FC<DataManagementViewProps> = ({
    onBack,
    onExport,
    onImport,
    onReset,
    onClearData,
    onToast,
    logs,
    dailyReviews,
    categories,
    todos,
    todoCategories,
    scopes,
    onCleanupCloudBackups,
    onCheckCloudImageConsistency,
    onCleanupCloudImages
}) => {
    const isNativePlatform = Capacitor.isNativePlatform();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageZipInputRef = useRef<HTMLInputElement>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);
    const [isCheckingImages, setIsCheckingImages] = useState(false);
    const [isCleaningImages, setIsCleaningImages] = useState(false);
    const [imageCleanupReport, setImageCleanupReport] = useState<string>('');
    const [isImageCleanupConfirmOpen, setIsImageCleanupConfirmOpen] = useState(false);
    const [isCleaningBackups, setIsCleaningBackups] = useState(false);
    const [isCheckingCloudImages, setIsCheckingCloudImages] = useState(false);
    const [isCleaningCloudImages, setIsCleaningCloudImages] = useState(false);
    const [cloudConsistencyReport, setCloudConsistencyReport] = useState('');
    const [isCloudImageCleanupConfirmOpen, setIsCloudImageCleanupConfirmOpen] = useState(false);
    const [isExportingImages, setIsExportingImages] = useState(false);
    const [isImportingImages, setIsImportingImages] = useState(false);
    const [imageExportProgress, setImageExportProgress] = useState<ImageExportProgress | null>(null);
    const [imageExportSummary, setImageExportSummary] = useState<ImageExportSummary | null>(null);
    const [imageChunkSizeInput, setImageChunkSizeInput] = useState('');
    const lastImageExportProgressAt = useRef(0);

    // Excel Export State
    const [excelStartDate, setExcelStartDate] = useState(new Date());
    const [excelEndDate, setExcelEndDate] = useState(new Date());
    const [excelStartInput, setExcelStartInput] = useState('');
    const [excelEndInput, setExcelEndInput] = useState('');
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    const formatDateTo8Digits = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    const parse8DigitsToDate = (str: string): Date | null => {
        if (str.length !== 8) return null;
        const year = parseInt(str.substring(0, 4));
        const month = parseInt(str.substring(4, 6)) - 1;
        const day = parseInt(str.substring(6, 8));
        const date = new Date(year, month, day);
        if (isNaN(date.getTime())) return null;
        return date;
    };

    React.useEffect(() => {
        const today = new Date();
        setExcelStartInput(formatDateTo8Digits(today));
        setExcelEndInput(formatDateTo8Digits(today));
    }, []);

    React.useEffect(() => {
        let cancelled = false;

        const loadImageExportSummary = async () => {
            try {
                const summary = await imageExportService.getExportImageSummary();
                if (cancelled) {
                    return;
                }

                setImageExportSummary(summary);
                setImageChunkSizeInput((currentValue) => currentValue || String(summary.totalImages || ''));
            } catch (error) {
                console.error('加载图片导出信息失败:', error);
            }
        };

        const handleImageListChanged = () => {
            void loadImageExportSummary();
        };

        void loadImageExportSummary();
        window.addEventListener('imageListChanged', handleImageListChanged as EventListener);

        return () => {
            cancelled = true;
            window.removeEventListener('imageListChanged', handleImageListChanged as EventListener);
        };
    }, []);

    const setExcelQuickRange = (type: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let newStartDate: Date;
        let newEndDate: Date;

        switch (type) {
            case 'today':
                newStartDate = today;
                newEndDate = today;
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                newStartDate = yesterday;
                newEndDate = yesterday;
                break;
            case 'thisWeek':
                const thisWeekStart = new Date(today);
                const dayOfWeek = today.getDay();
                const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                thisWeekStart.setDate(today.getDate() - daysFromMonday);
                newStartDate = thisWeekStart;
                newEndDate = today;
                break;
            case 'lastWeek':
                const lastWeekEnd = new Date(today);
                const currentDayOfWeek = today.getDay();
                const daysToLastSunday = currentDayOfWeek === 0 ? 0 : currentDayOfWeek;
                lastWeekEnd.setDate(today.getDate() - daysToLastSunday - 1);
                const lastWeekStart = new Date(lastWeekEnd);
                lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
                newStartDate = lastWeekStart;
                newEndDate = lastWeekEnd;
                break;
            case 'thisMonth':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                newStartDate = monthStart;
                newEndDate = today;
                break;
            case 'lastMonth':
                const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                newStartDate = lastMonthStart;
                newEndDate = lastMonthEnd;
                break;
            case 'thisYear':
                const yearStart = new Date(today.getFullYear(), 0, 1);
                newStartDate = yearStart;
                newEndDate = today;
                break;
            case 'all':
                newStartDate = new Date(2020, 0, 1);
                newEndDate = today;
                break;
            default:
                return;
        }

        setExcelStartDate(newStartDate);
        setExcelEndDate(newEndDate);
        setExcelStartInput(formatDateTo8Digits(newStartDate));
        setExcelEndInput(formatDateTo8Digits(newEndDate));
    };

    const handleExcelExport = async () => {
        setIsExportingExcel(true);
        try {
            const result = await excelExportService.exportLogsToExcel(
                logs,
                categories,
                todos,
                todoCategories,
                scopes,
                excelStartDate,
                excelEndDate
            );

            if (result.mode === 'native' && result.savedPath) {
                onToast('success', `Excel导出成功：${result.savedPath}`);
            } else {
                onToast('success', `Excel导出成功：${result.filename}`);
            }
        } catch (error: any) {
            console.error('Excel导出失败:', error);
            onToast('error', `Excel导出失败: ${error.message}`);
        } finally {
            setIsExportingExcel(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImport(file);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleResetClick = () => {
        if (confirmReset) {
            onReset();
            setConfirmReset(false);
        } else {
            setConfirmReset(true);
            setTimeout(() => setConfirmReset(false), 3000);
        }
    };

    const handleClearClick = () => {
        if (confirmClear) {
            onClearData();
            setConfirmClear(false);
        } else {
            setConfirmClear(true);
            setTimeout(() => setConfirmClear(false), 3000);
        }
    };

    const handleFixImageList = async () => {
        if (!confirm('这将根据本地数据引用和本地实际存在的图片文件重建图片列表，建议在同步前执行。是否继续？')) {
            return;
        }

        setIsCheckingImages(true);
        try {
            const { customStickerSets, customStickers } = getStoredCustomStickerState();
            const list = await imageService.rebuildReferencedListFromLogs(logs, todos, dailyReviews, customStickerSets, customStickers);
            onToast('success', `图片列表重建完成，当前有效图片引用 ${list.length} 个`);
        } catch (error: any) {
            console.error('修复图片列表失败:', error);
            onToast('error', `修复失败: ${error.message}`);
        } finally {
            setIsCheckingImages(false);
        }
    };

    const handleCheckUnreferencedImages = async () => {
        setIsCheckingImages(true);
        setImageCleanupReport('');
        try {
            const { customStickerSets, customStickers } = getStoredCustomStickerState();
            const report = await imageCleanupService.generateCleanupReport(logs, todos, dailyReviews, customStickerSets, customStickers);
            setImageCleanupReport(report);
            onToast('success', '检查完成');
        } catch (error: any) {
            console.error('检查未引用图片失败:', error);
            onToast('error', `检查失败: ${error.message}`);
        } finally {
            setIsCheckingImages(false);
        }
    };

    const handleConfirmImageCleanup = async () => {
        setIsImageCleanupConfirmOpen(false);
        setIsCleaningImages(true);
        try {
            const { customStickerSets, customStickers } = getStoredCustomStickerState();
            const result = await imageCleanupService.cleanupUnreferencedImages(logs, {
                deleteLocal: true,
                deleteRemote: true
            }, todos, dailyReviews, customStickerSets, customStickers);

            let message = `清理完成: 本地-${result.deletedLocal}, 远程-${result.deletedRemote}`;
            if (result.errors.length > 0) {
                message += `, 失败-${result.errors.length}`;
            }

            onToast('success', message);
            handleCheckUnreferencedImages();
        } catch (error: any) {
            console.error('清理图片失败:', error);
            onToast('error', `清理失败: ${error.message}`);
        } finally {
            setIsCleaningImages(false);
        }
    };

    const handleCleanupBackups = async () => {
        setIsCleaningBackups(true);
        await onCleanupCloudBackups();
        setIsCleaningBackups(false);
    };

    const handleCheckCloudConsistency = async () => {
        setIsCheckingCloudImages(true);
        try {
            const report = await onCheckCloudImageConsistency();
            setCloudConsistencyReport(report);
        } catch (error: any) {
            console.error('检查云端图片一致性失败:', error);
            onToast('error', `检查失败: ${error.message}`);
        } finally {
            setIsCheckingCloudImages(false);
        }
    };

    const handleConfirmCloudImageCleanup = async () => {
        setIsCloudImageCleanupConfirmOpen(false);
        setIsCleaningCloudImages(true);
        try {
            const result = await onCleanupCloudImages();
            setCloudConsistencyReport(result.report);
        } catch (error: any) {
            console.error('清理云端多余图片失败:', error);
            onToast('error', `清理失败: ${error.message}`);
        } finally {
            setIsCleaningCloudImages(false);
        }
    };

    const handleExportImages = async () => {
        setIsExportingImages(true);
        setImageExportProgress({
            stage: 'preparing',
            message: '正在准备导出...',
            current: 0,
            total: 0,
            percent: 0
        });
        lastImageExportProgressAt.current = 0;
        try {
            const parsedChunkSize = parseInt(imageChunkSizeInput, 10);
            const fallbackChunkSize = imageExportSummary?.totalImages;
            const result = await imageExportService.exportImagesToZip({
                chunkSize: Number.isFinite(parsedChunkSize) && parsedChunkSize > 0
                    ? parsedChunkSize
                    : fallbackChunkSize,
                onProgress: (progress) => {
                    const now = Date.now();
                    const shouldForceUpdate =
                        progress.stage === 'done' ||
                        progress.stage === 'writing' ||
                        progress.current === progress.total;

                    if (!shouldForceUpdate && now - lastImageExportProgressAt.current < 100) {
                        return;
                    }

                    lastImageExportProgressAt.current = now;
                    setImageExportProgress(progress);
                }
            });

            setImageChunkSizeInput(String(result.chunkSize));
            setImageExportSummary({
                totalImages: result.totalImages,
                totalFiles: result.totalFiles
            });

            if (result.mode === 'native' && result.savedPaths?.length) {
                if (result.totalChunks === 1) {
                    onToast('success', `图片导出成功：${result.savedPaths[0]}`);
                } else {
                    onToast('success', `图片导出成功，共 ${result.totalChunks} 个压缩包`);
                }
            } else {
                if (result.totalChunks === 1) {
                    onToast('success', `图片导出成功：${result.filenames[0]}`);
                } else {
                    onToast('success', `图片导出成功，已开始下载 ${result.totalChunks} 个压缩包`);
                }
            }
        } catch (error: any) {
            console.error('图片导出失败:', error);
            onToast('error', `图片导出失败: ${error.message}`);
        } finally {
            setIsExportingImages(false);
            setTimeout(() => setImageExportProgress(null), 1200);
        }
    };

    const handleImageZipFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.zip')) {
            onToast('error', '请选择ZIP格式的文件');
            return;
        }

        setIsImportingImages(true);
        try {
            const result = await imageExportService.importImagesFromZip(file);
            const message = `导入完成: 成功 ${result.success} 张, 跳过 ${result.skipped} 张${result.failed > 0 ? `, 失败 ${result.failed} 张` : ''}`;
            onToast('success', message);
        } catch (error: any) {
            console.error('图片导入失败:', error);
            onToast('error', `图片导入失败: ${error.message}`);
        } finally {
            setIsImportingImages(false);
            if (imageZipInputRef.current) {
                imageZipInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0">
                <button onClick={onBack} className="text-stone-400 hover:text-stone-600 p-1">
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">数据管理</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-40">
                {/* 备份与恢复 */}
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-stone-600 mb-2">
                        <Database size={24} />
                        <h3 className="font-bold text-lg">备份与恢复</h3>
                    </div>
                    <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                        将您的所有数据（时间记录、待办事项、分类设置等）导出为 JSON 文件，或从备份文件中恢复数据。
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                        <button
                            onClick={onExport}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-stone-800 text-white rounded-xl font-medium active:scale-[0.98] transition-transform"
                        >
                            <Download size={18} />
                            导出数据备份
                        </button>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-stone-200 text-stone-700 rounded-xl font-medium active:scale-[0.98] transition-transform hover:bg-stone-50"
                        >
                            <Upload size={18} />
                            导入数据备份
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".json"
                            className="hidden"
                        />
                    </div>

                    <div className="pt-6 mt-2 border-t border-stone-100">
                        <button
                            onClick={handleResetClick}
                            className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium active:scale-[0.98] transition-all ${confirmReset
                                ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                                : 'bg-stone-50 text-stone-400 hover:bg-red-50 hover:text-red-400'
                                }`}
                        >
                            <Trash2 size={18} />
                            {confirmReset ? "确认重置？此操作不可撤销" : "重置所有数据为默认值"}
                        </button>

                        <button
                            onClick={handleClearClick}
                            className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium active:scale-[0.98] transition-all mt-3 ${confirmClear
                                ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                                : 'bg-white border border-red-200 text-red-500 hover:bg-red-50'
                                }`}
                        >
                            <Trash2 size={18} />
                            {confirmClear ? "确认清空主要数据？分类结构将保留" : "清空主要数据（保留默认分类）"}
                        </button>
                    </div>
                </div>

                {/* 云端备份清理 */}
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-stone-600 mb-2">
                        <Cloud size={24} />
                        <h3 className="font-bold text-lg">云端备份清理</h3>
                    </div>
                    <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                        检查云端存储（WebDAV/S3）的 backups 文件夹，保留最新的一个备份，清理所有旧备份以节省空间。
                    </p>

                    <button
                        onClick={handleCleanupBackups}
                        disabled={isCleaningBackups}
                        className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium active:scale-[0.98] transition-transform ${isCleaningBackups
                            ? 'bg-stone-400 text-white cursor-not-allowed'
                            : 'bg-white border border-stone-200 text-stone-800 hover:bg-stone-50'
                            }`}
                    >
                        {isCleaningBackups ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                清理中...
                            </>
                        ) : (
                            <>
                                <Trash2 size={18} />
                                清理旧备份（只保留最新）
                            </>
                        )}
                    </button>

                    <div className="pt-4 border-t border-stone-100 space-y-3">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest px-1">云端图片一致性</p>
                        <p className="text-sm text-stone-500 leading-relaxed">
                            以本地图片列表和本地实际图片文件为准，检查云端图片列表与实际文件是否一致，并可清理云端多余图片。
                        </p>

                        <button
                            onClick={handleCheckCloudConsistency}
                            disabled={isCheckingCloudImages}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-stone-200 text-stone-800 rounded-xl font-medium active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-50"
                        >
                            {isCheckingCloudImages ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                                    检查中...
                                </>
                            ) : (
                                <>
                                    <Search size={18} />
                                    检查本地和云端数据一致性
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => setIsCloudImageCleanupConfirmOpen(true)}
                            disabled={isCleaningCloudImages}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-stone-200 text-stone-800 rounded-xl font-medium active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-50"
                        >
                            {isCleaningCloudImages ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                                    清理中...
                                </>
                            ) : (
                                <>
                                    <Trash2 size={18} />
                                    清除云端多余图片
                                </>
                            )}
                        </button>

                        {cloudConsistencyReport && (
                            <div className="mt-2 p-4 bg-stone-50 rounded-xl">
                                <h4 className="font-medium text-stone-700 mb-2">一致性检查报告</h4>
                                <div className="text-sm text-stone-600 whitespace-pre-line max-h-56 overflow-y-auto">
                                    {cloudConsistencyReport}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Excel导出 */}
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-stone-600 mb-2">
                        <FileSpreadsheet size={24} />
                        <h3 className="font-bold text-lg">导出为xlsx</h3>
                    </div>
                    <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                        选择日期范围并导出时间记录到Excel文件
                    </p>

                    <div className="space-y-3">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest px-1">时间范围</p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="text-xs text-stone-400 mb-1 block px-1">起始时间</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={8}
                                    value={excelStartInput}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setExcelStartInput(value);
                                        if (value.length === 8) {
                                            const date = parse8DigitsToDate(value);
                                            if (date) setExcelStartDate(date);
                                        }
                                    }}
                                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300"
                                />
                            </div>
                            <span className="text-stone-300 mt-5">-</span>
                            <div className="flex-1">
                                <label className="text-xs text-stone-400 mb-1 block px-1">结束时间</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={8}
                                    value={excelEndInput}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setExcelEndInput(value);
                                        if (value.length === 8) {
                                            const date = parse8DigitsToDate(value);
                                            if (date) setExcelEndDate(date);
                                        }
                                    }}
                                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-bold text-stone-400 uppercase">快捷选择</p>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setExcelQuickRange('today')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">今天</button>
                            <button onClick={() => setExcelQuickRange('yesterday')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">昨天</button>
                            <button onClick={() => setExcelQuickRange('thisWeek')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">本周</button>
                            <button onClick={() => setExcelQuickRange('lastWeek')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">上周</button>
                            <button onClick={() => setExcelQuickRange('thisMonth')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">本月</button>
                            <button onClick={() => setExcelQuickRange('lastMonth')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">上月</button>
                            <button onClick={() => setExcelQuickRange('thisYear')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">今年</button>
                            <button onClick={() => setExcelQuickRange('all')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">全部</button>
                        </div>
                    </div>

                    <button
                        onClick={handleExcelExport}
                        disabled={isExportingExcel}
                        className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium active:scale-[0.98] transition-all shadow-lg ${isExportingExcel
                            ? 'bg-stone-400 text-white cursor-not-allowed'
                            : 'bg-stone-800 text-white shadow-stone-300 hover:bg-stone-900'
                            }`}
                    >
                        {isExportingExcel ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                导出中...
                            </>
                        ) : (
                            <>
                                <FileSpreadsheet size={18} />
                                导出Excel
                            </>
                        )}
                    </button>
                </div>

                {/* 图片管理 */}
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-stone-800 mb-2">
                        <ImageIcon size={24} />
                        <h3 className="font-bold text-lg">图片管理</h3>
                    </div>
                    <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                        导出和导入图片，或检查并清理未被专注记录引用的图片
                    </p>

                    {/* 图片导出导入 */}
                    <div className="space-y-3 pb-4 border-b border-stone-100">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest px-1">图片备份</p>
                        <div className="space-y-2 px-1">
                            <div className="flex items-center justify-between gap-3">
                                <label htmlFor="image-chunk-size" className="text-sm font-medium text-stone-700">
                                    每包图片张数
                                </label>
                                {imageExportSummary && (
                                    <span className="text-xs text-stone-400">
                                        当前共 {imageExportSummary.totalImages} 张
                                    </span>
                                )}
                            </div>
                            <input
                                id="image-chunk-size"
                                type="text"
                                inputMode="numeric"
                                value={imageChunkSizeInput}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    setImageChunkSizeInput(value);
                                }}
                                placeholder={imageExportSummary ? String(imageExportSummary.totalImages) : '留空则单包导出'}
                                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300"
                            />
                            <p className="text-[11px] leading-relaxed text-stone-400">
                                默认值等于当前全部图片张数，不改就是单包导出；改小后会拆成多个 ZIP 压缩包。
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleExportImages}
                                disabled={isExportingImages}
                                className="flex items-center justify-center gap-2 py-3 bg-stone-800 text-white rounded-xl font-medium active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isExportingImages ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        {imageExportProgress ? `导出中 ${Math.round(imageExportProgress.percent)}%` : '导出中...'}
                                    </>
                                ) : (
                                    <>
                                        <Package size={18} />
                                        导出图片
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => imageZipInputRef.current?.click()}
                                disabled={isImportingImages}
                                className="flex items-center justify-center gap-2 py-3 bg-white border border-stone-200 text-stone-700 rounded-xl font-medium active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-50"
                            >
                                {isImportingImages ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                                        导入中...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={18} />
                                        导入图片
                                    </>
                                )}
                            </button>
                            <input
                                type="file"
                                ref={imageZipInputRef}
                                onChange={handleImageZipFileChange}
                                accept=".zip"
                                className="hidden"
                            />
                        </div>
                        {isExportingImages && imageExportProgress && (
                            <div className="space-y-2 px-1">
                                <div className="flex items-center justify-between text-xs text-stone-500">
                                    <span className="truncate pr-2">{imageExportProgress.message}</span>
                                    <span className="font-mono text-stone-700">
                                        {Math.round(imageExportProgress.percent)}%
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-stone-700 rounded-full transition-all duration-200"
                                        style={{ width: `${Math.max(0, Math.round(imageExportProgress.percent))}%` }}
                                    />
                                </div>
                                {isNativePlatform && (
                                    <p className="text-[11px] leading-relaxed text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                                        移动端导出较慢，建议优先使用电脑端导出。
                                    </p>
                                )}
                            </div>
                        )}
                        <p className="text-xs text-stone-400 px-1">
                            导出所有图片为ZIP压缩包；分块导出时，导入阶段把各个 ZIP 逐个导入即可。
                        </p>
                    </div>

                    {/* 图片清理 */}
                    <div className="space-y-3 pt-2">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest px-1">图片清理</p>
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={handleFixImageList}
                                disabled={isCheckingImages}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-blue-500 text-white rounded-xl font-medium active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
                            >
                                {isCheckingImages ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        修复中...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={18} />
                                        修复图片列表
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleCheckUnreferencedImages}
                                disabled={isCheckingImages}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-stone-200 text-stone-800 rounded-xl font-medium active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-50"
                            >
                                {isCheckingImages ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                                        检查中...
                                    </>
                                ) : (
                                    <>
                                        <Search size={18} />
                                        检查未引用图片
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => setIsImageCleanupConfirmOpen(true)}
                                disabled={isCleaningImages}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-stone-200 text-stone-800 rounded-xl font-medium active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-50"
                            >
                                {isCleaningImages ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                                        清理中...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={18} />
                                        执行清理（删除图片）
                                    </>
                                )}
                            </button>
                        </div>

                        {imageCleanupReport && (
                            <div className="mt-4 p-4 bg-stone-50 rounded-xl">
                                <h4 className="font-medium text-stone-700 mb-2">清理报告</h4>
                                <div className="text-sm text-stone-600 whitespace-pre-line max-h-40 overflow-y-auto">
                                    {imageCleanupReport}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={isImageCleanupConfirmOpen}
                onClose={() => setIsImageCleanupConfirmOpen(false)}
                onConfirm={handleConfirmImageCleanup}
                title="确认删除图片"
                description="确定要删除所有未引用的图片吗？此操作将同时删除本地和远程图片，且无法撤销！"
                confirmText="删除"
                cancelText="取消"
                type="danger"
            />
            <ConfirmModal
                isOpen={isCloudImageCleanupConfirmOpen}
                onClose={() => setIsCloudImageCleanupConfirmOpen(false)}
                onConfirm={handleConfirmCloudImageCleanup}
                title="确认清理云端多余图片"
                description="将以本地图片列表和本地实际图片文件为准，补传云端缺失图片、删除云端多余图片，并重写云端图片列表。此操作不可撤销。"
                confirmText="继续清理"
                cancelText="取消"
                type="danger"
            />
        </div>
    );
};
