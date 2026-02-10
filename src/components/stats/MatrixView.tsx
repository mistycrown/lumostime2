/**
 * @file MatrixView.tsx
 * @input matrixData, categories, excludedCategoryIds
 * @output UI (Matrix Grid), Events (toggleExclusion)
 * @pos Component (Statistics - Matrix)
 * @description 矩阵统计视图 - 显示活动在一周内的打卡情况
 * 
 * 以矩阵形式展示每个活动在一周内每天是否有记录，
 * 用于追踪活动的连续性和规律性。
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import React from 'react';
import { Activity, Category } from '../../types';
import { IconRenderer } from '../IconRenderer';
import { getHexColor } from '../../utils/chartUtils';

export interface MatrixData {
  days: Date[];
  rows: {
    activity: Activity;
    category: Category;
    logCount: number;
    cells: boolean[];
  }[];
}

export interface MatrixViewProps {
  matrixData: MatrixData;
  categories: Category[];
  excludedCategoryIds: string[];
  onToggleExclusion: (id: string) => void;
  isFullScreen?: boolean;
}

export const MatrixView: React.FC<MatrixViewProps> = ({
  matrixData,
  categories,
  excludedCategoryIds,
  onToggleExclusion,
  isFullScreen = false
}) => {
  return (
    <div className={`animate-in fade-in zoom-in-95 duration-300 ${isFullScreen ? 'flex-1 flex flex-col justify-center' : ''}`}>
      <div className="space-y-4 w-full">
        {matrixData.rows.length === 0 ? (
          <div className="text-center py-10 text-stone-300 text-sm">暂无数据</div>
        ) : (
          <div className="w-full max-w-4xl mx-auto">
            {/* Week Header */}
            <div className="flex items-center mb-4">
              <div className="w-28 shrink-0"></div>
              <div className="flex-1 grid grid-cols-7 gap-2">
                {matrixData.days.map((d, i) => (
                  <div key={i} className="text-center flex justify-center">
                    <div className={`text-[10px] font-bold uppercase ${
                      d.toDateString() === new Date().toDateString() 
                        ? 'text-stone-900 scale-110' 
                        : 'text-stone-300'
                    }`}>
                      {['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Rows */}
            <div className="space-y-3">
              {matrixData.rows.map((row) => (
                <div key={row.activity.id} className="flex items-center">
                  {/* Activity Label */}
                  <div className="w-28 shrink-0 flex items-center gap-2 pr-2 overflow-hidden">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 bg-stone-50" 
                      style={{ color: getHexColor(row.activity.color) }}
                    >
                      <IconRenderer 
                        icon={row.activity.icon} 
                        uiIcon={row.activity.uiIcon} 
                        className="text-xs" 
                      />
                    </div>
                    <span className="text-xs font-bold text-stone-600 truncate">
                      {row.activity.name}
                    </span>
                  </div>

                  {/* Week Cells */}
                  <div className="flex-1 grid grid-cols-7 gap-2">
                    {row.cells.map((hasLog, i) => (
                      <div key={i} className="flex justify-center h-6">
                        <div
                          className={`w-full max-w-[24px] h-full rounded-md transition-all duration-300 ${
                            hasLog 
                              ? 'scale-100 shadow-sm opacity-90' 
                              : 'scale-75 bg-stone-50/50'
                          }`}
                          style={hasLog ? { backgroundColor: getHexColor(row.activity.color) } : {}}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 justify-center pt-6 pb-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onToggleExclusion(cat.id)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${
              excludedCategoryIds.includes(cat.id)
                ? 'bg-stone-50 text-stone-300 grayscale'
                : 'bg-white border border-stone-200 text-stone-600'
            }`}
          >
            <IconRenderer icon={cat.icon} uiIcon={cat.uiIcon} size={14} />
            <span>{cat.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
