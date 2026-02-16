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
    private static CURRENT_VERSION = '1.1.1';

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
                console.warn(`[UpdateService] Gitee API 返回状态码 ${response.status}`);
                return null;
            }

            // Gitee API返回base64编码的content
            const apiResponse = response.data;
            
            // 验证响应格式
            if (!apiResponse || typeof apiResponse !== 'object') {
                console.warn('[UpdateService] Gitee API 响应格式无效（非对象）');
                return null;
            }

            if (!apiResponse.content || apiResponse.encoding !== 'base64') {
                console.warn('[UpdateService] Gitee API 响应缺少 content 或 encoding 字段');
                return null;
            }

            // 解码base64 (处理中文字符)
            const decodedContent = decodeURIComponent(escape(atob(apiResponse.content)));
            const data: VersionInfo = JSON.parse(decodedContent);

            // 验证解析后的数据结构
            if (!data.version || !data.versionCode) {
                console.warn('[UpdateService] Gitee API 解析后的数据缺少必要字段:', data);
                return null;
            }

            console.log('[UpdateService] ✓ 从 Gitee API 成功获取版本信息:', data.version);
            return data;
        } catch (error: any) {
            console.warn('[UpdateService] Gitee API 获取失败:', error.message);
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
                console.warn(`[UpdateService] GitHub 返回状态码 ${response.status}`);
                return null;
            }

            const data: VersionInfo = response.data;
            
            // 验证数据结构
            if (!data || typeof data !== 'object') {
                console.warn('[UpdateService] GitHub 响应格式无效（非对象）');
                return null;
            }

            if (!data.version || !data.versionCode) {
                console.warn('[UpdateService] GitHub 响应缺少必要字段:', data);
                return null;
            }

            console.log('[UpdateService] ✓ 从 GitHub 成功获取版本信息:', data.version);
            return data;
        } catch (error: any) {
            console.warn('[UpdateService] GitHub 获取失败:', error.message);
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
        console.log('[UpdateService] 开始检查更新...');
        
        // 优先尝试Gitee API(国内用户)
        let versionInfo = await this.fetchVersionFromGiteeAPI();

        if (versionInfo) {
            return versionInfo;
        }

        console.log('[UpdateService] Gitee 不可用，尝试 GitHub...');

        // Fallback到GitHub
        versionInfo = await this.fetchVersionFromUrl(this.GITHUB_UPDATE_URL);

        if (!versionInfo) {
            console.error('[UpdateService] ✗ 所有更新源均不可用');
        }

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
            console.log('[UpdateService] 跳过更新检查（距上次检查不足24小时）');
            return null;
        }

        const latestVersion = await this.checkForUpdates();

        // 更新最后检查时间
        this.updateLastCheckTime();

        if (!latestVersion) {
            console.log('[UpdateService] 无法获取版本信息');
            return null;
        }

        console.log(`[UpdateService] 当前版本: ${this.CURRENT_VERSION}, 最新版本: ${latestVersion.version}`);

        const hasUpdate = this.compareVersions(this.CURRENT_VERSION, latestVersion.version);

        if (hasUpdate) {
            console.log('[UpdateService] ✓ 发现新版本');
        } else {
            console.log('[UpdateService] ✓ 已是最新版本');
        }

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

    /**
     * 清除最后检查时间（用于调试）
     */
    static clearLastCheckTime(): void {
        try {
            localStorage.removeItem(this.LAST_CHECK_KEY);
            console.log('[UpdateService] 已清除最后检查时间');
        } catch (e) {
            console.error('[UpdateService] 清除失败:', e);
        }
    }

    /**
     * 获取最后检查时间（用于调试）
     */
    static getLastCheckTime(): string | null {
        try {
            const lastCheck = localStorage.getItem(this.LAST_CHECK_KEY);
            if (!lastCheck) return null;
            const date = new Date(parseInt(lastCheck, 10));
            return date.toLocaleString('zh-CN');
        } catch {
            return null;
        }
    }
}
