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
    private static CURRENT_VERSION = '1.0.7';

    // 更新检查间隔（24小时）
    private static UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000;
    private static LAST_CHECK_KEY = 'lastUpdateCheck';

    /**
     * 从 Gitee API 获取版本信息
     * @returns 版本信息对象,如果检查失败返回 null
     */
    private static async fetchVersionFromGiteeAPI(): Promise<VersionInfo | null> {
        try {
            const options = {
                url: this.GITEE_API_URL,
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                connectTimeout: 5000,
                readTimeout: 5000
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

            return data;
        } catch (error: any) {
            // 静默处理错误，避免控制台噪音
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
            const options = {
                url: url,
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                connectTimeout: 5000,
                readTimeout: 5000
            };

            const response: HttpResponse = await CapacitorHttp.get(options);

            if (response.status !== 200) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data: VersionInfo = response.data;
            return data;
        } catch (error: any) {
            // 静默处理错误
            return null;
        }
    }

    /**
     * 检查是否应该执行更新检查（基于时间间隔）
     */
    private static shouldCheckForUpdates(): boolean {
        try {
            const lastCheck = localStorage.getItem(this.LAST_CHECK_KEY);
            if (!lastCheck) return true;

            const lastCheckTime = parseInt(lastCheck, 10);
            const now = Date.now();
            return (now - lastCheckTime) > this.UPDATE_CHECK_INTERVAL;
        } catch {
            return true;
        }
    }

    /**
     * 更新最后检查时间
     */
    private static updateLastCheckTime(): void {
        try {
            localStorage.setItem(this.LAST_CHECK_KEY, Date.now().toString());
        } catch (e) {
            // 忽略存储错误
        }
    }

    /**
     * 检查是否有新版本可用 (支持多源fallback)
     * @returns 版本信息对象,如果检查失败返回 null
     */
    static async checkForUpdates(): Promise<VersionInfo | null> {
        // 优先尝试Gitee API(国内用户)
        let versionInfo = await this.fetchVersionFromGiteeAPI();

        if (versionInfo) {
            return versionInfo;
        }

        // Fallback到GitHub
        versionInfo = await this.fetchVersionFromUrl(this.GITHUB_UPDATE_URL);

        return versionInfo;
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
     * @param force 强制检查，忽略时间间隔限制
     * @returns 如果需要更新返回版本信息，否则返回 null
     */
    static async checkNeedsUpdate(force: boolean = false): Promise<VersionInfo | null> {
        // 检查是否应该执行更新检查
        if (!force && !this.shouldCheckForUpdates()) {
            return null;
        }

        const latestVersion = await this.checkForUpdates();

        // 更新最后检查时间
        this.updateLastCheckTime();

        if (!latestVersion) {
            return null;
        }

        // 验证version字段
        if (!latestVersion.version) {
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
