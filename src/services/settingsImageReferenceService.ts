/**
 * @file settingsImageReferenceService.ts
 * @input Local settings data stored in localStorage
 * @output Referenced image filenames used by settings features
 * @pos Service (Image Management)
 * @description 收集设置层中被保留和使用的图片文件名，供图片清理与引用列表重建共用。
 *
 * 当前已覆盖：
 * - 投喂功能中的自定义时间小友阶段图片
 *
 * 说明：
 * - 自定义背景当前以 data URL 形式存储，不进入 imageService 的图片仓库，因此不参与本地图片文件清理对比。
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { TIMEPAL_KEYS, storage } from '../constants/storageKeys';

interface StoredCustomTimePalItem {
    stageFilenames?: unknown;
}

const isValidFilename = (value: unknown): value is string => {
    return typeof value === 'string' && value.trim().length > 0;
};

export const getSettingsReferencedImages = (): Set<string> => {
    const referencedImages = new Set<string>();
    const customTimePalItems = storage.getJSON<StoredCustomTimePalItem[]>(TIMEPAL_KEYS.CUSTOM_ITEMS, []);

    if (Array.isArray(customTimePalItems)) {
        customTimePalItems.forEach((item) => {
            if (!Array.isArray(item?.stageFilenames)) {
                return;
            }

            item.stageFilenames.forEach((filename) => {
                if (isValidFilename(filename)) {
                    referencedImages.add(filename);
                }
            });
        });
    }

    return referencedImages;
};
