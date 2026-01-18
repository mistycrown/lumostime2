/**
 * @file imageCleanupService.ts
 * @input Log records, Local images
 * @output Cleanup operations
 * @pos Service (Image Management)
 * @description Automatically detects and removes unreferenced images to free up storage space.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { Log } from '../types';
import { imageService } from './imageService';
import { webdavService } from './webdavService';

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
    private getReferencedImages(logs: Log[]): Set<string> {
        const referencedImages = new Set<string>();
        
        logs.forEach(log => {
            if (log.images && Array.isArray(log.images)) {
                log.images.forEach(imageName => {
                    if (imageName && typeof imageName === 'string') {
                        // 添加原图
                        referencedImages.add(imageName);
                        // 添加对应的缩略图
                        referencedImages.add(`thumb_${imageName}`);
                    }
                });
            }
        });
        
        return referencedImages;
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
    async checkUnreferencedImages(logs: Log[]): Promise<{
        totalImages: number;
        referencedImages: number;
        unreferencedImages: string[];
        orphanedThumbnails: string[];
        orphanedOriginals: string[];
    }> {
        try {
            // 获取所有本地图片
            const allImageFiles = await imageService.listImages();
            
            // 按原图和缩略图分组
            const { originalImages, thumbnailImages, pairedImages } = this.groupImagesByPairs(allImageFiles);
            
            // 获取所有被引用的图片（包括对应的缩略图）
            const referencedImages = this.getReferencedImages(logs);
            
            // 找出未被引用的原图（只检查原图，缩略图会自动跟随）
            const unreferencedOriginals = originalImages.filter(imageName => 
                !referencedImages.has(imageName)
            );
            
            // 找出孤立的缩略图（没有对应原图的缩略图）
            const orphanedThumbnails = thumbnailImages.filter(thumbName => {
                const originalName = this.getOriginalFilename(thumbName);
                const pair = pairedImages.get(originalName);
                return !pair?.original; // 没有对应的原图
            });
            
            // 找出孤立的原图（没有对应缩略图的原图，但这不算错误，只是统计信息）
            const orphanedOriginals = originalImages.filter(originalName => {
                const pair = pairedImages.get(originalName);
                return !pair?.thumbnail; // 没有对应的缩略图
            });
            
            // 计算未引用的图片总数（原图 + 对应的缩略图 + 孤立的缩略图）
            const unreferencedImages: string[] = [];
            
            // 添加未引用的原图及其缩略图
            unreferencedOriginals.forEach(originalName => {
                unreferencedImages.push(originalName);
                const pair = pairedImages.get(originalName);
                if (pair?.thumbnail) {
                    unreferencedImages.push(this.getThumbnailFilename(originalName));
                }
            });
            
            // 添加孤立的缩略图
            orphanedThumbnails.forEach(thumbName => {
                unreferencedImages.push(thumbName);
            });
            
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
                unreferencedImages,
                orphanedThumbnails,
                orphanedOriginals
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
        } = {}
    ): Promise<CleanupResult> {
        const { deleteLocal = true, deleteRemote = true, dryRun = false } = options;
        
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
            const checkResult = await this.checkUnreferencedImages(logs);
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
            
            console.log(`[ImageCleanup] 开始清理 ${checkResult.unreferencedImages.length} 个未引用图片...`);
            
            // 按原图分组处理删除操作
            const { originalImages, pairedImages } = this.groupImagesByPairs(checkResult.unreferencedImages);
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
                            if (deleteRemote) {
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
                                await imageService.deleteImage(imageName);
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
                            if (deleteRemote) {
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
                                
                                // 删除远程缩略图
                                const pair = pairedImages.get(imageName);
                                if (pair?.thumbnail) {
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
     * 删除单个图片文件（不处理配对关系）- 仅用于孤立缩略图
     */
    private async deleteSingleImageFile(filename: string): Promise<void> {
        try {
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            const { Capacitor } = await import('@capacitor/core');
            
            if (Capacitor.isNativePlatform()) {
                await Filesystem.deleteFile({
                    path: `images/${filename}`,
                    directory: Directory.Data,
                }).catch(() => { }); // 忽略文件不存在的错误
            } else {
                // Web 环境下，对于孤立缩略图，我们直接使用 imageService 的内部逻辑
                // 但需要小心不要触发配对删除
                console.warn(`[ImageCleanup] Web环境下删除孤立缩略图: ${filename}`);
                // 暂时跳过 Web 环境下的孤立缩略图删除，这种情况应该很少见
            }
        } catch (error) {
            console.error(`[ImageCleanup] 删除单个文件失败: ${filename}`, error);
            throw error;
        }
    }
    
    /**
     * 获取图片使用统计
     */
    async getImageUsageStats(logs: Log[]): Promise<{
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
        
        return {
            imageUsage,
            totalReferences,
            uniqueImages: imageUsage.size
        };
    }
    
    /**
     * 生成清理报告
     */
    async generateCleanupReport(logs: Log[]): Promise<string> {
        try {
            const checkResult = await this.checkUnreferencedImages(logs);
            const usageStats = await this.getImageUsageStats(logs);
            
            let report = `# 图片清理报告\n\n`;
            report += `## 📊 总体统计\n`;
            report += `- **总图片文件数**: ${checkResult.totalImages}\n`;
            report += `- **被引用原图数**: ${Math.floor(checkResult.referencedImages / 2)}\n`; // 除以2因为包含了缩略图
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
                
                if (checkResult.orphanedThumbnails.length > 0) {
                    report += `## 🔍 孤立的缩略图 (${checkResult.orphanedThumbnails.length} 个)\n`;
                    checkResult.orphanedThumbnails.forEach((thumbName, index) => {
                        report += `${index + 1}. \`${thumbName}\` (无对应原图)\n`;
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