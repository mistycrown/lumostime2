/**
 * @file imageCleanupService.ts
 * @updated 2026-11-01: Excludes running timer attachments from cleanup without publishing them.
 * @input Log records, Todo cover images, grouped theme settings references, local images
 * @output Cleanup operations
 * @pos Service (Image Management)
 * @description Automatically detects and removes unreferenced images to free up storage space with separate content/theme reference strategies.
 * @updated 2026-10-11: Detects obsolete theme thumbnails, preserves referenced counterparts, and supports single-file cleanup on Web/Electron.
 * @updated 2026-09-25: Applies separate content/theme reference strategies and reports cleanup candidates by group.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { Capacitor } from '@capacitor/core';
import { CustomStickerRecord, CustomStickerSetRecord, DailyReview, Log, TodoItem } from '../types';
import { imageService } from './imageService';
import { getSettingsReferencedImages } from './settingsImageReferenceService';
import { webdavService } from './webdavService';
import { collectCustomStickerReferencedImages } from './customStickerAssetService';
import { ImageManifestGroups } from './imageManifest';
import { getActiveSessionImageFiles } from '../utils/sessionPersistence';

export interface CleanupResult {
    totalImages: number;
    referencedImages: number;
    unreferencedImages: string[];
    orphanedThumbnails?: string[];
    orphanedOriginals?: string[];
    deletedLocal: number;
    deletedRemote: number;
    errors: string[];
}

export class ImageCleanupService {
    
    /**
     * 获取所有 logs 中引用的图片文件名（包括对应的缩略图）
     */
    private getReferencedImageGroups(
        logs: Log[],
        todos: TodoItem[] = [],
        dailyReviews: DailyReview[] = [],
        customStickerSets: CustomStickerSetRecord[] = [],
        customStickers: CustomStickerRecord[] = []
    ): ImageManifestGroups {
        const content = new Set<string>();
        const theme = new Set<string>();
        
        logs.forEach(log => {
            if (log.images && Array.isArray(log.images)) {
                log.images.forEach(imageName => {
                    if (imageName && typeof imageName === 'string') {
                        // 添加原图
                        content.add(imageName);
                        // 添加对应的缩略图
                        content.add(`thumb_${imageName}`);
                    }
                });
            }
        });

        todos.forEach(todo => {
            if (!todo?.coverImage || typeof todo.coverImage !== 'string') {
                return;
            }
            content.add(todo.coverImage);
            if (!todo.coverImage.startsWith('thumb_')) {
                content.add(`thumb_${todo.coverImage}`);
            }
        });

        getSettingsReferencedImages().forEach((imageName) => {
            theme.add(imageName);
        });

        collectCustomStickerReferencedImages(dailyReviews, customStickerSets, customStickers).forEach((imageName) => {
            theme.add(imageName);
        });
        
        return { content: [...content], theme: [...theme] };
    }

    private getReferencedImages(
        logs: Log[],
        todos: TodoItem[] = [],
        dailyReviews: DailyReview[] = [],
        customStickerSets: CustomStickerSetRecord[] = [],
        customStickers: CustomStickerRecord[] = []
    ): Set<string> {
        const groups = this.getReferencedImageGroups(logs, todos, dailyReviews, customStickerSets, customStickers);
        return new Set([...groups.content, ...groups.theme]);
    }
    
    /**
     * 检查是否为缩略图文件
     */
    private isThumbnailFile(filename: string): boolean {
        return filename.startsWith('thumb_');
    }
    
    /**
     * 获取原图文件名（如果是缩略图）
     */
    private getOriginalFilename(filename: string): string {
        if (this.isThumbnailFile(filename)) {
            return filename.substring(6); // 移除 'thumb_' 前缀
        }
        return filename;
    }
    
    /**
     * 获取缩略图文件名
     */
    private getThumbnailFilename(filename: string): string {
        if (this.isThumbnailFile(filename)) {
            return filename; // 已经是缩略图
        }
        return `thumb_${filename}`;
    }
    
    /**
     * 将图片文件按原图和缩略图分组
     */
    private groupImagesByPairs(imageFiles: string[]): {
        originalImages: string[];
        thumbnailImages: string[];
        pairedImages: Map<string, { original: boolean; thumbnail: boolean }>;
    } {
        const originalImages: string[] = [];
        const thumbnailImages: string[] = [];
        const pairedImages = new Map<string, { original: boolean; thumbnail: boolean }>();
        
        imageFiles.forEach(filename => {
            if (this.isThumbnailFile(filename)) {
                thumbnailImages.push(filename);
                const originalName = this.getOriginalFilename(filename);
                const existing = pairedImages.get(originalName) || { original: false, thumbnail: false };
                existing.thumbnail = true;
                pairedImages.set(originalName, existing);
            } else {
                originalImages.push(filename);
                const existing = pairedImages.get(filename) || { original: false, thumbnail: false };
                existing.original = true;
                pairedImages.set(filename, existing);
            }
        });
        
        return { originalImages, thumbnailImages, pairedImages };
    }
    
    /**
     * 检查未引用的图片
     */
    async checkUnreferencedImages(
        logs: Log[],
        todos: TodoItem[] = [],
        dailyReviews: DailyReview[] = [],
        customStickerSets: CustomStickerSetRecord[] = [],
        customStickers: CustomStickerRecord[] = []
    ): Promise<{
        totalImages: number;
        referencedImages: number;
        contentReferencedImages: number;
        themeReferencedImages: number;
        unreferencedImages: string[];
        unreferencedContentImages: string[];
        unreferencedThemeImages: string[];
        orphanedThumbnails: string[];
        orphanedOriginals: string[];
        obsoleteThemeThumbnails: string[];
    }> {
        try {
            // 获取所有本地图片
            const allImageFiles = await imageService.listImages();
            
            // 按原图和缩略图分组
            const { originalImages, thumbnailImages, pairedImages } = this.groupImagesByPairs(allImageFiles);
            
            // 获取所有被引用的图片（包括对应的缩略图）
            const referencedGroups = this.getReferencedImageGroups(logs, todos, dailyReviews, customStickerSets, customStickers);
            const referencedImages = new Set([...referencedGroups.content, ...referencedGroups.theme]);
            const manifest = imageService.getReferencedImageManifest();
            const activeImageFiles = getActiveSessionImageFiles();
            const isReferenced = (filename: string): boolean => {
                if (activeImageFiles.has(filename)) return true;
                if (manifest.theme.includes(filename)) {
                    return referencedGroups.theme.includes(filename);
                }
                if (manifest.content.includes(filename)) {
                    return referencedGroups.content.includes(filename);
                }
                return referencedImages.has(filename);
            };
            
            // Check every file independently: a retained theme original does not retain its thumbnail.
            const unreferencedOriginals = originalImages.filter(imageName => !isReferenced(imageName));
            const unreferencedContentImages = unreferencedOriginals.filter((filename) => manifest.content.includes(filename));
            const unreferencedThemeImages = unreferencedOriginals.filter((filename) => manifest.theme.includes(filename));
            
            // 找出孤立的缩略图（没有对应原图的缩略图）
            const orphanedThumbnails = thumbnailImages.filter(thumbName => {
                const originalName = this.getOriginalFilename(thumbName);
                const pair = pairedImages.get(originalName);
                return !pair?.original; // 没有对应的原图
            });
            
            // 找出孤立的原图（没有对应缩略图的原图，但这不算错误，只是统计信息）
            const orphanedOriginals = originalImages.filter(originalName => {
                const pair = pairedImages.get(originalName);
                return !pair?.thumbnail && !referencedGroups.theme.includes(originalName);
            });

            const unreferencedImages = allImageFiles.filter(filename => !isReferenced(filename));
            const obsoleteThemeThumbnails = thumbnailImages.filter(filename => (
                referencedGroups.theme.includes(this.getOriginalFilename(filename)) && !isReferenced(filename)
            ));
            
            console.log(`[ImageCleanup] 检查完成:`);
            console.log(`  - 总图片文件数: ${allImageFiles.length}`);
            console.log(`  - 原图数量: ${originalImages.length}`);
            console.log(`  - 缩略图数量: ${thumbnailImages.length}`);
            console.log(`  - 被引用原图: ${originalImages.length - unreferencedOriginals.length}`);
            console.log(`  - 未引用原图: ${unreferencedOriginals.length}`);
            console.log(`  - 孤立缩略图: ${orphanedThumbnails.length}`);
            console.log(`  - 孤立原图: ${orphanedOriginals.length}`);
            console.log(`  - 待清理文件总数: ${unreferencedImages.length}`);
            
            if (unreferencedImages.length > 0) {
                console.log(`  - 待清理文件列表:`, unreferencedImages);
            }
            
            return {
                totalImages: allImageFiles.length,
                referencedImages: referencedImages.size,
                contentReferencedImages: referencedGroups.content.length,
                themeReferencedImages: referencedGroups.theme.length,
                unreferencedImages,
                unreferencedContentImages,
                unreferencedThemeImages,
                orphanedThumbnails,
                orphanedOriginals,
                obsoleteThemeThumbnails
            };
        } catch (error) {
            console.error('[ImageCleanup] 检查未引用图片失败:', error);
            throw error;
        }
    }
    
    /**
     * 自动清理未引用的图片
     */
    async cleanupUnreferencedImages(
        logs: Log[], 
        options: {
            deleteLocal?: boolean;
            deleteRemote?: boolean;
            dryRun?: boolean;
        } = {},
        todos: TodoItem[] = [],
        dailyReviews: DailyReview[] = [],
        customStickerSets: CustomStickerSetRecord[] = [],
        customStickers: CustomStickerRecord[] = []
    ): Promise<CleanupResult> {
        const { deleteLocal = true, deleteRemote = true, dryRun = false } = options;
        
        // 如果需要删除远程图片，检查WebDAV配置
        if (deleteRemote) {
            const config = webdavService.getConfig();
            if (!config) {
                console.log('[ImageCleanup] WebDAV未配置，跳过远程删除');
                // 修改选项，只进行本地删除
                return this.cleanupUnreferencedImages(logs, { 
                    deleteLocal, 
                    deleteRemote: false, 
                    dryRun 
                }, todos, dailyReviews, customStickerSets, customStickers);
            }
        }
        
        const result: CleanupResult = {
            totalImages: 0,
            referencedImages: 0,
            unreferencedImages: [],
            deletedLocal: 0,
            deletedRemote: 0,
            errors: []
        };
        
        try {
            // 检查未引用的图片
            const checkResult = await this.checkUnreferencedImages(logs, todos, dailyReviews, customStickerSets, customStickers);
            result.totalImages = checkResult.totalImages;
            result.referencedImages = checkResult.referencedImages;
            result.unreferencedImages = checkResult.unreferencedImages;
            
            if (checkResult.unreferencedImages.length === 0) {
                console.log('[ImageCleanup] 没有发现未引用的图片');
                return result;
            }
            
            if (dryRun) {
                console.log(`[ImageCleanup] 试运行模式 - 发现 ${checkResult.unreferencedImages.length} 个未引用图片，但不会删除`);
                return result;
            }

            // Native directory listing is unavailable; Web/Electron can skip absent remote files.
            let remoteFiles: Set<string> | null = null;
            if (deleteRemote && !Capacitor.isNativePlatform()) {
                try {
                    const contents = await webdavService.getDirectoryContents('/images');
                    remoteFiles = new Set(contents
                        .filter(item => item?.type === 'file')
                        .map(item => item.basename || String(item.filename || '').split('/').pop() || ''));
                } catch (error: any) {
                    if (Number(error?.status ?? error?.response?.status) !== 404) throw error;
                    remoteFiles = new Set();
                }
            }
            const existsRemotely = (filename: string) => deleteRemote && (remoteFiles === null || remoteFiles.has(filename));
            
            console.log(`[ImageCleanup] 开始清理 ${checkResult.unreferencedImages.length} 个未引用图片...`);
            
            // 按原图分组处理删除操作
            const { pairedImages } = this.groupImagesByPairs(checkResult.unreferencedImages);
            const processedOriginals = new Set<string>();
            
            // 删除未引用的图片
            for (const imageName of checkResult.unreferencedImages) {
                try {
                    if (this.isThumbnailFile(imageName)) {
                        const originalName = this.getOriginalFilename(imageName);
                        
                        // 如果是孤立的缩略图（没有对应原图），直接删除
                        if (!pairedImages.get(originalName)?.original) {
                            // 删除本地缩略图
                            if (deleteLocal) {
                                // 直接删除缩略图文件，不使用 imageService.deleteImage（避免重复处理）
                                await this.deleteSingleImageFile(imageName);
                                result.deletedLocal++;
                                console.log(`[ImageCleanup] ✓ 本地删除孤立缩略图: ${imageName}`);
                            }
                            
                            // 删除远程缩略图
                            if (existsRemotely(imageName)) {
                                try {
                                    const success = await webdavService.deleteImage(imageName);
                                    if (success) {
                                        result.deletedRemote++;
                                        console.log(`[ImageCleanup] ✓ 远程删除孤立缩略图: ${imageName}`);
                                    } else {
                                        result.errors.push(`远程删除失败: ${imageName}`);
                                    }
                                } catch (remoteError: any) {
                                    console.warn(`[ImageCleanup] 远程删除失败 (可能不存在): ${imageName}`, remoteError?.message);
                                }
                            }
                        }
                        // 如果缩略图有对应的原图，会在处理原图时一起删除
                    } else {
                        // 处理原图（会自动删除对应的缩略图）
                        if (!processedOriginals.has(imageName)) {
                            processedOriginals.add(imageName);
                            
                            // 删除本地图片（imageService.deleteImage 会同时删除原图和缩略图）
                            if (deleteLocal) {
                                if (pairedImages.get(imageName)?.thumbnail) {
                                    await imageService.deleteImage(imageName);
                                } else {
                                    await this.deleteSingleImageFile(imageName);
                                }
                                result.deletedLocal++; // 原图
                                console.log(`[ImageCleanup] ✓ 本地删除原图: ${imageName}`);
                                
                                // 检查是否有对应的缩略图也被删除
                                const pair = pairedImages.get(imageName);
                                if (pair?.thumbnail) {
                                    result.deletedLocal++; // 缩略图
                                    console.log(`[ImageCleanup] ✓ 本地删除对应缩略图: thumb_${imageName}`);
                                }
                            }
                            
                            // 删除远程图片
                            if (existsRemotely(imageName)) {
                                try {
                                    const success = await webdavService.deleteImage(imageName);
                                    if (success) {
                                        result.deletedRemote++; // 原图
                                        console.log(`[ImageCleanup] ✓ 远程删除原图: ${imageName}`);
                                    } else {
                                        result.errors.push(`远程删除失败: ${imageName}`);
                                    }
                                } catch (remoteError: any) {
                                    console.warn(`[ImageCleanup] 远程删除失败 (可能不存在): ${imageName}`, remoteError?.message);
                                }
                                
                            }

                            // The thumbnail can exist remotely even when the original is absent there.
                            const pair = pairedImages.get(imageName);
                            if (pair?.thumbnail && existsRemotely(`thumb_${imageName}`)) {
                                try {
                                    const thumbSuccess = await webdavService.deleteImage(`thumb_${imageName}`);
                                    if (thumbSuccess) {
                                        result.deletedRemote++; // 缩略图
                                        console.log(`[ImageCleanup] ✓ 远程删除对应缩略图: thumb_${imageName}`);
                                    }
                                } catch (thumbError: any) {
                                    console.warn(`[ImageCleanup] 远程删除缩略图失败: thumb_${imageName}`, thumbError?.message);
                                }
                            }
                        }
                    }
                    
                } catch (error: any) {
                    const errorMsg = `删除图片失败: ${imageName} - ${error?.message}`;
                    result.errors.push(errorMsg);
                    console.error(`[ImageCleanup] ✗ ${errorMsg}`);
                }
            }
            
            console.log(`[ImageCleanup] 清理完成:`);
            console.log(`  - 本地删除: ${result.deletedLocal} 个文件`);
            console.log(`  - 远程删除: ${result.deletedRemote} 个文件`);
            console.log(`  - 错误: ${result.errors.length} 个`);
            
            return result;
            
        } catch (error: any) {
            console.error('[ImageCleanup] 清理过程失败:', error);
            result.errors.push(`清理过程失败: ${error?.message}`);
            return result;
        }
    }
    
    /**
     * 删除单个未引用文件，保留仍被引用的配对文件。
     */
    private async deleteSingleImageFile(filename: string): Promise<void> {
        await imageService.deleteSingleImage(filename);
    }
    
    /**
     * 获取图片使用统计
     */
    async getImageUsageStats(
        logs: Log[],
        todos: TodoItem[] = [],
        dailyReviews: DailyReview[] = [],
        customStickerSets: CustomStickerSetRecord[] = [],
        customStickers: CustomStickerRecord[] = []
    ): Promise<{
        imageUsage: Map<string, number>;
        totalReferences: number;
        uniqueImages: number;
    }> {
        const imageUsage = new Map<string, number>();
        let totalReferences = 0;
        
        logs.forEach(log => {
            if (log.images && Array.isArray(log.images)) {
                log.images.forEach(imageName => {
                    if (imageName && typeof imageName === 'string') {
                        imageUsage.set(imageName, (imageUsage.get(imageName) || 0) + 1);
                        totalReferences++;
                    }
                });
            }
        });

        todos.forEach(todo => {
            if (todo?.coverImage && typeof todo.coverImage === 'string') {
                imageUsage.set(todo.coverImage, (imageUsage.get(todo.coverImage) || 0) + 1);
                totalReferences++;
            }
        });

        getSettingsReferencedImages().forEach((imageName) => {
            imageUsage.set(imageName, (imageUsage.get(imageName) || 0) + 1);
            totalReferences++;
        });

        collectCustomStickerReferencedImages(dailyReviews, customStickerSets, customStickers).forEach((imageName) => {
            imageUsage.set(imageName, (imageUsage.get(imageName) || 0) + 1);
            totalReferences++;
        });
        
        return {
            imageUsage,
            totalReferences,
            uniqueImages: imageUsage.size
        };
    }
    
    /**
     * 生成清理报告
     */
    async generateCleanupReport(
        logs: Log[],
        todos: TodoItem[] = [],
        dailyReviews: DailyReview[] = [],
        customStickerSets: CustomStickerSetRecord[] = [],
        customStickers: CustomStickerRecord[] = []
    ): Promise<string> {
        try {
            const checkResult = await this.checkUnreferencedImages(logs, todos, dailyReviews, customStickerSets, customStickers);
            const usageStats = await this.getImageUsageStats(logs, todos, dailyReviews, customStickerSets, customStickers);
            
            let report = `# 图片清理报告\n\n`;
            report += `## 📊 总体统计\n`;
            report += `- **总图片文件数**: ${checkResult.totalImages}\n`;
            report += `- **被引用图片文件数**: ${checkResult.referencedImages}\n`;
            report += `- **日志/待办组引用数**: ${checkResult.contentReferencedImages}\n`;
            report += `- **主题设置组引用数**: ${checkResult.themeReferencedImages}\n`;
            report += `- **待清理文件数**: ${checkResult.unreferencedImages.length}\n`;
            report += `- **总引用次数**: ${usageStats.totalReferences}\n\n`;
            
            // 分类显示待清理的图片
            if (checkResult.unreferencedImages.length > 0) {
                const { originalImages, thumbnailImages } = this.groupImagesByPairs(checkResult.unreferencedImages);
                const unreferencedOriginals = originalImages.filter(img => 
                    checkResult.unreferencedImages.includes(img)
                );
                
                if (unreferencedOriginals.length > 0) {
                    report += `## �️ 未引用的图片组 (${unreferencedOriginals.length} 组)\n`;
                    unreferencedOriginals.forEach((imageName, index) => {
                        const hasThumb = checkResult.unreferencedImages.includes(`thumb_${imageName}`);
                        report += `${index + 1}. \`${imageName}\`${hasThumb ? ' + 缩略图' : ''}\n`;
                    });
                    report += `\n`;
                }

                if (checkResult.unreferencedContentImages.length > 0) {
                    report += `## 日志/待办组待清理 (${checkResult.unreferencedContentImages.length} 组)\n`;
                    checkResult.unreferencedContentImages.forEach((imageName, index) => {
                        report += `${index + 1}. \`${imageName}\`\n`;
                    });
                    report += `\n`;
                }

                if (checkResult.unreferencedThemeImages.length > 0) {
                    report += `## 主题设置组待清理 (${checkResult.unreferencedThemeImages.length} 组)\n`;
                    checkResult.unreferencedThemeImages.forEach((imageName, index) => {
                        report += `${index + 1}. \`${imageName}\`\n`;
                    });
                    report += `\n`;
                }
                
                if (checkResult.orphanedThumbnails.length > 0) {
                    report += `## 🔍 孤立的缩略图 (${checkResult.orphanedThumbnails.length} 个)\n`;
                    checkResult.orphanedThumbnails.forEach((thumbName, index) => {
                        report += `${index + 1}. \`${thumbName}\` (无对应原图)\n`;
                    });
                    report += `\n`;
                }

                if (checkResult.obsoleteThemeThumbnails.length > 0) {
                    report += `## 多余的主题缩略图 (${checkResult.obsoleteThemeThumbnails.length} 个)\n`;
                    checkResult.obsoleteThemeThumbnails.forEach((filename, index) => {
                        report += `${index + 1}. \`${filename}\` (保留原图)\n`;
                    });
                    report += `\n`;
                }
                
                if (checkResult.orphanedOriginals.length > 0) {
                    report += `## ⚠️ 缺少缩略图的原图 (${checkResult.orphanedOriginals.length} 个)\n`;
                    checkResult.orphanedOriginals.forEach((imageName, index) => {
                        report += `${index + 1}. \`${imageName}\` (无对应缩略图)\n`;
                    });
                    report += `\n`;
                }
            }
            
            if (usageStats.imageUsage.size > 0) {
                report += `## 📈 图片使用频率\n`;
                const sortedUsage = Array.from(usageStats.imageUsage.entries())
                    .sort((a, b) => b[1] - a[1]);
                
                sortedUsage.forEach(([imageName, count]) => {
                    report += `- \`${imageName}\`: ${count} 次引用\n`;
                });
            }
            
            return report;
            
        } catch (error: any) {
            return `# 图片清理报告\n\n❌ 生成报告失败: ${error?.message}`;
        }
    }
}

export const imageCleanupService = new ImageCleanupService();
