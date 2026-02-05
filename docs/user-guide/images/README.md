# 用户指南图片资源

本目录用于存放用户指南中使用的图片资源。

## 图片命名规范

使用以下格式命名图片文件：
```
[章节编号]-[功能描述]-[序号].[格式]
```

示例：
- `01-record-floating-ball.webp` - 第1章，记录功能，悬浮球截图
- `02-todo-swipe-actions.webp` - 第2章，待办管理，滑动操作
- `06-daily-review-narrative.webp` - 第6章，每日回顾，AI叙事界面

## 图片规格建议

### 格式
- 优先使用 **WebP** 格式（更小的文件体积）
- 备选 PNG（需要透明背景时）
- 避免使用 JPG（质量损失）

### 尺寸
- **移动端截图**：建议宽度 750-1000px
- **功能演示图**：建议宽度 1200px 以内
- **图标/小图**：建议 200-400px

### 文件大小
- 单张图片尽量控制在 **200KB 以内**
- 大图可以适当放宽到 500KB
- 使用工具压缩（如 TinyPNG、Squoosh）

## 在 Markdown 中使用图片

### 基本语法
```markdown
![图片描述](./images/01-record-floating-ball.webp)
```

### 带标题的图片
```markdown
![悬浮计时球界面 - 点击后可以停止计时](./images/01-record-floating-ball.webp)
```
图片下方会自动显示 alt 文字作为图注。

### 多张图片并排（需要时）
```markdown
![图片1](./images/demo1.webp) ![图片2](./images/demo2.webp)
```

## 图片优化工具推荐

1. **在线工具**
   - [TinyPNG](https://tinypng.com/) - PNG/JPG 压缩
   - [Squoosh](https://squoosh.app/) - 多格式转换和压缩

2. **命令行工具**
   - `cwebp` - 转换为 WebP 格式
   - `imagemagick` - 批量处理

3. **项目内脚本**
   - 可以使用 `scripts/convert-to-webp.js` 批量转换

## 注意事项

1. ✅ **必须添加 alt 文字**，方便视障用户和 SEO
2. ✅ **使用相对路径**引用图片
3. ✅ **压缩后再提交**，避免仓库体积过大
4. ✅ **截图时隐藏敏感信息**（使用隐私模式）
5. ❌ **不要使用外链图片**，避免失效
6. ❌ **不要上传过大的原图**，先压缩优化

## 示例

假设你要在"开始记录你的时间"章节添加悬浮球截图：

1. 截图并保存为 `01-record-floating-ball.png`
2. 使用工具转换为 WebP 并压缩
3. 放入 `docs/user-guide/images/` 目录
4. 在 `01-getting-started.md` 中添加：

```markdown
## 方式一：点击即录

1. 打开应用首页 (**Record Tab**)
2. 左侧栏选择 **大类 (Category)**
3. 右侧网格中点击具体的 **活动图标 (Activity)**

![悬浮计时球 - 点击活动后会出现在屏幕右下角](./images/01-record-floating-ball.webp)

- 屏幕右下角会出现**悬浮计时球**，表示计时已开始
- 点击悬浮球，选择停止 (Stop) 结束计时
```

这样图片就会自动渲染，并在下方显示图注。
