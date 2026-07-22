# Time Pal Card Dark Mode Design

## Goal

Make the main Time Pal card readable and visually consistent in dark mode without changing its layout, animation, image treatment, or accent color behavior.

## Options Considered

1. Add dark-mode utilities directly to the card. This is the selected approach because the light-only colors are isolated to this component and the change remains narrowly scoped.
2. Add new global CSS variables for Time Pal surfaces. This would centralize styling, but is unnecessary for one component and increases theme coupling.
3. Rebuild the card around a separate dark-mode variant. This gives maximal control but duplicates markup and risks visual drift.

## Design

The card surface will use a dark neutral gradient and a subdued dark border in dark mode. The primary duration text and secondary quote text will move to high- and medium-contrast neutral tones. Inactive level indicators will use a visible dark neutral fill. Active indicators will continue using `--accent-color`.

## Verification

Run the production build after the component edit. Manually verify that light mode remains unchanged and that dark mode shows clear hierarchy across the card surface, text, border, and inactive level indicators.
