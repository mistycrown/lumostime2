# 原则库与自我认知卡片排序设计

## 目标

为原则库和自我认知列表中的卡片增加上移、下移功能，并持久化用户调整后的顺序。

## 交互

- 每张卡片的标题操作区显示上移和下移图标按钮。
- 第一张卡片的上移按钮禁用，最后一张卡片的下移按钮禁用。
- 点击按钮后交换相邻卡片，列表立即按新顺序渲染。

## 数据流

- 原则列表使用现有 `savePrinciples` 保存，保留规范化、localStorage 写入、时间戳更新和 `principleLibraryChanged` 事件。
- 自我认知列表使用现有 `saveSelfBeliefs` 保存，保留规范化、localStorage 写入、时间戳更新和 `selfBeliefLibraryChanged` 事件。
- 排序只改变数组顺序，不改变卡片内容、ID 或创建/更新时间字段。

## 实现与验证

- 在 `PrincipleLibraryView.tsx` 中添加通用的相邻项交换逻辑，并为两类列表分别接入。
- 使用 lucide 的 `ChevronUp` / `ChevronDown` 图标，补充 `title` 与 `aria-label`。
- 运行 TypeScript/Vite 生产构建，并检查排序按钮的边界禁用行为。
