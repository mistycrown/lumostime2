/**
 * @file fontService.ts
 * @description 字体管理服务 - 管理内置字体与本地上传字体的切换、持久化与恢复
 */

import { customFontStorageService, FontFormat, StoredCustomFontRecord } from './customFontStorageService';

export interface FontOption {
  id: string;
  name: string;
  displayName: string;
  description: string;
  fontFamily: string; // CSS font-family 值
  type: 'system' | 'custom'; // system: 系统默认, custom: 自定义字体
  source?: 'builtin' | 'uploaded';
}

interface FontMutationResult {
  success: boolean;
  message: string;
}

interface AddCustomFontResult extends FontMutationResult {
  fontId?: string;
}

const BASE_FALLBACK_FONT_FAMILY = '"Noto Serif SC", "Source Han Serif SC", "Source Han Serif CN", "Songti SC", "STSong", "SimSun", "Microsoft YaHei", serif';
const MAX_FONT_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_FONT_FORMATS: FontFormat[] = ['woff2', 'woff', 'ttf', 'otf'];

// 内置字体列表
const BUILTIN_FONT_OPTIONS: FontOption[] = [
  {
    id: 'default',
    name: 'default',
    displayName: '默认',
    description: '',
    fontFamily: BASE_FALLBACK_FONT_FAMILY,
    type: 'system',
    source: 'builtin'
  },
  {
    id: 'lxgw-wenkai',
    name: 'lxgw-wenkai',
    displayName: '霞鹜文楷',
    description: '',
    fontFamily: '"LXGW WenKai", "Noto Serif SC", "Source Han Serif SC", "SimSun", serif',
    type: 'custom',
    source: 'builtin'
  },
  {
    id: 'lxgw-neo-zhisong',
    name: 'lxgw-neo-zhisong',
    displayName: '霞鹜新致宋',
    description: '',
    fontFamily: '"LXGW Neo ZhiSong", "Noto Serif SC", "Source Han Serif SC", "SimSun", serif',
    type: 'custom',
    source: 'builtin'
  },
  {
    id: 'ding-lie-song',
    name: 'ding-lie-song',
    displayName: '鼎烈宋体',
    description: '',
    fontFamily: '"Ding Lie Song", "Noto Serif SC", "Source Han Serif SC", "SimSun", serif',
    type: 'custom',
    source: 'builtin'
  },
  {
    id: 'zhuque-fangsong',
    name: 'zhuque-fangsong',
    displayName: '朱雀仿宋',
    description: '',
    fontFamily: '"Zhuque Fangsong", "Noto Serif SC", "Source Han Serif SC", "SimSun", serif',
    type: 'custom',
    source: 'builtin'
  },
  {
    id: 'wenquanyi-bitmap',
    name: 'wenquanyi-bitmap',
    displayName: '文泉驿点阵宋',
    description: '',
    fontFamily: '"WenQuanYi Bitmap Song", "Noto Serif SC", "Source Han Serif SC", "SimSun", serif',
    type: 'custom',
    source: 'builtin'
  }
];

const STORAGE_KEY = 'lumostime_font_family';

class FontService {
  private currentFont: string = 'default';
  private customFonts: FontOption[] = [];
  private registeredCustomFontIds = new Set<string>();

  constructor() {
    this.loadCurrentFont();
  }

  /**
   * 从文件名推断格式
   */
  private detectFontFormat(fileName: string): FontFormat | null {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!extension) return null;
    return ALLOWED_FONT_FORMATS.includes(extension as FontFormat) ? (extension as FontFormat) : null;
  }

  /**
   * 清洗展示名
   */
  private sanitizeDisplayName(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return '自定义字体';
    return trimmed.slice(0, 40);
  }

  /**
   * 生成上传字体的 font-family 名
   */
  private buildCustomFamilyName(fontId: string): string {
    return `LumoCustom_${fontId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  }

  /**
   * 构建上传字体在列表中的配置
   */
  private buildUploadedFontOption(record: StoredCustomFontRecord): FontOption {
    return {
      id: record.id,
      name: record.id,
      displayName: record.displayName,
      description: `本地上传 · ${record.format.toUpperCase()}`,
      fontFamily: `"${record.familyName}", ${BASE_FALLBACK_FONT_FAMILY}`,
      type: 'custom',
      source: 'uploaded'
    };
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }

        reject(new Error('Failed to convert font blob to data URL'));
      };
      reader.onerror = () => reject(reader.error || new Error('Failed to read font blob'));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 注册字体到 document.fonts
   */
  private async registerCustomFont(record: StoredCustomFontRecord): Promise<void> {
    if (this.registeredCustomFontIds.has(record.id)) {
      return;
    }

    if (typeof FontFace === 'undefined' || !document.fonts) {
      throw new Error('当前环境不支持 FontFace API');
    }

    const arrayBuffer = await record.blob.arrayBuffer();
    const fontFace = new FontFace(record.familyName, arrayBuffer);
    await fontFace.load();
    (document.fonts as FontFaceSet & { add: (font: FontFace) => void }).add(fontFace);
    this.registeredCustomFontIds.add(record.id);
  }

  /**
   * 重载上传字体列表并尝试恢复字体注册
   */
  async refreshCustomFonts(): Promise<FontOption[]> {
    try {
      const storedFonts = await customFontStorageService.listFonts();
      storedFonts.sort((a, b) => a.createdAt - b.createdAt);

      for (const fontRecord of storedFonts) {
        try {
          await this.registerCustomFont(fontRecord);
        } catch (error) {
          console.warn('[FontService] 恢复上传字体失败:', fontRecord.displayName, error);
        }
      }

      this.customFonts = storedFonts.map((record) => this.buildUploadedFontOption(record));
    } catch (error) {
      console.error('[FontService] 读取上传字体失败:', error);
      this.customFonts = [];
    }

    return this.getAllFonts();
  }

  /**
   * 上传并保存自定义字体
   */
  async addCustomFont(file: File, displayName?: string): Promise<AddCustomFontResult> {
    const format = this.detectFontFormat(file.name);
    if (!format) {
      return {
        success: false,
        message: '仅支持 woff2 / woff / ttf / otf 字体文件'
      };
    }

    if (file.size > MAX_FONT_FILE_SIZE) {
      return {
        success: false,
        message: '字体文件过大，请控制在 20MB 内'
      };
    }

    const now = Date.now();
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const fontId = `custom-${now}-${randomSuffix}`;
    const finalDisplayName = this.sanitizeDisplayName(displayName || file.name.replace(/\.[^/.]+$/, ''));
    const familyName = this.buildCustomFamilyName(fontId);

    const record: StoredCustomFontRecord = {
      id: fontId,
      displayName: finalDisplayName,
      familyName,
      fileName: file.name,
      format,
      size: file.size,
      createdAt: now,
      updatedAt: now,
      blob: file
    };

    try {
      await this.registerCustomFont(record);
      await customFontStorageService.saveFont(record);
      await this.refreshCustomFonts();

      console.log('[FontService] 上传字体成功:', record.displayName);
      return {
        success: true,
        message: `字体「${record.displayName}」上传成功`,
        fontId
      };
    } catch (error) {
      console.error('[FontService] 上传字体失败:', error);
      return {
        success: false,
        message: '字体解析失败，请尝试其他文件'
      };
    }
  }

  /**
   * 删除上传字体
   */
  async removeCustomFont(fontId: string): Promise<FontMutationResult> {
    const target = this.customFonts.find((font) => font.id === fontId && font.source === 'uploaded');
    if (!target) {
      return {
        success: false,
        message: '未找到要删除的自定义字体'
      };
    }

    try {
      await customFontStorageService.deleteFont(fontId);
      this.customFonts = this.customFonts.filter((font) => font.id !== fontId);
      this.registeredCustomFontIds.delete(fontId);

      if (this.currentFont === fontId) {
        this.setFont('default');
      }

      return {
        success: true,
        message: `已删除字体「${target.displayName}」`
      };
    } catch (error) {
      console.error('[FontService] 删除上传字体失败:', error);
      return {
        success: false,
        message: '删除字体失败，请稍后重试'
      };
    }
  }

  /**
   * 加载当前字体设置
   */
  private loadCurrentFont() {
    const saved = localStorage.getItem(STORAGE_KEY);
    this.currentFont = saved || 'default';
    console.log('[FontService] 加载字体设置:', this.currentFont);
  }

  /**
   * 获取所有可用字体
   */
  getAllFonts(): FontOption[] {
    return [...BUILTIN_FONT_OPTIONS, ...this.customFonts];
  }

  /**
   * 获取当前字体
   */
  getCurrentFont(): string {
    return this.currentFont;
  }

  /**
   * 获取当前字体配置
   */
  getCurrentFontOption(): FontOption {
    return this.getAllFonts().find((font) => font.id === this.currentFont) || BUILTIN_FONT_OPTIONS[0];
  }

  async getCurrentFontEmbedCSS(): Promise<string> {
    const currentFontOption = this.getCurrentFontOption();
    if (currentFontOption.source !== 'uploaded') {
      return '';
    }

    try {
      const record = await customFontStorageService.getFont(currentFontOption.id);
      if (!record) {
        return '';
      }

      const dataUrl = await this.blobToDataUrl(record.blob);
      const formatName = record.format === 'ttf' ? 'truetype' : record.format;

      return `
@font-face {
  font-family: '${record.familyName}';
  src: url('${dataUrl}') format('${formatName}');
  font-weight: 400;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: '${record.familyName}';
  src: url('${dataUrl}') format('${formatName}');
  font-weight: 700;
  font-style: normal;
  font-display: block;
}
      `.trim();
    } catch (error) {
      console.warn('[FontService] Failed to build export font CSS:', error);
      return '';
    }
  }

  /**
   * 设置字体
   */
  setFont(fontId: string): FontMutationResult {
    const font = this.getAllFonts().find((item) => item.id === fontId);

    if (!font) {
      return {
        success: false,
        message: '字体不存在'
      };
    }

    try {
      // 保存到 localStorage
      localStorage.setItem(STORAGE_KEY, fontId);
      this.currentFont = fontId;

      // 应用字体到 body
      this.applyFont(font);

      console.log('[FontService] 字体已切换:', fontId);
      return {
        success: true,
        message: `已切换到 ${font.displayName}`
      };
    } catch (error) {
      console.error('[FontService] 切换字体失败:', error);
      return {
        success: false,
        message: '切换字体失败'
      };
    }
  }

  /**
   * 应用字体到页面
   */
  private applyFont(font: FontOption) {
    try {
      console.log('[FontService] 开始应用字体:', font.fontFamily);

      // 设置 CSS 变量
      document.documentElement.style.setProperty('--font-family', font.fontFamily);

      // 验证是否设置成功
      const appliedValue = getComputedStyle(document.documentElement).getPropertyValue('--font-family');
      console.log('[FontService] CSS变量已设置:', appliedValue);

      // 检查 body 的实际字体
      const bodyFont = getComputedStyle(document.body).fontFamily;
      console.log('[FontService] body实际字体:', bodyFont);

      // 强制重绘
      document.body.offsetHeight;

      console.log('[FontService] ✓ 字体应用完成');
    } catch (error) {
      console.error('[FontService] ✗ 应用字体失败:', error);
    }
  }

  /**
   * 初始化字体（在应用启动时调用）
   */
  async initializeFont(): Promise<void> {
    await this.refreshCustomFonts();

    // 当前字体若不存在（例如已删除），回退为默认
    const hasCurrentFont = this.getAllFonts().some((font) => font.id === this.currentFont);
    if (!hasCurrentFont) {
      this.currentFont = 'default';
      localStorage.setItem(STORAGE_KEY, 'default');
    }

    const currentFontOption = this.getCurrentFontOption();
    this.applyFont(currentFontOption);
    console.log('[FontService] 字体初始化完成:', currentFontOption.displayName);

    // 检查字体是否加载成功
    if (document.fonts && document.fonts.check) {
      setTimeout(() => {
        const firstFamily = currentFontOption.fontFamily.split(',')[0].replace(/"/g, '');
        const fontLoaded = document.fonts.check(`16px "${firstFamily}"`);
        console.log('[FontService] 字体加载状态:', fontLoaded ? '成功' : '失败');

        if (!fontLoaded && currentFontOption.type === 'custom') {
          console.warn('[FontService] 自定义字体未加载，可能需要检查字体文件');
        }
      }, 1000);
    }
  }
}

// 导出单例
export const fontService = new FontService();
