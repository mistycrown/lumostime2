/**
 * @file useCustomColors.ts
 * @input None
 * @output Reactive custom color list from local persistence
 * @pos Hook
 * @description 订阅自定义色组变更，确保颜色选择器和消费端在同标签页内也能拿到最新颜色列表。
 */

import { useEffect, useState } from 'react';
import type { CustomColorItem } from '../types';
import {
  CUSTOM_COLOR_GROUP_UPDATED_EVENT,
  customColorGroupService,
} from '../services/customColorGroupService';

export const useCustomColors = (): CustomColorItem[] => {
  const [customColors, setCustomColors] = useState<CustomColorItem[]>(() => {
    return customColorGroupService.getGroup().colors;
  });

  useEffect(() => {
    const syncCustomColors = () => {
      setCustomColors(customColorGroupService.getGroup().colors);
    };

    syncCustomColors();

    window.addEventListener(CUSTOM_COLOR_GROUP_UPDATED_EVENT, syncCustomColors);
    window.addEventListener('storage', syncCustomColors);

    return () => {
      window.removeEventListener(CUSTOM_COLOR_GROUP_UPDATED_EVENT, syncCustomColors);
      window.removeEventListener('storage', syncCustomColors);
    };
  }, []);

  return customColors;
};
