/**
 * @file chartPalette.ts
 * @input Activity-level statistic palette identifiers and the current theme CSS variables.
 * @output Reusable color groups for activity statistic charts and palette selectors.
 * @description Keeps categorical chart colors consistent while preserving the active theme as a dynamic palette.
 * @updated 2026-09-20: Added grouped statistic palettes for activity analytics.
 */
import type {
  ActivityStatisticPaletteId,
  CustomChartPaletteSequence,
} from "../types";

export interface ChartPalette {
  id: ActivityStatisticPaletteId;
  label: string;
  colors: string[];
  accent: string;
  accentSoft: string;
  muted: string;
  grid: string;
  background: string;
}

const shared = (
  id: ActivityStatisticPaletteId,
  label: string,
  colors: string[]
): ChartPalette => ({
  id,
  label,
  colors,
  accent: colors[0],
  accentSoft: colors[3] || colors[0],
  muted: colors[4] || colors[1] || colors[0],
  grid: "#e7e5e4",
  background: "#f7f2ec",
});

const DEFAULT_RANDOM_COLORS = [
  "#54788a",
  "#b46f62",
  "#758f72",
  "#c49a55",
  "#7e6c91",
  "#ad8a75",
  "#4d8b8c",
].sort(() => Math.random() - 0.5);
const DEFAULT_PALETTE: ChartPalette = {
  id: "default",
  label: "默认",
  colors: ["#1c1c1a", ...DEFAULT_RANDOM_COLORS],
  accent: "#1c1c1a",
  accentSoft: "color-mix(in srgb, #1c1c1a 18%, white)",
  muted: "color-mix(in srgb, #1c1c1a 42%, #a8a29e)",
  grid: "#e7e5e4",
  background: "#f7f2ec",
};

export const CHART_PALETTES: ChartPalette[] = [
  {
    id: "theme",
    label: "主题单色",
    colors: [
      "var(--accent-color)",
      "color-mix(in srgb, var(--accent-color) 82%, white)",
      "color-mix(in srgb, var(--accent-color) 66%, white)",
      "color-mix(in srgb, var(--accent-color) 50%, white)",
      "color-mix(in srgb, var(--accent-color) 34%, white)",
      "color-mix(in srgb, var(--accent-color) 20%, white)",
      "color-mix(in srgb, var(--accent-color) 66%, #8f877f)",
      "color-mix(in srgb, var(--accent-color) 42%, #8f877f)",
    ],
    accent: "var(--accent-color)",
    accentSoft: "color-mix(in srgb, var(--accent-color) 12%, white)",
    muted: "color-mix(in srgb, var(--accent-color) 42%, #a8a29e)",
    grid: "#e7e5e4",
    background: "#f7f2ec",
  },
  shared("morandi-mist-blue", "雾蓝", [
    "#54788a",
    "#b46f62",
    "#758f72",
    "#c49a55",
    "#7e6c91",
    "#ad8a75",
    "#4d8b8c",
    "#c17d91",
  ]),
  shared("morandi-sage", "灰绿", [
    "#5f806f",
    "#bd765f",
    "#5f7895",
    "#b99a54",
    "#856f91",
    "#a47d68",
    "#4f8d83",
    "#bd7e89",
  ]),
  shared("morandi-clay", "陶土", [
    "#a45e51",
    "#557c82",
    "#b17b47",
    "#6f7f61",
    "#8a6683",
    "#c08c6b",
    "#4f718e",
    "#9d8a54",
  ]),
  shared("morandi-lotus", "藕粉", [
    "#a66a7f",
    "#5b8290",
    "#b58350",
    "#6f8a6d",
    "#806b95",
    "#b36f62",
    "#4c8b82",
    "#bd9a5c",
  ]),
  shared("traditional-porcelain", "青花", [
    "#285b91",
    "#bb413d",
    "#3e806b",
    "#d0903e",
    "#66528b",
    "#2e7e8a",
    "#a65c72",
    "#7b793e",
  ]),
  shared("traditional-cinnabar", "朱砂", [
    "#ad2f2b",
    "#315f8d",
    "#3f8067",
    "#cf8b36",
    "#72508b",
    "#2f8583",
    "#a85a68",
    "#777845",
  ]),
  shared("traditional-bamboo", "竹青", [
    "#2e7656",
    "#b43d36",
    "#2e668d",
    "#c28a35",
    "#6d548d",
    "#2c8882",
    "#a25c48",
    "#7e8241",
  ]),
  shared("traditional-dai", "黛紫", [
    "#5a467e",
    "#2e7d83",
    "#b1433d",
    "#c38d3d",
    "#3d6f99",
    "#7e8750",
    "#a45b78",
    "#6a6c70",
  ]),
];

export const getChartPalette = (
  id?: ActivityStatisticPaletteId,
  customSequences: CustomChartPaletteSequence[] = []
): ChartPalette => {
  if (id === "default") return DEFAULT_PALETTE;
  const custom = customSequences.find((sequence) => sequence.id === id);
  if (custom) return shared(custom.id, custom.name, custom.colors);
  return (
    CHART_PALETTES.find((palette) => palette.id === id) || CHART_PALETTES[0]
  );
};

export const getChartPaletteOptions = (
  customSequences: CustomChartPaletteSequence[] = [],
  includeDefault = false
): ChartPalette[] => [
  ...(includeDefault ? [DEFAULT_PALETTE] : []),
  ...CHART_PALETTES,
  ...customSequences.map((sequence) =>
    shared(sequence.id, sequence.name, sequence.colors)
  ),
];
