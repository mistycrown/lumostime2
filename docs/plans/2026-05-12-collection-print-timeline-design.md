# Collection Print Timeline Design

Date: 2026-05-12
Status: Approved and refined against archive references

## Goal

Refactor the settings-level Collection page away from stacked rounded cards and toward a minimalist editorial archive layout. The new UI should feel like a printed directory plus archive timeline:

- List page reads like an index page
- Detail page reads like a dated archive timeline
- Content renders directly on the page instead of inside card shells
- Interaction remains clear on desktop and mobile

## Scope

Primary implementation target:

- `src/views/settings/CollectionSettingsView.tsx`

Possible light consistency follow-up if needed:

- `src/components/DataCollectionSelector.tsx`

Out of scope:

- Collection data structures
- Collection add/remove business logic
- Item resolution logic
- Log and todo business behavior

## Chosen Direction

The approved direction evolved from a loose newspaper-style page into a denser archive-yearbook layout after reference review.

Why this direction:

- It keeps the print/editorial feeling without becoming too empty
- It matches the reference pattern of title-led rows plus restrained number badges
- It supports faster scanning for mixed log and todo entries
- It gives the detail page a stable date rail and denser metadata line

## Page Structure

### List Page

The Collection list becomes a title-led archive directory rather than a card stack.

- Each collection renders as a single archive row
- The main emphasis is the collection title and one restrained descriptive line
- Metadata such as updated time and log/task counts sits in a compact secondary line
- The right side holds one small square count badge
- Rows are separated with thin rules instead of boxed containers
- The create flow appears inline as part of the page rhythm instead of as a detached dashed panel

### Detail Page

The Collection detail page becomes a denser archive timeline.

- The top becomes a compact archive masthead instead of a header card
- Title, description, updated time, item count, and edit action live directly on the page
- Entries flow underneath in one continuous vertical timeline
- Left side holds date and time or duration information
- Middle uses a subtle timeline rule with a strong dot marker
- Right side holds tags, title, excerpt, and optional image

## Entry Layout

Both log and todo entries use one unified archive-row language.

- A small type label distinguishes `LOG` and `TASK`
- Related tags sit in the same top row instead of occupying a separate line later
- The left rail shows date plus time or duration
- The title is the main reading focus
- Excerpt and thumbnail sit directly below the title without boxed subcontainers
- Remove actions become light inline text actions rather than button blocks

### Log Emphasis

- Time range
- Linked category and activity context
- Optional linked todo context

### Todo Emphasis

- Accumulated duration
- Todo category and scopes
- Optional note excerpt

## Create and Edit States

Create and edit flows should feel native to the printed layout instead of modal-like card inserts.

- Creating a collection inserts an inline draft row at the end of the list
- Editing a collection happens directly inside the masthead area
- Inputs inherit the same editorial rhythm with underline-style fields and restrained controls

## Visual System

- Warm paper background remains
- Rounded white cards, shadows, and lifted hover states are removed
- Hierarchy comes from typography, spacing, thin rules, and alignment
- Hover states stay subtle: light tint or text darkening only
- Thumbnail images remain secondary and should never dominate layout

## Responsive Behavior

Desktop:

- Three-part archive structure is preserved
- Date column remains narrow and stable
- Content column gets most of the width

Mobile:

- Timeline compresses into a tighter vertical stack
- Date shifts above or beside content depending on available width
- Count badges remain visible
- Long descriptions clamp cleanly

## Verification

After implementation:

1. Run `npm run build`
2. Check list page and detail page layouts at desktop and narrow widths
3. Review empty state, create state, edit state, long titles, and entries with images
