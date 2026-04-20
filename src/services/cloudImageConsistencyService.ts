/**
 * @file cloudImageConsistencyService.ts
 * @input Local logs/todos, local image files, cloud image manifest, cloud image files
 * @output Cloud image consistency analysis and optional repair
 * @pos Service (Cloud Image Diagnostics)
 * @description Compares local image references against cloud manifests and real cloud files, and can repair the cloud side using local state as the source of truth.
 * @updated 2026-03-23: Added explicit cloud consistency check/repair flow so daily sync no longer auto-repairs cloud image state, and aligned diagnostics with the local image manifest instead of recalculating from all records.
 */

import { Capacitor } from '@capacitor/core';
import { Log, TodoItem } from '../types';
import { imageService } from './imageService';
import { s3Service } from './s3Service';
import { compatibleS3Service } from './compatibleS3Service';
import { webdavService } from './webdavService';

type ActiveCloudKind = 's3' | 'compatible-s3' | 'webdav';
type ActiveCloudService = typeof s3Service | typeof compatibleS3Service | typeof webdavService;

interface ActiveCloudContext {
    kind: ActiveCloudKind;
    label: string;
    service: ActiveCloudService;
}

export interface CloudImageConsistencyAnalysis {
    success: boolean;
    label?: string;
    message: string;
    localManifest: string[];
    localFiles: string[];
    cloudManifest: string[];
    cloudFiles: string[];
    localManifestMissingLocalFiles: string[];
    localManifestMissingCloudManifest: string[];
    cloudManifestExtraEntries: string[];
    localManifestMissingCloudFiles: string[];
    cloudFilesExtraEntries: string[];
    repairable: boolean;
}

export interface CloudImageRepairResult {
    success: boolean;
    message: string;
    uploaded: string[];
    deleted: string[];
    manifestEntries: string[];
    unresolved: string[];
    errors: string[];
}

class CloudImageConsistencyService {
    private getActiveCloudContext(): ActiveCloudContext | null {
        const hasS3 = !!s3Service.getConfig() && localStorage.getItem('lumos_s3_manual_disconnect') !== 'true';
        const hasCompatibleS3 = !!compatibleS3Service.getConfig() && localStorage.getItem('lumos_compatible_s3_manual_disconnect') !== 'true';
        const hasWebDAV = !!webdavService.getConfig() && localStorage.getItem('lumos_webdav_manual_disconnect') !== 'true';

        if ([hasS3, hasCompatibleS3, hasWebDAV].filter(Boolean).length > 1) {
            throw new Error('同时连接了多个云端服务，请先断开其中一个后再执行一致性检查');
        }

        if (hasCompatibleS3) {
            return {
                kind: 'compatible-s3',
                label: '兼容 S3',
                service: compatibleS3Service
            };
        }

        if (hasS3) {
            return {
                kind: 's3',
                label: 'COS',
                service: s3Service
            };
        }

        if (hasWebDAV) {
            return {
                kind: 'webdav',
                label: 'WebDAV',
                service: webdavService
            };
        }

        return null;
    }

    private async getCloudImageFiles(context: ActiveCloudContext): Promise<string[]> {
        if (context.kind === 'webdav' && Capacitor.isNativePlatform()) {
            throw new Error('当前平台下 WebDAV 不支持读取远程 images 目录，暂时无法检查一致性');
        }

        const directoryPath = context.kind === 'webdav' ? '/images' : 'images';
        const contents = await context.service.getDirectoryContents?.(directoryPath);
        const items = Array.isArray(contents) ? contents : [];

        if (context.kind !== 'webdav') {
            return items
                .filter((item: any) => item?.Key && !String(item.Key).endsWith('/'))
                .map((item: any) => String(item.Key).split('/').pop() || '')
                .filter(Boolean)
                .sort();
        }

        return items
            .filter((item: any) => item?.type === 'file')
            .map((item: any) => item.basename || String(item.filename || '').split('/').pop() || '')
            .filter(Boolean)
            .sort();
    }

    private async loadCloudManifest(context: ActiveCloudContext): Promise<string[]> {
        const manifest = await context.service.downloadImageList();
        const images = Array.isArray(manifest?.images) ? manifest.images : [];
        return Array.from(new Set(images)).sort();
    }

    async analyze(logs: Log[], todos: TodoItem[] = []): Promise<CloudImageConsistencyAnalysis> {
        try {
            const context = this.getActiveCloudContext();
            if (!context) {
                return {
                    success: false,
                    message: '未连接云端服务，无法检查图片一致性',
                    localManifest: [],
                    localFiles: [],
                    cloudManifest: [],
                    cloudFiles: [],
                    localManifestMissingLocalFiles: [],
                    localManifestMissingCloudManifest: [],
                    cloudManifestExtraEntries: [],
                    localManifestMissingCloudFiles: [],
                    cloudFilesExtraEntries: [],
                    repairable: false
                };
            }

            const localManifest = Array.from(new Set(imageService.getReferencedImagesList())).sort();
            const localFiles = Array.from(new Set(await imageService.listImages())).sort();
            const cloudManifest = await this.loadCloudManifest(context);
            const cloudFiles = await this.getCloudImageFiles(context);

            const localManifestSet = new Set(localManifest);
            const localFileSet = new Set(localFiles);
            const cloudManifestSet = new Set(cloudManifest);
            const cloudFileSet = new Set(cloudFiles);

            const localManifestMissingLocalFiles = localManifest.filter((filename) => !localFileSet.has(filename));
            const localManifestMissingCloudManifest = localManifest.filter((filename) => !cloudManifestSet.has(filename));
            const cloudManifestExtraEntries = cloudManifest.filter((filename) => !localManifestSet.has(filename));
            const localManifestMissingCloudFiles = localManifest.filter((filename) => !cloudFileSet.has(filename));
            const cloudFilesExtraEntries = cloudFiles.filter((filename) => !localManifestSet.has(filename));

            const hasIssues = [
                localManifestMissingLocalFiles,
                localManifestMissingCloudManifest,
                cloudManifestExtraEntries,
                localManifestMissingCloudFiles,
                cloudFilesExtraEntries
            ].some((list) => list.length > 0);

            return {
                success: true,
                label: context.label,
                message: hasIssues ? '已完成本地与云端图片一致性检查' : '本地与云端图片状态一致',
                localManifest,
                localFiles,
                cloudManifest,
                cloudFiles,
                localManifestMissingLocalFiles,
                localManifestMissingCloudManifest,
                cloudManifestExtraEntries,
                localManifestMissingCloudFiles,
                cloudFilesExtraEntries,
                repairable: true
            };
        } catch (error: any) {
            return {
                success: false,
                message: error?.message || '检查失败',
                localManifest: [],
                localFiles: [],
                cloudManifest: [],
                cloudFiles: [],
                localManifestMissingLocalFiles: [],
                localManifestMissingCloudManifest: [],
                cloudManifestExtraEntries: [],
                localManifestMissingCloudFiles: [],
                cloudFilesExtraEntries: [],
                repairable: false
            };
        }
    }

    async generateReport(logs: Log[], todos: TodoItem[] = []): Promise<{ report: string; analysis: CloudImageConsistencyAnalysis }> {
        const analysis = await this.analyze(logs, todos);

        let report = '# 本地与云端图片一致性报告\n\n';

        if (!analysis.success) {
            report += `- 结果：失败\n- 原因：${analysis.message}\n`;
            return { report, analysis };
        }

        report += `- 云端类型：${analysis.label}\n`;
        report += `- 本地图片列表数：${analysis.localManifest.length}\n`;
        report += `- 本地实际文件数：${analysis.localFiles.length}\n`;
        report += `- 云端图片列表数：${analysis.cloudManifest.length}\n`;
        report += `- 云端实际文件数：${analysis.cloudFiles.length}\n\n`;

        const sections: Array<[string, string[]]> = [
            ['本地图片列表里有，但本地文件缺失', analysis.localManifestMissingLocalFiles],
            ['本地图片列表里有，但云端图片列表缺失', analysis.localManifestMissingCloudManifest],
            ['云端图片列表里多出来的条目', analysis.cloudManifestExtraEntries],
            ['本地图片列表里有，但云端文件缺失', analysis.localManifestMissingCloudFiles],
            ['云端存在，但本地图片列表未收录的文件', analysis.cloudFilesExtraEntries]
        ];

        sections.forEach(([title, list]) => {
            report += `## ${title}\n`;
            if (list.length === 0) {
                report += '- 无\n\n';
                return;
            }

            list.forEach((item, index) => {
                report += `${index + 1}. ${item}\n`;
            });
            report += '\n';
        });

        const hasIssues = sections.some(([, list]) => list.length > 0);
        report += hasIssues
            ? '建议：先确保“修复图片列表”已经执行完成，再按本地状态修复云端图片。\n'
            : '本地与云端图片状态一致，当前无需修复。\n';

        return { report, analysis };
    }

    async repairUsingLocalState(logs: Log[], todos: TodoItem[] = []): Promise<CloudImageRepairResult> {
        const analysis = await this.analyze(logs, todos);
        if (!analysis.success) {
            return {
                success: false,
                message: analysis.message,
                uploaded: [],
                deleted: [],
                manifestEntries: [],
                unresolved: [],
                errors: [analysis.message]
            };
        }

        const context = this.getActiveCloudContext();
        if (!context) {
            return {
                success: false,
                message: '未连接云端服务，无法修复',
                uploaded: [],
                deleted: [],
                manifestEntries: [],
                unresolved: [],
                errors: ['未连接云端服务']
            };
        }

        const uploaded: string[] = [];
        const deleted: string[] = [];
        const errors: string[] = [];
        const cloudFileSet = new Set(analysis.cloudFiles);
        const localFileSet = new Set(analysis.localFiles);

        for (const filename of analysis.localManifestMissingCloudFiles) {
            if (!localFileSet.has(filename)) {
                errors.push(`本地缺少文件，无法补传：${filename}`);
                continue;
            }

            try {
                const data = await imageService.readImage(filename);
                await context.service.uploadImage(filename, data as any);
                uploaded.push(filename);
                cloudFileSet.add(filename);
            } catch (error: any) {
                errors.push(`补传失败：${filename} - ${error?.message || '未知错误'}`);
            }
        }

        for (const filename of analysis.cloudFilesExtraEntries) {
            try {
                const removed = await context.service.deleteImage(filename);
                if (removed) {
                    deleted.push(filename);
                    cloudFileSet.delete(filename);
                } else {
                    errors.push(`删除云端多余文件失败：${filename}`);
                }
            } catch (error: any) {
                errors.push(`删除云端多余文件失败：${filename} - ${error?.message || '未知错误'}`);
            }
        }

        const finalManifest = analysis.localManifest.filter((filename) => cloudFileSet.has(filename));

        try {
            await context.service.uploadImageList(finalManifest);
        } catch (error: any) {
            errors.push(`更新云端图片列表失败：${error?.message || '未知错误'}`);
        }

        const unresolved = analysis.localManifest.filter((filename) => !cloudFileSet.has(filename));
        const success = errors.length === 0 && unresolved.length === 0;

        return {
            success,
            message: success
                ? `已按本地状态修复${context.label}图片配置`
                : `已尝试按本地状态修复${context.label}图片配置，仍有 ${errors.length + unresolved.length} 项未完成`,
            uploaded,
            deleted,
            manifestEntries: finalManifest,
            unresolved,
            errors
        };
    }
}

export const cloudImageConsistencyService = new CloudImageConsistencyService();
