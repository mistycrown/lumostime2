/**
 * @file AIBackfillChatCallSettingsSection.tsx
 * @input Context-limit state, theme tokens, and nested assistant-settings content
 * @output Call-settings branch for the AI settings overlay
 * @pos Component Support (AI Integration)
 * @description Extracts the call-settings branch wrapper out of AIBackfillChatModal so the modal can supply the nested assistant-settings section without carrying the surrounding layout inline.
 * @updated 2026-05-15: Extracted the call settings branch wrapper from AIBackfillChatModal.
 */
import React from 'react';

interface AIChatCallSettingsTheme {
  chipBg: string;
  chipBorder: string;
  inputBg: string;
  textMuted: string;
  textPrimary: string;
}

interface AIBackfillChatCallSettingsSectionProps {
  assistantSettingsContent: React.ReactNode;
  contextMessageLimit: number;
  onContextMessageLimitChange: (value: number) => void;
  theme: AIChatCallSettingsTheme;
}

export const AIBackfillChatCallSettingsSection: React.FC<AIBackfillChatCallSettingsSectionProps> = ({
  assistantSettingsContent,
  contextMessageLimit,
  onContextMessageLimitChange,
  theme
}) => (
  <div className="space-y-8">
    <section className="space-y-4">
      <div className="flex min-h-[3.25rem] items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-stone-800">上下文设置</p>
        </div>
        <span
          className="rounded-[0.75rem] border px-3 py-1 text-xs font-medium"
          style={{
            borderColor: theme.chipBorder,
            backgroundColor: theme.chipBg,
            color: theme.textMuted
          }}
        >
          当前会话
        </span>
      </div>

      <label className="block max-w-[240px]">
        <span className="mb-1 block text-xs font-medium text-stone-500">手动输入最近上下文轮数</span>
        <input
          type="number"
          min={0}
          value={contextMessageLimit}
          onChange={(event) => onContextMessageLimitChange(Number(event.target.value))}
          className="w-full rounded-[1rem] border px-3 py-2 text-sm outline-none"
          style={{
            borderColor: theme.chipBorder,
            backgroundColor: theme.inputBg,
            color: theme.textPrimary
          }}
        />
      </label>
    </section>

    {assistantSettingsContent}
  </div>
);
