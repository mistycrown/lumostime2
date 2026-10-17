/**
 * @file dailyStatsLogsMocks.tsx
 * @input Icon props from the isolated statistics renderer
 * @output Local emoji icons without theme storage or network requests
 * @updated 2026-10-17: Keeps renderer verification focused on real chart and modal interactions.
 */
import React from 'react';

export const IconRenderer = ({ icon, size }: { icon: string; size?: number }) => (
  <span aria-hidden="true" style={{ fontSize: size }}>{icon}</span>
);
