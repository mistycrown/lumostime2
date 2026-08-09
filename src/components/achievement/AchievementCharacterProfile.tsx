/**
 * @file AchievementCharacterProfile.tsx
 * @input Character attributes, cumulative experience, and level progress
 * @output Fixed-height achievement character status panel
 * @pos Component (Achievement)
 * @description Renders the character profile view inside the same top viewport occupied by the achievement bottle.
 * @updated 2026-08-09: Added the initial character profile layout with total experience and scrollable attribute rows.
 * @updated 2026-08-09: Compressed the profile header and hid the attribute list scrollbar for the fixed achievement viewport.
 */

import React from 'react';
import { Settings2 } from 'lucide-react';
import type { AchievementAttribute, AchievementLevelProgress } from '../../types';
import {
  formatAchievementExperience,
  getAchievementExperienceRequiredForLevel,
  getAchievementLevelProgress
} from '../../utils/achievementUtils';
import { getAchievementAttributeIcon } from '../../constants/achievementAttributeIcons';

interface AchievementCharacterProfileProps {
  attributes: AchievementAttribute[];
  attributeExperience: Record<string, number>;
  totalExperience: number;
  totalLevelProgress: AchievementLevelProgress;
  attributeLevels: Record<string, AchievementLevelProgress>;
  onManageAttributes: () => void;
}

const getProgressLabel = (progress: AchievementLevelProgress): string => (
  `${formatAchievementExperience(progress.currentExperience)} / ${formatAchievementExperience(
    getAchievementExperienceRequiredForLevel(progress.level + 1) - getAchievementExperienceRequiredForLevel(progress.level)
  )}`
);

export const AchievementCharacterProfile: React.FC<AchievementCharacterProfileProps> = ({
  attributes,
  attributeExperience,
  totalExperience,
  totalLevelProgress,
  attributeLevels,
  onManageAttributes
}) => {
  const activeAttributes = attributes
    .filter((attribute) => attribute.enabled)
    .sort((first, second) => first.sortOrder - second.sortOrder);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-2 pt-1 sm:px-4 sm:pt-2">
      <section className="shrink-0 border-b border-stone-300 py-2 sm:py-3">
        <div className="flex items-start justify-between gap-4 pr-9">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-800">
              总经验值
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-stone-500">
              Total Experience
            </div>
            <div className="mt-2 text-[2.65rem] font-semibold leading-none tracking-tight text-stone-900 sm:text-[4rem]">
              {formatAchievementExperience(totalExperience)}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] uppercase tracking-[0.16em] text-stone-500">Total Level</div>
            <div className="mt-1 text-2xl font-semibold leading-none text-stone-900">
              LV. {totalLevelProgress.level}
            </div>
            <div className="mt-2 text-[10px] text-stone-500">
              {formatAchievementExperience(totalExperience)} / {formatAchievementExperience(totalLevelProgress.nextLevelExperience)}
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="shrink-0 bg-stone-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
            EXP
          </span>
          <div className="h-2 min-w-0 flex-1 bg-stone-200">
            <div
              className="h-full bg-stone-800 transition-[width] duration-500"
              style={{ width: `${Math.round(totalLevelProgress.progress * 100)}%` }}
            />
          </div>
          <span className="shrink-0 text-[10px] text-stone-500">
            {Math.round(totalLevelProgress.progress * 100)}%
          </span>
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col pt-3 sm:pt-4">
        <div className="flex shrink-0 items-end justify-between gap-3">
          <div>
            <span className="text-[1.05rem] font-semibold leading-none text-stone-900">成长属性</span>
            <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-stone-500">Attributes</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-stone-700">
              {activeAttributes.length} / {attributes.length}
            </span>
            <button
              type="button"
              onClick={onManageAttributes}
              title="管理人物属性"
              aria-label="管理人物属性"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-200/70 hover:text-stone-900"
            >
              <Settings2 size={15} />
            </button>
          </div>
        </div>

        <div className="mt-1 min-h-0 flex-1 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {activeAttributes.length === 0 ? (
            <div className="flex h-full min-h-24 items-center justify-center text-center text-sm text-stone-500">
              暂无启用属性
            </div>
          ) : (
            activeAttributes.map((attribute) => {
              const experience = attributeExperience[attribute.id] || 0;
              const progress = attributeLevels[attribute.id] || getAchievementLevelProgress(experience);
              const Icon = getAchievementAttributeIcon(attribute.icon);

              return (
                <div
                  key={attribute.id}
                  className="grid grid-cols-[2.6rem_minmax(5.8rem,7rem)_minmax(0,1fr)_auto] items-center gap-2 border-b border-dashed border-stone-300 py-2.5 sm:grid-cols-[3rem_minmax(7rem,9rem)_minmax(0,1fr)_auto] sm:gap-3 sm:py-3"
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white sm:h-11 sm:w-11"
                    style={{ backgroundColor: attribute.color }}
                  >
                    <Icon size={20} strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[1rem] font-semibold leading-none text-stone-900">
                      {attribute.name}
                    </div>
                    <div className="mt-1.5 truncate text-[10px] uppercase tracking-[0.14em] text-stone-500">
                      {attribute.subtitle}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-stone-700">Lv. {progress.level}</span>
                      <span className="truncate text-[10px] text-stone-500">
                        {getProgressLabel(progress)}
                      </span>
                    </div>
                    <div className="h-2 bg-stone-200">
                      <div
                        className="h-full transition-[width] duration-500"
                        style={{ width: `${Math.round(progress.progress * 100)}%`, backgroundColor: attribute.color }}
                      />
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-stone-500">
                    <div className="font-medium text-stone-700">{formatAchievementExperience(experience)}</div>
                    <div className="mt-1 whitespace-nowrap">
                      {formatAchievementExperience(progress.nextLevelExperience)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
