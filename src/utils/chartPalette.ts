/**
 * @file chartPalette.ts
 * @input Activity-level statistic palette identifiers and the current theme CSS variables.
 * @output Reusable color groups for activity statistic charts and palette selectors.
 * @description Keeps categorical chart colors consistent while preserving the active theme as a dynamic palette.
 * @updated 2026-09-21: Increased contrast for the final colors in the Morandi and Spring East palettes.
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
  shared("morandi-mist-blue", "温暖复古", [
    "#8B4E3C",
    "#D69B72",
    "#E8C9A7",
    "#A68F6B",
    "#B14E3F",
    "#6B6F72",
    "#2F3E46",
    "#EADFCB",
  ]),
  shared("morandi-sage", "海岸暮色", [
    "#2E5B7F",
    "#F4A261",
    "#E76F51",
    "#FFD8A8",
    "#8AB6D6",
    "#6C7A89",
    "#1F2D3D",
    "#F0F4F8",
  ]),
  shared("morandi-clay", "糖果活力", [
    "#FF6B6B",
    "#FFB703",
    "#FFD166",
    "#7BDFF2",
    "#C77DFF",
    "#FF9ED1",
    "#06D6A0",
    "#118AB2",
  ]),
  shared("morandi-lotus", "秋日大地", [
    "#A0522D",
    "#D97706",
    "#E0A458",
    "#F2D1A7",
    "#8B4513",
    "#6B705C",
    "#3E3A32",
    "#EAE0D5",
  ]),
  shared("traditional-porcelain", "雾感莫兰迪", [
    "#A7B1B2",
    "#C9B8AF",
    "#8DA0CB",
    "#B7C4A7",
    "#D9A5A5",
    "#9E9E9E",
    "#6B7C93",
    "#8C9A92",
  ]),
  shared("traditional-cinnabar", "春日东方", [
    "#F6BDC0",
    "#A7D7C5",
    "#FDE68A",
    "#9BC1BC",
    "#E07A5F",
    "#81B29A",
    "#3D405B",
    "#D9B08C",
  ]),
  shared("traditional-bamboo", "雨后花园", [
    "#52796F",
    "#84A98C",
    "#A7C957",
    "#E9C46A",
    "#E76F51",
    "#6D597A",
    "#4D7EA8",
    "#D8E2DC",
  ]),
  shared("traditional-dai", "夏夜汽水", [
    "#457B9D",
    "#66C7C5",
    "#A8DADC",
    "#F4D35E",
    "#EE964B",
    "#E76F8A",
    "#8067B7",
    "#344E5C",
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
