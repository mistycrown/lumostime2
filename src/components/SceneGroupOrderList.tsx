/**
 * @file SceneGroupOrderList.tsx
 * @input Scene groups, current active group id, and move callbacks
 * @output Manual-mode scene group ordering UI
 * @description Renders the saved scene-group order list with up/down controls so settings and SceneView can share the same group sequence.
 * @updated 2026-05-11: Added manual scene-group ordering controls for SceneSettingsView.
 */
import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { SceneGroup } from '../types';

interface SceneGroupOrderListProps {
  groups: SceneGroup[];
  activeGroupId: string;
  onMoveGroup: (groupId: string, direction: 'up' | 'down') => void;
}

export const SceneGroupOrderList: React.FC<SceneGroupOrderListProps> = ({
  groups,
  activeGroupId,
  onMoveGroup
}) => {
  return (
    <div className="mt-3 pt-3 border-t border-stone-200">
      <label className="block text-xs font-medium text-stone-700 mb-2">场景组顺序</label>
      <div className="space-y-2">
        {groups.map((group, index) => {
          const isActive = group.id === activeGroupId;
          return (
            <div
              key={group.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate text-sm font-medium text-stone-800">{group.name}</span>
                  {isActive && (
                    <span className="shrink-0 rounded-full bg-stone-800 px-2 py-0.5 text-[10px] text-white">
                      当前展示
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onMoveGroup(group.id, 'up')}
                  disabled={index === 0}
                  className={`p-1.5 rounded ${
                    index === 0
                      ? 'text-stone-300 cursor-not-allowed'
                      : 'hover:bg-stone-100 text-stone-600'
                  }`}
                  title="上移"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveGroup(group.id, 'down')}
                  disabled={index === groups.length - 1}
                  className={`p-1.5 rounded ${
                    index === groups.length - 1
                      ? 'text-stone-300 cursor-not-allowed'
                      : 'hover:bg-stone-100 text-stone-600'
                  }`}
                  title="下移"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-stone-500 mt-2">这个顺序会同步影响场景页右上角的手动切换场景组列表。</p>
    </div>
  );
};
