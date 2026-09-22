# AI 对话输入框滚动条隐藏设计

## 目标

隐藏 AI 对话页底部多行输入框的可见垂直滚动条，同时保留输入框内部的滚动能力。

## 方案

继续使用现有的 `overflow-y-auto`，仅增加跨浏览器的滚动条隐藏样式：Firefox 使用 `scrollbar-width: none`，IE 使用 `-ms-overflow-style: none`，Chromium/WebKit 使用 `::-webkit-scrollbar { display: none; }`。

## 验证标准

- 输入框不显示垂直滚动条。
- 输入多行内容时仍可通过键盘、滚轮或触控滚动查看内容。
- 不影响发送、停止和快捷功能按钮。
