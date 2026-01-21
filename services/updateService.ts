/**
 * @file updateService.ts
 * @input Remote JSON Data (Gitee/GitHub)
 * @output Version Information, Update Availability
 * @pos Service (App Maintenance)
 * @description Checks for application updates by fetching version metadata from remote repositories, with robust fallback mechanisms.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
// 应用更新检测服务
import { CapacitorHttp, HttpResponse } from '@capacitor/core';

export interface VersionInfo {
    version: string;
    versionCode: number;
    updateUrl: string;
    releaseNotes: string;
    forceUpdate: boolean;
}

export class UpdateService {
    // Gitee API (国内用户优先,无需token)
    private static GITEE_API_URL = 'https://gitee.com/api/v5/repos/jili_chuchuzheci/lumostime2/contents/version.json';

    // GitHub Raw URL (备用)
    private static GITHUB_UPDATE_URL = 'https://raw.githubusercontent.com/mistycrown/lumostime2/master/version.json';

    // 当前应用版本（从 package.json 读取）
    private static CURRENT_VERSION = '1.0.6';

    /**
     * 从 Gitee API 获取版本信息
     * @returns 版本信息对象,如果检查失败返回 null
     */
    private static async fetchVersionFromGiteeAPI(): Promise<VersionInfo | null> {
        try {
            console.log('[UpdateService] 正在从Gitee API获取版本信息...');

            const options = {
                url: this.GITEE_API_URL,
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                connectTimeout: 8000,
                readTimeout: 8000
            };

            const response: HttpResponse = await CapacitorHttp.get(options);

            if (response.status !== 200) {
                throw new Error(`HTTP ${response.status}`);
            }

            // Gitee API返回base64编码的content
            const apiResponse = response.data;
            if (!apiResponse.content || apiResponse.encoding !== 'base64') {
                throw new Error('无效的Gitee API响应格式');
            }

            // 解码base64 (处理中文字符)
            const decodedContent = decodeURIComponent(escape(atob(apiResponse.content)));
            const data: VersionInfo = JSON.parse(decodedContent);

            console.log('[UpdateService] 成功获取版本信息:', data);
            return data;
        } catch (error: any) {
            console.error('[UpdateService] Gitee API获取失败:', error.message);
            return null;
        }
    }

    /**
     * 从指定URL检查更新
     * @param url 版本信息URL
     * @returns 版本信息对象,如果检查失败返回 null
     */
    private static async fetchVersionFromUrl(url: string): Promise<VersionInfo | null> {
        try {
            console.log('[UpdateService] 正在从以下地址获取版本信息:', url);

            const options = {
                url: url,
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                connectTimeout: 8000,  // 8秒超时(缩短以便快速fallback)
                readTimeout: 8000
            };

            const response: HttpResponse = await CapacitorHttp.get(options);

            if (response.status !== 200) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data: VersionInfo = response.data;
            console.log('[UpdateService] 成功获取版本信息:', data);
            return data;
        } catch (error: any) {
            console.error('[UpdateService] 从', url, '获取失败:', error.message);
            return null;
        }
    }

    /**
     * 检查是否有新版本可用 (支持多源fallback)
     * @returns 版本信息对象,如果检查失败返回 null
     */
    static async checkForUpdates(): Promise<VersionInfo | null> {
        console.log('[UpdateService] 开始检查更新...');

        // 优先尝试Gitee API(国内用户)
        let versionInfo = await this.fetchVersionFromGiteeAPI();

        if (versionInfo) {
            console.log('[UpdateService] ✓ 从Gitee API获取成功');
            return versionInfo;
        }

        console.log('[UpdateService] Gitee镜像访问失败,尝试GitHub源...');

        // Fallback到GitHub
        versionInfo = await this.fetchVersionFromUrl(this.GITHUB_UPDATE_URL);

        if (versionInfo) {
            console.log('[UpdateService] ✓ 从GitHub源获取成功');
            return versionInfo;
        }

        console.error('[UpdateService] ✗ 所有更新源均访问失败');
        return null;
    }

    /**
     * 比较版本号
     * @param current 当前版本号
     * @param latest 最新版本号
     * @returns 如果最新版本大于当前版本返回 true
     */
    static compareVersions(current: string, latest: string): boolean {
        // 参数验证
        if (!current || !latest) {
            console.error('[UpdateService] compareVersions 参数错误:', { current, latest });
            return false;
        }

        // 移除可能的 'v' 前缀
        const cleanCurrent = current.replace(/^v/, '');
        const cleanLatest = latest.replace(/^v/, '');

        const currentParts = cleanCurrent.split('.').map(Number);
        const latestParts = cleanLatest.split('.').map(Number);

        for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
            const curr = currentParts[i] || 0;
            const lat = latestParts[i] || 0;

            if (lat > curr) return true;
            if (lat < curr) return false;
        }

        // 版本号完全相同
        return false;
    }

    /**
     * 检查是否需要更新
     * @returns 如果需要更新返回版本信息，否则返回 null
     */
    static async checkNeedsUpdate(): Promise<VersionInfo | null> {
        const latestVersion = await this.checkForUpdates();

        if (!latestVersion) {
            console.log('[UpdateService] checkNeedsUpdate: 无法获取版本信息');
            return null;
        }

        console.log('[UpdateService] checkNeedsUpdate: 当前版本:', this.CURRENT_VERSION, '最新版本:', latestVersion.version);

        // 验证version字段
        if (!latestVersion.version) {
            console.error('[UpdateService] checkNeedsUpdate: version字段缺失', latestVersion);
            return null;
        }

        const hasUpdate = this.compareVersions(this.CURRENT_VERSION, latestVersion.version);

        return hasUpdate ? latestVersion : null;
    }

    /**
     * 打开更新下载链接
     * @param url 下载链接
     */
    static openUpdateUrl(url: string) {
        // 在新标签页或系统浏览器中打开
        if (typeof window !== 'undefined') {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }

    /**
     * 获取当前版本号
     */
    static getCurrentVersion(): string {
        return this.CURRENT_VERSION;
    }
}
