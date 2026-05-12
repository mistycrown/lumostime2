/**
 * @file assistantQuietHours.ts
 * @input Assistant quiet-hours strings entered as `HHMM` or legacy `HH:MM`
 * @output Shared normalization helper for assistant random check-in protection windows
 * @pos Utils (Assistant Quiet Hours)
 * @description Keeps assistant quiet-hour values consistent across UI drafts, persisted config, and native sync by accepting legacy colon-separated times while normalizing valid values to compact four-digit `HHMM`.
 *
 * @updated 2026-05-12: Added shared quiet-hours normalization so background assistant settings can validate user-entered four-digit protection windows and migrate older `HH:MM` values safely.
 */

export const normalizeAssistantQuietHoursValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const normalizedDigits = trimmed.includes(':')
    ? trimmed.replace(':', '')
    : trimmed;
  if (!/^\d{4}$/.test(normalizedDigits)) {
    return undefined;
  }

  const hours = Number(normalizedDigits.slice(0, 2));
  const minutes = Number(normalizedDigits.slice(2, 4));
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return undefined;
  }

  return normalizedDigits;
};
