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
    deletedLocal: number;
    deletedRemote: number;
    errors: string[];
}

export class ImageCleanupService {
    
    /**
     * 获取所有 logs 中引用的图片文件名
     */
    private getReferencedImages(logs: Log[]): Set<string> {
        const referencedImages = new Set<string>();
        
        logs.forEach(log => {
            if (log.images && Array.isArray(log.images)) {
                log.images.forEach(imageName => {
                    if (imageName && typeof imageName === 'string') {
                        referencedImages.add(imageName);
                    }
                });
            }
        });
        
        return referencedImages;
    }
    
    /**
     * 检查未引用的图片
     */
    async checkUnreferencedImages(logs: Log[]): Promise<{
        totalImages: number;
        referencedImages: number;
        unreferencedImages: string[];
    }> {
        try {
            // 获取所有本地图片
            const localImages = await imageService.listImages();
            
            // 获取所有被引用的图片
            const referencedImages = this.getReferencedImages(logs);
            
            // 找出未被引用的图片
            const unreferencedImages = localImages.filter(imageName => 
                !referencedImages.has(imageName)
            );
            
            console.log(`[ImageCleanup] 检查完成:`);
            console.log(`  - 总图片数: ${localImages.length}`);
            console.log(`  - 被引用图片: ${referencedImages.size}`);
            console.log(`  - 未引用图片: ${unreferencedImages.length}`);
            
            if (unreferencedImages.length > 0) {
                console.log(`  - 未引用图片列表:`, unreferencedImages);
            }
            
            return {
                totalImages: localImages.length,
                referencedImages: referencedImages.size,
                unreferencedImages
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
            
            // 删除未引用的图片
            for (const imageName of checkResult.unreferencedImages) {
                try {
                    // 删除本地图片
                    if (deleteLocal) {
                        await imageService.deleteImage(imageName);
                        result.deletedLocal++;
                        console.log(`[ImageCleanup] ✓ 本地删除成功: ${imageName}`);
                    }
                    
                    // 删除远程图片
                    if (deleteRemote) {
                        try {
                            const success = await webdavService.deleteImage(imageName);
                            if (success) {
                                result.deletedRemote++;
                                console.log(`[ImageCleanup] ✓ 远程删除成功: ${imageName}`);
                            } else {
                                result.errors.push(`远程删除失败: ${imageName}`);
                            }
                        } catch (remoteError: any) {
                            console.warn(`[ImageCleanup] 远程删除失败 (可能不存在): ${imageName}`, remoteError?.message);
                            // 远程删除失败不算错误，可能图片本来就不存在
                        }
                    }
                    
                } catch (error: any) {
                    const errorMsg = `删除图片失败: ${imageName} - ${error?.message}`;
                    result.errors.push(errorMsg);
                    console.error(`[ImageCleanup] ✗ ${errorMsg}`);
                }
            }
            
            console.log(`[ImageCleanup] 清理完成:`);
            console.log(`  - 本地删除: ${result.deletedLocal} 个`);
            console.log(`  - 远程删除: ${result.deletedRemote} 个`);
            console.log(`  - 错误: ${result.errors.length} 个`);
            
            return result;
            
        } catch (error: any) {
            console.error('[ImageCleanup] 清理过程失败:', error);
            result.errors.push(`清理过程失败: ${error?.message}`);
            return result;
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
            report += `- **总图片数**: ${checkResult.totalImages}\n`;
            report += `- **被引用图片**: ${checkResult.referencedImages}\n`;
            report += `- **未引用图片**: ${checkResult.unreferencedImages.length}\n`;
            report += `- **总引用次数**: ${usageStats.totalReferences}\n\n`;
            
            if (checkResult.unreferencedImages.length > 0) {
                report += `## 🗑️ 未引用图片列表\n`;
                checkResult.unreferencedImages.forEach((imageName, index) => {
                    report += `${index + 1}. \`${imageName}\`\n`;
                });
                report += `\n`;
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