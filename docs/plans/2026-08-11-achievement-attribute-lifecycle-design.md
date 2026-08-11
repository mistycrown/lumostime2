# Achievement Attribute Lifecycle and Proportional Experience Design

Date: 2026-08-11

## Goal

Make character-attribute hiding and deletion separate operations, and calculate character experience from each day's actual rule progress rather than only completed whole units.

## Attribute Lifecycle

- Hiding keeps the attribute and its historical growth snapshots. It only removes the attribute from active character growth.
- Deleting checks the current achievement rules first. An attribute referenced by any rule cannot be deleted and the settings dialog explains why.
- An unreferenced attribute can be deleted from the active attribute list.
- Historical snapshots are retained for backup compatibility and audit history. Changes that reference a deleted attribute are treated as unowned historical data and do not contribute to displayed attribute or total character experience.

## Experience Calculation

- Calculate each enabled rule independently for each day.
- Use `matchedValue / unitAmount * expPerUnit` for the rule's raw experience.
- Floor the result once per rule per day so stored experience remains an integer.
- Do not carry fractional remainders to another day.

For a rule that grants 10 EXP per 60 minutes, 30 minutes earns 5 EXP, 10 minutes earns 1 EXP, and 75 minutes earns 12 EXP.

## Interface

- The attribute settings dialog exposes separate hide/restore and delete actions.
- Deletion uses an explicit confirmation step. The confirmation is unavailable while rules still reference the attribute.
- Existing reorder, edit, create, and restore behavior remains available.

## Verification

- Cover attribute deletion rejection when a rule references the attribute.
- Cover successful deletion without rule references and ignored unowned snapshots.
- Cover proportional daily experience including half-unit and fractional-result cases.
- Run the focused Vitest suites and the production build.
