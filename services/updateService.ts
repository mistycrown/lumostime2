// 应用更新检测服务
export interface VersionInfo {
    version: string;
    versionCode: number;
    updateUrl: string;
    releaseNotes: string;
    forceUpdate: boolean;
}

export class UpdateService {
    // GitHub Raw URL 指向版本信息文件
    // 格式: https://raw.githubusercontent.com/用户名/仓库名/分支名/version.json
    private static UPDATE_CHECK_URL = 'https://raw.githubusercontent.com/mistycrown/lumostime2/master/version.json';

    // 当前应用版本（从 package.json 读取）
    private static CURRENT_VERSION = '1.0.1';

    /**
     * 检查是否有新版本可用
     * @returns 版本信息对象，如果检查失败返回 null
     */
    static async checkForUpdates(): Promise<VersionInfo | null> {
        try {
            const response = await fetch(this.UPDATE_CHECK_URL, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data: VersionInfo = await response.json();
            return data;
        } catch (error) {
            console.error('检查更新失败:', error);
            return null;
        }
    }

    /**
     * 比较版本号
     * @param current 当前版本号
     * @param latest 最新版本号
     * @returns 如果最新版本大于当前版本返回 true
     */
    static compareVersions(current: string, latest: string): boolean {
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
