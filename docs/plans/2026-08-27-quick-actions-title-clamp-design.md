# Quick Actions Title Clamp Design

## Goal

Keep long todo titles in the quick-actions sheet readable without allowing the header to consume the sheet.

## Decision

Apply a CSS two-line clamp only to the non-editing title display. Overflowing text shows an ellipsis. The existing title editor is unchanged, so it retains the full title value while editing.

## Verification

Add a static-rendering regression test for the clamp utility classes and run the focused Vitest file plus the production build.
