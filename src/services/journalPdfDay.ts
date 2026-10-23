/**
 * @file journalPdfDay.ts
 * @input One journal day and selected content groups
 * @output Balanced three-column A4 or two-column A5 daily details with full Log text
 * @pos Service (Journal daily layout)
 * @updated 2026-10-23: Measures authored paragraphs before choosing compact flow height.
 * @updated 2026-10-23: Includes complete actual/planned Log metadata and keeps check labels distinct from authored text.
 */
import { JOURNAL_COLORS as C } from './journalPdfTheme';
import { formatJournalDuration, formatJournalTime, getJournalDayPlans, journalCheckValue, type JournalDay, type JournalSection } from '../utils/journalExport';
import { dateLabel, writeLogs, writePlans, type JournalPdfWriter } from './journalPdfLayout';
import { journalReviewLines } from './journalPdfOverview';
import { writeJournalLogDetails } from './journalPdfLogDetails';

const MUTED = C.muted;
const ACCENT = C.accent;

export const writeJournalDay = (w: JournalPdfWriter, day: JournalDay, selected: Set<JournalSection>): void => {
  const detail = selected.has('daily');
  const logs = selected.has('logs');
  const review = selected.has('reviews') && day.review;
  w.startPage(dateLabel(day.date), `${detail ? '一日一页' : logs ? '日志' : '日复盘'} ${formatJournalDuration(day.actualSeconds)}`);
  const count = w.model.options.paperSize === 'a4' ? 3 : 2;
  w.beginColumns(count);
  const paraHeight = (value: string | undefined, size = 10, indent = 0) => value ? w.wrap(value, w.contentWidth - indent, size, 'hand').length * size * 1.5 + 3 : 0;
  let estimate = 0;
  const plans = getJournalDayPlans(day);
  if (detail && plans.length) {
    estimate += 25;
    plans.forEach((plan) => {
      estimate += paraHeight(plan.title, w.bodySize + 1, 18) + 18;
      if (!selected.has('monthly')) plan.notes.forEach((note) => { estimate += paraHeight(note.text, w.bodySize, 18); });
    });
  }
  if (detail || logs) day.logs.filter((log) => !log.source.isPlanned).forEach((log) => {
    estimate += 42 + paraHeight(log.source.title || log.activity, w.bodySize + 1, 12) + paraHeight(log.source.note, w.bodySize, 12);
    estimate += (log.fields || []).reduce((sum, field) => sum + 18 + paraHeight(field.value, 9, 60), 0) + (log.source.images?.length || 0) * 188;
    estimate += (log.source.comments || []).reduce((sum, comment) => sum + 28 + paraHeight(comment.content, 9, 12), 0);
    estimate += [log.scopes?.length, log.keywords?.length, log.todo, log.source.reactions?.length].filter(Boolean).length * 20;
  });
  if (detail && day.checks.length) estimate += 25 + day.checks.reduce((sum, item) => sum + paraHeight(item.content + ' ' + journalCheckValue(item)), 0);
  if (detail && (day.review?.summary || day.review?.moodEmoji)) estimate += 70 + paraHeight(day.review?.summary, w.bodySize + 1, 38);
  const reviewLines = review ? journalReviewLines(detail ? { ...review, summary: undefined } : review) : [];
  reviewLines.forEach((line) => { estimate += line.role === 'print' ? 25 : paraHeight(line.text); });
  if (logs && !detail) day.logs.filter((log) => log.source.isPlanned).forEach((log) => { estimate += 35 + paraHeight(log.source.title || log.activity) + paraHeight(log.source.note); });
  w.beginColumns(count, Math.ceil(estimate / count) + 45);
  if (detail && plans.length) { w.heading('今日计划'); writePlans(w, day, !selected.has('monthly'), true); }
  if ((detail || logs) && day.logs.some((log) => !log.source.isPlanned)) { w.heading('时间线 日志'); writeLogs(w, day, true); }
  if (logs && !detail) {
    const planned = day.logs.filter((log) => log.source.isPlanned);
    if (planned.length) w.heading('计划时间');
    planned.forEach((log) => {
      w.paragraph(`${formatJournalTime(log.start, day.date)}–${formatJournalTime(log.end, day.date)}`, 8, ACCENT, 0, 'print');
      w.paragraph(log.source.title || log.activity);
      writeJournalLogDetails(w, log);
    });
  }
  if (detail && day.checks.length) {
    w.heading('今日打卡');
    day.checks.forEach((item) => {
      const status = journalCheckValue(item);
      const statusWidth = w.widthOf(status, 9);
      const lines = w.wrap(item.content, w.contentWidth - statusWidth - 22, 9, 'hand');
      lines.forEach((line, index) => {
        w.ensure(13.5);
        if (!index) {
          w.text(item.isCompleted ? '[x]' : '[ ]', w.margin, w.y, 9, ACCENT);
          w.text(status, w.margin + w.contentWidth - statusWidth, w.y, 9, MUTED);
        }
        w.text(line, w.margin + 14, w.y, 9, C.ink, 'hand');
        w.y += 13.5;
      });
      w.y += 3;
    });
  }
  if (detail && (day.review?.summary?.trim() || day.review?.moodEmoji)) {
    w.heading('每日一句话');
    w.ensure(48);
    const page = w.page;
    const x = w.margin;
    const top = w.y;
    const icon = day.review.moodEmoji;
    if (icon) w.sticker(icon, x, top, 24);
    if (day.review.summary) w.paragraph(day.review.summary, w.bodySize + 1, undefined, icon ? 33 : 0);
    if (page === w.page && x === w.margin) w.y = Math.max(w.y, top + (icon ? 29 : 0));
    w.rule();
  }
  if (reviewLines.length) {
    w.heading('日复盘');
    reviewLines.forEach((line) => { if (line.role === 'print') w.heading(line.text); else w.paragraph(line.text); });
  }
};
