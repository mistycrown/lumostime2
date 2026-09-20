/**
 * @file ChartPaletteSequenceManager.tsx
 * @input Built-in and persisted custom chart palette sequences.
 * @output Visual sequence gallery and modal editor for sponsorship settings.
 * @pos Component
 * @updated 2026-09-20: Removes card borders from built-in and custom sequence items.
 */
import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import type { CustomChartPaletteSequence } from "../types";
import { getChartPaletteOptions } from "../utils/chartPalette";
import { normalizeCustomColorHex } from "../services/customColorGroupService";
import { chartPaletteSequenceService } from "../services/chartPaletteSequenceService";
import { useChartPaletteSequences } from "../hooks/useChartPaletteSequences";

interface Props {
  onToast: (type: "success" | "error", message: string) => void;
}

const MAX_COLORS = 8;

export const ChartPaletteSequenceManager: React.FC<Props> = ({ onToast }) => {
  const customSequences = useChartPaletteSequences();
  const [editing, setEditing] = useState<CustomChartPaletteSequence | null>(
    null
  );
  const [name, setName] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [colorInput, setColorInput] = useState("");
  const presets = useMemo(
    () => getChartPaletteOptions().filter((palette) => palette.id !== "theme"),
    []
  );

  const openNew = () => {
    setEditing(null);
    setName("");
    setColors(["#54788A", "#B46F62", "#758F72"]);
    setColorInput("");
  };
  const closeEditor = () => {
    setEditing(null);
    setName("");
    setColors([]);
    setColorInput("");
  };
  const openEdit = (sequence: CustomChartPaletteSequence) => {
    setEditing(sequence);
    setName(sequence.name);
    setColors([...sequence.colors]);
    setColorInput("");
  };
  const addColor = () => {
    const normalized = normalizeCustomColorHex(colorInput);
    if (!normalized) return onToast("error", "请输入有效的 HEX 色值");
    if (colors.length >= MAX_COLORS)
      return onToast("error", "每组最多 8 个颜色");
    setColors((current) => [...current, normalized]);
    setColorInput("");
  };
  const save = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return onToast("error", "请输入序列名称");
    if (colors.length < 3) return onToast("error", "至少添加 3 个颜色");
    const now = Date.now();
    chartPaletteSequenceService.save({
      id:
        editing?.id ||
        (`custom:palette_${now}_${Math.random()
          .toString(16)
          .slice(2)}` as `custom:${string}`),
      name: trimmedName,
      colors,
      createdAt: editing?.createdAt || now,
      updatedAt: now,
    });
    closeEditor();
    onToast("success", "色彩序列已保存");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-stone-600">多色序列</h3>
          <p className="mt-1 text-xs text-stone-400">
            用于热力图、选项分布和数值分布
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100"
        >
          <Plus size={14} />
          新建序列
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {presets.map((palette) => (
          <div
            key={palette.id}
            className="rounded-lg bg-stone-50/70 p-2.5"
          >
            <div className="mb-2 flex h-4 overflow-hidden rounded-sm">
              {palette.colors.map((color, index) => (
                <span
                  key={index}
                  className="min-w-0 flex-1"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span className="text-xs text-stone-600">{palette.label}</span>
            <span className="mt-0.5 block text-[10px] text-stone-400">
              预设序列
            </span>
          </div>
        ))}
        {customSequences.map((sequence) => (
          <button
            key={sequence.id}
            type="button"
            onClick={() => openEdit(sequence)}
            className="rounded-lg bg-[#fffaf5] p-2.5 text-left hover:bg-[#fff7ef]"
          >
            <div className="mb-2 flex h-4 overflow-hidden rounded-sm">
              {sequence.colors.map((color, index) => (
                <span
                  key={index}
                  className="min-w-0 flex-1"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span className="text-xs text-stone-700">{sequence.name}</span>
            <span className="mt-0.5 block text-[10px] text-stone-400">
              自定义序列
            </span>
          </button>
        ))}
      </div>
      {editing !== null || name !== "" || colors.length > 0 ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-900/30 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditor();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#fffdfa] p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="编辑多色序列"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg text-stone-700">
                {editing ? "编辑多色序列" : "新建多色序列"}
              </h3>
              <button
                type="button"
                onClick={closeEditor}
                aria-label="关闭"
                className="p-1 text-stone-400"
              >
                <X size={18} />
              </button>
            </div>
            <label className="block text-xs text-stone-500">
              序列名称
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={32}
                className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400"
                placeholder="例如：晨雾"
              />
            </label>
            <div className="mt-4 flex h-8 overflow-hidden rounded-md border border-stone-200">
              {colors.map((color, index) => (
                <span
                  key={`${color}-${index}`}
                  className="min-w-0 flex-1"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {colors.map((color, index) => (
                <div
                  key={`${color}-${index}`}
                  className="flex items-center gap-2"
                >
                  <span
                    className="h-7 w-7 shrink-0 rounded border border-stone-200"
                    style={{ backgroundColor: color }}
                  />
                  <input
                    value={color}
                    onChange={(event) => {
                      const normalized = normalizeCustomColorHex(
                        event.target.value
                      );
                      if (normalized)
                        setColors((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? normalized : item
                          )
                        );
                    }}
                    className="min-w-0 flex-1 rounded-md border border-stone-200 px-2 py-1.5 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setColors((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index)
                      )
                    }
                    title="删除"
                    className="p-1 text-stone-400"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() =>
                      setColors((current) => {
                        const next = [...current];
                        [next[index - 1], next[index]] = [
                          next[index],
                          next[index - 1],
                        ];
                        return next;
                      })
                    }
                    title="上移"
                    className="p-1 text-stone-400 disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={index === colors.length - 1}
                    onClick={() =>
                      setColors((current) => {
                        const next = [...current];
                        [next[index + 1], next[index]] = [
                          next[index],
                          next[index + 1],
                        ];
                        return next;
                      })
                    }
                    title="下移"
                    className="p-1 text-stone-400 disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={colorInput}
                onChange={(event) => setColorInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addColor();
                }}
                className="min-w-0 flex-1 rounded-md border border-stone-200 px-3 py-2 font-mono text-xs"
                placeholder="#AABBCC"
              />
              <button
                type="button"
                onClick={addColor}
                className="inline-flex items-center gap-1 rounded-md bg-stone-700 px-3 py-2 text-xs text-white"
              >
                <Plus size={13} />
                添加
              </button>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-md px-3 py-2 text-xs text-stone-500"
              >
                取消
              </button>
              <button
                type="button"
                onClick={save}
                className="rounded-md bg-[#9b5c3f] px-4 py-2 text-xs font-medium text-white"
              >
                保存序列
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
