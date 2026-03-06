/**
 * @file timePalCustomService.ts
 * @description 自定义时光小友服务 - 负责本地校验、保存、读取和删除（不参加云同步）
 * @input 用户上传的 5 张 PNG 图片、名称
 * @output 自定义时光小友元数据（localStorage）和本地图片文件（imageService）
 * @pos Service (TimePal Customization)
 */
import { TIMEPAL_KEYS, storage } from '../constants/storageKeys';
import { CUSTOM_TIMEPAL_PREFIX, extractCustomTimePalId } from '../constants/timePalConfig';
import { imageService } from './imageService';

export interface CustomTimePalItem {
    id: string;
    name: string;
    stageFilenames: [string, string, string, string, string];
    createdAt: number;
    updatedAt: number;
}

interface ValidationResult {
    valid: boolean;
    message?: string;
}

const CUSTOM_TIMEPAL_EVENT = 'timepal-custom-changed';
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const STAGE_COUNT = 5;

class TimePalCustomService {
    /**
     * 获取全部自定义时光小友，按创建时间升序
     */
    getAllItems(): CustomTimePalItem[] {
        const items = storage.getJSON<CustomTimePalItem[]>(TIMEPAL_KEYS.CUSTOM_ITEMS, []);
        return [...items].sort((a, b) => a.createdAt - b.createdAt);
    }

    /**
     * 根据 ID 获取自定义时光小友
     */
    getItemById(id: string): CustomTimePalItem | null {
        return this.getAllItems().find(item => item.id === id) || null;
    }

    /**
     * 根据选择值（custom:<id>）获取自定义时光小友
     */
    getItemBySelection(selection: string): CustomTimePalItem | null {
        const customId = extractCustomTimePalId(selection);
        if (!customId) {
            return null;
        }
        return this.getItemById(customId);
    }

    /**
     * 获取某个阶段对应文件名（level: 1-5）
     */
    getStageFilename(selection: string, level: number): string | null {
        const item = this.getItemBySelection(selection);
        if (!item) {
            return null;
        }

        if (level < 1 || level > STAGE_COUNT) {
            return null;
        }

        return item.stageFilenames[level - 1] || null;
    }

    /**
     * 生成自定义选择值
     */
    getSelectionValue(id: string): string {
        return `${CUSTOM_TIMEPAL_PREFIX}${id}`;
    }

    /**
     * 添加自定义时光小友
     */
    async addItem(name: string, stageFiles: File[]): Promise<CustomTimePalItem> {
        const trimmedName = name.trim();
        const nameValidation = this.validateName(trimmedName);
        if (!nameValidation.valid) {
            throw new Error(nameValidation.message || '名称校验失败');
        }

        const fileValidation = await this.validateStageFiles(stageFiles);
        if (!fileValidation.valid) {
            throw new Error(fileValidation.message || '图片校验失败');
        }

        const now = Date.now();
        const id = `custom_tp_${now}_${Math.random().toString(36).slice(2, 8)}`;
        const stageFilenames = stageFiles.map((_, idx) => `timepal_custom_${id}_${idx + 1}.png`) as [string, string, string, string, string];
        const writtenFilenames: string[] = [];

        try {
            for (let i = 0; i < stageFiles.length; i++) {
                const filename = stageFilenames[i];
                const file = stageFiles[i];
                await imageService.writeImage(filename, file);
                writtenFilenames.push(filename);
            }
        } catch (error) {
            // 回滚已写入文件
            await Promise.all(
                writtenFilenames.map(filename =>
                    imageService.deleteImageLocalOnly(filename).catch(() => undefined)
                )
            );
            throw error;
        }

        const newItem: CustomTimePalItem = {
            id,
            name: trimmedName,
            stageFilenames,
            createdAt: now,
            updatedAt: now,
        };

        const items = this.getAllItems();
        items.push(newItem);
        this.saveItems(items);
        this.emitChanged();

        return newItem;
    }

    /**
     * 删除自定义时光小友（仅本地）
     */
    async deleteItem(id: string): Promise<boolean> {
        const items = this.getAllItems();
        const target = items.find(item => item.id === id);
        if (!target) {
            return false;
        }

        await Promise.all(
            target.stageFilenames.map(filename =>
                imageService.deleteImageLocalOnly(filename).catch(() => undefined)
            )
        );

        const filtered = items.filter(item => item.id !== id);
        this.saveItems(filtered);
        this.emitChanged();
        return true;
    }

    /**
     * 校验名称
     */
    validateName(name: string): ValidationResult {
        if (!name) {
            return { valid: false, message: '请输入时间小友名称' };
        }
        if (name.length > 20) {
            return { valid: false, message: '名称不能超过 20 个字符' };
        }

        const existed = this.getAllItems().some(item => item.name === name);
        if (existed) {
            return { valid: false, message: '该名称已存在，请更换名称' };
        }

        return { valid: true };
    }

    /**
     * 校验阶段图片
     */
    async validateStageFiles(stageFiles: File[]): Promise<ValidationResult> {
        if (!Array.isArray(stageFiles) || stageFiles.length !== STAGE_COUNT) {
            return { valid: false, message: '请上传 5 张阶段图片' };
        }

        for (let i = 0; i < stageFiles.length; i++) {
            const file = stageFiles[i];
            const stageLabel = `第 ${i + 1} 阶段`;

            if (!file) {
                return { valid: false, message: `${stageLabel}图片不能为空` };
            }
            if (file.type !== 'image/png') {
                return { valid: false, message: `${stageLabel}仅支持 PNG 格式` };
            }
            if (file.size > MAX_FILE_SIZE_BYTES) {
                return { valid: false, message: `${stageLabel}超过 2MB，请压缩后重试` };
            }

            const squareCheck = await this.checkIsSquare(file);
            if (!squareCheck.valid) {
                return { valid: false, message: `${stageLabel}必须是 1:1 比例` };
            }
        }

        return { valid: true };
    }

    private saveItems(items: CustomTimePalItem[]): void {
        storage.setJSON(TIMEPAL_KEYS.CUSTOM_ITEMS, items);
    }

    private emitChanged(): void {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event(CUSTOM_TIMEPAL_EVENT));
        }
    }

    private checkIsSquare(file: File): Promise<ValidationResult> {
        return new Promise((resolve) => {
            const image = new Image();
            const objectUrl = URL.createObjectURL(file);

            image.onload = () => {
                const width = image.width;
                const height = image.height;
                URL.revokeObjectURL(objectUrl);

                if (width <= 0 || height <= 0) {
                    resolve({ valid: false, message: '图片尺寸无效' });
                    return;
                }

                const ratio = width / height;
                const isSquare = Math.abs(ratio - 1) <= 0.01;
                resolve({ valid: isSquare, message: isSquare ? undefined : '图片比例必须为 1:1' });
            };

            image.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                resolve({ valid: false, message: '图片读取失败' });
            };

            image.src = objectUrl;
        });
    }
}

export const timePalCustomService = new TimePalCustomService();
export const TIMEPAL_CUSTOM_CHANGED_EVENT = CUSTOM_TIMEPAL_EVENT;
