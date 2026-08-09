# Review Overview Design

## Goal

Add a settings subpage named `回顾总览` that lets users browse historical Daily, Weekly, and Monthly review answers by review type, template group, and question.

## Data Model

- Source records are `dailyReviews`, `weeklyReviews`, and `monthlyReviews`.
- Each review contributes its non-empty `answers`.
- Group ownership is resolved from the review's `templateSnapshot` first, preserving historical template groups.
- Older records without snapshots fall back to the current `reviewTemplates` filtered by Daily, Weekly, or Monthly flags.
- Answers whose question no longer exists in either source appear under `未分组`.

## Navigation

- `设置 > 内容` gains a `回顾总览` entry beside `日课总览`.
- The overview page is a settings subview.
- The first view lists three top-level sections: Daily review, Weekly review, Monthly review.
- Each top-level section contains template-group headings.
- Each template group contains question rows.
- Tapping a question opens an in-page detail view.

## Detail View

- Detail rows show every non-empty answer for the selected question.
- Sorting is newest first.
- Daily rows use the review date.
- Weekly and Monthly rows use their range labels and sort by period end date.

## UI Direction

The page uses a minimalist editorial/print style: paper background, serif typography, thin rules, generous spacing, compact metadata, and no nested cards or box-inside-box layouts.

## Verification

- Add utility tests for snapshot grouping, current-template fallback, unmatched-answer fallback, and newest-first detail sorting.
- Run the focused Vitest file.
- Run `npm run build`.
