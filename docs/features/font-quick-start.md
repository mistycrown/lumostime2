# 字体功能快速开始

## 下载字体文件

### 1. 霞鹜文楷 (推荐)

**下载地址：**
- GitHub: https://github.com/lxgw/LxgwWenKai/releases
- 选择最新版本的 Release
- 下载 `LXGWWenKai-Regular.woff2` 和 `LXGWWenKai-Bold.woff2`

**放置位置：**
```
public/fonts/lxgw-wenkai/
├── LXGWWenKai-Regular.woff2
└── LXGWWenKai-Bold.woff2
```

### 2. 思源宋体

**下载地址：**
- GitHub: https://github.com/adobe-fonts/source-han-serif/releases
- 选择 `SourceHanSerifSC` (简体中文版本)
- 下载 woff2 格式的 Regular 和 Bold

**放置位置：**
```
public/fonts/source-han-serif/
├── SourceHanSerifSC-Regular.woff2
└── SourceHanSerifSC-Bold.woff2
```

### 3. 阿里巴巴普惠体

**下载地址：**
- 官网: https://www.alibabafonts.com/
- 下载 woff2 格式

**放置位置：**
```
public/fonts/alibaba-puhuiti/
├── AlibabaPuHuiTi-Regular.woff2
└── AlibabaPuHuiTi-Bold.woff2
```

## 文件命名规范

请确保文件名与 `public/fonts/fonts.css` 中定义的完全一致：

- 霞鹜文楷：`LXGWWenKai-Regular.woff2`, `LXGWWenKai-Bold.woff2`
- 思源宋体：`SourceHanSerifSC-Regular.woff2`, `SourceHanSerifSC-Bold.woff2`
- 阿里巴巴普惠体：`AlibabaPuHuiTi-Regular.woff2`, `AlibabaPuHuiTi-Bold.woff2`

## 验证安装

1. 启动应用：`npm run dev`
2. 打开浏览器开发者工具 (F12)
3. 切换到 Network 标签
4. 刷新页面
5. 搜索 `.woff2` 文件，确认字体文件已成功加载

## 使用字体

1. 进入"投喂功能"页面
2. 点击"字体" Tab
3. 选择你想要的字体
4. 字体会立即应用到整个应用

## 常见问题

### Q: 字体文件放置后没有生效？

A: 检查以下几点：
1. 文件名是否正确（区分大小写）
2. 文件格式是否为 woff2
3. 浏览器控制台是否有 404 错误
4. 清除浏览器缓存后重试

### Q: 字体显示不完整或有缺字？

A: 确保下载的是完整版字体文件，不是子集版本。

### Q: 字体文件太大怎么办？

A: 
1. 使用 woff2 格式（已经是最优压缩）
2. 考虑使用字体子集化工具（如 fonttools）
3. 只保留常用汉字

### Q: 如何添加更多字体？

A: 参考 `docs/features/font-management.md` 中的"添加新字体"章节。

## 字体授权说明

所有推荐的字体都是开源且可商用的：

- **霞鹜文楷**：SIL Open Font License 1.1
- **思源宋体**：SIL Open Font License 1.1  
- **阿里巴巴普惠体**：免费商用授权

请勿使用未经授权的商业字体。
