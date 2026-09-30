# 悬浮按钮自定义背景图片溢出实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让悬浮按钮的自定义背景图片在放大时可以超出按钮视觉边界，同时保持按钮原有的点击区域、定位和尺寸。

**Architecture:** 调整 `FloatingButton` 的自定义背景渲染层，并增加一个纯像素处理工具。用居中的 `<img>` 替代当前带圆角的 CSS 背景层，图片宽度沿用方案的百分比缩放值并取消全局最大宽度限制；显示前把与图片边缘连通的近白色像素转为真实透明像素，外层按钮不裁切，默认主题按钮、背景方案服务和选择器数据流保持不变。

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, React DOM server rendering
**Spec:** `docs/plans/2026-09-30-floating-button-image-overflow-design.md`

## Global Constraints

- 所有修改文件使用 UTF-8 编码。
- 自定义图片的缩放范围继续由背景方案服务限制为 50% 至 200%。
- 图片视觉层允许溢出，但悬浮按钮的点击区域、定位、尺寸和图标层级不变。
- 自定义图片显示前清除边缘连通的近白色背景，外层按钮和图片包裹层保持 `overflow-visible`。
- 未选择自定义背景时继续使用原有主题 CSS 样式。
- 不新增依赖，不修改背景方案持久化、上传、主题包导入或 Android 工程。

## Review Focus

- 默认背景方案：继续渲染 `floating-button` 主题样式；由 Task 1 的默认分支测试覆盖。
- 自定义背景方案：不再添加默认背景、边框和阴影；由 Task 1 的自定义分支测试覆盖。
- 缩放值超过 100%：图片宽度应使用对应百分比且不受 `max-width: 100%` 限制；由 Task 1 的图片样式测试覆盖。
- 白色背景：边缘连通的近白色像素应转为透明，而被彩色图案包围的白色像素保留；由 Task 1 的像素工具测试覆盖。
- 图片视觉层：不接收指针事件，不能遮挡按钮点击；由 Task 1 的图片样式测试覆盖。
- 图标层：继续位于背景图片之上；由 Task 1 的静态渲染测试覆盖。

### Task 1: Replace the clipped custom image layer

**Files:**

- Create: `src/utils/floatingButtonImageTransparency.ts`
- Create: `src/utils/floatingButtonImageTransparency.test.ts`
- Modify: `src/components/FloatingButton.tsx`
- Modify: `src/components/FloatingButton.test.tsx`

**Interfaces:**

- Consumes: `floatingButtonBackgroundService.getSettings()` and `imageService.getImageUrl()` as currently used by `FloatingButton`.
- Produces: `createFloatingButtonBackgroundImageStyle(scale: number): React.CSSProperties` for the image layer and a centered, overflow-visible `<img>` rendering path.

- [ ] **Step 1: Write the failing tests**

  Add Vitest tests using `renderToStaticMarkup` and mocked background/image services:

  - Default settings render the `floating-button` class and do not apply the transparent custom-background inline style.
  - Custom settings omit the `floating-button` class and keep `background-color: transparent`, `border: none`, and `box-shadow: none` on the button.
  - `createFloatingButtonBackgroundImageStyle(150)` returns `width: '150%'`, `height: 'auto'`, `maxWidth: 'none'`, and `transform: 'translate(-50%, -50%)'`.
  - `clearEdgeConnectedWhitePixels(...)` clears edge-connected white and near-white pixels, preserves enclosed white artwork, and traverses existing transparent padding.
  - The custom image layer markup uses `absolute`, `left-1/2`, `top-1/2`, `max-w-none`, and `pointer-events-none`, while the icon remains in the `relative z-10` wrapper.

- [ ] **Step 2: Run the focused test to verify it fails**

  Run: `npx vitest run src/components/FloatingButton.test.tsx src/utils/floatingButtonImageTransparency.test.ts`

  Expected: FAIL because the pixel-removal helper does not exist and the current image keeps its original white pixels.

- [ ] **Step 3: Implement the overflow-visible image layer**

  In `src/components/FloatingButton.tsx`, export `createFloatingButtonBackgroundImageStyle`, replace the rounded `background-image` span with an absolutely positioned `<img>`, process the loaded image with `createTransparentFloatingButtonImage`, and preserve the existing image URL handling, custom button chrome removal, pointer behavior, and icon wrapper. Implement the edge-connected white-pixel algorithm in `src/utils/floatingButtonImageTransparency.ts`.

- [ ] **Step 4: Run focused tests and production build**

  Run: `npx vitest run src/components/FloatingButton.test.tsx src/utils/floatingButtonImageTransparency.test.ts && npm run build`

  Expected: all focused tests pass and Vite produces the production build successfully.

- [ ] **Step 5: Inspect the diff and commit the implementation**

  Run: `git status --short` and `git diff -- src/components/FloatingButton.tsx src/components/FloatingButton.test.tsx`.

  Stage only the two Task 1 files and commit:

  ```bash
  git add src/components/FloatingButton.tsx src/components/FloatingButton.test.tsx src/utils/floatingButtonImageTransparency.ts src/utils/floatingButtonImageTransparency.test.ts
  git commit -m "移除悬浮按钮图片白底"
  ```

## Self-Review

- Spec coverage: the design's only behavioral requirement is owned by Task 1; storage and package flows are intentionally untouched.
- Step scan: each step is a single test, implementation, verification, or commit action with explicit expected behavior.
- Type consistency: the exported helper returns `React.CSSProperties`, and the component consumes the same scale value from the existing service.
- Review focus: default styling, custom chrome, large-scale overflow, pointer behavior, and icon layering each have a named assertion.
- Proportion: the plan contains one task because the change is isolated to one component and its regression tests.
