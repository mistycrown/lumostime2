/**
 * @file journalPdfDay.ts
 * @input One journal day and selected content groups
 * @output Balanced three-column A4 or two-column A5 daily details with full Log text
 * @pos Service (Journal daily layout)
 * @updated 2026-10-23: Measures authored paragraphs before choosing compact flow height.
 * @updated 2026-10-23: Includes complete actual/planned Log metadata and keeps check labels distinct from authored text.
 * @updated 2026-10-23: Uses Routine/Summary labels and 24/12/9pt guidance headings for section, group and question.
 * @updated 2026-10-24: Aligns checkboxes with their item text, removes duplicate completion words and reduces guidance headings.
 * @updated 2026-10-24: Renders template questions/answers under guidance and AI content under a separate peer narrative heading.
 */
import { JOURNAL_COLORS as C } from './journalPdfTheme';
import { formatJournalDuration, formatJournalTime, getJournalDayPlans, journalCheckValue, journalHasPart, type JournalDay, type JournalSection } from '../utils/journalExport';
import { dateLabel, writeLogs, writePlans, type JournalPdfWriter } from './journalPdfLayout';
import { journalReviewLines } from './journalPdfOverview';
import { writeJournalLogDetails, writeJournalLogTitle } from './journalPdfLogDetails';

const MUTED = C.muted;
const ACCENT = C.accent;

export const writeJournalDay = (w: JournalPdfWriter, day: JournalDay, selected: Set<JournalSection>): void => {
  const detail = selected.has('daily');
  const has = (part: Parameters<typeof journalHasPart>[1]) => journalHasPart(w.model.options, part);
  const logs = has('dayLogs');
  const review = has('dayReview') && day.review;
  const includeSummary = has('daySummary') || Boolean(review && !w.model.options.parts);
  const reviewLines = review ? journalReviewLines(review, w.model.reviewTemplates, 'guidance') : [];
  const narrativeLines = review ? journalReviewLines(review, w.model.reviewTemplates, 'narrative') : [];
  w.startPage(dateLabel(day.date), `${detail ? '一日一页' : logs ? '日志' : reviewLines.length ? '引导' : narrativeLines.length ? '叙事' : '总结'} ${formatJournalDuration(day.actualSeconds)}`);
  const count = w.model.options.paperSize === 'a4' ? 3 : 2;
  w.beginColumns(count);
  const paraHeight = (value: string | undefined, size = 10, indent = 0) => value ? w.wrap(value, w.contentWidth - indent, size, 'hand').length * size * 1.5 + 3 : 0;
  let estimate = 0;
  const plans = has('dayPlans') ? getJournalDayPlans(day) : [];
  if (detail && plans.length) {
    estimate += 25;
    plans.forEach((plan) => {
      estimate += paraHeight(plan.title, w.bodySize + 1, 18) + 18;
      if (!selected.has('monthly')) plan.notes.forEach((note) => { estimate += paraHeight(note.text, w.bodySize, 18); });
    });
  }
  if (logs) day.logs.filter((log) => !log.source.isPlanned).forEach((log) => {
    estimate += 42 + paraHeight(log.source.title || log.activity, w.bodySize + 1, 12) + paraHeight(log.source.note, w.bodySize, 12);
    estimate += (log.fields || []).reduce((sum, field) => sum + 18 + paraHeight(field.value, 9, 60), 0) + (log.source.images?.length || 0) * 188;
    estimate += (log.source.comments || []).reduce((sum, comment) => sum + 28 + paraHeight(comment.content, 9, 12), 0);
    estimate += [log.scopes?.length, log.collections?.length, log.todo, log.source.reactions?.length].filter(Boolean).length * 20;
  });
  if (has('dayChecks') && day.checks.length) estimate += 25 + day.checks.reduce((sum, item) => sum + paraHeight(item.content + ' ' + journalCheckValue(item)), 0);
  if (includeSummary && (day.review?.summary || day.review?.moodEmoji)) estimate += 70 + paraHeight(day.review?.summary, w.bodySize + 1, 38);
  [...reviewLines, ...narrativeLines].forEach((line) => { estimate += line.role === 'print' ? 25 : paraHeight(line.text); });
  if (narrativeLines.length) estimate += 45;
  if (logs && !detail) day.logs.filter((log) => log.source.isPlanned).forEach((log) => { estimate += 35 + paraHeight(log.source.title || log.activity) + paraHeight(log.source.note); });
  w.beginColumns(count, Math.ceil(estimate / count) + 45);
  if (plans.length) { w.heading('今日计划'); writePlans(w, day, !has('monthAgenda'), true); }
  if (logs && day.logs.some((log) => !log.source.isPlanned)) { w.heading('时间线 日志'); writeLogs(w, day, true); }
  if (logs && !has('dayPlans')) {
    const planned = day.logs.filter((log) => log.source.isPlanned);
    if (planned.length) w.heading('计划时间');
    planned.forEach((log) => {
      w.paragraph(`${formatJournalTime(log.start, day.date)}–${formatJournalTime(log.end, day.date)}`, 8, ACCENT, 0, 'print');
      writeJournalLogTitle(w, log);
      writeJournalLogDetails(w, log);
    });
  }
  if (has('dayChecks') && day.checks.length) {
    w.heading('日课');
    day.checks.forEach((item) => {
      const status = item.manualMode === 'count' ? journalCheckValue(item) : '';
      const statusWidth = w.widthOf(status, 9);
      const lines = w.wrap(item.content, w.contentWidth - statusWidth - 22, 9, 'hand');
      w.ensure(Math.min(lines.length * 13.5 + 3, 90));
      lines.forEach((line, index) => {
        w.ensure(13.5);
        if (!index) {
          w.checkbox(w.margin, w.y + (lines.length <= 6 ? (lines.length - 1) * 6.75 : 0) + 2.25, item.isCompleted);
          if (status) w.text(status, w.margin + w.contentWidth - statusWidth, w.y, 9, MUTED);
        }
        w.text(line, w.margin + 14, w.y, 9, C.ink, 'hand');
        w.y += 13.5;
      });
      w.y += 3;
    });
  }
  if (includeSummary && (day.review?.summary?.trim() || day.review?.moodEmoji)) {
    w.heading('总结');
    w.ensure(25);
    const page = w.page;
    const x = w.margin;
    const top = w.y;
    const icon = day.review.moodEmoji;
    if (icon) w.sticker(icon, x, top, 12);
    if (day.review.summary) w.paragraph(day.review.summary, 9, undefined, icon ? 18 : 0);
    if (page === w.page && x === w.margin) w.y = Math.max(w.y, top + (icon ? 13.5 : 0));
    w.rule();
  }
  if (reviewLines.length) {
    w.ensure(75);
    w.y += 8;
    w.heading('引导');
    reviewLines.forEach((line) => {
      if (line.level === 'group') { w.ensure(45); w.y += 9; w.paragraph(line.text, 9, C.ink, 0, 'print'); }
      else if (line.role === 'print') { w.ensure(35); w.paragraph(line.text, 9, C.muted, 0, 'print'); }
      else w.paragraph(line.text);
    });
  }
  if (narrativeLines.length) {
    w.ensure(75);
    w.y += 8;
    w.heading('叙事');
    narrativeLines.forEach((line) => {
      if (line.role === 'print') { w.ensure(35); w.paragraph(line.text, 9, C.muted, 0, 'print'); }
      else w.paragraph(line.text);
    });
  }
};
